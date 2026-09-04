export type LandedCostMarket = "KOREA" | "USA";
export type LandedCostCurrency = "KRW" | "USD";

export type LandedCostInput = {
  market: LandedCostMarket;
  vehiclePrice: number;
  vehicleCurrency: LandedCostCurrency;
  purchaseFeeMnt: number;
  inlandTransportMnt: number;
  oceanFreightUsd: number;
  krwMntRate: number;
  usdMntRate: number;
  customsMnt: number;
  exciseMnt?: number;
  vatMnt: number;
  otherCostsMnt: number;
  depositMnt: number;
};

const round = (value: number) => Math.round(Math.max(value, 0));
const DEPOSIT_RATE = 0.3;

export function calculateLandedCost(input: LandedCostInput) {
  const currencyRate = input.vehicleCurrency === "USD" ? input.usdMntRate : input.krwMntRate;
  const vehiclePriceMnt = round(input.vehiclePrice * currencyRate);
  const originCostsMnt = round(input.purchaseFeeMnt + input.inlandTransportMnt);
  const vehicleSubtotalMnt = vehiclePriceMnt + originCostsMnt;
  const oceanFreightMnt = round(input.oceanFreightUsd * input.usdMntRate);
  const customsMnt = round(input.customsMnt);
  const exciseMnt = round(input.exciseMnt ?? 0);
  const vatMnt = round(input.vatMnt);
  const otherCostsMnt = round(input.otherCostsMnt);
  const totalMnt = vehiclePriceMnt + originCostsMnt + oceanFreightMnt + customsMnt + exciseMnt + vatMnt + otherCostsMnt;
  const depositMnt = round(vehicleSubtotalMnt * DEPOSIT_RATE);

  return {
    vehiclePriceMnt,
    originCostsMnt,
    vehicleSubtotalMnt,
    oceanFreightMnt,
    customsMnt,
    exciseMnt,
    vatMnt,
    otherCostsMnt,
    totalMnt,
    depositMnt,
    balanceMnt: Math.max(vehicleSubtotalMnt - depositMnt, 0),
  };
}
