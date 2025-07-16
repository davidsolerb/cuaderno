// main.js: El punto de entrada principal que une todo.

import { state, loadState } from './state.js';
import * as views from './views.js';
import { actionHandlers } from './actions.js';

const mainContent = document.getElementById('main-content');
const navButtons = document.querySelectorAll('.nav-button');

function render() {
    mainContent.innerHTML = ''; // Limpiar vista anterior
    let viewContent = '';

    switch (state.activeView) {
        case 'schedule': viewContent = views.renderScheduleView(); break;
        case 'classes': viewContent = views.renderClassesView(); break;
        case 'settings': viewContent = views.renderSettingsView(); break;
        case 'activityDetail': viewContent = views.renderActivityDetailView(); break;
        case 'studentDetail': viewContent = views.renderStudentDetailView(); break;
        default: viewContent = views.renderScheduleView();
    }
    mainContent.innerHTML = `<div class="animate-fade-in">${viewContent}</div>`;
    lucide.createIcons();
    attachEventListeners();
}

function updateNavButtons() {
    navButtons.forEach(btn => {
        const view = btn.dataset.view;
        btn.classList.toggle('bg-blue-600', view === state.activeView);
        btn.classList.toggle('text-white', view === state.activeView);
        btn.classList.toggle('text-gray-600', view !== state.activeView);
        btn.classList.toggle('hover:bg-gray-200', view !== state.activeView);
    });
}

function handleAction(action, element, event) {
    const id = element.dataset.id;
    const reRenderActions = [
        'add-activity', 'delete-activity', 'add-student-to-class', 'remove-student-from-class',
        'add-timeslot', 'delete-timeslot', 'reorder-timeslot', 'import-students',
        'select-activity', 'back-to-schedule', 'generate-schedule-slots', 'edit-timeslot',
        'save-timeslot', 'cancel-edit-timeslot', 'edit-activity', 'save-activity',
        'cancel-edit-activity', 'prev-week', 'next-week', 'today', 'select-student', 'back-to-classes',
        'add-selected-student-to-class', 'navigate-to-session', 'add-schedule-override', 'delete-schedule-override'
    ];
    
    if (actionHandlers[action]) {
        actionHandlers[action](id, element, event);
    }

    if (reRenderActions.includes(action)) {
        render();
    }
}

function attachEventListeners() {
    const elements = document.querySelectorAll('[data-action]');
    elements.forEach(el => {
        const action = el.dataset.action;
        const eventType = ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) ? 'input' : 'click';
        
        // Prevenir añadir múltiples listeners al mismo elemento
        if (el.dataset.listenerAttached === 'true') return;

        el.addEventListener(eventType, (e) => handleAction(action, el, e));
        el.dataset.listenerAttached = 'true';
    });
    
    const importInput = document.getElementById('import-file-input');
    if (importInput && importInput.dataset.listenerAttached !== 'true') {
        importInput.addEventListener('change', handleAction.bind(null, 'import-data', importInput));
        importInput.dataset.listenerAttached = 'true';
    }
}

function init() {
    loadState();
    updateNavButtons();
    render();
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            state.activeView = btn.dataset.view;
            state.selectedActivity = null;
            state.selectedStudentId = null;
            updateNavButtons();
            render();
        });
    });

    // Escuchar evento personalizado para re-renderizar desde otros módulos si es necesario
    document.addEventListener('render', () => render());
}

// Iniciar la aplicación
init();
