import React, { useEffect, useState } from 'react';
import { Flame, Sparkles, Trophy, Award, CheckCircle2 } from 'lucide-react';
import { soundService } from '../services/soundService';
import { hapticService } from '../services/haptics';

interface StreakFireCelebrationProps {
  streakDays: number;
  isOpen: boolean;
  onClose: () => void;
  seniorMode?: boolean;
}

export const StreakFireCelebration: React.FC<StreakFireCelebrationProps> = ({
  streakDays,
  isOpen,
  onClose,
  seniorMode = false,
}) => {
  const [particles, setParticles] = useState<{ id: number; left: number; delay: number; size: number }[]>([]);

  useEffect(() => {
    if (isOpen) {
      soundService.playStreakFlame();
      soundService.playFanfare();
      hapticService.heavy();

      // Generate 16 floating fire particles
      const newParticles = Array.from({ length: 16 }, (_, i) => ({
        id: i,
        left: Math.floor(Math.random() * 80) + 10,
        delay: Math.random() * 0.8,
        size: Math.floor(Math.random() * 14) + 12,
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => {
        onClose();
      }, 5500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-slate-950 via-amber-950/90 to-slate-950 rounded-3xl p-6 text-center text-white border-4 border-amber-400 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Fire glow background halo */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/30 via-orange-600/10 to-transparent pointer-events-none" />

        {/* Floating animated fire sparks */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute bottom-4 text-amber-400 animate-float-particle pointer-events-none"
            style={{
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              fontSize: `${p.size}px`,
            }}
          >
            🔥
          </div>
        ))}

        {/* Big Blazing Fire Emblem */}
        <div className="relative mx-auto w-24 h-24 mb-3 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-rose-600 via-orange-500 to-amber-400 blur-lg animate-pulse" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-red-600 via-orange-500 to-yellow-400 border-2 border-amber-200 flex items-center justify-center shadow-xl shadow-orange-500/50">
            <Flame className="w-12 h-12 text-white fill-white animate-bounce-subtle drop-shadow-md" />
          </div>
          <span className="absolute -top-1 -right-1 text-2xl animate-spin-slow">✨</span>
        </div>

        {/* Badge & Title */}
        <div className="space-y-1.5 relative z-10">
          <span className="inline-block px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-full shadow-md">
            Streak Fire Ignited!
          </span>

          <h2 className="text-2xl font-black text-amber-300 drop-shadow-md">
            {seniorMode ? `🔥 دن ${streakDays} اسٹریک مکمل!` : `🔥 Day ${streakDays} Streak Blazing!`}
          </h2>

          <p className="text-xs text-amber-100/90 leading-relaxed max-w-xs mx-auto">
            {seniorMode
              ? 'شاندار لگن! آپ نے آج کا روزانہ کوئز کامیابی سے مکمل کر کے اپنے تعلیمی سلسلے کو روشن رکھا ہے۔'
              : 'Outstanding commitment! You completed today’s daily quiz and your learning streak is burning brighter than ever.'}
          </p>
        </div>

        {/* Streak Count Banner */}
        <div className="my-4 p-3 bg-amber-500/20 border border-amber-400/60 rounded-2xl flex items-center justify-around relative z-10">
          <div className="text-center">
            <span className="text-[10px] text-amber-300 uppercase font-bold block">Current Streak</span>
            <span className="text-xl font-black text-white font-mono flex items-center justify-center gap-1">
              🔥 {streakDays} <span className="text-xs text-amber-200">Days</span>
            </span>
          </div>
          <div className="w-px h-8 bg-amber-400/40" />
          <div className="text-center">
            <span className="text-[10px] text-amber-300 uppercase font-bold block">Quiz Reward</span>
            <span className="text-xl font-black text-emerald-400 font-mono">
              +50 <span className="text-xs text-emerald-200">Pts</span>
            </span>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-slate-950 font-black rounded-xl text-xs shadow-lg tap-bounce hover:brightness-110 relative z-10"
        >
          {seniorMode ? 'شاباش! جاری رکھیں' : 'Keep The Fire Burning! 🔥'}
        </button>
      </div>
    </div>
  );
};
