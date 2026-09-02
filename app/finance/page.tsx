import { and, desc, eq } from "drizzle-orm";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { FinancingRequestManager } from "@/app/components/financing-request-manager";
import { requireFinancePermission } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import {
  financingRequests,
  notifications,
  orders,
  vehicles,
} from "@/db/schema";
import { CheckCircle2, Clock3, FileText, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FinanceDashboard() {
  const user = await requireFinancePermission(
    "/finance",
    "FINANCE_REQUEST_VIEW",
  );
  const db = getDb();
  const [requestRows, unreadRows] = await Promise.all([
    db
      .select({
        financing: financingRequests,
        order: orders,
        vehicle: vehicles,
      })
      .from(financingRequests)
      .innerJoin(orders, eq(financingRequests.orderId, orders.id))
      .innerJoin(vehicles, eq(orders.vehicleId, vehicles.id))
      .orderBy(desc(financingRequests.createdAt))
      .limit(100),
    db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientType, "FINANCE"),
          eq(notifications.isRead, false),
        ),
      ),
  ]);
  const rows = requestRows.map(({ financing, order, vehicle }) => ({
    id: financing.id,
    orderNo: order.orderNo,
    customerName: order.customerName,
    customerEmail: financing.customerEmail,
    vehicleName: `${vehicle.make} ${vehicle.model}`,
    requestType: financing.requestType,
    requestedAmountMnt: financing.requestedAmountMnt,
    approvedAmountMnt: financing.approvedAmountMnt,
    termMonths: financing.termMonths,
    purpose: financing.purpose,
    status: financing.status,
    decisionNote: financing.decisionNote,
    createdAt: financing.createdAt,
  }));
  const newCount = rows.filter((row) => row.status === "NEW").length;
  const reviewCount = rows.filter(
    (row) => row.status === "UNDER_REVIEW",
  ).length;
  const approvedCount = rows.filter((row) => row.status === "APPROVED").length;
  const declinedCount = rows.filter((row) => row.status === "DECLINED").length;
  return (
    <DashboardShell
      role="finance"
      title="Санхүүжилтийн хяналтын самбар"
      subtitle="Хэрэглэгчийн автомашины санхүүжилтийн хүсэлтийг шалгаж, шийдвэрлэнэ."
      userName={user.displayName}
      userCode={user.email}
      unreadCount={unreadRows.length}
      notificationHref="/finance/notifications"
      rolePermissions={user.permissions}
    >
      <section className="stat-grid finance-stats">
        <article className="stat-card">
          <div className="stat-icon blue">
            <FileText />
          </div>
          <span>Нийт хүсэлт</span>
          <strong>{rows.length}</strong>
          <small>Сүүлийн 100 хүсэлт</small>
        </article>
        <article className="stat-card">
          <div className="stat-icon amber">
            <Clock3 />
          </div>
          <span>Шинэ / шалгаж буй</span>
          <strong>{newCount + reviewCount}</strong>
          <small>
            {newCount} шинэ · {reviewCount} шалгаж байна
          </small>
        </article>
        <article className="stat-card">
          <div className="stat-icon green">
            <CheckCircle2 />
          </div>
          <span>Зөвшөөрсөн</span>
          <strong>{approvedCount}</strong>
          <small>Санхүүжилт батлагдсан</small>
        </article>
        <article className="stat-card">
          <div className="stat-icon violet">
            <XCircle />
          </div>
          <span>Татгалзсан</span>
          <strong>{declinedCount}</strong>
          <small>Эцэслэсэн хүсэлт</small>
        </article>
      </section>
      <FinancingRequestManager requests={rows} canDecide={user.permissions.includes("FINANCE_DECIDE")} />
    </DashboardShell>
  );
}
