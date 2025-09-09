// auth.js: Sistema de autenticación con contraseña para proteger la aplicación

// Nombre de la cookie para recordar la autenticación
const AUTH_COOKIE_NAME = 'cuaderno_auth';
// Duración de la cookie: 1 año en milisegundos
const AUTH_COOKIE_DURATION = 365 * 24 * 60 * 60 * 1000;

/**
 * Genera un hash simple de una cadena usando el Web Crypto API
 * Fallback a un hash básico si no está disponible
 */
async function hashPassword(password) {
    try {
        if (crypto && crypto.subtle) {
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }
    } catch (error) {
        console.warn('Web Crypto API no disponible, usando hash básico');
    }
    
    // Fallback: hash básico (no es seguro, pero mejor que texto plano)
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
}

/**
 * Establece una cookie con duración muy larga
 */
function setAuthCookie() {
    const expirationDate = new Date(Date.now() + AUTH_COOKIE_DURATION);
    document.cookie = `${AUTH_COOKIE_NAME}=authenticated; expires=${expirationDate.toUTCString()}; path=/; SameSite=Strict`;
}

/**
 * Verifica si existe la cookie de autenticación
 */
function isAuthenticated() {
    return document.cookie.split(';').some(cookie => 
        cookie.trim().startsWith(`${AUTH_COOKIE_NAME}=authenticated`)
    );
}

/**
 * Obtiene la contraseña configurada del archivo config.js
 */
function getConfiguredPassword() {
    const config = window.__APP_CONFIG__;
    return config?.PASSWORD || '';
}

/**
 * Valida la contraseña introducida por el usuario
 */
async function validatePassword(userPassword) {
    const configuredPassword = getConfiguredPassword();
    
    if (!configuredPassword) {
        console.warn('No hay contraseña configurada en PASSWORD secret');
        return false;
    }
    
    // Hasheamos tanto la contraseña del usuario como la configurada para compararlas
    const userHash = await hashPassword(userPassword);
    const configHash = await hashPassword(configuredPassword);
    
    return userHash === configHash;
}

/**
 * Crea y muestra la interfaz de autenticación
 */
function createAuthInterface() {
    const authOverlay = document.createElement('div');
    authOverlay.id = 'auth-overlay';
    authOverlay.className = 'fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50';
    
    authOverlay.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div class="text-center mb-6">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Cuaderno del Profesor
                </h1>
                <p class="text-gray-600 dark:text-gray-400">
                    Introduce la contraseña para acceder
                </p>
            </div>
            
            <form id="auth-form" class="space-y-4">
                <div>
                    <label for="password-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Contraseña
                    </label>
                    <input 
                        type="password" 
                        id="password-input" 
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                               focus:outline-none focus:ring-2 focus:ring-blue-500 
                               dark:bg-gray-700 dark:text-gray-100"
                        placeholder="Introduce tu contraseña"
                        required
                    />
                </div>
                
                <button 
                    type="submit" 
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 
                           rounded-md transition-colors duration-200"
                >
                    Acceder
                </button>
                
                <div id="auth-error" class="hidden text-red-600 dark:text-red-400 text-sm text-center">
                    Contraseña incorrecta. Inténtalo de nuevo.
                </div>
            </form>
        </div>
    `;
    
    return authOverlay;
}

/**
 * Maneja el envío del formulario de autenticación
 */
async function handleAuthSubmit(event) {
    event.preventDefault();
    
    const passwordInput = document.getElementById('password-input');
    const errorDiv = document.getElementById('auth-error');
    const submitButton = event.target.querySelector('button[type="submit"]');
    
    const userPassword = passwordInput.value;
    
    // Indicador de carga
    submitButton.textContent = 'Verificando...';
    submitButton.disabled = true;
    errorDiv.classList.add('hidden');
    
    try {
        const isValid = await validatePassword(userPassword);
        
        if (isValid) {
            // Contraseña correcta: establecer cookie y continuar
            setAuthCookie();
            document.getElementById('auth-overlay').remove();
            // Disparar evento para que la aplicación principal se inicialice
            document.dispatchEvent(new CustomEvent('auth-success'));
        } else {
            // Contraseña incorrecta
            errorDiv.classList.remove('hidden');
            passwordInput.value = '';
            passwordInput.focus();
        }
    } catch (error) {
        console.error('Error durante la autenticación:', error);
        errorDiv.textContent = 'Error de autenticación. Inténtalo de nuevo.';
        errorDiv.classList.remove('hidden');
    }
    
    // Restaurar el botón
    submitButton.textContent = 'Acceder';
    submitButton.disabled = false;
}

/**
 * Inicializa el sistema de autenticación
 * Retorna true si ya está autenticado, false si necesita autenticación
 */
export function initAuth() {
    // Si no hay contraseña configurada, permitir acceso sin autenticación
    if (!getConfiguredPassword()) {
        console.log('No hay contraseña configurada, permitiendo acceso libre');
        return true;
    }
    
    // Si ya está autenticado, permitir acceso
    if (isAuthenticated()) {
        console.log('Usuario ya autenticado via cookie');
        return true;
    }
    
    // Crear y mostrar interfaz de autenticación
    const authOverlay = createAuthInterface();
    document.body.appendChild(authOverlay);
    
    // Configurar el manejador del formulario
    const authForm = document.getElementById('auth-form');
    authForm.addEventListener('submit', handleAuthSubmit);
    
    // Focus en el input de contraseña
    setTimeout(() => {
        document.getElementById('password-input').focus();
    }, 100);
    
    return false;
}

/**
 * Función para cerrar sesión (eliminar cookie)
 */
export function logout() {
    document.cookie = `${AUTH_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    location.reload();
}