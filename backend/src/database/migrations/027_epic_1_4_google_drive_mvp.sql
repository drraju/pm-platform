CREATE TABLE IF NOT EXISTS google_drive_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connected_account_email VARCHAR NOT NULL,
  connected_by_user_id UUID,
  drive_id VARCHAR,
  drive_name VARCHAR,
  drive_type VARCHAR NOT NULL,
  encrypted_refresh_token TEXT NOT NULL,
  root_folder_id VARCHAR,
  root_folder_url VARCHAR,
  last_connected_at TIMESTAMPTZ NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'connected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_google_drive_connections_account
  ON google_drive_connections(connected_account_email);

CREATE TABLE IF NOT EXISTS google_drive_project_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  connection_id UUID NOT NULL,
  project_name VARCHAR NOT NULL,
  folder_id VARCHAR NOT NULL,
  folder_url VARCHAR NOT NULL,
  root_folder_id VARCHAR NOT NULL,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_google_drive_project_folders_project
  ON google_drive_project_folders(project_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS google_drive_document_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR NOT NULL DEFAULT 'google_drive',
  provider_document_id VARCHAR NOT NULL,
  project_id UUID,
  folder_id VARCHAR,
  name VARCHAR NOT NULL,
  mime_type VARCHAR,
  owner VARCHAR,
  version VARCHAR,
  created_time TIMESTAMPTZ,
  modified_time TIMESTAMPTZ,
  web_url VARCHAR,
  size_bytes BIGINT,
  checksum VARCHAR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_google_drive_document_metadata_provider_doc
  ON google_drive_document_metadata(provider_document_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_google_drive_document_metadata_project
  ON google_drive_document_metadata(project_id);
