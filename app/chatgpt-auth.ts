import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
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

const SIGN_IN_PATH = "/login";
const SIGN_OUT_PATH = "/logout";
const CALLBACK_PATH = "/callback";

const ROLE_FALLBACK_EMAILS: Record<AppRole, string[]> = {
  ADMIN: ["erdenetogtokh2000@gmail.com"],
  MANAGER: ["g.iveel0609@gmail.com"],
  FINANCE: ["wisenewsolution@gmail.com"],
  TRANSPORT: ["tsagaangerelt2023@gmail.com"],
  CUSTOMER: [],
};

const MANAGER_FALLBACK_PERMISSIONS: AdminPermission[] = adminPermissionCodes.filter(
  (code) => code !== "SETTINGS_MANAGE",
);

function normalizeEmail(value: string): string {
  return value.trim().replace(/\\/g, "").toLowerCase();
}

async function getRawChatGPTUser(): Promise<ChatGPTUser | null> {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) return null;

  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (entries) => {
        try {
          entries.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always write cookies. The auth callback
          // route refreshes sessions before users reach protected pages.
        }
      },
    },
  });

  const { data: { user: identityUser } } = await supabase.auth.getUser();
  const email = identityUser?.email ? normalizeEmail(identityUser.email) : "";
  if (!email) return null;
  const fullName = typeof identityUser?.user_metadata?.full_name === "string"
    ? identityUser.user_metadata.full_name
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

function configuredEmails(key: "ADMIN_EMAILS" | "MANAGER_EMAILS" | "FINANCE_EMAILS" | "TRANSPORT_EMAILS" | "CUSTOMER_EMAILS") {
  const configured = process.env[key] ?? "";
  const role = key.replace("_EMAILS", "") as AppRole;
  return [...new Set([
    ...configured.split(/[ ,;]+/).map(normalizeEmail).filter(Boolean),
    ...ROLE_FALLBACK_EMAILS[role],
  ])];
}

function configuredRoleForEmail(email: string): AppRole | null {
  const normalized = normalizeEmail(email);
  if (configuredEmails("ADMIN_EMAILS").includes(normalized)) return "ADMIN";
  if (configuredEmails("MANAGER_EMAILS").includes(normalized)) return "MANAGER";
  if (configuredEmails("FINANCE_EMAILS").includes(normalized)) return "FINANCE";
  if (configuredEmails("TRANSPORT_EMAILS").includes(normalized)) return "TRANSPORT";
  if (configuredEmails("CUSTOMER_EMAILS").includes(normalized)) return "CUSTOMER";
  return null;
}

type AuthProfile = {
  role: string;
  permissions: string;
  permissionsCustomized: boolean;
  status: string;
};

async function getAuthProfile(email: string): Promise<AuthProfile | null> {
  try {
    const [profile] = await getDb().select({
      role: userProfiles.role,
      permissions: userProfiles.permissions,
      permissionsCustomized: userProfiles.permissionsCustomized,
      status: userProfiles.status,
    }).from(userProfiles).where(eq(userProfiles.email, normalizeEmail(email))).limit(1);
    return profile ?? null;
  } catch {
    // Fallback accounts can still sign in if the application DB is temporarily
    // unavailable. Whenever a DB profile exists, it is authoritative.
    return null;
  }
}

function appRoleFromProfile(role: string | null | undefined): AppRole | null {
  if (role === "ADMIN") return "ADMIN";
  if (role === "MANAGER" || role === "DEALER") return "MANAGER";
  if (role === "FINANCE") return "FINANCE";
  if (role === "TRANSPORT") return "TRANSPORT";
  if (role === "CUSTOMER") return "CUSTOMER";
  return null;
}

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const user = await getRawChatGPTUser();
  if (!user) return null;
  const profile = await getAuthProfile(user.email);
  if (profile?.status === "SUSPENDED") return null;
  return user;
}

export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  if (await getRawChatGPTUser()) redirect("/access-denied");
  redirect(chatGPTSignInPath("/login"));
}

export type CustomerUser = ChatGPTUser & { permissions: UserPermission[] };

export async function getCustomerUser(required?: UserPermission): Promise<CustomerUser | null> {
  const user = await getChatGPTUser();
  if (!user) return null;
  const email = normalizeEmail(user.email);
  const profile = await getAuthProfile(email);

  if (profile) {
    if (profile.status !== "ACTIVE" || profile.role !== "CUSTOMER") return null;
    const permissions = effectivePermissionsForRole("CUSTOMER", profile.permissions, profile.permissionsCustomized);
    return required && !hasUserPermission(permissions, required) ? null : { ...user, permissions };
  }

  const configuredRole = configuredRoleForEmail(email);
  if (configuredRole && configuredRole !== "CUSTOMER") return null;
  const permissions = defaultPermissionsForRole("CUSTOMER");
  return required && !hasUserPermission(permissions, required) ? null : { ...user, permissions };
}

export async function getAuthenticatedRole(): Promise<AppRole | null> {
  const user = await getChatGPTUser();
  if (!user) return null;

  const email = normalizeEmail(user.email);
  const configuredRole = configuredRoleForEmail(email);

  // The owner/admin fallback remains authoritative. Every other existing
  // Admin-managed profile overrides fallback role mappings.
  if (configuredRole === "ADMIN") return "ADMIN";

  const profile = await getAuthProfile(email);
  if (profile) {
    if (profile.status !== "ACTIVE") return null;
    return appRoleFromProfile(profile.role);
  }

  if (configuredRole) return configuredRole;

  try {
    const [assigned] = await getDb().select({ id: shipments.id })
      .from(shipments)
      .where(eq(shipments.transportEmployeeEmail, email))
      .limit(1);
    if (assigned) return "TRANSPORT";
  } catch {
    // Authentication itself should not fail because of a DB outage.
  }

  return "CUSTOMER";
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
  const profile = await getAuthProfile(email);
  return profile?.status === "ACTIVE" && profile.role === "ADMIN" ? user : null;
}

export async function requireAdmin(returnTo: string): Promise<ChatGPTUser> {
  const user = await requireChatGPTUser(returnTo);
  const email = normalizeEmail(user.email);
  if (configuredAdminEmails().includes(email)) return user;
  const profile = await getAuthProfile(email);
  if (profile?.status !== "ACTIVE" || profile.role !== "ADMIN") redirect("/access-denied");
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
  const configuredRole = configuredRoleForEmail(email);

  if (configuredRole === "ADMIN") {
    return { ...user, isAdmin: true, permissions: [...adminPermissionCodes] };
  }

  const profile = await getAuthProfile(email);
  if (profile) {
    if (profile.status !== "ACTIVE") return null;
    if (profile.role === "ADMIN") return { ...user, isAdmin: true, permissions: [...adminPermissionCodes] };
    if (profile.role !== "MANAGER" && profile.role !== "DEALER") return null;
    const permissions = normalizeAdminPermissions(profile.permissions);
    if (required && !hasAdminPermission(permissions, required)) return null;
    return { ...user, isAdmin: false, permissions };
  }

  if (configuredRole === "MANAGER") {
    if (required && !hasAdminPermission(MANAGER_FALLBACK_PERMISSIONS, required)) return null;
    return { ...user, isAdmin: false, permissions: [...MANAGER_FALLBACK_PERMISSIONS] };
  }
  return null;
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

  const profile = await getAuthProfile(email);
  if (profile) {
    if (profile.status !== "ACTIVE") return null;
    if (profile.role === "ADMIN") return { ...user, isAdmin: true, permissions: defaultPermissionsForRole("TRANSPORT") };
    if (profile.role !== "TRANSPORT") return null;
    const permissions = effectivePermissionsForRole("TRANSPORT", profile.permissions, profile.permissionsCustomized);
    return required && !hasUserPermission(permissions, required) ? null : { ...user, isAdmin: false, permissions };
  }

  if (configuredRole === "TRANSPORT") {
    const permissions = defaultPermissionsForRole("TRANSPORT");
    return required && !hasUserPermission(permissions, required) ? null : { ...user, isAdmin: false, permissions };
  }

  try {
    const [assigned] = await getDb().select({ id: shipments.id })
      .from(shipments)
      .where(eq(shipments.transportEmployeeEmail, email)).limit(1);
    if (!assigned) return null;
  } catch {
    return null;
  }
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
  const profile = await getAuthProfile(email);

  if (profile) {
    if (profile.status !== "ACTIVE" || profile.role !== "FINANCE") return null;
    const permissions = effectivePermissionsForRole("FINANCE", profile.permissions, profile.permissionsCustomized);
    return required && !hasUserPermission(permissions, required) ? null : { ...user, isAdmin: false, permissions };
  }

  if (configuredRoleForEmail(email) !== "FINANCE") return null;
  const permissions = defaultPermissionsForRole("FINANCE");
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
