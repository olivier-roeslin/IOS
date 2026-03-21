/*
  # Link Gmail configuration to users

  1. Changes
    - Drop the old gmail_config table with singleton constraint
    - Create new gmail_config table linked to auth.users
    - Each user can have their own Gmail configuration
    - Gmail app password stored securely per user

  2. New Tables
    - `gmail_config`
      - `user_id` (uuid, primary key, foreign key to auth.users)
      - `gmail_user` (text) - Gmail email address
      - `gmail_app_password` (text) - Gmail app password
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  3. Security
    - Enable RLS on `gmail_config` table
    - Users can only read/write their own Gmail configuration
*/

DROP TABLE IF EXISTS gmail_config;

CREATE TABLE IF NOT EXISTS gmail_config (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_user text NOT NULL,
  gmail_app_password text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE gmail_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own Gmail config"
  ON gmail_config
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Gmail config"
  ON gmail_config
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Gmail config"
  ON gmail_config
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own Gmail config"
  ON gmail_config
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
