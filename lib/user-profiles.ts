import { normalizePermissionsForRole } from "@/lib/role-permissions";

export const userRoles = ["CUSTOMER", "DEALER", "TRANSPORT", "FINANCE", "MANAGER", "ADMIN"] as const;
export const userStatuses = ["ACTIVE", "SUSPENDED"] as const;

export type UserRole = typeof userRoles[number];
export type UserStatus = typeof userStatuses[number];

export function normalizeUserProfile(payload: Record<string, unknown>) {
  const email = String(payload.email ?? "").trim().toLowerCase();
  const fullName = String(payload.fullName ?? "").trim();
  const phone = String(payload.phone ?? "").trim();
  const role = String(payload.role ?? "CUSTOMER") as UserRole;
  const status = String(payload.status ?? "ACTIVE") as UserStatus;
  const companyName = String(payload.companyName ?? "").trim();
  const companyRegistrationNo = String(payload.companyRegistrationNo ?? "").trim();
  const financingEligible = payload.financingEligible === true || payload.financingEligible === "true";
  const notes = String(payload.notes ?? "").trim();
  const permissionsCustomized = role !== "ADMIN" && (payload.permissionsCustomized === true || payload.permissionsCustomized === "true");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("INVALID_EMAIL");
  if (!userRoles.includes(role)) throw new Error("INVALID_ROLE");
  if (!userStatuses.includes(status)) throw new Error("INVALID_STATUS");
  if (!fullName || fullName.length > 160 || phone.length > 50 || companyName.length > 180 || companyRegistrationNo.length > 80 || notes.length > 1000) throw new Error("INVALID_FIELDS");
  return {
    email, fullName, phone: phone || null, role, status,
    permissions: JSON.stringify(normalizePermissionsForRole(role, payload.permissions)),
    permissionsCustomized,
    companyName: companyName || null,
    companyRegistrationNo: companyRegistrationNo || null,
    financingEligible,
    notes: notes || null,
  };
}
