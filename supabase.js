// supabase.js: Configuración del cliente Supabase

import { createClient } from './node_modules/@supabase/supabase-js/dist/module/index.js';

// Configuración de Supabase extraída de la conexión PostgreSQL
// postgresql://postgres.kdxlawphtdbfiudinywo:Burriana2025.@aws-1-eu-west-3.pooler.supabase.com:6543/postgres
const supabaseUrl = 'https://kdxlawphtdbfiudinywo.supabase.co';

// Necesitas obtener la anon key desde el dashboard de Supabase en:
// Settings > API > Project API keys > anon/public key
// Por seguridad, también puedes usar una service_role key para operaciones administrativas
const supabaseKey = 'YOUR_ANON_KEY_HERE';

// Para modo de desarrollo/testing, podemos usar un mock o configuración simplificada
const isDevelopment = supabaseKey === 'YOUR_ANON_KEY_HERE';

let supabaseClient;

if (isDevelopment) {
    // En desarrollo, podríamos usar una configuración mock o simplificada
    console.warn('⚠️  Supabase key no configurada. Usando modo de desarrollo con localStorage.');
    supabaseClient = null;
} else {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
}

export const supabase = supabaseClient;

// Para desarrollo, también proporcionamos la conexión PostgreSQL directa
export const pgConfig = {
    host: 'aws-1-eu-west-3.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.kdxlawphtdbfiudinywo',
    password: 'Burriana2025.'
};

// Función para verificar la conexión
export async function testConnection() {
    if (!supabase) {
        console.log('Supabase not configured, using localStorage mode');
        return false;
    }
    
    try {
        const { data, error } = await supabase.from('activities').select('count', { count: 'exact', head: true });
        if (error) {
            console.log('Error testing connection:', error);
            return false;
        }
        console.log('Supabase connection successful');
        return true;
    } catch (err) {
        console.log('Connection test failed:', err);
        return false;
    }
}

// Helper function to set the anon key programmatically (for configuration)
export function configureSupabase(anonKey) {
    if (anonKey && anonKey !== 'YOUR_ANON_KEY_HERE') {
        supabaseClient = createClient(supabaseUrl, anonKey);
        return supabaseClient;
    }
    return null;
}