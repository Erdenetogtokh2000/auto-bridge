import { boolean, doublePrecision, integer, pgTable, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const quoteRequests = pgTable("quote_requests", {
  id: text("id").primaryKey(), sourceUrl: text("source_url").notNull(),
  market: text("market").notNull().default("KOREA"), requesterName: text("requester_name"),
  requesterPhone: text("requester_phone"), requesterEmail: text("requester_email"),
  status: text("status").notNull().default("NEW"),
  assignedTo: text("assigned_to"), updatedAt: text("updated_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const quoteEstimates = pgTable("quote_estimates", {
  id: text("id").primaryKey(),
  quoteRequestId: text("quote_request_id").notNull().unique().references(() => quoteRequests.id),
  vehicleName: text("vehicle_name"),
  vehicleMake: text("vehicle_make"), vehicleModel: text("vehicle_model"),
  productionYear: integer("production_year"), mileageKm: integer("mileage_km"), fuelType: text("fuel_type"), engineCapacityCc: integer("engine_capacity_cc"),
  vehiclePriceKrw: integer("vehicle_price_krw").notNull().default(0),
  purchaseFeeKrw: integer("purchase_fee_krw").notNull().default(0),
  inlandTransportKrw: integer("inland_transport_krw").notNull().default(0),
  oceanFreightUsd: doublePrecision("ocean_freight_usd").notNull().default(0),
  krwMntRate: doublePrecision("krw_mnt_rate").notNull().default(0),
  usdMntRate: doublePrecision("usd_mnt_rate").notNull().default(0),
  customsMnt: integer("customs_mnt").notNull().default(0),
  exciseMnt: integer("excise_mnt").notNull().default(0),
  vatMnt: integer("vat_mnt").notNull().default(0),
  otherCostsMnt: integer("other_costs_mnt").notNull().default(0),
  totalMnt: integer("total_mnt").notNull().default(0),
  depositMnt: integer("deposit_mnt").notNull().default(0),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const vehicles = pgTable("vehicles", {
  id: text("id").primaryKey(), stockNo: text("stock_no").notNull().unique(),
  sourceMarket: text("source_market").notNull(), listingUrl: text("listing_url"),
  make: text("make").notNull(), model: text("model").notNull(),
  productionYear: integer("production_year").notNull(), mileageKm: integer("mileage_km"),
  vin: text("vin"),
  fuelType: text("fuel_type"), trim: text("trim"), color: text("color"), engineCapacityCc: integer("engine_capacity_cc"),
  priceKrw: integer("price_krw"), priceAmount: doublePrecision("price_amount"), priceCurrency: text("price_currency").default("KRW"),
  imageUrl: text("image_url"), imageObjectKey: text("image_object_key"), description: text("description"),
  isPublished: boolean("is_published").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),
  status: text("status").notNull().default("AVAILABLE"),
  createdBy: text("created_by"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at"),
});

export const orders = pgTable("orders", {
  id: text("id").primaryKey(), vehicleId: text("vehicle_id").notNull().references(() => vehicles.id),
  quoteRequestId: text("quote_request_id").unique().references(() => quoteRequests.id),
  orderNo: text("order_no").unique(), customerName: text("customer_name"), customerPhone: text("customer_phone"),
  customerEmail: text("customer_email").notNull(), status: text("status").notNull().default("QUOTE"),
  totalAmountMnt: integer("total_amount_mnt").notNull().default(0),
  vehicleSubtotalMnt: integer("vehicle_subtotal_mnt").notNull().default(0),
  depositAmountMnt: integer("deposit_amount_mnt").notNull().default(0),
  balanceAmountMnt: integer("balance_amount_mnt").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at"),
});

export const financingRequests = pgTable("financing_requests", {
  id: text("id").primaryKey(), orderId: text("order_id").notNull().references(() => orders.id),
  customerEmail: text("customer_email").notNull(), requestedAmountMnt: integer("requested_amount_mnt").notNull(),
  requestType: text("request_type").notNull().default("VEHICLE_BALANCE"),
  approvedAmountMnt: integer("approved_amount_mnt").notNull().default(0),
  termMonths: integer("term_months").notNull().default(12), purpose: text("purpose"),
  status: text("status").notNull().default("NEW"), decisionNote: text("decision_note"),
  decidedBy: text("decided_by"), decidedAt: text("decided_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at"),
});

export const payments = pgTable("payments", {
  id: text("id").primaryKey(), orderId: text("order_id").notNull().references(() => orders.id),
  paymentType: text("payment_type").notNull(), currency: text("currency").notNull(),
  amount: doublePrecision("amount").notNull(), amountMnt: integer("amount_mnt").notNull().default(0),
  status: text("status").notNull().default("PENDING"), dueDate: text("due_date"), referenceNo: text("reference_no"), note: text("note"),
  paidAt: text("paid_at"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at"),
});

export const shipments = pgTable("shipments", {
  id: text("id").primaryKey(), orderId: text("order_id").notNull().references(() => orders.id),
  containerNo: text("container_no"), billOfLadingNo: text("bill_of_lading_no"),
  originPort: text("origin_port"), destination: text("destination").notNull().default("Улаанбаатар"), currentLocation: text("current_location"),
  status: text("status").notNull().default("PREPARING"), estimatedArrival: text("estimated_arrival"),
  transportEmployeeEmail: text("transport_employee_email"), updatedBy: text("updated_by"), completedAt: text("completed_at"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const shipmentEvents = pgTable("shipment_events", {
  id: text("id").primaryKey(), shipmentId: text("shipment_id").notNull().references(() => shipments.id),
  eventCode: text("event_code").notNull(), location: text("location"), note: text("note"),
  eventAt: text("event_at").notNull(), createdBy: text("created_by"), createdAt: text("created_at"),
});

export const documents = pgTable("documents", {
  id: text("id").primaryKey(), orderId: text("order_id").notNull().references(() => orders.id),
  paymentId: text("payment_id").references(() => payments.id),
  documentType: text("document_type").notNull(), fileName: text("file_name").notNull(),
  objectKey: text("object_key"), contentType: text("content_type"), sizeBytes: integer("size_bytes").notNull().default(0),
  status: text("status").notNull().default("PENDING"), uploadedBy: text("uploaded_by"), verifiedAt: text("verified_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at"),
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  recipientType: text("recipient_type").notNull(), recipientEmail: text("recipient_email"),
  orderId: text("order_id").references(() => orders.id), type: text("type").notNull(),
  title: text("title").notNull(), message: text("message").notNull(), href: text("href"),
  isRead: boolean("is_read").notNull().default(false), readAt: text("read_at"),
  actorEmail: text("actor_email"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const userProfiles = pgTable("user_profiles", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"), phone: text("phone"),
  role: text("role").notNull().default("CUSTOMER"),
  permissions: text("permissions").notNull().default("[]"),
  permissionsCustomized: boolean("permissions_customized").notNull().default(false),
  status: text("status").notNull().default("ACTIVE"),
  companyName: text("company_name"), companyRegistrationNo: text("company_registration_no"),
  financingEligible: boolean("financing_eligible").notNull().default(false),
  notes: text("notes"), createdBy: text("created_by"),
  lastLoginAt: text("last_login_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at"),
});

export const expos = pgTable("expos", {
  id: text("id").primaryKey(), title: text("title").notNull(), country: text("country").notNull(),
  city: text("city").notNull(), venue: text("venue"), startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(), officialUrl: text("official_url"), videoUrl: text("video_url"),
  region: text("region").notNull().default("ASIA"), category: text("category"), description: text("description"),
  registrationDeadline: text("registration_deadline"), ticketInfo: text("ticket_info"), participationTerms: text("participation_terms"),
  imageUrl: text("image_url"), imageObjectKey: text("image_object_key"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(false),
  createdBy: text("created_by"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at"),
});

export const systemSettings = pgTable("system_settings", {
  id: text("id").primaryKey().default("default"),
  companyName: text("company_name").notNull().default("AUTO BRIDGE"),
  supportEmail: text("support_email").notNull().default("erdenetogtokh2000@gmail.com"),
  contactPhone: text("contact_phone").notNull().default("7011-3322"),
  officeHours: text("office_hours").notNull().default("Даваа–Баасан 09:00–18:00"),
  krwMntRate: doublePrecision("krw_mnt_rate").notNull().default(2.55),
  usdMntRate: doublePrecision("usd_mnt_rate").notNull().default(3450),
  depositPercent: integer("deposit_percent").notNull().default(30),
  paymentReminderDays: integer("payment_reminder_days").notNull().default(3),
  emailNotifications: boolean("email_notifications").notNull().default(true),
  transportNotifications: boolean("transport_notifications").notNull().default(true),
  documentNotifications: boolean("document_notifications").notNull().default(true),
  updatedBy: text("updated_by"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});