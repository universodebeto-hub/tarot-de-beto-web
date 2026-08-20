import { config } from "dotenv";
import path from "path";

// Debe cargarse antes de que cualquier test importe `lib/prisma.ts` (el
// PrismaClient lee `DATABASE_URL` al construirse, en el top-level del
// módulo) — por eso vive en `setupFiles`, no en un test individual.
config({ path: path.resolve(__dirname, "../.env.test") });
