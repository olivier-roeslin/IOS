/*
  # Create Gmail configuration table

  1. New Tables
    - `gmail_config`
      - `id` (integer, primary key) - Always 1 (singleton table)
      - `gmail_user` (text) - Gmail email address
      - `gmail_app_password` (text) - Gmail app password (encrypted at rest)
      - `updated_at` (timestamptz) - Last update timestamp
      - `created_at` (timestamptz) - Creation timestamp

  2. Security
    - Enable RLS on `gmail_config` table
    - Add policy for service role to manage configuration
    - Only accessible via Edge Functions with service role key
*/

CREATE TABLE IF NOT EXISTS gmail_config (
  id integer PRIMARY KEY DEFAULT 1,
  gmail_user text NOT NULL,
  gmail_app_password text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE gmail_config ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table
CREATE POLICY "Service role can manage gmail config"
  ON gmail_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
