// main.js: El punto de entrada principal que une todo.

import { supabase, testConnection } from './supabase.js';
import { state, loadState, setOnlineStatus } from './state.js';
import * as views from './views.js';
import { actionHandlers } from './actions.js';
import { initI18n, t } from './i18n.js';

const appContainer = document.getElementById('app-container');
const mainContainer = document.getElementById('main-container');
const mainContent = document.getElementById('main-content');
const navButtons = document.querySelectorAll('.nav-button');
const sidebar = document.getElementById('sidebar');
const sidebarToggleBtn = document.getElementById('sidebar-toggle');
const openSidebarBtn = document.getElementById('open-sidebar-btn');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const mobileHeaderTitle = document.getElementById('mobile-header-title');
const themeSwitcherBtns = document.querySelectorAll('.theme-switcher');
const offlineBanner = document.getElementById('offline-banner');

function updateConnectionBanner() {
    if (!offlineBanner) return;
    offlineBanner.classList.toggle('hidden', state.isOnline);
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
        btn.classList.toggle('hover:bg-gray-100', !isActive);
        btn.classList.toggle('dark:hover:bg-gray-700', !isActive);
        if(isActive) {
            btn.classList.remove('text-gray-600', 'dark:text-gray-300');
        } else {
            btn.classList.add('text-gray-600', 'dark:text-gray-300');
        }
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
        'export-data', 'import-data', 'navigate-to-session-of-the-day'
    ];
    
    if (actionHandlers[action]) {
        const result = actionHandlers[action](id, element, event);
        if (result && typeof result.then === 'function') {
            result.then(() => {
                if (reRenderActions.includes(action)) render();
            }).catch(error => {
                console.error(`Error in action ${action}:`, error);
                if (reRenderActions.includes(action)) render();
            });
        } else {
            if (reRenderActions.includes(action)) render();
        }
    }
}

function attachEventListeners() {
    document.querySelectorAll('[data-action]').forEach(el => {
        if (el.dataset.listenerAttached === 'true') return;

        const action = el.dataset.action;
        const eventType = ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) ? 'input' : 'click';
        
        if (action === 'import-data-mobile') return;

        const listener = (e) => {
            if (window.innerWidth < 640 && el.closest('.nav-button')) {
                toggleMobileSidebar(false);
            }
            handleAction(action, el, e);
        };

        el.addEventListener(eventType, listener);
        el.dataset.listenerAttached = 'true';
    });
    
    const importInput = document.getElementById('import-file-input');
    if (importInput && importInput.dataset.listenerAttached !== 'true') {
        importInput.addEventListener('change', (e) => handleAction('import-data', importInput, e));
        importInput.dataset.listenerAttached = 'true';
    }
    
    const mobileImportInput = document.getElementById('import-file-input-mobile');
    if (mobileImportInput && mobileImportInput.dataset.listenerAttached !== 'true') {
        mobileImportInput.addEventListener('change', (e) => handleAction('import-data', mobileImportInput, e));
        mobileImportInput.dataset.listenerAttached = 'true';
    }
}

function toggleMobileSidebar(show) {
    sidebar.classList.toggle('-translate-x-full', !show);
    sidebarOverlay.classList.toggle('hidden', !show);
}

function setSidebarState(collapsed) {
    appContainer.classList.toggle('sidebar-collapsed', collapsed);
    mainContainer.style.marginLeft = collapsed ? '4.5rem' : '16rem';
    sidebar.style.width = collapsed ? '4.5rem' : '16rem';

    const toggleIcon = sidebarToggleBtn.querySelector('i');
    toggleIcon.setAttribute('data-lucide', collapsed ? 'chevrons-right' : 'chevrons-left');
    lucide.createIcons();

    localStorage.setItem('sidebarCollapsed', collapsed);
}

function toggleDesktopSidebar() {
    const isCollapsed = !appContainer.classList.contains('sidebar-collapsed');
    setSidebarState(isCollapsed);
}

function setTheme(theme) {
    localStorage.setItem('theme', theme);
    if (theme === 'system') {
        document.documentElement.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
    } else {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }
    updateThemeSwitcherUI();
}

function updateThemeSwitcherUI() {
    const currentTheme = localStorage.getItem('theme') || 'system';
    themeSwitcherBtns.forEach(btn => {
        const btnTheme = btn.dataset.theme;
        const isActive = btnTheme === currentTheme;
        btn.classList.toggle('bg-blue-600', isActive);
        btn.classList.toggle('text-white', isActive);
        btn.classList.toggle('text-gray-500', !isActive);
        btn.classList.toggle('dark:text-gray-400', !isActive);
    });
}

async function init() {
    if (!window.__APP_CONFIG__) {
        const script = document.createElement('script');
        script.textContent = `window.__APP_CONFIG__ = { SUPABASE_URL: "", SUPABASE_ANON_KEY: "", USE_MOCK: false };`;
        document.head.appendChild(script);
    }

    const conn = await testConnection();
    setOnlineStatus(conn.ok);
    console.log(conn.ok ? '☁️ Supabase conectado. Modo nube activo.' : '⚠️ No se pudo conectar a Supabase:', conn.error || '');

    setTheme(localStorage.getItem('theme') || 'system');
    
    await initI18n(() => {
        render();
        updateNavButtons();
    }); 
    
    await loadState();
    render();
    updateNavButtons();
    
    // Setup event listeners
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            state.activeView = btn.dataset.view;
            state.selectedActivity = null;
            state.selectedStudentId = null;
            updateNavButtons();
            render();
            if (window.innerWidth < 640) {
                toggleMobileSidebar(false);
            }
        });
    });
    
    openSidebarBtn.addEventListener('click', () => toggleMobileSidebar(true));
    sidebarOverlay.addEventListener('click', () => toggleMobileSidebar(false));
    sidebarToggleBtn.addEventListener('click', toggleDesktopSidebar);
    
    themeSwitcherBtns.forEach(btn => {
        btn.addEventListener('click', () => setTheme(btn.dataset.theme));
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (localStorage.getItem('theme') === 'system') {
            setTheme('system');
        }
    });

    document.addEventListener('render', render);

    window.addEventListener('resize', () => {
        if (window.innerWidth < 640) {
            setSidebarState(false); // Expand sidebar on mobile
        }
    });

    // Initial sidebar state
    if (window.innerWidth >= 640) {
        const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        setSidebarState(isCollapsed);
    }
}

init();
