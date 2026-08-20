import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  // La protección real ya la hace proxy.ts; esta comprobación es defensa en
  // profundidad y además nos da los datos del admin para el layout.
  if (!user || user.role !== "ADMIN") redirect("/login?callbackUrl=/admin");

  return (
    <section className="py-16">
      <div className="container mx-auto max-w-[1180px] px-7">
        <div className="mb-8">
          <span className="eyebrow">Panel administrativo</span>
          <h1 className="mt-3 mb-0">
            Hola, <em>{user.firstName}</em>
          </h1>
        </div>
        <div className="flex flex-col gap-8 lg:flex-row">
          <AdminSidebar />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </section>
  );
}
