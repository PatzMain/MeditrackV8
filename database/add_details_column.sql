-- Add details column to user_activity table for enhanced logging
-- This allows storing structured data with each log entry

ALTER TABLE user_activity
ADD COLUMN details JSONB DEFAULT NULL;

-- Add index for JSONB queries on details column
CREATE INDEX IF NOT EXISTS idx_user_activity_details
ON user_activity USING GIN (details);

-- Add additional helpful columns for better categorization
ALTER TABLE user_activity
ADD COLUMN resource_type VARCHAR(50) DEFAULT NULL,
ADD COLUMN resource_id INTEGER DEFAULT NULL,
ADD COLUMN ip_address INET DEFAULT NULL,
ADD COLUMN user_agent TEXT DEFAULT NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_user_activity_resource_type
ON user_activity (resource_type);

CREATE INDEX IF NOT EXISTS idx_user_activity_resource_id
ON user_activity (resource_id);

CREATE INDEX IF NOT EXISTS idx_user_activity_ip_address
ON user_activity (ip_address);

-- First, update existing category values to match the new schema
UPDATE user_activity
SET category = CASE
    WHEN category = 'authentication' THEN 'Authentication'
    WHEN category = 'Patient Management' THEN 'Patient Management'
    WHEN category = 'Medical Records' THEN 'Medical Records'
    WHEN category = 'Inventory Management' THEN 'Inventory Management'
    WHEN category = 'System' THEN 'System Administration'
    WHEN category = 'Security' THEN 'Security'
    WHEN category = 'Laboratory' THEN 'Laboratory'
    WHEN category = 'User Management' THEN 'User Management'
    ELSE 'System Administration'
END
WHERE category IS NOT NULL;

-- Update category constraint to include more professional categories
ALTER TABLE user_activity DROP CONSTRAINT IF EXISTS user_activity_category_check;
ALTER TABLE user_activity ADD CONSTRAINT user_activity_category_check
CHECK (category IN (
    'Authentication',
    'User Management',
    'Patient Management',
    'Medical Records',
    'Inventory Management',
    'System Administration',
    'Security',
    'Data Export',
    'Settings',
    'Audit',
    'Laboratory',
    'Monitoring'
));

-- Add comments for documentation
COMMENT ON COLUMN user_activity.details IS 'JSONB field for storing structured data related to the activity';
COMMENT ON COLUMN user_activity.resource_type IS 'Type of resource affected (patient, user, inventory, etc.)';
COMMENT ON COLUMN user_activity.resource_id IS 'ID of the specific resource affected';
COMMENT ON COLUMN user_activity.ip_address IS 'IP address from which the activity was performed';
COMMENT ON COLUMN user_activity.user_agent IS 'User agent string of the browser/client';