import React, { useState } from 'react';
import { ExternalLink, CheckCircle2 } from 'lucide-react';
import { PROMOTED_APPS_AND_OFFERS, PromotedAppOffer } from '../data/promotedApps';
import { soundService } from '../services/soundService';

interface PromotedOffersSectionProps {
  seniorMode?: boolean;
}

export const PromotedOffersSection: React.FC<PromotedOffersSectionProps> = ({
  seniorMode = false,
}) => {
  const [visitedOffers, setVisitedOffers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('joyearn_visited_promoted_offers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleOpenOffer = (offer: PromotedAppOffer) => {
    soundService.playClick();

    // Mark as visited locally (no points or rewards awarded per policy)
    if (!visitedOffers.includes(offer.id)) {
      const nextVisited = [...visitedOffers, offer.id];
      setVisitedOffers(nextVisited);
      try {
        localStorage.setItem('joyearn_visited_promoted_offers', JSON.stringify(nextVisited));
      } catch {
        // storage unavailable
      }
    }

    // Open external URL in a safe new window/tab
    if (typeof window !== 'undefined') {
      window.open(offer.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <section className="space-y-3 px-3 py-2">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎁</span>
          <div>
            <h3 className="font-black text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>{seniorMode ? 'مزید ایپس اور خصوصی آفرز' : 'More Apps & Offers'}</span>
              <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-black px-2 py-0.2 rounded-full border border-amber-300">
                Sponsored
              </span>
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {seniorMode ? 'شراکت دار ایپس اور مفید وسائل دیکھیں' : 'Explore partner tools and educational apps'}
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Tappable Sponsored Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {PROMOTED_APPS_AND_OFFERS.map((offer) => {
          const isVisited = visitedOffers.includes(offer.id);

          return (
            <div
              key={offer.id}
              onClick={() => handleOpenOffer(offer)}
              className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3 shadow-xs hover:shadow-md transition-all cursor-pointer tap-bounce flex items-start gap-3 relative overflow-hidden group"
            >
              {/* Icon with gradient badge */}
              <div
                className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${offer.gradient} text-white flex items-center justify-center text-2xl shrink-0 shadow-md`}
              >
                {offer.icon}
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                    {seniorMode ? offer.urduTitle : offer.title}
                  </h4>
                </div>

                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                  {seniorMode ? offer.urduDescription : offer.description}
                </p>

                {/* Visit status & external indicator (zero point reward) */}
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isVisited
                        ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                    }`}
                  >
                    {isVisited ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-slate-500" />
                        <span>Visited</span>
                      </>
                    ) : (
                      <span>Explore</span>
                    )}
                  </span>

                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-0.5">
                    <span>{offer.badge}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
