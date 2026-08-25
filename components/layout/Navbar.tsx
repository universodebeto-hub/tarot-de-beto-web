"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { buildWhatsAppLink } from "@/config/site";
import { Button } from "@/components/ui/Button";

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/quienes-somos", label: "Quiénes somos" },
  { href: "/servicios", label: "Servicios" },
  { href: "/agenda", label: "Agenda" },
  { href: "/#referencias", label: "Referencias" },
  { href: "/faq", label: "Preguntas frecuentes" },
  { href: "/contacto", label: "Contacto" },
];

interface NavbarProps {
  whatsappNumber: string;
  userFirstName?: string | null;
}

export function Navbar({ whatsappNumber, userFirstName }: NavbarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header sticky top-0 z-[100] flex h-(--header-h) items-center border-b border-white/10 bg-carbon/78 backdrop-blur-2xl backdrop-saturate-150">
      <div className="container mx-auto flex w-full max-w-[1180px] items-center justify-between px-7">
        <Link href="/" className="flex shrink-0 items-center gap-3" onClick={() => setOpen(false)}>
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center">
            <span
              className="absolute inset-0 rounded-full bg-gold/30 blur-lg"
              aria-hidden="true"
            />
            <Image
              src="/assets/logo/icon-512.png"
              alt=""
              width={56}
              height={56}
              className="relative drop-shadow-[0_0_10px_rgba(232,163,61,0.9)] drop-shadow-[0_0_22px_rgba(232,163,61,0.55)]"
              priority
            />
          </span>
          <span className="whitespace-nowrap font-display italic text-xl text-gold-soft">
            <strong className="font-medium not-italic text-bone">Tarot</strong> de Beto
          </span>
        </Link>

        <button
          type="button"
          aria-label="Abrir menú"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-gold/30 text-gold sm:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <nav
          className={`main-nav flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5
            ${open ? "flex" : "hidden"} sm:flex
            fixed sm:static left-0 right-0 top-(--header-h) sm:top-auto
            border-b sm:border-b-0 border-white/10 bg-carbon/95 sm:bg-transparent backdrop-blur-2xl sm:backdrop-blur-none
            px-5 py-3.5 sm:p-0`}
        >
          {NAV_LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href.split("#")[0]) && link.href !== "/#referencias";
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded-full border px-5 py-2.5 text-center font-mono text-[12.5px] uppercase tracking-[0.14em] transition-all
                  ${active
                    ? "border-transparent bg-gradient-to-br from-gold-soft to-gold text-obsidian"
                    : "border-transparent text-bone-dim hover:border-gold/30 hover:bg-gold/6 hover:text-gold-soft"}`}
              >
                {link.label}
              </Link>
            );
          })}

          <div className="mt-2 flex flex-col gap-2 sm:mt-0 sm:ml-2 sm:flex-row">
            <Link
              href={userFirstName ? "/dashboard" : "/login"}
              onClick={() => setOpen(false)}
              className="rounded-full border px-5 py-2.5 text-center font-mono text-[12.5px] uppercase tracking-[0.14em] text-bone-dim border-transparent hover:border-gold/30 hover:bg-gold/6 hover:text-gold-soft transition-all"
            >
              {userFirstName ? `Hola, ${userFirstName}` : "Iniciar sesión"}
            </Link>
            <Button href="/agenda" variant="gold" className="justify-center">
              Reservar consulta
            </Button>
            {whatsappNumber ? (
              <Button
                href={buildWhatsAppLink(
                  whatsappNumber,
                  "Hola Beto, estoy interesado en reservar una consulta.",
                )}
                external
                variant="ghost"
                className="justify-center"
              >
                WhatsApp
              </Button>
            ) : null}
          </div>
        </nav>
      </div>
    </header>
  );
}
