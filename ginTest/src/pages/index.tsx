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
  rot: number;       // current rotation
  rotSpeed: number;  // rotation speed
  wobble: number;    // phase offset for drifting
}

// ---------- paper texture helpers ----------
function seededRandom(s: number) {
  const x = Math.sin(s * 43758.5453);
  return x - Math.floor(x);
}

function drawFold(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const px = -Math.sin(angle) * 1.5;
  const py = Math.cos(angle) * 1.5;
  ctx.beginPath(); ctx.moveTo(x1 + px, y1 + py); ctx.lineTo(x2 + px, y2 + py);
  ctx.strokeStyle = "rgba(200,175,115,0.10)"; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1 - px, y1 - py); ctx.lineTo(x2 - px, y2 - py);
  ctx.strokeStyle = "rgba(110,80,30,0.10)"; ctx.lineWidth = 1; ctx.stroke();
}

function generatePaper(bgCtx: CanvasRenderingContext2D, w: number, h: number) {
  const base = [138, 109, 53];
  bgCtx.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
  bgCtx.fillRect(0, 0, w, h);

  // vignette
  const vig = bgCtx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
  vig.addColorStop(0, "rgba(185,160,105,0.06)");
  vig.addColorStop(0.6, "rgba(130,100,45,0.03)");
  vig.addColorStop(1, "rgba(80,55,20,0.07)");
  bgCtx.fillStyle = vig;
  bgCtx.fillRect(0, 0, w, h);

  // tile grid
  const tile = 180;
  const cols = Math.ceil(w / tile) + 1;
  const rows = Math.ceil(h / tile) + 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tx = c * tile;
      const ty = r * tile;
      const seed = r * cols + c;

      // edge shadow
      bgCtx.fillStyle = "rgba(100,75,30,0.04)";
      bgCtx.fillRect(tx, ty, 1.5, tile + 2);
      bgCtx.fillRect(tx, ty, tile + 2, 1.5);
      bgCtx.fillStyle = "rgba(200,175,115,0.03)";
      bgCtx.fillRect(tx + tile - 1, ty, 1.5, tile + 2);
      bgCtx.fillRect(tx, ty + tile - 1, tile + 2, 1.5);

      // paper edge line
      bgCtx.strokeStyle = "rgba(120,95,45,0.07)";
      bgCtx.lineWidth = 0.5;
      bgCtx.beginPath(); bgCtx.moveTo(tx, ty); bgCtx.lineTo(tx + tile, ty); bgCtx.stroke();
      bgCtx.beginPath(); bgCtx.moveTo(tx, ty); bgCtx.lineTo(tx, ty + tile); bgCtx.stroke();

      // 1-3 fold lines
      const folds = seededRandom(seed * 7) > 0.6 ? 3 : seededRandom(seed * 13) > 0.5 ? 2 : 1;
      for (let i = 0; i < folds; i++) {
        const a = seededRandom(seed * 13 + i * 17) * Math.PI * 0.35 + 0.15;
        const cx = tx + seededRandom(seed * 3 + i * 5) * tile;
        const cy = ty + seededRandom(seed * 11 + i * 7) * tile;
        const len = tile * (0.35 + seededRandom(seed * 19 + i * 23) * 0.4);
        drawFold(bgCtx, cx - Math.cos(a) * len, cy - Math.sin(a) * len, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      }
    }
  }
}

// ---------- draw helpers ----------
const outCubic = (t: number) => 1 - (1 - t) ** 3;

function drawRect(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
  ctx.beginPath();
  ctx.rect(cx - w / 2, cy - h / 2, w, h);
  ctx.closePath();
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const step = Math.PI / 4;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const rd = i % 2 === 0 ? r : r * 0.4;
    const a = i * step - Math.PI / 2;
    const x = cx + Math.cos(a) * rd;
    const y = cy + Math.sin(a) * rd;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.6, cy);
  ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r * 0.6, cy);
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

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => canvas.width;
    const H = () => canvas.height;
    const area = () => W() * H();

    // ---- offscreen paper texture ----
    const bgCanvas = document.createElement("canvas");
    const bgCtx = bgCanvas.getContext("2d")!;
    let paperDirty = true;

    function updatePaper() {
      bgCanvas.width = W();
      bgCanvas.height = H();
      generatePaper(bgCtx, W(), H());
      paperDirty = false;
    }
    updatePaper();
    window.addEventListener("resize", () => { paperDirty = true; });

    // ---- dust motes ----
    const stars: Star[] = Array.from(
      { length: Math.min(60, Math.floor(area() / 30000)) },
      () => ({
        x: Math.random() * W(), y: Math.random() * H(),
        size: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.3 + 0.08,
        speed: Math.random() * 0.4 + 0.08,
        phase: Math.random() * Math.PI * 2,
      })
    );

    // ---- particles ----
    const shapes: Shape[] = ["circle", "star", "diamond", "hex"];
    const particles: Particle[] = Array.from(
      { length: Math.min(28, Math.floor(area() / 50000)) },
      () => ({
        x: Math.random() * W(), y: Math.random() * H(),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3 - 0.08,
        size: Math.random() * 4 + 2.5,
        alpha: Math.random() * 0.3 + 0.15,
        hue: Math.random() * 25 + 15,
        shape: shapes[Math.floor(Math.random() * shapes.length)]!,
      })
    );

    // ---- sparkles ----
    const sparkles: Sparkle[] = [];
    let sparkCounter = 0;

    // ---- burst ----
    const burstPs: BurstP[] = [];
    let ring = { x: 0, y: 0, progress: 1 };
    let time = 0;

    // ---- hue state ----
    const hueState = { offset: 0 };

    // ---- events ----
    const onMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      sparkCounter++;
      if (sparkCounter % 3 === 0 && sparkles.length < 15) {
        sparkles.push({
          x: e.clientX + (Math.random() - 0.5) * 6,
          y: e.clientY + (Math.random() - 0.5) * 6,
          life: 1, maxLife: 12 + Math.random() * 8,
          size: Math.random() * 1.5 + 0.4,
          hue: Math.random() * 15 + 30,
        });
      }
    };
    const onClick = (e: MouseEvent) => {
      ring = { x: e.clientX, y: e.clientY, progress: 0 };
      const count = 30 + Math.floor(Math.random() * 15);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 2.5;
        burstPs.push({
          x: e.clientX, y: e.clientY,
          endX: e.clientX + Math.cos(angle) * speed * 70,
          endY: e.clientY + Math.sin(angle) * speed * 70 + 60,
          progress: 0,
          size: Math.random() * 6 + 4,
          hue: Math.random() * 20 + 30,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.08,
          wobble: Math.random() * Math.PI * 2,
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
        time += 0.016;

        ctx.clearRect(0, 0, W(), H());

        // --- paper background ---
        if (paperDirty) updatePaper();
        ctx.drawImage(bgCanvas, 0, 0);

        // --- dust motes ---
        const t = performance.now() * 0.001;
        for (const s of stars) {
          const a = s.alpha * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(50,38,18,${a * 0.5})`;
          ctx.fill();
        }

        // --- particles ---
        for (const p of particles) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 100 && d > 0) {
            const f = (100 - d) / 100;
            p.vx += (dx / d) * f * 0.35;
            p.vy += (dy / d) * f * 0.35;
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
          ctx.arc(0, 0, p.size * 1.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(80,55,20,0.05)`;
          ctx.fill();

          if (p.shape === "star") {
            drawStar(ctx, 0, 0, p.size);
            ctx.fillStyle = `hsla(${h}, 50%, 22%, ${p.alpha})`;
          } else if (p.shape === "diamond") {
            drawDiamond(ctx, 0, 0, p.size);
            ctx.fillStyle = `hsla(${h + 15}, 45%, 18%, ${p.alpha})`;
          } else if (p.shape === "hex") {
            drawHex(ctx, 0, 0, p.size);
            ctx.fillStyle = `hsla(${h + 5}, 48%, 20%, ${p.alpha})`;
          } else {
            ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.closePath();
            ctx.fillStyle = `hsla(${h}, 48%, 22%, ${p.alpha})`;
          }
          ctx.fill();
          ctx.restore();
        }

        // --- sparkles ---
        for (let i = sparkles.length - 1; i >= 0; i--) {
          const s = sparkles[i]!;
          s.y -= 0.15;
          s.life -= 1 / s.maxLife;
          if (s.life <= 0) { sparkles.splice(i, 1); continue; }
          ctx.save();
          ctx.translate(s.x, s.y);
          drawStar(ctx, 0, 0, s.size * s.life);
          ctx.fillStyle = `hsla(${s.hue}, 50%, 65%, ${s.life * 0.4})`;
          ctx.fill();
          ctx.restore();
        }

        // --- burst particles (paper scraps) ---
        for (let i = burstPs.length - 1; i >= 0; i--) {
          const bp = burstPs[i]!;
          bp.progress = Math.min(bp.progress + 0.018, 1);
          const e = outCubic(bp.progress);
          bp.x += (bp.endX - bp.x) * e * 0.08;
          bp.y += (bp.endY - bp.y) * e * 0.08;
          // gravity
          bp.y += 0.15;
          // rotation
          bp.rot += bp.rotSpeed;
          // drift
          bp.x += Math.sin(time * 2 + bp.wobble) * 0.3;

          if (bp.progress >= 1 || bp.y > H() + 20) { burstPs.splice(i, 1); continue; }
          const life = 1 - bp.progress;
          const h = bp.hue + hueOff;
          ctx.save();
          ctx.translate(bp.x, bp.y);
          ctx.rotate(bp.rot);

          const sz = bp.size * (0.3 + 0.7 * life);
          // draw as small paper rectangle with slight color variation
          // lighter front side
          ctx.fillStyle = `hsla(${h}, 45%, 55%, ${life * 0.6})`;
          drawRect(ctx, 0, 0, sz, sz * 0.6);
          ctx.fill();
          // darker edge strip
          ctx.fillStyle = `hsla(${h}, 40%, 30%, ${life * 0.35})`;
          drawRect(ctx, 0, 0, sz, 1.5);
          ctx.fill();

          ctx.restore();
        }

        // --- burst ring ---
        if (ring.progress < 1) {
          ring.progress += 0.03;
          const rl = 1 - ring.progress;
          ctx.beginPath();
          ctx.arc(ring.x, ring.y, ring.progress * 180, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(180,150,90,${rl * 0.3})`;
          ctx.lineWidth = rl * 1.5 + 0.5;
          ctx.stroke();
        }
      },
    });

    // --- hue animation via anime ---
    const hueAnim = animate(hueState, {
      offset: [0, 360],
      duration: 50000,
      loop: true,
      ease: "linear",
    });

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
      <div className="relative min-h-screen overflow-hidden bg-[#F0E8D8] font-sans selection:bg-yellow-800/30">
        {/* Paper grain overlay */}
        <div className="pointer-events-none fixed inset-0 z-[5] opacity-[0.055] mix-blend-multiply"
             style={{
               backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
               backgroundSize: "512px 512px",
             }} />
        {/* Fiber lines */}
        <div className="pointer-events-none fixed inset-0 z-[4] opacity-[0.012] mix-blend-multiply"
             style={{
               backgroundImage: "repeating-linear-gradient(75deg, transparent, transparent 30px, rgba(100,60,20,0.5) 30px, rgba(100,60,20,0.5) 31px)",
             }} />

        <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[3]" />

        <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
          <div
            className={`text-center transition-all duration-1500 cubic-bezier(0.16, 1, 0.3, 1) ${
              mounted ? "translate-y-0 scale-100 opacity-100" : "translate-y-12 scale-95 opacity-0"
            }`}
          >
            {/* Top accent */}
            <div className="mb-6 flex items-center justify-center gap-3">
              <span className="inline-block h-[1px] w-14 bg-gradient-to-r from-transparent via-yellow-700/60 to-transparent" />
              <span className="top-dot inline-block h-2.5 w-2.5 rotate-45 border border-yellow-700/70 bg-yellow-700/20 shadow-[0_0_8px_rgba(180,140,60,0.3)]" />
              <span className="inline-block h-[1px] w-14 bg-gradient-to-r from-transparent via-yellow-700/60 to-transparent" />
            </div>

            {/* Title */}
            <h1 className="text-6xl font-bold tracking-tight text-[#2D1E08] sm:text-7xl md:text-8xl lg:text-9xl"
                style={{
                  textShadow: "0 1px 0 rgba(220,200,160,0.3), 0 3px 6px rgba(60,40,10,0.12)",
                  letterSpacing: "-0.02em",
                }}>
              Hello World
            </h1>

            {/* Subtitle */}
            <p className="relative mt-6 overflow-hidden text-base font-medium tracking-[0.35em] text-[#8A6D35]/80 sm:text-lg">
              <span className="shimmer-text inline-block">GINTEST</span>
            </p>

            {/* Bottom accent */}
            <div className="mt-10 flex items-center justify-center gap-3">
              <span className="inline-block h-[1px] w-14 bg-gradient-to-r from-transparent to-yellow-700/50" />
              <span className="bottom-dot inline-block h-2 w-2 rotate-45 border border-yellow-700/60 bg-yellow-700/25 shadow-[0_0_6px_rgba(180,140,60,0.2)]" />
              <span className="inline-block h-[1px] w-14 bg-gradient-to-l from-transparent to-yellow-700/50" />
            </div>

            <p className="mt-8 text-[11px] tracking-[0.45em] text-[#8A6D35]/30 font-medium">
              ✦ CLICK TO BURST ✦
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .shimmer-text {
          background: linear-gradient(
            90deg,
            rgba(138,109,53,0) 0%,
            rgba(138,109,53,0) 30%,
            rgba(200,170,110,0.7) 50%,
            rgba(138,109,53,0) 70%,
            rgba(138,109,53,0) 100%
          );
          background-size: 200% 100%;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 5s ease-in-out infinite;
        }

        @keyframes shimmer {
          0%   { background-position: -200% 50%; }
          100% { background-position: 200% 50%; }
        }

        @keyframes dot-pulse {
          0%, 100% { opacity: 0.5; box-shadow: 0 0 6px rgba(180,140,60,0.2); }
          50%      { opacity: 0.9; box-shadow: 0 0 16px rgba(180,140,60,0.45); }
        }
        .top-dot, .bottom-dot {
          animation: dot-pulse 4s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
