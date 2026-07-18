import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import { createTimer, animate } from "animejs";

// ---------- types ----------
interface Star {
  x: number; y: number; size: number;
  alpha: number; speed: number; phase: number;
}

type Shape = "circle" | "star" | "diamond" | "hex";

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

function drawHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3 - Math.PI / 6;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
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
      { length: Math.min(200, Math.floor(area() / 15000)) },
      () => ({
        x: Math.random() * W(), y: Math.random() * H(),
        size: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.5 + 0.15,
        speed: Math.random() * 1.5 + 0.3,
        phase: Math.random() * Math.PI * 2,
      })
    );

    // ---- particles ----
    const shapes: Shape[] = ["circle", "star", "diamond", "hex"];
    const particles: Particle[] = Array.from(
      { length: Math.min(50, Math.floor(area() / 30000)) },
      () => ({
        x: Math.random() * W(), y: Math.random() * H(),
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5 - 0.15,
        size: Math.random() * 3.5 + 1.5,
        alpha: Math.random() * 0.4 + 0.3,
        hue: Math.random() * 60 + 160,
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

    // ---- waveform ----
    const waveform: { x: number; y: number }[] = [];

    // ---- events ----
    const onMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      sparkCounter++;
      if (sparkCounter % 3 === 0 && sparkles.length < 25) {
        sparkles.push({
          x: e.clientX + (Math.random() - 0.5) * 8,
          y: e.clientY + (Math.random() - 0.5) * 8,
          life: 1,
          maxLife: 16 + Math.random() * 10,
          size: Math.random() * 2.5 + 0.8,
          hue: Math.random() * 40 + 180,
        });
      }
    };
    const onClick = (e: MouseEvent) => {
      ring = { x: e.clientX, y: e.clientY, progress: 0 };
      const count = 45 + Math.floor(Math.random() * 20);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 5;
        burstPs.push({
          x: e.clientX, y: e.clientY,
          endX: e.clientX + Math.cos(angle) * speed * 55,
          endY: e.clientY + Math.sin(angle) * speed * 55 + 40,
          progress: 0,
          size: Math.random() * 3.5 + 1.5,
          hue: Math.random() * 60 + 180,
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
        const now = performance.now() * 0.001;

        ctx.clearRect(0, 0, W(), H());

        // --- background glow (cached) ---
        if (!bgGrad || bgW !== W() || bgH !== H()) {
          bgGrad = ctx.createRadialGradient(W() * 0.5, H() * 0.5, 0, W() * 0.5, H() * 0.5, W() * 0.5);
          bgW = W(); bgH = H();
        }
        const gh = 200 + Math.sin(hueOff * 0.017) * 20;
        bgGrad.addColorStop(0, `hsla(${gh}, 50%, 8%, 0.5)`);
        bgGrad.addColorStop(0.5, `hsla(${gh + 20}, 40%, 4%, 0.3)`);
        bgGrad.addColorStop(1, "rgba(7,7,18,0)");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W(), H());

        // --- perspective grid ---
        const vpX = W() * 0.5;
        const vpY = H() * 0.3;
        const gridColor = `hsla(${190 + hueOff * 0.1}, 50%, 50%, 0.06)`;
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 0.5;

        // horizontal grid lines (perspective-spaced)
        for (let i = 1; i <= 12; i++) {
          const t = i / 12;
          const y = vpY + (H() - vpY) * (t * t);
          ctx.beginPath();
          ctx.moveTo(vpX - (W() * 0.5) * t, y);
          ctx.lineTo(vpX + (W() * 0.5) * t, y);
          ctx.stroke();
        }
        // vertical grid lines (radial from VP)
        for (let i = -6; i <= 6; i++) {
          const angle = Math.atan2(H() - vpY, (i / 6) * W() * 0.5);
          const endX = vpX + Math.cos(angle) * H() * 1.5;
          const endY = vpY + Math.sin(angle) * H() * 1.5;
          ctx.beginPath();
          ctx.moveTo(vpX, vpY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }

        // --- HUD corner brackets ---
        const bLen = 30;
        const bOff = 18;
        const bh = 190 + hueOff * 0.1;
        ctx.strokeStyle = `hsla(${bh}, 60%, 60%, 0.2)`;
        ctx.lineWidth = 1;

        // top-left
        ctx.beginPath(); ctx.moveTo(bOff, bOff + bLen); ctx.lineTo(bOff, bOff); ctx.lineTo(bOff + bLen, bOff); ctx.stroke();
        // top-right
        ctx.beginPath(); ctx.moveTo(W() - bOff - bLen, bOff); ctx.lineTo(W() - bOff, bOff); ctx.lineTo(W() - bOff, bOff + bLen); ctx.stroke();
        // bottom-left
        ctx.beginPath(); ctx.moveTo(bOff, H() - bOff - bLen); ctx.lineTo(bOff, H() - bOff); ctx.lineTo(bOff + bLen, H() - bOff); ctx.stroke();
        // bottom-right
        ctx.beginPath(); ctx.moveTo(W() - bOff - bLen, H() - bOff); ctx.lineTo(W() - bOff, H() - bOff); ctx.lineTo(W() - bOff, H() - bOff - bLen); ctx.stroke();

        // bracket tick marks
        ctx.strokeStyle = `hsla(${bh}, 50%, 55%, 0.12)`;
        ctx.lineWidth = 0.5;
        for (let i = 1; i <= 4; i++) {
          const t = bOff + (bLen / 5) * i;
          // top
          ctx.beginPath(); ctx.moveTo(t, bOff - 3); ctx.lineTo(t, bOff + 3); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(W() - t, bOff - 3); ctx.lineTo(W() - t, bOff + 3); ctx.stroke();
          // bottom
          ctx.beginPath(); ctx.moveTo(t, H() - bOff - 3); ctx.lineTo(t, H() - bOff + 3); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(W() - t, H() - bOff - 3); ctx.lineTo(W() - t, H() - bOff + 3); ctx.stroke();
        }

        // --- stars ---
        for (const s of stars) {
          const a = s.alpha * (0.5 + 0.5 * Math.sin(now * s.speed + s.phase));
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180,200,255,${a})`;
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

          // glow halo
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${h}, 70%, 60%, 0.08)`;
          ctx.fill();

          if (p.shape === "star") {
            drawStar(ctx, 0, 0, p.size);
            ctx.fillStyle = `hsla(${h}, 80%, 65%, ${p.alpha})`;
          } else if (p.shape === "diamond") {
            drawDiamond(ctx, 0, 0, p.size);
            ctx.fillStyle = `hsla(${h + 30}, 70%, 58%, ${p.alpha})`;
          } else if (p.shape === "hex") {
            drawHex(ctx, 0, 0, p.size);
            ctx.fillStyle = `hsla(${h + 10}, 75%, 55%, ${p.alpha})`;
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${h}, 75%, 62%, ${p.alpha})`;
          }
          ctx.shadowColor = `hsla(${h}, 70%, 60%, ${p.alpha * 0.4})`;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.restore();
        }

        // --- connection lines (laser beam style) ---
        for (let i = 0; i < particles.length; i++) {
          const a = particles[i]!;
          for (let j = i + 1; j < particles.length; j++) {
            const b = particles[j]!;
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const d = dx * dx + dy * dy;
            if (d < 200 * 200) {
              const alpha = (1 - Math.sqrt(d) / 200) * 0.15;
              const ah = (a.hue + b.hue) / 2 + hueOff;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.strokeStyle = `hsla(${ah}, 60%, 65%, ${alpha})`;
              ctx.lineWidth = 0.8;
              ctx.shadowColor = `hsla(${ah}, 60%, 65%, ${alpha * 0.5})`;
              ctx.shadowBlur = 4;
              ctx.stroke();
              ctx.shadowBlur = 0;
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
          ctx.fillStyle = `hsla(${s.hue}, 80%, 70%, ${s.life * 0.7})`;
          ctx.shadowColor = `hsla(${s.hue}, 80%, 70%, ${s.life * 0.4})`;
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
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
            ctx.fillStyle = `hsla(${h}, 85%, 68%, ${life})`;
            ctx.shadowColor = `hsla(${h}, 85%, 68%, ${life * 0.6})`;
            ctx.shadowBlur = 14;
            ctx.fill();
            ctx.shadowBlur = 0;
          } else if (bp.shape === "diamond") {
            drawDiamond(ctx, 0, 0, sz);
            ctx.fillStyle = `hsla(${h + 30}, 75%, 62%, ${life})`;
            ctx.fill();
          } else if (bp.shape === "hex") {
            drawHex(ctx, 0, 0, sz);
            ctx.fillStyle = `hsla(${h + 10}, 80%, 58%, ${life})`;
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, sz, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${h}, 80%, 64%, ${life})`;
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
          ctx.strokeStyle = `hsla(190, 80%, 65%, ${rl * 0.4})`;
          ctx.lineWidth = rl * 2 + 0.5;
          ctx.shadowColor = `hsla(190, 80%, 65%, ${rl * 0.4})`;
          ctx.shadowBlur = 18;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // --- waveform (bottom edge) ---
        ctx.beginPath();
        const wfLen = W() - 40;
        const wfY = H() - 22;
        const wfAmp = 6 + Math.sin(now * 0.5) * 2;
        ctx.moveTo(20, wfY);
        for (let x = 0; x <= wfLen; x += 2) {
          const phase = (x / wfLen) * Math.PI * 4 + now * 1.5;
          const y = wfY + Math.sin(phase) * wfAmp + Math.sin(phase * 0.5 + now) * 3;
          ctx.lineTo(20 + x, y);
        }
        ctx.strokeStyle = `hsla(${190 + hueOff * 0.1}, 60%, 55%, 0.25)`;
        ctx.lineWidth = 1;
        ctx.shadowColor = `hsla(${190 + hueOff * 0.1}, 60%, 55%, 0.15)`;
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // waveform center line
        ctx.beginPath();
        ctx.moveTo(20, wfY);
        ctx.lineTo(W() - 20, wfY);
        ctx.strokeStyle = `hsla(${190 + hueOff * 0.1}, 40%, 40%, 0.08)`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      },
    });

    // --- hue animation via anime ---
    const hueAnim = animate(hueState, {
      offset: [0, 360],
      duration: 28000,
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
        {/* Scan lines overlay */}
        <div className="pointer-events-none fixed inset-0 z-[5] opacity-[0.035]"
             style={{
               backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,240,255,0.3) 1px, rgba(0,240,255,0.3) 2px)",
               backgroundSize: "100% 3px",
             }} />

        {/* Noise grain overlay */}
        <div className="pointer-events-none fixed inset-0 z-[6] opacity-[0.025] mix-blend-overlay"
             style={{
               backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
               backgroundSize: "256px 256px",
             }} />

        <canvas ref={canvasRef} className="pointer-events-none fixed inset-0" />

        <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
          <div
            className={`text-center transition-all duration-1500 cubic-bezier(0.16, 1, 0.3, 1) ${
              mounted ? "translate-y-0 scale-100 opacity-100" : "translate-y-12 scale-95 opacity-0"
            }`}
          >
            {/* Decorative top - HUD style */}
            <div className="mb-6 flex items-center justify-center gap-2">
              <span className="inline-block h-[1px] w-12 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
              <span className="hud-dot inline-block h-2 w-2 rotate-45 border border-cyan-400/60 bg-cyan-400/10 shadow-[0_0_10px_rgba(0,240,255,0.3)]" />
              <span className="inline-block h-[1px] w-12 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
            </div>

            {/* Title - cyan/magenta gradient */}
            <h1 className="animate-gradient bg-gradient-to-r from-cyan-300 via-blue-300 via-indigo-300 to-magenta-300 bg-clip-text text-6xl font-extrabold tracking-tight text-transparent sm:text-7xl md:text-8xl lg:text-9xl"
                style={{ filter: "drop-shadow(0 0 60px rgba(0,240,255,0.15)) drop-shadow(0 0 100px rgba(100,0,255,0.1))" }}>
              Hello World
            </h1>

            {/* Subtitle */}
            <p className="relative mt-5 overflow-hidden text-base font-light tracking-[0.3em] text-white/25 sm:text-lg">
              <span className="shimmer-text inline-block">GINTEST</span>
            </p>

            {/* Bottom decorative */}
            <div className="mt-8 flex items-center justify-center gap-2">
              <span className="inline-block h-[1px] w-12 bg-gradient-to-r from-transparent to-cyan-400/30" />
              <span className="pulse-dot inline-block h-1.5 w-1.5 rotate-45 border border-cyan-400/50 bg-cyan-400/20 shadow-[0_0_8px_rgba(0,240,255,0.3)]" />
              <span className="inline-block h-[1px] w-12 bg-gradient-to-l from-transparent to-cyan-400/30" />
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
          background-size: 400% 400%;
          animation: gradient 10s ease infinite;
        }

        @keyframes shimmer {
          0%   { background-position: -200% 50%; }
          100% { background-position: 200% 50%; }
        }
        .shimmer-text {
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0) 0%,
            rgba(255,255,255,0) 35%,
            rgba(0,240,255,0.7) 50%,
            rgba(255,0,228,0.7) 55%,
            rgba(255,255,255,0) 65%,
            rgba(255,255,255,0) 100%
          );
          background-size: 200% 100%;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 5s ease-in-out infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 0.4; box-shadow: 0 0 6px rgba(0,240,255,0.2); }
          50%      { opacity: 0.8; box-shadow: 0 0 14px rgba(0,240,255,0.5); }
        }
        .pulse-dot {
          animation: pulse-dot 3s ease-in-out infinite;
        }

        @keyframes hud-dot-pulse {
          0%, 100% { box-shadow: 0 0 6px rgba(0,240,255,0.2); }
          50%      { box-shadow: 0 0 18px rgba(0,240,255,0.6); }
        }
        .hud-dot {
          animation: hud-dot-pulse 4s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
