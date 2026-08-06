-- Align the original database baseline with the v1.4 SRS.
-- Existing rows are preserved; legacy records without an abstract remain
-- readable but are represented by an empty value until an admin updates them.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TYPE "admin_status" RENAME VALUE 'INACTIVE' TO 'DISABLED';

ALTER TABLE "project_records"
  ADD COLUMN IF NOT EXISTS "abstract" TEXT;

UPDATE "project_records"
SET "abstract" = ''
WHERE "abstract" IS NULL;

ALTER TABLE "project_records"
  ALTER COLUMN "abstract" SET NOT NULL;

ALTER TABLE "project_records"
  ADD CONSTRAINT "project_records_year_of_completion_range"
  CHECK ("year_of_completion" BETWEEN 1900 AND 2100);

ALTER TABLE "project_record_versions"
  ADD CONSTRAINT "project_record_versions_year_of_completion_range"
  CHECK ("year_of_completion" BETWEEN 1900 AND 2100),
  ADD CONSTRAINT "project_record_versions_version_number_positive"
  CHECK ("version_number" > 0);

ALTER TABLE "admins"
  ADD CONSTRAINT "admins_failed_login_attempts_non_negative"
  CHECK ("failed_login_attempts" >= 0);

ALTER TABLE "admin_sessions"
  ADD CONSTRAINT "admin_sessions_expiry_after_issue"
  CHECK ("expires_at" > "issued_at");

ALTER TABLE "password_reset_tokens"
  ADD CONSTRAINT "password_reset_tokens_expiry_after_creation"
  CHECK ("expires_at" > "created_at");
