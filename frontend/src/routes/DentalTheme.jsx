import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { theme as antdTheme } from 'antd';

/* ธีมกลางของทุกหน้า: ขาว-มิ้นต์ + ฟ้าอมเขียว (teal) + เขียวมรกต พร้อมองค์ประกอบสไตล์เทค */
export const C = { bg: '#F2FAF8', cyan: '#0891B2', teal: '#0D9488', accent: '#10B981' };

export const THEME_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@500;700&family=Sarabun:wght@400;500;600&display=swap');
.dm-root { font-family: 'Sarabun', system-ui, sans-serif; }
.dm-head { font-family: 'Prompt', 'Sarabun', sans-serif; }
@property --dm-a { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
@keyframes dm-spin { to { --dm-a: 360deg; } }
@keyframes dm-grid { to { background-position: 0 56px; } }
.dm-grid {
  background-image:
    linear-gradient(rgba(8,145,178,.16) 1px, transparent 1px),
    linear-gradient(90deg, rgba(8,145,178,.16) 1px, transparent 1px);
  background-size: 56px 56px;
  transform-origin: 50% 100%;
  transform: perspective(520px) rotateX(64deg);
  animation: dm-grid 2.4s linear infinite;
  -webkit-mask-image: linear-gradient(to top, #000 5%, transparent 75%);
  mask-image: linear-gradient(to top, #000 5%, transparent 75%);
}
.dm-border { position: relative; }
.dm-border::before {
  content: ''; position: absolute; inset: -1.5px; border-radius: inherit; padding: 1.5px;
  background: conic-gradient(from var(--dm-a), transparent 0 62%, ${C.cyan}, ${C.accent}, transparent);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  animation: dm-spin 6s linear infinite; pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .dm-grid, .dm-border::before { animation: none; }
}
`;

/* ConfigProvider theme ของ antd */
export const antdCfg = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    colorPrimary: C.cyan,
    borderRadius: 14,
    fontSize: 16,
    controlHeightLG: 52,
    fontFamily: "'Sarabun', system-ui, sans-serif",
  },
};

/* สไตล์ปุ่มหลักเรืองแสง (ใช้เฉพาะตอนปุ่มไม่ disabled) */
export const glowBtn = {
  background: `linear-gradient(90deg, ${C.cyan}, ${C.accent})`,
  boxShadow: '0 6px 24px rgba(8,145,178,.4)',
  border: 'none',
};

export const ParticleNet = ({ className = 'fixed inset-0' }) => {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return undefined;
    const ctx = c.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    let pts = [];

    const init = () => {
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(70, Math.floor((w * h) / 20000));
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
      }));
    };

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      pts.forEach((p) => {
        p.x = (p.x + p.vx + w) % w;
        p.y = (p.y + p.vy + h) % h;
        ctx.fillStyle = 'rgba(8,145,178,.55)';
        ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
      });
      for (let i = 0; i < pts.length; i += 1) {
        for (let j = i + 1; j < pts.length; j += 1) {
          const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
          if (d < 130) {
            ctx.strokeStyle = `rgba(8,145,178,${0.2 * (1 - d / 130)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };

    init();
    tick();
    window.addEventListener('resize', init);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', init);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`${className} w-full h-full pointer-events-none`}
    />
  );
};

/* พื้นหลังธีม: ครอบทั้งหน้า (กริด 3 มิติ + เครือข่ายจุด ติดอยู่กับจอ) */
export const ThemeShell = ({ children, className = '' }) => {
  const reduce = useReducedMotion();
  return (
    <>
      <style>{THEME_CSS}</style>
      <div
        className={`dm-root relative min-h-[100dvh] text-slate-800 ${className}`}
        style={{
          background: `radial-gradient(ellipse at 15% 5%, #CFF5EE 0%, transparent 55%), radial-gradient(ellipse at 95% 95%, #D6F0FA 0%, transparent 50%), ${C.bg}`,
        }}
      >
        <div
          className="fixed inset-x-0 bottom-0 h-[55%] pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <div className="dm-grid absolute -left-1/2 w-[200%] h-full" />
        </div>
        {!reduce && <ParticleNet />}
        <div className="relative z-10">{children}</div>
      </div>
    </>
  );
};

/* หน้าจอสำเร็จเต็มจอ (พื้นเขียวไล่สี + วงแหวนขยาย + เครื่องหมายถูกวาดทีละเส้น) */
export const SuccessBurst = ({ title, subtitle }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
    className="dm-root fixed inset-0 z-50 flex flex-col items-center justify-center text-white px-6 text-center"
    style={{ background: 'linear-gradient(135deg, #0891B2 0%, #0D9488 50%, #059669 100%)' }}
    role="status"
    aria-live="polite"
  >
    <div className="relative flex items-center justify-center mb-8">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute w-36 h-36 rounded-full border border-white/50"
          initial={{ scale: 0.6, opacity: 0.8 }}
          animate={{ scale: 3.4, opacity: 0 }}
          transition={{ duration: 1.8, delay: i * 0.4, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
      <svg viewBox="0 0 96 96" className="w-32 h-32 relative" style={{ filter: 'drop-shadow(0 0 12px rgba(255,255,255,.8))' }}>
        <motion.circle
          cx="48" cy="48" r="42" fill="none" stroke="#fff" strokeWidth="3"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7 }}
        />
        <motion.path
          d="M28 50 L42 64 L68 34" fill="none" stroke="#fff" strokeWidth="6"
          strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.6, duration: 0.45 }}
        />
      </svg>
    </div>
    <motion.p
      initial={{ y: 14, opacity: 0, filter: 'blur(8px)' }}
      animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
      transition={{ delay: 0.9 }}
      className="dm-head text-2xl font-bold mb-1"
    >
      {title}
    </motion.p>
    <motion.p
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1.05 }}
      className="text-white/85"
    >
      {subtitle}
    </motion.p>
  </motion.div>
);