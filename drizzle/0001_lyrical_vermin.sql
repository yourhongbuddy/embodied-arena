CREATE TABLE `experiment_assignment_receipts` (
	`receipt_id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`experiment` text NOT NULL,
	`analysis_cohort` text NOT NULL,
	`treatment_fingerprint` text NOT NULL,
	`presentation_fingerprint` text NOT NULL,
	`unit_id` text NOT NULL,
	`variant` text NOT NULL,
	`bucket` integer NOT NULL,
	`issued_at` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_experiment_assignment_receipts_expires_at` ON `experiment_assignment_receipts` (`expires_at`);