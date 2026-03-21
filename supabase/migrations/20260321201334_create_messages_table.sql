/*
  # Create Messages Table

  1. New Tables
    - `messages`
      - `id` (uuid, primary key) - Unique message identifier
      - `user_id` (uuid, foreign key) - References auth.users
      - `gmail_message_id` (text) - Gmail's unique message ID
      - `thread_id` (text) - Gmail thread ID for grouping conversations
      - `from_email` (text) - Sender email address
      - `to_email` (text) - Recipient email address
      - `subject` (text) - Email subject
      - `body` (text) - Email body content
      - `is_sent` (boolean) - True if sent by user, false if received
      - `received_at` (timestamptz) - When the email was received/sent
      - `created_at` (timestamptz) - When the record was created

  2. Security
    - Enable RLS on `messages` table
    - Add policy for users to read their own messages
    - Add policy for users to insert their own messages
*/

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  gmail_message_id text,
  thread_id text,
  from_email text NOT NULL,
  to_email text NOT NULL,
  subject text DEFAULT '',
  body text DEFAULT '',
  is_sent boolean DEFAULT false,
  received_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS messages_user_id_idx ON messages(user_id);
CREATE INDEX IF NOT EXISTS messages_thread_id_idx ON messages(thread_id);
CREATE INDEX IF NOT EXISTS messages_received_at_idx ON messages(received_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);