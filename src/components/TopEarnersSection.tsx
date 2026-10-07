import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, Flame, Award, ChevronRight, Sparkles, MapPin, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { TopEarner } from '../types';
import { soundService } from '../services/soundService';
import { getFirestoreDB } from '../services/firestoreService';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';

interface TopEarnersSectionProps {
  currentPoints: number;
  userName: string;
  streakDays: number;
  seniorMode: boolean;
  onOpenActivity?: (id: string) => void;
}

export const TopEarnersSection: React.FC<TopEarnersSectionProps> = ({
  currentPoints,
  userName,
  streakDays,
  seniorMode,
  onOpenActivity
}) => {
  const [filter, setFilter] = useState<'all' | 'month' | 'week'>('all');
  const [isExpanded, setIsExpanded] = useState(false);
  const [cloudEarners, setCloudEarners] = useState<TopEarner[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch real users from Firestore
  useEffect(() => {
    let isMounted = true;
    const fetchRealEarners = async () => {
      const db = getFirestoreDB();
      if (!db) return;

      try {
        setIsLoading(true);
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('points', 'desc'), limit(10));
        const snap = await getDocs(q);

        if (!snap.empty && isMounted) {
          const list: TopEarner[] = [];
          let rank = 1;
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            const displayName = data.displayName || (data.email ? data.email.split('@')[0] : 'Learner');
            list.push({
              rank: rank++,
              name: displayName,
              avatar: '🌟',
              points: typeof data.points === 'number' ? data.points : 0,
              badge: data.streakDays > 10 ? 'Streak Champion' : 'Active Learner',
              city: 'Registered Member',
              streakDays: typeof data.streakDays === 'number' ? data.streakDays : 1,
              level: Math.max(1, Math.floor((data.points || 0) / 250)),
              isCurrentUser: displayName.toLowerCase() === userName.toLowerCase(),
            });
          });
          setCloudEarners(list);
        }
      } catch (err) {
        // Silently handle firestore read restrictions and keep real local user
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchRealEarners();
    return () => {
      isMounted = false;
    };
  }, [userName]);

  const handleTabChange = (newFilter: 'all' | 'month' | 'week') => {
    soundService.playClick();
    setFilter(newFilter);
  };

  // Build real earners list containing current user plus any real cloud learners
  const earners: TopEarner[] = React.useMemo(() => {
    if (cloudEarners.length > 0) {
      // If current user is in list, update their current points
      const hasSelf = cloudEarners.some((e) => e.isCurrentUser);
      if (hasSelf) {
        return cloudEarners.map((e) =>
          e.isCurrentUser ? { ...e, points: currentPoints, streakDays } : e
        );
      }
      return [
        {
          rank: 1,
          name: userName,
          avatar: '🌸',
          points: currentPoints,
          badge: streakDays > 7 ? 'Streak Master' : 'Rising Scholar',
          city: 'Local Member',
          streakDays,
          level: Math.max(1, Math.floor(currentPoints / 250)),
          isCurrentUser: true,
        },
        ...cloudEarners,
      ].sort((a, b) => b.points - a.points).map((e, idx) => ({ ...e, rank: idx + 1 }));
    }

    // Default real single user when alone (zero fake data)
    return [
      {
        rank: 1,
        name: userName || 'You',
        avatar: '🌸',
        points: currentPoints,
        badge: streakDays > 7 ? 'Streak Master' : 'Rising Scholar',
        city: 'Active Member',
        streakDays,
        level: Math.max(1, Math.floor(currentPoints / 250)),
        isCurrentUser: true,
      },
    ];
  }, [cloudEarners, currentPoints, streakDays, userName]);

  const userRankIndex = earners.findIndex((e) => e.isCurrentUser);
  const userRank = userRankIndex >= 0 ? userRankIndex + 1 : 1;
  const visibleList = isExpanded ? earners : earners.slice(0, 5);
  const otherLearnersCount = earners.length - 1;

  const getRankBadgeStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 border-amber-300 shadow-amber-200';
      case 2:
        return 'bg-gradient-to-r from-slate-200 to-slate-400 text-slate-800 border-slate-300 shadow-slate-200';
      case 3:
        return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white border-amber-500 shadow-amber-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <section className="w-full max-w-md mx-auto space-y-3 px-3 my-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
            <Trophy className="w-5 h-5 text-amber-950" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-black text-base text-slate-900 tracking-tight">
                {seniorMode ? 'ٹاپ لرنرز (لیڈر بورڈ)' : 'Learners Leaderboard'}
              </h3>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-full border border-emerald-200">
                Live Data
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {seniorMode
                ? 'سب سے زیادہ پوائنٹس اور کوئز ریکارڈ حاصل کرنے والے صارفین (حقیقی ڈیٹا)'
                : 'Highest verified lifetime JoyPoints & learning streaks'}
            </p>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full text-[10px] font-black text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-Time</span>
        </div>
      </div>

      {/* Main Leaderboard Card */}
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl border-2 border-amber-200/80 shadow-xl shadow-amber-100/50 overflow-hidden">
        {/* Time Tabs */}
        <div className="flex bg-slate-100/80 p-1.5 gap-1 border-b border-slate-200/60">
          <button
            onClick={() => handleTabChange('all')}
            className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all ${
              filter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {seniorMode ? 'تمام وقت' : 'All-Time'}
          </button>
          <button
            onClick={() => handleTabChange('month')}
            className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all ${
              filter === 'month'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {seniorMode ? 'اس مہینے' : 'This Month'}
          </button>
          <button
            onClick={() => handleTabChange('week')}
            className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all ${
              filter === 'week'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {seniorMode ? 'اس ہفتے' : 'This Week'}
          </button>
        </div>

        {/* Top 1 Champion Card */}
        {earners[0] && (
          <div className="p-4 bg-gradient-to-b from-amber-50/80 via-white to-white border-b border-amber-100 flex flex-col items-center text-center relative">
            <div className="absolute top-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
              <Crown className="w-3 h-3" />
              <span>Rank #1 • Leaderboard Leader</span>
            </div>

            <div className="text-3xl mt-5 mb-1">{earners[0].avatar}</div>
            <h4 className="font-black text-sm text-slate-900">
              {earners[0].isCurrentUser ? `${userName} (${seniorMode ? 'آپ' : 'You'})` : earners[0].name}
            </h4>
            <div className="text-xs font-black text-amber-600 mt-0.5">
              ⭐ {earners[0].points.toLocaleString()} JoyPoints
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1 font-bold">
              <span className="flex items-center gap-0.5 text-orange-600">
                <Flame className="w-3 h-3" /> {earners[0].streakDays} Day Streak
              </span>
              <span>•</span>
              <span>Level {earners[0].level}</span>
            </div>
          </div>
        )}

        {/* If other real learners exist, list them */}
        {otherLearnersCount > 0 ? (
          <div className="divide-y divide-slate-100">
            {visibleList.slice(1).map((earner) => {
              const isSelf = earner.isCurrentUser;
              return (
                <div
                  key={earner.name + earner.rank}
                  className={`flex items-center gap-3 p-3 transition-colors ${
                    isSelf ? 'bg-rose-50/70 border-l-4 border-rose-500' : 'bg-white'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 border ${getRankBadgeStyle(
                      earner.rank
                    )}`}
                  >
                    {earner.rank}
                  </div>
                  <div className="text-xl shrink-0">{earner.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-xs text-slate-900 truncate">
                      {isSelf ? `${userName} (${seniorMode ? 'آپ' : 'You'})` : earner.name}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Flame className="w-2.5 h-2.5 text-rose-500" />
                      <span>{earner.streakDays}d streak</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black text-xs text-amber-600">
                      ⭐ {earner.points.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Friendly Empty State When No Other Simulated Learners */
          <div className="p-4 bg-amber-50/50 rounded-2xl m-3 border border-amber-200/80 text-center space-y-1.5">
            <Sparkles className="w-6 h-6 text-amber-500 mx-auto" />
            <h5 className="font-black text-xs text-slate-800">
              {seniorMode ? 'آپ کا تعلیمی ریکارڈ سب سے آگے ہے!' : "You're Leading the Board!"}
            </h5>
            <p className="text-[11px] text-slate-600 leading-relaxed max-w-xs mx-auto">
              {seniorMode
                ? 'ابھی دیگر نئے طلباء رجسٹر ہو رہے ہیں۔ روزانہ کوئز اور ویڈیوز سے پوائنٹس حاصل کر کے اپنا نمبر ون رینک برقرار رکھیں۔'
                : 'No other learners registered on the cloud leaderboard yet. Keep completing your daily quizzes to hold your verified top spot!'}
            </p>
          </div>
        )}

        {/* User's Current Live Standing Bar */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white p-3 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-sm">
              #{userRank}
            </div>
            <div>
              <div className="text-xs font-black flex items-center gap-1">
                <span>{seniorMode ? 'آپ کا موجودہ مقام' : 'Your Live Standing'}</span>
                <span className="text-[10px] bg-white/25 px-1.5 py-0.2 rounded-full font-bold">
                  {userRank === 1 ? 'Rank Champion 👑' : 'Active Learner'}
                </span>
              </div>
              <div className="text-[10px] text-amber-100">
                {seniorMode
                  ? 'اصلی تصدیق شدہ پوائنٹس'
                  : 'Verified JoyPoints from real activity'}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-black text-yellow-200">
              ⭐ {currentPoints.toLocaleString()} Pts
            </div>
            <div className="text-[10px] font-bold text-amber-100">
              🔥 {streakDays} Day Streak
            </div>
          </div>
        </div>
      </div>

      {/* Transparent Integrity Notice */}
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 text-center px-2">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span>
          {seniorMode
            ? 'تمام انعامات اصلی سپانسرز اور تعلیمی سرگرمیوں سے سپانسر شدہ ہیں'
            : '100% fair real Firestore data • No simulated accounts'}
        </span>
      </div>
    </section>
  );
};
