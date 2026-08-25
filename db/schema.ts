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
