import { useEffect, useRef, useState } from "react";
import Head from "next/head";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  hue: number;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -999, y: -999 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const count = Math.min(90, Math.floor((window.innerWidth * window.innerHeight) / 15000));
    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6 - 0.2,
        size: Math.random() * 3 + 1,
        alpha: Math.random() * 0.4 + 0.2,
        hue: Math.random() * 80 + 240,
      });
    }

    const onMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onLeave = () => {
      mouseRef.current = { x: -999, y: -999 };
    };
    window.addEventListener("mousemove", onMouse);
    document.addEventListener("mouseleave", onLeave);

    let animId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Subtle radial gradient overlay
      const grad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.6,
      );
      grad.addColorStop(0, "rgba(30, 20, 60, 0.6)");
      grad.addColorStop(1, "rgba(10, 10, 25, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Update & draw particles
      for (const p of particles) {
        // Mouse repulsion
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120 && dist > 0) {
          const force = (120 - dist) / 120;
          p.vx += (dx / dist) * force * 0.8;
          p.vy += (dy / dist) * force * 0.8;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Damping
        p.vx *= 0.98;
        p.vy *= 0.98;

        // Wrap / respawn
        if (p.y < -20) { p.y = canvas.height + 20; p.x = Math.random() * canvas.width; }
        if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width; }
        if (p.x < -20) p.x = canvas.width + 20;
        if (p.x > canvas.width + 20) p.x = -20;

        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 70%, 65%, ${p.alpha})`;
        ctx.shadowColor = `hsla(${p.hue}, 70%, 65%, 0.4)`;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Connection lines
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        if (!a) continue;
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          if (!b) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = dx * dx + dy * dy;
          if (dist < 200 * 200) {
            const alpha = (1 - Math.sqrt(dist) / 200) * 0.15;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(160, 130, 220, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <>
      <Head>
        <title>Hello World · ginTest</title>
        <meta name="description" content="Hello World - ginTest" />
      </Head>
      <div className="relative min-h-screen overflow-hidden bg-[#0a0a1a] font-sans selection:bg-purple-500/30">
        <canvas ref={canvasRef} className="pointer-events-none fixed inset-0" />

        <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
          <div
            className={`text-center transition-all duration-1200 ease-out ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            }`}
          >
            {/* Decorative top */}
            <div className="mb-8 flex items-center justify-center gap-3">
              <span className="inline-block h-px w-12 bg-gradient-to-r from-transparent via-purple-400/40 to-transparent" />
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-400/60 shadow-[0_0_8px_rgba(168,130,255,0.4)]" />
              <span className="inline-block h-px w-12 bg-gradient-to-r from-transparent via-purple-400/40 to-transparent" />
            </div>

            {/* Title */}
            <h1 className="animate-gradient bg-gradient-to-r from-purple-300 via-pink-300 to-orange-200 bg-clip-text text-6xl font-extrabold tracking-tight text-transparent sm:text-7xl md:text-8xl lg:text-9xl">
              Hello World
            </h1>

            {/* Subtitle */}
            <p className="mt-5 text-base font-light tracking-[0.25em] text-white/35 sm:text-lg">
              WELCOME TO GINTEST
            </p>

            {/* Decorative bottom */}
            <div className="mt-10 flex items-center justify-center gap-3">
              <span className="inline-block h-px w-16 bg-gradient-to-r from-transparent to-purple-400/30" />
              <span className="inline-block h-1 w-1 rounded-full bg-purple-400/40 shadow-[0_0_6px_rgba(168,130,255,0.3)]" />
              <span className="inline-block h-px w-16 bg-gradient-to-l from-transparent to-purple-400/30" />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          30% { background-position: 100% 50%; }
          60% { background-position: 50% 0%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background-size: 200% 250%;
          animation: gradient 6s ease infinite;
        }
      `}</style>
    </>
  );
}
