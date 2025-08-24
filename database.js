// database.js: Servicio de base de datos que maneja la persistencia con Supabase

import { supabase } from './supabase.js';


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

    // Inicializar/verificar la disponibilidad del schema de la base de datos
    async initializeSchema() {
        if (!this.isSupabaseAvailable()) {
            console.log('Supabase no disponible, usando localStorage como respaldo');
            this.initialized = true;
            return false;
        }

        try {
            // Realiza una consulta ligera para comprobar que las tablas existen
            await supabase.from('activities').select('id').limit(1);
            console.log('Schema de base de datos verificado (consulta manual necesaria: schema.sql)');
            this.initialized = true;
            return true;
        } catch (err) {
            console.error('Error verificando schema de base de datos:', err);
            console.log('Continuando con localStorage como respaldo');
            this.useSupabase = false;
            this.initialized = true;
            return false;
        }
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