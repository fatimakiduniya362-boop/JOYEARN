import React, { useState } from 'react';
import {
  Flame,
  Award,
  Lock,
  Unlock,
  CheckCircle2,
  Sparkles,
  Trophy,
  Star,
  Gift,
  Zap,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Crown
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';

export interface MilestoneItem {
  id: string;
  streakDaysRequired: number;
  title: string;
  urduTitle: string;
  subtitle: string;
  urduSubtitle: string;
  rewardPoints: number;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond' | 'legendary';
  perkDescription: string;
  urduPerkDescription: string;
}

export const STREAK_MILESTONES: MilestoneItem[] = [
  {
    id: 'streak_1',
    streakDaysRequired: 1,
    title: 'First Step Pioneer',
    urduTitle: 'پہلا قدم پائینیر',
    subtitle: 'Completed 1 full daily learning goal',
    urduSubtitle: 'پہلے دن کا مکمل تعلیمی ہدف حاصل کیا',
    rewardPoints: 30,
    icon: '🌱',
    tier: 'bronze',
    perkDescription: 'Bronze Starter Badge + 30 Points',
    urduPerkDescription: 'کانسی بیج + 30 بونس پوائنٹس'
  },
  {
    id: 'streak_3',
    streakDaysRequired: 3,
    title: '3-Day Streak Igniter',
    urduTitle: '3 روزہ لگاتار شعلہ',
    subtitle: '3 consecutive days of daily goals',
    urduSubtitle: 'مسلسل 3 دن روزانہ کے تمام اہداف مکمل',
    rewardPoints: 100,
    icon: '🔥',
    tier: 'silver',
    perkDescription: 'Silver Streak Badge + 100 Points',
    urduPerkDescription: 'سلور اسٹریک بیج + 100 بونس پوائنٹس'
  },
  {
    id: 'streak_5',
    streakDaysRequired: 5,
    title: '5-Day Momentum Hero',
    urduTitle: '5 روزہ تسلسل کا ہیرو',
    subtitle: '5 consecutive days with zero breaks',
    urduSubtitle: 'بغیر کسی وقفے کے مسلسل 5 دن سرگرمیاں',
    rewardPoints: 180,
    icon: '⚡',
    tier: 'gold',
    perkDescription: 'Golden Spark Badge + 180 Points',
    urduPerkDescription: 'سنہری اسپارک بیج + 180 بونس پوائنٹس'
  },
  {
    id: 'weekly_consistency',
    streakDaysRequired: 7,
    title: 'Weekly Consistency',
    urduTitle: 'ہفتہ وار مستقل مزاجی',
    subtitle: 'Hit the 5-activity daily goal for 7 consecutive days',
    urduSubtitle: 'مسلسل 7 دن 5 سرگرمیوں کا روزانہ ہدف حاصل کیا',
    rewardPoints: 500,
    icon: '🎖️',
    tier: 'gold',
    perkDescription: 'Weekly Consistency Badge + 500 Points',
    urduPerkDescription: 'ہفتہ وار مستقل مزاجی بیج + 500 پوائنٹس'
  },
  {
    id: 'streak_7',
    streakDaysRequired: 7,
    title: '7-Day Weekly Legend',
    urduTitle: '7 روزہ ہفتہ وار لیجنڈ',
    subtitle: 'A full week of non-stop learning!',
    urduSubtitle: 'ایک پورا ہفتہ مسلسل بغیر رکے تعلیم و کمائی!',
    rewardPoints: 350,
    icon: '🏆',
    tier: 'gold',
    perkDescription: 'Weekly Legend Trophy + 350 Points + 1.2x Multiplier',
    urduPerkDescription: 'ہفتہ وار لیجنڈ ٹرافی + 350 پوائنٹس'
  },
  {
    id: 'streak_14',
    streakDaysRequired: 14,
    title: '14-Day Diamond Scholar',
    urduTitle: '14 روزہ ڈائمنڈ اسکالر',
    subtitle: '2 consecutive weeks of excellence',
    urduSubtitle: '2 ہفتے مسلسل روزانہ کے اہداف کی تکمیل',
    rewardPoints: 750,
    icon: '💎',
    tier: 'diamond',
    perkDescription: 'Diamond Scholar Pin + 750 Points',
    urduPerkDescription: 'ڈائمنڈ پن + 750 پوائنٹس'
  },
  {
    id: 'streak_30',
    streakDaysRequired: 30,
    title: '30-Day Royal Titan',
    urduTitle: '30 روزہ شاہی ٹائٹن',
    subtitle: '1 month unbroken streak perfection',
    urduSubtitle: 'ایک ماہ مکمل غیر متزلزل استقامت اور محنت',
    rewardPoints: 2000,
    icon: '👑',
    tier: 'legendary',
    perkDescription: 'Royal Crown Badge + 2,000 Points + VIP Profile Frame',
    urduPerkDescription: 'شاہی تاج بیج + 2,000 پوائنٹس + وی آئی پی فریم'
  }
];

interface MilestoneComponentProps {
  currentStreakDays: number;
  completedActivitiesCount: number; // 0 to 5
  seniorMode: boolean;
  onClaimMilestone: (milestoneId: string, points: number, title: string) => void;
  claimedMilestoneIds?: string[];
  onTriggerConfetti: () => void;
}

export const MilestoneComponent: React.FC<MilestoneComponentProps> = ({
  currentStreakDays,
  completedActivitiesCount,
  seniorMode,
  onClaimMilestone,
  claimedMilestoneIds = [],
  onTriggerConfetti
}) => {
  const { light, success } = useHaptics();
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [justClaimedId, setJustClaimedId] = useState<string | null>(null);

  // Find next upcoming milestone
  const nextMilestone = STREAK_MILESTONES.find(
    (m) => m.streakDaysRequired > currentStreakDays
  );

  const daysToNext = nextMilestone
    ? nextMilestone.streakDaysRequired - currentStreakDays
    : 0;

  const handleClaim = (milestone: MilestoneItem) => {
    soundService.playFanfare();
    success();
    onTriggerConfetti();
    setJustClaimedId(milestone.id);
    onClaimMilestone(milestone.id, milestone.rewardPoints, milestone.title);
    setTimeout(() => {
      setJustClaimedId(null);
    }, 2000);
  };

  const filteredMilestones = STREAK_MILESTONES.filter((m) => {
    const isUnlocked = currentStreakDays >= m.streakDaysRequired;
    if (filter === 'unlocked') return isUnlocked;
    if (filter === 'locked') return !isUnlocked;
    return true;
  });

  const totalUnlockedCount = STREAK_MILESTONES.filter(
    (m) => currentStreakDays >= m.streakDaysRequired
  ).length;

  return (
    <div className="space-y-4">
      {/* STREAK HERO BANNER */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-3xl p-4 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-36 h-36 bg-white/15 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between relative z-10 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner animate-pulse-subtle">
              🔥
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-100 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {seniorMode ? 'موجودہ روزانہ اسٹریک' : 'Current Daily Streak'}
              </span>
              <h3 className="text-2xl font-black leading-tight flex items-center gap-2">
                <span>{currentStreakDays}</span>
                <span className="text-sm font-bold opacity-90">
                  {seniorMode ? 'دن مسلسل' : 'Days in a Row'}
                </span>
              </h3>
            </div>
          </div>

          <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-2xl text-right border border-white/20 shadow-xs">
            <div className="text-[10px] uppercase font-bold text-amber-100">
              {seniorMode ? 'انلاک شدہ بیجز' : 'Unlocked Badges'}
            </div>
            <div className="text-sm font-black flex items-center justify-end gap-1">
              <Trophy className="w-3.5 h-3.5 text-yellow-300" />
              <span>{totalUnlockedCount} / {STREAK_MILESTONES.length}</span>
            </div>
          </div>
        </div>

        {/* PROGRESS TO NEXT MILESTONE */}
        {nextMilestone ? (
          <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-3 border border-white/15">
            <div className="flex justify-between items-center text-xs font-bold mb-1.5">
              <span className="flex items-center gap-1 text-amber-100">
                <Lock className="w-3 h-3" />
                {seniorMode
                  ? `اگلا سنگ میل: ${nextMilestone.urduTitle}`
                  : `Next Milestone: ${nextMilestone.title}`}
              </span>
              <span className="text-white font-black bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
                {seniorMode ? `${daysToNext} دن باقی` : `${daysToNext} days left`}
              </span>
            </div>

            {/* Visual Bar */}
            <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden p-0.5">
              <div
                className="bg-gradient-to-r from-yellow-300 to-white h-full rounded-full transition-all duration-700 shadow-sm"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((currentStreakDays / nextMilestone.streakDaysRequired) * 100)
                  )}%`
                }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-amber-100/90 mt-1 font-semibold">
              <span>{currentStreakDays} {seniorMode ? 'دن مکمل' : 'days completed'}</span>
              <span>{nextMilestone.streakDaysRequired} {seniorMode ? 'دن ہدف' : 'days target'} ({nextMilestone.rewardPoints} pts)</span>
            </div>
          </div>
        ) : (
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-2.5 text-center text-xs font-black text-amber-100 border border-white/20 flex items-center justify-center gap-2">
            <Crown className="w-4 h-4 text-yellow-300 animate-bounce" />
            <span>{seniorMode ? 'شاباش! آپ نے تمام بڑی اسٹریک کامیابیوں کو انلاک کر لیا ہے!' : 'Incredible! You have unlocked all premier streak milestones!'}</span>
          </div>
        )}
      </div>

      {/* TODAY'S GOAL LINK */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
            {completedActivitiesCount}/5
          </div>
          <div>
            <div className="font-black text-emerald-950">
              {seniorMode ? 'آج کا روزانہ ہدف' : "Today's Daily Activity Goal"}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium">
              {completedActivitiesCount >= 5
                ? (seniorMode ? 'آج کا ہدف حاصل ہوا! اسٹریک برقرار ہے 🔥' : 'Goal completed! Streak secured for today 🔥')
                : (seniorMode ? `${5 - completedActivitiesCount} مزید سرگرمیاں باقی ہیں` : `${5 - completedActivitiesCount} more activities to protect streak`)}
            </div>
          </div>
        </div>

        {completedActivitiesCount >= 5 ? (
          <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-xl text-[11px] font-black flex items-center gap-1 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{seniorMode ? 'محفوظ' : 'Secured'}</span>
          </span>
        ) : (
          <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-[11px] font-black flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-600" />
            <span>{seniorMode ? 'جاری' : 'In Progress'}</span>
          </span>
        )}
      </div>

      {/* FILTER BUTTONS */}
      <div className="flex items-center justify-between gap-1 bg-gray-100 p-1 rounded-2xl text-xs font-black">
        <button
          onClick={() => {
            light();
            setFilter('all');
          }}
          className={`flex-1 py-1.5 rounded-xl transition-all ${
            filter === 'all'
              ? 'bg-white text-gray-900 shadow-xs'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {seniorMode ? 'تمام' : 'All'} ({STREAK_MILESTONES.length})
        </button>
        <button
          onClick={() => {
            light();
            setFilter('unlocked');
          }}
          className={`flex-1 py-1.5 rounded-xl transition-all ${
            filter === 'unlocked'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {seniorMode ? 'انلاک شدہ' : 'Unlocked'} ({totalUnlockedCount})
        </button>
        <button
          onClick={() => {
            light();
            setFilter('locked');
          }}
          className={`flex-1 py-1.5 rounded-xl transition-all ${
            filter === 'locked'
              ? 'bg-white text-amber-700 shadow-xs'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {seniorMode ? 'مقفل' : 'Locked'} ({STREAK_MILESTONES.length - totalUnlockedCount})
        </button>
      </div>

      {/* MILESTONE CARDS LIST */}
      <div className="space-y-2.5">
        {filteredMilestones.map((m) => {
          const isUnlocked = currentStreakDays >= m.streakDaysRequired;
          const isClaimed = claimedMilestoneIds.includes(m.id);
          const progressPercent = Math.min(
            100,
            Math.round((currentStreakDays / m.streakDaysRequired) * 100)
          );

          return (
            <div
              key={m.id}
              className={`rounded-2xl border transition-all p-3.5 relative overflow-hidden ${
                isUnlocked
                  ? 'bg-white border-emerald-300 shadow-sm hover:border-emerald-400'
                  : 'bg-slate-50 border-slate-200 opacity-90'
              }`}
            >
              {/* Subtle accent bar */}
              <div
                className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                  isUnlocked
                    ? m.tier === 'legendary'
                      ? 'bg-gradient-to-b from-purple-500 to-amber-500'
                      : m.tier === 'diamond'
                      ? 'bg-cyan-500'
                      : m.tier === 'gold'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                    : 'bg-slate-300'
                }`}
              />

              <div className="flex items-start gap-3 pl-1.5">
                {/* Badge Icon */}
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 border relative shadow-xs ${
                    isUnlocked
                      ? 'bg-gradient-to-br from-amber-50 to-orange-100 border-amber-200'
                      : 'bg-slate-200 border-slate-300 grayscale opacity-80'
                  }`}
                >
                  <span>{m.icon}</span>
                  {/* Status Indicator Icon */}
                  <div className="absolute -bottom-1 -right-1">
                    {isUnlocked ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-slate-600 text-white flex items-center justify-center text-[10px] shadow-xs">
                        <Lock className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h4 className="font-black text-xs sm:text-sm text-gray-900 truncate">
                      {seniorMode ? m.urduTitle : m.title}
                    </h4>

                    {/* Streak Target Pill */}
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase shrink-0 ${
                        isUnlocked
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {m.streakDaysRequired} {seniorMode ? 'دن اسٹریک' : 'Days Streak'}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-600 font-medium mb-1.5">
                    {seniorMode ? m.urduSubtitle : m.subtitle}
                  </p>

                  {/* Reward & Status Row */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-600">
                      <Gift className="w-3.5 h-3.5" />
                      <span>+{m.rewardPoints} {seniorMode ? 'پوائنٹس' : 'Points'}</span>
                    </div>

                    {/* Claim / Action Button */}
                    {isUnlocked ? (
                      isClaimed ? (
                        <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>{seniorMode ? 'وصول شدہ' : 'Claimed'}</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleClaim(m)}
                          className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs rounded-xl shadow-xs tap-bounce flex items-center gap-1 hover:brightness-110 animate-pulse-subtle"
                        >
                          <Sparkles className="w-3 h-3 text-yellow-300" />
                          <span>{seniorMode ? 'انعام وصول کریں' : 'Claim Reward'}</span>
                        </button>
                      )
                    ) : (
                      <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>
                          {currentStreakDays}/{m.streakDaysRequired}{' '}
                          {seniorMode ? 'دن' : 'days'} ({progressPercent}%)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Locked progress bar */}
                  {!isUnlocked && (
                    <div className="mt-2 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
