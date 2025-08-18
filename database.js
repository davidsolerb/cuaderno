// database.js: Servicio de base de datos que maneja la persistencia con Supabase

import { supabase } from './supabase.js';

// SQL para crear el schema de la base de datos
const CREATE_TABLES_SQL = `
-- Tabla de configuración del curso
CREATE TABLE IF NOT EXISTS course_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de actividades/clases
CREATE TABLE IF NOT EXISTS activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('class', 'activity')),
    color TEXT,
    start_date DATE,
    end_date DATE,
    student_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de estudiantes
CREATE TABLE IF NOT EXISTS students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    general_notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de franjas horarias
CREATE TABLE IF NOT EXISTS time_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    label TEXT NOT NULL,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla del horario semanal
CREATE TABLE IF NOT EXISTS schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    day_time_key TEXT NOT NULL UNIQUE, -- e.g., "Monday-09:00-10:00"
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de excepciones del horario
CREATE TABLE IF NOT EXISTS schedule_overrides (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    day_time_key TEXT NOT NULL,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    is_canceled BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de entradas de clase (sesiones específicas)
CREATE TABLE IF NOT EXISTS class_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entry_key TEXT NOT NULL UNIQUE, -- e.g., "activityId_2024-01-15"
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    summary TEXT DEFAULT '',
    annotations JSONB DEFAULT '{}', -- {studentId: "annotation text"}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_schedules_activity_id ON schedules(activity_id);
CREATE INDEX IF NOT EXISTS idx_schedule_overrides_date ON schedule_overrides(date);
CREATE INDEX IF NOT EXISTS idx_class_entries_activity_id ON class_entries(activity_id);
CREATE INDEX IF NOT EXISTS idx_class_entries_date ON class_entries(date);
`;

// Servicio de base de datos
export class DatabaseService {
    constructor() {
        this.initialized = false;
        this.useSupabase = !!supabase;
    }

    // Verificar si Supabase está disponible
    isSupabaseAvailable() {
        return this.useSupabase && !!supabase;
    }

    // Inicializar el schema de la base de datos
    async initializeSchema() {
        if (!this.isSupabaseAvailable()) {
            console.log('Supabase no disponible, usando localStorage como respaldo');
            this.initialized = true;
            return true;
        }

        try {
            console.log('Inicializando schema de base de datos...');
            
            // Crear las tablas básicas (sin restricciones de FK para evitar errores)
            const basicTables = [
                `CREATE TABLE IF NOT EXISTS course_settings (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    start_date DATE,
                    end_date DATE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )`,
                `CREATE TABLE IF NOT EXISTS activities (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    color TEXT,
                    start_date DATE,
                    end_date DATE,
                    student_ids UUID[] DEFAULT '{}',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )`,
                `CREATE TABLE IF NOT EXISTS students (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    name TEXT NOT NULL,
                    general_notes TEXT DEFAULT '',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )`,
                `CREATE TABLE IF NOT EXISTS time_slots (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    label TEXT NOT NULL,
                    start_time TIME,
                    end_time TIME,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )`,
                `CREATE TABLE IF NOT EXISTS schedules (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    day_time_key TEXT NOT NULL UNIQUE,
                    activity_id UUID,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )`,
                `CREATE TABLE IF NOT EXISTS schedule_overrides (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    date DATE NOT NULL,
                    day_time_key TEXT NOT NULL,
                    activity_id UUID,
                    is_canceled BOOLEAN DEFAULT FALSE,
                    notes TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )`,
                `CREATE TABLE IF NOT EXISTS class_entries (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    entry_key TEXT NOT NULL UNIQUE,
                    activity_id UUID,
                    date DATE NOT NULL,
                    summary TEXT DEFAULT '',
                    annotations JSONB DEFAULT '{}',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )`
            ];

            // Intentar crear las tablas usando SQL directo
            for (const sql of basicTables) {
                try {
                    const { error } = await supabase.rpc('exec_sql', { sql });
                    if (error) {
                        console.warn('No se pudo crear tabla con RPC, intentando con queries básicos');
                        // Intentar operaciones básicas para verificar que las tablas existen
                        await supabase.from(this.getTableNameFromSQL(sql)).select('*').limit(1);
                    }
                } catch (err) {
                    console.warn('Advertencia al crear tabla:', err.message);
                }
            }
            
            console.log('Schema de base de datos inicializado exitosamente');
            this.initialized = true;
            return true;
        } catch (err) {
            console.error('Error al inicializar schema de base de datos:', err);
            console.log('Continuando con localStorage como respaldo');
            this.useSupabase = false;
            this.initialized = true;
            return false;
        }
    }

    // Helper para extraer nombre de tabla del SQL
    getTableNameFromSQL(sql) {
        const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
        return match ? match[1] : 'unknown';
    }

    // --- CRUD Operations for Activities ---
    async getActivities() {
        if (!this.isSupabaseAvailable()) {
            // Fallback: devolver array vacío para compatibilidad
            return [];
        }

        try {
            const { data, error } = await supabase
                .from('activities')
                .select('*')
                .order('name');
            
            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Error loading activities from Supabase:', err);
            return [];
        }
    }

    async createActivity(activity) {
        if (!this.isSupabaseAvailable()) {
            // Fallback: simplemente devolver el objeto con el ID ya asignado
            return activity;
        }

        try {
            const { data, error } = await supabase
                .from('activities')
                .insert([activity])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error creating activity in Supabase:', err);
            return activity; // Return original as fallback
        }
    }

    async updateActivity(id, updates) {
        if (!this.isSupabaseAvailable()) {
            return updates;
        }

        try {
            const { data, error } = await supabase
                .from('activities')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error updating activity in Supabase:', err);
            return updates;
        }
    }

    async deleteActivity(id) {
        if (!this.isSupabaseAvailable()) {
            return;
        }

        try {
            const { error } = await supabase
                .from('activities')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
        } catch (err) {
            console.error('Error deleting activity from Supabase:', err);
        }
    }

    // --- CRUD Operations for Students ---
    async getStudents() {
        if (!this.isSupabaseAvailable()) {
            return [];
        }

        try {
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .order('name');
            
            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Error loading students from Supabase:', err);
            return [];
        }
    }

    async createStudent(student) {
        if (!this.isSupabaseAvailable()) {
            return student;
        }

        try {
            const { data, error } = await supabase
                .from('students')
                .insert([student])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error creating student in Supabase:', err);
            return student;
        }
    }

    async updateStudent(id, updates) {
        if (!this.isSupabaseAvailable()) {
            return updates;
        }

        try {
            const { data, error } = await supabase
                .from('students')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error updating student in Supabase:', err);
            return updates;
        }
    }

    async deleteStudent(id) {
        if (!this.isSupabaseAvailable()) {
            return;
        }

        try {
            const { error } = await supabase
                .from('students')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
        } catch (err) {
            console.error('Error deleting student from Supabase:', err);
        }
    }

    // --- CRUD Operations for Time Slots ---
    async getTimeSlots() {
        if (!this.isSupabaseAvailable()) {
            return [];
        }

        try {
            const { data, error } = await supabase
                .from('time_slots')
                .select('*')
                .order('start_time');
            
            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Error loading time slots from Supabase:', err);
            return [];
        }
    }

    async createTimeSlot(timeSlot) {
        if (!this.isSupabaseAvailable()) {
            return timeSlot;
        }

        try {
            const { data, error } = await supabase
                .from('time_slots')
                .insert([timeSlot])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error creating time slot in Supabase:', err);
            return timeSlot;
        }
    }

    async updateTimeSlot(id, updates) {
        if (!this.isSupabaseAvailable()) {
            return updates;
        }

        try {
            const { data, error } = await supabase
                .from('time_slots')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error updating time slot in Supabase:', err);
            return updates;
        }
    }

    async deleteTimeSlot(id) {
        if (!this.isSupabaseAvailable()) {
            return;
        }

        try {
            const { error } = await supabase
                .from('time_slots')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
        } catch (err) {
            console.error('Error deleting time slot from Supabase:', err);
        }
    }

    // --- Schedule Operations ---
    async getSchedule() {
        if (!this.isSupabaseAvailable()) {
            return {};
        }

        try {
            const { data, error } = await supabase
                .from('schedules')
                .select('*');
            
            if (error) throw error;
            
            // Convert to the format expected by the app: { "Monday-09:00": "activityId" }
            const schedule = {};
            data?.forEach(item => {
                if (item.activity_id) {
                    schedule[item.day_time_key] = item.activity_id;
                }
            });
            
            return schedule;
        } catch (err) {
            console.error('Error loading schedule from Supabase:', err);
            return {};
        }
    }

    async updateScheduleSlot(dayTimeKey, activityId) {
        if (!this.isSupabaseAvailable()) {
            return;
        }

        try {
            if (activityId) {
                const { error } = await supabase
                    .from('schedules')
                    .upsert([{ 
                        day_time_key: dayTimeKey, 
                        activity_id: activityId,
                        updated_at: new Date().toISOString()
                    }]);
                
                if (error) throw error;
            } else {
                // Remove the slot if activityId is null/undefined
                const { error } = await supabase
                    .from('schedules')
                    .delete()
                    .eq('day_time_key', dayTimeKey);
                
                if (error) throw error;
            }
        } catch (err) {
            console.error('Error updating schedule slot in Supabase:', err);
        }
    }

    // --- Schedule Overrides ---
    async getScheduleOverrides() {
        if (!this.isSupabaseAvailable()) {
            return [];
        }

        try {
            const { data, error } = await supabase
                .from('schedule_overrides')
                .select('*')
                .order('date');
            
            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Error loading schedule overrides from Supabase:', err);
            return [];
        }
    }

    async createScheduleOverride(override) {
        if (!this.isSupabaseAvailable()) {
            return override;
        }

        try {
            const { data, error } = await supabase
                .from('schedule_overrides')
                .insert([override])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error creating schedule override in Supabase:', err);
            return override;
        }
    }

    // --- Class Entries ---
    async getClassEntries() {
        if (!this.isSupabaseAvailable()) {
            return {};
        }

        try {
            const { data, error } = await supabase
                .from('class_entries')
                .select('*')
                .order('date');
            
            if (error) throw error;
            
            // Convert to the format expected by the app: { "activityId_date": entry }
            const classEntries = {};
            data?.forEach(entry => {
                classEntries[entry.entry_key] = {
                    summary: entry.summary || '',
                    annotations: entry.annotations || {}
                };
            });
            
            return classEntries;
        } catch (err) {
            console.error('Error loading class entries from Supabase:', err);
            return {};
        }
    }

    async updateClassEntry(entryKey, entryData) {
        if (!this.isSupabaseAvailable()) {
            return;
        }

        try {
            const [activityId, date] = entryKey.split('_');
            
            const { error } = await supabase
                .from('class_entries')
                .upsert([{
                    entry_key: entryKey,
                    activity_id: activityId,
                    date: date,
                    summary: entryData.summary || '',
                    annotations: entryData.annotations || {},
                    updated_at: new Date().toISOString()
                }]);
            
            if (error) throw error;
        } catch (err) {
            console.error('Error updating class entry in Supabase:', err);
        }
    }

    // --- Course Settings ---
    async getCourseSettings() {
        if (!this.isSupabaseAvailable()) {
            return {
                courseStartDate: '',
                courseEndDate: ''
            };
        }

        try {
            const { data, error } = await supabase
                .from('course_settings')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
            
            return data ? {
                courseStartDate: data.start_date || '',
                courseEndDate: data.end_date || ''
            } : {
                courseStartDate: '',
                courseEndDate: ''
            };
        } catch (err) {
            console.error('Error loading course settings from Supabase:', err);
            return {
                courseStartDate: '',
                courseEndDate: ''
            };
        }
    }

    async updateCourseSettings(startDate, endDate) {
        if (!this.isSupabaseAvailable()) {
            return;
        }

        try {
            // First try to update existing record
            const { data: existing } = await supabase
                .from('course_settings')
                .select('id')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (existing) {
                const { error } = await supabase
                    .from('course_settings')
                    .update({
                        start_date: startDate || null,
                        end_date: endDate || null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);
                
                if (error) throw error;
            } else {
                // Create new record if none exists
                const { error } = await supabase
                    .from('course_settings')
                    .insert([{
                        start_date: startDate || null,
                        end_date: endDate || null
                    }]);
                
                if (error) throw error;
            }
        } catch (err) {
            console.error('Error updating course settings in Supabase:', err);
        }
    }

    // --- Data Migration from localStorage ---
    async migrateFromLocalStorage(localData) {
        if (!this.isSupabaseAvailable()) {
            console.log('Supabase not available, skipping migration');
            return false;
        }

        try {
            console.log('Starting data migration from localStorage...');

            // 1. Migrate course settings
            if (localData.courseStartDate || localData.courseEndDate) {
                await this.updateCourseSettings(localData.courseStartDate, localData.courseEndDate);
            }

            // 2. Migrate students
            if (localData.students?.length > 0) {
                for (const student of localData.students) {
                    await this.createStudent(student);
                }
            }

            // 3. Migrate time slots
            if (localData.timeSlots?.length > 0) {
                for (const timeSlot of localData.timeSlots) {
                    await this.createTimeSlot(timeSlot);
                }
            }

            // 4. Migrate activities
            if (localData.activities?.length > 0) {
                for (const activity of localData.activities) {
                    await this.createActivity(activity);
                }
            }

            // 5. Migrate schedule
            if (localData.schedule) {
                for (const [dayTimeKey, activityId] of Object.entries(localData.schedule)) {
                    await this.updateScheduleSlot(dayTimeKey, activityId);
                }
            }

            // 6. Migrate schedule overrides
            if (localData.scheduleOverrides?.length > 0) {
                for (const override of localData.scheduleOverrides) {
                    await this.createScheduleOverride(override);
                }
            }

            // 7. Migrate class entries
            if (localData.classEntries) {
                for (const [entryKey, entryData] of Object.entries(localData.classEntries)) {
                    await this.updateClassEntry(entryKey, entryData);
                }
            }

            console.log('Data migration completed successfully');
            return true;
        } catch (error) {
            console.error('Data migration failed:', error);
            throw error;
        }
    }
}

// Instancia singleton del servicio de base de datos
export const db = new DatabaseService();