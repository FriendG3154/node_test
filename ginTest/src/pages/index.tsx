import { useEffect, useRef, useState } from "react";
import Head from "next/head";

// ---------- types ----------
interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  hue: number;
  shape: "circle" | "star" | "diamond";
  trail: { x: number; y: number; alpha: number }[];
}

interface Sparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  shape: "circle" | "star" | "diamond";
}

// ---------- helpers ----------
function drawStarPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, points = 4) {
  const step = Math.PI / points;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? r : r * 0.4;
    const angle = i * step - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawDiamondPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
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
  const clickRef = useRef({ x: 0, y: 0, active: false });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Canvas setup
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => canvas.width;
    const H = () => canvas.height;
    const CC = () => W() * H();

    // ---------- stars (background) ----------
    const starCount = Math.min(200, Math.floor(CC() / 12000));
    const stars: Star[] = Array.from({ length: starCount }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      size: Math.random() * 1.2 + 0.3,
      alpha: Math.random() * 0.6 + 0.2,
      twinkleSpeed: Math.random() * 2 + 0.5,
      twinklePhase: Math.random() * Math.PI * 2,
    }));

    // ---------- main particles ----------
    const shapes: Particle["shape"][] = ["circle", "star", "diamond"];
    const particleCount = Math.min(70, Math.floor(CC() / 20000));
    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5 - 0.15,
      size: Math.random() * 3.5 + 1,
      alpha: Math.random() * 0.5 + 0.25,
      hue: Math.random() * 120 + 200,
      shape: shapes[Math.floor(Math.random() * shapes.length)]!,
      life: 1,
      trail: [],
    }));

    // ---------- foreground particles (responsive) ----------
    const fgCount = Math.min(20, Math.floor(CC() / 60000));
    const fgParticles: Particle[] = Array.from({ length: fgCount }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.5) * 1.2 - 0.3,
      size: Math.random() * 5 + 2,
      alpha: Math.random() * 0.4 + 0.3,
      hue: Math.random() * 80 + 280,
      shape: "star" as const,
      life: 1,
      trail: [],
    }));

    // ---------- sparkles (mouse trail) ----------
    const sparkles: Sparkle[] = [];
    let sparkleCounter = 0;

    // ---------- burst particles (click) ----------
    const burstParticles: BurstParticle[] = [];
    let burstTimer = 0;

    // ---------- time ----------
    let time = 0;

    // ---------- events ----------
    const onMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      sparkleCounter++;
      if (sparkleCounter % 3 === 0) {
        sparkles.push({
          x: e.clientX + (Math.random() - 0.5) * 8,
          y: e.clientY + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4 - 0.3,
          life: 1,
          maxLife: Math.random() * 20 + 15,
          size: Math.random() * 2.5 + 0.8,
          hue: Math.random() * 60 + 200,
        });
        if (sparkles.length > 40) sparkles.splice(0, sparkles.length - 40);
      }
    };

    const onClick = (e: MouseEvent) => {
      const burstCount = 40 + Math.floor(Math.random() * 20);
      clickRef.current = { x: e.clientX, y: e.clientY, active: true };
      for (let i = 0; i < burstCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 2;
        burstParticles.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: Math.random() * 30 + 30,
          size: Math.random() * 4 + 1.5,
          hue: Math.random() * 120 + 200,
          shape: shapes[Math.floor(Math.random() * shapes.length)]!,
        });
      }
    };

    const onLeave = () => {
      mouseRef.current = { x: -999, y: -999 };
    };

    window.addEventListener("mousemove", onMouse);
    window.addEventListener("click", onClick);
    document.addEventListener("mouseleave", onLeave);

    // ---------- resize handler for arrays ----------
    const onResizeArray = () => {
      for (const s of stars) {
        if (s.x > W() || s.y > H()) { s.x = Math.random() * W(); s.y = Math.random() * H(); }
      }
    };
    window.addEventListener("resize", onResizeArray);

    // ---------- draw loop ----------
    let animId: number;
    const animate = () => {
      time += 0.005;
      const hueOffset = Math.sin(time * 0.15) * 20;

      ctx.clearRect(0, 0, W(), H());

      // ---------- draw stars ----------
      for (const s of stars) {
        const twinkle = s.alpha * (0.5 + 0.5 * Math.sin(time * s.twinkleSpeed + s.twinklePhase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 220, 255, ${twinkle})`;
        ctx.fill();
      }

      // ---------- ambient radial glow ----------
      const grad = ctx.createRadialGradient(
        W() * 0.5, H() * 0.5, 0,
        W() * 0.5, H() * 0.5, W() * 0.5,
      );
      const glowHue = 240 + hueOffset;
      grad.addColorStop(0, `hsla(${glowHue}, 50%, 15%, 0.4)`);
      grad.addColorStop(0.5, `hsla(${glowHue + 40}, 30%, 8%, 0.25)`);
      grad.addColorStop(1, "rgba(10, 10, 25, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W(), H());

      // ---------- update & draw main particles ----------
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (const p of particles) {
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120 && dist > 0) {
          const force = (120 - dist) / 120;
          p.vx += (dx / dist) * force * 0.6;
          p.vy += (dy / dist) * force * 0.6;
        }

        p.trail.push({ x: p.x, y: p.y, alpha: 0.3 });
        if (p.trail.length > 4) p.trail.shift();

        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;

        if (p.y < -30) { p.y = H() + 30; p.x = Math.random() * W(); }
        if (p.y > H() + 30) { p.y = -30; p.x = Math.random() * W(); }
        if (p.x < -30) p.x = W() + 30;
        if (p.x > W() + 30) p.x = -30;

        // trail
        for (const t of p.trail) {
          ctx.beginPath();
          ctx.arc(t.x, t.y, p.size * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue + hueOffset}, 60%, 60%, ${t.alpha * 0.2})`;
          ctx.fill();
        }

        // draw particle
        const hue = p.hue + hueOffset;
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.shape === "star") {
          drawStarPath(ctx, 0, 0, p.size);
          ctx.fillStyle = `hsla(${hue}, 80%, 65%, ${p.alpha})`;
          ctx.shadowColor = `hsla(${hue}, 80%, 65%, 0.5)`;
          ctx.shadowBlur = 14;
          ctx.fill();
        } else if (p.shape === "diamond") {
          drawDiamondPath(ctx, 0, 0, p.size);
          ctx.fillStyle = `hsla(${hue + 20}, 70%, 60%, ${p.alpha})`;
          ctx.shadowColor = `hsla(${hue + 20}, 70%, 60%, 0.4)`;
          ctx.shadowBlur = 10;
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, 70%, 65%, ${p.alpha})`;
          ctx.shadowColor = `hsla(${hue}, 70%, 65%, 0.4)`;
          ctx.shadowBlur = 12;
          ctx.fill();
        }
        ctx.restore();
      }

      // ---------- connection lines ----------
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]!;
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j]!;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = dx * dx + dy * dy;
          if (dist < 180 * 180) {
            const alpha = (1 - Math.sqrt(dist) / 180) * 0.12;
            const avgHue = (a.hue + b.hue) / 2 + hueOffset;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `hsla(${avgHue}, 50%, 60%, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // ---------- foreground particles ----------
      for (const p of fgParticles) {
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180 && dist > 0) {
          const force = (180 - dist) / 180;
          p.vx += (dx / dist) * force * 1.2;
          p.vy += (dy / dist) * force * 1.2;
        }

        const cx = W() / 2 - p.x;
        const cy = H() / 2 - p.y;
        const cDist = Math.sqrt(cx * cx + cy * cy);
        if (cDist > 100) {
          p.vx += (cx / cDist) * 0.002;
          p.vy += (cy / cDist) * 0.002;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.97;
        p.vy *= 0.97;

        if (p.x < -50) p.x = W() + 50;
        if (p.x > W() + 50) p.x = -50;
        if (p.y < -50) p.y = H() + 50;
        if (p.y > H() + 50) p.y = -50;

        const hue2 = p.hue + hueOffset + 10;
        ctx.save();
        ctx.translate(p.x, p.y);
        drawStarPath(ctx, 0, 0, p.size);
        ctx.fillStyle = `hsla(${hue2}, 85%, 70%, ${p.alpha})`;
        ctx.shadowColor = `hsla(${hue2}, 85%, 70%, 0.5)`;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.restore();
      }

      // ---------- sparkles (mouse trail) ----------
      for (let i = sparkles.length - 1; i >= 0; i--) {
        const s = sparkles[i]!;
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.96;
        s.vy *= 0.96;
        s.life -= 1 / s.maxLife;
        if (s.life <= 0) { sparkles.splice(i, 1); continue; }
        ctx.save();
        ctx.translate(s.x, s.y);
        drawStarPath(ctx, 0, 0, s.size);
        ctx.fillStyle = `hsla(${s.hue}, 80%, 75%, ${s.life * 0.8})`;
        ctx.shadowColor = `hsla(${s.hue}, 80%, 75%, ${s.life * 0.5})`;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
      }

      // ---------- burst particles ----------
      burstTimer++;
      for (let i = burstParticles.length - 1; i >= 0; i--) {
        const bp = burstParticles[i]!;
        bp.x += bp.vx;
        bp.y += bp.vy;
        bp.vx *= 0.97;
        bp.vy *= 0.97;
        bp.vy += 0.02;
        bp.life -= 1 / bp.maxLife;
        if (bp.life <= 0) { burstParticles.splice(i, 1); continue; }
        const hue3 = bp.hue + hueOffset;
        ctx.save();
        ctx.translate(bp.x, bp.y);
        if (bp.shape === "star") {
          drawStarPath(ctx, 0, 0, bp.size * bp.life);
          ctx.fillStyle = `hsla(${hue3}, 90%, 70%, ${bp.life * 0.8})`;
          ctx.shadowColor = `hsla(${hue3}, 90%, 70%, ${bp.life * 0.5})`;
          ctx.shadowBlur = 15;
          ctx.fill();
        } else if (bp.shape === "diamond") {
          drawDiamondPath(ctx, 0, 0, bp.size * bp.life);
          ctx.fillStyle = `hsla(${hue3 + 30}, 80%, 65%, ${bp.life * 0.8})`;
          ctx.shadowColor = `hsla(${hue3 + 30}, 80%, 65%, ${bp.life * 0.4})`;
          ctx.shadowBlur = 12;
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, bp.size * bp.life, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue3}, 80%, 65%, ${bp.life * 0.8})`;
          ctx.shadowColor = `hsla(${hue3}, 80%, 65%, ${bp.life * 0.4})`;
          ctx.shadowBlur = 12;
          ctx.fill();
        }
        ctx.restore();
      }

      // ---------- burst ring ----------
      if (clickRef.current.active) {
        const { x, y } = clickRef.current;
        const ringLife = Math.max(0, 1 - burstTimer / 40);
        if (ringLife > 0) {
          ctx.beginPath();
          const ringRadius = (1 - ringLife) * 250 + 5;
          ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(280, 80%, 70%, ${ringLife * 0.3})`;
          ctx.lineWidth = 2;
          ctx.shadowColor = `hsla(280, 80%, 70%, ${ringLife * 0.3})`;
          ctx.shadowBlur = 20;
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else {
          clickRef.current.active = false;
          burstTimer = 0;
        }
      }

      // ---------- floating ambient orbs ----------
      for (let i = 0; i < 3; i++) {
        const ox = W() * 0.2 + Math.sin(time * 0.3 + i * 2.1) * W() * 0.3;
        const oy = H() * 0.3 + Math.cos(time * 0.2 + i * 1.7) * H() * 0.15;
        const or = 120 + Math.sin(time * 0.1 + i) * 30;
        const grad2 = ctx.createRadialGradient(ox, oy, 0, ox, oy, or);
        grad2.addColorStop(0, `hsla(${240 + hueOffset + i * 40}, 50%, 30%, 0.06)`);
        grad2.addColorStop(1, `hsla(${240 + hueOffset + i * 40}, 50%, 20%, 0)`);
        ctx.fillStyle = grad2;
        ctx.fillRect(ox - or, oy - or, or * 2, or * 2);
      }

      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("resize", onResizeArray);
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

            {/* Bottom decorative - animated pulse */}
            <div className="mt-8 flex items-center justify-center gap-2">
              <span className="inline-block h-[1px] w-12 bg-gradient-to-r from-transparent to-purple-400/30" />
              <span className="pulse-dot inline-block h-1.5 w-1.5 rotate-45 border border-purple-400/50 bg-purple-400/20 shadow-[0_0_8px_rgba(168,130,255,0.3)]" />
              <span className="inline-block h-[1px] w-12 bg-gradient-to-l from-transparent to-purple-400/30" />
            </div>

            {/* Scanline hint */}
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
