import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Trophy, Award, Gift, Clock, AlertCircle, Volume2, VolumeX, CheckCircle2 } from 'lucide-react';
import { hapticService } from '../services/haptics';
import { VirtualCurrencyDisclaimer } from './VirtualCurrencyDisclaimer';
import { getTodayWheelSectors } from '../utils/dailyRotation';

export interface WheelSegment {
  id: number;
  label: string;
  points: number;
  color: string;
  textColor: string;
  emoji: string;
}

const getDailySegments = (): WheelSegment[] => {
  const sectors = getTodayWheelSectors();
  const emojis = ['⭐', '💎', '🍀', '🏆', '⚡', '🎁', '🌟', '🌸'];
  return sectors.map((sec, i) => ({
    id: i,
    label: sec.label,
    points: sec.points,
    color: sec.color,
    textColor: sec.textColor,
    emoji: emojis[i % emojis.length],
  }));
};

const SEGMENTS: WheelSegment[] = getDailySegments();

interface LuckyWheelModalProps {
  onEarnPoints: (points: number, reason: string) => void;
  onClose: () => void;
  seniorMode: boolean;
  hasSpunToday: boolean;
  onSpinCompleted: () => void;
  onTriggerJackpotConfetti?: () => void;
}

export const LuckyWheelModal: React.FC<LuckyWheelModalProps> = ({
  onEarnPoints,
  onClose,
  seniorMode,
  hasSpunToday,
  onSpinCompleted,
  onTriggerJackpotConfetti
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winningSegment, setWinningSegment] = useState<WheelSegment | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [timeUntilTomorrow, setTimeUntilTomorrow] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  // Audio synthesize click effect
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playTickSound = () => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioCtxRef.current = new AudioCtx();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      if (audioCtxRef.current) {
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(500, audioCtxRef.current.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtxRef.current.currentTime + 0.05);
        gain.gain.setValueAtTime(0.08, audioCtxRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(audioCtxRef.current.destination);
        osc.start();
        osc.stop(audioCtxRef.current.currentTime + 0.05);
      }
    } catch {
      // Audio not supported or blocked
    }
  };

  const playWinFanfare = () => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current) {
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
          const osc = audioCtxRef.current!.createOscillator();
          const gain = audioCtxRef.current!.createGain();
          const startTime = audioCtxRef.current!.currentTime + idx * 0.1;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.12, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
          osc.connect(gain);
          gain.connect(audioCtxRef.current!.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.25);
        });
      }
    } catch {
      // Ignore
    }
  };

  // Countdown timer to midnight
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diffMs = tomorrow.getTime() - now.getTime();

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      setTimeUntilTomorrow(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSpin = () => {
    if (isSpinning || hasSpunToday) return;

    hapticService.medium();
    setIsSpinning(true);
    setShowCelebration(false);
    setWinningSegment(null);

    // Pick random winning segment
    const segmentCount = SEGMENTS.length;
    const chosenIndex = Math.floor(Math.random() * segmentCount);
    const chosenSegment = SEGMENTS[chosenIndex];

    // Each segment covers (360 / 8) = 45 degrees
    const segmentAngle = 360 / segmentCount;
    // Segment 0 is at [0, 45], centered at 22.5.
    // Pointer is at the top (0 deg / 12 o'clock).
    // To land slice `chosenIndex` at the top pointer, target angle is:
    // 360 - (chosenIndex * segmentAngle + segmentAngle / 2)
    const targetOffset = 360 - (chosenIndex * segmentAngle + segmentAngle / 2);

    // Give 5 to 7 full 360 rotations for suspense
    const extraRotations = 360 * 6;
    const finalRotation = rotation + extraRotations + (targetOffset - (rotation % 360) + 360) % 360;

    setRotation(finalRotation);

    // Ticking audio interval simulation
    const tickInterval = setInterval(() => {
      playTickSound();
    }, 180);

    setTimeout(() => {
      clearInterval(tickInterval);
    }, 3200);

    // 4 seconds animation ends
    setTimeout(() => {
      setIsSpinning(false);
      setWinningSegment(chosenSegment);
      setShowCelebration(true);
      playWinFanfare();

      // Trigger haptic vibration if available
      hapticService.vibrate([100, 50, 100, 50, 150]);

      // Award points and notify app
      onEarnPoints(
        chosenSegment.points,
        seniorMode
          ? `لکی وہیل بونس: +${chosenSegment.points} پوائنٹس`
          : `Lucky Wheel Bonus: +${chosenSegment.points} Points`
      );
      // Trigger celebratory confetti for Lucky Wheel jackpot
      if (chosenSegment.points >= 50 || chosenSegment.id === 3) {
        onTriggerJackpotConfetti?.();
      }
      onSpinCompleted();
    }, 4000);
  };

  const segmentAngle = 360 / SEGMENTS.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 overflow-y-auto">
      <div className="bg-gradient-to-b from-white via-slate-50 to-pink-50 rounded-3xl w-full max-w-sm p-5 text-center shadow-2xl border-4 border-fuchsia-300 relative space-y-4 my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold z-20 tap-bounce"
        >
          ✕
        </button>

        {/* Audio Mute Toggle */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="absolute top-3 left-3 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 z-20 tap-bounce"
          title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-gray-400" /> : <Volume2 className="w-4 h-4 text-fuchsia-600" />}
        </button>

        {/* Header */}
        <div className="space-y-1 pt-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-fuchsia-100 to-pink-100 rounded-full text-fuchsia-800 text-xs font-black shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-600 animate-spin-slow" />
            <span>{seniorMode ? 'روزانہ 1 مفت چکر' : '1 Free Spin Daily'}</span>
          </div>
          <h2 className="font-black text-2xl text-slate-900 tracking-tight flex items-center justify-center gap-2">
            <span>🎡</span>
            <span>{seniorMode ? 'لکی وہیل' : 'Lucky Wheel'}</span>
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            {seniorMode
              ? 'اپنا خوش قسمت انعام جیتنے کے لیے چرخہ گھمائیں!'
              : 'Spin the wheel once a day to win free bonus reward points!'}
          </p>
        </div>

        {/* Wheel Container with Pointer */}
        <div className="relative flex items-center justify-center py-2 select-none">
          {/* Wheel Outer Rim Glow */}
          <div className="w-68 h-68 rounded-full bg-gradient-to-tr from-amber-400 via-fuchsia-500 to-rose-500 p-2 shadow-xl relative flex items-center justify-center">
            
            {/* Pointer / Needle at top */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none drop-shadow-md">
              <div className="w-6 h-7 bg-amber-400 clip-triangle shadow-sm border border-amber-500 transform rotate-180" 
                   style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
              <div className="w-3.5 h-3.5 rounded-full bg-rose-600 border-2 border-white -mt-5" />
            </div>

            {/* Rotating Wheel Disc */}
            <div
              className="w-full h-full rounded-full relative overflow-hidden shadow-inner bg-slate-900"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning ? 'transform 4s cubic-bezier(0.12, 0.8, 0.15, 1)' : 'none'
              }}
            >
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {SEGMENTS.map((seg, i) => {
                  const startAngle = (i * segmentAngle * Math.PI) / 180;
                  const endAngle = (((i + 1) * segmentAngle) * Math.PI) / 180;
                  const x1 = 100 + 100 * Math.cos(startAngle);
                  const y1 = 100 + 100 * Math.sin(startAngle);
                  const x2 = 100 + 100 * Math.cos(endAngle);
                  const y2 = 100 + 100 * Math.sin(endAngle);
                  const pathData = `M 100 100 L ${x1} ${y1} A 100 100 0 0 1 ${x2} ${y2} Z`;

                  // Center angle for text orientation
                  const midAngleDeg = i * segmentAngle + segmentAngle / 2;

                  return (
                    <g key={seg.id}>
                      <path d={pathData} fill={seg.color} stroke="#ffffff" strokeWidth="1.5" />
                      <g transform={`rotate(${midAngleDeg} 100 100)`}>
                        <text
                          x="162"
                          y="104"
                          fill={seg.textColor}
                          fontSize="9.5"
                          fontWeight="900"
                          textAnchor="middle"
                          transform={`rotate(90 162 100)`}
                          filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.5))"
                        >
                          {seg.emoji} {seg.label}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>

              {/* Decorative outer light beads */}
              {Array.from({ length: 16 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-white shadow-xs"
                  style={{
                    top: `${50 - 46 * Math.cos((i * 22.5 * Math.PI) / 180)}%`,
                    left: `${50 + 46 * Math.sin((i * 22.5 * Math.PI) / 180)}%`,
                    transform: 'translate(-50%, -50%)',
                    opacity: 0.9
                  }}
                />
              ))}

              {/* Center Hub */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 border-4 border-white shadow-md flex items-center justify-center text-lg z-10">
                <span className="animate-pulse">💎</span>
              </div>
            </div>
          </div>
        </div>

        {/* Celebration / Won Banner */}
        {showCelebration && winningSegment && (
          <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white p-3.5 rounded-2xl shadow-lg space-y-1.5 animate-bounce-subtle border-2 border-emerald-300">
            <div className="text-2xl">🎉 {winningSegment.emoji} 🎊</div>
            <div className="text-base font-black">
              {seniorMode
                ? `مبارک ہو! آپ نے +${winningSegment.points} پوائنٹس جیتے!`
                : `Congratulations! Won +${winningSegment.points} Points!`}
            </div>
            <p className="text-[11px] text-emerald-100 font-semibold">
              {seniorMode
                ? 'یہ پوائنٹس آپ کے والٹ بیلنس میں جمع ہو چکے ہیں 👛'
                : 'Points credited to your live reward balance instantly! 👛'}
            </p>
          </div>
        )}

        {/* Action Button & Status */}
        {hasSpunToday ? (
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3.5 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-slate-700 text-xs font-extrabold">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{seniorMode ? 'آج کا اسپن مکمل ہو چکا ہے' : "Today's Spin Completed"}</span>
            </div>
            <p className="text-xs text-slate-500">
              {seniorMode
                ? 'آپ کل دوبارہ مفت چرخہ گھما سکتے ہیں!'
                : 'Free spin resets every night at 12:00 AM.'}
            </p>
            <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1 rounded-full text-xs font-black text-rose-600">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {seniorMode ? 'اگلا اسپن:' : 'Next Free Spin:'} {timeUntilTomorrow}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <button
              onClick={handleSpin}
              disabled={isSpinning}
              className={`w-full py-4 bg-gradient-to-r from-fuchsia-600 via-pink-600 to-rose-500 hover:from-fuchsia-700 hover:to-rose-600 text-white font-black rounded-2xl shadow-lg shadow-pink-500/30 text-base tap-bounce flex items-center justify-center gap-2 ${
                isSpinning ? 'opacity-80 cursor-wait' : 'hover:scale-[1.02]'
              }`}
            >
              <Sparkles className="w-5 h-5 animate-spin" />
              <span>
                {isSpinning
                  ? seniorMode
                    ? 'چرخہ گھوم رہا ہے...'
                    : 'Spinning Wheel...'
                  : seniorMode
                  ? 'ابھی چرخہ گھمائیں (مفت)'
                  : 'SPIN THE WHEEL (FREE)'}
              </span>
            </button>
            <p className="text-[11px] text-gray-500 font-medium">
              {seniorMode ? '100% مفت • کوئی چارجز نہیں' : '100% Free daily bonus • 0 real money needed'}
            </p>
          </div>
        )}

        {/* Transparent Policy Note */}
        <VirtualCurrencyDisclaimer
          variant="badge"
          language={seniorMode ? 'ur' : 'en'}
          className="rounded-xl py-2 px-3 bg-slate-950 border border-amber-400/80 shadow-sm"
        />
      </div>
    </div>
  );
};
