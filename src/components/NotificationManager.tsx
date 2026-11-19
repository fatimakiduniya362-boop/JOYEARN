import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BellRing,
  Gift,
  CheckCircle2,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { NotificationControlPanel } from './NotificationControlPanel';
import { loadReminderPrefs } from '../services/engagementService';
import {
  NotificationCategory,
  NotificationPreferences,
  getLocalNotificationPreferences,
  loadNotificationPreferences,
  subscribeNotificationPreferences,
  evaluateNotificationDelivery,
  recordDeliveredNotification,
} from '../services/notificationPreferencesService';
import { getLocalDateKey } from '../services/learningStreakService';

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
  onUnreadCountChange?: (count: number) => void;
  streakDays?: number;
  userUid?: string;
  isLearningSessionActive?: boolean;
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
  onUnreadCountChange,
  streakDays = 0,
  userUid,
  isLearningSessionActive = false,
}) => {
  // Real Notification Control Center preferences (synced with Firestore per account)
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(() =>
    getLocalNotificationPreferences(userUid)
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
    () => getLocalNotificationPreferences(userUid).masterEnabled
  );
  const [enableSound, setEnableSound] = useState<boolean>(() => {
    try {
      return localStorage.getItem('joyearn_notif_sound') !== 'false';
    } catch {
      return true;
    }
  });
  const [dailyReminderEnabled] = useState<boolean>(
    () => loadReminderPrefs().dailyReminderEnabled
  );
  const [dailyReminderTime] = useState<string>(
    () => loadReminderPrefs().dailyReminderTime
  );
  const [streakRiskReminderEnabled] = useState<boolean>(
    () => loadReminderPrefs().streakRiskReminderEnabled
  );

  // Load & subscribe to per-account notification preferences from Firestore/local
  useEffect(() => {
    let active = true;
    loadNotificationPreferences(userUid).then(({ prefs }) => {
      if (!active) return;
      setNotifPrefs(prefs);
      setNotificationsEnabled(prefs.masterEnabled);
    });
    const unsubscribe = subscribeNotificationPreferences((updated) => {
      setNotifPrefs(updated);
      setNotificationsEnabled(updated.masterEnabled);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [userUid]);

  // Active in-app banner toast & persisted notification history
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);
  const [history, setHistory] = useState<NotificationItem[]>(() => {
    try {
      const raw = localStorage.getItem('joyearn_notif_history');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [
      {
        id: 'n-init-1',
        title: 'Welcome to JoyEarn!',
        body: 'Your daily streak is waiting. Open your chest to claim free rewards.',
        actionType: 'chest',
        timestamp: 'Just now',
        read: false,
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('joyearn_notif_history', JSON.stringify(history));
    } catch {}
  }, [history]);

  // Sync live unread notification count with header Bell icon
  useEffect(() => {
    if (!notificationsEnabled) {
      onUnreadCountChange?.(0);
      return;
    }
    const unreadHistoryCount = history.filter((item) => !item.read).length;
    onUnreadCountChange?.(unreadHistoryCount);
  }, [history, notificationsEnabled, onUnreadCountChange]);

  // Background minimized detector
  const backgroundTimerRef = useRef<any>(null);
  const originalTitleRef = useRef<string>(typeof document !== 'undefined' ? document.title : 'JoyEarn');

  // Trigger a notification only if allowed by user's Notification Control Center rules
  const triggerNotification = useCallback(
    (
      title: string,
      body: string,
      actionType: 'chest' | 'tasks' | 'learn',
      options?: {
        category?: NotificationCategory;
        dedupeKey?: string;
        bypassRateLimit?: boolean;
      }
    ) => {
      const category: NotificationCategory =
        options?.category ||
        (actionType === 'learn' ? 'learning' : 'tasks');

      const dedupeKey =
        options?.dedupeKey || `${category}:${actionType}:${title.slice(0, 60)}`;

      const decision = evaluateNotificationDelivery({
        prefs: notifPrefs,
        category,
        dedupeKey,
        isLearningSessionActive,
        bypassRateLimit: options?.bypassRateLimit,
      });

      if (!decision.allowed) return;

      recordDeliveredNotification(category, dedupeKey);

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

      // If document is hidden, update title
      if (document.hidden) {
        document.title = `(1) ${title} - JoyEarn`;
      }

      // Respect real Android / Web notification permission (never send system popup if denied)
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          const n = new Notification(title, {
            body,
            tag: dedupeKey,
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
        } catch {
          // Native notifications might be restricted in some iframes
        }
      }
    },
    [notifPrefs, isLearningSessionActive, enableSound, onOpenChest, onOpenTasks, onOpenLearn]
  );

  // Optional 1/day chosen-time reminder (local timezone, respects quiet/preferred hours & dedupe)
  useEffect(() => {
    if (!notifPrefs.masterEnabled) return;
    const checkReminders = () => {
      const now = new Date();
      const todayKey = getLocalDateKey(now);
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // 1) Optional single daily learning reminder at user's chosen local time
      if (dailyReminderEnabled && notifPrefs.newLearningContent && currentHHMM >= dailyReminderTime) {
        triggerNotification(
          'Daily Learning Reminder',
          'Your daily theme and quiz are ready whenever you have a moment.',
          'learn',
          { category: 'learning', dedupeKey: `daily_learning_${todayKey}` }
        );
      }

      // 2) Optional evening streak reminder (after 19:00 local time, max 1/day)
      if (
        streakRiskReminderEnabled &&
        notifPrefs.newLearningContent &&
        streakDays > 0 &&
        !claimedChestToday &&
        now.getHours() >= 19
      ) {
        triggerNotification(
          'Keep Your Learning Streak Going',
          `Complete a quick lesson or quiz to maintain your ${streakDays}-day streak.`,
          'learn',
          { category: 'learning', dedupeKey: `streak_evening_${todayKey}` }
        );
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [
    notifPrefs,
    dailyReminderEnabled,
    dailyReminderTime,
    streakRiskReminderEnabled,
    streakDays,
    claimedChestToday,
    triggerNotification,
  ]);

  // Restore document title when user returns to the app (no spammy background timers)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
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
  }, []);

  // Auto-dismiss in-app toast after 6 seconds
  useEffect(() => {
    if (activeToast) {
      const dismissTimer = setTimeout(() => {
        setActiveToast(null);
      }, 6000);
      return () => clearTimeout(dismissTimer);
    }
  }, [activeToast]);

  const navigateByAction = (type: 'chest' | 'tasks' | 'learn') => {
    onClose();
    if (type === 'chest') onOpenChest();
    if (type === 'tasks') onOpenTasks();
    if (type === 'learn') onOpenLearn();
  };

  const handleToastClick = () => {
    if (!activeToast) return;
    const item = activeToast;
    setHistory((prev) => prev.map((h) => (h.id === item.id ? { ...h, read: true } : h)));
    setActiveToast(null);
    navigateByAction(item.actionType);
  };

  const handleAlertRowClick = (item: NotificationItem) => {
    setHistory((prev) => prev.map((h) => (h.id === item.id ? { ...h, read: true } : h)));
    navigateByAction(item.actionType);
  };

  const handleMarkAllRead = () => {
    setHistory((prev) => prev.map((h) => ({ ...h, read: true })));
  };

  return (
    <>

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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3"
          onClick={onClose}
        >
          <div
            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-rose-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 p-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <BellRing className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className={`font-bold flex items-center gap-1.5 ${seniorMode ? 'text-xl' : 'text-lg'}`}>
                    {seniorMode ? 'اطلاعات اور یاد دہانی' : 'Notifications & Controls'}
                  </h2>
                  <p className="text-xs text-rose-100">
                    {seniorMode ? 'اپنی اطلاعات اور پرسکون اوقات کا انتظام کریں' : 'Manage categories, quiet hours & alerts'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="min-w-[40px] min-h-[40px] rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold transition-colors"
                aria-label="Close notifications"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Live Actionable Reminders (Active Tasks & Chest) */}
              {(!claimedChestToday || uncompletedTasksCount > 0) && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 block">
                    {seniorMode ? 'آج کے فعال کام' : 'Active Today'}
                  </span>
                  {!claimedChestToday && (
                    <button
                      type="button"
                      onClick={() => navigateByAction('chest')}
                      className="w-full text-left bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100/80 dark:hover:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-3 flex items-center gap-3 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Gift className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {seniorMode ? 'روزانہ خزانہ تیار ہے' : 'Daily Streak Chest Unclaimed'}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300">
                          Tap to claim today&apos;s streak bonus points
                        </p>
                      </div>
                    </button>
                  )}
                  {uncompletedTasksCount > 0 && (
                    <button
                      type="button"
                      onClick={() => navigateByAction('tasks')}
                      className="w-full text-left bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100/80 dark:hover:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl p-3 flex items-center gap-3 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                          {uncompletedTasksCount} {seniorMode ? 'ٹاسک باقی ہیں' : 'Daily Tasks Remaining'}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300">
                          Tap to view and earn JoyPoints
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              )}

              {/* Unified Smart Notification Control Center (synced with Settings & Firestore) */}
              <NotificationControlPanel userUid={userUid} isUrdu={seniorMode} />

              {/* Gentle In-App Chime Sound */}
              <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl p-3">
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      {enableSound ? <Volume2 className="w-3.5 h-3.5 text-rose-500" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                      <span>Gentle Chime Sound</span>
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Play a soft chime with allowed in-app alerts</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableSound}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setEnableSound(val);
                      try { localStorage.setItem('joyearn_notif_sound', String(val)); } catch {}
                    }}
                    className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                  />
                </label>
              </div>

              {/* Notification History Log */}
              <div>
                <h4 className="font-bold text-xs text-gray-800 dark:text-slate-200 mb-2 flex items-center justify-between">
                  <span>Recent Alerts ({history.length})</span>
                  <div className="flex items-center gap-3">
                    {history.some((h) => !h.read) && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                      >
                        Mark all read
                      </button>
                    )}
                    {history.length > 0 && (
                      <button
                        onClick={() => setHistory([])}
                        className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 underline"
                      >
                        Clear History
                      </button>
                    )}
                  </div>
                </h4>
                <div className="space-y-2">
                  {history.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700">
                      All caught up! No recent alerts.
                    </div>
                  ) : (
                    history.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleAlertRowClick(item)}
                        className={`w-full text-left p-2.5 rounded-xl border flex items-start gap-2.5 text-xs transition-colors ${
                          item.read
                            ? 'bg-gray-50 dark:bg-slate-800/40 border-gray-200 dark:border-slate-700/70 opacity-80'
                            : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
                        }`}
                      >
                        <span className="text-base mt-0.5">
                          {item.actionType === 'chest' ? '🎁' : item.actionType === 'tasks' ? '📝' : '🧠'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center gap-2">
                            <span className="font-bold text-gray-900 dark:text-white truncate">{item.title}</span>
                            <span className="text-[10px] text-gray-400 shrink-0">{item.timestamp}</span>
                          </div>
                          <p className="text-[11px] text-gray-600 dark:text-slate-300 mt-0.5">{item.body}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
