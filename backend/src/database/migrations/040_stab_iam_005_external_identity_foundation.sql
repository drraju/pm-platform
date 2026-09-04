DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM users
    GROUP BY lower(email)
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'Cannot enforce normalized user email uniqueness: case-colliding user emails exist';
  END IF;
END
$$;

ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE users
  ADD CONSTRAINT chk_users_service_password_required
  CHECK (
    identity_type <> 'SERVICE'::user_identity_type
    OR password_hash IS NOT NULL
  );

CREATE UNIQUE INDEX idx_users_email_normalized_unique
  ON users (lower(email));

CREATE TABLE external_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider VARCHAR(50) NOT NULL,
  issuer VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  email_at_last_authentication VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_authenticated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_external_identities_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_external_identities_provider
    CHECK (provider IN ('GOOGLE')),
  CONSTRAINT uq_external_identities_issuer_subject
    UNIQUE (issuer, subject),
  CONSTRAINT uq_external_identities_user_provider
    UNIQUE (user_id, provider)
);
