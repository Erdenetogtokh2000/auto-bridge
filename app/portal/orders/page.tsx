import { desc, eq, inArray } from "drizzle-orm";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { CustomerOrderHistory } from "@/app/components/customer-order-history";
import { requireCustomerPermission } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { documents, notifications, orders, payments, shipments, vehicles } from "@/db/schema";
import { orderProgress, orderStatusLabel } from "@/lib/order-status";

export const dynamic = "force-dynamic";

export default async function CustomerOrderHistoryPage() {
  const user = await requireCustomerPermission("/portal/orders", "CUSTOMER_ORDERS_VIEW");
  const db = getDb();
  const orderRows = await db.select({ order: orders, vehicle: vehicles, shipment: shipments }).from(orders).innerJoin(vehicles, eq(orders.vehicleId, vehicles.id)).leftJoin(shipments, eq(orders.id, shipments.orderId)).where(eq(orders.customerEmail, user.email.toLowerCase())).orderBy(desc(orders.createdAt));
  const orderIds = orderRows.map(({ order }) => order.id);
  const [paymentRows, documentRows, unreadRows] = await Promise.all([
    orderIds.length ? db.select({ orderId: payments.orderId, amountMnt: payments.amountMnt, status: payments.status }).from(payments).where(inArray(payments.orderId, orderIds)) : Promise.resolve([]),
    orderIds.length ? db.select({ orderId: documents.orderId, status: documents.status }).from(documents).where(inArray(documents.orderId, orderIds)) : Promise.resolve([]),
    db.select({ id: notifications.id }).from(notifications).where(eq(notifications.recipientEmail, user.email.toLowerCase())),
  ]);
  const items = orderRows.map(({ order, vehicle, shipment }) => {
    const progress = orderProgress(order.status, shipment?.status);
    return {
      id: order.id, orderNo: order.orderNo ?? order.id, createdAt: order.createdAt, statusLabel: orderStatusLabel(order.status, shipment?.status), progress,
      make: vehicle.make, model: vehicle.model, productionYear: vehicle.productionYear, sourceMarket: vehicle.sourceMarket,
      totalAmountMnt: order.totalAmountMnt, paidMnt: paymentRows.filter((row) => row.orderId === order.id && row.status === "PAID").reduce((sum, row) => sum + row.amountMnt, 0),
      balanceMnt: order.balanceAmountMnt, currentLocation: shipment?.currentLocation ?? "Бэлтгэл шат", estimatedArrival: shipment?.estimatedArrival ?? "Тодорхойгүй",
      documentCount: documentRows.filter((row) => row.orderId === order.id && row.status === "VERIFIED").length,
    };
  });
  return <DashboardShell role="customer" title="Захиалгын түүх" subtitle="Таны бүх автомашины захиалга, төлбөр, баримт болон тээврийн мэдээлэл." userName={user.displayName} userCode={user.email} unreadCount={unreadRows.length} notificationHref="/portal/notifications" rolePermissions={user.permissions}><CustomerOrderHistory items={items} /></DashboardShell>;
}
