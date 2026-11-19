import React, { useState, useEffect } from 'react';
import { Wifi, Gauge, PlayCircle, Info } from 'lucide-react';
import {
  DataSaverPreferences,
  VideoQualityPreference,
  NetworkProfile,
  getDataSaverPreferences,
  loadDataSaverPreferences,
  saveDataSaverPreferences,
  subscribeDataSaverPreferences,
  getNetworkProfile,
} from '../services/dataSaverService';
import { soundService } from '../services/soundService';
import { hapticService } from '../services/haptics';

interface DataSaverControlPanelProps {
  userUid?: string;
  isUrdu?: boolean;
  compact?: boolean;
}

const QUALITY_OPTIONS: Array<{ id: VideoQualityPreference; label: string; sub: string }> = [
  { id: 'auto', label: 'Auto', sub: 'Adaptive' },
  { id: 'low', label: 'Lower', sub: 'Less data' },
  { id: 'high', label: 'Higher', sub: 'When fast' },
];

export const DataSaverControlPanel: React.FC<DataSaverControlPanelProps> = ({
  userUid,
  isUrdu = false,
  compact = false,
}) => {
  const [prefs, setPrefs] = useState<DataSaverPreferences>(() => getDataSaverPreferences());
  const [network, setNetwork] = useState<NetworkProfile>(() => getNetworkProfile());

  useEffect(() => {
    let active = true;
    loadDataSaverPreferences(userUid).then((loaded) => {
      if (active) setPrefs(loaded);
    });
    const unsub = subscribeDataSaverPreferences((updated) => {
      if (active) setPrefs(updated);
    });

    const refreshNetwork = () => setNetwork(getNetworkProfile());
    window.addEventListener('online', refreshNetwork);
    window.addEventListener('offline', refreshNetwork);
    const conn = (navigator as any).connection;
    conn?.addEventListener?.('change', refreshNetwork);

    return () => {
      active = false;
      unsub();
      window.removeEventListener('online', refreshNetwork);
      window.removeEventListener('offline', refreshNetwork);
      conn?.removeEventListener?.('change', refreshNetwork);
    };
  }, [userUid]);

  const handleUpdate = async (patch: Partial<DataSaverPreferences>) => {
    soundService.playClick();
    hapticService.selection();
    const next = await saveDataSaverPreferences(patch, userUid);
    setPrefs(next);
  };

  if (compact) {
    return (
      <div className="bg-white rounded-2xl p-3 border border-rose-200/80 shadow-2xs space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Gauge className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="text-xs font-extrabold text-slate-800 truncate">
              {isUrdu ? 'ڈیٹا سیور اور ویڈیو کوالٹی' : 'Data Saver & Quality'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
              <Wifi className="w-3 h-3 text-rose-400" />
              {network.label}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.dataSaverEnabled}
              onClick={() =>
                handleUpdate({
                  dataSaverEnabled: !prefs.dataSaverEnabled,
                  quality: !prefs.dataSaverEnabled ? 'low' : 'auto',
                })
              }
              className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold transition-colors ${
                prefs.dataSaverEnabled
                  ? 'bg-rose-500 text-white'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {prefs.dataSaverEnabled ? 'Data Saver: ON' : 'Data Saver: OFF'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {QUALITY_OPTIONS.map((opt) => {
            const active = (prefs.dataSaverEnabled ? 'low' : prefs.quality) === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  handleUpdate({
                    quality: opt.id,
                    dataSaverEnabled: opt.id === 'low' ? true : false,
                  })
                }
                className={`py-1.5 px-2 rounded-xl text-center transition-colors border ${
                  active
                    ? 'bg-rose-500 text-white border-rose-500'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-rose-50'
                }`}
              >
                <span className="block text-[11px] font-extrabold leading-tight">{opt.label}</span>
                <span className={`block text-[9px] ${active ? 'text-rose-100' : 'text-slate-400'}`}>
                  {opt.sub}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-rose-600">
          <Gauge className="w-3.5 h-3.5 text-rose-500" />
          {isUrdu ? 'ڈیٹا سیور اور ویڈیو پلے بیک' : 'Smart Data Saver & Video Quality'}
        </span>
        <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
          <Wifi className="w-3 h-3 text-rose-400" />
          {network.label}
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-3">
        {/* Data Saver Switch */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-800">
              {isUrdu ? 'ڈیٹا سیور موڈ (Data Saver)' : 'Data Saver mode'}
            </div>
            <div className="text-[10px] text-slate-500 leading-snug">
              Prefer lower-data playback, turn off autoplay, and avoid preloading full videos.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.dataSaverEnabled}
            onClick={() =>
              handleUpdate({
                dataSaverEnabled: !prefs.dataSaverEnabled,
                quality: !prefs.dataSaverEnabled ? 'low' : 'auto',
              })
            }
            className={`relative inline-flex h-5.5 w-10 shrink-0 rounded-full p-0.5 transition-colors cursor-pointer ${
              prefs.dataSaverEnabled ? 'bg-rose-500' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4.5 w-4.5 rounded-full bg-white shadow-xs transform transition-transform ${
                prefs.dataSaverEnabled ? 'translate-x-4.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Video Quality Preference */}
        <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
          <div className="text-xs font-bold text-slate-800">
            {isUrdu ? 'ویڈیو کوالٹی کا انتخاب' : 'Preferred video quality'}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {QUALITY_OPTIONS.map((opt) => {
              const active = (prefs.dataSaverEnabled ? 'low' : prefs.quality) === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    handleUpdate({
                      quality: opt.id,
                      dataSaverEnabled: opt.id === 'low' ? true : false,
                    })
                  }
                  className={`py-2 px-2 rounded-xl text-center transition-colors border ${
                    active
                      ? 'bg-rose-500 text-white border-rose-500 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-rose-50'
                  }`}
                >
                  <span className="block text-xs font-extrabold leading-tight">{opt.label}</span>
                  <span className={`block text-[9px] mt-0.5 ${active ? 'text-rose-100' : 'text-slate-400'}`}>
                    {opt.sub}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Autoplay on Mobile Data Switch */}
        <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <PlayCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>Autoplay on mobile data</span>
            </div>
            <div className="text-[10px] text-slate-500 leading-snug">
              Off by default to prevent unexpected mobile data usage. Always off in Data Saver mode.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.autoplayOnMobileData && !prefs.dataSaverEnabled}
            disabled={prefs.dataSaverEnabled}
            onClick={() => handleUpdate({ autoplayOnMobileData: !prefs.autoplayOnMobileData })}
            className={`relative inline-flex h-5.5 w-10 shrink-0 rounded-full p-0.5 transition-colors ${
              prefs.autoplayOnMobileData && !prefs.dataSaverEnabled ? 'bg-rose-500' : 'bg-slate-300'
            } ${prefs.dataSaverEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`inline-block h-4.5 w-4.5 rounded-full bg-white shadow-xs transform transition-transform ${
                prefs.autoplayOnMobileData && !prefs.dataSaverEnabled ? 'translate-x-4.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Honest source capability note */}
        <div className="flex items-start gap-1.5 text-[10px] text-slate-500 bg-rose-50/50 border border-rose-100 rounded-xl px-2.5 py-2 leading-relaxed">
          <Info className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
          <span>
            Adaptive video sources (such as YouTube) automatically adjust stream resolution for your connection. For single-quality video files, Data Saver disables autoplay and preloading to reduce data usage.
          </span>
        </div>
      </div>
    </div>
  );
};
