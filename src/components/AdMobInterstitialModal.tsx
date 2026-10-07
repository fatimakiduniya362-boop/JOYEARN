import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Sparkles } from 'lucide-react';
import { ADMOB_CONFIG, adMobManager, ADS_ENABLED } from '../services/adMobService';
import { soundService } from '../services/soundService';

interface AdMobInterstitialModalProps {
  isOpen: boolean;
  onClose: () => void;
  seniorMode?: boolean;
}

export const AdMobInterstitialModal: React.FC<AdMobInterstitialModalProps> = ({
  isOpen,
  onClose,
  seniorMode = false,
}) => {
  const [countdown, setCountdown] = useState(5);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    if (!isOpen || !ADS_ENABLED) return;

    adMobManager.setIsAdShowing(true);
    setCountdown(5);
    setCanClose(false);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      adMobManager.setIsAdShowing(false);
    };
  }, [isOpen]);

  const handleDismiss = () => {
    if (!canClose) return;
    soundService.playClick();
    adMobManager.recordInterstitialShown();
    adMobManager.setIsAdShowing(false);
    onClose();
  };

  if (!isOpen || !ADS_ENABLED) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 text-white text-center shadow-2xl space-y-5 relative">
        {/* Top bar with Ad badge & Close */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-400 text-slate-950 rounded-full font-black text-[10px] uppercase tracking-wide">
            <span>Google AdMob Interstitial</span>
          </div>

          {canClose ? (
            <button
              onClick={handleDismiss}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-xs font-bold tap-bounce"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="text-[11px] font-mono text-slate-400">
              Close in {countdown}s
            </span>
          )}
        </div>

        {/* Ad Mock Screen / Preview */}
        <div className="py-6 px-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-500 mx-auto flex items-center justify-center text-3xl shadow-lg">
            🌟
          </div>
          <div>
            <h4 className="font-black text-base text-white">
              {seniorMode ? 'تعلیمی کوئز مکمل!' : 'Educational Milestone Reached!'}
            </h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {seniorMode
                ? 'خاندانی تفریح اور علم کی حوصلہ افزائی کا پلیٹ فارم۔'
                : 'Thank you for learning with JoyEarn! Keep answering daily questions to grow your streak.'}
            </p>
          </div>
        </div>

        {/* Unit ID Disclaimer */}
        <div className="text-[10px] text-slate-500 space-y-1">
          <p className="font-mono truncate">Unit: {ADMOB_CONFIG.INTERSTITIAL_QUIZ_UNIT_ID}</p>
          <p>Rate limited to at most 1 ad per 2 minutes • Family policy safe</p>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleDismiss}
          disabled={!canClose}
          className={`w-full py-3 rounded-xl font-extrabold text-xs shadow-md tap-bounce transition-all ${
            canClose
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-95'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {canClose
            ? seniorMode
              ? 'جاری رکھیں'
              : 'Return to App'
            : `Please wait ${countdown}s...`}
        </button>
      </div>
    </div>
  );
};
