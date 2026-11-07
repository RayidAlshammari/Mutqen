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

export type PortfolioItem = { title: string; url?: string; description?: string };

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
    // AI skill verification
    verificationCategory: text("verification_category"),
    verificationTask: text("verification_task"),
    verificationAnswer: text("verification_answer"),
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

export type OrderStatus =
  | "in_progress" // paid, funds held in escrow
  | "delivered"
  | "revision_requested"
  | "completed"
  | "cancelled";

export type StructuredBrief = {
  title: string;
  category: Category;
  goal: string;
  deliverables: string[];
  audience?: string;
  tone?: string;
  timeline?: string;
  budgetHint?: string;
};

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
    // money in SAR (integers, halalas not needed for MVP)
    price: integer("price").notNull(),
    buyerFee: integer("buyer_fee").notNull(),
    platformCommission: integer("platform_commission").notNull(),
    sellerEarning: integer("seller_earning").notNull(),
    brief: text("brief").notNull(),
    structuredBrief: jsonb("structured_brief").$type<StructuredBrief | null>(),
    status: text("status").$type<OrderStatus>().notNull().default("in_progress"),
    paymentRef: text("payment_ref").notNull(),
    revisionsLeft: integer("revisions_left").notNull().default(1),
    dueAt: timestamp("due_at").notNull(),
    deliveredAt: timestamp("delivered_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("order_buyer_idx").on(t.buyerId), index("order_seller_idx").on(t.sellerId)],
);

// type: created | message | delivered | revision_requested | completed | cancelled
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
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("event_order_idx").on(t.orderId)],
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
