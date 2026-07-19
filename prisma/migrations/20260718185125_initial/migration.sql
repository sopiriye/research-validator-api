CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "admin_role" AS ENUM ('ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "admin_status" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "programme_code" AS ENUM ('PGD', 'MSC', 'PHD');

-- CreateEnum
CREATE TYPE "project_record_status" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "validation_result_status" AS ENUM ('EXACT_FOUND', 'SIMILAR_FOUND', 'NO_MATCH_FOUND', 'VALIDATION_FAILED');

-- CreateEnum
CREATE TYPE "match_type" AS ENUM ('EXACT', 'SIMILAR');

-- CreateEnum
CREATE TYPE "audit_action" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'ARCHIVE', 'UNARCHIVE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGED', 'ADMIN_ACTIVATED', 'ADMIN_DEACTIVATED', 'SETTINGS_UPDATED');

-- CreateEnum
CREATE TYPE "audit_entity_type" AS ENUM ('ADMIN', 'PROJECT_RECORD', 'DEPARTMENT', 'PROGRAMME', 'SYSTEM_SETTING', 'AUTH_SESSION');

-- CreateEnum
CREATE TYPE "session_status" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "setting_value_type" AS ENUM ('STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'JSON');

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "institution_name" VARCHAR(255) NOT NULL DEFAULT 'Ignatius Ajuru University of Education',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programmes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "department_id" UUID NOT NULL,
    "code" "programme_code" NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "programmes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "department_id" UUID NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "admin_role" NOT NULL DEFAULT 'ADMIN',
    "status" "admin_status" NOT NULL DEFAULT 'ACTIVE',
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "last_login_at" TIMESTAMPTZ(6),
    "password_changed_at" TIMESTAMPTZ(6),
    "created_by_admin_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_id" UUID NOT NULL,
    "refresh_token_hash" VARCHAR(255) NOT NULL,
    "jwt_identifier" VARCHAR(255),
    "status" "session_status" NOT NULL DEFAULT 'ACTIVE',
    "ip_address" INET,
    "user_agent" TEXT,
    "device_name" VARCHAR(255),
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "last_used_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "revocation_reason" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "requested_ip_address" INET,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "department_id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "supervisee" VARCHAR(255) NOT NULL,
    "project_name" TEXT NOT NULL,
    "normalized_project_name" TEXT NOT NULL,
    "supervisor" VARCHAR(255) NOT NULL,
    "year_of_completion" INTEGER NOT NULL,
    "serial_number" VARCHAR(100) NOT NULL,
    "status" "project_record_status" NOT NULL DEFAULT 'ACTIVE',
    "created_by_admin_id" UUID NOT NULL,
    "updated_by_admin_id" UUID,
    "deleted_by_admin_id" UUID,
    "archived_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_record_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_record_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "supervisee" VARCHAR(255) NOT NULL,
    "project_name" TEXT NOT NULL,
    "normalized_project_name" TEXT NOT NULL,
    "supervisor" VARCHAR(255) NOT NULL,
    "year_of_completion" INTEGER NOT NULL,
    "programme_id" UUID NOT NULL,
    "serial_number" VARCHAR(100) NOT NULL,
    "status" "project_record_status" NOT NULL,
    "change_summary" TEXT,
    "changed_by_admin_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_record_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "department_id" UUID,
    "admin_id" UUID,
    "action" "audit_action" NOT NULL,
    "entity_type" "audit_entity_type" NOT NULL,
    "entity_id" UUID,
    "description" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "changed_fields" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "request_method" VARCHAR(10),
    "request_path" TEXT,
    "request_id" VARCHAR(100),
    "success" BOOLEAN NOT NULL DEFAULT true,
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "query" TEXT NOT NULL,
    "normalized_query" TEXT NOT NULL,
    "result_status" "validation_result_status" NOT NULL,
    "exact_match_count" INTEGER NOT NULL DEFAULT 0,
    "similar_match_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_departments_code" ON "departments"("code");

-- CreateIndex
CREATE INDEX "idx_departments_name" ON "departments"("name");

-- CreateIndex
CREATE INDEX "idx_departments_is_active" ON "departments"("is_active");

-- CreateIndex
CREATE INDEX "idx_departments_deleted_at" ON "departments"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_programmes_department_id" ON "programmes"("department_id");

-- CreateIndex
CREATE INDEX "idx_programmes_code" ON "programmes"("code");

-- CreateIndex
CREATE INDEX "idx_programmes_is_active" ON "programmes"("is_active");

-- CreateIndex
CREATE INDEX "idx_programmes_deleted_at" ON "programmes"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_programmes_department_code" ON "programmes"("department_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_admins_email" ON "admins"("email");

-- CreateIndex
CREATE INDEX "idx_admins_department_id" ON "admins"("department_id");

-- CreateIndex
CREATE INDEX "idx_admins_role" ON "admins"("role");

-- CreateIndex
CREATE INDEX "idx_admins_status" ON "admins"("status");

-- CreateIndex
CREATE INDEX "idx_admins_created_by" ON "admins"("created_by_admin_id");

-- CreateIndex
CREATE INDEX "idx_admins_deleted_at" ON "admins"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_admin_sessions_refresh_token_hash" ON "admin_sessions"("refresh_token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "uq_admin_sessions_jwt_identifier" ON "admin_sessions"("jwt_identifier");

-- CreateIndex
CREATE INDEX "idx_admin_sessions_admin_id" ON "admin_sessions"("admin_id");

-- CreateIndex
CREATE INDEX "idx_admin_sessions_status" ON "admin_sessions"("status");

-- CreateIndex
CREATE INDEX "idx_admin_sessions_expires_at" ON "admin_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "idx_admin_sessions_admin_status" ON "admin_sessions"("admin_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_password_reset_tokens_token_hash" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_password_reset_tokens_admin_id" ON "password_reset_tokens"("admin_id");

-- CreateIndex
CREATE INDEX "idx_password_reset_tokens_expires_at" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "idx_project_records_department_id" ON "project_records"("department_id");

-- CreateIndex
CREATE INDEX "idx_project_records_programme_id" ON "project_records"("programme_id");

-- CreateIndex
CREATE INDEX "idx_project_records_normalized_project_name" ON "project_records"("normalized_project_name");

-- CreateIndex
CREATE INDEX "idx_project_records_normalized_name_trgm" ON "project_records" USING GIN ("normalized_project_name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "idx_project_records_project_name_search" ON "project_records" USING GIN ("project_name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "idx_project_records_supervisee" ON "project_records"("supervisee");

-- CreateIndex
CREATE INDEX "idx_project_records_supervisor" ON "project_records"("supervisor");

-- CreateIndex
CREATE INDEX "idx_project_records_year_of_completion" ON "project_records"("year_of_completion");

-- CreateIndex
CREATE INDEX "idx_project_records_serial_number" ON "project_records"("serial_number");

-- CreateIndex
CREATE INDEX "idx_project_records_status" ON "project_records"("status");

-- CreateIndex
CREATE INDEX "idx_project_records_created_by_admin" ON "project_records"("created_by_admin_id");

-- CreateIndex
CREATE INDEX "idx_project_records_updated_by_admin" ON "project_records"("updated_by_admin_id");

-- CreateIndex
CREATE INDEX "idx_project_records_deleted_at" ON "project_records"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_project_records_department_programme_year" ON "project_records"("department_id", "programme_id", "year_of_completion");

-- CreateIndex
CREATE INDEX "idx_project_records_department_year_status" ON "project_records"("department_id", "year_of_completion", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_project_records_department_normalized_name" ON "project_records"("department_id", "normalized_project_name");

-- CreateIndex
CREATE UNIQUE INDEX "uq_project_records_department_serial_number" ON "project_records"("department_id", "serial_number");

-- CreateIndex
CREATE INDEX "idx_project_record_versions_project_record_id" ON "project_record_versions"("project_record_id");

-- CreateIndex
CREATE INDEX "idx_project_record_versions_changed_by" ON "project_record_versions"("changed_by_admin_id");

-- CreateIndex
CREATE INDEX "idx_project_record_versions_created_at" ON "project_record_versions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_project_record_versions_record_version" ON "project_record_versions"("project_record_id", "version_number");

-- CreateIndex
CREATE INDEX "idx_audit_logs_department_id" ON "audit_logs"("department_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_admin_id" ON "audit_logs"("admin_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_action" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "idx_audit_logs_entity_type" ON "audit_logs"("entity_type");

-- CreateIndex
CREATE INDEX "idx_audit_logs_entity_id" ON "audit_logs"("entity_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_audit_logs_entity_history" ON "audit_logs"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_audit_logs_admin_activity" ON "audit_logs"("admin_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_search_logs_result_status" ON "search_logs"("result_status");

-- CreateIndex
CREATE INDEX "idx_search_logs_created_at" ON "search_logs"("created_at");

-- AddForeignKey
ALTER TABLE "programmes" ADD CONSTRAINT "programmes_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_records" ADD CONSTRAINT "project_records_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_records" ADD CONSTRAINT "project_records_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_records" ADD CONSTRAINT "project_records_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_records" ADD CONSTRAINT "project_records_updated_by_admin_id_fkey" FOREIGN KEY ("updated_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_records" ADD CONSTRAINT "project_records_deleted_by_admin_id_fkey" FOREIGN KEY ("deleted_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_record_versions" ADD CONSTRAINT "project_record_versions_project_record_id_fkey" FOREIGN KEY ("project_record_id") REFERENCES "project_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_record_versions" ADD CONSTRAINT "project_record_versions_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_record_versions" ADD CONSTRAINT "project_record_versions_changed_by_admin_id_fkey" FOREIGN KEY ("changed_by_admin_id") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
