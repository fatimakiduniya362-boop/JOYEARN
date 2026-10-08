import React from 'react';
import { ShieldCheck, Lock, Eye, FileText, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { soundService } from '../services/soundService';

interface PrivacyPolicyModalProps {
  onClose: () => void;
  seniorMode: boolean;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ onClose, seniorMode }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-md p-5 shadow-2xl border-4 border-rose-300 relative space-y-4 my-auto max-h-[85vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={() => {
            soundService.playClick();
            onClose();
          }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold z-20 tap-bounce"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center space-y-1 shrink-0 pt-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Google Play Compliant • 2026 Edition</span>
          </div>
          <h2 className="font-black text-xl text-slate-900">
            {seniorMode ? 'پرائیویسی پالیسی اور ڈیٹا سیفٹی' : 'Privacy Policy & Data Safety'}
          </h2>
          <p className="text-xs text-gray-500">
            JoyEarn — Family Friendly Rewards & Learning
          </p>
        </div>

        {/* Scrollable Policy Body */}
        <div className="flex-1 overflow-y-auto text-left text-xs text-slate-600 space-y-3 pr-1 leading-relaxed">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
            <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-rose-500" />
              1. Information We Collect
            </h4>
            <p>
              JoyEarn collects minimal user details required strictly for account management and reward payouts:
            </p>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-500">
              <li>Google Account display name & email (when user elects to Continue with Google).</li>
              <li>In-app points, activity streak, and transaction history.</li>
              <li>Local cache preferences (language, sound preferences, theme).</li>
              <li>Sponsor enquiry details (business name, link, email, optional phone and message) are stored only to reply to the enquiry.</li>
            </ul>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
            <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-500" />
              2. How We Use & Protect Data
            </h4>
            <p>
              Your data is never sold, leased, or rented to third-party data brokers. All communications with Google APIs and servers use industry-standard HTTPS TLS encryption. Sponsor enquiry details (business name, link, email, optional phone and message) are stored only to reply to the enquiry.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
            <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              3. Content & Community Safety
            </h4>
            <p>
              JoyEarn contains zero age-restricted, violent, gambling, or adult content. All videos, quizzes, and learning challenges are vetted for general wholesome viewing.
            </p>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
            <h4 className="font-extrabold text-amber-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              4. Rewards & Wallet Policy (JoyPoints)
            </h4>
            <p className="text-amber-900 font-bold">
              Points can be exchanged for rewards subject to the Wallet terms.
            </p>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              JoyPoints are awarded for completing educational quizzes, viewing family-safe learning curriculum, and consistent daily study habits. Rewards depend on ad revenue, are reviewed manually and are not guaranteed. Amounts may be very small. Points may also be used in-app to unlock learning themes, avatars, and badges.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
            <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-indigo-500" />
              5. Google Play Billing & In-App Purchases
            </h4>
            <p>
              All optional purchases (such as Remove Ads or JoyPass) are processed securely through official Google Play In-App Billing denominated in US Dollars ($ USD). JoyPoints earned through learning are free and require zero purchase.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
            <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-500" />
              6. Account & Data Deletion (Play Policy)
            </h4>
            <p>
              Users may permanently delete their account and associated data directly inside Settings via the &quot;Delete My Account &amp; Personal Data&quot; option, or via our web deletion portal at:
              <br />
              <strong className="text-blue-600">https://ais-pre-yu4imjtkrbbrtd3hcg63dd-498458785197.asia-east1.run.app/delete-account</strong>
              <br />
              or by emailing: <strong className="text-rose-600">support@joyearn.app</strong>
            </p>
          </div>
        </div>

        {/* Confirmation Button */}
        <div className="shrink-0 pt-2 border-t border-slate-100">
          <button
            onClick={() => {
              soundService.playClick();
              onClose();
            }}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl text-xs tap-bounce shadow-sm"
          >
            {seniorMode ? 'سمجھ گیا / بند کریں' : 'I Understand & Agree'}
          </button>
        </div>
      </div>
    </div>
  );
};
