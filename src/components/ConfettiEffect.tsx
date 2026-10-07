import React, { useEffect, useRef } from 'react';

interface ConfettiEffectProps {
  trigger: boolean;
  onComplete?: () => void;
}

interface Particle {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: 'rect' | 'circle' | 'star';
}

const COLORS = [
  '#f43f5e', // rose
  '#10b981', // emerald
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#eab308', // yellow
  '#06b6d4', // cyan
];

export const ConfettiEffect: React.FC<ConfettiEffectProps> = ({ trigger, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!trigger) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    // Generate 120 particles bursting from center and top
    const particleCount = 120;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const isLeft = Math.random() < 0.5;
      particles.push({
        x: isLeft ? width * 0.2 + Math.random() * (width * 0.1) : width * 0.7 + Math.random() * (width * 0.1),
        y: height * 0.4 + (Math.random() * 50 - 25),
        w: Math.random() * 8 + 6,
        h: Math.random() * 12 + 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        vx: (isLeft ? 1 : -1) * (Math.random() * 7 + 2) + (Math.random() * 6 - 3),
        vy: -(Math.random() * 12 + 7),
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        opacity: 1,
        shape: Math.random() < 0.2 ? 'circle' : Math.random() < 0.1 ? 'star' : 'rect',
      });
    }

    let animationFrameId: number;
    const startTime = Date.now();
    const duration = 2800; // 2.8 seconds celebration

    const render = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) {
        ctx.clearRect(0, 0, width, height);
        onComplete?.();
        return;
      }

      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.vx *= 0.985; // air resistance
        p.rotation += p.rotationSpeed;

        if (elapsed > duration - 800) {
          p.opacity = Math.max(0, (duration - elapsed) / 800);
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'star') {
          ctx.beginPath();
          for (let s = 0; s < 5; s++) {
            ctx.lineTo(Math.cos(((18 + s * 72) * Math.PI) / 180) * p.w, -Math.sin(((18 + s * 72) * Math.PI) / 180) * p.w);
            ctx.lineTo(Math.cos(((54 + s * 72) * Math.PI) / 180) * (p.w / 2), -Math.sin(((54 + s * 72) * Math.PI) / 180) * (p.w / 2));
          }
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (canvasRef.current && ctx) {
        ctx.clearRect(0, 0, width, height);
      }
    };
  }, [trigger, onComplete]);

  if (!trigger) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[100]"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};
