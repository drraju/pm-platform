DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'user_identity_type'
  ) THEN
    CREATE TYPE user_identity_type AS ENUM ('HUMAN', 'SERVICE');
  END IF;
END
$$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS identity_type user_identity_type;

UPDATE users
SET identity_type = 'HUMAN'::user_identity_type
WHERE identity_type IS NULL;

ALTER TABLE users
  ALTER COLUMN identity_type SET DEFAULT 'HUMAN'::user_identity_type,
  ALTER COLUMN identity_type SET NOT NULL;
