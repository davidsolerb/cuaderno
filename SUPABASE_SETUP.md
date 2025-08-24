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

La aplicación ya no crea automáticamente el schema. Ejecuta el script [`schema.sql`](./schema.sql) en el editor SQL de tu proyecto Supabase para generar todas las tablas con los nombres de columna que el JavaScript espera (se respetan mayúsculas y guiones bajos).

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
5. **Desarrollo local**: Si no hay `config.js`, la app crea uno automáticamente que usa localStorage

### Solución de Problemas

**Error "Invalid URL" al cargar la aplicación:**
- Esto ocurre cuando falta el archivo `config.js` o las credenciales de Supabase están vacías
- **Solución**: La aplicación ahora maneja este caso automáticamente y usa localStorage como respaldo
- Para desarrollo local, se crea automáticamente un `config.js` que permite que la app funcione
- En producción, el workflow de GitHub Pages genera el `config.js` con los secrets del repositorio