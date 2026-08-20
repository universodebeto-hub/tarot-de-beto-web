// Vitest corre en Node plano, sin el aliasing de webpack que Next.js usa
// para convertir `server-only` en un no-op dentro de bundles de servidor
// (fuera de Next, ese paquete siempre lanza un error al importarse — ver
// node_modules/server-only/index.js). Este stub reemplaza esa importación
// solo dentro de los tests (ver vitest.config.ts → resolve.alias).
export {};
