"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  s: number;
  p: number;
}

interface FloatingGlyph {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  rot: number;
  rotSpeed: number;
  opacity: number;
  glyph?: string;
}

const RUNES = ["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚷ", "ᚹ", "ᚺ", "ᚾ", "ᛁ", "ᛃ", "ᛇ", "ᛈ", "ᛉ", "ᛊ", "ᛏ", "ᛒ", "ᛖ", "ᛗ", "ᛚ", "ᛜ", "ᛞ", "ᛟ"];

function drawCard(ctx: CanvasRenderingContext2D, w: number, opacity: number) {
  const h = w * 1.55;
  ctx.strokeStyle = `rgba(232,163,61,${opacity})`;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, w * 0.14);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, w * 0.1, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(232,163,61,${opacity * 0.8})`;
  ctx.stroke();
}

function drawCandle(ctx: CanvasRenderingContext2D, w: number, opacity: number) {
  const bodyH = w * 2.4;
  ctx.strokeStyle = `rgba(232,163,61,${opacity})`;
  ctx.fillStyle = `rgba(232,163,61,${opacity * 0.35})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -bodyH / 2, w, bodyH, w * 0.18);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  const flameY = -bodyH / 2;
  ctx.moveTo(0, flameY - w * 0.9);
  ctx.quadraticCurveTo(w * 0.45, flameY - w * 0.2, 0, flameY + w * 0.15);
  ctx.quadraticCurveTo(-w * 0.45, flameY - w * 0.2, 0, flameY - w * 0.9);
  ctx.fillStyle = `rgba(240,196,122,${opacity * 0.9})`;
  ctx.fill();
}

/**
 * Campo de fondo místico: estrellas titilando + runas, cartas de tarot y
 * velas flotando muy lento hacia arriba, todo en dorado muy tenue. Se
 * detiene por completo si el usuario prefiere menos movimiento.
 */
export function StarsField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let stars: Star[] = [];
    let runes: FloatingGlyph[] = [];
    let cards: FloatingGlyph[] = [];
    let candles: FloatingGlyph[] = [];
    let width = 0;
    let height = 0;
    let frameId = 0;

    function makeGlyphs(count: number, sizeMin: number, sizeMax: number, speedMin: number, speedMax: number): FloatingGlyph[] {
      return Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height + height,
        size: Math.random() * (sizeMax - sizeMin) + sizeMin,
        speed: Math.random() * (speedMax - speedMin) + speedMin,
        drift: Math.random() * 0.3 - 0.15,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.0015,
        opacity: Math.random() * 0.1 + 0.05,
      }));
    }

    function resize() {
      width = canvas!.width = window.innerWidth;
      height = canvas!.height = window.innerHeight;
      const area = width * height;

      const starCount = Math.min(90, Math.floor(area / 22000));
      stars = Array.from({ length: starCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.1 + 0.2,
        s: Math.random() * 0.015 + 0.003,
        p: Math.random() * Math.PI * 2,
      }));

      const runeCount = Math.min(26, Math.max(10, Math.floor(area / 90000)));
      runes = makeGlyphs(runeCount, 20, 40, 0.05, 0.2).map((g) => ({
        ...g,
        glyph: RUNES[Math.floor(Math.random() * RUNES.length)],
      }));

      const cardCount = Math.min(7, Math.max(3, Math.floor(area / 340000)));
      cards = makeGlyphs(cardCount, 22, 34, 0.03, 0.12);

      const candleCount = Math.min(6, Math.max(2, Math.floor(area / 400000)));
      candles = makeGlyphs(candleCount, 14, 20, 0.025, 0.095);
    }

    function stepGlyphs(list: FloatingGlyph[], draw: (g: FloatingGlyph) => void) {
      for (const g of list) {
        g.y -= g.speed;
        g.x += g.drift * 0.2;
        g.rot += g.rotSpeed;
        if (g.y < -60) {
          g.y = height + 60;
          g.x = Math.random() * width;
        }
        ctx!.save();
        ctx!.translate(g.x, g.y);
        ctx!.rotate(g.rot);
        draw(g);
        ctx!.restore();
      }
    }

    function tick(t: number) {
      ctx!.clearRect(0, 0, width, height);

      for (const star of stars) {
        const twinkle = 0.35 + Math.sin(t * star.s + star.p) * 0.35;
        ctx!.beginPath();
        ctx!.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(232,163,61,${0.25 + twinkle * 0.4})`;
        ctx!.fill();
      }

      stepGlyphs(runes, (g) => {
        ctx!.font = `${g.size}px serif`;
        ctx!.fillStyle = `rgba(232,163,61,${g.opacity})`;
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.fillText(g.glyph!, 0, 0);
      });
      stepGlyphs(cards, (g) => drawCard(ctx!, g.size, g.opacity));
      stepGlyphs(candles, (g) => drawCandle(ctx!, g.size, g.opacity));

      frameId = requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener("resize", resize);
    frameId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <>
      <div className="sky" aria-hidden="true" />
      <canvas ref={canvasRef} id="stars" aria-hidden="true" />
    </>
  );
}
