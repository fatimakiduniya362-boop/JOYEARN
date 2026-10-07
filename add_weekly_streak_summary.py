with open('src/components/PersonalDashboardModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add import
import_target = "import { DailyGoalTracker } from './DailyGoalTracker';"
import_replacement = """import { DailyGoalTracker } from './DailyGoalTracker';
import { WeeklyStreakSummary } from './WeeklyStreakSummary';"""

if import_target in text:
    text = text.replace(import_target, import_replacement)

# Add component JSX right after DailyGoalTracker
target_jsx = """              {/* DailyGoalTracker: 7-Day Streak Calendar & 5-Activity Daily Goal */}
              <DailyGoalTracker
                todayActivitiesCount={completedActivitiesCount}
                dailyGoalTarget={dailyGoalTarget}
                streakDays={streakDays}
                seniorMode={seniorMode}
                onOpenLearn={onOpenLearn}
                onOpenWatch={onOpenWatch}
                onTriggerConfetti={onTriggerConfetti}
              />"""

replacement_jsx = """              {/* DailyGoalTracker: 7-Day Streak Calendar & 5-Activity Daily Goal */}
              <DailyGoalTracker
                todayActivitiesCount={completedActivitiesCount}
                dailyGoalTarget={dailyGoalTarget}
                streakDays={streakDays}
                seniorMode={seniorMode}
                onOpenLearn={onOpenLearn}
                onOpenWatch={onOpenWatch}
                onTriggerConfetti={onTriggerConfetti}
              />

              {/* Weekly Streak Summary (Visual 7-Day 5-Activity Consistency) */}
              <WeeklyStreakSummary
                todayActivitiesCount={completedActivitiesCount}
                dailyGoalTarget={dailyGoalTarget}
                streakDays={streakDays}
                seniorMode={seniorMode}
              />"""

if target_jsx in text:
    text = text.replace(target_jsx, replacement_jsx)
    with open('src/components/PersonalDashboardModal.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("SUCCESS: WeeklyStreakSummary added to PersonalDashboardModal.tsx!")
else:
    print("WARNING: target_jsx not found in PersonalDashboardModal.tsx")
