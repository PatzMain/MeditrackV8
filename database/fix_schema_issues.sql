-- =============================================
-- MEDITRACK SCHEMA FIXES
-- Migration to fix issues found in consolidated_database_schema.sql
-- =============================================

-- =============================================
-- 1. ADD consultation_type COLUMN TO consultations TABLE
-- =============================================
-- This field is required by the application but missing from the schema
ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS consultation_type VARCHAR(20)
CHECK (consultation_type IN ('routine', 'emergency', 'follow_up', 'referral', 'treatment'))
DEFAULT 'routine';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_consultations_type ON consultations(consultation_type);

-- Add comment for documentation
COMMENT ON COLUMN consultations.consultation_type IS 'Type of consultation: routine, emergency, follow_up, referral, or treatment';

-- =============================================
-- 2. FIX glasgow_coma_scales total_score COLUMN
-- =============================================
-- The current schema uses GENERATED ALWAYS AS which prevents manual insertion
-- The application code tries to set total_score manually, causing conflicts

-- Drop the generated column constraint
ALTER TABLE glasgow_coma_scales
ALTER COLUMN total_score DROP EXPRESSION IF EXISTS;

-- Alternative: If the above doesn't work, recreate the column
-- Uncomment the following lines if needed:
/*
ALTER TABLE glasgow_coma_scales DROP COLUMN IF EXISTS total_score;
ALTER TABLE glasgow_coma_scales ADD COLUMN total_score INTEGER;
COMMENT ON COLUMN glasgow_coma_scales.total_score IS 'Total GCS score (sum of eye + verbal + motor responses)';
*/

-- =============================================
-- 3. VERIFY consultation_attachments TABLE
-- =============================================
-- Table exists and is correct, but requires Supabase Storage bucket setup
-- Bucket name: 'consultation-attachments'
--
-- TO CREATE BUCKET IN SUPABASE:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create new bucket named: consultation-attachments
-- 3. Set bucket to PUBLIC
-- 4. Configure RLS policies if needed:
--    - Allow authenticated users to upload
--    - Allow authenticated users to read
--    - Allow authenticated users to delete their own files

-- =============================================
-- 4. UPDATE EXISTING DATA (if needed)
-- =============================================
-- Set default consultation_type for existing records without it
UPDATE consultations
SET consultation_type = 'routine'
WHERE consultation_type IS NULL;

-- Recalculate total_score for existing glasgow_coma_scales records
UPDATE glasgow_coma_scales
SET total_score = eye_response + verbal_response + motor_response
WHERE total_score IS NULL OR total_score = 0;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================
-- Run these to verify the changes were applied successfully:

-- Check consultations table has consultation_type
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'consultations' AND column_name = 'consultation_type';

-- Check glasgow_coma_scales total_score is not generated
-- SELECT column_name, data_type, is_generated
-- FROM information_schema.columns
-- WHERE table_name = 'glasgow_coma_scales' AND column_name = 'total_score';

-- Check if any consultations have NULL consultation_type
-- SELECT COUNT(*) FROM consultations WHERE consultation_type IS NULL;

-- Check if any glasgow scores have incorrect totals
-- SELECT id, eye_response, verbal_response, motor_response, total_score,
--        (eye_response + verbal_response + motor_response) as calculated_total
-- FROM glasgow_coma_scales
-- WHERE total_score != (eye_response + verbal_response + motor_response);

-- =============================================
-- NOTES:
-- =============================================
-- 1. Run this migration on your Supabase database
-- 2. Create the 'consultation-attachments' storage bucket manually
-- 3. Test the application to ensure all features work correctly
-- 4. The consultation_type field is now required for new consultations
-- 5. Glasgow Coma Scale total_score can now be set by the application
