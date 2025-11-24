-- Remove unique constraint on user1_id, user2_id to allow multiple sessions
-- between the same users

ALTER TABLE chat_sessions DROP CONSTRAINT IF EXISTS unique_active_session;

-- Add index for better query performance (non-unique)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_users_status 
ON chat_sessions(user1_id, user2_id, status);

