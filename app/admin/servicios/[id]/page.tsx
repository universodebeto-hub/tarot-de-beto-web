import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServiceById } from "@/server/services";
import { updateServiceAdmin } from "@/server/admin/services";
import type { AdminFormState } from "@/server/admin/services";
import { ServiceForm } from "@/components/admin/ServiceForm";

export const metadata: Metadata = { title: "Panel — Editar servicio" };

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await getServiceById(id);
  if (!service) notFound();

  async function action(prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
    "use server";
    const result = await updateServiceAdmin(id, prev, formData);
    if (result.success) {
      revalidatePath("/admin/servicios");
      revalidatePath("/servicios");
      revalidatePath("/");
      revalidatePath("/agenda");
    }
    return result;
  }

  return (
    <div>
      <span className="eyebrow mb-4 block">Editar servicio</span>
      <ServiceForm action={action} service={service} submitLabel="Guardar cambios" />
    </div>
  );
}
