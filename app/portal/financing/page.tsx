import { and, desc, eq, inArray } from "drizzle-orm";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { FinancingRequestForm } from "@/app/components/financing-request-form";
import { requireCustomerPermission } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import {
  financingRequests,
  notifications,
  orders,
  payments,
  quoteEstimates,
  shipments,
  userProfiles,
  vehicles,
} from "@/db/schema";
import { resolveOrderPaymentTerms } from "@/lib/order-payment-terms";
import {
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  ShieldAlert,
} from "lucide-react";

export const dynamic = "force-dynamic";
const money = new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 0 });

export default async function CustomerFinancingPage() {
  const user = await requireCustomerPermission(
    "/portal/financing",
    "CUSTOMER_FINANCING_REQUEST",
  );
  const email = user.email.toLowerCase();
  const db = getDb();
  const [orderRows, profileRows, unreadRows] = await Promise.all([
    db
      .select({
        order: orders,
        vehicle: vehicles,
        shipment: shipments,
        estimate: quoteEstimates,
      })
      .from(orders)
      .innerJoin(vehicles, eq(orders.vehicleId, vehicles.id))
      .leftJoin(shipments, eq(orders.id, shipments.orderId))
      .leftJoin(
        quoteEstimates,
        eq(orders.quoteRequestId, quoteEstimates.quoteRequestId),
      )
      .where(eq(orders.customerEmail, email))
      .orderBy(desc(orders.createdAt)),
    db
      .select({ financingEligible: userProfiles.financingEligible })
      .from(userProfiles)
      .where(
        and(eq(userProfiles.email, email), eq(userProfiles.status, "ACTIVE")),
      )
      .limit(1),
    db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientType, "CUSTOMER"),
          eq(notifications.recipientEmail, email),
          eq(notifications.isRead, false),
        ),
      ),
  ]);
  const orderIds = orderRows.map((row) => row.order.id);
  const [paymentRows, financingRows] = await Promise.all([
    orderIds.length
      ? db.select().from(payments).where(inArray(payments.orderId, orderIds))
      : Promise.resolve([]),
    orderIds.length
      ? db
          .select()
          .from(financingRequests)
          .where(
            and(
              inArray(financingRequests.orderId, orderIds),
              eq(financingRequests.customerEmail, email),
            ),
          )
          .orderBy(desc(financingRequests.createdAt))
      : Promise.resolve([]),
  ]);
  const eligible = Boolean(profileRows[0]?.financingEligible);
  const activeCount = financingRows.filter((row) =>
    ["NEW", "UNDER_REVIEW"].includes(row.status),
  ).length;
  const approvedRows = financingRows.filter((row) => row.status === "APPROVED");
  const approvedTotal = approvedRows.reduce(
    (sum, row) => sum + (row.approvedAmountMnt || row.requestedAmountMnt),
    0,
  );
  const relevantOrders = orderRows.filter(({ order, estimate }) => {
    const terms = resolveOrderPaymentTerms(order, estimate);
    const vehiclePaid = paymentRows
      .filter(
        (item) =>
          item.orderId === order.id &&
          item.paymentType === "VEHICLE" &&
          item.status === "PAID",
      )
      .reduce((sum, item) => sum + item.amountMnt, 0);
    return (
      terms.balanceMnt - vehiclePaid > 0 ||
      financingRows.some((item) => item.orderId === order.id)
    );
  });

  return (
    <DashboardShell
      role="customer"
      title="Миний санхүүжилт"
      subtitle="70%-ийн үлдэгдэл болон гааль, татварын санхүүжилтийн хүсэлтээ нэг дор удирдана."
      userName={user.displayName}
      userCode={user.email}
      unreadCount={unreadRows.length}
      notificationHref="/portal/notifications"
      rolePermissions={user.permissions}
    >
      <section className="stat-grid financing-summary-grid">
        <article className="stat-card">
          <div className="stat-icon blue">
            <FileText />
          </div>
          <span>Нийт хүсэлт</span>
          <strong>{financingRows.length}</strong>
          <small>Автомашин болон гааль</small>
        </article>
        <article className="stat-card">
          <div className="stat-icon amber">
            <Clock3 />
          </div>
          <span>Шийдвэр хүлээж буй</span>
          <strong>{activeCount}</strong>
          <small>Шинэ болон шалгаж буй</small>
        </article>
        <article className="stat-card">
          <div className="stat-icon green">
            <CheckCircle2 />
          </div>
          <span>Зөвшөөрсөн дүн</span>
          <strong>{money.format(approvedTotal)} ₮</strong>
          <small>{approvedRows.length} хүсэлт</small>
        </article>
        <article className="stat-card">
          <div className="stat-icon violet">
            <Building2 />
          </div>
          <span>ББСБ-ын эрх</span>
          <strong>{eligible ? "Идэвхтэй" : "Идэвхгүй"}</strong>
          <small>
            {eligible ? "Гэрээт харилцагч" : "Админаар баталгаажуулна"}
          </small>
        </article>
      </section>

      {!eligible && (
        <section className="financing-access-banner">
          <ShieldAlert />
          <div>
            <strong>ББСБ-ын санхүүжилтийн эрх идэвхгүй байна</strong>
            <p>
              Санхүүжилтийн гэрээ баталгаажсаны дараа админ таны эрхийг
              идэвхжүүлнэ. Идэвхжсэний дараа энэ дэлгэцээс хүсэлтээ шууд
              илгээнэ.
            </p>
          </div>
        </section>
      )}

      <section className="dashboard-section financing-customer-directory">
        <div className="dashboard-section-heading">
          <div>
            <span>САНХҮҮЖИЛТ</span>
            <h2>Захиалга тус бүрийн хүсэлт</h2>
          </div>
          <span className="live-data-chip">
            {relevantOrders.length} ЗАХИАЛГА
          </span>
        </div>
        {relevantOrders.length ? (
          <div className="customer-financing-list">
            {relevantOrders.map(({ order, vehicle, shipment, estimate }) => {
              const orderPayments = paymentRows.filter(
                (item) => item.orderId === order.id,
              );
              const paymentTerms = resolveOrderPaymentTerms(order, estimate);
              const depositPaid = orderPayments
                .filter(
                  (item) =>
                    item.paymentType === "DEPOSIT" && item.status === "PAID",
                )
                .reduce((sum, item) => sum + item.amountMnt, 0);
              const vehiclePaid = orderPayments
                .filter(
                  (item) =>
                    item.paymentType === "VEHICLE" && item.status === "PAID",
                )
                .reduce((sum, item) => sum + item.amountMnt, 0);
              const vehicleBalanceMnt = Math.max(
                paymentTerms.balanceMnt - vehiclePaid,
                0,
              );
              const customsPending = orderPayments
                .filter(
                  (item) =>
                    item.paymentType === "CUSTOMS" && item.status === "PENDING",
                )
                .reduce((sum, item) => sum + item.amountMnt, 0);
              const vehicleFinancing =
                financingRows.find(
                  (item) =>
                    item.orderId === order.id &&
                    item.requestType === "VEHICLE_BALANCE",
                ) ?? null;
              const customsFinancing =
                financingRows.find(
                  (item) =>
                    item.orderId === order.id &&
                    item.requestType === "CUSTOMS_TAX",
                ) ?? null;
              const depositConfirmed = depositPaid >= paymentTerms.depositMnt;
              const customsAvailable = Boolean(
                shipment &&
                ["CUSTOMS", "ARRIVED", "DELIVERED"].includes(shipment.status) &&
                customsPending > 0,
              );
              const existing = vehicleFinancing
                ? {
                    id: vehicleFinancing.id,
                    requestType: vehicleFinancing.requestType,
                    requestedAmountMnt: vehicleFinancing.requestedAmountMnt,
                    approvedAmountMnt: vehicleFinancing.approvedAmountMnt,
                    termMonths: vehicleFinancing.termMonths,
                    status: vehicleFinancing.status,
                    decisionNote: vehicleFinancing.decisionNote,
                  }
                : null;
              const customsExisting = customsFinancing
                ? {
                    id: customsFinancing.id,
                    requestType: customsFinancing.requestType,
                    requestedAmountMnt: customsFinancing.requestedAmountMnt,
                    approvedAmountMnt: customsFinancing.approvedAmountMnt,
                    termMonths: customsFinancing.termMonths,
                    status: customsFinancing.status,
                    decisionNote: customsFinancing.decisionNote,
                  }
                : null;
              return (
                <article
                  className="dashboard-panel customer-financing-card"
                  key={order.id}
                >
                  <header>
                    <div>
                      <span>{order.orderNo ?? order.id}</span>
                      <h3>
                        {vehicle.productionYear} {vehicle.make} {vehicle.model}
                      </h3>
                    </div>
                    <a
                      href={`/portal/vehicles/${encodeURIComponent(order.orderNo ?? order.id)}`}
                    >
                      Машины дэлгэрэнгүй
                    </a>
                  </header>
                  <div className="customer-financing-amounts">
                    <span>
                      <small>Машин + шимтгэл + дотоод тээвэр</small>
                      <strong>
                        {money.format(paymentTerms.vehicleSubtotalMnt)} ₮
                      </strong>
                    </span>
                    <span>
                      <small>30% урьдчилгаа</small>
                      <strong>{money.format(paymentTerms.depositMnt)} ₮</strong>
                      <em
                        className={depositConfirmed ? "confirmed" : "pending"}
                      >
                        {depositConfirmed
                          ? "Баталгаажсан"
                          : "Төлбөр хүлээж буй"}
                      </em>
                    </span>
                    <span>
                      <small>70% үлдэгдэл</small>
                      <strong>{money.format(vehicleBalanceMnt)} ₮</strong>
                    </span>
                  </div>
                  <div className="customer-financing-request-block">
                    <div className="customer-financing-block-title">
                      <CircleDollarSign />
                      <div>
                        <span>1-Р ХЭСЭГ · ЗАХИАЛГА</span>
                        <h4>Автомашины суурь дүнгийн үлдэгдэл 70%</h4>
                      </div>
                    </div>
                    {!eligible ? (
                      <p className="financing-gate-note">
                        ББСБ-ын гэрээт харилцагчийн эрх идэвхжээгүй байна.
                      </p>
                    ) : !depositConfirmed ? (
                      <p className="financing-gate-note">
                        Суурь дүнгийн 30%-ийн урьдчилгаа бүрэн төлөгдөж
                        баталгаажсаны дараа хүсэлт нээгдэнэ.
                      </p>
                    ) : vehicleBalanceMnt <= 0 ? (
                      <p className="financing-gate-note success">
                        Машины үлдэгдэл төлбөргүй байна.
                      </p>
                    ) : (
                      <FinancingRequestForm
                        orderId={order.id}
                        maxAmountMnt={vehicleBalanceMnt}
                        requestType="VEHICLE_BALANCE"
                        existing={existing}
                      />
                    )}{" "}
                  </div>
                  <div className="customer-financing-request-block customs">
                    <div className="customer-financing-block-title">
                      <Building2 />
                      <div>
                        <span>2-Р ХЭСЭГ · МОНГОЛД ИРСЭН</span>
                        <h4>Гааль, татварын санхүүжилт</h4>
                      </div>
                    </div>
                    {eligible && customsAvailable ? (
                      <FinancingRequestForm
                        orderId={order.id}
                        maxAmountMnt={customsPending}
                        requestType="CUSTOMS_TAX"
                        existing={customsExisting}
                      />
                    ) : customsExisting ? (
                      <FinancingRequestForm
                        orderId={order.id}
                        maxAmountMnt={Math.max(
                          customsPending,
                          customsFinancing?.requestedAmountMnt ?? 1,
                        )}
                        requestType="CUSTOMS_TAX"
                        existing={customsExisting}
                      />
                    ) : (
                      <p className="financing-gate-note">
                        Автомашин Монголд ирж, гаалийн төлбөр үүсэхэд хүсэлт
                        нээгдэнэ.
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="portal-empty financing-empty">
            <CircleDollarSign />
            <h3>Санхүүжилт хүсэх захиалга алга</h3>
            <p>
              Админ захиалгыг баталгаажуулж, үлдэгдэл төлбөр үүссэний дараа энд
              харагдана.
            </p>
            <a href="/portal">Миний хяналтын самбар</a>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
