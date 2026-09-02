"use client";

import { Printer } from "lucide-react";

export function PrintInvoiceButton() {
  return <button className="invoice-print-button" type="button" onClick={() => window.print()}><Printer/>PDF татах / хэвлэх</button>;
}
