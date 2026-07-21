ALTER TABLE reconciliation_approvals ALTER COLUMN target_id DROP NOT NULL;
ALTER TABLE reconciliation_approvals ALTER COLUMN verifier_id DROP NOT NULL;
ALTER TABLE reconciliation_approvals ADD COLUMN status TEXT NOT NULL DEFAULT 'MATCHED';
ALTER TABLE reconciliation_approvals ADD COLUMN normalized_email TEXT;
ALTER TABLE reconciliation_approvals ADD COLUMN prisma_user_id TEXT;
ALTER TABLE reconciliation_approvals ADD COLUMN admin_settings_hash TEXT;
ALTER TABLE reconciliation_approvals ADD COLUMN prisma_user_hash TEXT;
ALTER TABLE reconciliation_approvals ADD COLUMN usuario_hash TEXT;
ALTER TABLE reconciliation_approvals ADD COLUMN product_approver_id TEXT;
ALTER TABLE reconciliation_approvals ADD COLUMN reset_reason TEXT;
ALTER TABLE reconciliation_approvals ADD COLUMN reset_defaults TEXT;

ALTER TABLE reconciliation_approvals ADD CONSTRAINT reconciliation_approval_status_complete CHECK (
  (status = 'MATCHED' AND normalized_email IS NOT NULL AND source_id IS NOT NULL AND prisma_user_id IS NOT NULL
    AND target_id IS NOT NULL AND verifier_id IS NOT NULL AND admin_settings_hash IS NOT NULL
    AND prisma_user_hash IS NOT NULL AND usuario_hash IS NOT NULL)
  OR (status = 'RESET_APPROVED' AND normalized_email IS NOT NULL AND source_id IS NOT NULL AND prisma_user_id IS NOT NULL
    AND admin_settings_hash IS NOT NULL AND prisma_user_hash IS NOT NULL AND product_approver_id IS NOT NULL
    AND reset_reason IS NOT NULL AND reset_defaults IS NOT NULL)
);
