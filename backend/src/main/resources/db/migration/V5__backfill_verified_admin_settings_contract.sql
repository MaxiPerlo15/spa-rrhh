ALTER TABLE "AdminSettings" ADD COLUMN "usuarioId" TEXT;

CREATE TEMP TABLE reconciliation_contract_mappings ON COMMIT DROP AS
WITH live_evidence AS (
  SELECT settings."id" AS settings_id, legacy."id" AS user_id, target."id" AS usuario_id,
    encode(digest(format('{"createdAt":%s,"id":%s,"notificationsEnabled":%s,"notifyNewApplications":%s,"notifyNewContacts":%s,"notifySecurityAlerts":%s,"updatedAt":%s,"userId":%s}',
      to_json(to_char(settings."createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))::text, to_json(settings."id")::text,
      to_json(settings."notificationsEnabled")::text, to_json(settings."notifyNewApplications")::text,
      to_json(settings."notifyNewContacts")::text, to_json(settings."notifySecurityAlerts")::text,
      to_json(to_char(settings."updatedAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))::text, to_json(settings."userId")::text), 'sha256'), 'hex') AS settings_hash,
    encode(digest(format('{"createdAt":%s,"email":%s,"id":%s,"name":%s,"passwordHash":%s,"role":%s,"updatedAt":%s}',
      to_json(to_char(legacy."createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))::text, to_json(legacy."email")::text,
      to_json(legacy."id")::text, coalesce(to_json(legacy."name")::text, 'null'), to_json(legacy."passwordHash")::text,
      to_json(legacy."role")::text, to_json(to_char(legacy."updatedAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))::text), 'sha256'), 'hex') AS user_hash,
    encode(digest(format('{"email":%s,"enabled":%s,"id":%s,"nombreUsuario":%s,"password":%s,"passwordResetToken":%s,"passwordResetTokenExpiry":%s,"rolId":%s}',
      to_json(target.email)::text, to_json(target.enabled)::text, to_json(target.id)::text, to_json(target.nombre_usuario)::text,
      to_json(target.password)::text, coalesce(to_json(target.password_reset_token)::text, 'null'),
      CASE WHEN target.password_reset_token_expiry IS NULL THEN 'null' ELSE to_json(to_char(target.password_reset_token_expiry AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))::text END,
      to_json(target.rol_id)::text), 'sha256'), 'hex') AS usuario_hash
  FROM "AdminSettings" settings
  JOIN "User" legacy ON legacy."id" = settings."userId"
  JOIN usuario target ON TRUE
)
SELECT approval.source_id AS settings_id,
       CASE WHEN approval.status = 'MATCHED' THEN approval.target_id ELSE approval.prisma_user_id END AS usuario_id,
       approval.status,
       approval.reset_defaults::jsonb AS defaults,
       approval.report_checksum
FROM reconciliation_approvals approval
JOIN reconciliation_items item ON item.id = approval.item_id
JOIN reconciliation_runs run ON run.id = item.run_id
LEFT JOIN reconciliation_run_report_checksums derived_checksum ON derived_checksum.run_id = run.id
JOIN live_evidence live ON live.settings_id = approval.source_id
  AND live.user_id = approval.prisma_user_id
  AND live.usuario_id = CASE WHEN approval.status = 'MATCHED' THEN approval.target_id ELSE approval.prisma_user_id END
WHERE approval.source_id = item.admin_settings_id
  AND approval.prisma_user_id = item.prisma_user_id
  AND approval.report_checksum = COALESCE(run.report_checksum, derived_checksum.report_checksum)
  AND approval.report_checksum ~ '^[0-9a-f]{64}$'
  AND live.settings_hash = item.admin_settings_hash AND live.settings_hash = approval.admin_settings_hash
  AND live.user_hash = item.prisma_user_hash AND live.user_hash = approval.prisma_user_hash
  AND live.usuario_hash = item.usuario_hash
  AND ((approval.status = 'MATCHED' AND approval.target_id = item.usuario_id
        AND live.usuario_hash = approval.usuario_hash)
       OR (approval.status = 'RESET_APPROVED' AND jsonb_typeof(approval.reset_defaults::jsonb) = 'object'
           AND approval.reset_defaults::jsonb ?& ARRAY['notificationsEnabled', 'notifyNewApplications', 'notifyNewContacts', 'notifySecurityAlerts']
           AND (SELECT count(*) FROM jsonb_object_keys(approval.reset_defaults::jsonb)) = 4
           AND jsonb_typeof(approval.reset_defaults::jsonb -> 'notificationsEnabled') = 'boolean'
           AND jsonb_typeof(approval.reset_defaults::jsonb -> 'notifyNewApplications') = 'boolean'
           AND jsonb_typeof(approval.reset_defaults::jsonb -> 'notifyNewContacts') = 'boolean'
           AND jsonb_typeof(approval.reset_defaults::jsonb -> 'notifySecurityAlerts') = 'boolean'));

DO $$
BEGIN
  IF (SELECT count(*) FROM reconciliation_contract_mappings) <> (SELECT count(*) FROM "AdminSettings")
     OR (SELECT count(DISTINCT settings_id) FROM reconciliation_contract_mappings) <> (SELECT count(*) FROM "AdminSettings")
     OR (SELECT count(DISTINCT usuario_id) FROM reconciliation_contract_mappings) <> (SELECT count(*) FROM "AdminSettings")
     OR ((SELECT count(*) FROM reconciliation_contract_mappings) > 0
         AND (SELECT count(DISTINCT report_checksum) FROM reconciliation_contract_mappings) <> 1) THEN
    RAISE EXCEPTION 'verified reconciliation evidence does not satisfy the AdminSettings contract';
  END IF;
END;
$$;

UPDATE "AdminSettings" settings
SET "usuarioId" = mapping.usuario_id,
    "notificationsEnabled" = CASE WHEN mapping.status = 'RESET_APPROVED' THEN (mapping.defaults ->> 'notificationsEnabled')::boolean ELSE settings."notificationsEnabled" END,
    "notifyNewApplications" = CASE WHEN mapping.status = 'RESET_APPROVED' THEN (mapping.defaults ->> 'notifyNewApplications')::boolean ELSE settings."notifyNewApplications" END,
    "notifyNewContacts" = CASE WHEN mapping.status = 'RESET_APPROVED' THEN (mapping.defaults ->> 'notifyNewContacts')::boolean ELSE settings."notifyNewContacts" END,
    "notifySecurityAlerts" = CASE WHEN mapping.status = 'RESET_APPROVED' THEN (mapping.defaults ->> 'notifySecurityAlerts')::boolean ELSE settings."notifySecurityAlerts" END
FROM reconciliation_contract_mappings mapping
WHERE settings."id" = mapping.settings_id;

ALTER TABLE "AdminSettings" ALTER COLUMN "usuarioId" SET NOT NULL;
ALTER TABLE "AdminSettings" ADD CONSTRAINT "AdminSettings_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES usuario (id);
ALTER TABLE "AdminSettings" ADD CONSTRAINT "AdminSettings_usuarioId_key" UNIQUE ("usuarioId");
