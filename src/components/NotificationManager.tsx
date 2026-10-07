import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bell,
  BellRing,
  Clock,
  Gift,
  CheckCircle2,
  AlertCircle,
  X,
  Volume2,
  VolumeX,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { DailyQuizNotification } from './DailyQuizNotification';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  actionType: 'chest' | 'tasks' | 'learn';
  timestamp: string;
  read: boolean;
}

interface NotificationManagerProps {
  claimedChestToday: boolean;
  uncompletedTasksCount: number;
  onOpenChest: () => void;
  onOpenTasks: () => void;
  onOpenLearn: () => void;
  seniorMode: boolean;
  isOpen: boolean;
  onClose: () => void;
}

// Play gentle web audio synth chime
function playChimeSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (err) {
    // Audio context might be restricted before interaction
  }
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({
  claimedChestToday,
  uncompletedTasksCount,
  onOpenChest,
  onOpenTasks,
  onOpenLearn,
  seniorMode,
  isOpen,
  onClose,
}) => {
  // Notification permission state
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  // Settings
  const [enableChestReminder, setEnableChestReminder] = useState(true);
  const [enableTaskReminder, setEnableTaskReminder] = useState(true);
  const [enableSound, setEnableSound] = useState(true);
  const [reminderIntervalMinutes, setReminderIntervalMinutes] = useState(30);
  const [dailyReminderTime, setDailyReminderTime] = useState<string>(() => {
    try {
      return localStorage.getItem('joyearn_daily_reminder_time') || '09:00';
    } catch {
      return '09:00';
    }
  });

  // Active in-app banner toast
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);
  const [history, setHistory] = useState<NotificationItem[]>([
    {
      id: 'n-init-1',
      title: 'Welcome to JoyEarn!',
      body: 'Your daily streak is waiting. Open your chest to claim free rewards.',
      actionType: 'chest',
      timestamp: 'Just now',
      read: false,
    },
  ]);

  // Background minimized detector
  const backgroundTimerRef = useRef<any>(null);
  const originalTitleRef = useRef<string>(typeof document !== 'undefined' ? document.title : 'JoyEarn');

  // Trigger a reminder
  const triggerNotification = useCallback(
    (title: string, body: string, actionType: 'chest' | 'tasks' | 'learn') => {
      const newItem: NotificationItem = {
        id: `notif-${Date.now()}`,
        title,
        body,
        actionType,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false,
      };

      setHistory((prev) => [newItem, ...prev.slice(0, 19)]);
      setActiveToast(newItem);

      // Play soft chime if sound enabled
      if (enableSound) {
        playChimeSound();
      }

      // If document is hidden, change title to flash alert
      if (document.hidden) {
        document.title = `(1) 🔔 ${title} - JoyEarn`;
      }

      // Try native Web Notification if supported & granted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const n = new Notification(title, {
            body,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🎁</text></svg>',
            badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⭐</text></svg>',
          });
          n.onclick = () => {
            window.focus();
            if (actionType === 'chest') onOpenChest();
            if (actionType === 'tasks') onOpenTasks();
            if (actionType === 'learn') onOpenLearn();
            n.close();
          };
        } catch (e) {
          // Native notifications might be restricted in some iframes
        }
      }
    },
    [enableSound, onOpenChest, onOpenTasks, onOpenLearn]
  );

  // Request browser permission
  const handleRequestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Browser notifications are not supported in this browser environment. In-app banner alerts will be used.');
      return;
    }

    try {
      const res = await Notification.requestPermission();
      setBrowserPermission(res);
      if (res === 'granted') {
        triggerNotification('Notifications Enabled! 🎉', 'You will receive reminders when new tasks or daily chests arrive.', 'chest');
      }
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
    }
  };

  // Monitor visibility change (User minimizes app or switches tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App is minimized or tab is switched
        // Schedule reminder after 4 seconds of inactivity if chest is unclaimed or tasks pending
        backgroundTimerRef.current = setTimeout(() => {
          if (!claimedChestToday && enableChestReminder) {
            triggerNotification(
              '🎁 Daily Chest Unopened!',
              'Your daily streak reward is waiting! Tap to claim your points and garden seed.',
              'chest'
            );
          } else if (uncompletedTasksCount > 0 && enableTaskReminder) {
            triggerNotification(
              '📝 Approved Tasks Waiting!',
              `You have ${uncompletedTasksCount} eligible tasks ready to earn points.`,
              'tasks'
            );
          }
        }, 4000);
      } else {
        // User came back to the app
        if (backgroundTimerRef.current) {
          clearTimeout(backgroundTimerRef.current);
        }
        document.title = originalTitleRef.current;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (backgroundTimerRef.current) clearTimeout(backgroundTimerRef.current);
    };
  }, [claimedChestToday, uncompletedTasksCount, enableChestReminder, enableTaskReminder, triggerNotification]);

  // Periodic reminder simulation timer (e.g. checks every reminderIntervalMinutes)
  useEffect(() => {
    const intervalMs = Math.max(15000, reminderIntervalMinutes * 60 * 1000);
    const timer = setInterval(() => {
      if (!claimedChestToday && enableChestReminder) {
        triggerNotification(
          '⭐ Friendly Reminder: Daily Chest',
          'Keep your streak active! Claim your daily reward chest before the day ends.',
          'chest'
        );
      } else if (uncompletedTasksCount > 0 && enableTaskReminder) {
        triggerNotification(
          '🎯 Earn Extra JoyPoints Today!',
          `Complete available educational activities to unlock new perks and badges.`,
          'tasks'
        );
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [claimedChestToday, uncompletedTasksCount, enableChestReminder, enableTaskReminder, reminderIntervalMinutes, triggerNotification]);

  // Auto-dismiss in-app toast after 6 seconds
  useEffect(() => {
    if (activeToast) {
      const dismissTimer = setTimeout(() => {
        setActiveToast(null);
      }, 6000);
      return () => clearTimeout(dismissTimer);
    }
  }, [activeToast]);

  const handleToastClick = () => {
    if (!activeToast) return;
    const type = activeToast.actionType;
    setActiveToast(null);
    if (type === 'chest') onOpenChest();
    if (type === 'tasks') onOpenTasks();
    if (type === 'learn') onOpenLearn();
  };

  return (
    <>
      {/* Background Midnight 12:00 AM Quiz Notification Scheduler (Always Active) */}
      <div className="hidden" aria-hidden="true">
        <DailyQuizNotification
          onOpenQuiz={onOpenLearn}
          seniorMode={seniorMode}
          onTriggerNotification={triggerNotification}
        />
      </div>

      {/* FLOATING IN-APP TOAST BANNER OVERLAY */}
      {activeToast && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-[9999] animate-bounce-subtle">
          <div className="bg-slate-900/95 text-white rounded-2xl p-3.5 shadow-2xl border-2 border-amber-400 backdrop-blur-md flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl shrink-0 shadow-md">
              {activeToast.actionType === 'chest' ? '🎁' : activeToast.actionType === 'tasks' ? '📝' : '🧠'}
            </div>
            <div className="flex-1 min-w-0" onClick={handleToastClick} role="button">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs text-amber-300 truncate">
                  {activeToast.title}
                </h4>
                <span className="text-[10px] text-gray-400 ml-1">{activeToast.timestamp}</span>
              </div>
              <p className="text-[11px] text-gray-200 line-clamp-2 mt-0.5 leading-snug">
                {activeToast.body}
              </p>
              <div className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300">
                <span>Tap to Open</span> →
              </div>
            </div>
            <button
              onClick={() => setActiveToast(null)}
              className="text-gray-400 hover:text-white p-1 rounded-full tap-bounce"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* NOTIFICATION SETTINGS & LOG MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border-4 border-amber-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl">
                  🔔
                </div>
                <div>
                  <h2 className={`font-bold flex items-center gap-1.5 ${seniorMode ? 'text-2xl' : 'text-lg'}`}>
                    Reminders & Alerts
                  </h2>
                  <p className="text-xs text-amber-100">Never miss your daily rewards & new tasks</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Browser Permission Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                    <Smartphone className="w-4 h-4 text-amber-700" />
                    <span>Browser Notification Permission</span>
                  </div>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                      browserPermission === 'granted'
                        ? 'bg-emerald-100 text-emerald-800'
                        : browserPermission === 'denied'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {browserPermission}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  {browserPermission === 'granted'
                    ? 'Active! You will receive system notifications even when the app is minimized or backgrounded.'
                    : 'Enable browser permission so JoyEarn can alert you when new tasks or daily streak chests are available.'}
                </p>
                {browserPermission !== 'granted' && (
                  <button
                    onClick={handleRequestPermission}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold tap-bounce shadow-sm"
                  >
                    Enable Browser Notifications
                  </button>
                )}
              </div>

              {/* Dedicated Daily 5-Question Quiz 12:00 AM Push Notification Component */}
              <DailyQuizNotification
                onOpenQuiz={() => {
                  onClose();
                  onOpenLearn();
                }}
                seniorMode={seniorMode}
                onTriggerNotification={triggerNotification}
              />

              {/* Daily Reminder Time Picker */}
              <div className="bg-white border border-gray-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-gray-900 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{seniorMode ? 'روزانہ یاد دہانی کا وقت' : 'Daily Reminder Time'}</span>
                    </span>
                    <p className="text-[11px] text-gray-500">
                      {seniorMode ? 'اپنے پسندیدہ وقت پر روزانہ کوئز اور بونس کی یاد دہانی حاصل کریں' : 'Choose what time you want your daily quiz & streak reminder'}
                    </p>
                  </div>
                  <input
                    type="time"
                    value={dailyReminderTime}
                    onChange={(e) => {
                      setDailyReminderTime(e.target.value);
                      localStorage.setItem('joyearn_daily_reminder_time', e.target.value);
                    }}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Toggles & Options */}
              <div className="bg-white border border-gray-200 rounded-2xl p-3.5 space-y-3">
                <h4 className="font-bold text-xs text-gray-800 uppercase tracking-wider">
                  Reminder Preferences
                </h4>

                {/* Daily Chest Alert */}
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-gray-900 flex items-center gap-1.5">
                      <span>🎁</span> Daily Chest Reminders
                    </span>
                    <p className="text-[11px] text-gray-500">Alert me if my daily streak chest is unclaimed</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableChestReminder}
                    onChange={(e) => setEnableChestReminder(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400"
                  />
                </div>

                {/* New Tasks Alert */}
                <div className="flex items-center justify-between text-xs border-t border-gray-100 pt-2.5">
                  <div>
                    <span className="font-bold text-gray-900 flex items-center gap-1.5">
                      <span>📝</span> New Tasks & Surveys
                    </span>
                    <p className="text-[11px] text-gray-500">Alert me when approved tasks are waiting</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableTaskReminder}
                    onChange={(e) => setEnableTaskReminder(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400"
                  />
                </div>

                {/* Sound Chime */}
                <div className="flex items-center justify-between text-xs border-t border-gray-100 pt-2.5">
                  <div>
                    <span className="font-bold text-gray-900 flex items-center gap-1.5">
                      {enableSound ? <Volume2 className="w-3.5 h-3.5 text-amber-600" /> : <VolumeX className="w-3.5 h-3.5 text-gray-400" />}
                      <span>Gentle Chime Sound</span>
                    </span>
                    <p className="text-[11px] text-gray-500">Play a pleasant sound with in-app reminders</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableSound}
                    onChange={(e) => setEnableSound(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400"
                  />
                </div>
              </div>

              {/* Instant Test Buttons */}
              <div className="bg-gradient-to-r from-pink-50 to-amber-50 border border-pink-200 rounded-2xl p-3.5 space-y-2">
                <span className="font-bold text-xs text-gray-800 block">Test Your Reminders</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      triggerNotification(
                        '🎁 Daily Chest Ready!',
                        'Your Day 4 reward is waiting. Tap to claim points and flowers!',
                        'chest'
                      );
                    }}
                    className="py-2 px-3 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-900 hover:bg-amber-100 tap-bounce shadow-xs"
                  >
                    Test In-App Toast
                  </button>

                  <button
                    onClick={() => {
                      triggerNotification(
                        '📱 Minimized App Alert!',
                        'You switched away, but JoyEarn is keeping your streak safe!',
                        'tasks'
                      );
                    }}
                    className="py-2 px-3 bg-white border border-pink-300 rounded-xl text-xs font-bold text-pink-900 hover:bg-pink-100 tap-bounce shadow-xs"
                  >
                    Test Minimized Alert
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 text-center">
                  Tip: Switch to another browser tab or minimize to see the automatic background reminder trigger.
                </p>
              </div>

              {/* Notification History Log */}
              <div>
                <h4 className="font-bold text-xs text-gray-800 mb-2 flex items-center justify-between">
                  <span>Recent Alerts ({history.length})</span>
                  <button
                    onClick={() => setHistory([])}
                    className="text-[10px] text-gray-400 hover:text-gray-600 underline"
                  >
                    Clear History
                  </button>
                </h4>
                <div className="space-y-2">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 flex items-start gap-2.5 text-xs"
                    >
                      <span className="text-base mt-0.5">
                        {item.actionType === 'chest' ? '🎁' : item.actionType === 'tasks' ? '📝' : '🧠'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-900 truncate">{item.title}</span>
                          <span className="text-[10px] text-gray-400 shrink-0">{item.timestamp}</span>
                        </div>
                        <p className="text-[11px] text-gray-600 mt-0.5">{item.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
