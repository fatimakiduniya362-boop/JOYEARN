import React, { useState } from 'react';
import {
  CheckSquare,
  CheckCircle2,
  CalendarCheck,
  BookOpen,
  Play,
  RotateCw,
  Gift,
  ShieldCheck,
  Flame,
  ArrowRight,
  ExternalLink,
  Users,
  Sparkles,
  Clock,
  Compass,
  Camera
} from 'lucide-react';
import { SponsoredTask } from '../types';
import { MandatoryTaskId } from '../utils/dailyTasksConfig';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';
import { getScheduledDailyTask, getScheduleDayNumber, ScheduledDailyQuest } from '../services/contentScheduleService';

interface TasksPageProps {
  tasks: SponsoredTask[];
  onCompleteTask: (taskId: string) => void;
  onEarnPoints?: (points: number, reason: string) => void;
  seniorMode: boolean;
  completedDailyTaskIds: MandatoryTaskId[];
  onDailyTaskAction: (actionKey: 'checkin' | 'learn' | 'watch' | 'wheel' | 'chest') => void;
  streakDays?: number;
  todayPoints?: number;
  onBackToHome?: () => void;
  onOpenLiveCamera?: () => void;
}

export const TasksPage: React.FC<TasksPageProps> = ({
  tasks,
  onCompleteTask,
  onEarnPoints,
  seniorMode,
  completedDailyTaskIds,
  onDailyTaskAction,
  streakDays = 5,
  todayPoints = 0,
  onBackToHome,
  onOpenLiveCamera,
}) => {
  const { success, selection } = useHaptics();

  // 150-Day Unified Content Schedule - Today's Quest
  const scheduledQuest = getScheduledDailyTask();
  const dayNumber = getScheduleDayNumber();
  const [scheduledQuestCompleted, setScheduledQuestCompleted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`joyearn_quest_done_${scheduledQuest.id}`) === 'true';
    } catch {
      return false;
    }
  });
  const [showQuestDetails, setShowQuestDetails] = useState<boolean>(false);


  // Selected community task modal state
  const [activeTaskModal, setActiveTaskModal] = useState<SponsoredTask | null>(null);
  const [taskInProgress, setTaskInProgress] = useState(false);
  const [taskSuccessNotice, setTaskSuccessNotice] = useState<string | null>(null);

  const completedDailyCount = completedDailyTaskIds.length;
  const isAllDailyDone = completedDailyCount >= 5;

  // The 5 Mandatory Daily Tasks definition
  const MANDATORY_DAILY_TASKS = [
    {
      id: 'daily_checkin' as MandatoryTaskId,
      title: 'Daily Attendance Check-in',
      urduTitle: 'روزانہ حاضری',
      description: 'Check in daily to lock in your streak & claim attendance JoyPoints.',
      points: 50,
      icon: CalendarCheck,
      actionLabel: 'Check-in Now',
      actionKey: 'checkin' as const,
    },
    {
      id: 'daily_quiz' as MandatoryTaskId,
      title: 'Daily Educational Quiz',
      urduTitle: 'روزانہ تعلیمی کوئز',
      description: "Answer today's 5 wholesome learning questions to build cognitive skills.",
      points: 25,
      icon: BookOpen,
      actionLabel: 'Take Quiz',
      actionKey: 'learn' as const,
    },
    {
      id: 'daily_video' as MandatoryTaskId,
      title: 'Daily Wholesome Video',
      urduTitle: 'روزانہ معلوماتی ویڈیو',
      description: 'Watch any 1 verified safe educational craft or science video.',
      points: 25,
      icon: Play,
      actionLabel: 'Watch Video',
      actionKey: 'watch' as const,
    },
    {
      id: 'daily_wheel' as MandatoryTaskId,
      title: 'Lucky Joy Wheel',
      urduTitle: 'خوش قسمت وہیل',
      description: 'Free daily spin for fair, genuine JoyPoints bonuses.',
      points: 30,
      icon: RotateCw,
      actionLabel: 'Spin Wheel',
      actionKey: 'wheel' as const,
    },
    {
      id: 'daily_chest' as MandatoryTaskId,
      title: 'Daily Streak Chest',
      urduTitle: 'روزانہ انعام کا ڈبہ',
      description: 'Unlock your daily streak treasure chest for loyalty rewards.',
      points: 35,
      icon: Gift,
      actionLabel: 'Open Chest',
      actionKey: 'chest' as const,
    },
  ];

  // Handle completing community task
  const handleConfirmCommunityTask = () => {
    if (!activeTaskModal) return;
    setTaskInProgress(true);
    soundService.playClick();

    setTimeout(() => {
      onCompleteTask(activeTaskModal.id);
      soundService.playFanfare();
      success();
      setTaskInProgress(false);
      setTaskSuccessNotice(`✓ Completed: ${activeTaskModal.title} (+${activeTaskModal.points} Pts)`);
      setActiveTaskModal(null);

      setTimeout(() => {
        setTaskSuccessNotice(null);
      }, 4000);
    }, 800);
  };

  // Handle completing 150-day scheduled quest
  const handleCompleteScheduledQuest = () => {
    if (scheduledQuestCompleted) return;
    soundService.playFanfare();
    success();
    setScheduledQuestCompleted(true);
    try {
      localStorage.setItem(`joyearn_quest_done_${scheduledQuest.id}`, 'true');
    } catch {}
    if (onEarnPoints) {
      onEarnPoints(scheduledQuest.points, `Day ${dayNumber} Quest: ${scheduledQuest.title}`);
    }
    setTaskSuccessNotice(`🎉 Completed Day ${dayNumber} Quest: ${scheduledQuest.title} (+${scheduledQuest.points} JoyPoints)`);
    setTimeout(() => {
      setTaskSuccessNotice(null);
    }, 4500);
  };


  return (
    <div className="w-full flex flex-col bg-slate-50 min-h-full pb-28">
      {/* Tasks Header */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white tap-bounce shrink-0"
                title="Back to Home"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            )}
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shadow-inner shrink-0">
              📝
            </div>
            <div>
              <h1 className={`font-black flex items-center gap-1.5 ${seniorMode ? 'text-2xl' : 'text-lg'}`}>
                {seniorMode ? 'روزانہ ٹاسک اور مشنز' : 'Verified Tasks & Quests'}
              </h1>
              <p className="text-xs text-amber-100 font-medium">
                Mandatory daily quests, community pledges & honest rewards
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-xl text-xs font-black">
            <Flame className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />
            <span>{streakDays} Days</span>
          </div>
        </div>

        {/* 5 Daily Mandatory Progress Card */}
        <div className="mt-4 bg-white/15 backdrop-blur-md rounded-2xl p-3.5 border border-white/20 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-black uppercase tracking-wider text-amber-200 text-[10px]">
              Mandatory Daily Routine:
            </span>
            <span className="font-black text-white">
              {completedDailyCount}/5 Completed {isAllDailyDone ? '🎉' : ''}
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-black/20 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-300 to-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${Math.round((completedDailyCount / 5) * 100)}%` }}
            />
          </div>

          <p className="text-[11px] text-amber-100">
            {isAllDailyDone
              ? 'Awesome job! All 5 mandatory daily activities are verified. Resets at midnight.'
              : 'Complete all 5 core daily tasks to maximize honest JoyPoints and maintain your streak.'}
          </p>
        </div>
      </div>

      {/* Anti-Scam Fair Play Banner */}
      <div className="bg-amber-50 border-b border-amber-200 p-3 text-xs text-amber-900 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
        <span className="font-semibold">
          Strict Anti-Scam Standard: Zero paid app installs, fake clicks, or pyramid schemes.
        </span>
      </div>

      {/* Success Notification */}
      {taskSuccessNotice && (
        <div className="mx-3 mt-3 p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 font-black text-xs rounded-2xl shadow-xs animate-fadeIn flex items-center justify-between">
          <span>{taskSuccessNotice}</span>
          <button onClick={() => setTaskSuccessNotice(null)} className="text-emerald-700 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* 150-Day Unified Content Schedule: Today's Featured Quest */}
      <div className="p-3 pb-0">
        <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white rounded-3xl p-4 shadow-md relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 text-7xl opacity-15 pointer-events-none select-none">
            🎯
          </div>

          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-black tracking-wide uppercase">
                Day {dayNumber} of 150
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white text-orange-700 text-[10px] font-black uppercase">
                {scheduledQuest.category}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-amber-100 font-bold">
                <Compass className="w-3 h-3" />
                <span>{scheduledQuest.difficulty}</span>
              </span>
            </div>

            <span className="px-2.5 py-1 rounded-xl bg-white/25 backdrop-blur-xs text-xs font-black shrink-0">
              +{scheduledQuest.points} Pts
            </span>
          </div>

          <h3 className="font-black text-sm sm:text-base leading-snug">
            {seniorMode && scheduledQuest.urduTitle ? scheduledQuest.urduTitle : scheduledQuest.title}
          </h3>
          <p className="text-xs text-amber-50 mt-1 line-clamp-2 font-medium">
            {seniorMode && scheduledQuest.urduDescription ? scheduledQuest.urduDescription : scheduledQuest.description}
          </p>

          {/* Collapsible Verification Requirement Details */}
          {showQuestDetails && (
            <div className="mt-3 pt-3 border-t border-white/20 space-y-1.5 animate-fadeIn text-xs">
              <div className="font-black text-[11px] uppercase tracking-wider text-amber-200">
                Verification Requirement:
              </div>
              <div className="text-[11px] text-white/95 bg-white/15 p-2.5 rounded-xl border border-white/20 leading-relaxed">
                {scheduledQuest.verificationCondition}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 mt-3 pt-2">
            <button
              onClick={() => {
                soundService.playClick();
                selection();
                setShowQuestDetails((prev) => !prev);
              }}
              className="text-[11px] font-black text-white/90 hover:text-white underline"
            >
              {showQuestDetails ? 'Hide Details ▲' : 'View Details ▼'}
            </button>

            {scheduledQuestCompleted ? (
              <span className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl font-black text-xs flex items-center gap-1 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Done for Today ✓</span>
              </span>
            ) : (
              <button
                onClick={handleCompleteScheduledQuest}
                className="px-4 py-2 bg-white text-orange-700 hover:bg-orange-50 font-black text-xs rounded-xl shadow tap-bounce flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                <span>Complete Quest (+{scheduledQuest.points} Pts)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Section 1: Five Mandatory Daily Tasks */}
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-black text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <span>Core Daily Tasks</span>
            <span className="text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.2 rounded-md font-extrabold">
              Resets Midnight
            </span>
          </h2>
          <span className="text-xs text-slate-500 font-bold">
            {completedDailyCount}/5 Done
          </span>
        </div>

        <div className="space-y-2">
          {MANDATORY_DAILY_TASKS.map((task) => {
            const isDone = completedDailyTaskIds.includes(task.id);
            const Icon = task.icon;

            return (
              <div
                key={task.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isDone
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-white border-slate-200/90 hover:border-amber-300 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-lg ${
                      isDone
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-xs sm:text-sm text-slate-900 truncate">
                        {seniorMode ? task.urduTitle : task.title}
                      </h3>
                      <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-md border border-amber-200 shrink-0">
                        +{task.points} Pts
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {task.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {isDone ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl font-black text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Done</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        soundService.playClick();
                        onDailyTaskAction(task.actionKey);
                      }}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs shadow-xs tap-bounce flex items-center gap-1"
                    >
                      <span>{task.actionLabel}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Creative Camera Quest Card */}
      {onOpenLiveCamera && (
        <div className="px-3 pt-1">
          <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white rounded-3xl p-4 shadow-md flex items-center justify-between gap-3 border border-pink-300/40">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl shrink-0">
                📸
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9.5px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                    Creative Challenge
                  </span>
                  <span className="text-amber-200 text-xs font-black">+100 JoyPoints</span>
                </div>
                <h3 className="font-black text-xs sm:text-sm mt-0.5 truncate text-white">
                  {seniorMode ? 'کیمرہ سے تصویر لیں یا ویڈیو بنائیں' : 'Snap a Photo or Record a 15s Vlog'}
                </h3>
                <p className="text-[11px] text-pink-100 line-clamp-1">
                  {seniorMode ? 'فلٹرز، اسٹیکرز اور ایچ ڈی کوالٹی کے ساتھ' : 'Use live filters, stickers & camera studio'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                soundService.playClick();
                onOpenLiveCamera();
              }}
              className="px-3.5 py-2 bg-white text-rose-600 hover:bg-rose-50 rounded-xl font-black text-xs tap-bounce shadow-md shrink-0 flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{seniorMode ? 'کیمرہ کھولیں' : 'Open Camera'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Section 2: Verified Community & Partner Tasks */}
      <div className="p-3 pt-1 space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-black text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-amber-600" />
            <span>Community & Partner Quests</span>
          </h2>
          <span className="text-xs text-slate-500 font-bold">
            {tasks.filter((t) => t.completed).length}/{tasks.length} Completed
          </span>
        </div>

        <div className="space-y-2">
          {tasks.map((task) => {
            return (
              <div
                key={task.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  task.completed
                    ? 'bg-slate-100/70 border-slate-200 opacity-80'
                    : 'bg-white border-slate-200/90 hover:border-amber-300 shadow-2xs'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-md border border-amber-200">
                      {task.category || 'Community'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      Est: {task.estTime || '2 mins'}
                    </span>
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate mt-1">
                    {task.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {task.requirements}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-xs font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                    +{task.points} Pts
                  </span>

                  {task.completed ? (
                    <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        soundService.playClick();
                        selection();
                        setActiveTaskModal(task);
                      }}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs tap-bounce shadow-xs"
                    >
                      Start Task
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* Task Completion Workflow Modal */}
      {activeTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-100 animate-scaleUp">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                {activeTaskModal.category || 'Task Verification'}
              </span>
              <button
                onClick={() => setActiveTaskModal(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-base text-slate-900">{activeTaskModal.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{activeTaskModal.requirements}</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 space-y-1">
              <div className="font-extrabold flex items-center justify-between">
                <span>Task Reward:</span>
                <span className="text-amber-700 font-black">+{activeTaskModal.points} JoyPoints</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Follow all educational guidelines honestly. No third-party downloads required.
              </p>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setActiveTaskModal(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs tap-bounce"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCommunityTask}
                disabled={taskInProgress}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs tap-bounce shadow-md flex items-center justify-center gap-1.5"
              >
                {taskInProgress ? 'Verifying...' : 'Complete & Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
