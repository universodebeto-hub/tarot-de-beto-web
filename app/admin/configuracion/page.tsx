import type { Metadata } from "next";
import { getManualPaymentInstructions, getFaqItems, getSetting } from "@/server/settings";
import { GlassCard } from "@/components/ui/GlassCard";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { ManualPaymentInstructionsForm } from "@/components/admin/ManualPaymentInstructionsForm";
import { FaqEditorForm } from "@/components/admin/FaqEditorForm";
import { ReminderHoursForm } from "@/components/admin/ReminderHoursForm";

export const metadata: Metadata = { title: "Panel — Configuración", robots: { index: false } };

export default async function AdminSettingsPage() {
  const [manualPayment, faqItems, reminderHours] = await Promise.all([
    getManualPaymentInstructions(),
    getFaqItems(),
    getSetting<number[]>("reminder_hours_before", [24, 2]),
  ]);

  const tabs: TabItem[] = [
    {
      id: "pago",
      label: "Datos de pago",
      content: <ManualPaymentInstructionsForm initial={manualPayment} />,
    },
    {
      id: "faq",
      label: "Preguntas frecuentes",
      content: <FaqEditorForm initial={faqItems} />,
    },
    {
      id: "recordatorios",
      label: "Recordatorios",
      content: <ReminderHoursForm initial={reminderHours} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <GlassCard>
        <p className="mb-0 text-sm text-bone-dim">
          Los cambios se ven en la web al instante, sin necesitar un redeploy.
        </p>
      </GlassCard>

      <GlassCard>
        <Tabs items={tabs} />
      </GlassCard>
    </div>
  );
}
