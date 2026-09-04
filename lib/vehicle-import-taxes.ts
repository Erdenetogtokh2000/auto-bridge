export type VehicleFuelClass = "GASOLINE_DIESEL" | "HYBRID_LPG" | "ELECTRIC";

export const CUSTOMS_DUTY_RATE = 0.05;
export const VAT_RATE = 0.10;
export const LUXURY_EXCISE_THRESHOLD_MNT = 360_000_000;
export const LUXURY_EXCISE_RATE = 0.33;

const STANDARD_EXCISE = [
  [750_000, 1_600_000, 3_350_000, 10_000_000],
  [2_300_000, 3_200_000, 5_000_000, 11_700_000],
  [3_050_000, 4_000_000, 6_700_000, 13_350_000],
  [6_850_000, 8_000_000, 10_850_000, 17_500_000],
  [14_210_000, 27_200_000, 39_150_000, 65_975_000],
] as const;

const HYBRID_LPG_EXCISE = [
  [375_000, 800_000, 1_675_000, 5_000_000],
  [1_150_000, 1_600_000, 2_500_000, 5_850_000],
  [1_525_000, 2_000_000, 3_350_000, 6_675_000],
  [3_425_000, 4_000_000, 5_425_000, 8_750_000],
  [7_105_000, 13_600_000, 19_575_000, 32_987_500],
] as const;

const ELECTRIC_EXCISE = [375_000, 800_000, 1_675_000, 5_000_000] as const;

const ageBandIndex = (productionYear: number, currentYear: number) => {
  const age = Math.max(currentYear - productionYear, 0);
  if (age <= 3) return 0;
  if (age <= 6) return 1;
  if (age <= 9) return 2;
  return 3;
};

const engineBandIndex = (engineCapacityCc: number) => {
  if (engineCapacityCc <= 1500) return 0;
  if (engineCapacityCc <= 2500) return 1;
  if (engineCapacityCc <= 3500) return 2;
  if (engineCapacityCc <= 4500) return 3;
  return 4;
};

export function normalizeVehicleFuelClass(value: string): VehicleFuelClass {
  const normalized = value.trim().toUpperCase();
  if (["ELECTRIC", "EV", "ЦАХИЛГААН"].includes(normalized)) return "ELECTRIC";
  if (["HYBRID_LPG", "HYBRID", "LPG", "ХОС ТЭЖЭЭЛТ"].includes(normalized)) return "HYBRID_LPG";
  return "GASOLINE_DIESEL";
}

export function calculateVehicleExcise({
  productionYear,
  engineCapacityCc,
  fuelClass,
  customsValueMnt,
  currentYear = new Date().getFullYear(),
}: {
  productionYear: number;
  engineCapacityCc: number;
  fuelClass: VehicleFuelClass;
  customsValueMnt: number;
  currentYear?: number;
}) {
  const safeYear = Number.isFinite(productionYear) && productionYear > 1900 ? Math.min(Math.round(productionYear), currentYear) : currentYear;
  const ageIndex = ageBandIndex(safeYear, currentYear);
  const engineIndex = engineBandIndex(Math.max(Math.round(engineCapacityCc || 0), 0));
  const baseExciseMnt = fuelClass === "ELECTRIC"
    ? ELECTRIC_EXCISE[ageIndex]
    : fuelClass === "HYBRID_LPG"
      ? HYBRID_LPG_EXCISE[engineIndex][ageIndex]
      : STANDARD_EXCISE[engineIndex][ageIndex];
  const luxuryExciseMnt = Math.round(Math.max(customsValueMnt - LUXURY_EXCISE_THRESHOLD_MNT, 0) * LUXURY_EXCISE_RATE);
  return {
    ageYears: Math.max(currentYear - safeYear, 0),
    baseExciseMnt,
    luxuryExciseMnt,
    totalExciseMnt: baseExciseMnt + luxuryExciseMnt,
  };
}

export function calculateVehicleImportTaxes({
  customsValueMnt,
  productionYear,
  engineCapacityCc,
  fuelClass,
  currentYear,
}: {
  customsValueMnt: number;
  productionYear: number;
  engineCapacityCc: number;
  fuelClass: VehicleFuelClass;
  currentYear?: number;
}) {
  const normalizedCustomsValueMnt = Math.max(Math.round(customsValueMnt), 0);
  const customsMnt = Math.round(normalizedCustomsValueMnt * CUSTOMS_DUTY_RATE);
  const excise = calculateVehicleExcise({ productionYear, engineCapacityCc, fuelClass, customsValueMnt: normalizedCustomsValueMnt, currentYear });
  const vatBaseMnt = normalizedCustomsValueMnt + customsMnt + excise.totalExciseMnt;
  const vatMnt = Math.round(vatBaseMnt * VAT_RATE);
  return {
    customsValueMnt: normalizedCustomsValueMnt,
    customsMnt,
    exciseMnt: excise.totalExciseMnt,
    baseExciseMnt: excise.baseExciseMnt,
    luxuryExciseMnt: excise.luxuryExciseMnt,
    vatBaseMnt,
    vatMnt,
    ageYears: excise.ageYears,
  };
}
