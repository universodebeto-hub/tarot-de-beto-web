# Tarot de Beto

Plataforma web de la marca **Universo de Beto** (Alberto Arango, "Beto"): sitio de presentación, catálogo de servicios, agenda, reservas, pagos con PayPal y panel administrativo.

Construido con Next.js (App Router) + TypeScript + Tailwind CSS + Prisma/PostgreSQL. Autenticación propia (Server Actions + bcrypt + JWT en cookie httpOnly — ver sección "Autenticación" más abajo). El resto del stack (PayPal) se incorpora progresivamente por fases.

## Requisitos

- Node.js 20.19+ o 22.13+
- npm
- PostgreSQL 14+ (local o remoto)

## Empezar

```bash
npm install
cp .env.example .env.local   # completar valores (marca, contacto, redes)
```

Crea también un archivo `.env` en la raíz con `DATABASE_URL` — la CLI de Prisma solo lee `.env`, no `.env.local` (Next.js sí lee ambos). Ejemplo:

```
DATABASE_URL="postgresql://usuario:password@localhost:5432/tarot_de_beto"
```

Luego aplica las migraciones y carga los datos iniciales:

```bash
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Base de datos local sin instalador (Windows)

Si no tienes PostgreSQL instalado y no quieres usar el instalador oficial, puedes usar los binarios portátiles (zip) de EnterpriseDB:

1. Descarga `postgresql-<version>-windows-x64-binaries.zip` desde https://www.enterprisedb.com/download-postgresql-binaries y descomprímelo donde quieras (ej. `%LOCALAPPDATA%\Programs\postgresql-portable`).
2. Inicializa el clúster: `bin\initdb.exe -D data -U postgres --pwfile=<archivo con la contraseña>`.
3. (Opcional) cambia el puerto en `data\postgresql.conf` si 5432 ya está en uso.
4. Arranca el servidor: `bin\pg_ctl.exe -D data -l pg.log start`.
5. Crea la base: `bin\createdb.exe -h localhost -U postgres tarot_de_beto`.
6. Usa esa conexión en `DATABASE_URL`.

Este proyecto se desarrolló así (Postgres 16.4 portátil, puerto 5433) por no tener un gestor de paquetes ni Docker disponibles en la máquina de desarrollo.

## Estructura

```
/app                    rutas (App Router)
/components/ui          componentes atómicos reutilizables (Button, Modal, Toast...)
/components/layout      Navbar, Footer, WhatsAppButton
/components/sections    bloques de página (Hero, ServiceGrid, Testimonials, FAQ...)
/components/auth        formularios de login/registro/recuperación (Fase 3)
/config                 siteConfig — configuración central de marca desde env
/lib                     utilidades compartidas
/server                  lógica de servidor (a partir de Fase 2: acceso a datos)
/prisma                  esquema y migraciones de base de datos (Fase 2+)
/public/assets/logo      logo principal/alternativo, favicon
/public/assets/icons     iconos personalizados
/public/assets/images    fotografías, imagen OG
/public/assets/tarot     imágenes de cartas de tarot (decorativo)
/public/assets/backgrounds  texturas de fondo opcionales
/types                   tipos TypeScript compartidos
/hooks                   hooks de React reutilizables
```

## Variables de entorno

Ver `.env.example`. Las variables `NEXT_PUBLIC_*` son públicas (visibles en el navegador); el resto son secretos de servidor y nunca deben exponerse en el frontend. `DATABASE_URL` va en `.env` (no `.env.local`) para que la CLI de Prisma la detecte.

## Base de datos

Prisma + PostgreSQL. Esquema en `prisma/schema.prisma`, seed en `prisma/seed.ts`. Servicios y testimonios publicados se leen en tiempo real desde la base (`server/services.ts`, `server/testimonials.ts`); las páginas que los muestran usan revalidación incremental (`export const revalidate`) para reflejar cambios del panel admin (Fase 7) sin necesitar un redeploy completo.

## Autenticación

Implementación propia (no NextAuth) por estabilidad frente a lo reciente de Next.js 16: Server Actions para registro/login/logout/recuperación (`server/auth.ts`), contraseñas con `bcryptjs`, sesión firmada con `jose` (JWT) en una cookie `httpOnly`/`Secure` (en producción)/`SameSite=Lax`. Rutas protegidas vía `proxy.ts` (el archivo `middleware.ts` fue renombrado a `proxy.ts` en Next.js 16). El envío de emails de recuperación queda pendiente de la Fase 8 (SMTP); mientras tanto el link se registra en la consola del servidor.

### Usuarios de prueba (solo desarrollo — no válidos en producción)

Creados por `prisma/seed.ts`, contraseña `Tarot2026!` para ambos:

- `admin@tarotdebeto.local` — rol `ADMIN` (el panel admin llega en la Fase 7).
- `cliente@tarotdebeto.local` — rol `CLIENT`.

## Estado del proyecto

En construcción por fases. Fase actual: **Fase 3 — Autenticación y área de cliente**.
