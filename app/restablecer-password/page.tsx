import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Restablecer contraseña",
};

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function RestablecerPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return (
    <section className="py-[88px]">
      <div className="container mx-auto max-w-[1180px] px-7">
        <div className="mx-auto max-w-md text-center">
          <span className="eyebrow justify-center">Mi cuenta</span>
          <h1 className="mt-3">
            Nueva <em>contraseña</em>
          </h1>
        </div>
        <div className="mx-auto mt-10 max-w-md">
          {token ? (
            <Reveal>
              <ResetPasswordForm token={token} />
            </Reveal>
          ) : (
            <EmptyState
              title="Enlace incompleto"
              description="Este enlace no incluye un token válido. Solicita uno nuevo desde 'Recuperar contraseña'."
            />
          )}
        </div>
      </div>
    </section>
  );
}
