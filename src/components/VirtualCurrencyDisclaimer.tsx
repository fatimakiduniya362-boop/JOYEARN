import React from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';

interface VirtualCurrencyDisclaimerProps {
  className?: string;
  variant?: 'luxury' | 'badge' | 'banner';
  language?: 'en' | 'ur';
}

export const VirtualCurrencyDisclaimer: React.FC<VirtualCurrencyDisclaimerProps> = ({
  className = '',
  variant = 'luxury',
  language = 'en',
}) => {
  const isUrdu = language === 'ur';

  if (variant === 'badge') {
    return (
      <div
        className={`px-3 py-1.5 rounded-xl bg-amber-950/90 border border-amber-400/60 shadow-sm flex items-center justify-center gap-1.5 text-center ${className}`}
      >
        <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <p className="text-[11px] font-extrabold text-amber-200 tracking-tight leading-snug">
          {isUrdu
            ? 'پوائنٹس کو والیٹ کی شرائط کے تحت انعامات میں تبدیل کیا جا سکتا ہے۔ انعامات دستی جائزے پر منحصر ہیں اور گارنٹی شدہ نہیں ہیں۔'
            : 'Rewards depend on ad revenue, are reviewed manually and are not guaranteed. Amounts may be very small.'}
        </p>
      </div>
    );
  }

  return (
    <div
      role="note"
      aria-label="Rewards & Wallet Policy Notice"
      className={`shrink-0 w-full px-4 py-2.5 bg-gradient-to-r from-slate-950 via-amber-950 to-slate-950 border-t-2 border-amber-400/80 shadow-lg text-center flex items-center justify-center gap-2 ${className}`}
    >
      <div className="w-5 h-5 rounded-full bg-amber-400/20 border border-amber-400/50 flex items-center justify-center shrink-0 shadow-xs">
        <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
      </div>
      <p className="text-[11px] sm:text-[11.5px] font-extrabold text-amber-100 tracking-tight leading-snug drop-shadow-xs">
        {isUrdu ? (
          <span>پوائنٹس کو والیٹ کی شرائط کے تحت انعامات میں تبدیل کیا جا سکتا ہے۔ انعامات دستی جائزے اور دستیاب فنڈز پر منحصر ہیں، 7 دن تک لگ سکتے ہیں اور گارنٹی شدہ نہیں ہیں۔</span>
        ) : (
          <span>
            <strong className="text-amber-300 font-black">Rewards Notice:</strong> Rewards depend on ad revenue, are reviewed manually and are not guaranteed. Amounts may be very small.
          </span>
        )}
      </p>
      <Sparkles className="w-3 h-3 text-amber-400 shrink-0 opacity-80" />
    </div>
  );
};
