"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  s: number;
  p: number;
}

/** Campo de estrellas discreto sobre el fondo místico. Se detiene si el usuario prefiere menos movimiento. */
export function StarsField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let stars: Star[] = [];
    let width = 0;
    let height = 0;
    let frameId = 0;

    function resize() {
      width = canvas!.width = window.innerWidth;
      height = canvas!.height = window.innerHeight;
      const count = Math.min(90, Math.floor((width * height) / 22000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.1 + 0.2,
        s: Math.random() * 0.015 + 0.003,
        p: Math.random() * Math.PI * 2,
      }));
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
