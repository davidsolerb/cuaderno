// state.js: Gestiona el estado global y la persistencia de datos con Supabase.

import { db } from './database.js';

const pastelColors = ['#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF'];

// El estado central de la aplicación.
export const state = {
    activeView: 'schedule',
    activities: [],
    students: [],
    timeSlots: [],
    schedule: {},
    scheduleOverrides: [],
    classEntries: {},
    currentDate: new Date(),
    courseStartDate: '',
    courseEndDate: '',
    selectedActivity: null,
    selectedStudentId: null,
    editingTimeSlotId: null,
    editingActivityId: null,
    isLoading: false,
    isOnline: true,
};

export function setOnlineStatus(isOnline) {
    state.isOnline = isOnline;
    document.dispatchEvent(new CustomEvent('online-status', { detail: isOnline }));
}

export function getRandomPastelColor() {
    const usedColors = state.activities.map(a => a.color);
    const availableColors = pastelColors.filter(c => !usedColors.includes(c));
    return availableColors.length > 0 ? availableColors[0] : pastelColors[Math.floor(Math.random() * pastelColors.length)];
}

let saveTimeout;
let savingIndicator = false;

// Función para mostrar el indicador de guardado
function showSaveIndicator() {
    if (savingIndicator) return;
    savingIndicator = true;
    
    const indicator = document.getElementById('save-indicator');
    if (indicator) {
        indicator.classList.add('show');
        if (window.lucide) {
            lucide.createIcons({
                nodes: [indicator.querySelector('i')]
            });
        }
    }
}

// Función para ocultar el indicador de guardado
function hideSaveIndicator() {
    savingIndicator = false;
    const indicator = document.getElementById('save-indicator');
    if (indicator) {
        indicator.classList.remove('show');
    }
}

// Función para guardar el estado completo en Supabase
export async function saveState() {
    if (state.isLoading) return; // No guardar mientras se está cargando
    
    try {
        showSaveIndicator();
        
        // Preparar datos para guardar
        const savePromises = [];
        
        // Guardar configuración del curso
        if (state.courseStartDate || state.courseEndDate) {
            savePromises.push(db.updateCourseSettings(state.courseStartDate, state.courseEndDate));
        }
        
        // Nota: Las actividades, estudiantes, timeSlots, etc. se guardan individualmente
        // cuando se crean/modifican, así que no necesitamos guardarlos todos aquí.
        // Solo guardamos el schedule y classEntries que cambian frecuentemente.
        
        // Guardar horario
        const currentSchedule = await db.getSchedule();
        const schedulePromises = [];
        
        // Actualizar slots que han cambiado
        for (const [dayTimeKey, activityId] of Object.entries(state.schedule)) {
            if (currentSchedule[dayTimeKey] !== activityId) {
                schedulePromises.push(db.updateScheduleSlot(dayTimeKey, activityId));
            }
        }
        
        // Remover slots que ya no existen
        for (const dayTimeKey of Object.keys(currentSchedule)) {
            if (!(dayTimeKey in state.schedule)) {
                schedulePromises.push(db.updateScheduleSlot(dayTimeKey, null));
            }
        }
        
        savePromises.push(...schedulePromises);
        
        // Guardar entradas de clase
        const classEntryPromises = [];
        for (const [entryKey, entryData] of Object.entries(state.classEntries)) {
            classEntryPromises.push(db.updateClassEntry(entryKey, entryData));
        }
        savePromises.push(...classEntryPromises);
        
        // Ejecutar todas las operaciones de guardado
        await Promise.all(savePromises);
        
        // También mantener en localStorage como respaldo
        const dataToSave = {
            activities: state.activities,
            students: state.students,
            timeSlots: state.timeSlots,
            schedule: state.schedule,
            scheduleOverrides: state.scheduleOverrides,
            classEntries: state.classEntries,
            courseStartDate: state.courseStartDate,
            courseEndDate: state.courseEndDate,
        };
        localStorage.setItem('teacherDashboardData', JSON.stringify(dataToSave));
        
        // Ocultar indicador después de un delay
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            hideSaveIndicator();
        }, 1500);
        
    } catch (error) {
        console.error('Error saving to Supabase:', error);
        hideSaveIndicator();
        
        // Fallback a localStorage si Supabase falla
        const dataToSave = {
            activities: state.activities,
            students: state.students,
            timeSlots: state.timeSlots,
            schedule: state.schedule,
            scheduleOverrides: state.scheduleOverrides,
            classEntries: state.classEntries,
            courseStartDate: state.courseStartDate,
            courseEndDate: state.courseEndDate,
        };
        localStorage.setItem('teacherDashboardData', JSON.stringify(dataToSave));
        setOnlineStatus(false);
    }
}

// Función para cargar el estado desde Supabase
export async function loadState() {
    try {
        state.isLoading = true;
        showSaveIndicator();
        
        // Inicializar el schema de la base de datos si es necesario
        await db.initializeSchema();
        
        // Intentar cargar desde Supabase
        const [
            activities,
            students,
            timeSlots,
            schedule,
            scheduleOverrides,
            classEntries,
            courseSettings
        ] = await Promise.all([
            db.getActivities(),
            db.getStudents(),
            db.getTimeSlots(),
            db.getSchedule(),
            db.getScheduleOverrides(),
            db.getClassEntries(),
            db.getCourseSettings()
        ]);
        
        // Actualizar el estado con los datos de Supabase
        state.activities = activities || [];
        state.students = students || [];
        state.timeSlots = timeSlots || [];
        state.schedule = schedule || {};
        state.scheduleOverrides = scheduleOverrides || [];
        state.classEntries = classEntries || {};
        state.courseStartDate = courseSettings.courseStartDate || '';
        state.courseEndDate = courseSettings.courseEndDate || '';
        setOnlineStatus(true);
        
        console.log('State loaded from Supabase successfully');
        
        // Si no hay datos en Supabase, intentar migrar desde localStorage
        const hasData = activities.length > 0 || students.length > 0 || timeSlots.length > 0 || Object.keys(schedule).length > 0;
        
        if (!hasData) {
            await migrateFromLocalStorage();
        }
        
    } catch (error) {
        console.error('Error loading from Supabase:', error);
        setOnlineStatus(false);
        
        // Fallback: cargar desde localStorage
        await loadFromLocalStorage();
    } finally {
        state.isLoading = false;
        hideSaveIndicator();
    }
}

// Función auxiliar para cargar desde localStorage (fallback)
async function loadFromLocalStorage() {
    const savedData = localStorage.getItem('teacherDashboardData');
    if (savedData) {
        const parsedData = JSON.parse(savedData);
        state.activities = parsedData.activities || [];
        state.students = parsedData.students || [];
        state.timeSlots = parsedData.timeSlots || [];
        state.schedule = parsedData.schedule || {};
        state.scheduleOverrides = parsedData.scheduleOverrides || [];
        state.classEntries = parsedData.classEntries || {};
        state.courseStartDate = parsedData.courseStartDate || '';
        state.courseEndDate = parsedData.courseEndDate || '';
        console.log('State loaded from localStorage (fallback)');
    }
}

// Función para migrar datos desde localStorage a Supabase
async function migrateFromLocalStorage() {
    const savedData = localStorage.getItem('teacherDashboardData');
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            console.log('Migrating data from localStorage to Supabase...');
            
            await db.migrateFromLocalStorage(parsedData);
            
            // Recargar el estado desde Supabase después de la migración
            const [
                activities,
                students,
                timeSlots,
                schedule,
                scheduleOverrides,
                classEntries,
                courseSettings
            ] = await Promise.all([
                db.getActivities(),
                db.getStudents(),
                db.getTimeSlots(),
                db.getSchedule(),
                db.getScheduleOverrides(),
                db.getClassEntries(),
                db.getCourseSettings()
            ]);
            
            state.activities = activities || [];
            state.students = students || [];
            state.timeSlots = timeSlots || [];
            state.schedule = schedule || {};
            state.scheduleOverrides = scheduleOverrides || [];
            state.classEntries = classEntries || {};
            state.courseStartDate = courseSettings.courseStartDate || '';
            state.courseEndDate = courseSettings.courseEndDate || '';
            
            console.log('Migration completed successfully');
        } catch (error) {
            console.error('Migration failed:', error);
            // Si la migración falla, usar los datos de localStorage
            await loadFromLocalStorage();
        }
    }
}

// Funciones específicas para guardar entidades individuales
export async function saveActivity(activity) {
    try {
        if (activity.id) {
            // Actualizar actividad existente
            await db.updateActivity(activity.id, activity);
        } else {
            // Crear nueva actividad
            const newActivity = await db.createActivity(activity);
            // Actualizar el estado local con el ID generado
            const index = state.activities.findIndex(a => a === activity);
            if (index >= 0) {
                state.activities[index] = newActivity;
            }
        }
    } catch (error) {
        console.error('Error saving activity:', error);
    }
}

export async function saveStudent(student) {
    try {
        if (student.id) {
            await db.updateStudent(student.id, student);
        } else {
            const newStudent = await db.createStudent(student);
            const index = state.students.findIndex(s => s === student);
            if (index >= 0) {
                state.students[index] = newStudent;
            }
        }
    } catch (error) {
        console.error('Error saving student:', error);
    }
}

export async function saveTimeSlot(timeSlot) {
    try {
        if (timeSlot.id) {
            await db.updateTimeSlot(timeSlot.id, timeSlot);
        } else {
            const newTimeSlot = await db.createTimeSlot(timeSlot);
            const index = state.timeSlots.findIndex(t => t === timeSlot);
            if (index >= 0) {
                state.timeSlots[index] = newTimeSlot;
            }
        }
    } catch (error) {
        console.error('Error saving time slot:', error);
    }
}

export async function deleteActivity(activityId) {
    try {
        await db.deleteActivity(activityId);
        state.activities = state.activities.filter(a => a.id !== activityId);
    } catch (error) {
        console.error('Error deleting activity:', error);
    }
}

export async function deleteStudent(studentId) {
    try {
        await db.deleteStudent(studentId);
        state.students = state.students.filter(s => s.id !== studentId);
    } catch (error) {
        console.error('Error deleting student:', error);
    }
}

export async function deleteTimeSlot(timeSlotId) {
    try {
        await db.deleteTimeSlot(timeSlotId);
        state.timeSlots = state.timeSlots.filter(t => t.id !== timeSlotId);
    } catch (error) {
        console.error('Error deleting time slot:', error);
    }
}
