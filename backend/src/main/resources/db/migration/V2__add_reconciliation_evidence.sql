CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE reconciliation_runs (
  id TEXT PRIMARY KEY,
  catalog_fingerprint TEXT NOT NULL,
  created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL
);

CREATE TABLE reconciliation_items (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES reconciliation_runs (id),
  admin_settings_id TEXT NOT NULL,
  admin_settings_snapshot TEXT NOT NULL,
  admin_settings_hash TEXT NOT NULL CHECK (admin_settings_hash ~ '^[0-9a-f]{64}$' AND admin_settings_hash = encode(digest(admin_settings_snapshot, 'sha256'), 'hex')),
  prisma_user_id TEXT NOT NULL,
  prisma_user_snapshot TEXT NOT NULL,
  prisma_user_hash TEXT NOT NULL CHECK (prisma_user_hash ~ '^[0-9a-f]{64}$' AND prisma_user_hash = encode(digest(prisma_user_snapshot, 'sha256'), 'hex')),
  usuario_id TEXT NOT NULL,
  usuario_snapshot TEXT NOT NULL,
  usuario_hash TEXT NOT NULL CHECK (usuario_hash ~ '^[0-9a-f]{64}$' AND usuario_hash = encode(digest(usuario_snapshot, 'sha256'), 'hex'))
);

CREATE TABLE reconciliation_approvals (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES reconciliation_items (id),
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  verifier_id TEXT NOT NULL,
  report_checksum TEXT NOT NULL,
  created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE FUNCTION reject_reconciliation_evidence_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'reconciliation evidence is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reconciliation_runs_append_only
  BEFORE UPDATE OR DELETE ON reconciliation_runs FOR EACH ROW EXECUTE FUNCTION reject_reconciliation_evidence_mutation();
CREATE TRIGGER reconciliation_items_append_only
  BEFORE UPDATE OR DELETE ON reconciliation_items FOR EACH ROW EXECUTE FUNCTION reject_reconciliation_evidence_mutation();
CREATE TRIGGER reconciliation_approvals_append_only
  BEFORE UPDATE OR DELETE ON reconciliation_approvals FOR EACH ROW EXECUTE FUNCTION reject_reconciliation_evidence_mutation();
CREATE TRIGGER reconciliation_runs_no_truncate BEFORE TRUNCATE ON reconciliation_runs FOR EACH STATEMENT EXECUTE FUNCTION reject_reconciliation_evidence_mutation();
CREATE TRIGGER reconciliation_items_no_truncate BEFORE TRUNCATE ON reconciliation_items FOR EACH STATEMENT EXECUTE FUNCTION reject_reconciliation_evidence_mutation();
CREATE TRIGGER reconciliation_approvals_no_truncate BEFORE TRUNCATE ON reconciliation_approvals FOR EACH STATEMENT EXECUTE FUNCTION reject_reconciliation_evidence_mutation();
