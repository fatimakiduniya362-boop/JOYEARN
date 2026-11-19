import React, { useEffect, useState } from 'react';
import {
  Copy,
  Share2,
  ShieldAlert,
  CheckCircle,
  Gift,
  UserPlus,
  MessageCircle,
  MessageSquare,
  X,
  RefreshCw,
} from 'lucide-react';
import { AppUser, ReferralUser } from '../types';
import {
  REFERRAL_REWARD_POINTS,
  VerifiedReferralRecord,
  buildReferralShareMessage,
  buildReferralUrl,
  buildSmsShareUrl,
  buildWhatsAppShareUrl,
  ensureUserReferralCodeRegistered,
  getReferralCodeForUser,
  loadUserReferrals,
  reconcileAndCreditPendingReferrals,
} from '../services/referralService';

interface InviteModalProps {
  referrals?: ReferralUser[];
  currentUser?: AppUser | null;
  onReferralPointsCredited?: (creditedPoints: number, creditedRecords: VerifiedReferralRecord[]) => void;
  onClose: () => void;
  seniorMode: boolean;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  currentUser,
  onReferralPointsCredited,
  onClose,
  seniorMode,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifiedReferrals, setVerifiedReferrals] = useState<VerifiedReferralRecord[]>([]);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const isSignedIn = Boolean(currentUser?.uid && currentUser.uid !== 'guest' && currentUser.uid !== 'local');
  const referralCode = getReferralCodeForUser(currentUser?.uid);
  const referralUrl = buildReferralUrl(referralCode);

  const refreshReferrals = async () => {
    if (!isSignedIn || !currentUser) return;
    setLoading(true);
    try {
      await ensureUserReferralCodeRegistered(currentUser);
      const creditResult = await reconcileAndCreditPendingReferrals(currentUser);
      if (creditResult.newlyCreditedPoints > 0 && onReferralPointsCredited) {
        onReferralPointsCredited(creditResult.newlyCreditedPoints, creditResult.creditedRecords);
        setStatusNotice(
          `+${creditResult.newlyCreditedPoints} permanent JoyPoints credited for ${creditResult.newlyCreditedCount} verified referral${creditResult.newlyCreditedCount > 1 ? 's' : ''}!`
        );
      }
      const list = await loadUserReferrals(currentUser.uid);
      setVerifiedReferrals(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshReferrals();
  }, [currentUser?.uid]);

  const totalSuccessfulInvites = verifiedReferrals.length;
  const totalReferralPointsEarned = verifiedReferrals.reduce(
    (sum, r) => sum + (r.creditedToReferrer ? r.rewardPoints : REFERRAL_REWARD_POINTS),
    0
  );

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      setStatusNotice('Copy your referral link manually from the box above.');
    }
  };

  const handleNativeShare = async () => {
    const text = buildReferralShareMessage(referralUrl, referralCode, seniorMode);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Join JoyEarn & Earn Permanent JoyPoints',
          text,
          url: referralUrl,
        });
        return;
      } catch {
        // User cancelled or share unsupported — fall through to copy
      }
    }
    await handleCopyLink();
  };

  const whatsappHref = buildWhatsAppShareUrl(referralUrl, referralCode, seniorMode);
  const smsHref = buildSmsShareUrl(referralUrl, referralCode, seniorMode);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
      <div className="bg-white rounded-[28px] w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-pink-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#d9006c] via-[#ec0078] to-[#f43f8e] p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className={`font-extrabold leading-tight ${seniorMode ? 'text-xl' : 'text-lg'}`}>
                {seniorMode ? 'دوست کو مدعو کریں' : 'Invite Friend'}
              </h2>
              <p className="text-[11px] font-semibold text-pink-100">
                {seniorMode
                  ? `ہر تصدیق شدہ دوست پر +${REFERRAL_REWARD_POINTS} مستقل پوائنٹس`
                  : `+${REFERRAL_REWARD_POINTS} permanent JoyPoints per verified friend`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Invite Friend modal"
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white tap-bounce"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {statusNotice && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-3.5 py-2.5 text-xs font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusNotice}</span>
            </div>
          )}

          {/* Stats Summary: Total Successful Invites & Referral Points Earned */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-[#fdf2f8] border border-pink-100 rounded-2xl p-3 text-center">
              <span className="text-[11px] font-bold text-slate-600 block">
                {seniorMode ? 'کامیاب دعوتیں' : 'Successful Invites'}
              </span>
              <span className="text-2xl font-black text-[#ec0078] tabular-nums mt-0.5 block">
                {totalSuccessfulInvites}
              </span>
            </div>
            <div className="bg-[#fdf2f8] border border-pink-100 rounded-2xl p-3 text-center">
              <span className="text-[11px] font-bold text-slate-600 block">
                {seniorMode ? 'ریفرل پوائنٹس' : 'Referral Points Earned'}
              </span>
              <span className="text-2xl font-black text-[#ec0078] tabular-nums mt-0.5 block">
                +{totalReferralPointsEarned} <span className="text-xs font-extrabold">Pts</span>
              </span>
            </div>
          </div>

          {/* Unique Referral Link & Share Card */}
          <div className="bg-gradient-to-br from-[#fff5fa] via-white to-[#fdf2f8] p-4 rounded-3xl border border-pink-200 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ff1b8d] to-[#d9006c] text-white flex items-center justify-center shadow-xs shrink-0">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  {seniorMode
                    ? `ہر نئے دوست پر +${REFERRAL_REWARD_POINTS} پوائنٹس کمائیں`
                    : `Earn +${REFERRAL_REWARD_POINTS} Points Per Verified Friend`}
                </h3>
                <p className="text-[11px] text-slate-600 leading-snug">
                  {seniorMode
                    ? 'جب نیا دوست آپ کے لنک سے رجسٹر ہو کر اکاؤنٹ کی تصدیق کرے گا تو 50 پوائنٹس خودکار شامل ہو جائیں گے۔'
                    : 'Points are credited automatically to your permanent balance once your friend registers through your link and verifies their account.'}
                </p>
              </div>
            </div>

            {!isSignedIn ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 font-semibold">
                Sign in with your verified account to activate your personal referral link and earn +{REFERRAL_REWARD_POINTS} permanent JoyPoints per invite.
              </div>
            ) : (
              <>
                {/* Unique Referral Link Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 px-0.5">
                    <span>Your Unique Referral Link</span>
                    <span className="font-mono text-[#ec0078]">{referralCode}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-pink-200 shadow-2xs">
                    <input
                      type="text"
                      readOnly
                      value={referralUrl}
                      aria-label="Your unique referral link"
                      className="flex-1 min-w-0 bg-transparent text-xs font-mono text-slate-700 px-1.5 focus:outline-none truncate"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-3 py-1.5 bg-pink-100 hover:bg-pink-200 text-[#be0060] rounded-xl text-xs font-extrabold flex items-center gap-1 shrink-0 tap-bounce"
                    >
                      {copiedLink ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Primary Share Button */}
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full py-2.5 bg-gradient-to-r from-[#ff1b8d] to-[#d9006c] hover:brightness-105 text-white font-extrabold rounded-full shadow-md shadow-pink-200/80 tap-bounce text-xs flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{seniorMode ? 'ریفرل لنک شیئر کریں' : 'Share Referral Link'}</span>
                </button>

                {/* Direct WhatsApp & SMS Share Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 rounded-2xl bg-[#e7f8ee] hover:bg-[#d5f3e1] border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center justify-center gap-1.5 tap-bounce"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={smsHref}
                    className="py-2 px-3 rounded-2xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-extrabold flex items-center justify-center gap-1.5 tap-bounce"
                  >
                    <MessageSquare className="w-4 h-4 text-sky-600" />
                    <span>SMS</span>
                  </a>
                </div>
              </>
            )}
          </div>

          {/* Anti-Fraud & Permanent Points Guarantee */}
          <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-3 text-xs text-rose-900 space-y-1">
            <div className="font-extrabold flex items-center gap-1.5 text-rose-950">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Fair Play &amp; Permanent Points Protection</span>
            </div>
            <p className="text-[11px] leading-relaxed text-rose-800">
              Duplicate accounts, self-referrals, fake signups, and repeated rewards are automatically blocked. Verified referral rewards (+{REFERRAL_REWARD_POINTS} Pts) are permanent, recorded in your transaction history, never reset daily, and are completely separate from ads.
            </p>
          </div>

          {/* Verified Referral History */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <h4 className="font-extrabold text-xs text-slate-800">
                Verified Invited Friends ({totalSuccessfulInvites})
              </h4>
              {isSignedIn && (
                <button
                  type="button"
                  onClick={refreshReferrals}
                  disabled={loading}
                  className="text-[11px] font-bold text-[#ec0078] hover:text-[#be0060] flex items-center gap-1 tap-bounce"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  <span>{loading ? 'Checking...' : 'Refresh'}</span>
                </button>
              )}
            </div>

            {verifiedReferrals.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center text-xs text-slate-500">
                No verified invites yet. Share your link via WhatsApp, SMS, or any app to earn +{REFERRAL_REWARD_POINTS} permanent JoyPoints per verified friend.
              </div>
            ) : (
              <div className="space-y-2">
                {verifiedReferrals.map((ref) => (
                  <div
                    key={ref.id}
                    className="bg-white border border-pink-100 p-3 rounded-2xl shadow-2xs flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{ref.referredName}</p>
                      <p className="text-[10px] text-slate-400">
                        Verified • {new Date(ref.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                      +{ref.rewardPoints} Pts Credited
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
