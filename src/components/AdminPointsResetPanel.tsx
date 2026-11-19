import React, { useState, useEffect } from 'react';
import { ShieldAlert, RotateCcw, CheckCircle2, Database } from 'lucide-react';
import {
  POINTS_RESET_MIGRATION_ID,
  PointsResetMigrationStatus,
  getCloudPointsResetMigrationStatus,
  executeOwnerPointsResetMigration,
  rollbackOwnerPointsResetMigration,
} from '../services/pointsResetMigrationService';

interface AdminPointsResetPanelProps {
  ownerEmail: string | null | undefined;
}

export const AdminPointsResetPanel: React.FC<AdminPointsResetPanelProps> = ({ ownerEmail }) => {
  const [status, setStatus] = useState<PointsResetMigrationStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = async () => {
    const s = await getCloudPointsResetMigrationStatus();
    setStatus(s);
  };

  useEffect(() => {
    void refreshStatus();
  }, []);

  const handleRunMigration = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await executeOwnerPointsResetMigration(ownerEmail);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'Migration failed.');
    } else if (res.alreadyCompleted) {
      setMessage(`Migration ${POINTS_RESET_MIGRATION_ID} was already completed (${res.usersReset} users reset).`);
    } else {
      setMessage(`Completed: backed up ${res.usersBackedUp} users and reset ${res.usersReset} current balances to 0.`);
    }
    await refreshStatus();
  };

  const handleRollback = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await rollbackOwnerPointsResetMigration(ownerEmail);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'Rollback failed.');
    } else {
      setMessage(`Rollback completed: restored ${res.usersRestored} users from backup.`);
    }
    await refreshStatus();
  };

  return (
    <div className="mx-4 mb-6 p-4 rounded-2xl border border-rose-200 bg-rose-50/70 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-rose-600" />
          <h4 className="text-sm font-black text-slate-900">
            One-Time Points Reset Migration ({POINTS_RESET_MIGRATION_ID})
          </h4>
        </div>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-rose-200 text-rose-700">
          {status?.status || 'loading...'}
        </span>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">
        Backs up all existing user balances to <code>/migration_backups/{POINTS_RESET_MIGRATION_ID}</code> before setting every user&apos;s current available points to <strong>0</strong>. Preserves transaction histories, referrals, profiles, and payment records. Runs strictly once.
      </p>

      {status && status.status === 'completed' && (
        <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            Backed up: {status.usersBackedUp} • Reset: {status.usersReset} • Completed: {status.completedAt ? new Date(status.completedAt).toLocaleString() : 'Yes'}
          </span>
        </div>
      )}

      {message && (
        <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
          {message}
        </div>
      )}

      {error && (
        <div className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl p-2.5 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || status?.status === 'completed'}
          onClick={handleRunMigration}
          className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-extrabold transition-colors"
        >
          {busy ? 'Running...' : status?.status === 'completed' ? 'Migration Already Completed' : 'Backup & Reset All Users to 0'}
        </button>

        <button
          type="button"
          disabled={busy || status?.status !== 'completed'}
          onClick={handleRollback}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 border border-slate-300 text-xs font-extrabold transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Rollback From Backup</span>
        </button>
      </div>
    </div>
  );
};
