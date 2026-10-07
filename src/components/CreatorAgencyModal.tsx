import React, { useState } from 'react';
import {
  X,
  Briefcase,
  Users,
  TrendingUp,
  Award,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';

interface CreatorAgencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  seniorMode?: boolean;
}

export const CreatorAgencyModal: React.FC<CreatorAgencyModalProps> = ({
  isOpen,
  onClose,
  seniorMode = false
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'creators' | 'benefits'>('overview');
  const [joined, setJoined] = useState(false);
  const { light, success } = useHaptics();

  if (!isOpen) return null;

  const handleJoinAgency = () => {
    soundService.playFanfare();
    success();
    setJoined(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-indigo-300 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">
              🏛️
            </div>
            <div>
              <h2 className="font-black text-sm sm:text-base leading-tight">
                {seniorMode ? 'لرننگ ایجنسی اور تخلیق کار پورٹل' : 'Creator & Educator Agency'}
              </h2>
              <p className="text-[11px] text-indigo-100 font-medium">
                {seniorMode ? 'تعلیمی مواد کے سفیر بنیں' : 'Earn commission as an educational ambassador'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1.5 border-b border-slate-200 text-xs font-black">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              activeTab === 'overview' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            Agency Hub
          </button>
          <button
            onClick={() => setActiveTab('creators')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              activeTab === 'creators' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            Top Ambassadors
          </button>
          <button
            onClick={() => setActiveTab('benefits')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              activeTab === 'benefits' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            Perks & Tiers
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'overview' && (
            <div className="space-y-3">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Official JoyEarn Agency #4102</span>
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded-full">
                    Verified
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Join verified educators and educational hosts to teach quizzes, host daily challenge streams, and earn up to 25% revenue shares on team learning streaks.
                </p>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-indigo-200/60 text-center">
                  <div className="bg-white p-2 rounded-xl border border-indigo-100">
                    <div className="text-sm font-black text-indigo-900">420+</div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase">Educators</div>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-indigo-100">
                    <div className="text-sm font-black text-emerald-700">98.4%</div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase">Rating</div>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-indigo-100">
                    <div className="text-sm font-black text-purple-900">25%</div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase">Bonus Tier</div>
                  </div>
                </div>
              </div>

              {!joined ? (
                <button
                  onClick={handleJoinAgency}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs rounded-2xl shadow-md tap-bounce flex items-center justify-center gap-2"
                >
                  <Briefcase className="w-4 h-4" />
                  <span>Apply as Learning Ambassador</span>
                </button>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-900 font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Application Submitted! Agency Manager will review within 24 hours.</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'creators' && (
            <div className="space-y-2.5">
              {[
                { name: 'Dr. Aliyah Malik', field: 'Science & Biology Quiz Host', followers: '12.4K', earnings: '42,000 Pts' },
                { name: 'Master Tariq', field: 'Mathematics & Speed Calculation', followers: '8.9K', earnings: '31,500 Pts' },
                { name: 'Sana Qureshi', field: 'World Geography & Trivia', followers: '15.1K', earnings: '58,200 Pts' }
              ].map((c, i) => (
                <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-900 flex items-center justify-center font-black text-sm">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">{c.name}</div>
                      <div className="text-[10px] text-slate-500">{c.field}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-emerald-700">{c.earnings}</div>
                    <div className="text-[10px] text-slate-400">{c.followers} followers</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'benefits' && (
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl space-y-1">
                <h4 className="font-black text-purple-950 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-purple-600" />
                  <span>Agency Host Privileges</span>
                </h4>
                <ul className="text-[11px] text-purple-900 list-disc list-inside space-y-1 font-medium">
                  <li>Verified Gold Agency badge on profile & chat lounges</li>
                  <li>Access to live quiz hosting tools and audio room moderation</li>
                  <li>Weekly JoyPoints bonus pools for top quiz creators</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
