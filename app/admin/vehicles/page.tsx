import { and, desc, eq } from "drizzle-orm";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { VehicleManager, type ManagedVehicle } from "@/app/components/vehicle-manager";
import { requireAdminPermission } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { notifications, vehicles } from "@/db/schema";
import { CarFront, CircleCheckBig, Eye, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminVehiclesPage() {
  const admin = await requireAdminPermission("/admin/vehicles", "CATALOG_MANAGE");
  const db = getDb();
  const [rows, unread] = await Promise.all([
    db.select().from(vehicles).orderBy(desc(vehicles.createdAt)),
    db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.recipientType, "ADMIN"), eq(notifications.isRead, false))),
  ]);
  const managed: ManagedVehicle[] = rows.map(row => ({ id: row.id, stockNo: row.stockNo, sourceMarket: row.sourceMarket as ManagedVehicle["sourceMarket"], listingUrl: row.listingUrl, make: row.make, model: row.model, productionYear: row.productionYear, mileageKm: row.mileageKm ?? 0, vin: row.vin, fuelType: row.fuelType, trim: row.trim, color: row.color, engineCapacityCc: row.engineCapacityCc, priceAmount: Number(row.priceAmount ?? row.priceKrw ?? 0), priceCurrency: (row.priceCurrency ?? "KRW") as ManagedVehicle["priceCurrency"], imageUrl: row.imageUrl, imageObjectKey: row.imageObjectKey, galleryImageUrls: row.galleryImageUrls, description: row.description, isPublished: row.isPublished, isFeatured: row.isFeatured, status: row.status as ManagedVehicle["status"] }));
  const published = managed.filter(row => row.isPublished).length;
  const available = managed.filter(row => row.status === "AVAILABLE").length;
  const mongolia = managed.filter(row => row.sourceMarket === "MONGOLIA" && row.status === "AVAILABLE").length;
  return <DashboardShell role="admin" title="Автомашин ба каталог" subtitle="Солонгос, Америк болон Монголд бэлэн автомашины нөөцийг удирдана." userName={admin.displayName} userCode={admin.email} unreadCount={unread.length} notificationHref="/admin/notifications" adminPermissions={admin.permissions} isSystemAdmin={admin.isAdmin}>
    <section className="stat-grid vehicle-admin-stats"><article className="stat-card"><div className="stat-icon blue"><CarFront/></div><span>Нийт автомашин</span><strong>{managed.length}</strong><small>Захиалга ба каталог</small></article><article className="stat-card"><div className="stat-icon green"><CircleCheckBig/></div><span>Бэлэн нөөц</span><strong>{available}</strong><small>Худалдах боломжтой</small></article><article className="stat-card"><div className="stat-icon violet"><Eye/></div><span>Нийтэлсэн</span><strong>{published}</strong><small>Нийтийн каталогт харагдана</small></article><article className="stat-card"><div className="stat-icon amber"><MapPin/></div><span>Монголд бэлэн</span><strong>{mongolia}</strong><small>Шууд үзэж сонгох</small></article></section>
    <VehicleManager vehicles={managed}/>
  </DashboardShell>;
}
