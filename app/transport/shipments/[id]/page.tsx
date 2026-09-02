import { desc, eq } from "drizzle-orm";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { TransportUpdateForm } from "@/app/components/transport-update-form";
import { ShipmentLocationMap } from "@/app/components/shipment-location-map";
import { requireTransportPermission } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { orders, shipmentEvents, shipments, vehicles } from "@/db/schema";
import { shipmentProgress, shipmentStatusLabels } from "@/lib/shipment-status";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  PackageSearch,
  Ship,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TransportShipmentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TransportShipmentContent id={id} />;
}

async function TransportShipmentContent({ id }: { id: string }) {
  const actor = await requireTransportPermission(
    `/transport/shipments/${encodeURIComponent(id)}`,
    "TRANSPORT_ASSIGNED_VIEW",
  );
  const db = getDb();
  const [row] = await db
    .select({ shipment: shipments, order: orders, vehicle: vehicles })
    .from(shipments)
    .innerJoin(orders, eq(shipments.orderId, orders.id))
    .innerJoin(vehicles, eq(orders.vehicleId, vehicles.id))
    .where(eq(shipments.id, id))
    .limit(1);
  if (
    !row ||
    (!actor.isAdmin &&
      row.shipment.transportEmployeeEmail !== actor.email.toLowerCase())
  )
    return (
      <DashboardShell
        role="transport"
        title="Тээвэр олдсонгүй"
        subtitle="Энэ тээвэр танд хуваарилагдаагүй байна."
        userName={actor.displayName}
        userCode={actor.email}
        rolePermissions={actor.permissions}
      >
        <div className="portal-empty">
          <PackageSearch />
          <h3>Тээврийн мэдээлэл нээгдэхгүй байна</h3>
          <a href="/transport">
            <ArrowLeft />
            Ажлын самбар
          </a>
        </div>
      </DashboardShell>
    );
  const events = await db
    .select()
    .from(shipmentEvents)
    .where(eq(shipmentEvents.shipmentId, id))
    .orderBy(desc(shipmentEvents.eventAt));
  const { shipment, order, vehicle } = row;
  const progress = shipmentProgress(shipment.status);
  return (
    <DashboardShell
      role="transport"
      title="Тээврийн явц шинэчлэх"
      subtitle={`${order.orderNo ?? order.id} · ${vehicle.make} ${vehicle.model}`}
      userName={actor.displayName}
      userCode={actor.email}
      rolePermissions={actor.permissions}
    >
      <a className="back-link" href="/transport">
        <ArrowLeft />
        Тээврийн ажлын самбар
      </a>
      <section className="transport-detail-hero">
        <div>
          <span>ТЭЭВЭР · {shipment.id}</span>
          <h2>
            {vehicle.make} {vehicle.model}
          </h2>
          <p>
            {shipment.originPort ?? "БНСУ"} → {shipment.destination}
          </p>
        </div>
        <div>
          <small>ОДООГИЙН БАЙРШИЛ</small>
          <strong>
            <MapPin />
            {shipment.currentLocation ?? "Бэлтгэл шат"}
          </strong>
          <span>
            {shipmentStatusLabels[shipment.status] ?? shipment.status}
          </span>
        </div>
        <div>
          <small>ГҮЙЦЭТГЭЛ</small>
          <strong>{progress}%</strong>
          <span>ETA {shipment.estimatedArrival ?? "—"}</span>
        </div>
      </section>
      <div className="transport-detail-layout">
        <section className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <span>09:00 / 18:00</span>
              <h2>Явц шинэчлэх</h2>
            </div>
            <Ship />
          </div>
          {shipment.status === "DELIVERED" ? (
            <div className="transport-complete">
              <CheckCircle2 />
              <strong>Тээвэр хүлээлгэн өгөгдсөн</strong>
              <p>Энэ тээвэр хаагдсан архивт шилжсэн.</p>
            </div>
          ) : actor.permissions.includes("TRANSPORT_STATUS_UPDATE") ? (
            <TransportUpdateForm shipment={shipment} />
          ) : (
            <div className="transport-complete"><strong>Зөвхөн харах эрхтэй</strong><p>Тээврийн явц шинэчлэх эрхийг админаас олгоно.</p></div>
          )}
        </section>
        <section className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <span>ТҮҮХ</span>
              <h2>Явцын шинэчлэлүүд</h2>
            </div>
            <span className="live-data-chip">{events.length} БҮРТГЭЛ</span>
          </div>
          <ShipmentLocationMap
            origin={shipment.originPort}
            location={shipment.currentLocation}
            destination={shipment.destination}
          />
          <div className="shipment-event-list">
            {events.map((event) => (
              <article key={event.id}>
                <i>
                  <CheckCircle2 />
                </i>
                <span>
                  <strong>
                    {shipmentStatusLabels[event.eventCode] ?? event.eventCode}
                  </strong>
                  <small>
                    {event.location ?? ""} ·{" "}
                    {event.eventAt.slice(0, 16).replace("T", " ")}
                  </small>
                  <p>{event.note}</p>
                </span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
