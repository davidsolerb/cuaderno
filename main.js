// main.js: El punto de entrada principal que une todo.

import { supabase, testConnection } from './supabase.js';
import { state, loadState, setOnlineStatus } from './state.js';
import * as views from './views.js';
import { actionHandlers } from './actions.js';
import { initI18n, t } from './i18n.js';

const mainContent = document.getElementById('main-content');
const navButtons = document.querySelectorAll('.nav-button');
const sidebar = document.getElementById('sidebar');
const openSidebarBtn = document.getElementById('open-sidebar-btn');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const mobileHeaderTitle = document.getElementById('mobile-header-title');
const themeSwitcherBtns = document.querySelectorAll('.theme-switcher');
const offlineBanner = document.getElementById('offline-banner');

function updateConnectionBanner() {
    if (!offlineBanner) return;
    if (state.isOnline) {
        offlineBanner.classList.add('hidden');
    } else {
        offlineBanner.classList.remove('hidden');
    }
}

document.addEventListener('online-status', updateConnectionBanner);

function render() {
    mainContent.innerHTML = '';
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
    
    updateMobileHeader();
    lucide.createIcons();
    attachEventListeners();

    const storageIndicator = document.getElementById('storage-mode-indicator');
    if (storageIndicator && state.isOnline) {
        setTimeout(() => {
            storageIndicator.classList.add('opacity-0');
            setTimeout(() => storageIndicator.classList.add('hidden'), 500);
        }, 3000);
    }
}

function updateMobileHeader() {
    const keyMap = {
        schedule: 'schedule_view_title',
        classes: 'classes_view_title',
        settings: 'settings_view_title',
        activityDetail: 'activity_detail_view_title',
        studentDetail: 'student_detail_view_title'
    };
    mobileHeaderTitle.textContent = t(keyMap[state.activeView] || 'app_title');
}

function updateNavButtons() {
    navButtons.forEach(btn => {
        const view = btn.dataset.view;
        const isActive = view === state.activeView;
        btn.classList.toggle('bg-blue-600', isActive);
        btn.classList.toggle('text-white', isActive);
        btn.classList.toggle('text-gray-600', !isActive);
        btn.classList.toggle('dark:text-gray-300', !isActive);
        btn.classList.toggle('hover:bg-gray-200', !isActive);
        btn.classList.toggle('dark:hover:bg-gray-700', !isActive);
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
        'add-selected-student-to-class', 'navigate-to-session', 'add-schedule-override', 'delete-schedule-override',
        'export-data', 'import-data'
    ];
    
    if (actionHandlers[action]) {
        // Handle async action handlers
        const result = actionHandlers[action](id, element, event);
        if (result && typeof result.then === 'function') {
            // If it's a promise, wait for it and then re-render if needed
            result.then(() => {
                if (reRenderActions.includes(action)) {
                    render();
                }
            }).catch(error => {
                console.error(`Error in action ${action}:`, error);
                // Still re-render in case of error to show consistent state
                if (reRenderActions.includes(action)) {
                    render();
                }
            });
        } else {
            // Synchronous action, re-render immediately if needed
            if (reRenderActions.includes(action)) {
                render();
            }
        }
    }
}

function attachEventListeners() {
    const elements = document.querySelectorAll('[data-action]');
    elements.forEach(el => {
        const action = el.dataset.action;
        const eventType = ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) ? 'input' : 'click';
        
        if (el.dataset.listenerAttached === 'true') return;
        
        // --- INICIO DE LA CORRECCIÓN: No se añade listener al label ---
        if (action === 'import-data-mobile') return;
        // --- FIN DE LA CORRECCIÓN ---

        const listener = (e) => {
             if (el.closest('.nav-button')) {
                toggleSidebar(false);
            }
            handleAction(action, el, e)
        };

        el.addEventListener(eventType, listener);
        el.dataset.listenerAttached = 'true';
    });
    
    const importInput = document.getElementById('import-file-input');
    if (importInput && importInput.dataset.listenerAttached !== 'true') {
        importInput.addEventListener('change', (e) => handleAction('import-data', importInput, e));
        importInput.dataset.listenerAttached = 'true';
    }
    
    // --- INICIO DE LA CORRECCIÓN: Se añade el listener directamente al input móvil ---
    const mobileImportInput = document.getElementById('import-file-input-mobile');
    if (mobileImportInput && mobileImportInput.dataset.listenerAttached !== 'true') {
        mobileImportInput.addEventListener('change', (e) => handleAction('import-data', mobileImportInput, e));
        mobileImportInput.dataset.listenerAttached = 'true';
    }
    // --- FIN DE LA CORRECCIÓN ---
}


function toggleSidebar(show) {
    if (show) {
        sidebar.classList.remove('-translate-x-full');
        sidebarOverlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('hidden');
    }
}

function setTheme(theme) {
    if (theme === 'system') {
        localStorage.removeItem('theme');
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    } else {
        localStorage.setItem('theme', theme);
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
    updateThemeSwitcherUI(theme);
}

function updateThemeSwitcherUI(theme) {
     themeSwitcherBtns.forEach(btn => {
        const btnTheme = btn.dataset.theme;
        const isActive = btnTheme === theme;
        btn.classList.toggle('bg-blue-600', isActive);
        btn.classList.toggle('text-white', isActive);
         btn.classList.toggle('text-gray-500', !isActive);
        btn.classList.toggle('dark:text-gray-400', !isActive);
    });
}


async function init() {
    console.log('🚀 Inicializando aplicación principal...');
    
    // Create config.js if missing (for local development)
    if (!window.__APP_CONFIG__) {
        console.log('No config found, creating fallback config.js for localStorage mode');
        const script = document.createElement('script');
        script.textContent = `
            window.__APP_CONFIG__ = {
                SUPABASE_URL: "",
                SUPABASE_ANON_KEY: "",
                PASSWORD: "",
                USE_MOCK: false
            };
        `;
        document.head.appendChild(script);
    }

    // La autenticación ya fue manejada por el script en index.html
    await initializeApp();
}

async function initializeApp() {
    console.log('🚀 Inicializando aplicación principal...');
    
    try {
        const conn = await testConnection();
        if (conn.ok) {
            console.log('☁️ Supabase conectado. Modo nube activo.');
        } else {
            console.error('⚠️ No se pudo conectar a Supabase:', conn.error);
        }
        setOnlineStatus(conn.ok);
    } catch (error) {
        console.error('⚠️ Error al probar conexión:', error);
        setOnlineStatus(false);
    }
    
    const savedTheme = localStorage.getItem('theme') || 'system';
    setTheme(savedTheme);

    try {
        await initI18n(() => {
            render();
            updateNavButtons();
        }); 
    } catch (error) {
        console.error('⚠️ Error al inicializar i18n:', error);
    }
    
    try {
        await loadState();
    } catch (error) {
        console.error('⚠️ Error al cargar estado:', error);
    }
    
    render();
    updateNavButtons();
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            state.activeView = btn.dataset.view;
            state.selectedActivity = null;
            state.selectedStudentId = null;
            updateNavButtons();
            render();
            if (window.innerWidth < 640) {
                toggleSidebar(false);
            }
        });
    });
    
    openSidebarBtn.addEventListener('click', () => toggleSidebar(true));
    closeSidebarBtn.addEventListener('click', () => toggleSidebar(false));
    sidebarOverlay.addEventListener('click', () => toggleSidebar(false));
    
    themeSwitcherBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setTheme(btn.dataset.theme);
        });
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (localStorage.getItem('theme') === 'system') {
            setTheme('system');
        }
    });

    document.addEventListener('render', () => render());
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 640) {
            sidebar.classList.remove('-translate-x-full');
            sidebarOverlay.classList.add('hidden');
        }
    });
}

init();
