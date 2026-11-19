import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Shield, Moon, Clock, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  NotificationPreferences,
  SystemNotificationPermission,
  getLocalNotificationPreferences,
  loadNotificationPreferences,
  saveNotificationPreferences,
  getSystemNotificationPermission,
  requestSystemNotificationPermission,
} from '../services/notificationPreferencesService';
import { soundService } from '../services/soundService';
import { hapticService } from '../services/haptics';

interface NotificationControlPanelProps {
  userUid?: string;
  isUrdu?: boolean;
}

interface SwitchRowProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}

const SwitchRow: React.FC<SwitchRowProps> = ({
  label,
  description,
  checked,
  disabled = false,
  onChange,
}) => (
  <div className={`flex items-center justify-between gap-3 py-2 ${disabled ? 'opacity-50' : ''}`}>
    <div className="min-w-0 flex-1">
      <div className="text-xs font-bold text-slate-800 leading-snug">{label}</div>
      <div className="text-[10px] text-slate-500 leading-snug">{description}</div>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        soundService.playClick();
        hapticService.selection();
        onChange(!checked);
      }}
      className={`relative inline-flex h-5.5 w-10 shrink-0 rounded-full p-0.5 transition-colors ${
        checked ? 'bg-rose-500' : 'bg-slate-300'
      } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4.5 w-4.5 rounded-full bg-white shadow-xs transform transition-transform ${
          checked ? 'translate-x-4.5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

export const NotificationControlPanel: React.FC<NotificationControlPanelProps> = ({
  userUid,
  isUrdu = false,
}) => {
  const [prefs, setPrefs] = useState<NotificationPreferences>(() =>
    getLocalNotificationPreferences(userUid)
  );
  const [syncStatus, setSyncStatus] = useState<'idle' | 'synced' | 'local'>('idle');
  const [permission, setPermission] = useState<SystemNotificationPermission>('default');
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setPrefs(getLocalNotificationPreferences(userUid));
    loadNotificationPreferences(userUid).then(({ prefs: loaded, syncedWithCloud }) => {
      if (!active) return;
      setPrefs(loaded);
      setSyncStatus(syncedWithCloud ? 'synced' : 'local');
    });
    getSystemNotificationPermission().then((perm) => {
      if (active) setPermission(perm);
    });
    return () => {
      active = false;
    };
  }, [userUid]);

  const updatePref = async (patch: Partial<NotificationPreferences>) => {
    const optimistic = { ...prefs, ...patch };
    setPrefs(optimistic);
    const { prefs: saved, syncedWithCloud } = await saveNotificationPreferences(userUid, patch);
    setPrefs(saved);
    setSyncStatus(syncedWithCloud ? 'synced' : 'local');
  };

  const handleRequestPermission = async () => {
    soundService.playClick();
    setPermissionMessage(null);
    const nextPerm = await requestSystemNotificationPermission();
    setPermission(nextPerm);
    if (nextPerm === 'denied') {
      setPermissionMessage(
        'Notifications are blocked in device or browser settings. Enable them in Android App Settings to receive system alerts.'
      );
    } else if (nextPerm === 'unsupported') {
      setPermissionMessage('System push alerts are not available on this browser; in-app controls still apply.');
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-rose-600">
          {prefs.masterEnabled ? (
            <Bell className="w-3.5 h-3.5 text-rose-500" />
          ) : (
            <BellOff className="w-3.5 h-3.5 text-slate-400" />
          )}
          {isUrdu ? 'اطلاعات کا کنٹرول سینٹر' : 'Notification Control Center'}
        </span>
        {syncStatus !== 'idle' && (
          <span className="text-[10px] font-semibold text-slate-400">
            {syncStatus === 'synced' ? 'Synced to account' : 'Saved on device'}
          </span>
        )}
      </div>

      {/* System / Android Permission Status */}
      <div className="bg-white border border-rose-200/80 rounded-2xl p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              {permission === 'granted' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              )}
              <span>Device Notification Permission</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {permission === 'granted'
                ? 'Allowed on this device. Your category and quiet-hour rules are active.'
                : permission === 'denied'
                  ? 'Blocked by device/browser settings. JoyEarn will respect this setting.'
                  : permission === 'unsupported'
                    ? 'System notifications unavailable here; in-app notification filters apply.'
                    : 'Not enabled yet. Tap Allow to receive system alerts.'}
            </p>
          </div>
          {permission !== 'granted' && permission !== 'unsupported' && (
            <button
              type="button"
              onClick={handleRequestPermission}
              className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-bold shrink-0 tap-bounce"
            >
              Allow
            </button>
          )}
        </div>
        {permissionMessage && (
          <p className="text-[10px] text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-2.5 py-1.5">
            {permissionMessage}
          </p>
        )}
      </div>

      {/* Essential Security & Login Alerts (Separate from Optional Notifications) */}
      <div className="bg-rose-50/50 border border-rose-200/80 rounded-2xl p-3">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-rose-700 mb-1">
          <Shield className="w-3.5 h-3.5" />
          <span>Essential Security Alerts</span>
        </div>
        <SwitchRow
          label="Security & login alerts"
          description="Account sign-in and security notices. Managed separately from optional notifications and quiet hours."
          checked={prefs.securityAndLoginAlerts}
          onChange={(val) => updatePref({ securityAndLoginAlerts: val })}
        />
      </div>

      {/* Optional Notification Categories */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 divide-y divide-slate-100">
        <SwitchRow
          label={isUrdu ? 'اختیاری اطلاعات (Optional Notifications)' : 'Optional notifications'}
          description="Turn all optional learning, task, and update alerts on or off."
          checked={prefs.masterEnabled}
          onChange={(val) => updatePref({ masterEnabled: val })}
        />

        <SwitchRow
          label="New learning content"
          description="Daily quizzes, new lessons, and study reminders."
          checked={prefs.newLearningContent}
          disabled={!prefs.masterEnabled}
          onChange={(val) => updatePref({ newLearningContent: val })}
        />

        <SwitchRow
          label="Available tasks"
          description="Reminders when eligible daily activities are ready."
          checked={prefs.availableTasks}
          disabled={!prefs.masterEnabled}
          onChange={(val) => updatePref({ availableTasks: val })}
        />

        <SwitchRow
          label="Important account updates"
          description="Wallet, payout status, and account activity notices."
          checked={prefs.importantAccountUpdates}
          disabled={!prefs.masterEnabled}
          onChange={(val) => updatePref({ importantAccountUpdates: val })}
        />

        <SwitchRow
          label="App maintenance & service announcements"
          description="Scheduled maintenance windows and important service notices."
          checked={prefs.appMaintenanceAnnouncements}
          disabled={!prefs.masterEnabled}
          onChange={(val) => updatePref({ appMaintenanceAnnouncements: val })}
        />

        <SwitchRow
          label="Promotional notifications"
          description="Optional offers and sponsor announcements (off by default)."
          checked={prefs.promotionalNotifications}
          disabled={!prefs.masterEnabled}
          onChange={(val) => updatePref({ promotionalNotifications: val })}
        />
      </div>

      {/* Schedule, Quiet Hours & Active Learning Focus */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-rose-500" />
            Schedule & Quiet Hours
          </span>
          <span className="text-[10px] font-medium text-slate-400 truncate max-w-[140px]">
            {prefs.timezone}
          </span>
        </div>

        {/* Quiet Hours */}
        <div className="space-y-2 border-t border-slate-100 pt-2">
          <SwitchRow
            label="Quiet hours"
            description="Mute optional notifications during rest or sleep hours."
            checked={prefs.quietHoursEnabled}
            disabled={!prefs.masterEnabled}
            onChange={(val) => updatePref({ quietHoursEnabled: val })}
          />
          {prefs.quietHoursEnabled && prefs.masterEnabled && (
            <div className="grid grid-cols-2 gap-2 pl-1">
              <label className="flex flex-col gap-1 text-[10px] font-bold text-slate-600">
                <span className="flex items-center gap-1">
                  <Moon className="w-3 h-3 text-rose-500" /> From
                </span>
                <input
                  type="time"
                  value={prefs.quietStart}
                  onChange={(e) => updatePref({ quietStart: e.target.value })}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              </label>
              <label className="flex flex-col gap-1 text-[10px] font-bold text-slate-600">
                <span>Until</span>
                <input
                  type="time"
                  value={prefs.quietEnd}
                  onChange={(e) => updatePref({ quietEnd: e.target.value })}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              </label>
            </div>
          )}
        </div>

        {/* Preferred Notification Hours */}
        <div className="space-y-2 border-t border-slate-100 pt-2">
          <SwitchRow
            label="Preferred notification hours"
            description="Only deliver optional notifications within your chosen window."
            checked={prefs.preferredHoursEnabled}
            disabled={!prefs.masterEnabled}
            onChange={(val) => updatePref({ preferredHoursEnabled: val })}
          />
          {prefs.preferredHoursEnabled && prefs.masterEnabled && (
            <div className="grid grid-cols-2 gap-2 pl-1">
              <label className="flex flex-col gap-1 text-[10px] font-bold text-slate-600">
                <span>Start</span>
                <input
                  type="time"
                  value={prefs.preferredStart}
                  onChange={(e) => updatePref({ preferredStart: e.target.value })}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              </label>
              <label className="flex flex-col gap-1 text-[10px] font-bold text-slate-600">
                <span>End</span>
                <input
                  type="time"
                  value={prefs.preferredEnd}
                  onChange={(e) => updatePref({ preferredEnd: e.target.value })}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              </label>
            </div>
          )}
        </div>

        {/* Active Learning Protection */}
        <div className="border-t border-slate-100 pt-1">
          <SwitchRow
            label="Pause during active learning"
            description="Do not interrupt quizzes or lessons with optional notifications."
            checked={prefs.doNotInterruptLearning}
            disabled={!prefs.masterEnabled}
            onChange={(val) => updatePref({ doNotInterruptLearning: val })}
          />
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-0.5">
            <BookOpen className="w-3 h-3 shrink-0" />
            <span>Duplicate and repeated alerts are automatically suppressed.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
