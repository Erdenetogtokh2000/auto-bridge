import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { shipments, userProfiles } from "@/db/schema";
import { adminPermissionCodes, hasAdminPermission, normalizeAdminPermissions, type AdminPermission } from "@/lib/admin-permissions";
import { defaultPermissionsForRole, effectivePermissionsForRole, hasUserPermission, type UserPermission } from "@/lib/role-permissions";

export type ChatGPTUser = {
  displayName: string;
  email: string;
  fullName: string | null;
};

export type AppRole = "ADMIN" | "MANAGER" | "FINANCE" | "TRANSPORT" | "CUSTOMER";

const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER =
  "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";
const SIGN_IN_PATH = "/signin-with-chatgpt";
const SIGN_OUT_PATH = "/signout-with-chatgpt";
const CALLBACK_PATH = "/callback";

// These are the initial staff/customer accounts supplied for the first
// production rollout. They remain a safe fallback when platform environment
// variables are not exposed to a particular server request.
const ROLE_FALLBACK_EMAILS: Record<Exclude<AppRole, "MANAGER">, string[]> = {
  ADMIN: ["erdenetogtokh2000@gmail.com"],
  FINANCE: ["wisenewsolution@gmail.com"],
  TRANSPORT: ["tsagaangerelt2023@gmail.com"],
  CUSTOMER: ["g.iveel0609@gmail.com"],
};

function normalizeEmail(value: string): string {
  return value.trim().replace(/\\/g, "").toLowerCase();
}

async function getRawChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const rawEmail = requestHeaders.get(USER_EMAIL_HEADER);
  const email = rawEmail ? normalizeEmail(rawEmail) : "";
  if (!email) return null;

  const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
  const fullName =
    encodedFullName &&
    requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
      ? safeDecodeURIComponent(encodedFullName)
      : null;

  return {
    displayName: fullName ?? email,
    email,
    fullName,
  };
}

function configuredAdminEmails() {
  return configuredEmails("ADMIN_EMAILS");
}

function configuredEmails(key: "ADMIN_EMAILS" | "FINANCE_EMAILS" | "TRANSPORT_EMAILS" | "CUSTOMER_EMAILS") {
  const configured = (env as unknown as Record<string, string | undefined>)[key] ?? "";
  const role = key.replace("_EMAILS", "") as Exclude<AppRole, "MANAGER">;
  return [...new Set([
    ...configured.split(/[ ,;]+/).map(normalizeEmail).filter(Boolean),
    ...ROLE_FALLBACK_EMAILS[role],
  ])];
}

function configuredRoleForEmail(email: string): AppRole | null {
  const normalized = normalizeEmail(email);
  if (configuredEmails("ADMIN_EMAILS").includes(normalized)) return "ADMIN";
  if (configuredEmails("FINANCE_EMAILS").includes(normalized)) return "FINANCE";
  if (configuredEmails("TRANSPORT_EMAILS").includes(normalized)) return "TRANSPORT";
  if (configuredEmails("CUSTOMER_EMAILS").includes(normalized)) return "CUSTOMER";
  return null;
}

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const user = await getRawChatGPTUser();
  if (!user) return null;
  const email = normalizeEmail(user.email);
  if (configuredAdminEmails().includes(email)) return user;
  const [profile] = await getDb().select({ status: userProfiles.status }).from(userProfiles)
    .where(eq(userProfiles.email, email)).limit(1);
  return profile?.status === "SUSPENDED" ? null : user;
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  if (await getRawChatGPTUser()) redirect("/access-denied");

  // Бүх хамгаалагдсан маршрут нэг нэвтрэх цэгээр эхэлнэ.
  // Нэвтэрсний дараа /login нь эрхээр нь зөв самбар руу чиглүүлнэ.
  redirect(chatGPTSignInPath("/login"));
}

export type CustomerUser = ChatGPTUser & { permissions: UserPermission[] };

export async function getCustomerUser(required?: UserPermission): Promise<CustomerUser | null> {
  const user = await getChatGPTUser();
  if (!user) return null;
  const email = normalizeEmail(user.email);
  const configuredRole = configuredRoleForEmail(email);
  if (configuredRole && configuredRole !== "CUSTOMER") return null;
  if (configuredRole === "CUSTOMER") {
    const permissions = defaultPermissionsForRole("CUSTOMER");
    return required && !hasUserPermission(permissions, required) ? null : { ...user, permissions };
  }
  const [profile] = await getDb().select({ role: userProfiles.role, permissions: userProfiles.permissions, permissionsCustomized: userProfiles.permissionsCustomized }).from(userProfiles)
    .where(and(eq(userProfiles.email, email), eq(userProfiles.status, "ACTIVE"))).limit(1);
  if (profile && profile.role !== "CUSTOMER") return null;
  const permissions = profile
    ? effectivePermissionsForRole("CUSTOMER", profile.permissions, profile.permissionsCustomized)
    : defaultPermissionsForRole("CUSTOMER");
  return required && !hasUserPermission(permissions, required) ? null : { ...user, permissions };
}

/**
 * Resolve the signed-in user's landing area in one server-side place.
 * The browser never supplies a role; the authenticated email and active
 * profile (or an existing transport assignment) are the only sources.
 */
export async function getAuthenticatedRole(): Promise<AppRole | null> {
  const user = await getChatGPTUser();
  if (!user) return null;

  const email = normalizeEmail(user.email);
  const configuredRole = configuredRoleForEmail(email);
  if (configuredRole) return configuredRole;

  const [profile] = await getDb().select({ role: userProfiles.role })
    .from(userProfiles)
    .where(and(eq(userProfiles.email, email), eq(userProfiles.status, "ACTIVE")))
    .limit(1);

  if (profile?.role === "ADMIN") return "ADMIN";
  if (profile?.role === "MANAGER" || profile?.role === "DEALER") return "MANAGER";
  if (profile?.role === "FINANCE") return "FINANCE";
  if (profile?.role === "TRANSPORT") return "TRANSPORT";
  if (profile?.role === "CUSTOMER") return "CUSTOMER";

  const [assigned] = await getDb().select({ id: shipments.id })
    .from(shipments)
    .where(eq(shipments.transportEmployeeEmail, email))
    .limit(1);
  if (assigned) return "TRANSPORT";

  // A signed-in user without a profile is a customer by default. Public
  // quote requests create this profile automatically; staff roles are
  // granted explicitly by an administrator.
  if (!profile) return "CUSTOMER";
  return null;
}

export function roleHomePath(role: AppRole): string {
  switch (role) {
    case "ADMIN": return "/admin";
    case "MANAGER": return "/admin";
    case "FINANCE": return "/finance";
    case "TRANSPORT": return "/transport";
    case "CUSTOMER": return "/portal";
  }
}

export async function requireCustomerUser(returnTo: string): Promise<CustomerUser> {
  const user = await getCustomerUser();
  if (user) return user;
  await requireChatGPTUser(returnTo);
  redirect("/access-denied");
}

export async function requireCustomerPermission(returnTo: string, required: UserPermission): Promise<CustomerUser> {
  const user = await getCustomerUser(required);
  if (user) return user;
  await requireChatGPTUser(returnTo);
  redirect("/access-denied");
}

export async function getAdminUser(): Promise<ChatGPTUser | null> {
  const user = await getChatGPTUser();
  if (!user) return null;
  const email = normalizeEmail(user.email);
  if (configuredAdminEmails().includes(email)) return user;
  const [profile] = await getDb().select({ id: userProfiles.id }).from(userProfiles)
    .where(and(eq(userProfiles.email, email), eq(userProfiles.role, "ADMIN"), eq(userProfiles.status, "ACTIVE"))).limit(1);
  return profile ? user : null;
}

export async function requireAdmin(returnTo: string): Promise<ChatGPTUser> {
  const user = await requireChatGPTUser(returnTo);
  const email = normalizeEmail(user.email);
  if (configuredAdminEmails().includes(email)) return user;
  const [profile] = await getDb().select({ id: userProfiles.id }).from(userProfiles)
    .where(and(eq(userProfiles.email, email), eq(userProfiles.role, "ADMIN"), eq(userProfiles.status, "ACTIVE"))).limit(1);
  if (!profile) redirect("/access-denied");
  return user;
}

export type AdminStaffUser = ChatGPTUser & {
  isAdmin: boolean;
  permissions: AdminPermission[];
};

export async function getAdminStaffUser(required?: AdminPermission): Promise<AdminStaffUser | null> {
  const user = await getChatGPTUser();
  if (!user) return null;
  const email = normalizeEmail(user.email);
  if (configuredAdminEmails().includes(email)) {
    return { ...user, isAdmin: true, permissions: [...adminPermissionCodes] };
  }
  const [profile] = await getDb().select({ role: userProfiles.role, permissions: userProfiles.permissions })
    .from(userProfiles)
    .where(and(eq(userProfiles.email, email), eq(userProfiles.status, "ACTIVE")))
    .limit(1);
  if (profile?.role === "ADMIN") return { ...user, isAdmin: true, permissions: [...adminPermissionCodes] };
  if (profile?.role !== "MANAGER" && profile?.role !== "DEALER") return null;
  const permissions = normalizeAdminPermissions(profile.permissions);
  if (required && !hasAdminPermission(permissions, required)) return null;
  return { ...user, isAdmin: false, permissions };
}

export async function requireAdminPermission(returnTo: string, required: AdminPermission): Promise<AdminStaffUser> {
  const actor = await getAdminStaffUser(required);
  if (actor) return actor;
  await requireChatGPTUser(returnTo);
  redirect("/access-denied");
}

export async function requireAdminStaff(returnTo: string): Promise<AdminStaffUser> {
  const actor = await getAdminStaffUser();
  if (actor) return actor;
  await requireChatGPTUser(returnTo);
  redirect("/access-denied");
}

export const getQuotesManager = () => getAdminStaffUser("QUOTES_MANAGE");
export const getOrdersManager = () => getAdminStaffUser("ORDERS_MANAGE");
export const getCatalogManager = () => getAdminStaffUser("CATALOG_MANAGE");
export const getNotificationsManager = () => getAdminStaffUser("NOTIFICATIONS_MANAGE");
export const getExposManager = () => getAdminStaffUser("EXPOS_MANAGE");
export const getSettingsManager = () => getAdminStaffUser("SETTINGS_MANAGE");

export type TransportUser = ChatGPTUser & { isAdmin: boolean; permissions: UserPermission[] };

export async function getTransportUser(required?: UserPermission): Promise<TransportUser | null> {
  const user = await getChatGPTUser();
  if (!user) return null;
  const email = normalizeEmail(user.email);
  const configuredRole = configuredRoleForEmail(email);
  if (configuredRole === "ADMIN") return { ...user, isAdmin: true, permissions: defaultPermissionsForRole("TRANSPORT") };
  if (configuredRole === "TRANSPORT") return { ...user, isAdmin: false, permissions: defaultPermissionsForRole("TRANSPORT") };
  const [profile] = await getDb().select({ role: userProfiles.role, permissions: userProfiles.permissions, permissionsCustomized: userProfiles.permissionsCustomized }).from(userProfiles)
    .where(and(eq(userProfiles.email, email), eq(userProfiles.status, "ACTIVE"))).limit(1);
  if (profile?.role === "ADMIN") return { ...user, isAdmin: true, permissions: defaultPermissionsForRole("TRANSPORT") };
  if (profile?.role === "TRANSPORT") {
    const permissions = effectivePermissionsForRole("TRANSPORT", profile.permissions, profile.permissionsCustomized);
    return required && !hasUserPermission(permissions, required) ? null : { ...user, isAdmin: false, permissions };
  }
  const [assigned] = await getDb().select({ id: shipments.id }).from(shipments)
    .where(eq(shipments.transportEmployeeEmail, email)).limit(1);
  if (!assigned) return null;
  const permissions = defaultPermissionsForRole("TRANSPORT");
  return required && !hasUserPermission(permissions, required) ? null : { ...user, isAdmin: false, permissions };
}

export async function requireTransportUser(returnTo: string): Promise<TransportUser> {
  const user = await getTransportUser();
  if (user) return user;
  await requireChatGPTUser(returnTo);
  redirect("/access-denied");
}

export async function requireTransportPermission(returnTo: string, required: UserPermission): Promise<TransportUser> {
  const user = await getTransportUser(required);
  if (user) return user;
  await requireChatGPTUser(returnTo);
  redirect("/access-denied");
}

export type FinanceUser = ChatGPTUser & { isAdmin: boolean; permissions: UserPermission[] };

export async function getFinanceUser(required?: UserPermission): Promise<FinanceUser | null> {
  const user = await getChatGPTUser();
  if (!user) return null;
  const email = normalizeEmail(user.email);
  if (configuredRoleForEmail(email) === "FINANCE") return { ...user, isAdmin: false, permissions: defaultPermissionsForRole("FINANCE") };
  const [profile] = await getDb().select({ role: userProfiles.role, permissions: userProfiles.permissions, permissionsCustomized: userProfiles.permissionsCustomized }).from(userProfiles)
    .where(and(eq(userProfiles.email, email), eq(userProfiles.status, "ACTIVE"))).limit(1);
  if (profile?.role !== "FINANCE") return null;
  const permissions = effectivePermissionsForRole("FINANCE", profile.permissions, profile.permissionsCustomized);
  return required && !hasUserPermission(permissions, required) ? null : { ...user, isAdmin: false, permissions };
}

export async function requireFinancePermission(returnTo: string, required: UserPermission): Promise<FinanceUser> {
  const user = await getFinanceUser(required);
  if (user) return user;
  await requireChatGPTUser(returnTo);
  redirect("/access-denied");
}

export async function requireFinance(returnTo: string): Promise<FinanceUser> {
  const user = await getFinanceUser();
  if (user) return user;
  await requireChatGPTUser(returnTo);
  redirect("/access-denied");
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (isReservedAuthPath(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return (
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname === CALLBACK_PATH
  );
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
