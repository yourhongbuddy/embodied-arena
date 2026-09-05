import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const analyticsEvents = sqliteTable("analytics_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull(),
  eventType: text("event_type").notNull(),
  path: text("path").notNull(),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_analytics_created_at").on(table.createdAt),
  index("idx_analytics_event_path").on(table.eventType, table.path),
  index("idx_analytics_session_created").on(table.sessionId, table.createdAt),
]);

export const experimentAssignmentReceipts = sqliteTable("experiment_assignment_receipts", {
  receiptId: text("receipt_id").primaryKey(),
  sessionId: text("session_id").notNull(),
  experiment: text("experiment").notNull(),
  analysisCohort: text("analysis_cohort").notNull(),
  treatmentFingerprint: text("treatment_fingerprint").notNull(),
  presentationFingerprint: text("presentation_fingerprint").notNull(),
  unitId: text("unit_id").notNull(),
  variant: text("variant").notNull(),
  bucket: integer("bucket").notNull(),
  issuedAt: text("issued_at").notNull(),
  expiresAt: text("expires_at").notNull(),
}, (table) => [
  index("idx_experiment_assignment_receipts_expires_at").on(table.expiresAt),
]);

// Private, per-account contact data. Never include this table in public analytics/MCP.
export const accountProfiles = sqliteTable("account_profiles", {
  userId: text("user_id").primaryKey(),
  email: text("email").notNull(),
  phone: text("phone"),
  privacyVersion: text("privacy_version").notNull(),
  consentAt: text("consent_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
