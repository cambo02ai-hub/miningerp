-- Add the user father-name field introduced by the employee profile update.
-- IF NOT EXISTS keeps this safe after the emergency production repair.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS father_name VARCHAR(255);
