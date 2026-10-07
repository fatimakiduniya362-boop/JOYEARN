import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Clock,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  Moon
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { hapticService } from '../services/haptics';

export interface DailyQuizNotificationProps {
  onOpenQuiz: () => void;
  seniorMode?: boolean;
  onTriggerNotification?: (
    title: string,
    body: string,
    actionType: 'chest' | 'tasks' | 'learn'
  ) => void;
  variant?: 'card' | 'compact' | 'modal-section';
}

/**
 * Calculates remaining milliseconds until next 12:00 AM (midnight local time)
 * (Keep the quiz itself changing at midnight)
 */
export function getMsUntilMidnight(): number {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0); // 12:00:00 AM tomorrow
  return Math.max(0, nextMidnight.getTime() - now.getTime());
}

/**
 * Calculates remaining milliseconds until user's chosen reminder time (default 09:00 AM)
 */
export function getMsUntilReminderTime(reminderTimeStr: string): number {
  const [hours, minutes] = (reminderTimeStr || '09:00').split(':').map((v) => parseInt(v, 10) || 0);
  const now = new Date();
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1); // target is tomorrow
  }
  return Math.max(0, target.getTime() - now.getTime());
}

/**
 * Formats milliseconds into hh:mm:ss string
 */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

/**
 * Formats 24h time string (e.g. "09:00") into 12h display (e.g. "9:00 AM")
 */
export function format12HourTime(timeStr: string): string {
  try {
    const [h, m] = (timeStr || '09:00').split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const padM = m.toString().padStart(2, '0');
    return `${displayH}:${padM} ${period}`;
  } catch {
    return timeStr || '9:00 AM';
  }
}

export const DailyQuizNotification: React.FC<DailyQuizNotificationProps> = ({
  onOpenQuiz,
  seniorMode = false,
  onTriggerNotification,
  variant = 'card',
}) => {
  // On/Off toggle preference
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('joyearn_daily_quiz_notif_enabled') !== 'false';
    } catch {
      return true;
    }
  });

  // User-chosen reminder time (default 9:00 AM, not midnight)
  const [reminderTime, setReminderTime] = useState<string>(() => {
    try {
      return localStorage.getItem('joyearn_daily_quiz_reminder_time') || '09:00';
    } catch {
      return '09:00';
    }
  });

  const [msUntilReminder, setMsUntilReminder] = useState<number>(() => getMsUntilReminderTime(reminderTime));
  const [msUntilMidnight, setMsUntilMidnight] = useState<number>(() => getMsUntilMidnight());
  const [testSent, setTestSent] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  // Handle user changing reminder time
  const handleTimeChange = (newTime: string) => {
    setReminderTime(newTime);
    try {
      localStorage.setItem('joyearn_daily_quiz_reminder_time', newTime);
      localStorage.setItem('joyearn_daily_reminder_time', newTime);
    } catch {}
    setMsUntilReminder(getMsUntilReminderTime(newTime));
  };

  // Toggle notification preference
  const handleToggle = () => {
    soundService.playClick();
    hapticService.selection();
    const next = !isEnabled;
    setIsEnabled(next);
    try {
      localStorage.setItem('joyearn_daily_quiz_notif_enabled', String(next));
    } catch {}
  };

  // Request browser push permission if needed
  const handleRequestPermission = async () => {
    soundService.playClick();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        setPermissionState(res);
      } catch (e) {
        console.warn('Could not request notification permission:', e);
      }
    }
  };

  // Trigger push notification logic
  const fireQuizReminderNotification = useCallback((isTest = false) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const formattedTime = format12HourTime(reminderTime);
    const title = seniorMode
      ? `🔔 روزانہ کوئز کا وقت (${formattedTime}): نیا 5 سوالات کا کوئز تیار ہے! 🧠`
      : `🔔 Daily Quiz Reminder (${formattedTime}): Fresh 5 Questions Ready! 🧠`;
    const body = seniorMode
      ? 'آج کے 5 نئے سوالات کا جواب دیں، اپنا اسٹریک برقرار رکھیں اور جوائے پوائنٹس کمائیں!'
      : "Your daily 5-question quiz is waiting! Answer today's questions to protect your streak & earn JoyPoints.";

    // Audio chime & haptic
    soundService.playDailyGoalCheer();
    hapticService.success();

    // Trigger in-app toast / history callback
    if (onTriggerNotification) {
      onTriggerNotification(title, body, 'learn');
    }

    // Native Browser Push Notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🧠</text></svg>',
          badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⭐</text></svg>',
          tag: 'joyearn-daily-quiz-reminder',
        });
        notif.onclick = () => {
          window.focus();
          onOpenQuiz();
          notif.close();
        };
      } catch (err) {
        console.warn('Local push notification error:', err);
      }
    }

    if (!isTest) {
      try {
        localStorage.setItem('joyearn_last_quiz_reminder_notified', todayStr);
      } catch {}
    }
  }, [reminderTime, seniorMode, onTriggerNotification, onOpenQuiz]);

  // Test notification manually
  const handleTestNotification = () => {
    soundService.playClick();
    fireQuizReminderNotification(true);
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  // Timer countdown updater & scheduled reminder trigger
  useEffect(() => {
    const interval = setInterval(() => {
      const remainingReminder = getMsUntilReminderTime(reminderTime);
      setMsUntilReminder(remainingReminder);
      setMsUntilMidnight(getMsUntilMidnight());

      // Check if current hour and minute match reminderTime
      const [targetH, targetM] = (reminderTime || '09:00').split(':').map((v) => parseInt(v, 10) || 0);
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const lastNotified = localStorage.getItem('joyearn_last_quiz_reminder_notified');

      if (
        isEnabled &&
        now.getHours() === targetH &&
        now.getMinutes() === targetM &&
        lastNotified !== todayStr
      ) {
        fireQuizReminderNotification(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isEnabled, reminderTime, fireQuizReminderNotification]);

  return (
    <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border-2 border-indigo-500/60 rounded-3xl p-4 text-white shadow-xl space-y-3.5 relative overflow-hidden">
      {/* Background ambient stars */}
      <div className="absolute top-2 right-3 text-2xl opacity-20 pointer-events-none select-none">
        ✨⏰
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center text-xl shadow-md border border-indigo-400/40">
            ⏰
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-black text-sm text-indigo-100">
                {seniorMode ? 'روزانہ کوئز یاد دہانی' : 'Daily Quiz Reminder'}
              </h4>
              <span className="text-[9px] font-black uppercase px-2 py-0.2 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                Local Push
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-tight mt-0.5">
              {seniorMode
                ? 'اپنے منتخب وقت پر روزانہ 5 سوالات کے کوئز کی یاد دہانی حاصل کریں'
                : 'Choose your preferred reminder time (default 9:00 AM) to complete your 5 questions'}
            </p>
          </div>
        </div>

        {/* Enable / Disable Switch */}
        <button
          type="button"
          onClick={handleToggle}
          className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 tap-bounce ${
            isEnabled ? 'bg-indigo-500' : 'bg-slate-700'
          }`}
          aria-label="Toggle Daily Quiz Push Reminder"
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
              isEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* User-Selectable Reminder Time & Countdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* User-Chosen Reminder Time Picker */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-300 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 block">
                {seniorMode ? 'یاد دہانی کا وقت' : 'Reminder Time'}
              </span>
              <span className="font-black text-xs text-white">
                {format12HourTime(reminderTime)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="px-2 py-1 bg-white/20 border border-white/30 rounded-xl text-xs font-black text-white focus:outline-hidden focus:bg-white/30"
              title="Set Daily Reminder Time"
            />
          </div>
        </div>

        {/* Countdown to Next Alert */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 block">
              {seniorMode ? 'اگلا الرٹ' : 'Next Alert in'}
            </span>
            <span className="font-mono font-black text-xs text-amber-300">
              {formatCountdown(msUntilReminder)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-indigo-200 font-semibold block">
              {seniorMode ? 'حیثیت' : 'Status'}
            </span>
            <span className="text-[11px] font-black text-emerald-400 flex items-center gap-1 justify-end">
              <CheckCircle2 className="w-3 h-3" />
              <span>{isEnabled ? (seniorMode ? 'فعال' : 'Active') : (seniorMode ? 'بند' : 'Paused')}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Midnight Quiz Rotation Notice */}
      <div className="bg-purple-950/40 rounded-2xl px-3 py-2 border border-purple-400/20 flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5 text-purple-200">
          <Moon className="w-3.5 h-3.5 text-purple-300" />
          <span>{seniorMode ? 'کوئز کے سوالات ہر رات ٹھیک 12:00 بجے تبدیل ہوتے ہیں' : 'Quiz questions refresh every midnight (12:00 AM)'}</span>
        </span>
        <span className="font-mono font-bold text-purple-300 text-[10px]">
          {formatCountdown(msUntilMidnight)}
        </span>
      </div>

      {/* Permission Status & Action Buttons */}
      <div className="space-y-2">
        {permissionState !== 'granted' && (
          <div className="p-2 bg-amber-500/20 border border-amber-400/40 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-amber-200 text-[11px]">
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span>{seniorMode ? 'براؤزر پش نوٹیفکیشن کی اجازت دیں' : 'Enable browser push permission for daily reminders'}</span>
            </div>
            <button
              onClick={handleRequestPermission}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-[10px] tap-bounce shadow-xs"
            >
              {seniorMode ? 'اجازت دیں' : 'Allow'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {/* Test Push Notification */}
          <button
            type="button"
            onClick={handleTestNotification}
            className="py-2 px-2.5 bg-indigo-800/80 hover:bg-indigo-700/90 border border-indigo-400/40 text-indigo-100 font-extrabold rounded-xl text-xs tap-bounce flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Bell className="w-3.5 h-3.5 text-amber-300" />
            <span>{testSent ? (seniorMode ? 'بھیج دیا گیا! ✓' : 'Alert Triggered! ✓') : (seniorMode ? 'ٹیسٹ الرٹ آزمائیں' : 'Test Reminder Alert')}</span>
          </button>

          {/* Launch Daily Quiz */}
          <button
            type="button"
            onClick={() => {
              soundService.playClick();
              onOpenQuiz();
            }}
            className="py-2 px-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold rounded-xl text-xs tap-bounce flex items-center justify-center gap-1.5 shadow-md"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{seniorMode ? 'آج کا کوئز کھیلیں' : 'Take Daily Quiz Now'}</span>
          </button>
        </div>
      </div>

      {/* Feature notice badge */}
      <div className="text-[10px] text-slate-400 flex items-center justify-between border-t border-white/10 pt-2">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-indigo-400" />
          <span>Local Device Push • Zero Spam</span>
        </span>
        <span className="font-semibold text-indigo-300">Default 9:00 AM • Custom Time</span>
      </div>
    </div>
  );
};
