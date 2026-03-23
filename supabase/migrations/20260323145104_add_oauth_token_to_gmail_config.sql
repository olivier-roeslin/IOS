/*
  # Add OAuth token storage to Gmail configuration

  1. Changes
    - Add `oauth_access_token` column to `gmail_config` table
    - Add `oauth_refresh_token` column to `gmail_config` table
    - Add `oauth_token_expiry` column to `gmail_config` table
    - Make `gmail_app_password` optional (nullable) since OAuth is now primary method
    
  2. Notes
    - OAuth tokens will be used for Gmail API authentication
    - App passwords remain as fallback option
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmail_config' AND column_name = 'oauth_access_token'
  ) THEN
    ALTER TABLE gmail_config ADD COLUMN oauth_access_token text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmail_config' AND column_name = 'oauth_refresh_token'
  ) THEN
    ALTER TABLE gmail_config ADD COLUMN oauth_refresh_token text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmail_config' AND column_name = 'oauth_token_expiry'
  ) THEN
    ALTER TABLE gmail_config ADD COLUMN oauth_token_expiry timestamptz;
  END IF;
END $$;

ALTER TABLE gmail_config ALTER COLUMN gmail_app_password DROP NOT NULL;
