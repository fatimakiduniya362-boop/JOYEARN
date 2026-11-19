import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Smartphone,
  LogOut,
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import {
  SecurityCenterSnapshot,
  loadAccountSecuritySnapshot,
  revokeOtherSession,
  revokeAllOtherSessions,
  filterActiveOtherSessions,
} from '../services/accountSecurityService';
import { soundService } from '../services/soundService';
import { hapticService } from '../services/haptics';

interface AccountSecurityPanelProps {
  userUid: string;
  isUrdu?: boolean;
}

function formatShortTime(iso: string | null | undefined): string {
  if (!iso) return 'Not available yet';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return 'Not available yet';
  return dt.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const AccountSecurityPanel: React.FC<AccountSecurityPanelProps> = ({
  userUid,
  isUrdu = false,
}) => {
  const [snapshot, setSnapshot] = useState<SecurityCenterSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);
  const [busyAll, setBusyAll] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await loadAccountSecuritySnapshot(userUid);
    setSnapshot(data);
    setLoading(false);
  }, [userUid]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleRevokeOne = async (sessionId: string) => {
    soundService.playClick();
    hapticService.selection();
    setStatusMsg(null);
    setBusySessionId(sessionId);
    const res = await revokeOtherSession(userUid, sessionId);
    setBusySessionId(null);
    if (res.success) {
      setStatusMsg({ type: 'ok', text: 'Selected device session was signed out.' });
      await refresh();
    } else {
      setStatusMsg({ type: 'err', text: res.error || 'Unable to sign out selected device.' });
    }
  };

  const handleRevokeAllOthers = async () => {
    soundService.playClick();
    hapticService.selection();
    setStatusMsg(null);
    setBusyAll(true);
    const res = await revokeAllOtherSessions(userUid);
    setBusyAll(false);
    if (res.success) {
      setStatusMsg({
        type: 'ok',
        text:
          res.revokedCount > 0
            ? `Signed out ${res.revokedCount} other ${res.revokedCount === 1 ? 'device' : 'devices'}. This device stays signed in.`
            : 'No other active devices found.',
      });
      await refresh();
    } else {
      setStatusMsg({ type: 'err', text: res.error || 'Unable to sign out other devices.' });
    }
  };

  const activeSessions = snapshot ? snapshot.sessions.filter((s) => s.status === 'active') : [];
  const otherActiveSessions = snapshot
    ? filterActiveOtherSessions(snapshot.sessions, snapshot.currentSessionId)
    : [];

  return (
    <div className="bg-white border border-rose-200/80 rounded-2xl p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <ShieldCheck className="w-4 h-4 text-rose-500 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-extrabold text-slate-900 truncate">
              {isUrdu ? 'اکاؤنٹ سیکیورٹی سینٹر' : 'Account Security Center'}
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              Last update: {formatShortTime(snapshot?.lastSecurityUpdateAt)}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            soundService.playClick();
            void refresh();
          }}
          disabled={loading}
          aria-label="Refresh security sessions"
          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Action feedback */}
      {statusMsg && (
        <div
          className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 border ${
            statusMsg.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMsg.type === 'ok' ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Offline / Error state */}
      {!loading && snapshot && snapshot.status !== 'loaded' && (
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{snapshot.errorMessage}</span>
        </div>
      )}

      {/* Active Sessions List */}
      {!loading && snapshot?.status === 'loaded' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
              Active Sessions ({activeSessions.length})
            </span>
            {otherActiveSessions.length > 0 && (
              <button
                type="button"
                disabled={busyAll}
                onClick={handleRevokeAllOthers}
                className="text-[10px] font-extrabold text-rose-600 hover:text-rose-700 disabled:opacity-50"
              >
                {busyAll ? 'Signing out...' : 'Sign out all other devices'}
              </button>
            )}
          </div>

          {activeSessions.length === 0 ? (
            <p className="text-[11px] text-slate-500 bg-slate-50 rounded-xl p-2.5 border border-slate-100">
              No active session records found yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              {activeSessions.map((sess) => {
                const isCurrent = sess.sessionId === snapshot.currentSessionId;
                return (
                  <div
                    key={sess.sessionId}
                    className={`rounded-xl p-2.5 border flex items-center justify-between gap-2 ${
                      isCurrent
                        ? 'bg-rose-50/60 border-rose-200'
                        : 'bg-slate-50 border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Smartphone className="w-4 h-4 text-rose-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 truncate">
                          <span className="truncate">
                            {sess.deviceLabel} · {sess.browserLabel}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-rose-500 text-white shrink-0">
                              This device
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          Active {formatShortTime(sess.lastActiveAt)} · {sess.timezone}
                        </div>
                      </div>
                    </div>

                    {!isCurrent && (
                      <button
                        type="button"
                        disabled={busySessionId === sess.sessionId}
                        onClick={() => handleRevokeOne(sess.sessionId)}
                        className="px-2 py-1 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-[10px] font-bold flex items-center gap-1 shrink-0 disabled:opacity-50"
                      >
                        <LogOut className="w-3 h-3" />
                        <span>{busySessionId === sess.sessionId ? '...' : 'Sign out'}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent Login & Security Activity */}
          {snapshot.recentEvents.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1">
                <Clock className="w-3 h-3 text-rose-500" />
                Recent Login & Security Activity
              </span>
              <div className="space-y-1">
                {snapshot.recentEvents.slice(0, 5).map((evt) => (
                  <div
                    key={evt.eventId}
                    className="flex items-center justify-between gap-2 text-[10px] py-1 px-2 rounded-lg bg-slate-50/80"
                  >
                    <span className="font-semibold text-slate-700 truncate">{evt.summary}</span>
                    <span className="text-slate-400 shrink-0">{formatShortTime(evt.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compact Security Recommendations */}
      <div className="pt-2 border-t border-slate-100 space-y-1.5">
        <button
          type="button"
          onClick={() => setShowRecommendations((v) => !v)}
          className="w-full flex items-center justify-between text-[11px] font-bold text-slate-700 hover:text-rose-600"
        >
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-rose-500" />
            Security recommendations
          </span>
          <span className="text-[10px] text-rose-600 font-bold">
            {showRecommendations ? 'Hide' : 'View'}
          </span>
        </button>

        {showRecommendations && (
          <ul className="text-[10px] text-slate-600 space-y-1 pl-4 list-disc leading-relaxed">
            <li>Turn on 2-Step Verification in your Google Account settings for stronger sign-in protection.</li>
            <li>Sign out devices you no longer use from the Active Sessions list above.</li>
            <li>Keep Security &amp; login alerts enabled in Notification Control Center.</li>
          </ul>
        )}

        <p className="text-[9px] text-slate-400 leading-snug">
          Signing out another device immediately ends its active JoyEarn session. Google Account password and OAuth token revocation are managed in your Google Account security settings.
        </p>
      </div>
    </div>
  );
};
