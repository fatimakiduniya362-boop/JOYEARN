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
            ? 'پوائنٹس کی کوئی فکسڈ کیش ویلیو نہیں ہے۔'
            : 'Points ki koi fixed cash value nahi hai.'}
        </p>
      </div>
    );
  }

  return (
    <div
      role="note"
      aria-label="Rewards & Wallet Policy Notice"
      className={`shrink-0 w-full px-4 py-2.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-t border-slate-800 text-center flex items-center justify-center gap-2 ${className}`}
    >
      <p className="text-[11px] font-medium text-slate-300 tracking-tight leading-snug">
        {isUrdu ? 'پوائنٹس کی کوئی فکسڈ کیش ویلیو نہیں ہے۔' : 'Points ki koi fixed cash value nahi hai.'}
      </p>
      <Sparkles className="w-3 h-3 text-amber-400 shrink-0 opacity-80" />
    </div>
  );
};
