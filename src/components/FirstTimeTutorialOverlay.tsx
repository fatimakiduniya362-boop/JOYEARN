import React, { useState, useEffect } from 'react';
import { Video, CheckSquare, Coins, Sparkles, X, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react';
import { soundService } from '../services/soundService';

interface TutorialStep {
  title: string;
  titleUrdu: string;
  description: string;
  descriptionUrdu: string;
  icon: React.ReactNode;
  badge: string;
  badgeUrdu: string;
  targetFeature: 'videos' | 'tasks' | 'points';
}

interface FirstTimeTutorialOverlayProps {
  seniorMode?: boolean;
  onComplete?: () => void;
  forceShow?: boolean;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    targetFeature: 'videos',
    title: 'Watch & Learn with Educational Videos',
    titleUrdu: 'تعلیمی ویڈیوز دیکھ کر پوائنٹس کمائیں',
    description: 'Explore curated lessons, nature documentaries, and fun crafts. Earn virtual JoyPoints for every milestone you complete!',
    descriptionUrdu: 'منتخب تعلیمی اسباق اور سائنسی ویڈیوز دیکھیں۔ ہر مکمل ویڈیو پر جوائے پوائنٹس حاصل کریں!',
    icon: <Video className="w-6 h-6 text-rose-500" />,
    badge: 'Step 1 of 3: Video Lessons',
    badgeUrdu: 'پہلا مرحلہ: ویڈیو اسباق'
  },
  {
    targetFeature: 'tasks',
    title: 'Daily Quizzes & Wholesome Tasks',
    titleUrdu: 'روزانہ کوئز اور تفریحی ٹاسکس',
    description: 'Test your knowledge with quick trivia questions, lucky wheel spins, and scratch cards to build your daily streak.',
    descriptionUrdu: 'روزانہ سائنسی و معلوماتی کوئز حل کریں اور اسپن وہیل گھما کر اپنے تسلسل کو برقرار رکھیں۔',
    icon: <CheckSquare className="w-6 h-6 text-indigo-500" />,
    badge: 'Step 2 of 3: Tasks & Quizzes',
    badgeUrdu: 'دوسرا مرحلہ: کوئز اور ٹاسکس'
  },
  {
    targetFeature: 'points',
    title: 'Track Your JoyPoints & Milestones',
    titleUrdu: 'اپنے جوائے پوائنٹس اور سنگ میل دیکھیں',
    description: 'JoyPoints are educational tokens that unlock exclusive avatar badges, streak trophies, and digital perks in your Wallet.',
    descriptionUrdu: 'جوائے پوائنٹس تعلیمی ورچوئل پوائنٹس ہیں جن سے آپ نئے بیجز اور انعامات ان لاک کر سکتے ہیں۔',
    icon: <Coins className="w-6 h-6 text-amber-500" />,
    badge: 'Step 3 of 3: Points & Rewards',
    badgeUrdu: 'تیسرا مرحلہ: پوائنٹس اور انعامات'
  }
];

export const FirstTimeTutorialOverlay: React.FC<FirstTimeTutorialOverlayProps> = ({
  seniorMode = false,
  onComplete,
  forceShow = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (forceShow) {
      setIsOpen(true);
      return;
    }
    const hasSeen = localStorage.getItem('joyearn_tutorial_completed');
    if (!hasSeen) {
      // Delay slightly so app loads cleanly first
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  const handleFinish = () => {
    soundService.playFanfare();
    localStorage.setItem('joyearn_tutorial_completed', 'true');
    setIsOpen(false);
    onComplete?.();
  };

  const handleNext = () => {
    soundService.playClick();
    if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    soundService.playClick();
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    soundService.playClick();
    localStorage.setItem('joyearn_tutorial_completed', 'true');
    setIsOpen(false);
    onComplete?.();
  };

  if (!isOpen) return null;

  const step = TUTORIAL_STEPS[currentStepIndex];

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-300">
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border-2 border-indigo-200 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Glow Header Accent */}
        <div className="h-2 bg-gradient-to-r from-rose-500 via-indigo-500 to-amber-500" />

        {/* Close / Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center tap-bounce"
          aria-label="Skip Tutorial"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 space-y-5 text-center">
          {/* Step Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-[11px] font-black text-indigo-700">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{seniorMode ? step.badgeUrdu : step.badge}</span>
          </div>

          {/* Feature Icon Card */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-50 to-indigo-50/80 border-2 border-indigo-100 flex items-center justify-center shadow-inner">
            {step.icon}
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
              {seniorMode ? step.titleUrdu : step.title}
            </h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed px-2">
              {seniorMode ? step.descriptionUrdu : step.description}
            </p>
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {TUTORIAL_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStepIndex
                    ? 'w-6 bg-indigo-600'
                    : 'w-2 bg-slate-200'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-2">
            {currentStepIndex > 0 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs tap-bounce flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>{seniorMode ? 'پیچھے' : 'Back'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold px-2 tap-bounce"
              >
                {seniorMode ? 'چھوڑیں' : 'Skip'}
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-700 hover:to-teal-700 text-white font-black rounded-xl text-xs shadow-md tap-bounce flex items-center justify-center gap-1.5"
            >
              <span>
                {currentStepIndex === TUTORIAL_STEPS.length - 1
                  ? seniorMode
                    ? 'شروع کریں! 🎉'
                    : "Got It! Let's Go 🎉"
                  : seniorMode
                  ? 'اگلا'
                  : 'Next'}
              </span>
              {currentStepIndex < TUTORIAL_STEPS.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
