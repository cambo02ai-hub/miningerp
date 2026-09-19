-- Persist the profile fields shown on employee QR verification cards.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone VARCHAR(100),
    ADD COLUMN IF NOT EXISTS nrc VARCHAR(150),
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS position VARCHAR(150),
    ADD COLUMN IF NOT EXISTS photo_url TEXT;
