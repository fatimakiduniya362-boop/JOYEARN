import React from 'react';
import { ADMOB_CONFIG, ADS_ENABLED } from '../services/adMobService';
import { Sparkles, Shield } from 'lucide-react';

interface AdMobBannerProps {
  seniorMode?: boolean;
}

export const AdMobBanner: React.FC<AdMobBannerProps> = ({ seniorMode = false }) => {
  if (!ADS_ENABLED) return null;

  return (
    <div className="w-full my-2 px-1">
      <div className="w-full max-w-sm mx-auto bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-2 flex items-center justify-between text-left shadow-xs transition-colors">
        <div className="flex items-center gap-2.5">
          {/* Ad Badge */}
          <span className="px-1.5 py-0.5 bg-amber-500 text-slate-950 font-black text-[9px] rounded uppercase tracking-wider">
            Ad
          </span>

          <div>
            <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <span>Google AdMob Banner</span>
              <Shield className="w-2.5 h-2.5 text-blue-500" />
            </div>
            <p className="text-[9px] text-slate-500 dark:text-slate-400">
              {seniorMode ? 'خاندانی اشتہار • گوگل ایڈموب' : 'Safe family ad placement • Google AdMob'}
            </p>
          </div>
        </div>

        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
          320×50
        </span>
      </div>
    </div>
  );
};
