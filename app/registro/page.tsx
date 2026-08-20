import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Crear cuenta",
  robots: { index: false },
};

export default function RegistroPage() {
  return (
    <section className="py-[88px]">
      <div className="container mx-auto max-w-[1180px] px-7">
        <div className="mx-auto max-w-md text-center">
          <span className="eyebrow justify-center">Mi cuenta</span>
          <h1 className="mt-3">
            Crea tu <em>cuenta</em>
          </h1>
          <p className="mb-0">Solo lo esencial — puedes completar el resto de tu perfil después.</p>
        </div>
        <Reveal className="mx-auto mt-10 max-w-md">
          <RegisterForm />
        </Reveal>
      </div>
    </section>
  );
}
