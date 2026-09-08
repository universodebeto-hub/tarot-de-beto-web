import type { Metadata } from "next";
import { getManualPaymentInstructions, getFaqItems, getSetting } from "@/server/settings";
import { listManualPaymentMethodsAdmin } from "@/server/admin/payment-methods";
import { getPaymentMethodLogoOverrides } from "@/server/payment-methods";
import { PAYMENT_METHOD_LABEL, PAYMENT_METHOD_LOGO_SLUG } from "@/lib/booking-labels";
import { GlassCard } from "@/components/ui/GlassCard";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { ManualPaymentInstructionsForm } from "@/components/admin/ManualPaymentInstructionsForm";
import { FaqEditorForm } from "@/components/admin/FaqEditorForm";
import { ReminderHoursForm } from "@/components/admin/ReminderHoursForm";
import { FixedMethodLogoEditor } from "@/components/admin/FixedMethodLogoEditor";
import { ManualPaymentMethodsManager } from "@/components/admin/ManualPaymentMethodsManager";
import type { PaymentMethod } from "@prisma/client";

export const metadata: Metadata = { title: "Panel — Configuración", robots: { index: false } };

const FIXED_METHODS: PaymentMethod[] = [
  "PAGO_MOVIL",
  "ZELLE",
  "BINANCE",
  "REMITLY",
  "WESTERN_UNION",
  "MONEYGRAM",
  "BANCOLOMBIA",
];

export default async function AdminSettingsPage() {
  const [manualPayment, faqItems, reminderHours, customMethods, logoOverrides] = await Promise.all([
    getManualPaymentInstructions(),
    getFaqItems(),
    getSetting<number[]>("reminder_hours_before", [24, 2]),
    listManualPaymentMethodsAdmin(),
    getPaymentMethodLogoOverrides(),
  ]);

  const tabs: TabItem[] = [
    {
      id: "pago",
      label: "Datos de pago",
      content: <ManualPaymentInstructionsForm initial={manualPayment} />,
    },
    {
      id: "metodos",
      label: "Métodos de pago",
      content: (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <span className="eyebrow">Logos de los métodos fijos</span>
            <FixedMethodLogoEditor
              methods={FIXED_METHODS.map((m) => ({
                method: m,
                label: PAYMENT_METHOD_LABEL[m],
                logoUrl: logoOverrides[m] ?? `/assets/payment-logos/${PAYMENT_METHOD_LOGO_SLUG[m]}.png`,
              }))}
            />
          </div>
          <div className="flex flex-col gap-3 border-t border-white/10 pt-6">
            <span className="eyebrow">Métodos agregados por vos</span>
            <ManualPaymentMethodsManager methods={customMethods} />
          </div>
        </div>
      ),
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
