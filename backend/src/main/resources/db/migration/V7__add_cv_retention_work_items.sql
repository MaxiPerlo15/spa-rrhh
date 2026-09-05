CREATE TABLE cv_retention_work_item (
  id VARCHAR(255) NOT NULL,
  candidate_id VARCHAR(255) NOT NULL,
  expected_resume_key VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  lease_token VARCHAR(255),
  next_attempt_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
  lease_until TIMESTAMP(6) WITH TIME ZONE,
  last_error TEXT,
  created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
  CONSTRAINT cv_retention_work_item_pkey PRIMARY KEY (id),
  CONSTRAINT cv_retention_work_item_candidate_fkey FOREIGN KEY (candidate_id) REFERENCES candidato (id),
  CONSTRAINT cv_retention_work_item_candidate_key UNIQUE (candidate_id, expected_resume_key),
  CONSTRAINT cv_retention_work_item_status_check CHECK (status IN ('PENDING', 'LEASED', 'SUCCEEDED', 'SUPERSEDED', 'RETRY_WAIT', 'FAILED'))
);

CREATE INDEX cv_retention_work_item_due_idx
  ON cv_retention_work_item (status, next_attempt_at, lease_until);
