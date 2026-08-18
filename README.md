# Tarot de Beto

Plataforma web de la marca **Universo de Beto** (Alberto Arango, "Beto"): sitio de presentación, catálogo de servicios, agenda, reservas, pagos con PayPal y panel administrativo.

Construido con Next.js (App Router) + TypeScript + Tailwind CSS. El resto del stack (PostgreSQL + Prisma, NextAuth, PayPal) se incorpora progresivamente por fases.

## Requisitos

- Node.js 20.19+ o 22.13+
- npm

## Empezar

```bash
npm install
cp .env.example .env.local   # completar valores
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Estructura

```
/app                    rutas (App Router)
/components/ui          componentes atómicos reutilizables (Button, Modal, Toast...)
/components/layout      Navbar, Footer, WhatsAppButton
/components/sections    bloques de página (Hero, ServiceGrid, Testimonials, FAQ...)
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

Ver `.env.example`. Las variables `NEXT_PUBLIC_*` son públicas (visibles en el navegador); el resto son secretos de servidor y nunca deben exponerse en el frontend.

## Estado del proyecto

En construcción por fases. Fase actual: **Fase 1 — Diseño visual**.
