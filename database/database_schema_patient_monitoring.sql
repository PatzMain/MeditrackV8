-- PATIENT MONITORING SYSTEM DATABASE SCHEMA
-- Based on UHSE-QF-01 Consultation Form

-- =============================================
-- 1. PATIENTS TABLE - Core patient information
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
    course_department VARCHAR(100), -- For students/employees

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
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),

);

-- =============================================
-- 2. PATIENT CONTACTS - Emergency contacts
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
-- 3. MEDICAL HISTORY - Patient background
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
-- 4. CONSULTATIONS - Individual consultation records
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
-- 5. VITAL SIGNS - Patient vital measurements
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
-- 6. GLASGOW COMA SCALE - GCS Assessments
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
-- 7. CONSULTATION ATTACHMENTS - File uploads
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
-- 8. PATIENT MONITORING LOGS - Activity tracking
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
CREATE INDEX idx_patients_patient_id ON patients(patient_id);
CREATE INDEX idx_patients_type ON patients(patient_type);
CREATE INDEX idx_patients_status ON patients(status);
CREATE INDEX idx_consultations_case_number ON consultations(case_number);
CREATE INDEX idx_consultations_patient_id ON consultations(patient_id);
CREATE INDEX idx_consultations_date ON consultations(consultation_date);
CREATE INDEX idx_vital_signs_consultation_id ON vital_signs(consultation_id);
CREATE INDEX idx_gcs_consultation_id ON glasgow_coma_scales(consultation_id);
CREATE INDEX idx_medical_history_patient_id ON medical_history(patient_id);
CREATE INDEX idx_patient_contacts_patient_id ON patient_contacts(patient_id);

-- =============================================
-- FUNCTIONS for Auto-generation
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

-- Function to validate student level and year
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

-- =============================================
-- TRIGGERS for Auto-generation
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

-- =============================================
-- VIEWS for Common Queries
-- =============================================

-- View for patient summary with latest consultation
CREATE VIEW patient_summary AS
SELECT
    p.id,
    p.patient_id,
    p.first_name,
    p.last_name,
    p.age,
    p.sex,
    p.patient_type,
    p.course_department,
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
         p.patient_type, p.course_department, p.status,
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

-- Insert sample patient types and medical reference data
INSERT INTO patients (first_name, last_name, age, sex, civil_status, birthday, address, patient_type, course_department, student_level, year_level, phone, email, created_by) VALUES
('John', 'Doe', 21, 'Male', 'Single', '2002-05-15', '123 Main St, Rosario, Cavite', 'Student', 'Computer Science', 'college', 3, '09123456789', 'john.doe@cvsu.edu.ph', 1),
('Jane', 'Smith', 30, 'Female', 'Married', '1993-08-22', '456 Oak Ave, Rosario, Cavite', 'Employee', 'Nursing Department', NULL, NULL, '09987654321', 'jane.smith@cvsu.edu.ph', 1),
('Maria', 'Garcia', 17, 'Female', 'Single', '2006-12-10', '789 Pine St, Rosario, Cavite', 'Student', 'Science and Technology', 'highschool', 11, '09111222333', 'maria.garcia@cvsu.edu.ph', 1),
('Pedro', 'Santos', 19, 'Male', 'Single', '2004-03-08', '321 Elm St, Rosario, Cavite', 'Student', 'Engineering', 'college', 1, '09444555666', 'pedro.santos@cvsu.edu.ph', 1),
('Ana', 'Cruz', 16, 'Female', 'Single', '2007-09-20', '654 Maple Ave, Rosario, Cavite', 'Student', 'Arts and Sciences', 'highschool', 10, '09777888999', 'ana.cruz@cvsu.edu.ph', 1);

-- Notes for implementation:
-- 1. This schema supports the complete consultation form
-- 2. Includes proper relationships and constraints
-- 3. Auto-generates IDs and case numbers
-- 4. Includes indexes for performance
-- 5. Provides views for common queries
-- 6. Supports file attachments and activity logging
-- 7. Follows medical record best practices