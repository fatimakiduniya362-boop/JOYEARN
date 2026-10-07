with open('src/components/PersonalDashboardModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add import
import_target = "import { ShareStreakModal } from './ShareStreakModal';"
import_replacement = """import { ShareStreakModal } from './ShareStreakModal';
import { DailyGoalTracker } from './DailyGoalTracker';"""

if import_target in text:
    text = text.replace(import_target, import_replacement)

# 2. Replace static Daily Goal progress block with DailyGoalTracker
old_goal_block = """              {/* Today's Daily Goal Progress (5 Activities) */}
              <div className="bg-white rounded-2xl border-2 border-emerald-200 p-3.5 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">
                      🎯
                    </div>
                    <div>
                      <h4 className="font-black text-xs text-slate-900">
                        {seniorMode ? 'آج کا روزانہ ہدف (5 سرگرمیاں)' : 'Daily Learning Goal (5 Activities)'}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Complete 5 activities daily to keep streaks and trigger confetti
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    {completedActivitiesCount} / {dailyGoalTarget} Solved
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {completedActivitiesCount >= 5 ? (
                  <div className="bg-gradient-to-r from-amber-50 to-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-900">
                      <span className="text-lg">🎉</span>
                      <span>Daily Goal Reached! Confetti Celebrated</span>
                    </div>
                    <button
                      onClick={handleCelebrate}
                      className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[11px] font-black rounded-lg shadow-xs tap-bounce flex items-center gap-1"
                    >
                      <PartyPopper className="w-3 h-3" />
                      <span>Confetti</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1">
                    <span>{dailyGoalTarget - completedActivitiesCount} more activities needed today!</span>
                    <button
                      onClick={() => {
                        soundService.playClick();
                        onOpenLearn();
                      }}
                      className="text-emerald-700 font-extrabold hover:underline tap-bounce"
                    >
                      Solve a Quiz →
                    </button>
                  </div>
                )}
              </div>"""

new_goal_block = """              {/* DailyGoalTracker: 7-Day Streak Calendar & 5-Activity Daily Goal */}
              <DailyGoalTracker
                todayActivitiesCount={completedActivitiesCount}
                dailyGoalTarget={dailyGoalTarget}
                streakDays={streakDays}
                seniorMode={seniorMode}
                onOpenLearn={onOpenLearn}
                onOpenWatch={onOpenWatch}
                onTriggerConfetti={onTriggerConfetti}
              />"""

if old_goal_block in text:
    text = text.replace(old_goal_block, new_goal_block)
    with open('src/components/PersonalDashboardModal.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("SUCCESS: DailyGoalTracker integrated into PersonalDashboardModal.tsx!")
else:
    print("WARNING: old_goal_block not matched exactly!")
