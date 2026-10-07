import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Flame,
  Award,
  Calendar,
  Sparkles,
  MessageCircle,
  Send,
  Twitter
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';

interface ShareStreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakDays: number;
  completedActivitiesCount: number;
  currentPoints: number;
  seniorMode?: boolean;
}

export const ShareStreakModal: React.FC<ShareStreakModalProps> = ({
  isOpen,
  onClose,
  streakDays = 24,
  completedActivitiesCount = 5,
  currentPoints = 1250,
  seniorMode = false
}) => {
  const [copied, setCopied] = useState(false);
  const [shareFormat, setShareFormat] = useState<'standard' | 'milestone' | 'urdu'>('standard');
  const { light, success } = useHaptics();

  if (!isOpen) return null;

  // Formatted share texts
  const shareTexts = {
    standard: `🔥 I'm on a ${streakDays}-Day Learning Streak on JoyEarn!\n🎯 5 Educational Activities solved daily\n⭐ Total JoyPoints: ${currentPoints.toLocaleString()} Pts\n🏆 Hit 5-activity daily goal today (${completedActivitiesCount}/5)!\n\nJoin me in daily learning: https://joyearn.app/invite?ref=STAR2026\n#JoyEarn #LearningStreak #DailyHabits`,
    milestone: `🏆 STREAK MILESTONE ACHIEVED!\n🔥 ${streakDays} Consecutive Days of Learning & Earning\n⭐ Total Points Earned: ${currentPoints.toLocaleString()} JoyPoints\n🎯 100% Consistency Rating on JoyEarn!\n\nCompete with me here: https://joyearn.app/invite?ref=STAR2026\n#JoyEarn #Milestone #LearningConsistency`,
    urdu: `🔥 جوائے ارن پر میرا ${streakDays} دنوں کا مسلسل سیکھنے کا اسٹریک جاری ہے!\n🎯 روزانہ 5 تعلیمی سرگرمیاں مکمل\n⭐ کل پوائنٹس: ${currentPoints.toLocaleString()}\n\nمیرے ساتھ شامل ہوں اور سیکھ کر کمائیں: https://joyearn.app/invite?ref=STAR2026\n#JoyEarn #تعلیم #اسٹریک`
  };

  const activeText = shareTexts[shareFormat];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeText);
      setCopied(true);
      soundService.playClick();
      success();
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = activeText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    soundService.playClick();
    light();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `My ${streakDays}-Day Learning Streak on JoyEarn`,
          text: activeText,
          url: 'https://joyearn.app/invite?ref=STAR2026'
        });
        success();
        return;
      } catch {
        // User cancelled or unsupported
      }
    }
    handleCopy();
  };

  const shareViaWhatsApp = () => {
    soundService.playClick();
    light();
    const url = `https://wa.me/?text=${encodeURIComponent(activeText)}`;
    window.open(url, '_blank');
  };

  const shareViaTelegram = () => {
    soundService.playClick();
    light();
    const url = `https://t.me/share/url?url=${encodeURIComponent('https://joyearn.app')}&text=${encodeURIComponent(activeText)}`;
    window.open(url, '_blank');
  };

  const shareViaTwitter = () => {
    soundService.playClick();
    light();
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(activeText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-amber-300 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">
              🔥
            </div>
            <div>
              <h2 className="font-black text-sm sm:text-base leading-tight">
                {seniorMode ? 'میرا اسٹریک شیئر کریں' : 'Share My Streak'}
              </h2>
              <p className="text-[11px] text-amber-100 font-medium">
                {seniorMode
                  ? 'سوشل میڈیا یا میسجنگ ایپس پر اپنی کامیابی شیئر کریں'
                  : 'Broadcast your 5-activity learning consistency'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundService.playClick();
              light();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Format Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-black">
            <button
              onClick={() => {
                soundService.playClick();
                light();
                setShareFormat('standard');
              }}
              className={`flex-1 py-1.5 rounded-xl transition-all ${
                shareFormat === 'standard'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Standard
            </button>
            <button
              onClick={() => {
                soundService.playClick();
                light();
                setShareFormat('milestone');
              }}
              className={`flex-1 py-1.5 rounded-xl transition-all ${
                shareFormat === 'milestone'
                  ? 'bg-white text-amber-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Milestone 🏆
            </button>
            <button
              onClick={() => {
                soundService.playClick();
                light();
                setShareFormat('urdu');
              }}
              className={`flex-1 py-1.5 rounded-xl transition-all ${
                shareFormat === 'urdu'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              اردو
            </button>
          </div>

          {/* Visual Streak Card Preview */}
          <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm relative overflow-hidden space-y-3">
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-24 h-24 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>JoyEarn Streak Certificate</span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded-full shadow-xs">
                Active Streak
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 flex items-center gap-1">
                <span>{streakDays}</span>
                <span className="text-2xl text-amber-500">Days</span>
              </div>
              <div className="text-xs text-slate-700 font-semibold space-y-0.5 border-l-2 border-amber-200 pl-3">
                <div className="flex items-center gap-1 text-emerald-800 font-bold">
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>5/5 Daily Goals Hit</span>
                </div>
                <div className="text-slate-500 text-[11px]">
                  ⭐ {currentPoints.toLocaleString()} Total JoyPoints
                </div>
              </div>
            </div>

            {/* Formatted Text Box */}
            <div className="bg-white/90 p-3 rounded-xl border border-amber-200/80 text-xs text-slate-800 font-mono whitespace-pre-line leading-relaxed shadow-inner">
              {activeText}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={handleCopy}
              className={`w-full py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all tap-bounce ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{seniorMode ? 'کاپی ہوگیا! ✓' : 'Copied to Clipboard! ✓'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>{seniorMode ? 'ٹیکسٹ کاپی کریں' : 'Copy Streak Summary'}</span>
                </>
              )}
            </button>

            {/* Quick Share to Social Apps */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button
                onClick={handleNativeShare}
                className="py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-colors"
                title="System Share"
              >
                <Share2 className="w-4 h-4 text-indigo-600" />
                <span>Share</span>
              </button>

              <button
                onClick={shareViaWhatsApp}
                className="py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-colors"
                title="WhatsApp"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp</span>
              </button>

              <button
                onClick={shareViaTelegram}
                className="py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-colors"
                title="Telegram"
              >
                <Send className="w-4 h-4 text-sky-600" />
                <span>Telegram</span>
              </button>

              <button
                onClick={shareViaTwitter}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-colors"
                title="X / Twitter"
              >
                <Twitter className="w-4 h-4 text-slate-800" />
                <span>Twitter / X</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-500 font-medium">
          {seniorMode
            ? 'سیکھنے کا تسلسل برقرار رکھیں اور اپنے دوستوں کے ساتھ مقابلہ کریں!'
            : 'Encourage friends to build healthy daily learning habits!'}
        </div>
      </div>
    </div>
  );
};
