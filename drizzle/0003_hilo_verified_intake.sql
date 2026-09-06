CREATE TABLE `hilo_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`application_json` text NOT NULL,
	`terms_version` text NOT NULL,
	`created_at` integer NOT NULL,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`session_id` text,
	`checkout_url` text,
	`stripe_event_id` text,
	`payment_intent` text,
	`paid_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_hilo_applications_session` ON `hilo_applications` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_hilo_applications_email_created` ON `hilo_applications` (`email`,`created_at`);