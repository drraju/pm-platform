UPDATE users
SET status = 'disabled',
    updated_at = now()
WHERE email = 'admin@example.com'
  AND password_hash = '$2b$10$/BQx.Mv5F6ShmB3JqGxcxOOZkn1uk5bAWhW2yeQwVja2B/KUKfcty'
  AND status <> 'disabled';
