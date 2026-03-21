/*
  # Add Unique Constraint for Gmail Message ID

  1. Changes
    - Add unique constraint on `gmail_message_id` column in `messages` table
    - This prevents duplicate messages from being stored
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'messages_gmail_message_id_key'
  ) THEN
    ALTER TABLE messages ADD CONSTRAINT messages_gmail_message_id_key UNIQUE (gmail_message_id);
  END IF;
END $$;