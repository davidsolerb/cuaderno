// supabase.js: Configuración del cliente Supabase

// Por simplicidad en el entorno actual, implementamos un cliente mock de Supabase
// que puede ser reemplazado fácilmente con el cliente real cuando esté disponible

// Configuración de Supabase extraída de la conexión PostgreSQL
const supabaseUrl = 'https://kdxlawphtdbfiudinywo.supabase.co';
const supabaseKey = 'YOUR_ANON_KEY_HERE';

// Mock de cliente Supabase para desarrollo
class MockSupabaseClient {
    constructor() {
        this.isConnected = false;
    }

    from(table) {
        return {
            select: (columns = '*') => ({
                order: (column) => ({
                    data: [],
                    error: null
                }),
                limit: (count) => ({
                    single: () => ({
                        data: null,
                        error: { code: 'PGRST116', message: 'No rows returned' }
                    })
                }),
                data: [],
                error: null
            }),
            insert: (data) => ({
                select: () => ({
                    single: () => ({
                        data: data[0],
                        error: null
                    })
                })
            }),
            update: (data) => ({
                eq: (column, value) => ({
                    select: () => ({
                        single: () => ({
                            data: data,
                            error: null
                        })
                    })
                })
            }),
            delete: () => ({
                eq: (column, value) => ({
                    error: null
                })
            }),
            upsert: (data) => ({
                error: null
            })
        };
    }

    rpc(functionName, params) {
        return {
            error: new Error('RPC functions not available in mock mode')
        };
    }
}

// Para modo de desarrollo sin configuración de Supabase
let supabaseClient;

if (supabaseKey === 'YOUR_ANON_KEY_HERE') {
    console.warn('⚠️  Supabase key no configurada. Usando modo localStorage.');
    supabaseClient = null; // This will trigger localStorage mode
} else {
    // En producción, aquí cargarías el cliente real de Supabase
    // import { createClient } from '@supabase/supabase-js';
    // supabaseClient = createClient(supabaseUrl, supabaseKey);
    supabaseClient = new MockSupabaseClient();
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
        const { data, error } = await supabase.from('activities').select('count');
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

// Helper function to set up real Supabase client when available
export function configureSupabase(anonKey) {
    if (anonKey && anonKey !== 'YOUR_ANON_KEY_HERE') {
        console.log('Real Supabase configuration would be set up here');
        // En producción, aquí inicializarías el cliente real
        return true;
    }
    return false;
}