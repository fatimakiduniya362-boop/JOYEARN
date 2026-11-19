import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Globe,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import {
  adMobManager,
  AdMobAnalyticsReport,
  AdFormat,
  ADMOB_CONFIG,
} from '../services/adMobService';

const FORMAT_LABELS: Record<AdFormat, string> = {
  banner: 'Banner',
  native: 'Native',
  interstitial: 'Interstitial',
  rewarded: 'Rewarded (In-App Perks Only)',
};

export const AdminAdMobAnalyticsPanel: React.FC = () => {
  const [report, setReport] = useState<AdMobAnalyticsReport>(() =>
    adMobManager.getAnalyticsReport()
  );

  const handleRefresh = () => {
    adMobManager.initializeAdMob();
    setReport(adMobManager.getAnalyticsReport());
  };

  const formats = Object.keys(FORMAT_LABELS) as AdFormat[];
  const totalRequests = formats.reduce((sum, f) => sum + (report.formats[f]?.requests || 0), 0);
  const totalMatched = formats.reduce((sum, f) => sum + (report.formats[f]?.matched || 0), 0);
  const totalImpressions = formats.reduce((sum, f) => sum + (report.formats[f]?.impressions || 0), 0);
  const totalNoFill = formats.reduce((sum, f) => sum + (report.formats[f]?.noFillErrors || 0), 0);
  const totalDailyRevenue = formats.reduce(
    (sum, f) => sum + (report.formats[f]?.reportedRevenueUsd || 0),
    0
  );

  const matchRate = totalRequests > 0 ? ((totalMatched / totalRequests) * 100).toFixed(1) : '0.0';
  const showRate = totalMatched > 0 ? ((totalImpressions / totalMatched) * 100).toFixed(1) : '0.0';
  const ecpm = totalImpressions > 0 ? ((totalDailyRevenue / totalImpressions) * 1000).toFixed(2) : '0.00';

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 space-y-4 text-white">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black">Private AdMob Revenue &amp; Delivery Analytics</h3>
            <p className="text-[11px] text-slate-400">
              Actual local SDK telemetry &amp; real reporting only — zero fabricated figures
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Diagnostic Status Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
          <p className="text-slate-400 font-semibold">SDK Status</p>
          <p className="font-black text-amber-300 mt-0.5 truncate">{report.sdkStatus}</p>
        </div>
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
          <p className="text-slate-400 font-semibold">Ad Unit Mode</p>
          <p className={`font-black mt-0.5 ${report.isUsingTestIds ? 'text-amber-400' : 'text-emerald-400'}`}>
            {report.isUsingTestIds ? 'Google Test IDs' : 'Production IDs'}
          </p>
        </div>
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
          <p className="text-slate-400 font-semibold">Privacy Consent</p>
          <p className="font-black text-sky-300 mt-0.5">{report.consentStatus}</p>
        </div>
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
          <p className="text-slate-400 font-semibold flex items-center gap-1">
            <Globe className="w-3 h-3" /> Region Locale
          </p>
          <p className="font-black text-slate-200 mt-0.5">{report.regionLocale}</p>
        </div>
      </div>

      {/* Warning if Test IDs or No Reporting API */}
      {(report.isUsingTestIds || !report.reportingApiConnected) && (
        <div className="bg-amber-950/50 border border-amber-700/60 rounded-xl p-3 text-xs text-amber-200 space-y-1">
          <p className="font-black flex items-center gap-1.5 text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Action Needed for Real AdMob Production Revenue</span>
          </p>
          {report.isUsingTestIds && (
            <p className="text-[11px]">
              • Currently using official Google Test IDs ({ADMOB_CONFIG.ADMOB_APP_ID}). Set{' '}
              <code className="text-amber-100">VITE_ADMOB_APP_ID</code> and unit IDs in environment
              variables for live Android AdMob builds.
            </p>
          )}
          {!report.reportingApiConnected && (
            <p className="text-[11px]">
              • AdMob Reporting API is not connected; estimated revenue &amp; eCPM remain{' '}
              <strong>$0.00</strong> until connected to Google AdMob Reporting API.
            </p>
          )}
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-center">
          <p className="text-[10px] text-slate-400 font-bold">Requests</p>
          <p className="text-base font-black text-white tabular-nums">{totalRequests}</p>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-center">
          <p className="text-[10px] text-slate-400 font-bold">Matched</p>
          <p className="text-base font-black text-sky-400 tabular-nums">{totalMatched}</p>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-center">
          <p className="text-[10px] text-slate-400 font-bold">Impressions</p>
          <p className="text-base font-black text-emerald-400 tabular-nums">{totalImpressions}</p>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-center">
          <p className="text-[10px] text-slate-400 font-bold">Match Rate</p>
          <p className="text-base font-black text-white tabular-nums">{matchRate}%</p>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-center">
          <p className="text-[10px] text-slate-400 font-bold">Show Rate</p>
          <p className="text-base font-black text-white tabular-nums">{showRate}%</p>
        </div>
      </div>

      {/* Revenue Metrics (Real Reported Only) */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
          <p className="text-[10px] text-slate-400 font-bold">eCPM (Reported)</p>
          <p className="text-sm font-black text-emerald-300 tabular-nums">${ecpm}</p>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
          <p className="text-[10px] text-slate-400 font-bold">Daily Revenue</p>
          <p className="text-sm font-black text-emerald-300 tabular-nums">
            ${totalDailyRevenue.toFixed(2)}
          </p>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
          <p className="text-[10px] text-slate-400 font-bold">Monthly Revenue</p>
          <p className="text-sm font-black text-emerald-300 tabular-nums">
            ${(report.monthlyReportedRevenueUsd || 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Performance by Ad Format */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="py-1.5 pr-2 font-bold">Format</th>
              <th className="py-1.5 px-2 font-bold text-right">Req</th>
              <th className="py-1.5 px-2 font-bold text-right">Match</th>
              <th className="py-1.5 px-2 font-bold text-right">Imp</th>
              <th className="py-1.5 pl-2 font-bold text-right">NO_FILL</th>
            </tr>
          </thead>
          <tbody>
            {formats.map((f) => {
              const row = report.formats[f];
              return (
                <tr key={f} className="border-b border-slate-800/60">
                  <td className="py-1.5 pr-2 font-semibold text-slate-200">{FORMAT_LABELS[f]}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums">{row.requests}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-sky-300">{row.matched}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-emerald-300">{row.impressions}</td>
                  <td className="py-1.5 pl-2 text-right tabular-nums text-amber-300">{row.noFillErrors}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Last Diagnostic Error & Policy Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          AdMob Compensation Policy Active (No Cash-for-Ads)
        </span>
        {report.lastError ? (
          <span className="flex items-center gap-1 text-amber-300 truncate">
            <Activity className="w-3.5 h-3.5 shrink-0" />
            {report.lastError} ({totalNoFill} NO_FILL today)
          </span>
        ) : (
          <span className="flex items-center gap-1 text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            No ad errors recorded today
          </span>
        )}
      </div>
    </div>
  );
};
