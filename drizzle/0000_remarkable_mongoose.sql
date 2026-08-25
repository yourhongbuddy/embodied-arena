CREATE TABLE `analytics_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`event_type` text NOT NULL,
	`path` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_analytics_created_at` ON `analytics_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_analytics_event_path` ON `analytics_events` (`event_type`,`path`);--> statement-breakpoint
CREATE INDEX `idx_analytics_session_created` ON `analytics_events` (`session_id`,`created_at`);