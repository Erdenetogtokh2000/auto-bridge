import { and, desc, eq } from "drizzle-orm";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { requireTransportPermission } from "@/app/chatgpt-auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDb } from "@/db";
import { notifications, orders, shipments, vehicles } from "@/db/schema";
import { shipmentStatusLabels } from "@/lib/shipment-status";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  Clock3,
  MapPin,
  PackageCheck,
  Ship,
  Truck,
} from "lucide-react";

export const dynamic = "force-dynamic";

type ShipmentRow = {
  shipment: typeof shipments.$inferSelect;
  order: typeof orders.$inferSelect;
  vehicle: typeof vehicles.$inferSelect;
};
function dateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("mn-MN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date);
}
function statusClass(status: string) {
  if (["ARRIVED", "DELIVERED"].includes(status)) return "arrived";
  if (status === "PREPARING") return "preparing";
  return "moving";
}

export default async function TransportDashboard() {
  const actor = await requireTransportPermission(
    "/transport",
    "TRANSPORT_ASSIGNED_VIEW",
  );
  const db = getDb();
  const query = () =>
    db
      .select({ shipment: shipments, order: orders, vehicle: vehicles })
      .from(shipments)
      .innerJoin(orders, eq(shipments.orderId, orders.id))
      .innerJoin(vehicles, eq(orders.vehicleId, vehicles.id));
  const [rows, unreadRows] = await Promise.all([
    actor.isAdmin
      ? query().orderBy(desc(shipments.updatedAt))
      : query()
          .where(
            eq(shipments.transportEmployeeEmail, actor.email.toLowerCase()),
          )
          .orderBy(desc(shipments.updatedAt)),
    actor.isAdmin
      ? Promise.resolve([])
      : db
          .select({ id: notifications.id })
          .from(notifications)
          .where(
            and(
              eq(notifications.recipientType, "TRANSPORT"),
              eq(notifications.recipientEmail, actor.email.toLowerCase()),
              eq(notifications.isRead, false),
            ),
          ),
  ]);
  const active = rows.filter((row) => row.shipment.status !== "DELIVERED");
  const archived = rows.filter((row) => row.shipment.status === "DELIVERED");
  const containerCount = new Set(
    active.map((row) => row.shipment.containerNo).filter(Boolean),
  ).size;
  const arriving = active.filter((row) =>
    ["AT_BORDER", "CUSTOMS", "ARRIVED"].includes(row.shipment.status),
  ).length;
  const lastUpdate = rows[0]?.shipment.updatedAt;
  return (
    <DashboardShell
      role="transport"
      title="Тээврийн ажлын самбар"
      subtitle={
        actor.isAdmin
          ? "Бүх тээврийн бодит явц болон хариуцсан ажилтны шинэчлэл."
          : "Танд хуваарилагдсан тээвэр болон өнөөдөр шинэчлэх мэдээлэл."
      }
      userName={actor.displayName}
      userCode={actor.email}
      unreadCount={unreadRows.length}
      notificationHref="/transport/notifications"
      rolePermissions={actor.permissions}
    >
      <section className="stat-grid">
        <article className="stat-card">
          <div className="stat-icon blue">
            <Ship />
          </div>
          <span>Идэвхтэй тээвэр</span>
          <strong>{active.length}</strong>
          <small>Хуваарилагдсан захиалга</small>
        </article>
        <article className="stat-card">
          <div className="stat-icon green">
            <PackageCheck />
          </div>
          <span>Контейнер</span>
          <strong>{containerCount}</strong>
          <small>Давхардалгүй дугаар</small>
        </article>
        <article className="stat-card">
          <div className="stat-icon amber">
            <Clock3 />
          </div>
          <span>Өнөөдөр шинэчлэх</span>
          <strong>{active.length}</strong>
          <small>09:00 / 18:00</small>
        </article>
        <article className="stat-card">
          <div className="stat-icon violet">
            <Truck />
          </div>
          <span>Ойртож ирсэн</span>
          <strong>{arriving}</strong>
          <small>Хил, гааль, УБ</small>
        </article>
      </section>
      {active.length > 0 && (
        <section className="action-banner transport-alert">
          <div className="action-icon">
            <AlertTriangle />
          </div>
          <div>
            <strong>Тээврийн явцыг 09:00 болон 18:00 цагт шинэчилнэ үү</strong>
            <p>
              Байршил, төлөв, ETA болон тайлбар нь харилцагчийн хэсэгт шууд
              харагдана.
            </p>
          </div>
          <a href="#shipments">Тээврүүд</a>
        </section>
      )}
      <ShipmentTable
        title="Идэвхтэй ачаанууд"
        eyebrow="МИНИЙ ТЭЭВРҮҮД"
        rows={active}
        lastUpdate={lastUpdate}
      />
      {archived.length > 0 && (
        <ShipmentTable
          title="Хүлээлгэн өгсөн тээвэр"
          eyebrow="ХААГДСАН ТЭЭВРИЙН АРХИВ"
          rows={archived}
          archive
        />
      )}
    </DashboardShell>
  );
}

function ShipmentTable({
  title,
  eyebrow,
  rows,
  lastUpdate,
  archive = false,
}: {
  title: string;
  eyebrow: string;
  rows: ShipmentRow[];
  lastUpdate?: string;
  archive?: boolean;
}) {
  return (
    <section
      className={`dashboard-panel admin-table-panel transport-live-panel${archive ? " transport-archive" : ""}`}
      id={archive ? "archive" : "shipments"}
    >
      <div className="dashboard-section-heading">
        <div>
          <span>{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        {lastUpdate ? (
          <span className="update-time">Сүүлд: {dateTime(lastUpdate)}</span>
        ) : archive ? (
          <Archive />
        ) : null}
      </div>
      {rows.length ? (
        <Table className="admin-table transport-table">
          <TableHeader>
            <TableRow>
              <TableHead>ЗАХИАЛГА</TableHead>
              <TableHead>АВТОМАШИН</TableHead>
              <TableHead>КОНТЕЙНЕР / B/L</TableHead>
              <TableHead>ОДООГИЙН БАЙРШИЛ</TableHead>
              <TableHead>ETA</TableHead>
              <TableHead>ТӨЛӨВ</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ shipment, order, vehicle }) => (
              <TableRow key={shipment.id}>
                <TableCell>
                  <strong>{order.orderNo ?? order.id}</strong>
                  <small>{shipment.id}</small>
                </TableCell>
                <TableCell>
                  <strong>
                    {vehicle.make} {vehicle.model}
                  </strong>
                  <small>{vehicle.productionYear}</small>
                </TableCell>
                <TableCell>
                  <small>
                    {shipment.containerNo ?? "Контейнергүй"}
                    <br />
                    {shipment.billOfLadingNo ?? "B/L оруулаагүй"}
                  </small>
                </TableCell>
                <TableCell>
                  <span className="location-cell">
                    <MapPin />
                    {shipment.currentLocation ?? "Бэлтгэл шат"}
                  </span>
                </TableCell>
                <TableCell>{shipment.estimatedArrival ?? "—"}</TableCell>
                <TableCell>
                  <b
                    className={`transport-status ${statusClass(shipment.status)}`}
                  >
                    {shipmentStatusLabels[shipment.status] ?? shipment.status}
                  </b>
                </TableCell>
                <TableCell>
                  <a
                    className="transport-detail-link"
                    href={`/transport/shipments/${encodeURIComponent(shipment.id)}`}
                  >
                    {archive ? "Харах" : "Шинэчлэх"}
                    <ArrowRight />
                  </a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="quote-empty compact">
          <Ship />
          <h3>Хуваарилагдсан идэвхтэй тээвэр алга</h3>
          <p>
            Админ захиалгад таны и-мэйлийг хариуцсан ажилтнаар тохируулсны дараа
            энд харагдана.
          </p>
        </div>
      )}
    </section>
  );
}
