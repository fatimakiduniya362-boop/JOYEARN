import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  MessageCircle,
  X,
  Calendar,
  Users,
  CheckCircle2,
  Sparkles,
  Send,
  Globe
} from 'lucide-react';
import { SponsorAd } from '../types';
import {
  loadActiveSponsorAds,
  recordAdImpression,
  recordAdClick,
  submitSponsorRequest
} from '../services/sponsorAdsService';
import { appSettingsService, SponsorPackage, FullAppSettings } from '../services/appSettingsService';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';

interface SponsorSectionProps {
  seniorMode?: boolean;
  onOpenAdvertiseModal?: () => void;
  isStandalonePage?: boolean;
  onBackToHome?: () => void;
}

export const SponsorSection: React.FC<SponsorSectionProps> = ({
  seniorMode = false,
  isStandalonePage = false,
  onBackToHome,
}) => {
  const { light, success, warning } = useHaptics();
  const [ads, setAds] = useState<SponsorAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [appSettings, setAppSettings] = useState<FullAppSettings>(() => appSettingsService.getSettings());
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<SponsorPackage | null>(null);

  // Buy Package / Contact Owner form state
  const [senderName, setSenderName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [contactInfo, setContactInfo] = useState(''); // Email or WhatsApp
  const [adTitle, setAdTitle] = useState('');
  const [adLink, setAdLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = appSettingsService.subscribe((settings) => {
      setAppSettings(settings);
    });

    let active = true;
    loadActiveSponsorAds()
      .then((activeAds) => {
        if (active) {
          setAds(activeAds);
          activeAds.forEach((ad) => recordAdImpression(ad.id));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      unsub();
    };
  }, []);

  const handleOpenAd = (ad: SponsorAd) => {
    soundService.playClick();
    light();
    recordAdClick(ad.id);
    const link = ad.destinationLink || ad.targetUrl;
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOpenBuyPackage = (pkg: SponsorPackage) => {
    soundService.playClick();
    setSelectedPackage(pkg);
    setFormError(null);
    setShowBuyModal(true);
  };

  const handleOpenWhatsApp = (pkg?: SponsorPackage | null) => {
    soundService.playClick();
    const phone = appSettings.general.ownerWhatsApp?.replace(/[^0-9+]/g, '') || '923001234567';
    const pkgName = pkg ? `${pkg.name} ($${pkg.priceUSD} USD)` : 'Sponsor Package';
    const text = encodeURIComponent(
      `Hello JoyEarn Owner! I would like to purchase the ${pkgName} on JoyEarn.\nPlease guide me through payment and banner activation.`
    );
    const waUrl = `https://wa.me/${phone.replace('+', '')}?text=${text}`;
    window.open(waUrl, '_blank');
  };

  const handleSubmitBuyRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!senderName.trim() || !businessName.trim() || !contactInfo.trim() || !adTitle.trim() || !adLink.trim()) {
      warning();
      setFormError('Please fill out all required fields.');
      return;
    }

    if (!adLink.trim().startsWith('https://') && !adLink.trim().startsWith('http://')) {
      warning();
      setFormError('Ad link must start with https:// or http://');
      return;
    }

    const currentPkg = selectedPackage || packages[0];

    setSubmitting(true);
    try {
      await submitSponsorRequest({
        name: senderName.trim(),
        businessName: businessName.trim(),
        contact: contactInfo.trim(),
        packageId: currentPkg.id,
        packageName: currentPkg.name,
        packagePriceUSD: currentPkg.priceUSD,
        packageDurationDays: currentPkg.durationDays,
        packageReach: currentPkg.estimatedReach,
        adTitle: adTitle.trim().slice(0, 80),
        adLink: adLink.trim(),
      });

      soundService.playFanfare();
      success();
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowBuyModal(false);
        setSenderName('');
        setBusinessName('');
        setContactInfo('');
        setAdTitle('');
        setAdLink('');
      }, 2500);
    } catch (err) {
      console.warn('Error submitting sponsor request:', err);
      setFormError('Failed to submit request. Please try again or contact via WhatsApp.');
    } finally {
      setSubmitting(false);
    }
  };

  // Standard packages with prices strictly in US Dollars only
  const packages: SponsorPackage[] = appSettings.packages && appSettings.packages.length > 0
    ? appSettings.packages
    : [
        {
          id: 'pkg_basic',
          name: 'Basic',
          priceUSD: 10,
          durationDays: 7,
          estimatedReach: 5000,
          placement: 'banner',
          description: 'Reach 5,000 active users over 7 days in the dedicated Sponsors showcase.',
        },
        {
          id: 'pkg_standard',
          name: 'Standard',
          priceUSD: 25,
          durationDays: 15,
          estimatedReach: 20000,
          placement: 'featured_card',
          description: 'Reach 20,000 active users over 15 days with featured card placement and custom button.',
          isPopular: true,
        },
        {
          id: 'pkg_premium',
          name: 'Premium',
          priceUSD: 50,
          durationDays: 30,
          estimatedReach: 50000,
          placement: 'top_sponsor',
          description: 'Top priority sponsor card with highest visibility across all users for 30 full days (50,000 reach).',
        },
      ];

  const content = (
    <div className="space-y-4 max-w-lg mx-auto w-full">
      {/* 1. Header Bar */}
      <div className="bg-gradient-to-r from-purple-900/90 via-slate-900 to-indigo-950/90 rounded-3xl p-4 sm:p-5 border border-purple-500/30 shadow-md text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-2xl shadow-inner">
            📢
          </div>
          <div>
            <h3 className="font-black text-sm sm:text-base leading-tight">
              {seniorMode ? 'اسپانسرز (Sponsors)' : 'Sponsors & Brand Partners'}
            </h3>
            <p className="text-[11px] text-purple-200/80 font-medium mt-0.5">
              {seniorMode
                ? 'تصدیق شدہ فیملی فرینڈلی برانڈز اور تشہیر'
                : 'Verified family-friendly businesses & direct promotions'}
            </p>
          </div>
        </div>

        {isStandalonePage && onBackToHome && (
          <button
            onClick={() => {
              soundService.playClick();
              onBackToHome();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white tap-bounce shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Active Sponsor Ads Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{seniorMode ? 'فعال اسپانسرز' : 'Active Sponsors'}</span>
          </span>
          <span className="text-[11px] text-slate-400 font-bold">
            {ads.length} {ads.length === 1 ? 'Sponsor' : 'Sponsors'}
          </span>
        </div>

        {loading ? (
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
            Loading active sponsors...
          </div>
        ) : ads.length === 0 ? (
          /* Empty Active Sponsors Note: "No sponsors yet" / "Abhi koi sponsor nahi" */
          <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-1.5 shadow-2xs">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center text-xl">
              🌱
            </div>
            <h4 className="font-black text-xs sm:text-sm text-slate-800 dark:text-slate-200">
              {seniorMode ? 'ابھی کوئی اسپانسر نہیں' : 'No sponsors yet'}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              {seniorMode
                ? 'اپنے برانڈ کو ہزاروں سیکھنے والوں کے سامنے لانے کے لیے نیچے دیا گیا پیکیج منتخب کریں۔'
                : 'Abhi koi sponsor nahi. Be the first partner to showcase your service or store!'}
            </p>
          </div>
        ) : (
          /* Active Sponsor Cards: showing logo, title, short text, link button */
          <div className="space-y-3">
            {ads.map((ad) => {
              const link = ad.destinationLink || ad.targetUrl;
              const logo = ad.logoUrl || ad.imageUrl;
              const text = ad.shortText || ad.bodyText || 'Verified community sponsor.';
              return (
                <div
                  key={ad.id}
                  onClick={() => handleOpenAd(ad)}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-purple-500 transition-all cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      Official Sponsor
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Verified Partner</span>
                  </div>

                  <div className="flex items-start gap-3">
                    {logo ? (
                      <img
                        src={logo}
                        alt={ad.title}
                        className="w-12 h-12 rounded-2xl object-cover bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white font-black text-xl flex items-center justify-center shrink-0">
                        {ad.title.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-sm text-slate-900 dark:text-white truncate">
                        {ad.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
                        {text}
                      </p>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400">Direct Sponsor Promotion</span>
                    {link && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAd(ad);
                        }}
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 tap-bounce shadow-xs"
                      >
                        <span>{ad.ctaText || 'Visit Sponsor'}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Advertise With Us: Sponsorship Packages Showcase (Fixed Price in USD Only) */}
      <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 border border-slate-800 space-y-4 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-black text-sm sm:text-base text-white flex items-center gap-1.5">
              <span>💎</span>
              <span>{seniorMode ? 'ہمارے ساتھ تشہیر کریں' : 'Advertise with us'}</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Fixed pricing in US Dollars only with guaranteed user reach
            </p>
          </div>
          <button
            onClick={() => handleOpenWhatsApp()}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 tap-bounce shadow-xs"
            title="Chat directly on WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>
        </div>

        {/* Packages Cards */}
        <div className="space-y-3">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                pkg.isPopular
                  ? 'bg-gradient-to-br from-purple-950/60 to-slate-900 border-purple-500/80 shadow-md ring-1 ring-purple-500/30'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h5 className="font-black text-xs sm:text-sm text-white">{pkg.name}</h5>
                  {pkg.isPopular && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-[9px] font-black uppercase">
                      Most Popular
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-black text-sm text-amber-400">
                    ${pkg.priceUSD} USD
                  </div>
                  <div className="text-[10px] text-slate-400">Fixed USD price</div>
                </div>
              </div>

              <p className="text-[11px] text-slate-300 leading-snug">
                {pkg.description}
              </p>

              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] pt-1">
                <div className="p-1.5 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-slate-400 block text-[9px]">Duration</span>
                  <span className="font-bold text-white flex items-center justify-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3 text-purple-400" />
                    {pkg.durationDays} Days
                  </span>
                </div>

                <div className="p-1.5 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-slate-400 block text-[9px]">User Reach</span>
                  <span className="font-bold text-white flex items-center justify-center gap-1 mt-0.5">
                    <Users className="w-3 h-3 text-sky-400" />
                    {pkg.estimatedReach.toLocaleString()}+ Users
                  </span>
                </div>

                <div className="p-1.5 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-slate-400 block text-[9px]">Placement</span>
                  <span className="font-bold text-white capitalize mt-0.5 truncate block">
                    {pkg.placement.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Buy Package / Contact Owner Button */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenBuyPackage(pkg)}
                  className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl tap-bounce flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Buy Package / Contact Owner</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Buy Package / Contact Owner Form Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 max-w-sm w-full space-y-3.5 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">📩</span>
                <div>
                  <h4 className="font-black text-sm text-white">Buy Package / Contact Owner</h4>
                  <p className="text-[10px] text-slate-400">
                    Selected: <strong className="text-amber-400">{selectedPackage?.name} (${selectedPackage?.priceUSD} USD)</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBuyModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            {submitSuccess ? (
              <div className="p-4 bg-emerald-950 border border-emerald-700 text-emerald-300 rounded-2xl text-center space-y-2 animate-fadeIn">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
                <h5 className="font-black text-sm">Request Submitted to Owner!</h5>
                <p className="text-xs text-emerald-200">
                  Your sponsor request has been sent to the Owner Panel. The owner will review and activate your ad.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitBuyRequest} className="space-y-2.5">
                {formError && (
                  <div className="p-2 bg-rose-950/80 border border-rose-700 text-rose-300 rounded-xl text-xs font-bold">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Business or Store Name"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Email or WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    placeholder="e.g. contact@business.com or +923001234567"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Selected Package (USD)
                  </label>
                  <select
                    value={selectedPackage?.id || packages[0]?.id}
                    onChange={(e) => {
                      const found = packages.find((p) => p.id === e.target.value);
                      if (found) setSelectedPackage(found);
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl text-xs text-white outline-none"
                  >
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} — ${pkg.priceUSD} USD ({pkg.durationDays} days, {pkg.estimatedReach.toLocaleString()} users)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Ad Title (Max 80 chars) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={adTitle}
                    onChange={(e) => setAdTitle(e.target.value)}
                    placeholder="Short catchy title for your ad"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Ad Link *
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      required
                      value={adLink}
                      onChange={(e) => setAdLink(e.target.value)}
                      placeholder="https://yourwebsite.com"
                      className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
                    />
                    <Globe className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBuyModal(false)}
                    className="flex-1 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl tap-bounce"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl tap-bounce flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-md"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Submitting...' : 'Submit Request'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (isStandalonePage) {
    return (
      <div className="min-h-screen bg-slate-950 p-4 pb-28 text-white">
        {content}
      </div>
    );
  }

  return content;
};
