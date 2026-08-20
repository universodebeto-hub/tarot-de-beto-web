import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { createServiceAdmin } from "@/server/admin/services";
import type { AdminFormState } from "@/server/admin/services";
import { ServiceForm } from "@/components/admin/ServiceForm";

export const metadata: Metadata = { title: "Panel — Nuevo servicio" };

async function action(prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  "use server";
  const result = await createServiceAdmin(prev, formData);
  if (result.success) {
    revalidatePath("/admin/servicios");
    revalidatePath("/servicios");
    revalidatePath("/");
  }
  return result;
}

export default function NewServicePage() {
  return (
    <div>
      <span className="eyebrow mb-4 block">Nuevo servicio</span>
      <ServiceForm action={action} submitLabel="Crear servicio" />
    </div>
  );
}
