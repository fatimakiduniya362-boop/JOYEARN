import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, Lock, X, Heart, Eye } from 'lucide-react';
import { soundService } from '../services/soundService';

interface CommunitySafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  onAgree?: () => void;
  isSafetyGate?: boolean; // If true, acts as pre-camera permission / acknowledgment gate
  seniorMode?: boolean;
}

export const CommunitySafetyModal: React.FC<CommunitySafetyModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onAgree,
  isSafetyGate = false,
  seniorMode = false,
}) => {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    soundService.playClick();
    if (onConfirm) {
      onConfirm();
    }
    if (onAgree) {
      onAgree();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 max-w-md w-full max-h-[90vh] flex flex-col space-y-4 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-lg shadow-sm">
              🛡️
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base leading-tight text-white flex items-center gap-1.5">
                <span>{seniorMode ? 'کمیونٹی سیفٹی گائیڈ لائنز' : 'Community Safety Guidelines'}</span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  All-Ages
                </span>
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                {seniorMode
                  ? 'خاندانی تحفظ اور باوقار تعلیمی ماحول'
                  : 'Zero-Tolerance Policy for Vulgar, Obscene, or Harmful Content'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundService.playClick();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white tap-bounce text-xs font-bold"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notice Banner */}
        <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-2xl flex items-start gap-2.5 text-xs text-rose-200">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <p className="leading-snug">
            <strong>JoyEarn is an all-ages learning platform</strong> shared by children, students, parents, and seniors. Inappropriate or vulgar content will result in immediate rejection and account suspension.
          </p>
        </div>

        {/* Scrollable Guidelines Content */}
        <div className="flex-1 overflow-y-auto space-y-2.5 text-xs text-slate-300 pr-1 leading-relaxed">
          {/* Rule 1 */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
            <h4 className="font-black text-white text-xs flex items-center gap-1.5 text-rose-400">
              <span>🚫</span> 1. No Nudity, Sexual or Suggestive Content
            </h4>
            <p className="text-[11px] text-slate-400">
              Videos with nudity, immodest dress, sexually suggestive poses, provocative gestures, or adult themes are strictly prohibited.
            </p>
          </div>

          {/* Rule 2 */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
            <h4 className="font-black text-white text-xs flex items-center gap-1.5 text-amber-400">
              <span>🤐</span> 2. No Vulgarity, Obscenity or Abusive Language
            </h4>
            <p className="text-[11px] text-slate-400">
              Cursing, profanity, vulgar slang, insults, hateful comments, or verbal abuse in any language are completely barred from all audio and titles.
            </p>
          </div>

          {/* Rule 3 */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
            <h4 className="font-black text-white text-xs flex items-center gap-1.5 text-blue-400">
              <span>🌿</span> 3. Wholesome, Family & Educational Content Only
            </h4>
            <p className="text-[11px] text-slate-400">
              We welcome cooking recipes, gardening, home crafts, nature, science experiments, study vlogs, wholesome humor, and creative learning activities.
            </p>
          </div>

          {/* Rule 4 */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
            <h4 className="font-black text-white text-xs flex items-center gap-1.5 text-purple-400">
              <span>⚠️</span> 4. No Dangerous, Disturbing or Violent Material
            </h4>
            <p className="text-[11px] text-slate-400">
              Dangerous stunts, weapons, physical fighting, blood, animal cruelty, tobacco, gambling, or frightening content are prohibited.
            </p>
          </div>

          {/* Rule 5 */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
            <h4 className="font-black text-white text-xs flex items-center gap-1.5 text-emerald-400">
              <span>🛡️</span> 5. Pre-Moderation & Automated Safety Review
            </h4>
            <p className="text-[11px] text-slate-400">
              Every submitted vlog is held in a review queue before public visibility. Submissions with suspicious words or 3+ user reports are automatically quarantined.
            </p>
          </div>
        </div>

        {/* Confirmation Section */}
        {isSafetyGate ? (
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer select-none p-2 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 rounded text-pink-600 focus:ring-0 w-4 h-4 cursor-pointer accent-pink-600 shrink-0"
              />
              <span className="text-[11px] text-slate-300 font-semibold leading-snug">
                I have read and agree to the Community Safety Guidelines. I confirm my video will be 100% family-friendly, educational, and free of any vulgar or inappropriate material.
              </span>
            </label>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  soundService.playClick();
                  onClose();
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-xs tap-bounce"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!agreed}
                className="flex-1 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:brightness-110 disabled:opacity-40 text-white font-black rounded-xl text-xs tap-bounce shadow-md flex items-center justify-center gap-1.5 transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Continue to Camera</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                soundService.playClick();
                onClose();
              }}
              className="w-full py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:brightness-110 text-white font-black rounded-xl text-xs tap-bounce shadow-md"
            >
              Close Guidelines
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
