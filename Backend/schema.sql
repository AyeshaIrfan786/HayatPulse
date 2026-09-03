CREATE DATABASE IF NOT EXISTS hayatpulse_db;
USE hayatpulse_db;

-- 1. Hospitals & ICU Bed Tracking Table
CREATE TABLE IF NOT EXISTS hospitals (
    hospital_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) DEFAULT 'Karachi',
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    total_beds INT NOT NULL,
    available_icus INT NOT NULL,
    ventilators_available INT NOT NULL,
    contact_number VARCHAR(20),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Emergency Requests & Dispatch Logs Table
CREATE TABLE IF NOT EXISTS emergency_logs (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_name VARCHAR(150),
    location_lat DECIMAL(10, 8) NOT NULL,
    location_long DECIMAL(11, 8) NOT NULL,
    triage_urgency_level INT DEFAULT 1, -- Level 1 (Critical) to Level 5 (Low)
    assigned_hospital_id INT,
    status ENUM('PENDING', 'DISPATCHED', 'RESOLVED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_hospital_id) REFERENCES hospitals(hospital_id) ON DELETE SET NULL
);

-- 3. Patient Medical & OCR Prescription Verification Table
CREATE TABLE IF NOT EXISTS medical_records (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_name VARCHAR(150) NOT NULL,
    diagnosis_notes TEXT,
    prescription_image_path VARCHAR(255),
    is_authentic_prescription BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Dummy Data for Hospital Bed Router Testing
INSERT INTO hospitals (name, city, latitude, longitude, total_beds, available_icus, ventilators_available, contact_number) 
VALUES 
('Civil Hospital Emergency Unit', 'Karachi', 24.8597, 67.0108, 120, 4, 2, '+9221111222333'),
('Aga Khan University Hospital', 'Karachi', 24.8923, 67.0747, 200, 12, 8, '+922134869189'),
('Jinnah Post Graduate Medical Centre (JPMC)', 'Karachi', 24.8528, 67.0450, 180, 0, 1, '+922199201300');