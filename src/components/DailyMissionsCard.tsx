import React from 'react';
import { CheckCircle2, ChevronRight, Sparkles, Trophy } from 'lucide-react';
import {
  DAILY_MISSIONS_LIST,
  DailyMissionId,
  getTodayCompletedMissions,
  getUserAchievements,
  loadUserMissionsProgress,
} from '../services/dailyMissionsService';
import { soundService } from '../services/soundService';

interface DailyMissionsCardProps {
  uid: string;
  streakDays: number;
  refreshKey?: number;
  onOpenMission: (missionId: DailyMissionId) => void;
  onOpenLeaderboard?: () => void;
}

export const DailyMissionsCard: React.FC<DailyMissionsCardProps> = ({
  uid,
  streakDays,
  onOpenMission,
  onOpenLeaderboard,
}) => {
  const completedIds = getTodayCompletedMissions(uid);
  const progress = loadUserMissionsProgress(uid);
  const achievements = getUserAchievements(uid, streakDays);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const doneCount = completedIds.length;
  const pct = Math.round((doneCount / DAILY_MISSIONS_LIST.length) * 100);

  return (
    <section
      aria-label="Daily Fun Missions"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-pink-100 dark:border-slate-800 shadow-xs p-3.5 space-y-3"
    >
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 dark:text-white leading-tight">
              Daily Fun Missions
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
              {doneCount}/3 done today • Best Quiz: {progress.quizBattleBestScore}/5
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenLeaderboard && (
            <button
              type="button"
              onClick={() => {
                soundService.playClick();
                onOpenLeaderboard();
              }}
              className="px-2 py-1 rounded-lg bg-pink-50 dark:bg-slate-800 text-rose-600 dark:text-rose-400 text-[10px] font-black flex items-center gap-1 tap-bounce"
              title="Weekly Quiz Leaderboard"
            >
              <Trophy className="w-3 h-3" />
              <span>Ranks</span>
            </button>
          )}
          <span className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 text-[10px] font-black">
            {unlockedCount}/{achievements.length} Badges
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-pink-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* 3 Compact Mission Rows */}
      <div className="space-y-2">
        {DAILY_MISSIONS_LIST.map((mission) => {
          const isDone = completedIds.includes(mission.id);
          return (
            <button
              key={mission.id}
              type="button"
              onClick={() => {
                soundService.playClick();
                onOpenMission(mission.id);
              }}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all tap-bounce ${
                isDone
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/50'
                  : 'bg-pink-50/35 dark:bg-slate-800/60 border-pink-100 dark:border-slate-700/80 hover:border-rose-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-lg shrink-0" aria-hidden="true">
                  {mission.emoji}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black text-gray-900 dark:text-white truncate">
                    {mission.title}
                  </p>
                  <p className="text-[10.5px] text-gray-500 dark:text-gray-400 truncate">
                    {mission.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isDone ? (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Done
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-black">
                    +{mission.rewardPoints} pts
                  </span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
