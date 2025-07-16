// i18n.js: Módulo para gestionar la internacionalización

let translations = {};
const supportedLangs = ['es', 'ca', 'en'];
let renderCallback = () => {}; // Callback para re-renderizar la UI cuando cambia el idioma

/**
 * Carga el archivo de idioma JSON desde la carpeta /locales
 * @param {string} lang - El código del idioma a cargar (ej: 'es', 'en').
 */
async function loadTranslations(lang) {
    try {
        const response = await fetch(`locales/${lang}.json`);
        if (!response.ok) {
            throw new Error(`No se pudo cargar el archivo de idioma: ${lang}.json`);
        }
        translations = await response.json();
    } catch (error) {
        console.error('Error al cargar las traducciones:', error);
        // Si falla, se carga el español como idioma por defecto.
        if (lang !== 'es') {
            await loadTranslations('es');
        }
    }
}

/**
 * Traduce una clave de texto.
 * @param {string} key - La clave del texto a traducir (ej: 'nav_schedule').
 * @returns {string} - El texto traducido o la clave si no se encuentra.
 */
export function t(key) {
    return translations[key] || `[${key}]`; // Devuelve la clave para depurar si no hay traducción
}

/**
 * Cambia el idioma actual de la aplicación.
 * @param {string} lang - El nuevo idioma a establecer.
 */
async function setLanguage(lang) {
    // Asegurarse de que el idioma esté soportado
    if (!supportedLangs.includes(lang)) {
        lang = 'es';
    }
    
    await loadTranslations(lang);

    // Guardar la preferencia y actualizar la etiqueta lang del HTML
    document.documentElement.lang = lang;
    localStorage.setItem('preferredLanguage', lang);

    // Actualizar el estilo de los botones del selector de idioma
    document.querySelectorAll('.lang-switcher').forEach(btn => {
        const buttonLang = btn.dataset.lang;
        btn.classList.toggle('border-blue-600', buttonLang === lang);
        btn.classList.toggle('text-blue-600', buttonLang === lang);
        btn.classList.toggle('border-transparent', buttonLang !== lang);
        btn.classList.toggle('text-gray-500', buttonLang !== lang);
    });
    
    // Traducir los elementos estáticos (como el menú de navegación)
    document.querySelectorAll('[data-i18n-key]').forEach(element => {
        const key = element.dataset.i18nKey;
        element.textContent = t(key);
    });

    // Llamar a la función render principal para que la vista activa se vuelva a generar con el nuevo idioma.
    renderCallback();
}

/**
 * Inicializa el sistema de internacionalización.
 * @param {function} renderFunc - La función principal de renderizado de la app.
 */
export async function initI18n(renderFunc) {
    renderCallback = renderFunc;

    // Detectar el idioma a cargar: 1º guardado, 2º del navegador, 3º español por defecto.
    const savedLang = localStorage.getItem('preferredLanguage');
    const browserLang = navigator.language.split('-')[0];
    const langToLoad = savedLang || (supportedLangs.includes(browserLang) ? browserLang : 'es');
    
    // Añadir los eventos de clic a los botones de idioma
    document.querySelectorAll('.lang-switcher').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const selectedLang = e.currentTarget.dataset.lang;
            setLanguage(selectedLang);
        });
    });

    // Cargar el idioma inicial y actualizar la UI estática.
    // No llamamos a setLanguage() completo para evitar un re-renderizado doble al inicio.
    await loadTranslations(langToLoad);
    document.documentElement.lang = langToLoad;
    document.querySelectorAll('.lang-switcher').forEach(btn => {
        const buttonLang = btn.dataset.lang;
        btn.classList.toggle('border-blue-600', buttonLang === langToLoad);
        btn.classList.toggle('text-blue-600', buttonLang === langToLoad);
    });
    document.querySelectorAll('[data-i18n-key]').forEach(element => {
        element.textContent = t(element.dataset.i18nKey);
    });
}
```

**2. Conexión con `main.js`**

Ahora, modificamos `main.js` para que use este nuevo módulo. Los cambios principales son:
* Importar `initI18n`.
* Llamar a `initI18n()` al principio, pasándole la función `render` para que el motor de traducción pueda redibujar la pantalla cuando sea necesario.


```javascript
// main.js: El punto de entrada principal que une todo.

import { state, loadState } from './state.js';
import * as views from './views.js';
import { actionHandlers } from './actions.js';
import { initI18n } from './i18n.js'; // Importamos el inicializador de i18n

const mainContent = document.getElementById('main-content');
const navButtons = document.querySelectorAll('.nav-button');

function render() {
    mainContent.innerHTML = ''; // Limpiar vista anterior
    let viewContent = '';

    // Las funciones de las vistas (en views.js) ahora usarán el traductor,
    // por lo que el contenido se generará en el idioma correcto.
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


async function init() {
    // Inicializamos el sistema de i18n y le pasamos la función render.
    // Esto debe hacerse antes de cargar el estado y renderizar por primera vez.
    await initI18n(render); 
    
    loadState();
    updateNavButtons();
    render(); // El primer render de la aplicación
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            state.activeView = btn.dataset.view;
            state.selectedActivity = null;
            state.selectedStudentId = null;
            updateNavButtons();
            render();
        });
    });

    document.addEventListener('render', () => render());
}

// Iniciar la aplicación
init();
