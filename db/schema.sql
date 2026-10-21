CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS equipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(150) NOT NULL,
  manufacturer VARCHAR(150) NOT NULL,
  model VARCHAR(200) NOT NULL,
  serial_number VARCHAR(200),
  bureau VARCHAR(200) NOT NULL,
  department VARCHAR(200) NOT NULL,
  user_name VARCHAR(200) NOT NULL,
  status VARCHAR(40) NOT NULL,
  os_name VARCHAR(150),
  ip_address VARCHAR(50),
  acquisition_value VARCHAR(80),
  date_affectation DATE,
  last_audit DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipments_code ON equipments (code);
CREATE INDEX IF NOT EXISTS idx_equipments_department ON equipments (department);
CREATE INDEX IF NOT EXISTS idx_equipments_status ON equipments (status);
