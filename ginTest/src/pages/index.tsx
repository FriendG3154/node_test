import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import { createTimer, animate } from "animejs";

// ---------- types ----------
interface Star {
  x: number; y: number; size: number;
  alpha: number; speed: number; phase: number;
}

type Shape = "circle" | "star" | "diamond";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; alpha: number; hue: number;
  shape: Shape;
}

interface Sparkle {
  x: number; y: number;
  life: number; maxLife: number;
  size: number; hue: number;
}

interface BurstP {
  x: number; y: number;
  endX: number; endY: number;
  progress: number;
  size: number; hue: number;
  shape: Shape;
}

// ---------- helpers ----------
const outCubic = (t: number) => 1 - (1 - t) ** 3;

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const step = Math.PI / 4;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const radius = i % 2 === 0 ? r : r * 0.4;
    const angle = i * step - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.6, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r * 0.6, cy);
  ctx.closePath();
}

// ---------- component ----------
export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -999, y: -999 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ---- canvas setup ----
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => canvas.width;
    const H = () => canvas.height;
    const area = () => W() * H();

    // ---- stars ----
    const stars: Star[] = Array.from(
      { length: Math.min(120, Math.floor(area() / 18000)) },
      () => ({
        x: Math.random() * W(), y: Math.random() * H(),
        size: Math.random() * 1.2 + 0.3,
        alpha: Math.random() * 0.5 + 0.2,
        speed: Math.random() * 2 + 0.5,
        phase: Math.random() * Math.PI * 2,
      })
    );

    // ---- particles ----
    const shapes: Shape[] = ["circle", "star", "diamond"];
    const particles: Particle[] = Array.from(
      { length: Math.min(40, Math.floor(area() / 35000)) },
      () => ({
        x: Math.random() * W(), y: Math.random() * H(),
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5 - 0.15,
        size: Math.random() * 3 + 1.5,
        alpha: Math.random() * 0.4 + 0.3,
        hue: Math.random() * 100 + 220,
        shape: shapes[Math.floor(Math.random() * shapes.length)]!,
      })
    );

    // ---- sparkles ----
    const sparkles: Sparkle[] = [];
    let sparkCounter = 0;

    // ---- burst ----
    const burstPs: BurstP[] = [];
    let ring = { x: 0, y: 0, progress: 1 };

    // ---- hue state (driven by anime) ----
    const hueState = { offset: 0 };

    // ---- cached bg gradient ----
    let bgGrad: CanvasGradient | null = null;
    let bgW = 0; let bgH = 0;

    // ---- events ----
    const onMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      sparkCounter++;
      if (sparkCounter % 3 === 0 && sparkles.length < 25) {
        sparkles.push({
          x: e.clientX + (Math.random() - 0.5) * 8,
          y: e.clientY + (Math.random() - 0.5) * 8,
          life: 1,
          maxLife: 18 + Math.random() * 12,
          size: Math.random() * 2 + 0.8,
          hue: Math.random() * 60 + 220,
        });
      }
    };
    const onClick = (e: MouseEvent) => {
      ring = { x: e.clientX, y: e.clientY, progress: 0 };
      const count = 35 + Math.floor(Math.random() * 20);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 5;
        burstPs.push({
          x: e.clientX, y: e.clientY,
          endX: e.clientX + Math.cos(angle) * speed * 55,
          endY: e.clientY + Math.sin(angle) * speed * 55 + 40,
          progress: 0,
          size: Math.random() * 3 + 1.5,
          hue: Math.random() * 120 + 220,
          shape: shapes[Math.floor(Math.random() * shapes.length)]!,
        });
      }
    };
    const onLeave = () => { mouseRef.current = { x: -999, y: -999 }; };

    window.addEventListener("mousemove", onMouse);
    window.addEventListener("click", onClick);
    document.addEventListener("mouseleave", onLeave);

    // ---- anime main loop ----
    const loop = createTimer({
      duration: Infinity,
      autoplay: true,
      onUpdate: () => {
        const hueOff = hueState.offset;
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;

        ctx.clearRect(0, 0, W(), H());

        // --- cached background glow ---
        if (!bgGrad || bgW !== W() || bgH !== H()) {
          bgGrad = ctx.createRadialGradient(W() * 0.5, H() * 0.5, 0, W() * 0.5, H() * 0.5, W() * 0.5);
          bgW = W(); bgH = H();
        }
        const gh = 250 + Math.sin(hueOff * 0.017) * 15;
        bgGrad.addColorStop(0, `hsla(${gh}, 35%, 12%, 0.45)`);
        bgGrad.addColorStop(0.6, `hsla(${gh + 30}, 20%, 6%, 0.25)`);
        bgGrad.addColorStop(1, "rgba(7,7,18,0)");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W(), H());

        // --- stars ---
        const t = performance.now() * 0.001;
        for (const s of stars) {
          const a = s.alpha * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(220,220,255,${a})`;
          ctx.fill();
        }

        // --- particles ---
        for (const p of particles) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120 && d > 0) {
            const f = (120 - d) / 120;
            p.vx += (dx / d) * f * 0.5;
            p.vy += (dy / d) * f * 0.5;
          }
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.98;
          p.vy *= 0.98;
          if (p.y < -30) { p.y = H() + 30; p.x = Math.random() * W(); }
          if (p.y > H() + 30) { p.y = -30; p.x = Math.random() * W(); }
          if (p.x < -30) p.x = W() + 30;
          if (p.x > W() + 30) p.x = -30;

          const h = p.hue + hueOff;
          ctx.save();
          ctx.translate(p.x, p.y);
          if (p.shape === "star") {
            drawStar(ctx, 0, 0, p.size);
            ctx.fillStyle = `hsla(${h},75%,62%,${p.alpha})`;
          } else if (p.shape === "diamond") {
            drawDiamond(ctx, 0, 0, p.size);
            ctx.fillStyle = `hsla(${h + 20},65%,56%,${p.alpha})`;
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${h},70%,62%,${p.alpha})`;
          }
          ctx.fill();
          ctx.restore();
        }

        // --- connection lines ---
        for (let i = 0; i < particles.length; i++) {
          const a = particles[i]!;
          for (let j = i + 1; j < particles.length; j++) {
            const b = particles[j]!;
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const d = dx * dx + dy * dy;
            if (d < 160 * 160) {
              const alpha = (1 - Math.sqrt(d) / 160) * 0.1;
              const ah = (a.hue + b.hue) / 2 + hueOff;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.strokeStyle = `hsla(${ah},45%,55%,${alpha})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }

        // --- sparkles ---
        for (let i = sparkles.length - 1; i >= 0; i--) {
          const s = sparkles[i]!;
          s.y -= 0.3;
          s.life -= 1 / s.maxLife;
          if (s.life <= 0) { sparkles.splice(i, 1); continue; }
          ctx.save();
          ctx.translate(s.x, s.y);
          drawStar(ctx, 0, 0, s.size * s.life);
          ctx.fillStyle = `hsla(${s.hue},80%,72%,${s.life * 0.7})`;
          ctx.fill();
          ctx.restore();
        }

        // --- burst particles ---
        for (let i = burstPs.length - 1; i >= 0; i--) {
          const bp = burstPs[i]!;
          bp.progress = Math.min(bp.progress + 0.028, 1);
          const e = outCubic(bp.progress);
          bp.x += (bp.endX - bp.x) * e * 0.12;
          bp.y += (bp.endY - bp.y) * e * 0.12;
          if (bp.progress >= 1) { burstPs.splice(i, 1); continue; }
          const life = 1 - bp.progress;
          const h = bp.hue + hueOff;
          ctx.save();
          ctx.translate(bp.x, bp.y);
          const sz = bp.size * life * 0.9;
          if (bp.shape === "star") {
            drawStar(ctx, 0, 0, sz);
            ctx.fillStyle = `hsla(${h},85%,68%,${life})`;
            ctx.shadowColor = `hsla(${h},85%,68%,${life * 0.5})`;
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
          } else if (bp.shape === "diamond") {
            drawDiamond(ctx, 0, 0, sz);
            ctx.fillStyle = `hsla(${h + 30},75%,62%,${life})`;
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, sz, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${h},80%,64%,${life})`;
            ctx.fill();
          }
          ctx.restore();
        }

        // --- burst ring ---
        if (ring.progress < 1) {
          ring.progress += 0.035;
          const rl = 1 - ring.progress;
          const rr = ring.progress * 260;
          ctx.beginPath();
          ctx.arc(ring.x, ring.y, rr, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(280,70%,65%,${rl * 0.35})`;
          ctx.lineWidth = rl * 2 + 0.5;
          ctx.shadowColor = `hsla(280,70%,65%,${rl * 0.3})`;
          ctx.shadowBlur = 14;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      },
    });

    // --- hue animation via anime ---
    const hueAnim = animate(hueState, {
      offset: [0, 360],
      duration: 24000,
      loop: true,
      ease: "linear",
    });

    // --- cleanup ---
    return () => {
      loop.cancel();
      hueAnim.cancel();
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("click", onClick);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <>
      <Head>
        <title>Hello World ✦ ginTest</title>
        <meta name="description" content="Hello World — ginTest" />
      </Head>
      <div className="relative min-h-screen overflow-hidden bg-[#070712] font-sans selection:bg-purple-500/30">
        <canvas ref={canvasRef} className="pointer-events-none fixed inset-0" />

        <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
          <div
            className={`text-center transition-all duration-1500 cubic-bezier(0.16, 1, 0.3, 1) ${
              mounted ? "translate-y-0 scale-100 opacity-100" : "translate-y-12 scale-95 opacity-0"
            }`}
          >
            {/* Decorative top */}
            <div className="mb-8 flex items-center justify-center gap-2">
              <span className="inline-block h-[1px] w-16 bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
              <span className="inline-block h-2 w-2 rotate-45 border border-purple-400/60 bg-purple-400/10 shadow-[0_0_10px_rgba(168,130,255,0.3)]" />
              <span className="inline-block h-[1px] w-16 bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
            </div>

            {/* Title */}
            <h1 className="animate-gradient bg-gradient-to-r from-purple-300 via-pink-300 via-orange-200 to-cyan-300 bg-clip-text text-6xl font-extrabold tracking-tight text-transparent sm:text-7xl md:text-8xl lg:text-9xl"
                style={{ filter: "drop-shadow(0 0 40px rgba(168,130,255,0.15)) drop-shadow(0 0 80px rgba(168,130,255,0.08))" }}>
              Hello World
            </h1>

            {/* Subtitle - shimmer */}
            <p className="relative mt-5 overflow-hidden text-base font-light tracking-[0.3em] text-white/30 sm:text-lg">
              <span className="shimmer-text inline-block">GINTEST</span>
            </p>

            {/* Bottom decorative */}
            <div className="mt-8 flex items-center justify-center gap-2">
              <span className="inline-block h-[1px] w-12 bg-gradient-to-r from-transparent to-purple-400/30" />
              <span className="pulse-dot inline-block h-1.5 w-1.5 rotate-45 border border-purple-400/50 bg-purple-400/20 shadow-[0_0_8px_rgba(168,130,255,0.3)]" />
              <span className="inline-block h-[1px] w-12 bg-gradient-to-l from-transparent to-purple-400/30" />
            </div>

            <p className="mt-8 text-[10px] tracking-[0.4em] text-white/10">
              ✦ CLICK ANYWHERE TO BURST ✦
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes gradient {
          0%   { background-position: 0% 50%; }
          25%  { background-position: 100% 0%; }
          50%  { background-position: 50% 100%; }
          75%  { background-position: 0% 50%; }
          100% { background-position: 50% 0%; }
        }
        .animate-gradient {
          background-size: 300% 300%;
          animation: gradient 8s ease infinite;
        }

        @keyframes shimmer {
          0%   { background-position: -200% 50%; }
          100% { background-position: 200% 50%; }
        }
        .shimmer-text {
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0) 0%,
            rgba(255,255,255,0) 40%,
            rgba(255,255,255,0.6) 50%,
            rgba(255,255,255,0) 60%,
            rgba(255,255,255,0) 100%
          );
          background-size: 200% 100%;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s ease-in-out infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 0.4; box-shadow: 0 0 6px rgba(168,130,255,0.2); }
          50%      { opacity: 0.8; box-shadow: 0 0 14px rgba(168,130,255,0.5); }
        }
        .pulse-dot {
          animation: pulse-dot 3s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
