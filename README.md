# Nilo Cam

PWA para eventos con QR — landing personalizable por evento, subida/captura de fotos desde móvil, galería en tiempo real, moderación, sistema de créditos y pagos integrados.

## Características

### Landing pública por evento
- URL propia por slug (`/e/[slug]`)
- Secciones configurables: hero, CTA, galería, footer
- Tema de color, logo, imagen de portada (mín. 1200×630 px)
- Modo galería: grid o slider con autoplay
- Política de filtros y plantillas: libre, ninguna, o forzada
- Watermark configurable (posición, tamaño, opacidad)
- Subida y captura de fotos desde Android/iOS sin instalar nada
- Editor de filtros y plantillas en el cliente

### Galería en vivo
- Fotos en tiempo real vía Supabase Realtime
- Moderación por foto: `pending` → `approved` / `rejected`
- Solo las fotos aprobadas aparecen en la galería pública

### Sistema de créditos
- Cada acción (crear evento, packs de fotos) cuesta créditos
- Créditos de bienvenida configurables desde el panel
- Historial completo de transacciones por usuario
- Panel de créditos para el owner con botón "Comprar créditos"

### Métodos de pago (configurables desde el super admin)
- **Stripe** — tarjeta de crédito/débito (PaymentIntents + webhooks)
- **PayPal** — sandbox y live, configurados desde el panel sin env vars
- **Transferencia bancaria** — el usuario sube comprobante, el admin aprueba manualmente
- Precio del crédito editable desde el panel (default $1.00 USD)

### Panel de administración (super admin)
| Pestaña | Contenido |
|---------|-----------|
| Estadísticas | Métricas globales, fotos recientes, top eventos |
| Eventos | Buscar, filtrar, activar/desactivar, eliminar |
| Usuarios | CRUD completo, ban, reset de contraseña, ajuste de créditos |
| Precios | Tabla de precios de créditos por acción |
| Créditos | Historial de transacciones global |
| Pagos → Configuración | Stripe, PayPal, transferencia bancaria |
| Pagos → Compras | Cola de aprobación de compras pendientes |

### Autenticación
- Login con correo + contraseña (sin magic links)
- Recuperación de contraseña
- Endpoint `/api/auth/bootstrap` para crear/reparar acceso sin confirmación por email

---

## Ejecutar en local

```bash
npm install
npm run dev
```

---

## Configuración de Supabase

### 1. Tablas y schema base
Ejecuta en **SQL Editor** en este orden:

```
supabase/schema.sql          ← tablas, triggers, policies base
supabase/seed.sql            ← evento demo (opcional)
supabase/super-admin.sql     ← marca tu usuario como super_admin
```

### 2. Sistema de pagos
```
supabase/setup-payments-complete.sql   ← tablas payment_settings + credit_purchases
                                          + funciones RPC SECURITY DEFINER
```
> Este archivo es idempotente — seguro de re-ejecutar.

### 3. Auth → URL Configuration
- **Site URL:** `https://nilocam.vercel.app`
- **Redirect URL:** `https://nilocam.vercel.app/auth/callback`

### 4. Auth → Providers → Email
- Activa login con correo y contraseña
- Desactiva "Confirm email" para flujo inmediato (recomendado)

### 5. Storage
- Verifica que exista el bucket `event-photos` y que sea **público para lectura**

---

## Variables de entorno

Crea `.env.local` con:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> Las credenciales de Stripe, PayPal y datos bancarios se configuran directamente desde el **panel super admin → Pagos → Configuración**. No se necesitan variables de entorno adicionales para pagos.

---

## Deploy en Vercel

1. Conecta el repo en Vercel
2. Agrega las 3 variables de entorno arriba
3. Deploy — no se necesita ninguna configuración adicional

---

## Estructura de archivos relevante

```
src/
  app/
    api/
      auth/bootstrap/       ← crear/reparar acceso
      admin/                ← endpoints super admin (users, pricing, credits, purchases, payment-settings)
      credits/              ← balance, crear evento con créditos, comprar créditos
      events/[id]/          ← CRUD eventos + fotos
      photos/[id]/          ← moderar fotos
      payment-settings/     ← endpoint público (sin secrets)
      payments/
        stripe/             ← create-intent, confirm, webhook
        paypal/             ← create-order, capture-order
        bank-transfer/      ← registrar transferencia pendiente
  components/
    super-admin-panel.tsx   ← panel completo super admin
    admin-dashboard.tsx     ← panel owner/admin
    buy-credits-modal.tsx   ← modal de compra (Stripe / PayPal / banco)
    credits-panel.tsx       ← panel de créditos del usuario
supabase/
  schema.sql
  seed.sql
  super-admin.sql
  setup-payments-complete.sql   ← ⬅ ejecutar para habilitar pagos
```
