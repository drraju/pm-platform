DROP TABLE IF EXISTS google_drive_document_metadata;
DROP TABLE IF EXISTS google_drive_project_folders;
DROP TABLE IF EXISTS google_drive_connections;

CREATE TABLE IF NOT EXISTS project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR,
  document_type VARCHAR NOT NULL,
  version VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'active',
  storage_provider VARCHAR NOT NULL,
  external_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_project_documents_project
  ON project_documents(project_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_documents_provider
  ON project_documents(storage_provider)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_documents_category
  ON project_documents(category)
  WHERE deleted_at IS NULL;
