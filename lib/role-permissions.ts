import { adminPermissionCodes, adminPermissionDefinitions, type AdminPermission } from "@/lib/admin-permissions";

export const operationalPermissionCodes = [
  "CUSTOMER_DASHBOARD_VIEW",
  "CUSTOMER_QUOTES_VIEW",
  "CUSTOMER_QUOTE_DECIDE",
  "CUSTOMER_ORDERS_VIEW",
  "CUSTOMER_DOCUMENT_DOWNLOAD",
  "CUSTOMER_DOCUMENT_UPLOAD",
  "CUSTOMER_PAYMENT_RECEIPT_UPLOAD",
  "CUSTOMER_FINANCING_REQUEST",
  "CUSTOMER_NOTIFICATIONS_VIEW",
  "TRANSPORT_ASSIGNED_VIEW",
  "TRANSPORT_STATUS_UPDATE",
  "TRANSPORT_NOTIFICATIONS_VIEW",
  "FINANCE_REQUEST_VIEW",
  "FINANCE_DECIDE",
  "FINANCE_NOTIFICATIONS_VIEW",
] as const;

export type OperationalPermission = typeof operationalPermissionCodes[number];
export type UserPermission = AdminPermission | OperationalPermission;
export type PermissionRole = "CUSTOMER" | "DEALER" | "TRANSPORT" | "FINANCE" | "MANAGER" | "ADMIN";
export type UserPermissionDefinition = { code: UserPermission; title: string; description: string };

const customerPermissions: UserPermissionDefinition[] = [
  { code: "CUSTOMER_DASHBOARD_VIEW", title: "Хяналтын самбар харах", description: "Өөрийн захиалгын нэгдсэн тоймыг харах" },
  { code: "CUSTOMER_QUOTES_VIEW", title: "Үнийн санал харах", description: "Зөвхөн өөрийн үнийн саналын жагсаалт, дэлгэрэнгүйг харах" },
  { code: "CUSTOMER_QUOTE_DECIDE", title: "Үнийн саналд хариу өгөх", description: "Өөрийн саналыг зөвшөөрөх эсвэл татгалзах" },
  { code: "CUSTOMER_ORDERS_VIEW", title: "Захиалга харах", description: "Өөрийн автомашин, төлбөр болон тээврийн явцыг харах" },
  { code: "CUSTOMER_DOCUMENT_DOWNLOAD", title: "Баримт татах", description: "Өөрийн баталгаажсан бичиг баримтыг татах" },
  { code: "CUSTOMER_DOCUMENT_UPLOAD", title: "Баримт илгээх", description: "Өөрийн захиалгад бичиг баримт хавсаргах" },
  { code: "CUSTOMER_PAYMENT_RECEIPT_UPLOAD", title: "Төлбөрийн баримт илгээх", description: "30%, 70% болон бусад төлбөрийн баримт хавсаргах" },
  { code: "CUSTOMER_FINANCING_REQUEST", title: "Санхүүжилт хүсэх", description: "70% болон гааль, татварын санхүүжилтийн хүсэлт илгээх" },
  { code: "CUSTOMER_NOTIFICATIONS_VIEW", title: "Мэдэгдэл харах", description: "Өөрт ирсэн системийн мэдэгдлийг харах" },
];

const transportPermissions: UserPermissionDefinition[] = [
  { code: "TRANSPORT_ASSIGNED_VIEW", title: "Хуваарилсан тээвэр харах", description: "Зөвхөн өөрт хуваарилсан тээвэр, захиалгыг харах" },
  { code: "TRANSPORT_STATUS_UPDATE", title: "Тээврийн явц шинэчлэх", description: "Төлөв, байршил, ETA, контейнер болон B/L шинэчлэх" },
  { code: "TRANSPORT_NOTIFICATIONS_VIEW", title: "Тээврийн мэдэгдэл харах", description: "Өөрт ирсэн тээврийн мэдэгдлийг харах" },
];

const financePermissions: UserPermissionDefinition[] = [
  { code: "FINANCE_REQUEST_VIEW", title: "Санхүүжилтийн хүсэлт харах", description: "ББСБ-д ирсэн 70% болон гаалийн хүсэлтийг харах" },
  { code: "FINANCE_DECIDE", title: "Санхүүжилт шийдвэрлэх", description: "Хүсэлтийг шалгах, зөвшөөрөх эсвэл татгалзах" },
  { code: "FINANCE_NOTIFICATIONS_VIEW", title: "ББСБ мэдэгдэл харах", description: "Санхүүжилтийн шинэ хүсэлт, өөрчлөлтийн мэдэгдэл харах" },
];

export function permissionDefinitionsForRole(role: PermissionRole): UserPermissionDefinition[] {
  if (role === "MANAGER" || role === "DEALER") return adminPermissionDefinitions;
  if (role === "FINANCE") return financePermissions;
  if (role === "TRANSPORT") return transportPermissions;
  if (role === "CUSTOMER") return customerPermissions;
  return [];
}

export function defaultPermissionsForRole(role: PermissionRole): UserPermission[] {
  if (role === "ADMIN") return [...adminPermissionCodes];
  if (role === "MANAGER" || role === "DEALER") return [];
  return permissionDefinitionsForRole(role).map(item => item.code);
}

export function normalizePermissionsForRole(role: PermissionRole, value: unknown): UserPermission[] {
  let items: unknown = value;
  if (typeof value === "string") {
    try { items = JSON.parse(value); }
    catch { return []; }
  }
  if (!Array.isArray(items)) return [];
  const allowed = new Set(permissionDefinitionsForRole(role).map(item => item.code));
  return [...new Set(items.filter((item): item is UserPermission => typeof item === "string" && allowed.has(item as UserPermission)))];
}

export function effectivePermissionsForRole(role: PermissionRole, value: unknown, customized: boolean): UserPermission[] {
  if (role === "ADMIN") return defaultPermissionsForRole(role);
  const stored = normalizePermissionsForRole(role, value);
  if (role === "MANAGER" || role === "DEALER") return stored;
  return customized ? stored : defaultPermissionsForRole(role);
}

export function hasUserPermission(permissions: readonly UserPermission[], required: UserPermission): boolean {
  return permissions.includes(required);
}
