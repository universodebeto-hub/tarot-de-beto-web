import type { Metadata } from "next";
import { RequestResetForm } from "@/components/auth/RequestResetForm";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  robots: { index: false },
};

export default function RecuperarPasswordPage() {
  return (
    <section className="py-[88px]">
      <div className="container mx-auto max-w-[1180px] px-7">
        <div className="mx-auto max-w-md text-center">
          <span className="eyebrow justify-center">Mi cuenta</span>
          <h1 className="mt-3">
            Recupera tu <em>contraseña</em>
          </h1>
          <p className="mb-0">Escribe el correo con el que te registraste.</p>
        </div>
        <Reveal className="mx-auto mt-10 max-w-md">
          <RequestResetForm />
        </Reveal>
      </div>
    </section>
  );
}
