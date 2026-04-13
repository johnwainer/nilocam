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

## Ejecutar

```bash
npm install
npm run dev
```

## Supabase

El archivo `supabase/schema.sql` trae la base para eventos y fotos. Falta conectar las variables de entorno y, si quieres pasar esto a producción con persistencia real, integrar:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Siguiente paso recomendado

Conectar el store local de desarrollo al backend de Supabase para que el muro sea compartido entre dispositivos y no solo entre pestañas del mismo navegador.
