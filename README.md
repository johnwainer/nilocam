# Nilo Cam

Sistema PWA para eventos con QR, landing personalizable, editor de fotos y muro en tiempo real.

## Incluye

- Landing pública por evento
- Admin para crear/editar eventos
- 10 tipos de evento iniciales
- Botones de CTA repetidos en todo el flujo
- Subida o captura de fotos desde Android/iOS sin instalar nada
- Editor simple de filtros y plantillas
- Galería en vivo con soporte de moderación
- Base de datos preparada para Supabase
- Diseño blanco y negro con logo del gato espía

## Ejecutar

```bash
npm install
npm run dev
```

## Supabase

Ejecuta estos pasos en Supabase:

1. Pega y corre `supabase/schema.sql`.
2. Pega y corre `supabase/seed.sql` si quieres el evento demo.
3. Crea tu usuario en Auth y luego corre `supabase/super-admin.sql` para marcarlo como `super_admin`.
4. En Auth > URL Configuration agrega:
   - Site URL: `https://nilocam.vercel.app`
   - Redirect URL: `https://nilocam.vercel.app/auth/callback`
5. En Auth > Providers > Email activa login con correo y contraseña. Si quieres que el registro sea inmediato, desactiva la confirmación por email; si la dejas activa, el usuario deberá confirmar antes de entrar.
6. Verifica que exista el bucket `event-photos` y que sea público para lectura.

El panel ya no usa magic links para entrar. El acceso normal ahora es por correo + contraseña, con registro, login y recuperación de contraseña.

El archivo `supabase/schema.sql` ya crea tablas, triggers y policies para la versión actual de la app. Variables de entorno requeridas:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` para los endpoints del servidor

## Siguiente paso recomendado

Conectar el store local de desarrollo al backend de Supabase para que el muro sea compartido entre dispositivos y no solo entre pestañas del mismo navegador.
