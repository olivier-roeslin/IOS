/*
  # Create chatbot messages table

  1. New Tables
    - `chatbot_messages`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `role` (text, either 'user' or 'assistant')
      - `content` (text, the message content)
      - `created_at` (timestamptz, timestamp of message)

  2. Security
    - Enable RLS on `chatbot_messages` table
    - Add policy for users to read their own messages
    - Add policy for users to insert their own messages
    - Add policy for users to delete their own messages
*/

CREATE TABLE IF NOT EXISTS chatbot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chatbot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own chatbot messages"
  ON chatbot_messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chatbot messages"
  ON chatbot_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chatbot messages"
  ON chatbot_messages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);