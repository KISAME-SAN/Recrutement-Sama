-- Add is_read column to applications table with default value of false
ALTER TABLE applications 
ADD COLUMN is_read BOOLEAN DEFAULT FALSE;

-- Update existing applications to have is_read set to true
UPDATE applications 
SET is_read = TRUE 
WHERE created_at < NOW();