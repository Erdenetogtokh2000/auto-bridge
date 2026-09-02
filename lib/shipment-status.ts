export const shipmentStatuses = [
  "PREPARING",
  "AT_ORIGIN_PORT",
  "ON_VESSEL",
  "AT_TRANSIT_PORT",
  "RAIL_TRANSIT",
  "AT_BORDER",
  "CUSTOMS",
  "ARRIVED",
  "DELIVERED",
] as const;

export const shipmentStatusLabels: Record<string, string> = {
  PREPARING: "Тээвэрт бэлтгэж байна",
  AT_ORIGIN_PORT: "Гарах боомтод",
  ON_VESSEL: "Далайн тээвэрт",
  AT_TRANSIT_PORT: "Дамжин өнгөрөх боомтод",
  RAIL_TRANSIT: "Төмөр замын тээвэрт",
  AT_BORDER: "Замын-Үүдэд",
  CUSTOMS: "Гаалийн бүрдүүлэлт",
  ARRIVED: "Улаанбаатарт ирсэн",
  DELIVERED: "Хүлээлгэн өгсөн",
};

export function shipmentProgress(status?: string | null) {
  const values: Record<string, number> = {
    PREPARING: 40, AT_ORIGIN_PORT: 45, ON_VESSEL: 55, AT_TRANSIT_PORT: 65,
    RAIL_TRANSIT: 75, AT_BORDER: 84, CUSTOMS: 90, ARRIVED: 96, DELIVERED: 100,
  };
  return status ? values[status] ?? 40 : 25;
}
