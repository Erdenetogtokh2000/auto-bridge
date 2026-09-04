export type QuoteCalculationInput = {
  vehiclePriceKrw: number;
  purchaseFeeKrw: number;
  inlandTransportKrw: number;
  oceanFreightUsd: number;
  krwMntRate: number;
  usdMntRate: number;
  customsMnt: number;
  exciseMnt?: number;
  vatMnt: number;
  otherCostsMnt: number;
  depositMnt: number;
};

export const DEPOSIT_RATE = 0.3;
export const BALANCE_RATE = 0.7;

export function calculateVehiclePaymentTerms(vehicleSubtotalMnt: number) {
  const normalizedSubtotal = Math.max(Math.round(vehicleSubtotalMnt), 0);
  const depositMnt = Math.round(normalizedSubtotal * DEPOSIT_RATE);
  return {
    vehicleSubtotalMnt: normalizedSubtotal,
    depositMnt,
    balanceMnt: Math.max(normalizedSubtotal - depositMnt, 0),
  };
}

export function calculateQuote(input: QuoteCalculationInput) {
  const koreaSubtotalKrw = input.vehiclePriceKrw + input.purchaseFeeKrw + input.inlandTransportKrw;
  const koreaSubtotalMnt = Math.round(koreaSubtotalKrw * input.krwMntRate);
  const oceanFreightMnt = Math.round(input.oceanFreightUsd * input.usdMntRate);
  const exciseMnt = Math.max(Math.round(input.exciseMnt ?? 0), 0);
  const totalMnt = koreaSubtotalMnt + oceanFreightMnt + input.customsMnt + exciseMnt + input.vatMnt + input.otherCostsMnt;
  const paymentTerms = calculateVehiclePaymentTerms(koreaSubtotalMnt);
  return {
    koreaSubtotalKrw,
    koreaSubtotalMnt,
    oceanFreightMnt,
    exciseMnt,
    totalMnt,
    depositMnt: paymentTerms.depositMnt,
    balanceMnt: paymentTerms.balanceMnt,
  };
}
