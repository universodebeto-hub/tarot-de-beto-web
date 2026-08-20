import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { listSettingsAdmin, upsertSettingAdmin } from "@/server/admin/settings";
import { GlassCard } from "@/components/ui/GlassCard";
import { SettingRow } from "@/components/admin/SettingRow";

export const metadata: Metadata = { title: "Panel — Configuración" };

async function saveAction(key: string, prev: { error?: string; success?: boolean }, formData: FormData) {
  "use server";
  const result = await upsertSettingAdmin(key, prev, formData);
  if (result.success) {
    revalidatePath("/admin/configuracion");
    revalidatePath("/faq");
    revalidatePath("/");
  }
  return result;
}

export default async function AdminSettingsPage() {
  const settings = await listSettingsAdmin();

  return (
    <div className="flex flex-col gap-6">
      <GlassCard>
        <p className="mb-0 text-sm text-bone-dim">
          Configuración clave/valor (JSON). Se lee en todo el sitio sin necesitar redeploy — por ejemplo
          <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 text-xs">faq_items</code>
          controla las preguntas frecuentes de Inicio y{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">/faq</code>. Editar con cuidado: el valor
          debe ser JSON válido.
        </p>
      </GlassCard>

      {settings.map((s) => (
        <SettingRow key={s.key} settingKey={s.key} value={s.value} action={saveAction.bind(null, s.key)} />
      ))}
    </div>
  );
}
