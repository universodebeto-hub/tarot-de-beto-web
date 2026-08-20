import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  robots: { index: false },
};

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl } = await searchParams;

  return (
    <section className="py-[88px]">
      <div className="container mx-auto max-w-[1180px] px-7">
        <div className="mx-auto max-w-md text-center">
          <span className="eyebrow justify-center">Mi cuenta</span>
          <h1 className="mt-3">
            Inicia <em>sesión</em>
          </h1>
        </div>
        <Reveal className="mx-auto mt-10 max-w-md">
          <LoginForm callbackUrl={callbackUrl} />
        </Reveal>
      </div>
    </section>
  );
}
