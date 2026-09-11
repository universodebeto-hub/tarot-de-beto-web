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
import { TikTokConnectionPanel } from "@/components/admin/TikTokConnectionPanel";
import { isTikTokConnected, getTikTokSectionData } from "@/server/tiktok";
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

interface PageProps {
  searchParams: Promise<{ tiktok_connected?: string; tiktok_error?: string }>;
}

export default async function AdminSettingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [manualPayment, faqItems, reminderHours, customMethods, logoOverrides, tiktokConnected, tiktokData] = await Promise.all([
    getManualPaymentInstructions(),
    getFaqItems(),
    getSetting<number[]>("reminder_hours_before", [24, 2]),
    listManualPaymentMethodsAdmin(),
    getPaymentMethodLogoOverrides(),
    isTikTokConnected(),
    getTikTokSectionData(),
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
    {
      id: "redes",
      label: "Redes sociales",
      content: (
        <TikTokConnectionPanel
          connected={tiktokConnected}
          profile={tiktokData ? { displayName: tiktokData.profile.displayName, avatarUrl: tiktokData.profile.avatarUrl, followerCount: tiktokData.profile.followerCount } : null}
          notice={params.tiktok_connected ? "TikTok conectado correctamente." : undefined}
          noticeError={params.tiktok_error}
        />
      ),
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
