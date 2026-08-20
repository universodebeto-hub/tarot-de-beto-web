import Link from "next/link";

const LINKS = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/reservas", label: "Reservas" },
  { href: "/admin/calendario", label: "Calendario" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/servicios", label: "Servicios" },
  { href: "/admin/testimonios", label: "Testimonios" },
  { href: "/admin/configuracion", label: "Configuración" },
];

export function AdminSidebar() {
  return (
    <nav className="flex flex-col gap-1 lg:w-56 lg:shrink-0">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-lg px-4 py-2.5 font-mono text-[12px] uppercase tracking-wide text-bone-dim transition-colors hover:bg-gold/8 hover:text-gold-soft"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
