import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core";

/**
 * Every Rota table is a team resource: rows carry `owner_email` and `org_id`.
 * With an active org the whole org sees them; without one they are private to
 * the manager who created them. See server/lib/scope.ts.
 */

export const staff = pgTable("staff", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role", { enum: ["barista", "kitchen", "floor"] }).notNull(),
  hourlyRateCents: integer("hourly_rate_cents").notNull(),
  maxHours: integer("max_hours").notNull(),
  color: text("color"),
  phone: text("phone"),
  active: boolean("active").notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`now()`),
  ownerEmail: text("owner_email").notNull(),
  orgId: text("org_id"),
});

export const shifts = pgTable("shifts", {
  id: text("id").primaryKey(),
  staffId: text("staff_id"),
  role: text("role", { enum: ["barista", "kitchen", "floor"] }).notNull(),
  date: text("date").notNull(),
  startMin: integer("start_min").notNull(),
  endMin: integer("end_min").notNull(),
  status: text("status", { enum: ["confirmed", "proposed"] })
    .notNull()
    .default("confirmed"),
  change: text("change", { enum: ["add", "replace", "remove"] }),
  replacesId: text("replaces_id"),
  proposalId: text("proposal_id"),
  createdAt: text("created_at").notNull().default(sql`now()`),
  ownerEmail: text("owner_email").notNull(),
  orgId: text("org_id"),
});

export const timeOff = pgTable("time_off", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull(),
  date: text("date").notNull(),
  reason: text("reason"),
  messageId: text("message_id"),
  createdAt: text("created_at").notNull().default(sql`now()`),
  ownerEmail: text("owner_email").notNull(),
  orgId: text("org_id"),
});

export const coverage = pgTable("coverage", {
  id: text("id").primaryKey(),
  weekday: integer("weekday").notNull(),
  role: text("role", { enum: ["barista", "kitchen", "floor"] }).notNull(),
  startMin: integer("start_min").notNull(),
  endMin: integer("end_min").notNull(),
  needed: integer("needed").notNull(),
  ownerEmail: text("owner_email").notNull(),
  orgId: text("org_id"),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  staffId: text("staff_id"),
  direction: text("direction", { enum: ["in", "out"] }).notNull(),
  body: text("body").notNull(),
  status: text("status", { enum: ["new", "handled"] })
    .notNull()
    .default("new"),
  proposalId: text("proposal_id"),
  createdAt: text("created_at").notNull(),
  ownerEmail: text("owner_email").notNull(),
  orgId: text("org_id"),
});

export const proposals = pgTable("proposals", {
  id: text("id").primaryKey(),
  week: text("week").notNull(),
  title: text("title").notNull(),
  reason: text("reason"),
  status: text("status", { enum: ["pending", "accepted", "rejected"] })
    .notNull()
    .default("pending"),
  messageId: text("message_id"),
  createdAt: text("created_at").notNull(),
  decidedAt: text("decided_at"),
  ownerEmail: text("owner_email").notNull(),
  orgId: text("org_id"),
});

export const weeks = pgTable("weeks", {
  id: text("id").primaryKey(),
  week: text("week").notNull(),
  budgetCents: integer("budget_cents").notNull(),
  publishedAt: text("published_at"),
  ownerEmail: text("owner_email").notNull(),
  orgId: text("org_id"),
});
