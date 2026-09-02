import { calculateQuote, calculateVehiclePaymentTerms, type QuoteCalculationInput } from "@/lib/quote-calculation";

type OrderPaymentFields = {
  vehicleSubtotalMnt: number;
  depositAmountMnt: number;
  totalAmountMnt: number;
};

export function resolveOrderPaymentTerms(
  order: OrderPaymentFields,
  estimate?: QuoteCalculationInput | null,
) {
  if (order.vehicleSubtotalMnt > 0) {
    return calculateVehiclePaymentTerms(order.vehicleSubtotalMnt);
  }
  if (estimate) {
    const totals = calculateQuote(estimate);
    return calculateVehiclePaymentTerms(totals.koreaSubtotalMnt);
  }
  const inferredSubtotal = order.depositAmountMnt > 0
    ? Math.round(order.depositAmountMnt / 0.3)
    : order.totalAmountMnt;
  return calculateVehiclePaymentTerms(inferredSubtotal);
}
