# Configuración de Supabase para Cuaderno del Profesor

Esta aplicación ha sido integrada con Supabase para proporcionar persistencia de datos en la nube. La aplicación funciona tanto con Supabase configurado como en modo de fallback usando localStorage.

## Estado Actual

La aplicación está configurada para funcionar en **modo híbrido**:
- **Sin configuración**: Usa localStorage (modo actual)
- **Con configuración**: Usa Supabase para persistencia en la nube

## Configuración para Producción con Supabase

### Paso 1: Obtener la clave de Supabase

1. Ve a tu dashboard de Supabase en https://supabase.com
2. Navega a Settings > API  
3. Copia la "anon/public" key

### Paso 2: Configurar la aplicación

Edita el archivo `supabase.js` y:

1. Reemplaza `YOUR_ANON_KEY_HERE` con tu clave real
2. Descomenta e importa el cliente real de Supabase:

```javascript
// Reemplaza la sección mock con:
import { createClient } from '@supabase/supabase-js';

const supabaseKey = 'tu_clave_anon_aqui';
const supabaseClient = createClient(supabaseUrl, supabaseKey);
export const supabase = supabaseClient;
```

### Paso 3: Crear las tablas en Supabase

Ejecuta el siguiente SQL en el Editor SQL de tu dashboard de Supabase:

```sql
-- Tabla de configuración del curso
CREATE TABLE IF NOT EXISTS course_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de actividades/clases
CREATE TABLE IF NOT EXISTS activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    color TEXT,
    start_date DATE,
    end_date DATE,
    student_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de estudiantes
CREATE TABLE IF NOT EXISTS students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    general_notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de franjas horarias
CREATE TABLE IF NOT EXISTS time_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    label TEXT NOT NULL,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla del horario semanal
CREATE TABLE IF NOT EXISTS schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    day_time_key TEXT NOT NULL UNIQUE,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de excepciones del horario
CREATE TABLE IF NOT EXISTS schedule_overrides (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    day_time_key TEXT NOT NULL,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    is_canceled BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de entradas de clase (sesiones específicas)
CREATE TABLE IF NOT EXISTS class_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entry_key TEXT NOT NULL UNIQUE,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    summary TEXT DEFAULT '',
    annotations JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_schedules_activity_id ON schedules(activity_id);
CREATE INDEX IF NOT EXISTS idx_schedule_overrides_date ON schedule_overrides(date);
CREATE INDEX IF NOT EXISTS idx_class_entries_activity_id ON class_entries(activity_id);
CREATE INDEX IF NOT EXISTS idx_class_entries_date ON class_entries(date);
```

### Paso 4: Configurar las políticas de seguridad (RLS)

Para permitir el acceso completo durante el desarrollo:

```sql
-- Desactivar RLS para desarrollo (recomendado para uso personal)
ALTER TABLE course_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_overrides DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_entries DISABLE ROW LEVEL SECURITY;
```

## Información de Conexión

La aplicación está preconfigurada para conectarse a:
- **Proyecto**: kdxlawphtdbfiudinywo
- **URL**: https://kdxlawphtdbfiudinywo.supabase.co
- **Región**: eu-west-3

## Características de la Integración

### Modo Híbrido
- ✅ **Fallback automático**: Si Supabase no está disponible, usa localStorage
- ✅ **Migración automática**: Los datos de localStorage se migran a Supabase automáticamente
- ✅ **Persistencia doble**: Mantiene copia en localStorage como respaldo

### Funcionalidades Implementadas
- ✅ **CRUD completo**: Actividades, estudiantes, horarios, franjas horarias
- ✅ **Sincronización asíncrona**: Todas las operaciones son asíncronas
- ✅ **Manejo de errores**: Continúa funcionando aunque Supabase falle
- ✅ **Migración de datos**: Importa datos existentes de localStorage

### Base de Datos
- ✅ **Schema completo**: 7 tablas con relaciones y índices
- ✅ **Optimización**: Índices para mejorar rendimiento  
- ✅ **Integridad**: Referencias foráneas y restricciones
- ✅ **Flexibilidad**: Campos JSON para datos dinámicos

## Instalación y Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo
npm run dev
```

## Notas Importantes

1. **Sin configuración**: La aplicación funciona perfectamente con localStorage
2. **Con configuración**: Proporciona sincronización en la nube
3. **Migración**: Los datos existentes se migran automáticamente la primera vez
4. **Seguridad**: En producción, configurar políticas RLS adecuadas