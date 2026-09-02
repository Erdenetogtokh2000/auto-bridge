export type PaymentStatus = "PENDING" | "PAID";

export function paymentSummary(
  vehicleSubtotalMnt: number,
  requiredDepositMnt: number,
  rows: Array<{ amountMnt: number; status: string; paymentType?: string }>,
) {
  const paidMnt = rows
    .filter((item) => item.status === "PAID")
    .reduce((sum, item) => sum + item.amountMnt, 0);
  const pendingMnt = rows
    .filter((item) => item.status === "PENDING")
    .reduce((sum, item) => sum + item.amountMnt, 0);
  const vehiclePaidMnt = rows
    .filter((item) => item.paymentType === "VEHICLE" && item.status === "PAID")
    .reduce((sum, item) => sum + item.amountMnt, 0);
  const balanceMnt = Math.max(vehicleSubtotalMnt - requiredDepositMnt - vehiclePaidMnt, 0);
  const depositPaid = rows
    .filter((item) => item.paymentType === "DEPOSIT" && item.status === "PAID")
    .reduce((sum, item) => sum + item.amountMnt, 0);
  const orderStatus = depositPaid < requiredDepositMnt
    ? "AWAITING_DEPOSIT"
    : balanceMnt <= 0
      ? "PAID"
      : "PARTIALLY_PAID";

  return { paidMnt, pendingMnt, balanceMnt, depositPaidMnt: depositPaid, vehiclePaidMnt, orderStatus };
}
