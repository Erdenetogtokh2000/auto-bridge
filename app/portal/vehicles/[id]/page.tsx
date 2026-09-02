import { and, desc, eq, or } from "drizzle-orm";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { VehicleDetailTabs } from "@/app/components/vehicle-detail-tabs";
import { FinancingRequestForm } from "@/app/components/financing-request-form";
import { requireCustomerPermission } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import {
  documents,
  financingRequests,
  orders,
  payments,
  quoteEstimates,
  shipmentEvents,
  shipments,
  userProfiles,
  vehicles,
} from "@/db/schema";
import { orderProgress, orderStatusLabel } from "@/lib/order-status";
import { createOverduePaymentReminders } from "@/lib/payment-reminders";
import { resolveOrderPaymentTerms } from "@/lib/order-payment-terms";
import { ArrowLeft, CarFront, ExternalLink, LockKeyhole } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VehicleDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VehicleDetailContent id={id} />;
}

async function VehicleDetailContent({ id }: { id: string }) {
  const user = await requireCustomerPermission(
    `/portal/vehicles/${encodeURIComponent(id)}`,
    "CUSTOMER_ORDERS_VIEW",
  );
  const db = getDb();
  const [row] = await db
    .select({ order: orders, vehicle: vehicles, shipment: shipments })
    .from(orders)
    .innerJoin(vehicles, eq(orders.vehicleId, vehicles.id))
    .leftJoin(shipments, eq(orders.id, shipments.orderId))
    .where(
      and(
        eq(orders.customerEmail, user.email.toLowerCase()),
        or(eq(orders.orderNo, id), eq(orders.id, id)),
      ),
    )
    .limit(1);
  if (!row)
    return (
      <DashboardShell
        role="customer"
        title="Захиалга олдсонгүй"
        subtitle="Энэ захиалга таны бүртгэлд хамаарахгүй байна."
        userName={user.displayName}
        userCode={user.email}
        rolePermissions={user.permissions}
      >
        <div className="portal-empty">
          <LockKeyhole />
          <h3>Захиалгын мэдээлэл нээгдэхгүй байна</h3>
          <p>Нэвтэрсэн и-мэйлээр бүртгэлтэй захиалга биш байна.</p>
          <a href="/portal">
            <ArrowLeft />
            Миний захиалгууд
          </a>
        </div>
      </DashboardShell>
    );
  const { order, vehicle, shipment } = row;
  const [
    estimateRows,
    paymentRows,
    documentRows,
    eventRows,
    financingRows,
    profileRows,
  ] = await Promise.all([
    order.quoteRequestId
      ? db
          .select()
          .from(quoteEstimates)
          .where(eq(quoteEstimates.quoteRequestId, order.quoteRequestId))
          .limit(1)
      : Promise.resolve([]),
    db
      .select()
      .from(payments)
      .where(eq(payments.orderId, order.id))
      .orderBy(desc(payments.createdAt)),
    db
      .select({
        id: documents.id,
        documentType: documents.documentType,
        fileName: documents.fileName,
        status: documents.status,
        sizeBytes: documents.sizeBytes,
        createdAt: documents.createdAt,
        paymentId: documents.paymentId,
      })
      .from(documents)
      .where(eq(documents.orderId, order.id))
      .orderBy(desc(documents.createdAt)),
    shipment
      ? db
          .select()
          .from(shipmentEvents)
          .where(eq(shipmentEvents.shipmentId, shipment.id))
          .orderBy(shipmentEvents.eventAt)
      : Promise.resolve([]),
    db
      .select()
      .from(financingRequests)
      .where(eq(financingRequests.orderId, order.id))
      .orderBy(desc(financingRequests.createdAt)),
    db
      .select({ financingEligible: userProfiles.financingEligible })
      .from(userProfiles)
      .where(
        and(
          eq(userProfiles.email, user.email.toLowerCase()),
          eq(userProfiles.status, "ACTIVE"),
        ),
      )
      .limit(1),
  ]);
  await createOverduePaymentReminders(db, user.email);
  const status = orderStatusLabel(order.status, shipment?.status);
  const progress = orderProgress(order.status, shipment?.status);
  const profile = profileRows[0];
  const paymentTerms = resolveOrderPaymentTerms(order, estimateRows[0] ?? null);
  const depositPaid = paymentRows
    .filter((item) => item.paymentType === "DEPOSIT" && item.status === "PAID")
    .reduce((sum, item) => sum + item.amountMnt, 0);
  const vehiclePaid = paymentRows
    .filter((item) => item.paymentType === "VEHICLE" && item.status === "PAID")
    .reduce((sum, item) => sum + item.amountMnt, 0);
  const vehicleBalanceMnt = Math.max(paymentTerms.balanceMnt - vehiclePaid, 0);
  const paymentOrder = {
    ...order,
    vehicleSubtotalMnt: paymentTerms.vehicleSubtotalMnt,
    depositAmountMnt: paymentTerms.depositMnt,
    balanceAmountMnt: vehicleBalanceMnt,
  };
  const customsPending = paymentRows
    .filter(
      (item) => item.paymentType === "CUSTOMS" && item.status === "PENDING",
    )
    .reduce((sum, item) => sum + item.amountMnt, 0);
  const vehicleFinancing =
    financingRows.find((item) => item.requestType === "VEHICLE_BALANCE") ??
    null;
  const customsFinancing =
    financingRows.find((item) => item.requestType === "CUSTOMS_TAX") ?? null;
  const image = vehicle.imageObjectKey
    ? `/api/vehicle-images/${encodeURIComponent(vehicle.id)}`
    : vehicle.imageUrl;
  return (
    <DashboardShell
      role="customer"
      title="Автомашины дэлгэрэнгүй"
      subtitle={`${order.orderNo ?? order.id} захиалгын нэгдсэн мэдээлэл.`}
      userName={user.displayName}
      userCode={user.email}
      rolePermissions={user.permissions}
    >
      <a className="back-link" href="/portal">
        <ArrowLeft size={14} /> Миний автомашинууд
      </a>
      <section className="vehicle-detail-hero">
        <div className={`detail-car-visual ${image ? "has-image" : ""}`}>
          {image ? (
            <img src={image} alt={`${vehicle.make} ${vehicle.model}`} />
          ) : (
            <CarFront size={125} strokeWidth={0.8} />
          )}
          <span>
            {vehicle.productionYear} · {vehicle.sourceMarket}
          </span>
        </div>
        <div className="detail-car-copy">
          <span>
            {order.orderNo ?? order.id} · {status}
          </span>
          <h2>
            {vehicle.make} {vehicle.model}
          </h2>
          <p>
            {vehicle.fuelType ?? "Түлш тодорхойгүй"} ·{" "}
            {vehicle.mileageKm?.toLocaleString("mn-MN") ?? 0} км
          </p>
          <div className="spec-row">
            <span>
              <small>Stock ID</small>
              <strong>{vehicle.stockNo}</strong>
            </span>
            <span>
              <small>VIN</small>
              <strong>{vehicle.vin ?? "Бүртгэгдээгүй"}</strong>
            </span>
            <span>
              <small>Үйлдвэрлэсэн</small>
              <strong>{vehicle.productionYear}</strong>
            </span>
            <span>
              <small>Төлөв</small>
              <strong>{vehicle.status}</strong>
            </span>
          </div>
          {vehicle.listingUrl && (
            <a href={vehicle.listingUrl} target="_blank" rel="noreferrer">
              Эх зарын линк <ExternalLink size={14} />
            </a>
          )}
        </div>
        <div className="detail-status">
          <span>ГҮЙЦЭТГЭЛ</span>
          <strong>{progress}%</strong>
          <small>{shipment?.currentLocation ?? status}</small>
        </div>
      </section>
      <VehicleDetailTabs
        order={paymentOrder}
        estimate={estimateRows[0] ?? null}
        payments={paymentRows}
        documents={documentRows}
        shipment={shipment}
        events={eventRows}
      />
      {profile?.financingEligible && vehicleBalanceMnt > 0 && (
        <section
          className="dashboard-panel financing-customer-panel"
          id="financing"
        >
          <div className="panel-heading">
            <div>
              <span>ББСБ · 01</span>
              <h2>Автомашины суурь дүнгийн үлдэгдэл 70%</h2>
            </div>
            <span className="finance-panel-badge">ГЭРЭЭТЭЙ</span>
          </div>
          {depositPaid < paymentTerms.depositMnt ? (
            <p className="financing-gate-note">
              Санхүүжилт хүсэхийн өмнө суурь дүнгийн 30%-ийн урьдчилгаа
              төлбөрийг бүрэн төлж баталгаажуулна уу.
            </p>
          ) : (
            <>
              <p>
                30%-ийн урьдчилгаа баталгаажсан тул машин, шимтгэл, Солонгос
                доторх тээврийн үлдэгдэл 70%-д санхүүжилт хүсэх боломжтой.
              </p>
              <FinancingRequestForm
                orderId={order.id}
                maxAmountMnt={vehicleBalanceMnt}
                requestType="VEHICLE_BALANCE"
                existing={
                  vehicleFinancing
                    ? {
                        id: vehicleFinancing.id,
                        requestType: vehicleFinancing.requestType,
                        requestedAmountMnt: vehicleFinancing.requestedAmountMnt,
                        approvedAmountMnt: vehicleFinancing.approvedAmountMnt,
                        termMonths: vehicleFinancing.termMonths,
                        status: vehicleFinancing.status,
                        decisionNote: vehicleFinancing.decisionNote,
                      }
                    : null
                }
              />
            </>
          )}
        </section>
      )}
      {profile?.financingEligible &&
        shipment &&
        ["CUSTOMS", "ARRIVED", "DELIVERED"].includes(shipment.status) &&
        customsPending > 0 && (
          <section
            className="dashboard-panel financing-customer-panel customs-financing-panel"
            id="customs-financing"
          >
            <div className="panel-heading">
              <div>
                <span>ББСБ · 02</span>
                <h2>Гааль, татварын санхүүжилт</h2>
              </div>
              <span className="finance-panel-badge">ГААЛЬ</span>
            </div>
            <p>
              Таны автомашин Монголд ирсэн тул гаалийн төлбөрийн{" "}
              {new Intl.NumberFormat("mn-MN").format(customsPending)} ₮ хүртэлх
              санхүүжилтийн хүсэлт илгээж болно.
            </p>
            <FinancingRequestForm
              orderId={order.id}
              maxAmountMnt={customsPending}
              requestType="CUSTOMS_TAX"
              existing={
                customsFinancing
                  ? {
                      id: customsFinancing.id,
                      requestType: customsFinancing.requestType,
                      requestedAmountMnt: customsFinancing.requestedAmountMnt,
                      approvedAmountMnt: customsFinancing.approvedAmountMnt,
                      termMonths: customsFinancing.termMonths,
                      status: customsFinancing.status,
                      decisionNote: customsFinancing.decisionNote,
                    }
                  : null
              }
            />
          </section>
        )}
    </DashboardShell>
  );
}
