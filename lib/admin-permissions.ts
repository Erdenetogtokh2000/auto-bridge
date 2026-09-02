export const adminPermissionCodes = [
  "DASHBOARD_VIEW",
  "QUOTES_MANAGE",
  "ORDERS_MANAGE",
  "CATALOG_MANAGE",
  "NOTIFICATIONS_MANAGE",
  "EXPOS_MANAGE",
  "FINANCING_VIEW",
  "REPORTS_VIEW",
  "SETTINGS_MANAGE",
] as const;

export type AdminPermission = typeof adminPermissionCodes[number];

export type AdminPermissionDefinition = {
  code: AdminPermission;
  title: string;
  description: string;
};

export const adminPermissionDefinitions: AdminPermissionDefinition[] = [
  { code: "DASHBOARD_VIEW", title: "Хяналтын самбар", description: "Нэгдсэн үзүүлэлт болон ажлын тойм харах" },
  { code: "QUOTES_MANAGE", title: "Үнийн хүсэлт", description: "Хүсэлт боловсруулах, тооцоо болон санал бэлтгэх" },
  { code: "ORDERS_MANAGE", title: "Захиалга, төлбөр, тээвэр", description: "Захиалга, төлбөр, бичиг баримт болон тээврийг удирдах" },
  { code: "CATALOG_MANAGE", title: "Автомашины каталог", description: "Автомашин нэмэх, засах, нийтлэх болон устгах" },
  { code: "NOTIFICATIONS_MANAGE", title: "Мэдэгдэл", description: "Админы мэдэгдэл харах, уншсан төлөв өөрчлөх" },
  { code: "EXPOS_MANAGE", title: "Авто экспо", description: "Экспо нэмэх, засах болон нийтлэх" },
  { code: "FINANCING_VIEW", title: "Санхүүжилт", description: "ББСБ-ын хүсэлт, шийдвэр болон явцыг харах" },
  { code: "REPORTS_VIEW", title: "Тайлан", description: "Борлуулалт, төлбөр, тээврийн тайлан харах" },
  { code: "SETTINGS_MANAGE", title: "Системийн тохиргоо", description: "Компанийн мэдээлэл, ханш болон сануулгыг тохируулах" },
];

const permissionSet = new Set<string>(adminPermissionCodes);

export function normalizeAdminPermissions(value: unknown): AdminPermission[] {
  let items: unknown = value;
  if (typeof value === "string") {
    try { items = JSON.parse(value); }
    catch { return []; }
  }
  if (!Array.isArray(items)) return [];
  return [...new Set(items.filter((item): item is AdminPermission => typeof item === "string" && permissionSet.has(item)))];
}

export function serializeAdminPermissions(value: unknown): string {
  return JSON.stringify(normalizeAdminPermissions(value));
}

export function hasAdminPermission(permissions: readonly AdminPermission[], required: AdminPermission): boolean {
  return permissions.includes(required);
}

