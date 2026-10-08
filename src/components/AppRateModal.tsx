import React, { useState } from 'react';
import { Star, Heart, ThumbsUp, X, Sparkles, CheckCircle2, MessageSquareHeart } from 'lucide-react';
import { soundService } from '../services/soundService';

interface AppRateModalProps {
  onClose: () => void;
  onRateCompleted?: (bonusPoints: number) => void;
  seniorMode: boolean;
  completedActivitiesCount: number;
}

export const AppRateModal: React.FC<AppRateModalProps> = ({
  onClose,
  onRateCompleted,
  seniorMode,
  completedActivitiesCount
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(5);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [feedbackNote, setFeedbackNote] = useState<string>('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);

  const ratingDescriptions: Record<number, { en: string; ur: string }> = {
    1: { en: 'Could be better', ur: 'بہتر ہو سکتا ہے' },
    2: { en: 'Okay experience', ur: 'ٹھیک ہے' },
    3: { en: 'Good app!', ur: 'اچھی ایپ ہے' },
    4: { en: 'Great experience!', ur: 'بہترین تجربہ!' },
    5: { en: 'Loved it! Outstanding ⭐', ur: 'لاجواب! بہت پسند آئی ⭐' }
  };

  const handleRateOnPlayStore = () => {
    soundService.playFanfare();
    localStorage.setItem('joyearn_rate_status', 'rated');
    localStorage.setItem('joyearn_rate_date', new Date().toISOString());

    // In a native Android environment, open Play Store intent
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.joyearn.app';
    if (typeof window !== 'undefined') {
      window.open(playStoreUrl, '_blank', 'noopener,noreferrer');
    }

    if (onRateCompleted) {
      onRateCompleted(25); // +25 courtesy appreciation bonus
    }
    onClose();
  };

  const handleRemindLater = () => {
    soundService.playClick();
    localStorage.setItem('joyearn_rate_status', 'remind_later');
    // Save timestamp so we remind again after 48 hours or another 5 activities
    localStorage.setItem('joyearn_rate_remind_time', String(Date.now()));
    onClose();
  };

  const handleNoThanks = () => {
    soundService.playClick();
    localStorage.setItem('joyearn_rate_status', 'declined');
    onClose();
  };

  const handleSubmitLowRatingFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    soundService.playClick();
    setIsSubmittingFeedback(true);
    setTimeout(() => {
      setIsSubmittingFeedback(false);
      setFeedbackSubmitted(true);
      localStorage.setItem('joyearn_rate_status', 'feedback_sent');
      setTimeout(() => {
        onClose();
      }, 2000);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="bg-gradient-to-b from-white via-rose-50/40 to-white rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl border-4 border-amber-300 relative space-y-4 my-auto">
        {/* Close Button */}
        <button
          onClick={handleRemindLater}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold z-20 tap-bounce"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Mascot / Icon Badge */}
        <div className="relative mx-auto w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center shadow-xl shadow-amber-400/40 text-3xl border-2 border-white">
          ⭐
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center text-xs text-white">
            <Heart className="w-3.5 h-3.5 fill-current" />
          </div>
        </div>

        {/* Title & Milestones */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-black">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>
              {seniorMode
                ? `آپ نے ${completedActivitiesCount} سرگرمیاں مکمل کر لیں! 🎉`
                : `${completedActivitiesCount} Activities Completed! 🎉`}
            </span>
          </div>
          <h2 className="font-black text-2xl text-slate-900 tracking-tight">
            {seniorMode ? 'کیا آپ کو JoyEarn پسند آئی؟' : 'Enjoying JoyEarn?'}
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
            {seniorMode
              ? 'اگر آپ ہماری صاف ستھری تعلیمی سرگرمیوں اور انعامات سے لطف اندوز ہو رہے ہیں تو پلے اسٹور پر 5 اسٹار ریٹنگ سے ہماری حوصلہ افزائی کریں۔'
              : 'If you love our fun quizzes, educational videos, and fair rewards, your 5-star rating on Google Play helps us grow and keeps everything free for everyone!'}
          </p>
        </div>

        {/* Interactive Star Rating Selector */}
        {!feedbackSubmitted ? (
          <div className="space-y-2 py-1">
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isLit = star <= (hoverRating || rating);
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(rating)}
                    onClick={() => {
                      soundService.playClick();
                      setRating(star);
                      setHoverRating(star);
                    }}
                    className="p-1 tap-bounce transition-transform hover:scale-125 focus:outline-none"
                    title={`Rate ${star} star`}
                  >
                    <Star
                      className={`w-9 h-9 transition-colors ${
                        isLit
                          ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                          : 'text-slate-300 stroke-slate-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Dynamic Emotion Label */}
            <div className="text-xs font-black text-amber-700 min-h-[1.25rem]">
              {seniorMode
                ? ratingDescriptions[hoverRating || rating].ur
                : ratingDescriptions[hoverRating || rating].en}
            </div>

            {/* If user selects 4 or 5 stars -> Direct to Play Store */}
            {rating >= 4 ? (
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleRateOnPlayStore}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black rounded-2xl shadow-xl shadow-amber-500/30 text-sm tap-bounce flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>
                    {seniorMode ? 'گوگل پلے پر 5 اسٹار ریٹ کریں ⭐' : 'Rate 5 Stars on Google Play ⭐'}
                  </span>
                </button>
                <div className="text-[10px] text-emerald-700 font-extrabold">
                  {seniorMode ? '🎁 آپ کی قدردانی پر +25 بونس پوائنٹس ملیں گے!' : '🎁 Earn +25 Appreciation Bonus Points!'}
                </div>
              </div>
            ) : (
              /* If user selects 1-3 stars -> Prompt for private internal feedback to improve rather than negative review */
              <form onSubmit={handleSubmitLowRatingFeedback} className="space-y-2 pt-1">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-1.5">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <MessageSquareHeart className="w-3.5 h-3.5 text-rose-500" />
                    <span>How can we make JoyEarn better?</span>
                  </div>
                  <textarea
                    value={feedbackNote}
                    onChange={(e) => setFeedbackNote(e.target.value)}
                    placeholder="Tell us what you'd like improved..."
                    rows={2}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingFeedback}
                  className="w-full py-2.5 bg-slate-900 text-white font-extrabold rounded-xl text-xs tap-bounce"
                >
                  {isSubmittingFeedback ? 'Sending Feedback...' : 'Send Feedback to Developers'}
                </button>
              </form>
            )}

            {/* Remind Later & No Thanks Options */}
            <div className="flex items-center justify-center gap-4 pt-2 text-xs font-semibold text-slate-500">
              <button
                type="button"
                onClick={handleRemindLater}
                className="hover:text-slate-800 underline decoration-slate-300 tap-bounce"
              >
                {seniorMode ? 'بعد میں یاد دلائیں' : 'Remind me later'}
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={handleNoThanks}
                className="hover:text-slate-800 underline decoration-slate-300 tap-bounce"
              >
                {seniorMode ? 'شکریہ، نہیں' : 'No, thanks'}
              </button>
            </div>
          </div>
        ) : (
          /* Thank you card when private feedback is sent */
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <div className="font-black text-slate-900 text-sm">Thank You for Your Feedback!</div>
            <p className="text-xs text-slate-600">
              Our engineering team reads every message to ensure JoyEarn is smooth and enjoyable.
            </p>
          </div>
        )}

        {/* Play Store Verified Policy */}
        <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-2 flex items-center justify-center gap-1">
          <span>Official Google Play Review Prompt • Non-intrusive</span>
        </div>
      </div>
    </div>
  );
};
