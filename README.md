# LC-LAB Studio Suite

Sistema de gestión para estudio fotográfico - Catálogo, reservas, pedidos, POS y reportes.

## Características

- **Gestión de productos**: Catálogo de anuarios, diplomas, sesiones y paquetes
- **Punto de venta (POS)**: Sistema de ventas rápido con carrito persistente
- **Gestión de clientes**: Base de datos de clientes con documentos
- **Reservas**: Agenda de sesiones fotográficas
- **Pedidos**: Historial de ventas con generación de PDF
- **Transacciones**: Gestión de pagos (efectivo, Yape, Plin, tarjeta)
- **Reportes**: Análisis de ventas con exportación a Excel y PDF
- **Gestión de usuarios**: Control de roles (admin, staff, cliente)

## Tecnologías

- React 19 con TypeScript
- TanStack Router (routing)
- TanStack Query (data fetching)
- Supabase (backend, auth, database)
- TailwindCSS (estilos)
- shadcn/ui (componentes)
- Recharts (gráficos)
- jsPDF (generación de PDF)

## Variables de Entorno

Crea un archivo `.env` con las siguientes variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Despliegue en Vercel

### Variables de Entorno en Vercel

Configura estas variables en tu proyecto Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Configuración de Base de Datos

1. Ejecuta las migraciones de Supabase en orden:
   - `20260526012605_fc18338b-3d0e-4095-8b30-a554deffcab6.sql` (migración inicial)
   - `20260526012621_b9223e67-bab7-4e62-b7a5-454922806738.sql`
   - `20260528014326_8824c4dc-ff9d-42e3-9f42-896d377d7ff1.sql`
   - `20260528015847_e3d7a92d-db6c-40ef-80af-86d233e3ed18.sql`
   - `20260530052526_8d3d8831-57d6-46db-b272-f1ddcc75b7ee.sql`
   - `20260530060000_fix_rls_policies.sql`
   - `20260530070000_fix_user_registration.sql`

2. Configura el bucket de almacenamiento `lc-lab-images` en Supabase Storage

### Roles de Usuario

- **Admin**: Acceso completo a todas las funcionalidades
- **Staff**: Acceso a POS, reservas, pedidos, transacciones (solo lectura en productos y clientes)
- **Cliente**: Para futuro portal de clientes

El primer usuario registrado será admin automáticamente. Los usuarios posteriores se registran sin rol y deben ser asignados por un admin desde la sección "Usuarios".

## Seguridad

- RLS (Row Level Security) habilitado en todas las tablas
- Solo admin puede crear/editar/eliminar productos y clientes
- Staff solo puede ver productos y clientes (solo lectura)
- Service role key requerida para operaciones de admin (gestión de usuarios)
