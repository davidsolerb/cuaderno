-- schema.sql: Script manual para crear las tablas necesarias en Supabase

-- Tabla de actividades/clases
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('class','activity')),
  color text,
  "startDate" date,
  "endDate" date,
  "studentIds" uuid[] DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- Tabla de estudiantes
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  "generalNotes" text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

-- Tabla de franjas horarias
CREATE TABLE IF NOT EXISTS time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  "order" int,
  updated_at timestamptz DEFAULT now()
);

-- Tabla del horario semanal
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_time_key text NOT NULL UNIQUE,
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  updated_at timestamptz DEFAULT now()
);

-- Tabla de excepciones del horario
CREATE TABLE IF NOT EXISTS schedule_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day date NOT NULL,
  time text NOT NULL,
  "activityId" uuid REFERENCES activities(id) ON DELETE CASCADE,
  "startDate" date,
  "endDate" date
);

-- Tabla de entradas de clase
CREATE TABLE IF NOT EXISTS class_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_key text NOT NULL UNIQUE,
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  date date NOT NULL,
  summary text DEFAULT '',
  annotations jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- Tabla de configuración del curso
CREATE TABLE IF NOT EXISTS course_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date date,
  end_date date,
  updated_at timestamptz DEFAULT now()
);

-- Índices opcionales
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_schedules_activity_id ON schedules(activity_id);
CREATE INDEX IF NOT EXISTS idx_schedule_overrides_activityId ON schedule_overrides("activityId");
CREATE INDEX IF NOT EXISTS idx_class_entries_activity_id ON class_entries(activity_id);
CREATE INDEX IF NOT EXISTS idx_class_entries_date ON class_entries(date);
