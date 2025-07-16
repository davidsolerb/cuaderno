// views.js: Contiene todas las funciones que generan el HTML de las vistas.

import { state } from './state.js';
import { darkenColor, getWeekStartDate, getWeekDateRange, formatDate, isSameDate, findNextSession, findPreviousSession } from './utils.js';
import { t } from './i18n.js'; // Importamos la función de traducción

export function renderScheduleView() {
    const days = [t('monday'), t('tuesday'), t('wednesday'), t('thursday'), t('friday')];
    const getActivityById = (id) => state.activities.find(c => c.id === id);
    const startOfWeek = getWeekStartDate(state.currentDate);
    const today = new Date();
    
    const headerCells = days.map((dayName, dayIndex) => {
        const cellDate = new Date(startOfWeek);
        cellDate.setDate(startOfWeek.getDate() + dayIndex);
        const isToday = isSameDate(cellDate, today);
        const formattedDate = cellDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        return `<th class="p-2 border ${isToday ? 'bg-blue-100' : ''}">
                    <div>${dayName}</div>
                    <div class="text-xs font-normal text-gray-500">${formattedDate}</div>
                </th>`;
    }).join('');

    const tableRows = state.timeSlots.map(time => {
        const dayKeys = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]; // Se usan las claves en español para buscar en el state.schedule
        const cells = dayKeys.map((dayKey, dayIndex) => {
            const cellDate = new Date(startOfWeek);
            cellDate.setDate(startOfWeek.getDate() + dayIndex);
            const formattedCellDate = formatDate(cellDate);
            const isToday = isSameDate(cellDate, today);

            let activityId = state.schedule[`${dayKey}-${time.label}`];

            const applicableOverride = state.scheduleOverrides.find(ov => {
                if (ov.day === dayKey && ov.time === time.label) {
                    const overrideStart = new Date(ov.startDate + 'T00:00:00');
                    const overrideEnd = new Date(ov.endDate + 'T23:59:59');
                    return cellDate >= overrideStart && cellDate <= overrideEnd;
                }
                return false;
            });

            if (applicableOverride) {
                activityId = applicableOverride.activityId;
            }
            
            const activityInfo = activityId ? getActivityById(activityId) : null;
            let cellContent = `<div class="p-2 h-full min-h-[40px]"></div>`;
            
            if (activityInfo) {
                const courseStartDate = state.courseStartDate ? new Date(state.courseStartDate + 'T00:00:00') : null;
                const courseEndDate = state.courseEndDate ? new Date(state.courseEndDate + 'T23:59:59') : null;
                const activityStartDate = activityInfo.startDate ? new Date(activityInfo.startDate + 'T00:00:00') : courseStartDate;
                const activityEndDate = activityInfo.endDate ? new Date(activityInfo.endDate + 'T23:59:59') : courseEndDate;

                let inDateRange = true;
                if (courseStartDate && cellDate < courseStartDate) inDateRange = false;
                if (courseEndDate && cellDate > courseEndDate) inDateRange = false;
                if (activityStartDate && cellDate < activityStartDate) inDateRange = false;
                if (activityEndDate && cellDate > activityEndDate) inDateRange = false;

                if (inDateRange) {
                    const entryId = `${activityInfo.id}_${formattedCellDate}`;
                    const hasPlan = state.classEntries[entryId] && state.classEntries[entryId].planned;
                    const planIndicator = hasPlan ? `<span class="absolute top-1 right-1 text-xs">📝</span>` : '';

                    const style = `background-color: ${activityInfo.color}; color: ${darkenColor(activityInfo.color, 40)}; border: 1px solid ${darkenColor(activityInfo.color, 10)}`;
                    if (activityInfo.type === 'class') {
                        cellContent = `<button data-action="select-activity" data-activity-id='${activityInfo.id}' data-day='${dayKey}' data-time='${time.label}' data-date='${formattedCellDate}' class="relative w-full h-full p-2 rounded-md transition-colors text-sm font-semibold" style="${style}">${activityInfo.name}${planIndicator}</button>`;
                    } else {
                        cellContent = `<div class="w-full h-full p-2 rounded-md text-sm font-semibold flex items-center justify-center" style="${style}">${activityInfo.name}</div>`;
                    }
                }
            }
            return `<td class="p-1 border ${isToday ? 'bg-blue-50' : ''}">${cellContent}</td>`;
        }).join('');
        return `<tr><td class="p-2 border font-mono bg-gray-50 text-sm">${time.label}</td>${cells}</tr>`;
    }).join('');

    return `
        <div class="p-6 bg-gray-50 min-h-full">
            <div class="flex justify-between items-center mb-6 no-print">
                 <h2 class="text-2xl font-bold text-gray-800">${t('schedule_view_title')}</h2>
                 <div class="flex items-center gap-4">
                    <button data-action="prev-week" class="p-2 rounded-md hover:bg-gray-200"><i data-lucide="chevron-left"></i></button>
                    <span class="font-semibold text-lg">${getWeekDateRange(state.currentDate)}</span>
                    <button data-action="next-week" class="p-2 rounded-md hover:bg-gray-200"><i data-lucide="chevron-right"></i></button>
                    <button data-action="today" class="bg-gray-600 text-white px-3 py-2 text-sm rounded-md hover:bg-gray-700">${t('today')}</button>
                    <button data-action="print-schedule" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2">
                        <i data-lucide="printer" class="w-5 h-5"></i> ${t('print')}
                    </button>
                 </div>
            </div>
            <div id="printable-schedule" class="printable-area">
                <h2 class="text-2xl font-bold text-gray-800 mb-6 hidden print:block text-center">${t('schedule_view_title')} - ${getWeekDateRange(state.currentDate)}</h2>
                <div class="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
                    <table class="w-full border-collapse text-center">
                        <thead><tr class="bg-gray-100"><th class="p-2 border w-24">${t('hour')}</th>${headerCells}</tr></thead>
                        <tbody>${tableRows.length > 0 ? tableRows : `<tr><td colspan="6" class="p-4 text-gray-500">${t('add_timeslots_in_settings')}</td></tr>`}</tbody>
                    </table>
                </div>
            </div>
        </div>`;
}

export function renderClassesView() {
    const classes = state.activities.filter(a => a.type === 'class');
    if (classes.length === 0) {
        return `<div class="p-6"><h2 class="text-2xl font-bold text-gray-800 mb-6">${t('classes_view_title')}</h2><p class="text-gray-500">${t('no_classes_created')}</p></div>`;
    }

    const classesHtml = classes.map(c => {
        const studentsOfClass = state.students.filter(s => c.studentIds?.includes(s.id));
        const studentsHtml = studentsOfClass.map(s => `
            <div class="flex justify-between items-center p-2 bg-gray-100 rounded-md">
                <button data-action="select-student" data-student-id="${s.id}" class="text-left font-medium text-blue-600 hover:underline flex-grow">${s.name}</button>
                <button data-action="remove-student-from-class" data-activity-id="${c.id}" data-student-id="${s.id}" class="text-red-500 hover:text-red-700 ml-4 flex-shrink-0"><i data-lucide="x" class="w-4 h-4"></i></button>
            </div>
        `).join('');

        return `
        <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-xl font-bold text-gray-800 mb-4" style="color: ${darkenColor(c.color, 40)}">${c.name}</h3>
            <div class="space-y-2 mb-4">
                ${studentsHtml || `<p class="text-sm text-gray-500">${t('no_students_in_class')}</p>`}
            </div>
            <div class="flex gap-2 border-t pt-4">
                <input type="text" id="new-student-name-${c.id}" placeholder="${t('add_student_placeholder')}" class="flex-grow p-2 border rounded-md">
                <button data-action="add-student-to-class" data-activity-id="${c.id}" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"><i data-lucide="plus" class="w-5 h-5"></i></button>
            </div>
        </div>
        `;
    }).join('');

    return `
        <div class="p-6 bg-gray-50 min-h-full">
            <h2 class="text-2xl font-bold text-gray-800 mb-6">${t('classes_view_title')}</h2>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${classesHtml}
            </div>
        </div>
    `;
}

export function renderStudentDetailView() {
    const student = state.students.find(s => s.id === state.selectedStudentId);
    if (!student) {
        return `<div class="p-6"><p class="text-red-500">${t('student_not_found')}</p><button data-action="back-to-classes">${t('back')}</button></div>`;
    }

    const enrolledClasses = state.activities.filter(a => a.type === 'class' && a.studentIds?.includes(student.id));

    const classesHtml = enrolledClasses.length > 0 
        ? enrolledClasses.map(c => `
            <li class="flex items-center gap-2 p-2 bg-gray-100 rounded-md">
                <span class="w-4 h-4 rounded-full" style="background-color: ${c.color};"></span>
                <span>${c.name}</span>
            </li>
        `).join('')
        : `<p class="text-gray-500">${t('student_not_in_classes')}</p>`;
    
    const studentAnnotations = Object.entries(state.classEntries)
        .map(([entryId, entryData]) => {
            const annotation = entryData.annotations?.[student.id];
            if (annotation && annotation.trim() !== '') {
                const [activityId, date] = entryId.split('_');
                const activity = state.activities.find(a => a.id === activityId);
                return {
                    entryId,
                    date,
                    activityName: activity ? activity.name : 'Clase eliminada',
                    activityColor: activity ? activity.color : '#cccccc',
                    annotation
                };
            }
            return null;
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    const annotationsHistoryHtml = studentAnnotations.length > 0
        ? studentAnnotations.map(item => `
            <div class="p-3 bg-gray-50 rounded-lg">
                <div class="flex items-center gap-2 mb-2 text-sm font-medium">
                    <span class="w-3 h-3 rounded-full" style="background-color: ${item.activityColor};"></span>
                    <span>${item.activityName}</span>
                    <span class="text-gray-500 font-normal">- ${new Date(item.date + 'T00:00:00').toLocaleDateString(document.documentElement.lang, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <textarea data-action="edit-session-annotation" data-entry-id="${item.entryId}" data-student-id="${student.id}" class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 h-24">${item.annotation}</textarea>
            </div>
        `).join('')
        : `<p class="text-gray-500">${t('no_session_notes')}</p>`;

    return `
        <div class="p-6 bg-gray-50 min-h-full">
            <div class="flex justify-between items-center mb-6 no-print">
                <h2 class="text-2xl font-bold text-gray-800">${t('student_detail_view_title')}</h2>
                <div class="flex items-center gap-2">
                     <button data-action="print-student-sheet" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2">
                        <i data-lucide="printer"></i> ${t('print')}
                    </button>
                    <button data-action="back-to-classes" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 flex items-center gap-2">
                        <i data-lucide="arrow-left"></i> ${t('back')}
                    </button>
                </div>
            </div>
            <div id="student-sheet-content" class="printable-area bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
                <h2 class="text-2xl font-bold text-gray-800 mb-6 print:block hidden">${student.name}</h2>
                <div class="space-y-6">
                    <div>
                        <label for="edit-student-name" class="block text-sm font-medium text-gray-700">${t('student_name_label')}</label>
                        <input type="text" id="edit-student-name" data-action="edit-student-name" data-student-id="${student.id}" value="${student.name}" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <h3 class="text-lg font-medium text-gray-900 mb-2">${t('enrolled_classes_title')}</h3>
                        <ul class="space-y-2">${classesHtml}</ul>
                    </div>
                    <div>
                        <label for="edit-student-notes" class="block text-sm font-medium text-gray-700">${t('general_notes_label')}</label>
                        <textarea id="edit-student-notes" data-action="edit-student-notes" data-student-id="${student.id}" placeholder="${t('general_notes_placeholder')}" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 h-32">${student.generalNotes || ''}</textarea>
                    </div>
                    <div class="border-t pt-6">
                        <h3 class="text-lg font-medium text-gray-900 mb-3">${t('session_notes_history_title')}</h3>
                        <div class="space-y-4 max-h-[400px] overflow-y-auto pr-2">${annotationsHistoryHtml}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function renderSettingsView() {
     const activitiesHtml = state.activities.map(act => {
        let studentsInClassHtml = '';
        if (act.type === 'class') {
            const enrolledStudents = state.students.filter(s => act.studentIds?.includes(s.id));
            const enrolledStudentsHtml = enrolledStudents.map(student => `
                <div class="flex items-center justify-between bg-gray-100 p-2 rounded-md text-sm">
                    <button data-action="select-student" data-student-id="${student.id}" class="text-left font-medium text-blue-600 hover:underline flex-grow">${student.name}</button>
                    <button data-action="remove-student-from-class" data-activity-id="${act.id}" data-student-id="${student.id}" class="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"><i data-lucide="x" class="w-4 h-4"></i></button>
                </div>
            `).join('');

            const availableStudents = state.students.filter(s => !act.studentIds?.includes(s.id));
            const availableStudentsOptions = availableStudents.map(student => `<option value="${student.id}">${student.name}</option>`).join('');

            studentsInClassHtml = `
                <div class="mt-3 space-y-3">
                    <div>
                        <h4 class="text-sm font-medium mb-2">${t('students_in_this_class')}</h4>
                        <div class="space-y-2">
                            ${enrolledStudents.length > 0 ? enrolledStudentsHtml : `<p class="text-xs text-gray-500">${t('no_students_assigned_short')}</p>`}
                        </div>
                    </div>
                    <div class="border-t pt-3">
                        <h4 class="text-sm font-medium mb-2">${t('add_existing_student')}</h4>
                        <div class="flex gap-2">
                            <select id="add-student-select-${act.id}" class="flex-grow p-2 border rounded-md text-sm bg-white">
                                <option value="">${t('select_student')}</option>
                                ${availableStudentsOptions}
                            </select>
                            <button data-action="add-selected-student-to-class" data-activity-id="${act.id}" class="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 flex-shrink-0"><i data-lucide="plus" class="w-5 h-5"></i></button>
                        </div>
                    </div>
                </div>
            `;
        }

        if (state.editingActivityId === act.id) {
            return `
            <div class="p-4 border rounded-md bg-white border-blue-500">
                <div class="flex justify-between items-center">
                    <input type="color" data-action="change-activity-color" data-id="${act.id}" value="${act.color}" class="p-0 border-none rounded-full cursor-pointer w-7 h-7">
                    <input type="text" id="edit-activity-name-${act.id}" value="${act.name}" class="flex-grow p-1 mx-2 border-0 rounded-md focus:ring-0 font-semibold">
                    <div class="flex items-center gap-2">
                        <button data-action="save-activity" data-id="${act.id}" class="text-green-600 hover:text-green-800"><i data-lucide="check" class="w-5 h-5"></i></button>
                        <button data-action="cancel-edit-activity" class="text-red-600 hover:text-red-800"><i data-lucide="x" class="w-5 h-5"></i></button>
                    </div>
                </div>
                <div class="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <label class="block font-medium text-gray-600">${t('start_date')}</label>
                        <input type="date" id="edit-activity-start-${act.id}" value="${act.startDate || ''}" class="w-full p-1 border rounded-md">
                    </div>
                    <div>
                        <label class="block font-medium text-gray-600">${t('end_date')}</label>
                        <input type="date" id="edit-activity-end-${act.id}" value="${act.endDate || ''}" class="w-full p-1 border rounded-md">
                    </div>
                </div>
                ${studentsInClassHtml}
            </div>`;
        }
        return `
        <div class="p-4 border rounded-md">
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-2 flex-grow">
                   <input type="color" data-action="change-activity-color" data-id="${act.id}" value="${act.color}" class="p-0 border-none rounded-full cursor-pointer w-7 h-7">
                   <span class="font-semibold cursor-pointer" data-action="edit-activity" data-id="${act.id}">${act.name} <span class="text-xs text-gray-500 font-normal">(${act.type === 'class' ? t('class') : t('general')})</span></span>
                </div>
                <button data-action="delete-activity" data-id="${act.id}" class="text-red-500 hover:text-red-700 ml-2"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
            </div>
            ${studentsInClassHtml}
        </div>`;
    }).join('');

    const timeSlotsHtml = state.timeSlots.map((slot, index) => {
        if (state.editingTimeSlotId === slot.id) {
            return `
            <div class="flex justify-between items-center bg-white p-2 rounded-md border border-blue-500">
                <input type="text" data-action="edit-timeslot-input" value="${slot.label}" class="flex-grow p-1 border-0 rounded-md focus:ring-0">
                <div class="flex items-center gap-2">
                    <button data-action="save-timeslot" data-id="${slot.id}" class="text-green-600 hover:text-green-800"><i data-lucide="check" class="w-5 h-5"></i></button>
                    <button data-action="cancel-edit-timeslot" class="text-red-600 hover:text-red-800"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>
            </div>`;
        }
        return `
            <div class="flex justify-between items-center bg-gray-100 p-2 rounded-md">
                <span class="flex-grow cursor-pointer" data-action="edit-timeslot" data-id="${slot.id}">${slot.label}</span>
                <div class="flex items-center gap-2">
                    <button data-action="reorder-timeslot" data-index="${index}" data-direction="up" ${index === 0 ? 'disabled' : ''} class="disabled:opacity-25 disabled:cursor-not-allowed text-gray-600 hover:text-gray-900"><i data-lucide="chevron-up" class="w-5 h-5"></i></button>
                    <button data-action="reorder-timeslot" data-index="${index}" data-direction="down" ${index === state.timeSlots.length - 1 ? 'disabled' : ''} class="disabled:opacity-25 disabled:cursor-not-allowed text-gray-600 hover:text-gray-900"><i data-lucide="chevron-down" class="w-5 h-5"></i></button>
                    <button data-action="delete-timeslot" data-id="${slot.id}" class="text-red-500 hover:text-red-700"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </div>`;
    }).join('');
    
    const dayKeys = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
    const scheduleTableRows = state.timeSlots.map(time => {
        const cells = dayKeys.map(day => `
            <td class="p-1 border">
                <select data-action="schedule-change" data-day="${day}" data-time="${time.label}" class="w-full p-1 border-0 rounded-md focus:ring-1 focus:ring-blue-500 text-xs">
                    <option value="">${t('free')}</option>
                    ${state.activities.map(act => `<option value="${act.id}" ${state.schedule[`${day}-${time.label}`] === act.id ? 'selected' : ''}>${act.name}</option>`).join('')}
                </select>
            </td>
        `).join('');
        return `<tr><td class="p-2 border font-mono bg-gray-50">${time.label}</td>${cells}</tr>`;
    }).join('');
    
    const scheduleOverridesHtml = state.scheduleOverrides.map(ov => {
        const activity = state.activities.find(a => a.id === ov.activityId);
        return `
            <div class="text-sm p-2 bg-gray-100 rounded-md flex justify-between items-center">
                <div>
                    <span class="font-semibold">${ov.day} ${ov.time}</span> <i data-lucide="arrow-right" class="inline-block w-4 h-4"></i> <span class="font-semibold">${activity ? activity.name : 'Clase eliminada'}</span>
                    <div class="text-xs text-gray-600">${ov.startDate} a ${ov.endDate}</div>
                </div>
                <button data-action="delete-schedule-override" data-id="${ov.id}" class="text-red-500 hover:text-red-700"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        `
    }).join('');

    return `
        <div class="p-6 bg-gray-50 min-h-full space-y-8">
            <h2 class="text-2xl font-bold text-gray-800">${t('settings_view_title')}</h2>
            <div class="grid lg:grid-cols-2 gap-8 items-start">
                <div class="space-y-8">
                     <!-- Fechas del Curso -->
                    <div class="bg-white p-6 rounded-lg shadow-md">
                        <h3 class="text-lg font-semibold mb-3">${t('course_dates_title')}</h3>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">${t('start_date')}</label>
                                <input type="date" data-action="update-course-date" data-type="start" value="${state.courseStartDate}" class="mt-1 w-full p-2 border rounded-md">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">${t('end_date')}</label>
                                <input type="date" data-action="update-course-date" data-type="end" value="${state.courseEndDate}" class="mt-1 w-full p-2 border rounded-md">
                            </div>
                        </div>
                    </div>
                    <!-- Gestión de Actividades -->
                    <div class="bg-white p-6 rounded-lg shadow-md">
                        <h3 class="text-lg font-semibold mb-3">${t('activities_management_title')}</h3>
                        <div class="flex gap-2 mb-2">
                            <input type="text" id="new-activity-name" placeholder="${t('activity_name_placeholder')}" class="flex-grow p-2 border rounded-md"/>
                            <button data-action="add-activity" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"><i data-lucide="plus-circle" class="w-5 h-5"></i>${t('add')}</button>
                        </div>
                        <div class="flex gap-4 mb-4 text-sm">
                            <label class="flex items-center gap-2"><input type="radio" name="activityType" value="class" checked class="form-radio"/>${t('activity_type_class')}</label>
                            <label class="flex items-center gap-2"><input type="radio" name="activityType" value="general" class="form-radio"/>${t('activity_type_general')}</label>
                        </div>
                        <div class="space-y-3 max-h-96 overflow-y-auto pr-2">${activitiesHtml}</div>
                    </div>
                     <!-- Importación Rápida -->
                    <div class="bg-white p-6 rounded-lg shadow-md">
                        <h3 class="text-lg font-semibold mb-3 flex items-center gap-2"><i data-lucide="clipboard-paste" class="w-5 h-5"></i> ${t('quick_import_title')}</h3>
                        <div class="space-y-4">
                            <div><label class="block text-sm font-medium text-gray-700 mb-1">${t('step1_select_class')}</label><select id="import-target-class" class="w-full p-2 border rounded-md"><option value="">${t('choose_a_class')}</option>${state.activities.filter(a => a.type === 'class').map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
                            <div><label class="block text-sm font-medium text-gray-700 mb-1">${t('step2_paste_list')}</label><textarea id="student-list-text" placeholder="Juan Pérez\nMaría García\n..." class="w-full p-2 border rounded-md h-32"></textarea></div>
                            <button data-action="import-students" class="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center gap-2"><i data-lucide="upload" class="w-5 h-5"></i> ${t('import_students')}</button>
                        </div>
                    </div>
                </div>
                <div class="space-y-8">
                    <!-- Generador Automático de Horario -->
                    <div class="bg-white p-6 rounded-lg shadow-md">
                        <h3 class="text-lg font-semibold mb-3 flex items-center gap-2"><i data-lucide="wand-2" class="w-5 h-5"></i> ${t('schedule_generator_title')}</h3>
                        <div class="grid grid-cols-2 gap-4">
                            <div><label class="block text-sm font-medium">${t('start_time')}</label><input type="time" id="gen-start-time" value="08:00" class="w-full p-2 border rounded-md"></div>
                            <div><label class="block text-sm font-medium">${t('end_time')}</label><input type="time" id="gen-end-time" value="17:00" class="w-full p-2 border rounded-md"></div>
                            <div><label class="block text-sm font-medium">${t('class_duration_min')}</label><input type="number" id="gen-class-duration" value="55" class="w-full p-2 border rounded-md"></div>
                            <div><label class="block text-sm font-medium">${t('break_duration_min')}</label><input type="number" id="gen-break-duration" value="30" class="w-full p-2 border rounded-md"></div>
                            <div class="col-span-2"><label class="block text-sm font-medium">${t('break_start_time_optional')}</label><input type="time" id="gen-break-start" value="11:00" class="w-full p-2 border rounded-md"></div>
                        </div>
                        <button data-action="generate-schedule-slots" class="mt-4 w-full bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 flex items-center justify-center gap-2">${t('generate_slots')}</button>
                    </div>
                    <!-- Gestión de Franjas Horarias -->
                    <div class="bg-white p-6 rounded-lg shadow-md">
                        <h3 class="text-lg font-semibold mb-3 flex items-center gap-2"><i data-lucide="clock" class="w-5 h-5"></i> ${t('timeslots_management_title')}</h3>
                        <div class="flex gap-2 mb-4">
                            <input type="text" id="new-timeslot-label" placeholder="${t('timeslot_placeholder')}" class="flex-grow p-2 border rounded-md"/>
                            <button data-action="add-timeslot" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"><i data-lucide="plus-circle" class="w-5 h-5"></i>${t('add')}</button>
                        </div>
                        <div class="space-y-2">${timeSlotsHtml}</div>
                    </div>
                    <!-- Horario Semanal -->
                    <div class="bg-white p-6 rounded-lg shadow-md">
                        <h3 class="text-lg font-semibold mb-3">${t('weekly_schedule_config_title')}</h3>
                        <div class="overflow-x-auto">
                            <table class="w-full border-collapse text-sm">
                                <thead><tr class="bg-gray-100"><th class="p-2 border">${t('hour')}</th>${dayKeys.map(day => `<th class="p-2 border">${t(day.toLowerCase())}</th>`).join('')}</tr></thead>
                                <tbody>${scheduleTableRows}</tbody>
                            </table>
                        </div>
                    </div>
                    <!-- Sustituciones de Horario -->
                    <div class="bg-white p-6 rounded-lg shadow-md">
                        <h3 class="text-lg font-semibold mb-3">${t('schedule_overrides_title')}</h3>
                        <div class="space-y-4">
                            <div class="grid grid-cols-2 gap-4">
                                <div><label class="block text-sm font-medium">${t('day')}</label><select id="override-day" class="w-full p-2 border rounded-md">${dayKeys.map(day => `<option>${t(day.toLowerCase())}</option>`).join('')}</select></div>
                                <div><label class="block text-sm font-medium">${t('timeslot')}</label><select id="override-time" class="w-full p-2 border rounded-md">${state.timeSlots.map(t => `<option>${t.label}</option>`).join('')}</select></div>
                            </div>
                            <div><label class="block text-sm font-medium">${t('replace_with')}</label><select id="override-activity" class="w-full p-2 border rounded-md">${state.activities.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}</select></div>
                            <div class="grid grid-cols-2 gap-4">
                                <div><label class="block text-sm font-medium">${t('from_date')}</label><input type="date" id="override-start-date" class="w-full p-2 border rounded-md"></div>
                                <div><label class="block text-sm font-medium">${t('until_date')}</label><input type="date" id="override-end-date" class="w-full p-2 border rounded-md"></div>
                            </div>
                            <button data-action="add-schedule-override" class="w-full bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600">${t('add_override')}</button>
                        </div>
                        <div class="mt-6 space-y-2">${scheduleOverridesHtml}</div>
                    </div>
                     <!-- Copia de Seguridad y Zona de Peligro -->
                    <div class="bg-white p-6 rounded-lg shadow-md">
                        <h3 class="text-lg font-semibold mb-3">${t('backup_title')}</h3>
                        <div class="flex gap-4">
                            <button data-action="export-data" class="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 flex items-center gap-2"><i data-lucide="download" class="w-5 h-5"></i> ${t('export')}</button>
                            <label class="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 flex items-center gap-2 cursor-pointer"><i data-lucide="upload" class="w-5 h-5"></i> ${t('import')}<input type="file" id="import-file-input" accept=".json" class="hidden"/></label>
                        </div>
                    </div>
                    <div class="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                        <h3 class="text-lg font-semibold text-red-800 flex items-center gap-2"><i data-lucide="alert-triangle" class="w-5 h-5"></i> ${t('danger_zone_title')}</h3>
                        <button data-action="delete-all-data" class="mt-4 w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center justify-center gap-2"><i data-lucide="trash-2" class="w-5 h-5"></i> ${t('delete_all_data')}</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function renderActivityDetailView() {
    const { name, day, time, date, id: activityId } = state.selectedActivity;
    const entryId = `${activityId}_${date}`;
    const entry = state.classEntries[entryId] || { planned: '', completed: '', annotations: {} };
    const studentsInClass = state.students.filter(s => state.selectedActivity.studentIds?.includes(s.id));

    const annotationsHtml = studentsInClass.length > 0 ? studentsInClass.map(student => `
        <div key="${student.id}">
            <button data-action="select-student" data-student-id="${student.id}" class="text-left font-medium text-blue-600 hover:underline w-full">${student.name}</button>
            <textarea data-action="annotation-change" data-student-id="${student.id}" placeholder="${t('student_notes_placeholder')}" class="w-full p-2 border rounded-md mt-1 h-24">${entry.annotations?.[student.id] || ''}</textarea>
        </div>
    `).join('') : `<p class="text-gray-500">${t('no_students_assigned')}</p>`;
    
    const prevSession = findPreviousSession(activityId, new Date(date));
    const nextSession = findNextSession(activityId, new Date(date));

    const prevButton = prevSession ? `<button data-action="navigate-to-session" data-activity-id="${activityId}" data-day="${prevSession.day}" data-time="${prevSession.time}" data-date="${prevSession.date}" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 flex items-center gap-2"><i data-lucide="arrow-left"></i> ${t('previous_session')}</button>` : `<button class="bg-gray-200 text-gray-400 px-4 py-2 rounded-md cursor-not-allowed flex items-center gap-2" disabled><i data-lucide="arrow-left"></i> ${t('previous_session')}</button>`;
    const nextButton = nextSession ? `<button data-action="navigate-to-session" data-activity-id="${activityId}" data-day="${nextSession.day}" data-time="${nextSession.time}" data-date="${nextSession.date}" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 flex items-center gap-2">${t('next_session')} <i data-lucide="arrow-right"></i></button>` : `<button class="bg-gray-200 text-gray-400 px-4 py-2 rounded-md cursor-not-allowed flex items-center gap-2" disabled>${t('next_session')} <i data-lucide="arrow-right"></i></button>`;


    return `
        <div class="p-6 bg-gray-50 min-h-full">
            <div class="flex justify-between items-center mb-2 no-print">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">${name}</h2>
                    <p class="text-gray-500">${t(day.toLowerCase())}, ${new Date(date + 'T00:00:00').toLocaleDateString(document.documentElement.lang, {day: 'numeric', month: 'long', year: 'numeric'})} (${time})</p>
                </div>
                <button data-action="back-to-schedule" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">${t('back_to_schedule')}</button>
            </div>
            <div class="flex justify-between items-center mb-6 no-print">
                ${prevButton}
                ${nextButton}
            </div>
            <div class="grid md:grid-cols-2 gap-6">
                <div class="bg-white p-6 rounded-lg shadow-md space-y-4">
                    <div><label class="block text-lg font-semibold mb-2 text-gray-700">${t('planning_for_today')}</label><textarea data-action="planned-change" placeholder="${t('planning_placeholder')}" class="w-full p-2 border rounded-md h-32">${entry.planned || ''}</textarea></div>
                    <div><label class="block text-lg font-semibold mb-2 text-gray-700">${t('summary_of_session')}</label><textarea data-action="completed-change" placeholder="${t('summary_placeholder')}" class="w-full p-2 border rounded-md h-32">${entry.completed || ''}</textarea></div>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h3 class="text-lg font-semibold mb-3">${t('student_annotations_title')}</h3>
                    <div class="space-y-4 max-h-96 overflow-y-auto pr-2">${annotationsHtml}</div>
                </div>
            </div>
        </div>
    `;
}
