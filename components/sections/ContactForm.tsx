"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { buildWhatsAppLink } from "@/config/site";
import { GlassCard } from "@/components/ui/GlassCard";
import { useToast } from "@/components/ui/Toast";

interface ContactFormProps {
  whatsappNumber: string;
}

/**
 * Formulario de contacto. Sin backend todavía (llega en Fase 2+), así que
 * en vez de simular un "envío" falso, compone un mensaje real de WhatsApp
 * con los datos ingresados — comportamiento honesto y funcional desde ya.
 */
export function ContactForm({ whatsappNumber }: ContactFormProps) {
  const { push } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot antispam

  const canSubmit = name.trim() && message.trim() && !website;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    if (!whatsappNumber) {
      push("El contacto por WhatsApp aún no está configurado.", "error");
      return;
    }

    const text = [
      `Hola Beto, soy ${name.trim()}.`,
      email.trim() ? `Mi correo: ${email.trim()}.` : null,
      message.trim(),
    ]
      .filter(Boolean)
      .join(" ");

    window.open(buildWhatsAppLink(whatsappNumber, text), "_blank", "noopener,noreferrer");
    push("Te llevamos a WhatsApp para enviar tu mensaje.", "success");
  }

  return (
    <GlassCard className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="name" className="mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-ash">
            Nombre
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-bone outline-none focus:border-gold/50"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-ash">
            Email (opcional)
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-bone outline-none focus:border-gold/50"
          />
        </div>

        <div>
          <label htmlFor="message" className="mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-ash">
            Mensaje
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={4}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-bone outline-none focus:border-gold/50"
          />
        </div>

        {/* honeypot: campo oculto para bots, invisible para personas */}
        <input
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden="true"
        />

        <button type="submit" disabled={!canSubmit} className="btn btn-gold self-start">
          Enviar por WhatsApp
        </button>
      </form>
    </GlassCard>
  );
}
