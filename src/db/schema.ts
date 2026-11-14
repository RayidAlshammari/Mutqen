import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ───────────── Better Auth tables ───────────── */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // buyer | seller | admin
  role: text("role").notNull().default("buyer"),
  phone: text("phone"),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ───────────── Marketplace tables ───────────── */

export type Category = "content" | "media" | "code";

export type ServicePackage = {
  tier: "basic" | "standard" | "premium";
  name: string;
  price: number; // SAR, before buyer fee
  deliveryDays: number;
  revisions: number;
  features: string[];
};

export type PortfolioItem = { title: string; url?: string; description?: string; image?: string };

/** A file or link the client hands over with the brief (logo, brand guide, references). */
export type BriefAsset = { label: string; url: string };

// One row per freelancer. status: draft | pending | approved | rejected
export const sellerProfile = pgTable(
  "seller_profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    headline: text("headline").notNull(),
    bio: text("bio").notNull().default(""),
    city: text("city"),
    categories: jsonb("categories").$type<Category[]>().notNull().default([]),
    aiTools: jsonb("ai_tools").$type<string[]>().notNull().default([]),
    portfolio: jsonb("portfolio").$type<PortfolioItem[]>().notNull().default([]),
    freelanceDocNumber: text("freelance_doc_number"),
    // payouts (released escrow goes to this IBAN)
    payoutName: text("payout_name"),
    iban: text("iban"),
    status: text("status").notNull().default("draft"),
    /** Shown to the freelancer when the application is rejected or the badge is revoked. */
    reviewNote: text("review_note"),
    nationalId: text("national_id"),
    identityVerified: boolean("identity_verified").notNull().default(false),
    /** Short scenario quiz on scoping and managing client expectations (0-100). */
    conductScore: integer("conduct_score"),
    /** Used only for Arabic grammar ("أنجز" / "أنجزت"). */
    gender: text("gender").$type<"m" | "f">().notNull().default("m"),
    // AI skill verification
    verificationCategory: text("verification_category"),
    verificationTask: text("verification_task"),
    verificationAnswer: text("verification_answer"),
    /** Link to the actual deliverable produced for the practical task. */
    verificationUrl: text("verification_url"),
    verificationStartedAt: timestamp("verification_started_at"),
    verificationScore: integer("verification_score"),
    verificationFeedback: text("verification_feedback"),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("seller_status_idx").on(t.status)],
);

export const service = pgTable(
  "service",
  {
    id: text("id").primaryKey(),
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    category: text("category").$type<Category>().notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    aiTools: jsonb("ai_tools").$type<string[]>().notNull().default([]),
    packages: jsonb("packages").$type<ServicePackage[]>().notNull(),
    minPrice: integer("min_price").notNull(),
    minDeliveryDays: integer("min_delivery_days").notNull(),
    ratingAvg: real("rating_avg").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    ordersCount: integer("orders_count").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("service_category_idx").on(t.category), index("service_seller_idx").on(t.sellerId)],
);

/**
 * Order lifecycle. Money is held from the moment the client pays.
 *   awaiting_acceptance → in_progress (stage: sample) → sample_review
 *   → in_progress (stage: full) → delivered → completed
 * Side paths: revision_requested, disputed, cancelled.
 */
export type OrderStatus =
  | "awaiting_acceptance" // paid; the freelancer has 24h to accept or ask questions
  | "in_progress"
  | "sample_review" // first sample delivered; the client confirms the direction
  | "delivered"
  | "revision_requested"
  | "disputed" // the client raised a problem; timers are paused until the admin decides
  | "completed"
  | "cancelled";

export type OrderStage = "sample" | "full";

export const OPEN_ORDER_STATUSES: OrderStatus[] = [
  "awaiting_acceptance",
  "in_progress",
  "sample_review",
  "delivered",
  "revision_requested",
  "disputed",
];

export type StructuredBrief = {
  title: string;
  category: Category;
  goal: string;
  /** What the client receives, as a checklist. */
  deliverables: string[];
  /** How both sides know the work is done; revisions are judged against this list. */
  acceptance?: string[];
  /** What the client hands over (logo, colours, photos, access). */
  clientProvides?: string[];
  audience?: string;
  tone?: string;
  style?: string[];
  colors?: string[];
  references?: string[];
  assets?: BriefAsset[];
  answers?: { q: string; a: string }[];
  timeline?: string;
  budgetHint?: string;
};

// A brief the client builds with the assistant before choosing a freelancer.
// status: draft | ready | ordered | managed
export const brief = pgTable(
  "brief",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),
    /** Anonymous visitors own their draft through a cookie until they sign up. */
    ownerKey: text("owner_key"),
    input: text("input").notNull(),
    category: text("category").$type<Category>().notNull(),
    questions: jsonb("questions").$type<{ id: string; q: string; hint?: string; options?: string[]; multi?: boolean; required?: boolean }[]>().notNull().default([]),
    /** Set when the client started from a specific service page. */
    serviceId: text("service_id"),
    tier: text("tier"),
    structured: jsonb("structured").$type<StructuredBrief | null>(),
    status: text("status").notNull().default("draft"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("brief_owner_idx").on(t.ownerId)],
);

// "Let Mutqen run it": the team picks the freelancer and follows the order.
// status: new | offered | accepted | cancelled
export const managedRequest = pgTable(
  "managed_request",
  {
    id: text("id").primaryKey(),
    briefId: text("brief_id")
      .notNull()
      .references(() => brief.id, { onDelete: "cascade" }),
    buyerId: text("buyer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    budget: integer("budget"),
    status: text("status").notNull().default("new"),
    offeredServiceId: text("offered_service_id").references(() => service.id),
    offeredTier: text("offered_tier"),
    note: text("note"),
    orderId: text("order_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("managed_status_idx").on(t.status)],
);

export const order = pgTable(
  "order",
  {
    id: text("id").primaryKey(),
    serviceId: text("service_id")
      .notNull()
      .references(() => service.id),
    buyerId: text("buyer_id")
      .notNull()
      .references(() => user.id),
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id),
    packageTier: text("package_tier").notNull(),
    packageName: text("package_name").notNull(),
    // money in whole SAR
    price: integer("price").notNull(),
    buyerFee: integer("buyer_fee").notNull(),
    platformCommission: integer("platform_commission").notNull(),
    sellerEarning: integer("seller_earning").notNull(),
    brief: text("brief").notNull(),
    structuredBrief: jsonb("structured_brief").$type<StructuredBrief | null>(),
    status: text("status").$type<OrderStatus>().notNull().default("awaiting_acceptance"),
    stage: text("stage").$type<OrderStage>().notNull().default("sample"),
    paymentRef: text("payment_ref").notNull(),
    revisionsLeft: integer("revisions_left").notNull().default(1),
    /** One change of direction after the first sample is included in every order. */
    sampleChangesLeft: integer("sample_changes_left").notNull().default(1),
    deliveryDays: integer("delivery_days").notNull().default(3),
    /** The freelancer must accept (or the order is refunded) before this time. */
    acceptBy: timestamp("accept_by"),
    acceptedAt: timestamp("accepted_at"),
    /** Set when the freelancer accepts: the clock starts on acceptance, not on payment. */
    dueAt: timestamp("due_at"),
    sampleDueAt: timestamp("sample_due_at"),
    sampleDeliveredAt: timestamp("sample_delivered_at"),
    briefId: text("brief_id"),
    /** Extra work outside the original brief is a linked order with its own price. */
    parentOrderId: text("parent_order_id"),
    managed: boolean("managed").notNull().default(false),
    managedFee: integer("managed_fee").notNull().default(0),
    disputeReason: text("dispute_reason"),
    disputePrevStatus: text("dispute_prev_status").$type<OrderStatus>(),
    /** Part of the price returned to the client when a dispute ends in a partial refund. */
    refundAmount: integer("refund_amount").notNull().default(0),
    /** Freelancer payout after completion: none → due → paid (sent manually until a provider handles splits). */
    payoutStatus: text("payout_status").$type<"none" | "due" | "paid">().notNull().default("none"),
    payoutRef: text("payout_ref"),
    paidOutAt: timestamp("paid_out_at", { withTimezone: true }),
    /** Managed orders: a sample or delivery waits for the team's review before the client sees it. */
    heldForReview: boolean("held_for_review").notNull().default(false),
    deliveredAt: timestamp("delivered_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("order_buyer_idx").on(t.buyerId), index("order_seller_idx").on(t.sellerId)],
);

// type: created | payment_held | accepted | message | sample_delivered | sample_approved |
//       sample_change | delivered | revision_requested | addon_offer | disputed |
//       dispute_resolved | completed | payment_released | cancelled
export const orderEvent = pgTable(
  "order_event",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => user.id),
    type: text("type").notNull(),
    message: text("message"),
    attachmentUrl: text("attachment_url"),
    /** Structured payload, e.g. an add-on offer: { price, days, title, accepted }. */
    data: jsonb("data").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("event_order_idx").on(t.orderId)],
);

// In-app notifications (the bell). The same event is also emailed when email is configured.
export const notification = pgTable(
  "notification",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    href: text("href"),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("notification_user_idx").on(t.userId, t.createdAt)],
);

export const review = pgTable(
  "review",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    serviceId: text("service_id")
      .notNull()
      .references(() => service.id, { onDelete: "cascade" }),
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id),
    buyerId: text("buyer_id")
      .notNull()
      .references(() => user.id),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("review_order_uq").on(t.orderId), index("review_service_idx").on(t.serviceId)],
);

// Optional invoice details for clients (companies need a tax invoice).
export const billingProfile = pgTable("billing_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  companyName: text("company_name"),
  vatNumber: text("vat_number"),
  crNumber: text("cr_number"),
  city: text("city"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Fixed-window rate limiting shared across serverless instances.
export const rateLimit = pgTable("rate_limit", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start").notNull().defaultNow(),
  count: integer("count").notNull().default(0),
});

export const waitlist = pgTable("waitlist", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  // buyer | seller
  side: text("side").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
