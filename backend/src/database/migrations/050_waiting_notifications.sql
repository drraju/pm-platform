ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_reason_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_reason_check
    CHECK (
      reason IS NULL
      OR reason IN (
        'assigned',
        'blocked',
        'overdue',
        'waiting_blocked',
        'waiting_overdue'
      )
    );
