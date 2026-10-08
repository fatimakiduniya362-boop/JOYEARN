import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { AppUser } from '../types';
import { submitSponsorEnquiry } from '../services/sponsorAdsService';
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

  const [businessName, setBusinessName] = useState('');
  const [websiteLink, setWebsiteLink] = useState('https://');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

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
      <div className="bg-white dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-600 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
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

          {/* Submission Form or Thank You State */}
          {submitted ? (
            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-400 dark:border-emerald-700 rounded-3xl text-center space-y-3 animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="font-black text-base text-slate-900 dark:text-white">
                Thank you for your enquiry!
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Your sponsorship details have been sent to the app owner. We will review your application and contact you directly via your provided email address.
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
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
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
                    <span>Send Sponsor Enquiry</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
