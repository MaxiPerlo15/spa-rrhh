ALTER TABLE reconciliation_runs ADD COLUMN report_checksum TEXT
  CHECK (report_checksum ~ '^[0-9a-f]{64}$');

CREATE TABLE reconciliation_run_report_checksums (
  run_id TEXT PRIMARY KEY,
  report_checksum TEXT NOT NULL CHECK (report_checksum ~ '^[0-9a-f]{64}$')
);

INSERT INTO reconciliation_run_report_checksums (run_id, report_checksum)
SELECT item.run_id, min(approval.report_checksum)
FROM reconciliation_items item
JOIN reconciliation_approvals approval ON approval.item_id = item.id
GROUP BY item.run_id
HAVING count(DISTINCT approval.report_checksum) = 1
   AND min(approval.report_checksum) ~ '^[0-9a-f]{64}$';

CREATE TRIGGER reconciliation_run_report_checksums_append_only
  BEFORE UPDATE OR DELETE ON reconciliation_run_report_checksums
  FOR EACH ROW EXECUTE FUNCTION reject_reconciliation_evidence_mutation();
CREATE TRIGGER reconciliation_run_report_checksums_no_truncate
  BEFORE TRUNCATE ON reconciliation_run_report_checksums
  FOR EACH STATEMENT EXECUTE FUNCTION reject_reconciliation_evidence_mutation();
