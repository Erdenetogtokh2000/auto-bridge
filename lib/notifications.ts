export type NotificationRecipient = "CUSTOMER" | "ADMIN" | "FINANCE" | "TRANSPORT";

export function notificationValues(input: {
  recipientType: NotificationRecipient;
  recipientEmail?: string | null;
  orderId?: string | null;
  type: string;
  title: string;
  message: string;
  href?: string | null;
  actorEmail?: string | null;
}) {
  return {
    id: `NTF-${crypto.randomUUID()}`,
    recipientType: input.recipientType,
    recipientEmail: input.recipientEmail?.toLowerCase() ?? null,
    orderId: input.orderId ?? null,
    type: input.type,
    title: input.title.slice(0, 160),
    message: input.message.slice(0, 600),
    href: input.href ?? null,
    actorEmail: input.actorEmail?.toLowerCase() ?? null,
  };
}
