import React, { useEffect, useRef } from 'react';
import { ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';
import { SponsorAd } from '../types';
import { recordAdImpression, recordAdClick } from '../services/sponsorAdsService';
import { soundService } from '../services/soundService';

interface SponsorAdCardProps {
  ad: SponsorAd;
  variant?: 'card' | 'banner' | 'compact';
  className?: string;
}

export const SponsorAdCard: React.FC<SponsorAdCardProps> = ({
  ad,
  variant = 'card',
  className = '',
}) => {
  const hasTrackedImpression = useRef(false);

  useEffect(() => {
    if (!hasTrackedImpression.current && ad.id) {
      hasTrackedImpression.current = true;
      recordAdImpression(ad.id);
    }
  }, [ad.id]);

  const handleOpenAd = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundService.playClick();
    if (ad.id) {
      recordAdClick(ad.id);
    }
    // Only open valid https links
    if (ad.destinationLink?.startsWith('https://')) {
      window.open(ad.destinationLink, '_blank', 'noopener,noreferrer');
    }
  };

  if (!ad || !ad.isActive) return null;

  if (variant === 'compact') {
    return (
      <div
        onClick={handleOpenAd}
        className={`p-2.5 bg-gradient-to-r from-amber-50/90 to-orange-50/90 dark:from-slate-800 dark:to-slate-850 border border-amber-300 dark:border-amber-700/60 rounded-2xl cursor-pointer hover:border-amber-400 transition-all flex items-center justify-between gap-2.5 tap-bounce shadow-2xs ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {ad.imageUrl && (
            <img
              src={ad.imageUrl}
              alt={ad.title}
              className="w-10 h-10 rounded-xl object-cover border border-amber-200 dark:border-slate-700 shrink-0"
              loading="lazy"
            />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-amber-200 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                Sponsored
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold truncate">
                {ad.sponsorName}
              </span>
            </div>
            <h5 className="font-black text-xs text-slate-900 dark:text-white truncate mt-0.5">
              {ad.title}
            </h5>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAd}
          className="shrink-0 px-2 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-2xs"
        >
          <span>Visit</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={handleOpenAd}
      className={`relative overflow-hidden bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-700/80 rounded-3xl p-3.5 shadow-md cursor-pointer hover:border-amber-400 transition-all space-y-2.5 tap-bounce ${className}`}
    >
      {/* Top Banner Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
            Sponsored Partner
          </span>
          <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 truncate">
            {ad.sponsorName}
          </span>
        </div>
        <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
      </div>

      {/* Main Content */}
      <div className="flex items-center gap-3">
        {ad.imageUrl && (
          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-amber-200 dark:border-slate-700 shrink-0 shadow-2xs">
            <img
              src={ad.imageUrl}
              alt={ad.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-1">
            {ad.title}
          </h4>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5 font-medium leading-snug">
            {ad.shortText}
          </p>
        </div>
      </div>

      {/* CTA Button */}
      <div className="pt-0.5 flex items-center justify-between">
        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
          Zero points awarded for sponsor visits • Verified Safe
        </span>
        <button
          type="button"
          onClick={handleOpenAd}
          className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-1 hover:brightness-105"
        >
          <span>Learn More</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

interface RotatingSponsorAdCardProps {
  variant?: 'card' | 'banner' | 'compact';
  className?: string;
}

export const RotatingSponsorAdCard: React.FC<RotatingSponsorAdCardProps> = ({
  variant = 'card',
  className = '',
}) => {
  const [ads, setAds] = React.useState<SponsorAd[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { loadActiveSponsorAds } = await import('../services/sponsorAdsService');
        const activeAds = await loadActiveSponsorAds();
        if (active && activeAds.length > 0) {
          setAds(activeAds);
        }
      } catch (err) {
        console.warn('Could not load sponsor ads:', err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Rotate every 12 seconds if multiple ads exist
  React.useEffect(() => {
    if (ads.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 12000);
    return () => clearInterval(timer);
  }, [ads.length]);

  if (ads.length === 0) return null;

  const currentAd = ads[currentIndex] || ads[0];
  return <SponsorAdCard ad={currentAd} variant={variant} className={className} />;
};

