import React, { useState, useEffect } from 'react';
import { X, Play, Sparkles, CheckCircle2, Award } from 'lucide-react';
import { ADMOB_CONFIG, adMobManager, ADS_ENABLED } from '../services/adMobService';
import { soundService } from '../services/soundService';

interface AdMobRewardedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardEarned: (multiplierBonus: number) => void;
  baseRewardPoints?: number;
  seniorMode?: boolean;
}

export const AdMobRewardedModal: React.FC<AdMobRewardedModalProps> = ({
  isOpen,
  onClose,
  onRewardEarned,
  baseRewardPoints = 25,
  seniorMode = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState(6);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!isOpen || !ADS_ENABLED) {
      setIsPlaying(false);
      setIsCompleted(false);
      return;
    }

    adMobManager.setIsAdShowing(true);
    return () => {
      adMobManager.setIsAdShowing(false);
    };
  }, [isOpen]);

  const handleStartWatching = () => {
    soundService.playClick();
    setIsPlaying(true);
    setCountdown(6);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsPlaying(false);
          setIsCompleted(true);
          soundService.playFanfare();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleClaimDoubleReward = () => {
    soundService.playFanfare();
    adMobManager.recordInterstitialShown();
    onRewardEarned(baseRewardPoints);
    onClose();
  };

  if (!isOpen || !ADS_ENABLED) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-400 rounded-3xl p-6 text-white text-center shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          disabled={isPlaying}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold tap-bounce"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/20 border border-amber-400/40 text-amber-300 rounded-full font-black text-[11px] uppercase tracking-wide">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Google AdMob Rewarded Video</span>
        </div>

        {/* Content */}
        {!isCompleted ? (
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 mx-auto flex items-center justify-center text-4xl shadow-xl border-2 border-white/20">
              🪙
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-lg text-white">
                {seniorMode ? 'پوائنٹس دوگنا کریں! ✨' : 'Double Your Points! ✨'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed px-2">
                {seniorMode
                  ? 'ایک مختصر اسپانسر ویڈیو دیکھیں اور اپنے پوائنٹس فوری دوگنا کریں۔'
                  : `Watch a short sponsor message to earn an extra +${baseRewardPoints} bonus points instantly.`}
              </p>
            </div>

            {isPlaying ? (
              <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 space-y-2">
                <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-xs">
                  <Play className="w-4 h-4 animate-pulse" />
                  <span>Playing Short Video... {countdown}s</span>
                </div>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-400 h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${((6 - countdown) / 6) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={handleStartWatching}
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-950 font-black rounded-xl text-xs shadow-lg tap-bounce flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>{seniorMode ? 'ویڈیو دیکھیں اور 2x حاصل کریں' : 'Watch Video for 2x Points'}</span>
              </button>
            )}
          </div>
        ) : (
          /* Completed View */
          <div className="space-y-4 py-2">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto text-3xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h4 className="font-black text-lg text-emerald-400">
                {seniorMode ? 'مبارک ہو! انعام تیار ہے' : 'Reward Unlocked!'}
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                +{baseRewardPoints} Points ready to be added to your balance.
              </p>
            </div>

            <button
              onClick={handleClaimDoubleReward}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black rounded-xl text-xs shadow-lg tap-bounce"
            >
              {seniorMode ? 'پوائنٹس وصول کریں 🎉' : 'Claim 2x Bonus Points 🎉'}
            </button>
          </div>
        )}

        <div className="text-[9px] font-mono text-slate-500">
          Unit: {ADMOB_CONFIG.REWARDED_POINTS_UNIT_ID}
        </div>
      </div>
    </div>
  );
};
