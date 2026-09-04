"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buildWhatsAppLink } from "@/config/site";
import { Button } from "@/components/ui/Button";
import { logoutUser } from "@/server/auth";

const NAV_LINKS = [
  { href: "/quienes-somos", label: "Quiénes somos" },
  { href: "/servicios", label: "Servicios" },
  { href: "/tarotistas", label: "Tarotistas" },
  { href: "/#referencias", label: "Referencias" },
  { href: "/faq", label: "Preguntas frecuentes" },
  { href: "/contacto", label: "Contacto" },
];

interface NavbarProps {
  whatsappNumber: string;
  userFirstName?: string | null;
  /** "/panel-tarotista" si la cuenta logueada es un tarotista, "/dashboard" en caso contrario. */
  accountHref?: string;
}

export function Navbar({ whatsappNumber, userFirstName, accountHref = "/dashboard" }: NavbarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header sticky top-0 z-[100] flex min-h-(--header-h) items-center border-b border-white/10 bg-carbon/78 py-2 backdrop-blur-2xl backdrop-saturate-150">
      <div className="container mx-auto flex w-full max-w-[1180px] items-center justify-between px-7">
        <Link
          href="/"
          aria-label="Ir al inicio — Tarot de Beto"
          className="group flex shrink-0 items-center gap-3"
          onClick={() => setOpen(false)}
        >
          <span className="relative flex h-[58px] w-[58px] shrink-0 items-center justify-center">
            <span
              className="absolute -inset-2 rounded-full bg-[radial-gradient(circle,rgba(232,163,61,0.45)_0%,rgba(232,163,61,0)_72%)] transition-opacity group-hover:opacity-80"
              aria-hidden="true"
            />
            <Image
              src="/assets/logo/icon-512.png"
              alt=""
              width={52}
              height={52}
              className="relative drop-shadow-[0_0_10px_rgba(232,163,61,0.9)]"
              priority
            />
          </span>
          <span className="flex flex-col items-start leading-none">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.55em] text-ash">Tarot de</span>
            <span className="bg-gradient-to-br from-gold-soft via-gold to-ember bg-clip-text font-display text-[42px] font-semibold tracking-wide text-transparent drop-shadow-[0_0_22px_rgba(232,163,61,0.35)]">
              Beto
            </span>
            <span className="mt-1 h-px w-full bg-gradient-to-r from-gold/70 via-gold/25 to-transparent" aria-hidden="true" />
          </span>
        </Link>

        <button
          type="button"
          aria-label="Abrir menú"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-gold/30 text-gold lg:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <nav
          className={`main-nav flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end lg:gap-2.5
            ${open ? "flex" : "hidden"} lg:flex
            fixed lg:static left-0 right-0 top-(--header-h) lg:top-auto
            border-b lg:border-b-0 border-white/10 bg-carbon/95 lg:bg-transparent backdrop-blur-2xl lg:backdrop-blur-none
            px-5 py-3.5 lg:p-0 max-h-[calc(100vh-var(--header-h))] overflow-y-auto lg:max-h-none lg:overflow-visible`}
        >
          {NAV_LINKS.map((link) => {
            const active =
              link.href !== "/#referencias" && pathname.startsWith(link.href.split("#")[0]);
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

          <div className="mt-2 flex flex-col gap-2 lg:mt-0 lg:ml-2 lg:flex-row lg:items-center">
            {userFirstName ? (
              <AccountMenu userFirstName={userFirstName} accountHref={accountHref} onNavigate={() => setOpen(false)} />
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-full border border-transparent px-5 py-2.5 text-center font-mono text-[12.5px] uppercase tracking-[0.14em] text-bone-dim transition-all hover:border-gold/30 hover:bg-gold/6 hover:text-gold-soft"
              >
                Iniciar sesión
              </Link>
            )}

            <Button href="/tarotistas" variant="gold" className="justify-center">
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

interface AccountMenuProps {
  userFirstName: string;
  accountHref: string;
  onNavigate: () => void;
}

/** Un solo control compacto (avatar + nombre) que despliega "Mi cuenta" / "Cerrar sesión" -- reemplaza los dos botones sueltos que antes empujaban el menú a una segunda línea. */
function AccountMenu({ userFirstName, accountHref, onNavigate }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all
          ${open ? "border-gold/30 bg-gold/6" : "border-transparent hover:border-gold/30 hover:bg-gold/6"}`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-soft to-gold font-display text-[14px] font-semibold text-obsidian">
          {userFirstName.charAt(0).toUpperCase()}
        </span>
        <span className="max-w-[110px] truncate font-mono text-[12.5px] uppercase tracking-[0.1em] text-bone-dim">
          {userFirstName}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className={`h-3.5 w-3.5 shrink-0 text-ash transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 overflow-hidden rounded-2xl border border-white/10 bg-carbon shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
        >
          <Link
            href={accountHref}
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onNavigate();
            }}
            className="block px-4 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-bone-dim transition-colors hover:bg-gold/8 hover:text-gold-soft"
          >
            Mi cuenta
          </Link>
          <div className="h-px bg-white/10" />
          <form action={logoutUser}>
            <button
              type="submit"
              role="menuitem"
              onClick={onNavigate}
              className="block w-full px-4 py-3 text-left font-mono text-[12px] uppercase tracking-[0.1em] text-bone-dim transition-colors hover:bg-gold/8 hover:text-gold-soft"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
