import React, { useState } from 'react';
import { Copy, Share2, Users, ShieldAlert, CheckCircle, Gift } from 'lucide-react';
import { ReferralUser } from '../types';

interface InviteModalProps {
  referrals: ReferralUser[];
  onClose: () => void;
  seniorMode: boolean;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  referrals,
  onClose,
  seniorMode,
}) => {
  const [copied, setCopied] = useState(false);
  const referralCode = 'JOY-8834';
  const referralUrl = `https://joyearn.app/join?ref=${referralCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join JoyEarn - Family Safe Fun & Learning',
        text: `Join me on JoyEarn! Use my family referral code ${referralCode} to learn, play safe mini-games, and earn legitimate rewards together:`,
        url: referralUrl,
      }).catch(() => {});
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border-4 border-purple-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl">
              🎁
            </div>
            <div>
              <h2 className={`font-bold flex items-center gap-1.5 ${seniorMode ? 'text-2xl' : 'text-lg'}`}>
                Invite Friends & Family
              </h2>
              <p className="text-xs text-purple-100">Genuine referrals • 100 Pts per active member</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Card Hero */}
          <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-amber-50 p-4 rounded-3xl border-2 border-purple-200 text-center space-y-3">
            <span className="text-4xl block animate-bounce-subtle">👭✨</span>
            <h3 className="font-extrabold text-purple-950 text-base">Earn +100 JoyPoints Per Active Friend</h3>
            <p className="text-xs text-gray-600 leading-relaxed px-2">
              Share JoyEarn with your trusted family and friends. Bonus is granted once they complete their first educational activity.
            </p>

            {/* Code Box */}
            <div className="flex items-center justify-center gap-2 bg-white p-2.5 rounded-2xl border-2 border-dashed border-purple-300 max-w-xs mx-auto shadow-sm">
              <span className="font-mono font-black text-lg text-purple-700 tracking-wider">
                {referralCode}
              </span>
              <button
                onClick={copyToClipboard}
                className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-xl text-xs font-bold flex items-center gap-1 tap-bounce"
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <button
              onClick={handleShare}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold rounded-2xl shadow-md tap-bounce text-xs flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-4 h-4" /> Share via WhatsApp / SMS
            </button>
          </div>

          {/* Strict Anti-Fraud Rules Box */}
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs text-rose-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-rose-950">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Strict Anti-Fraud & Fair Play Policy</span>
            </div>
            <p className="text-[11px] leading-relaxed text-rose-800">
              Multiple fake registrations, emulator bots, self-referrals, and clone apps are automatically flagged and rejected. Only genuine, verified device activity earns referral bonuses.
            </p>
          </div>

          {/* Referral History */}
          <div>
            <h4 className="font-bold text-xs text-gray-800 mb-2 flex items-center justify-between">
              <span>Your Invited Friends ({referrals.length})</span>
              <span className="text-purple-600 text-[11px] font-semibold">
                Earned: {referrals.reduce((sum, r) => sum + r.pointsEarned, 0)} pts
              </span>
            </h4>

            <div className="space-y-2">
              {referrals.map((user) => (
                <div
                  key={user.id}
                  className="bg-white border border-gray-200 p-3 rounded-2xl shadow-sm flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-gray-900">{user.name}</p>
                    <p className="text-[10px] text-gray-400">
                      Joined {user.joinDate} • {user.activitiesCompleted} activities completed
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      user.bonusAwarded
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {user.bonusAwarded ? '+100 Pts Credited' : 'Pending Activity'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
