/*
  # Add DELETE Policies for Messages and Reports Tables

  1. Security Changes
    - Add DELETE policy for `messages` table allowing users to delete their own messages
    - Add DELETE policy for `reports` table allowing users to delete their own reports

  2. Purpose
    - Enable users to properly delete their conversation history
    - Ensure data is completely removed when user clicks "Delete Conversation"
*/

-- Add DELETE policy for messages table
CREATE POLICY "Users can delete own messages"
  ON messages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add DELETE policy for reports table  
CREATE POLICY "Users can delete own reports"
  ON reports
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);