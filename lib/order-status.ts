import { shipmentProgress, shipmentStatusLabels } from "@/lib/shipment-status";

export function orderProgress(orderStatus: string, shipmentStatus?: string | null) {
  if (shipmentStatus) return shipmentProgress(shipmentStatus);
  if (orderStatus === "PAID") return 35;
  if (orderStatus === "PARTIALLY_PAID") return 30;
  if (orderStatus === "AWAITING_DEPOSIT") return 20;
  if (orderStatus === "CONFIRMED") return 25;
  return 10;
}

export function orderStatusLabel(orderStatus: string, shipmentStatus?: string | null) {
  if (shipmentStatus) return shipmentStatusLabels[shipmentStatus] ?? shipmentStatus;
  if (orderStatus === "PAID") return "Төлбөр бүрэн";
  if (orderStatus === "PARTIALLY_PAID") return "Хэсэгчлэн төлсөн";
  if (orderStatus === "AWAITING_DEPOSIT") return "30% урьдчилгаа хүлээгдэж байна";
  if (orderStatus === "CONFIRMED") return "Захиалга батлагдсан";
  return orderStatus;
}
