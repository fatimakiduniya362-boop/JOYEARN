import React, { useState, useEffect } from 'react';
import { X, Play, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { ADMOB_CONFIG, adMobManager } from '../services/adMobService';
import { soundService } from '../services/soundService';

interface AdMobRewardedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardEarned: (multiplierBonus: number) => void;
  baseRewardPoints?: number;
  seniorMode?: boolean;
}

/**
 * Policy-Compliant Optional Rewarded Perk Modal:
 * - Strictly complies with Google AdMob compensation-program rules:
 *   NEVER awards withdrawable cash or cash-convertible wallet points for viewing ads.
 * - Grants only non-transferable in-app learning perks (e.g., extra quiz hint / practice boost).
 * - Records real AdMob request / NO_FILL / impression telemetry.
 */
export const AdMobRewardedModal: React.FC<AdMobRewardedModalProps> = ({
  isOpen,
  onClose,
  onRewardEarned,
  seniorMode = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState(6);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const config = adMobManager.getConfig();
    if (!isOpen || !config.adsEnabled) {
      setIsPlaying(false);
      setIsCompleted(false);
      return;
    }

    adMobManager.setIsAdShowing(true);
    adMobManager.recordAdRequest('rewarded');
    const sdkStatus = adMobManager.getSdkStatus();
    if (sdkStatus === 'offline') {
      adMobManager.recordAdError('rewarded', 'LOAD_ERROR', 'Device offline — rewarded ad unavailable.');
    } else if (sdkStatus === 'native_bridge_ready' || sdkStatus === 'web_adsense_ready') {
      adMobManager.recordAdMatched('rewarded');
    } else {
      adMobManager.recordAdError(
        'rewarded',
        'NO_FILL',
        'Web preview active — native Android AdMob SDK not attached.'
      );
    }

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

  const handleClaimInAppPerk = () => {
    soundService.playFanfare();
    const sdkStatus = adMobManager.getSdkStatus();
    if (sdkStatus === 'native_bridge_ready' || sdkStatus === 'web_adsense_ready') {
      adMobManager.recordRewardedShown();
    }
    try {
      const cur = parseInt(localStorage.getItem('joyearn_quiz_hints') || '0', 10);
      localStorage.setItem('joyearn_quiz_hints', String(cur + 1));
    } catch {}
    // Policy compliance: 0 withdrawable wallet points granted for viewing ads
    onRewardEarned(0);
    onClose();
  };

  if (!isOpen || !adMobManager.getConfig().adsEnabled) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border-2 border-pink-400/70 rounded-3xl p-6 text-white text-center shadow-2xl space-y-5 relative">
        <button
          type="button"
          onClick={onClose}
          disabled={isPlaying}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold tap-bounce"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-500/20 border border-pink-400/40 text-pink-200 rounded-full font-black text-[11px] uppercase tracking-wide">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Optional In-App Learning Perk</span>
        </div>

        {!isCompleted ? (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 mx-auto flex items-center justify-center text-3xl shadow-lg">
              💡
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-base text-white">
                {seniorMode ? 'مفت کوئز ہنٹ حاصل کریں' : 'Unlock +1 Free Quiz Hint'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed px-2">
                {seniorMode
                  ? 'یہ اختیاری ہے اور صرف ایپ کے اندر سیکھنے کے لیے ہے (والیٹ بیلنس سے الگ)۔'
                  : 'Optional in-app perk only. Non-transferable and separate from your withdrawable wallet.'}
              </p>
            </div>

            {isPlaying ? (
              <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 space-y-2">
                <div className="flex items-center justify-center gap-2 text-pink-300 font-bold text-xs">
                  <Play className="w-4 h-4 animate-pulse" />
                  <span>Loading optional sponsor message... {countdown}s</span>
                </div>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-400 h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${((6 - countdown) / 6) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartWatching}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 hover:brightness-110 text-white font-black rounded-xl text-xs shadow-lg tap-bounce flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{seniorMode ? 'مفت ہنٹ ان لاک کریں' : 'Unlock Free Quiz Hint (Optional)'}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h4 className="font-black text-base text-emerald-400">
                {seniorMode ? 'ہنٹ تیار ہے!' : 'Quiz Hint Unlocked!'}
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                +1 in-app Quiz Hint added to your study toolkit (non-cash perk).
              </p>
            </div>

            <button
              type="button"
              onClick={handleClaimInAppPerk}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black rounded-xl text-xs shadow-lg tap-bounce"
            >
              {seniorMode ? 'ہنٹ محفوظ کریں' : 'Save Quiz Hint'}
            </button>
          </div>
        )}

        <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Separate from wallet • Unit: {ADMOB_CONFIG.REWARDED_BENEFIT_UNIT_ID.slice(-10)}</span>
        </div>
      </div>
    </div>
  );
};
