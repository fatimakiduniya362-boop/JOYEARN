import React, { useState, useRef } from 'react';
import {
  Megaphone,
  Mail,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  X,
  Send,
  Building,
  Globe,
  Phone,
  MessageSquare,
  AlertCircle,
  Tag,
  Check,
  Sparkles,
  Info
} from 'lucide-react';
import { AppUser } from '../types';
import { submitSponsorEnquiry } from '../services/sponsorAdsService';
import {
  SPONSOR_PACKAGES,
  SPONSOR_AUDIENCE_TEXT,
  SPONSOR_PAYMENT_TEXT,
  SPONSOR_DISCLAIMER_TEXT,
  SponsorPackage
} from '../data/sponsorPackages';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';

interface SponsorAdvertiseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  seniorMode?: boolean;
}

export const SponsorAdvertiseModal: React.FC<SponsorAdvertiseModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  seniorMode = false,
}) => {
  const { light, success, warning } = useHaptics();
  const formRef = useRef<HTMLDivElement>(null);

  const [selectedPackage, setSelectedPackage] = useState<string>('Starter');
  const [languageOption, setLanguageOption] = useState<'both' | 'English' | 'Urdu'>('both');
  const [businessName, setBusinessName] = useState('');
  const [websiteLink, setWebsiteLink] = useState('https://');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSelectPackage = (pkg: SponsorPackage) => {
    soundService.playClick();
    light();
    setSelectedPackage(pkg.name);
    // Smooth scroll down to enquiry form
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedBusiness = businessName.trim();
    const trimmedLink = websiteLink.trim();
    const trimmedEmail = email.trim();
    const trimmedMsg = message.trim();

    if (!trimmedBusiness) {
      setError('Please provide your business or app name.');
      warning();
      return;
    }

    if (!trimmedLink.startsWith('https://')) {
      setError('Website or app link must start with https:// for safety compliance.');
      warning();
      return;
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please provide a valid contact email address.');
      warning();
      return;
    }

    if (!trimmedMsg) {
      setError('Please write your enquiry message.');
      warning();
      return;
    }

    if (trimmedMsg.length > 1000) {
      setError('Enquiry message must not exceed 1000 characters.');
      warning();
      return;
    }

    const uid = currentUser?.uid || 'guest_' + (currentUser?.email ? btoa(currentUser.email).replace(/=/g, '').slice(0, 10) : 'user');

    setSubmitting(true);
    soundService.playClick();
    light();

    try {
      await submitSponsorEnquiry(uid, {
        businessName: trimmedBusiness,
        websiteLink: trimmedLink,
        email: trimmedEmail,
        phone: phone.trim(),
        message: trimmedMsg.slice(0, 1000),
        package: selectedPackage,
        languageOption,
      });

      success();
      soundService.playFanfare();
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Error submitting sponsor enquiry. Please try again.');
      warning();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3.5 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-600 rounded-3xl w-full max-w-xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/25 flex items-center justify-center text-xl shadow-xs">
              📢
            </div>
            <div>
              <h3 className="font-black text-slate-950 text-sm sm:text-base">
                Promote your app or business here
              </h3>
              <p className="text-[11px] text-amber-950 font-bold">
                Direct sponsorship with the app owner
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundService.playClick();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-black/15 hover:bg-black/25 flex items-center justify-center text-slate-950 font-bold tap-bounce"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Regulatory & Process Disclosure Notice (Exact Mandated Text) */}
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 rounded-2xl space-y-1.5 text-xs text-amber-950 dark:text-amber-200">
            <div className="flex items-center gap-1.5 font-black text-amber-900 dark:text-amber-300 text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Sponsorship Guidelines & Terms</span>
            </div>
            <p className="text-[11.5px] leading-relaxed font-semibold">
              Sponsors contact the app owner directly. Ad placement, price and payment are agreed directly with the owner outside the app. The app does not process any sponsor payments. Gambling, adult, scam, loan, fake-earning and misleading ads are not allowed.
            </p>
          </div>

          {/* Email Us Button */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div>
              <span className="font-black text-xs text-slate-900 dark:text-white block">
                Direct Email Inquiries
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                fatimakiduniya362@gmail.com
              </span>
            </div>

            <a
              href="mailto:fatimakiduniya362@gmail.com?subject=JoyEarn%20sponsor%20enquiry"
              onClick={() => soundService.playClick()}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs rounded-xl shadow-xs tap-bounce flex items-center justify-center gap-2"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email us</span>
            </a>
          </div>

          {/* SPONSOR PACKAGES SECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
              <div className="flex items-center gap-1.5 font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                <Tag className="w-3.5 h-3.5 text-amber-500" />
                <span>Fixed-Price Sponsor Packages (US Dollars)</span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                5 Available Tiers
              </span>
            </div>

            {/* Package Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SPONSOR_PACKAGES.map((pkg) => {
                const isSelected = selectedPackage === pkg.name;
                return (
                  <div
                    key={pkg.id}
                    className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 text-xs relative ${
                      isSelected
                        ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-400/40 shadow-sm'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-750 hover:border-amber-300'
                    }`}
                  >
                    {/* Top Row: Package Name & Price */}
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-sm text-slate-900 dark:text-white">
                            {pkg.name}
                          </span>
                          {pkg.badge && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                              {pkg.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
                            ${pkg.priceUsd}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-normal">USD</span>
                        </div>
                      </div>

                      {/* Key Package Specs: Impressions, Min Days, Placements */}
                      <div className="space-y-1.5 py-1 text-[11px] text-slate-600 dark:text-slate-300">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Impressions:</span>
                          <strong className="text-slate-900 dark:text-white font-mono">
                            {pkg.impressions.toLocaleString()}
                          </strong>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Minimum Duration:</span>
                          <strong className="text-slate-900 dark:text-white">
                            {pkg.minDays} days
                          </strong>
                        </div>

                        <div className="pt-0.5">
                          <span className="text-slate-500 block text-[10.5px]">Placements:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block text-[11px]">
                            {pkg.placementsText}
                          </span>
                        </div>
                      </div>

                      {/* Card Required Meta: Audience text, Language option */}
                      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/80 space-y-1 text-[10px] text-slate-500 dark:text-slate-400">
                        <div>
                          <strong className="text-slate-700 dark:text-slate-300">Audience: </strong>
                          <span>{SPONSOR_AUDIENCE_TEXT}</span>
                        </div>
                        <div>
                          <strong className="text-slate-700 dark:text-slate-300">Language Option: </strong>
                          <span>English or Urdu or both</span>
                        </div>
                      </div>
                    </div>

                    {/* Choose this package Button */}
                    <button
                      type="button"
                      onClick={() => handleSelectPackage(pkg)}
                      className={`w-full py-2 rounded-xl font-black text-xs tap-bounce transition-all flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-700 hover:bg-amber-100 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Selected Package</span>
                        </>
                      ) : (
                        <span>Choose this package</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* General Payment Text & Disclaimer Notice */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-[11px] leading-relaxed">
                    <strong>Payment Policy: </strong>{SPONSOR_PAYMENT_TEXT}
                  </p>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed italic">
                    <strong>Notice: </strong>{SPONSOR_DISCLAIMER_TEXT}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submission Form or Thank You State */}
          <div ref={formRef} className="pt-2">
            {submitted ? (
              <div className="p-6 bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-400 dark:border-emerald-700 rounded-3xl text-center space-y-3 animate-in fade-in">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="font-black text-base text-slate-900 dark:text-white">
                  Thank you for your enquiry!
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  Your enquiry for the <strong>{selectedPackage}</strong> package has been sent to the app owner. We will review your application and contact you directly via your provided email address.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    onClose();
                  }}
                  className="mt-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-sm tap-bounce"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3 text-xs bg-slate-50/60 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-1.5 flex items-center justify-between">
                  <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                    Sponsorship Enquiry Form
                  </h4>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    1 submission per day
                  </span>
                </div>

                {error && (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Selected Package Field (Filled via 'Choose this package' button) */}
                <div>
                  <label className="font-extrabold text-slate-800 dark:text-slate-200 text-[11px] block mb-1">
                    Selected Package *
                  </label>
                  <select
                    value={selectedPackage}
                    onChange={(e) => setSelectedPackage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:outline-hidden focus:border-amber-500 text-xs"
                  >
                    {SPONSOR_PACKAGES.map((pkg) => (
                      <option key={pkg.id} value={pkg.name}>
                        {pkg.name} (${pkg.priceUsd} USD • {pkg.impressions.toLocaleString()} Impressions • Min {pkg.minDays} days)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Language Option Field (English, Urdu or both) */}
                <div>
                  <label className="font-extrabold text-slate-800 dark:text-slate-200 text-[11px] block mb-1">
                    Language Target Option *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'both', label: 'Both (English & Urdu)' },
                      { id: 'English', label: 'English Only' },
                      { id: 'Urdu', label: 'Urdu Only' },
                    ].map((opt) => (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => {
                          soundService.playClick();
                          setLanguageOption(opt.id as any);
                        }}
                        className={`py-1.5 px-2 rounded-xl font-bold text-[11px] border transition-all text-center tap-bounce ${
                          languageOption === opt.id
                            ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Business or App Name (NO PLACEHOLDER TEXT) */}
                <div>
                  <label className="font-extrabold text-slate-800 dark:text-slate-200 text-[11px] block mb-1">
                    Business or App Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:border-amber-500 text-xs"
                  />
                </div>

                {/* Website or App Link (HTTPS ONLY, NO PLACEHOLDER TEXT) */}
                <div>
                  <label className="font-extrabold text-slate-800 dark:text-slate-200 text-[11px] block mb-1">
                    Website or App Link (https only) *
                  </label>
                  <input
                    type="url"
                    required
                    value={websiteLink}
                    onChange={(e) => setWebsiteLink(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:border-amber-500 text-xs"
                  />
                </div>

                {/* Contact Email (NO PLACEHOLDER TEXT) */}
                <div>
                  <label className="font-extrabold text-slate-800 dark:text-slate-200 text-[11px] block mb-1">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:border-amber-500 text-xs"
                  />
                </div>

                {/* Optional Phone Number (NO PLACEHOLDER TEXT) */}
                <div>
                  <label className="font-extrabold text-slate-800 dark:text-slate-200 text-[11px] block mb-1">
                    Optional Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:border-amber-500 text-xs"
                  />
                </div>

                {/* Message at most 1000 characters (NO PLACEHOLDER TEXT) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-extrabold text-slate-800 dark:text-slate-200 text-[11px]">
                      Enquiry Message (Maximum 1000 characters) *
                    </label>
                    <span className={`text-[10px] font-mono font-bold ${message.length > 950 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {message.length}/1000
                    </span>
                  </div>
                  <textarea
                    required
                    rows={4}
                    maxLength={1000}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:border-amber-500 text-xs resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black rounded-xl text-xs shadow-md tap-bounce flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Sponsor Enquiry ({selectedPackage} Package)</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
