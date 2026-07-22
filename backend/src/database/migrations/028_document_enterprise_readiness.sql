CREATE TABLE IF NOT EXISTS document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

INSERT INTO document_types (name)
VALUES
  ('Business Case'),
  ('Project Charter'),
  ('PID'),
  ('HLD'),
  ('LLD'),
  ('Architecture Diagram'),
  ('Solution Design'),
  ('API Specification'),
  ('Data Model'),
  ('Test Strategy'),
  ('Test Plan'),
  ('Test Cases'),
  ('Test Results'),
  ('Deployment Guide'),
  ('Installation Guide'),
  ('Runbook'),
  ('Operations Guide'),
  ('SOP'),
  ('User Guide'),
  ('Training Material'),
  ('RAID'),
  ('Lessons Learned'),
  ('Release Notes'),
  ('Other')
ON CONFLICT (name) DO NOTHING;

INSERT INTO document_categories (name)
VALUES
  ('Business'),
  ('Architecture'),
  ('Development'),
  ('Testing'),
  ('Operations'),
  ('Project Management'),
  ('Security'),
  ('Infrastructure'),
  ('Compliance'),
  ('Training'),
  ('Other')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE project_documents
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES document_categories(id),
  ADD COLUMN IF NOT EXISTS document_type_id UUID REFERENCES document_types(id),
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS link_status VARCHAR NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS updated_by_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS deleted_by_id UUID REFERENCES users(id);

UPDATE project_documents
SET storage_provider = CASE storage_provider
  WHEN 'Google Drive' THEN 'GOOGLE_DRIVE'
  WHEN 'SharePoint' THEN 'SHAREPOINT'
  WHEN 'OneDrive' THEN 'ONEDRIVE'
  WHEN 'Confluence' THEN 'CONFLUENCE'
  WHEN 'GitHub' THEN 'GITHUB'
  WHEN 'Dropbox' THEN 'DROPBOX'
  WHEN 'Network Share' THEN 'NETWORK_SHARE'
  WHEN 'Other' THEN 'OTHER'
  ELSE storage_provider
END
WHERE storage_provider IN (
  'Google Drive',
  'SharePoint',
  'OneDrive',
  'Confluence',
  'GitHub',
  'Dropbox',
  'Network Share',
  'Other'
);

UPDATE project_documents
SET approval_status = CASE status
  WHEN 'draft' THEN 'DRAFT'
  WHEN 'active' THEN 'APPROVED'
  WHEN 'archived' THEN 'ARCHIVED'
  ELSE 'DRAFT'
END
WHERE status IS NOT NULL;

UPDATE project_documents document
SET document_type_id = COALESCE(
  (
    SELECT id
    FROM document_types
    WHERE name = document.document_type
    LIMIT 1
  ),
  (
    SELECT id
    FROM document_types
    WHERE name = 'Other'
    LIMIT 1
  )
)
WHERE document.document_type_id IS NULL;

UPDATE project_documents document
SET category_id = (
  SELECT id
  FROM document_categories
  WHERE name = document.category
  LIMIT 1
)
WHERE document.category_id IS NULL
  AND document.category IS NOT NULL;

ALTER TABLE project_documents
  ALTER COLUMN document_type_id SET NOT NULL,
  ALTER COLUMN storage_provider SET DEFAULT 'OTHER';

ALTER TABLE project_documents
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS document_type;

CREATE INDEX IF NOT EXISTS idx_project_documents_owner
  ON project_documents(owner_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_documents_document_type
  ON project_documents(document_type_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_documents_category_ref
  ON project_documents(category_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_documents_approval
  ON project_documents(approval_status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_documents_review
  ON project_documents(next_review_at)
  WHERE deleted_at IS NULL;
