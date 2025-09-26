-- =============================================
-- MEDITRACK CONSOLIDATED DATABASE SCHEMA
-- Combined from multiple SQL files with improvements
-- =============================================

-- =============================================
-- 1. USERS TABLE - System users (admins, doctors, staff)
-- =============================================
CREATE TABLE public.users (
    id serial not null,
    username character varying(50) not null,
    password character varying(255) not null,
    role character varying(20) null default 'admin'::character varying,
    first_name character varying(100) null,
    last_name character varying(100) null,
    phone character varying(20) null,
    department character varying(100) null,
    position character varying(100) null,
    employee_id character varying(50) null,
    license_number character varying(100) null,
    specialization text null,
    created_at timestamp with time zone null default now(),
    updated_at timestamp with time zone null default now(),
    avatar_url text null,
    bio text null,
    gender character varying(20) null,
    emergency_contact_name character varying(255) null,
    emergency_contact_phone character varying(50) null,
    emergency_contact_relationship character varying(100) null,
    last_login timestamp with time zone null,
    login_count integer null default 0,
    password_hash text null,
    constraint users_pkey primary key (id),
    constraint users_employee_id_key unique (employee_id),
    constraint users_username_key unique (username),
    constraint users_role_check check (
        (role)::text = any (
            (array[
                'admin'::character varying,
                'superadmin'::character varying
            ])::text[]
        )
    )
) TABLESPACE pg_default;

-- =============================================
-- 2. INVENTORY CLASSIFICATIONS TABLE
-- =============================================
CREATE TABLE public.inventory_classifications (
    id serial not null,
    name character varying(100) not null,
    description text null,
    created_at timestamp with time zone null default CURRENT_TIMESTAMP,
    constraint inventory_classifications_pkey primary key (id),
    constraint inventory_classifications_name_key unique (name)
) TABLESPACE pg_default;

-- =============================================
-- 3. INVENTORY ITEMS TABLE
-- =============================================
CREATE TABLE public.inventory_items (
    id serial not null,
    generic_name character varying(255) not null,
    brand_name character varying(255) null,
    classification_id integer null,
    category character varying(100) null,
    department character varying(50) not null,
    stock_quantity integer not null default 0,
    unit_of_measurement character varying(50) null default 'pcs'::character varying,
    expiration_date date null,
    status character varying(50) not null default 'active'::character varying,
    notes text null,
    created_at timestamp with time zone null default CURRENT_TIMESTAMP,
    updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
    created_by integer null,
    updated_by integer null,
    code text null,
    constraint inventory_items_pkey primary key (id),
    constraint inventory_items_classification_id_fkey foreign KEY (classification_id) references inventory_classifications (id) on delete set null,
    constraint inventory_items_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
    constraint inventory_items_updated_by_fkey foreign KEY (updated_by) references users (id) on delete set null,
    constraint inventory_items_department_check check (
        (department)::text = any (
            (array[
                'medical'::character varying,
                'dental'::character varying
            ])::text[]
        )
    ),
    constraint inventory_items_status_check check (
        (status)::text = any (
            (array[
                'active'::character varying,
                'low_stock'::character varying,
                'out_of_stock'::character varying,
                'expired'::character varying,
                'maintenance'::character varying,
                'archived'::character varying
            ])::text[]
        )
    )
) TABLESPACE pg_default;

-- =============================================
-- 4. USER ACTIVITY TABLE - Enhanced logging
-- =============================================
CREATE TABLE public.user_activity (
    id serial not null,
    user_id integer null,
    action character varying(50) not null,
    category character varying(100) null,
    description text null,
    timestamp timestamp with time zone null default now(),
    severity character varying(20) null default 'info'::character varying,
    details JSONB DEFAULT NULL,
    resource_type VARCHAR(50) DEFAULT NULL,
    resource_id INTEGER DEFAULT NULL,
    ip_address INET DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    constraint user_activity_pkey primary key (id),
    constraint user_activity_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
    constraint user_activity_severity_check check (
        (severity)::text = any (
            (array[
                'info'::character varying,
                'warning'::character varying,
                'error'::character varying
            ])::text[]
        )
    ),
    constraint user_activity_category_check check (
        category IN (
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
        )
    )
) TABLESPACE pg_default;

-- =============================================
-- 5. PATIENTS TABLE - Core patient information (UPDATED)
-- =============================================
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) UNIQUE NOT NULL, -- Generated unique patient ID

    -- Personal Data
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    age INTEGER,
    sex VARCHAR(10) CHECK (sex IN ('Male', 'Female')),
    civil_status VARCHAR(20) CHECK (civil_status IN ('Single', 'Married', 'Divorced', 'Widowed')),
    birthday DATE,
    address TEXT,

    -- Patient Type and Classification
    patient_type VARCHAR(20) CHECK (patient_type IN ('Employee', 'Dependent', 'Student', 'OPD')) NOT NULL,

    -- SEPARATED FIELDS - No longer course_department
    course VARCHAR(100), -- Course/Program for students
    department VARCHAR(100), -- Department for employees/students

    -- Student Classification (only for patient_type = 'Student')
    student_level VARCHAR(20),
    year_level INTEGER,

    -- Contact Information
    phone VARCHAR(20),
    email VARCHAR(100),

    -- System fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived'))
);

-- =============================================
-- 6. PATIENT CONTACTS - Emergency contacts
-- =============================================
CREATE TABLE patient_contacts (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,

    contact_name VARCHAR(100) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    is_primary BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 7. MEDICAL HISTORY - Patient background
-- =============================================
CREATE TABLE medical_history (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,

    -- Allergies
    food_allergies TEXT,
    drug_allergies TEXT,
    other_allergies TEXT,

    -- Family History
    family_ptb BOOLEAN DEFAULT false,
    family_cancer BOOLEAN DEFAULT false,
    family_dm BOOLEAN DEFAULT false,
    family_cardiovascular BOOLEAN DEFAULT false,
    family_others TEXT,

    -- Medical History
    seizure BOOLEAN DEFAULT false,
    asthma BOOLEAN DEFAULT false,
    ptb BOOLEAN DEFAULT false,
    surgery BOOLEAN DEFAULT false,
    cardio BOOLEAN DEFAULT false,
    neuro BOOLEAN DEFAULT false,
    ob_gyne BOOLEAN DEFAULT false,
    other_conditions TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 8. CONSULTATIONS - Individual consultation records
-- =============================================
CREATE TABLE consultations (
    id SERIAL PRIMARY KEY,
    case_number VARCHAR(50) UNIQUE NOT NULL,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,

    -- Consultation DateTime
    consultation_date DATE NOT NULL,
    time_in TIME NOT NULL,
    time_out TIME,

    -- Chief Complaint
    chief_complaint TEXT NOT NULL,

    -- Previous Consultation Reference
    previous_consultation_date DATE,
    previous_diagnosis TEXT,
    previous_medications TEXT,

    -- Assessment and Diagnosis
    diagnosis TEXT,
    subjective_notes TEXT, -- S>
    objective_notes TEXT,  -- O>
    assessment_notes TEXT, -- A>
    plan_notes TEXT,       -- P>
    interventions TEXT,

    -- Attending Physician
    attending_physician INTEGER REFERENCES users(id),
    attending_physician_name VARCHAR(100), -- In case external physician

    -- System fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled'))
);

-- =============================================
-- 9. VITAL SIGNS - Patient vital measurements
-- =============================================
CREATE TABLE vital_signs (
    id SERIAL PRIMARY KEY,
    consultation_id INTEGER REFERENCES consultations(id) ON DELETE CASCADE,

    -- Mode of Arrival
    mode_of_arrival VARCHAR(20) CHECK (mode_of_arrival IN ('Ambulatory', 'Assisted', 'Cuddled/Carried')),

    -- Vital Signs Measurements
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    temperature DECIMAL(4,1), -- in Celsius
    pulse_rate INTEGER,
    respiratory_rate INTEGER,
    height DECIMAL(5,2), -- in cm
    weight DECIMAL(5,2), -- in kg
    oxygen_saturation INTEGER, -- percentage
    lmp DATE, -- Last Menstrual Period

    -- Patient Condition
    has_valuables BOOLEAN DEFAULT false,
    valuables_released_to VARCHAR(50), -- Patient, Relatives, Companion, CvSU Security
    valuables_items TEXT,

    patient_in_pain BOOLEAN DEFAULT false,
    pain_scale INTEGER CHECK (pain_scale >= 0 AND pain_scale <= 10),

    patient_has_injuries BOOLEAN DEFAULT false,
    injury_abrasion BOOLEAN DEFAULT false,
    injury_contusion BOOLEAN DEFAULT false,
    injury_fracture BOOLEAN DEFAULT false,
    injury_laceration BOOLEAN DEFAULT false,
    injury_puncture BOOLEAN DEFAULT false,
    injury_sprain BOOLEAN DEFAULT false,
    injury_other TEXT,

    -- Injury Details
    noi TEXT, -- Nature of Injury
    poi TEXT, -- Place of Injury
    doi DATE, -- Date of Injury
    toi TIME, -- Time of Injury

    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by INTEGER REFERENCES users(id)
);

-- =============================================
-- 10. GLASGOW COMA SCALE - GCS Assessments
-- =============================================
CREATE TABLE glasgow_coma_scales (
    id SERIAL PRIMARY KEY,
    consultation_id INTEGER REFERENCES consultations(id) ON DELETE CASCADE,

    -- Eye Response (1-4)
    eye_response INTEGER CHECK (eye_response >= 1 AND eye_response <= 4),
    eye_response_description VARCHAR(50),

    -- Verbal Response (1-5)
    verbal_response INTEGER CHECK (verbal_response >= 1 AND verbal_response <= 5),
    verbal_response_description VARCHAR(50),

    -- Motor Response (1-6)
    motor_response INTEGER CHECK (motor_response >= 1 AND motor_response <= 6),
    motor_response_description VARCHAR(50),

    -- Total Score (3-15)
    total_score INTEGER GENERATED ALWAYS AS (eye_response + verbal_response + motor_response) STORED,

    assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assessed_by INTEGER REFERENCES users(id)
);

-- =============================================
-- 11. CONSULTATION ATTACHMENTS - File uploads
-- =============================================
CREATE TABLE consultation_attachments (
    id SERIAL PRIMARY KEY,
    consultation_id INTEGER REFERENCES consultations(id) ON DELETE CASCADE,

    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER,
    description TEXT,

    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INTEGER REFERENCES users(id)
);

-- =============================================
-- 12. PATIENT MONITORING LOGS - Activity tracking
-- =============================================
CREATE TABLE patient_monitoring_logs (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    consultation_id INTEGER REFERENCES consultations(id),

    action VARCHAR(100) NOT NULL,
    description TEXT,
    details JSONB, -- Store additional data

    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    performed_by INTEGER REFERENCES users(id)
);

-- =============================================
-- INDEXES for Performance
-- =============================================

-- User table indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_department ON public.inventory_items USING btree (department) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_inventory_items_classification_id ON public.inventory_items USING btree (classification_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items USING btree (category) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_inventory_items_generic_name ON public.inventory_items USING btree (generic_name) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_inventory_items_brand_name ON public.inventory_items USING btree (brand_name) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON public.inventory_items USING btree (status) TABLESPACE pg_default;

-- User activity indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity USING btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_user_activity_timestamp ON public.user_activity USING btree ("timestamp") TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_user_activity_action ON public.user_activity USING btree (action) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_user_activity_details ON user_activity USING GIN (details);
CREATE INDEX IF NOT EXISTS idx_user_activity_resource_type ON user_activity (resource_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_resource_id ON user_activity (resource_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_ip_address ON user_activity (ip_address);

-- Patient monitoring indexes
CREATE INDEX idx_patients_patient_id ON patients(patient_id);
CREATE INDEX idx_patients_type ON patients(patient_type);
CREATE INDEX idx_patients_status ON patients(status);
CREATE INDEX idx_patients_course ON patients(course);
CREATE INDEX idx_patients_department ON patients(department);
CREATE INDEX idx_consultations_case_number ON consultations(case_number);
CREATE INDEX idx_consultations_patient_id ON consultations(patient_id);
CREATE INDEX idx_consultations_date ON consultations(consultation_date);
CREATE INDEX idx_vital_signs_consultation_id ON vital_signs(consultation_id);
CREATE INDEX idx_gcs_consultation_id ON glasgow_coma_scales(consultation_id);
CREATE INDEX idx_medical_history_patient_id ON medical_history(patient_id);
CREATE INDEX idx_patient_contacts_patient_id ON patient_contacts(patient_id);

-- =============================================
-- FUNCTIONS for Auto-generation and Validation
-- =============================================

-- Function to generate patient ID
CREATE OR REPLACE FUNCTION generate_patient_id()
RETURNS TEXT AS $$
DECLARE
    new_id TEXT;
    current_year TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;

    SELECT
        'PT' || current_year || '-' || LPAD((COUNT(*) + 1)::TEXT, 4, '0')
    INTO new_id
    FROM patients
    WHERE patient_id LIKE 'PT' || current_year || '-%';

    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate case number
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TEXT AS $$
DECLARE
    new_case_number TEXT;
    current_date_str TEXT;
BEGIN
    current_date_str := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

    SELECT
        'CS' || current_date_str || '-' || LPAD((COUNT(*) + 1)::TEXT, 3, '0')
    INTO new_case_number
    FROM consultations
    WHERE case_number LIKE 'CS' || current_date_str || '-%';

    RETURN new_case_number;
END;
$$ LANGUAGE plpgsql;

-- Function to validate student data
CREATE OR REPLACE FUNCTION validate_student_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Only validate if patient is a student
    IF NEW.patient_type = 'Student' THEN
        -- Check if student_level and year_level are provided
        IF NEW.student_level IS NULL OR NEW.year_level IS NULL THEN
            RAISE EXCEPTION 'Student patients must have both student_level and year_level specified';
        END IF;

        -- Validate high school years (7-12)
        IF NEW.student_level = 'highschool' THEN
            IF NEW.year_level < 7 OR NEW.year_level > 12 THEN
                RAISE EXCEPTION 'High school students must be in grades 7-12, got grade %', NEW.year_level;
            END IF;
        END IF;

        -- Validate college years (1-6)
        IF NEW.student_level = 'college' THEN
            IF NEW.year_level < 1 OR NEW.year_level > 6 THEN
                RAISE EXCEPTION 'College students must be in years 1-6, got year %', NEW.year_level;
            END IF;
        END IF;

        -- Validate that student_level is either highschool or college
        IF NEW.student_level != 'highschool' AND NEW.student_level != 'college' THEN
            RAISE EXCEPTION 'Student level must be either highschool or college, got %', NEW.student_level;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create user defaults (placeholder)
CREATE OR REPLACE FUNCTION create_user_defaults()
RETURNS TRIGGER AS $$
BEGIN
    -- Add any default creation logic here
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS for Auto-generation and Updates
-- =============================================

-- Trigger to auto-generate patient_id
CREATE OR REPLACE FUNCTION set_patient_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.patient_id IS NULL OR NEW.patient_id = '' THEN
        NEW.patient_id := generate_patient_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_patient_id
    BEFORE INSERT ON patients
    FOR EACH ROW
    EXECUTE FUNCTION set_patient_id();

-- Trigger to auto-generate case_number
CREATE OR REPLACE FUNCTION set_case_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.case_number IS NULL OR NEW.case_number = '' THEN
        NEW.case_number := generate_case_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_case_number
    BEFORE INSERT ON consultations
    FOR EACH ROW
    EXECUTE FUNCTION set_case_number();

-- Trigger to validate student data
CREATE TRIGGER trigger_validate_student_data
    BEFORE INSERT OR UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION validate_student_data();

-- Trigger to update updated_at timestamp for users
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to create user defaults
CREATE TRIGGER create_user_defaults_trigger
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_defaults();

-- =============================================
-- VIEWS for Common Queries
-- =============================================

-- View for patient summary with latest consultation (UPDATED)
CREATE VIEW patient_summary AS
SELECT
    p.id,
    p.patient_id,
    p.first_name,
    p.last_name,
    p.age,
    p.sex,
    p.patient_type,
    p.course,
    p.department,
    p.status,
    latest_consultation.consultation_date as last_consultation_date,
    latest_consultation.chief_complaint as last_chief_complaint,
    latest_consultation.diagnosis as last_diagnosis,
    COUNT(c.id) as total_consultations
FROM patients p
LEFT JOIN LATERAL (
    SELECT consultation_date, chief_complaint, diagnosis
    FROM consultations
    WHERE patient_id = p.id
    ORDER BY consultation_date DESC, time_in DESC
    LIMIT 1
) latest_consultation ON true
LEFT JOIN consultations c ON c.patient_id = p.id
GROUP BY p.id, p.patient_id, p.first_name, p.last_name, p.age, p.sex,
         p.patient_type, p.course, p.department, p.status,
         latest_consultation.consultation_date, latest_consultation.chief_complaint,
         latest_consultation.diagnosis;

-- View for consultation details with patient info
CREATE VIEW consultation_details AS
SELECT
    c.id as consultation_id,
    c.case_number,
    c.consultation_date,
    c.time_in,
    c.time_out,
    c.chief_complaint,
    c.diagnosis,
    c.status as consultation_status,
    p.patient_id,
    p.first_name,
    p.last_name,
    p.age,
    p.sex,
    p.patient_type,
    p.course,
    p.department,
    u.username as attending_physician_username,
    u.first_name as physician_first_name,
    u.last_name as physician_last_name,
    vs.blood_pressure_systolic,
    vs.blood_pressure_diastolic,
    vs.temperature,
    vs.pulse_rate,
    vs.respiratory_rate,
    gcs.total_score as glasgow_coma_score
FROM consultations c
JOIN patients p ON c.patient_id = p.id
LEFT JOIN users u ON c.attending_physician = u.id
LEFT JOIN vital_signs vs ON c.id = vs.consultation_id
LEFT JOIN glasgow_coma_scales gcs ON c.id = gcs.consultation_id;

-- =============================================
-- SAMPLE DATA (Optional for testing)
-- =============================================

-- Note: Make sure to create at least one user first before inserting patients
-- INSERT INTO users (username, password, role, first_name, last_name)
-- VALUES ('admin', 'hashed_password_here', 'admin', 'Admin', 'User');

-- Insert sample patients with separate course and department fields
INSERT INTO patients (
    first_name, last_name, age, sex, civil_status, birthday, address,
    patient_type, course, department, student_level, year_level,
    phone, email, created_by
) VALUES
('John', 'Doe', 21, 'Male', 'Single', '2002-05-15', '123 Main St, Rosario, Cavite', 'Student', 'Computer Science', 'College of Engineering and Information Technology', 'college', 3, '09123456789', 'john.doe@cvsu.edu.ph', 1),
('Jane', 'Smith', 30, 'Female', 'Married', '1993-08-22', '456 Oak Ave, Rosario, Cavite', 'Employee', NULL, 'Nursing Department', NULL, NULL, '09987654321', 'jane.smith@cvsu.edu.ph', 1),
('Maria', 'Garcia', 17, 'Female', 'Single', '2006-12-10', '789 Pine St, Rosario, Cavite', 'Student', 'Science and Technology', 'College of Arts and Sciences', 'highschool', 11, '09111222333', 'maria.garcia@cvsu.edu.ph', 1),
('Pedro', 'Santos', 19, 'Male', 'Single', '2004-03-08', '321 Elm St, Rosario, Cavite', 'Student', 'Civil Engineering', 'College of Engineering and Information Technology', 'college', 1, '09444555666', 'pedro.santos@cvsu.edu.ph', 1),
('Ana', 'Cruz', 16, 'Female', 'Single', '2007-09-20', '654 Maple Ave, Rosario, Cavite', 'Student', 'Arts and Letters', 'College of Arts and Sciences', 'highschool', 10, '09777888999', 'ana.cruz@cvsu.edu.ph', 1);

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================
COMMENT ON COLUMN user_activity.details IS 'JSONB field for storing structured data related to the activity';
COMMENT ON COLUMN user_activity.resource_type IS 'Type of resource affected (patient, user, inventory, etc.)';
COMMENT ON COLUMN user_activity.resource_id IS 'ID of the specific resource affected';
COMMENT ON COLUMN user_activity.ip_address IS 'IP address from which the activity was performed';
COMMENT ON COLUMN user_activity.user_agent IS 'User agent string of the browser/client';
COMMENT ON COLUMN patients.course IS 'Course/Program name for students (not constrained to allow flexibility)';
COMMENT ON COLUMN patients.department IS 'Department name for employees/students (not constrained to allow flexibility)';

-- =============================================
-- NOTES FOR IMPLEMENTATION:
-- =============================================
-- 1. This consolidated schema combines all previous SQL files
-- 2. Separates course_department into course and department fields
-- 3. Course and department are not constrained in database for flexibility
-- 4. Frontend should provide dropdown options for course and department
-- 5. Includes proper relationships and constraints
-- 6. Auto-generates IDs and case numbers
-- 7. Includes indexes for performance
-- 8. Provides views for common queries
-- 9. Supports file attachments and activity logging
-- 10. Enhanced logging with JSONB details and additional tracking fields