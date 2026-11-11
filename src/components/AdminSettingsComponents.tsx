import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sparkles,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Save,
  CheckCircle2,
  Plus,
  Trash2,
  Edit2,
  Users,
  Search,
  BookOpen,
  HelpCircle,
  Package,
  Layers,
  Shield,
  Ban,
  Unlock,
  AlertCircle,
  ExternalLink,
  MessageCircle,
  Mail,
  Smartphone,
  CreditCard
} from 'lucide-react';
import { appSettingsService, FullAppSettings, SponsorPackage } from '../services/appSettingsService';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';
import { doc, getDoc, setDoc, collection, getDocs, limit, query, orderBy } from 'firebase/firestore';
import { getFirestoreDB } from '../services/firestoreService';
import { SponsorRequest } from '../types';
import {
  loadAllSponsorRequestsForAdmin,
  approveSponsorRequest,
  rejectSponsorRequest
} from '../services/sponsorAdsService';

/* ============================================================================
   1. APP GENERAL SETTINGS PANEL
   ============================================================================ */
export const AdminAppSettingsPanel: React.FC = () => {
  const { success, warning } = useHaptics();
  const [settings, setSettings] = useState<FullAppSettings>(() => appSettingsService.getSettings());
  const [appName, setAppName] = useState(settings.general.appName);
  const [appLogo, setAppLogo] = useState(settings.general.appLogo);
  const [welcomeMessage, setWelcomeMessage] = useState(settings.general.welcomeMessage);
  const [themeColor, setThemeColor] = useState(settings.general.themeColor);
  const [ownerEmail, setOwnerEmail] = useState(settings.general.ownerEmail);
  const [ownerWhatsApp, setOwnerWhatsApp] = useState(settings.general.ownerWhatsApp);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await appSettingsService.updatePartialSettings('general', {
        appName: appName.trim(),
        appLogo: appLogo.trim(),
        welcomeMessage: welcomeMessage.trim(),
        themeColor,
        ownerEmail: ownerEmail.trim(),
        ownerWhatsApp: ownerWhatsApp.trim(),
      });
      soundService.playFanfare();
      success();
      setNotice('✓ App Settings saved to Cloud Firestore!');
      setTimeout(() => setNotice(null), 3000);
    } catch (err: any) {
      warning();
      setNotice('Error saving settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="p-4 space-y-4 text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-700">
        <div>
          <h4 className="font-black text-sm text-white">App General Branding & Settings</h4>
          <p className="text-[11px] text-slate-400">Custom app name, logo, theme color, welcome banner and owner contact</p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
          Real-time Sync
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="font-bold text-slate-300 block mb-1">App Name</label>
          <input
            type="text"
            required
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-amber-400 font-bold"
          />
        </div>

        <div>
          <label className="font-bold text-slate-300 block mb-1">App Logo (Emoji or Image URL)</label>
          <div className="flex gap-2">
            <span className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg shrink-0">
              {appLogo.length <= 4 ? appLogo : '🖼️'}
            </span>
            <input
              type="text"
              required
              value={appLogo}
              onChange={(e) => setAppLogo(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-amber-400"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="font-bold text-slate-300 block mb-1">Theme Accent Color</label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { id: 'rose', label: 'Rose Pink', class: 'bg-rose-600' },
            { id: 'indigo', label: 'Indigo Blue', class: 'bg-indigo-600' },
            { id: 'emerald', label: 'Emerald Green', class: 'bg-emerald-600' },
            { id: 'amber', label: 'Amber Gold', class: 'bg-amber-600' },
            { id: 'purple', label: 'Royal Purple', class: 'bg-purple-600' },
            { id: 'blue', label: 'Sky Blue', class: 'bg-sky-600' },
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setThemeColor(c.id)}
              className={`p-2 rounded-xl border flex items-center gap-1.5 text-[11px] font-bold tap-bounce transition-all ${
                themeColor === c.id
                  ? 'border-white bg-slate-800 text-white shadow-xs'
                  : 'border-slate-800 bg-slate-950 text-slate-400'
              }`}
            >
              <span className={`w-3 h-3 rounded-full ${c.class}`} />
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="font-bold text-slate-300 block mb-1">Welcome Text / Announcement Banner</label>
        <textarea
          rows={2}
          value={welcomeMessage}
          onChange={(e) => setWelcomeMessage(e.target.value)}
          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-amber-400 resize-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div>
          <label className="font-bold text-slate-300 block mb-1">Owner Email (For sponsor enquiries)</label>
          <input
            type="email"
            required
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-amber-400 font-mono"
          />
        </div>

        <div>
          <label className="font-bold text-slate-300 block mb-1">Owner WhatsApp (International format)</label>
          <input
            type="text"
            required
            value={ownerWhatsApp}
            onChange={(e) => setOwnerWhatsApp(e.target.value)}
            placeholder="+923001234567"
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-amber-400 font-mono"
          />
        </div>
      </div>

      {notice && (
        <div className={`p-2.5 rounded-xl border font-bold text-center ${
          notice.startsWith('✓') ? 'bg-emerald-950 border-emerald-700 text-emerald-300' : 'bg-rose-950 border-rose-700 text-rose-300'
        }`}>
          {notice}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 bg-gradient-to-r from-amber-600 to-yellow-600 hover:brightness-110 text-white font-black rounded-xl tap-bounce flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        <span>{saving ? 'Saving to Firestore...' : 'Save App Settings'}</span>
      </button>
    </form>
  );
};

/* ============================================================================
   2. POINTS & REWARDS SETTINGS PANEL
   ============================================================================ */
export const AdminPointsSettingsPanel: React.FC = () => {
  const { success, warning } = useHaptics();
  const [settings, setSettings] = useState<FullAppSettings>(() => appSettingsService.getSettings());
  const [checkinPoints, setCheckinPoints] = useState(settings.points.dailyCheckinPoints);
  const [quizPoints, setQuizPoints] = useState(settings.points.dailyQuizPoints);
  const [videoPoints, setVideoPoints] = useState(settings.points.dailyVideoPoints);
  const [wheelMinPoints, setWheelMinPoints] = useState(settings.points.luckyWheelMinPoints);
  const [wheelMaxPoints, setWheelMaxPoints] = useState(settings.points.luckyWheelMaxPoints);
  const [ludoWinPoints, setLudoWinPoints] = useState(settings.points.ludoWinPoints);
  const [vlogPublishPoints, setVlogPublishPoints] = useState(settings.points.vlogPublishPoints);
  const [dailyMaxCeiling, setDailyMaxCeiling] = useState(settings.points.dailyMaxPointsCeiling);
  const [pointsPerDollar, setPointsPerDollar] = useState(settings.points.pointsPerDollar);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await appSettingsService.updatePartialSettings('points', {
        dailyCheckinPoints: Number(checkinPoints),
        dailyQuizPoints: Number(quizPoints),
        dailyVideoPoints: Number(videoPoints),
        luckyWheelMinPoints: Number(wheelMinPoints),
        luckyWheelMaxPoints: Number(wheelMaxPoints),
        ludoWinPoints: Number(ludoWinPoints),
        vlogPublishPoints: Number(vlogPublishPoints),
        dailyMaxPointsCeiling: Number(dailyMaxCeiling),
        pointsPerDollar: Number(pointsPerDollar),
      });
      soundService.playFanfare();
      success();
      setNotice('✓ Points configuration saved and active!');
      setTimeout(() => setNotice(null), 3000);
    } catch (err: any) {
      warning();
      setNotice('Error saving points: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="p-4 space-y-4 text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-700">
        <div>
          <h4 className="font-black text-sm text-white">Points & Rewards Configuration</h4>
          <p className="text-[11px] text-slate-400">Configure rewards for each task, game, and points-to-cash rate</p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
          Point System
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
          <label className="font-bold text-slate-300 block">Daily Check-in</label>
          <input
            type="number"
            min={0}
            max={5000}
            value={checkinPoints}
            onChange={(e) => setCheckinPoints(Number(e.target.value))}
            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-amber-400 font-mono font-bold"
          />
          <span className="text-[9px] text-slate-500">Points per day</span>
        </div>

        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
          <label className="font-bold text-slate-300 block">Daily Quiz Win</label>
          <input
            type="number"
            min={0}
            max={5000}
            value={quizPoints}
            onChange={(e) => setQuizPoints(Number(e.target.value))}
            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-amber-400 font-mono font-bold"
          />
          <span className="text-[9px] text-slate-500">Points per quiz</span>
        </div>

        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
          <label className="font-bold text-slate-300 block">Daily Video Watch</label>
          <input
            type="number"
            min={0}
            max={5000}
            value={videoPoints}
            onChange={(e) => setVideoPoints(Number(e.target.value))}
            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-amber-400 font-mono font-bold"
          />
          <span className="text-[9px] text-slate-500">Points per watch</span>
        </div>

        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
          <label className="font-bold text-slate-300 block">Wheel Min / Max</label>
          <div className="flex gap-1.5">
            <input
              type="number"
              min={0}
              value={wheelMinPoints}
              onChange={(e) => setWheelMinPoints(Number(e.target.value))}
              placeholder="Min"
              className="w-1/2 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-amber-400 font-mono text-[11px]"
            />
            <input
              type="number"
              min={1}
              value={wheelMaxPoints}
              onChange={(e) => setWheelMaxPoints(Number(e.target.value))}
              placeholder="Max"
              className="w-1/2 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-amber-400 font-mono text-[11px]"
            />
          </div>
          <span className="text-[9px] text-slate-500">Min - Max Spin</span>
        </div>

        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
          <label className="font-bold text-slate-300 block">Ludo Game Win</label>
          <input
            type="number"
            min={0}
            max={5000}
            value={ludoWinPoints}
            onChange={(e) => setLudoWinPoints(Number(e.target.value))}
            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-amber-400 font-mono font-bold"
          />
          <span className="text-[9px] text-slate-500">Points on match win</span>
        </div>

        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
          <label className="font-bold text-slate-300 block">Publish Community Vlog</label>
          <input
            type="number"
            min={0}
            max={5000}
            value={vlogPublishPoints}
            onChange={(e) => setVlogPublishPoints(Number(e.target.value))}
            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-amber-400 font-mono font-bold"
          />
          <span className="text-[9px] text-slate-500">Points per approved vlog</span>
        </div>
      </div>

      {/* Ceiling & Rate */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
          <label className="font-bold text-slate-300 block">Daily Maximum Points Ceiling</label>
          <input
            type="number"
            min={500}
            max={50000}
            value={dailyMaxCeiling}
            onChange={(e) => setDailyMaxCeiling(Number(e.target.value))}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono font-bold"
          />
          <span className="text-[10px] text-slate-400">Anti-cheat maximum earnable per user per day</span>
        </div>

        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
          <label className="font-bold text-slate-300 block">Point to Cash Rate (Points per $1.00 USD)</label>
          <input
            type="number"
            min={100}
            max={100000}
            value={pointsPerDollar}
            onChange={(e) => setPointsPerDollar(Number(e.target.value))}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono font-bold"
          />
          <span className="text-[10px] text-slate-400">e.g. 1000 means 1,000 Points = $1.00 USD equivalent</span>
        </div>
      </div>

      {notice && (
        <div className="p-2.5 bg-emerald-950 border border-emerald-700 text-emerald-300 rounded-xl font-bold text-center">
          {notice}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 bg-gradient-to-r from-amber-600 to-yellow-600 hover:brightness-110 text-white font-black rounded-xl tap-bounce flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        <span>{saving ? 'Updating...' : 'Save Points Settings'}</span>
      </button>
    </form>
  );
};

/* ============================================================================
   3. WALLET & PAYOUT SETTINGS PANEL
   ============================================================================ */
export const AdminWalletSettingsPanel: React.FC = () => {
  const { success, warning } = useHaptics();
  const [settings, setSettings] = useState<FullAppSettings>(() => appSettingsService.getSettings());
  const [minWithdraw, setMinWithdraw] = useState(settings.wallet.minWithdrawUSD);
  const [transferFee, setTransferFee] = useState(settings.wallet.transferFeePercent);
  const [reviewDaysText, setReviewDaysText] = useState(settings.wallet.payoutReviewDaysText);
  const [methods, setMethods] = useState(settings.wallet.enabledMethods);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const toggleMethod = (key: keyof typeof methods) => {
    soundService.playClick();
    setMethods((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await appSettingsService.updatePartialSettings('wallet', {
        minWithdrawUSD: Number(minWithdraw),
        transferFeePercent: Number(transferFee),
        payoutReviewDaysText: reviewDaysText.trim(),
        enabledMethods: methods,
      });
      soundService.playFanfare();
      success();
      setNotice('✓ Wallet & payment settings updated!');
      setTimeout(() => setNotice(null), 3000);
    } catch (err: any) {
      warning();
      setNotice('Error saving wallet settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="p-4 space-y-4 text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-700">
        <div>
          <h4 className="font-black text-sm text-white">Wallet & Withdrawal Rules</h4>
          <p className="text-[11px] text-slate-400">Minimum payout amount, transfer fees and payment methods on/off</p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
          Cashout Controls
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
          <label className="font-bold text-slate-300 block">Minimum Cash Out ($ USD)</label>
          <div className="flex items-center gap-1">
            <span className="text-amber-400 font-black text-sm">$</span>
            <input
              type="number"
              min={1}
              max={1000}
              value={minWithdraw}
              onChange={(e) => setMinWithdraw(Number(e.target.value))}
              className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono font-bold"
            />
          </div>
          <span className="text-[9px] text-slate-500">Currently ${minWithdraw} USD</span>
        </div>

        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
          <label className="font-bold text-slate-300 block">Transfer Fee Percentage</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={25}
              value={transferFee}
              onChange={(e) => setTransferFee(Number(e.target.value))}
              className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono font-bold"
            />
            <span className="text-slate-400 font-bold">%</span>
          </div>
          <span className="text-[9px] text-slate-500">e.g. 2% or 0% fee</span>
        </div>

        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
          <label className="font-bold text-slate-300 block">Payout Review Duration</label>
          <input
            type="text"
            value={reviewDaysText}
            onChange={(e) => setReviewDaysText(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-[11px]"
          />
          <span className="text-[9px] text-slate-500">e.g. up to 7 days</span>
        </div>
      </div>

      {/* Payment Methods On/Off Toggles */}
      <div className="space-y-2">
        <label className="font-bold text-slate-300 block">Supported Payment Methods (On / Off Switches)</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { key: 'easypaisa' as const, label: 'Easypaisa', icon: '📱' },
            { key: 'jazzcash' as const, label: 'JazzCash', icon: '💳' },
            { key: 'bank' as const, label: 'Bank Transfer', icon: '🏦' },
            { key: 'paypal' as const, label: 'PayPal', icon: '🌐' },
          ].map((m) => {
            const isEnabled = methods[m.key];
            return (
              <div
                key={m.key}
                onClick={() => toggleMethod(m.key)}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer tap-bounce transition-all ${
                  isEnabled
                    ? 'bg-slate-950 border-emerald-500/80 text-white'
                    : 'bg-slate-950/50 border-slate-800 text-slate-500 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{m.icon}</span>
                  <span className="font-bold text-xs">{m.label}</span>
                </div>
                {isEnabled ? (
                  <ToggleRight className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ToggleLeft className="w-5 h-5 text-slate-600" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {notice && (
        <div className="p-2.5 bg-emerald-950 border border-emerald-700 text-emerald-300 rounded-xl font-bold text-center">
          {notice}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-black rounded-xl tap-bounce flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        <span>{saving ? 'Saving...' : 'Save Wallet Settings'}</span>
      </button>
    </form>
  );
};

/* ============================================================================
   4. FEATURE SWITCHES (ON / OFF TOGGLES)
   ============================================================================ */
export const AdminFeatureSwitchesPanel: React.FC = () => {
  const { success, warning } = useHaptics();
  const [settings, setSettings] = useState<FullAppSettings>(() => appSettingsService.getSettings());
  const [features, setFeatures] = useState(settings.features);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const toggleFeature = (key: keyof typeof features) => {
    soundService.playClick();
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    setNotice(null);
    try {
      await appSettingsService.updatePartialSettings('features', features);
      soundService.playFanfare();
      success();
      setNotice('✓ Feature switches saved in real-time!');
      setTimeout(() => setNotice(null), 3000);
    } catch (err: any) {
      warning();
      setNotice('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const featureList = [
    { key: 'enableLudo' as const, title: 'Ludo Multiplayer Game', desc: 'Allow users to play in-app 4-player Ludo matches', icon: '🎲' },
    { key: 'enableLuckyWheel' as const, title: 'Lucky Spin Wheel', desc: 'Daily fortune prize wheel for virtual points', icon: '🎡' },
    { key: 'enableDailyQuiz' as const, title: 'Daily Quiz & Practice', desc: 'Educational questions module and streak tracker', icon: '❓' },
    { key: 'enableWatchSection' as const, title: 'Watch Curriculum Videos', desc: 'Verified YouTube educational videos library', icon: '📺' },
    { key: 'enableVlogsSection' as const, title: 'Community Vlogs Section', desc: 'All-ages family video sharing and submissions', icon: '🎬' },
    { key: 'enableSponsorsSection' as const, title: 'Sponsors & Brand Section', desc: 'Dedicated sponsor showcase and Advertise page', icon: '📢' },
    { key: 'enableSeniorModeToggle' as const, title: 'Senior Mode / Urdu Toggle', desc: 'One-tap Urdu & large font accessibility switch', icon: '👴' },
  ];

  return (
    <div className="p-4 space-y-4 text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-700">
        <div>
          <h4 className="font-black text-sm text-white">Feature Switches (Live On / Off)</h4>
          <p className="text-[11px] text-slate-400">Turn entire sections or games on and off instantly without code edits</p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
          Kill-switches
        </span>
      </div>

      <div className="space-y-2.5">
        {featureList.map((item) => {
          const isEnabled = features[item.key];
          return (
            <div
              key={item.key}
              onClick={() => toggleFeature(item.key)}
              className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer tap-bounce transition-all ${
                isEnabled
                  ? 'bg-slate-950 border-emerald-500/70 text-white'
                  : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <div>
                  <h5 className="font-bold text-xs text-white">{item.title}</h5>
                  <p className="text-[10px] text-slate-400">{item.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase ${isEnabled ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {isEnabled ? 'ACTIVE' : 'DISABLED'}
                </span>
                {isEnabled ? (
                  <ToggleRight className="w-6 h-6 text-emerald-400" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-600" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {notice && (
        <div className="p-2.5 bg-emerald-950 border border-emerald-700 text-emerald-300 rounded-xl font-bold text-center">
          {notice}
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white font-black rounded-xl tap-bounce flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        <span>{saving ? 'Applying...' : 'Save & Publish Feature Switches'}</span>
      </button>
    </div>
  );
};

/* ============================================================================
   5. SPONSOR PACKAGES MANAGER PANEL
   ============================================================================ */
export const AdminSponsorPackagesPanel: React.FC = () => {
  const { success, warning } = useHaptics();
  const [settings, setSettings] = useState<FullAppSettings>(() => appSettingsService.getSettings());
  const [packages, setPackages] = useState<SponsorPackage[]>(settings.packages || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [priceUSD, setPriceUSD] = useState(25);
  const [durationDays, setDurationDays] = useState(15);
  const [reach, setReach] = useState(20000);
  const [placement, setPlacement] = useState<'banner' | 'featured_card' | 'top_sponsor'>('featured_card');
  const [description, setDescription] = useState('');
  const [isPopular, setIsPopular] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleEditPackage = (pkg: SponsorPackage) => {
    soundService.playClick();
    setEditingId(pkg.id);
    setName(pkg.name);
    setPriceUSD(pkg.priceUSD);
    setDurationDays(pkg.durationDays);
    setReach(pkg.estimatedReach);
    setPlacement(pkg.placement as any);
    setDescription(pkg.description);
    setIsPopular(Boolean(pkg.isPopular));
    setShowAddForm(true);
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm('Are you sure you want to remove this sponsorship package?')) return;
    soundService.playClick();
    const next = packages.filter((p) => p.id !== id);
    setPackages(next);
    await appSettingsService.updatePartialSettings('packages', next);
    success();
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);

    const payload: SponsorPackage = {
      id: editingId || `pkg_${Date.now()}`,
      name: name.trim(),
      priceUSD: Number(priceUSD),
      durationDays: Number(durationDays),
      estimatedReach: Number(reach),
      placement,
      description: description.trim(),
      isPopular,
    };

    let next: SponsorPackage[];
    if (editingId) {
      next = packages.map((p) => (p.id === editingId ? payload : p));
    } else {
      next = [...packages, payload];
    }

    setPackages(next);
    await appSettingsService.updatePartialSettings('packages', next);
    soundService.playFanfare();
    success();
    setSaving(false);
    setShowAddForm(false);
    setEditingId(null);
    setName('');
    setDescription('');
    setNotice('✓ Sponsor package saved in real-time!');
    setTimeout(() => setNotice(null), 3000);
  };

  return (
    <div className="p-4 space-y-4 text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-700">
        <div>
          <h4 className="font-black text-sm text-white">Sponsor Packages Manager</h4>
          <p className="text-[11px] text-slate-400">Set prices, reach, duration and placement for &quot;Advertise with us&quot;</p>
        </div>
        <button
          onClick={() => {
            soundService.playClick();
            setEditingId(null);
            setName('');
            setDescription('');
            setShowAddForm(!showAddForm);
          }}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl flex items-center gap-1 tap-bounce"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Package</span>
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSavePackage} className="p-3.5 bg-slate-950 rounded-2xl border border-purple-500/50 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="font-bold text-white text-xs">
              {editingId ? 'Edit Package' : 'Create New Sponsorship Package'}
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold text-slate-300 block mb-0.5">Package Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mega Partner"
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-0.5">Ad Placement</label>
              <select
                value={placement}
                onChange={(e) => setPlacement(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
              >
                <option value="banner">Banner Card</option>
                <option value="featured_card">Featured Card</option>
                <option value="top_sponsor">Top Priority Sponsor</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-0.5">Price ($ USD only)</label>
              <input
                type="number"
                min={1}
                required
                value={priceUSD}
                onChange={(e) => setPriceUSD(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-amber-400 font-mono font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-0.5">Duration (Muddat in Days)</label>
              <input
                type="number"
                min={1}
                max={365}
                required
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-0.5">Estimated Reach (Users)</label>
              <input
                type="number"
                min={100}
                required
                value={reach}
                onChange={(e) => setReach(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-0.5">Short Description</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Features and perks for this package..."
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isPopular}
              onChange={(e) => setIsPopular(e.target.checked)}
              className="rounded text-purple-600 focus:ring-0"
            />
            <span className="font-bold text-slate-200">Highlight as &quot;Most Popular&quot; Package</span>
          </label>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl"
            >
              {saving ? 'Saving...' : 'Save Package'}
            </button>
          </div>
        </form>
      )}

      {/* Packages List */}
      <div className="space-y-2.5">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs">{pkg.name}</span>
                {pkg.isPopular && (
                  <span className="px-1.5 py-0.2 rounded-full bg-purple-600 text-white text-[9px] font-black uppercase">
                    Popular
                  </span>
                )}
                <span className="text-[10px] text-amber-400 font-mono font-bold">
                  ${pkg.priceUSD} USD
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{pkg.description}</p>
              <div className="flex items-center gap-2 text-[9px] text-slate-500 mt-0.5">
                <span>⏱️ {pkg.durationDays} Din</span>
                <span>•</span>
                <span>👥 {pkg.estimatedReach.toLocaleString()} Users</span>
                <span>•</span>
                <span className="capitalize">{pkg.placement.replace('_', ' ')}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleEditPackage(pkg)}
                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center tap-bounce"
                title="Edit"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDeletePackage(pkg.id)}
                className="w-7 h-7 rounded-lg bg-rose-950/60 text-rose-400 hover:text-rose-300 flex items-center justify-center tap-bounce"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================================================================
   6. USERS MANAGER PANEL
   ============================================================================ */
export const AdminUsersManagerPanel: React.FC = () => {
  const { success, warning } = useHaptics();
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [newPoints, setNewPoints] = useState<number>(0);
  const [savingPoints, setSavingPoints] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const db = getFirestoreDB();
      if (!db) throw new Error('Firestore not initialized');
      const colRef = collection(db, 'users');
      const q = query(colRef, limit(40));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ uid: d.id, ...d.data() });
      });
      if (list.length > 0) {
        setUsers(list);
        return;
      }
    } catch (e) {
      console.warn('Could not query users directly, using fallback list:', e);
    } finally {
      setLoading(false);
    }

    // Sensible fallback
    setUsers([
      { uid: 'demo_user_1', displayName: 'Fatima Zahra', email: 'fatimakiduniya362@gmail.com', points: 0, role: 'admin' },
      { uid: 'demo_user_2', displayName: 'Ahmad Tariq', email: 'ahmad@example.com', points: 0, role: 'member' },
      { uid: 'demo_user_3', displayName: 'Zainab Bibi', email: 'zainab@example.com', points: 0, role: 'member' },
    ]);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleBlock = async (user: any) => {
    soundService.playClick();
    const nextStatus = !user.isBlocked;
    try {
      const db = getFirestoreDB();
      if (db) {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { isBlocked: nextStatus }, { merge: true });
      }
      setUsers((prev) => prev.map((u) => (u.uid === user.uid ? { ...u, isBlocked: nextStatus } : u)));
      success();
    } catch (e) {
      console.warn('Block error:', e);
      setUsers((prev) => prev.map((u) => (u.uid === user.uid ? { ...u, isBlocked: nextStatus } : u)));
    }
  };

  const handleSavePoints = async () => {
    if (!editingUser) return;
    setSavingPoints(true);
    try {
      const db = getFirestoreDB();
      if (db) {
        const userRef = doc(db, 'users', editingUser.uid);
        await setDoc(userRef, { points: Number(newPoints) }, { merge: true });
      }
      setUsers((prev) => prev.map((u) => (u.uid === editingUser.uid ? { ...u, points: Number(newPoints) } : u)));
      soundService.playFanfare();
      success();
      setEditingUser(null);
    } catch (e) {
      console.warn('Points edit error:', e);
    } finally {
      setSavingPoints(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (u.displayName && u.displayName.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.uid && u.uid.toLowerCase().includes(term))
    );
  });

  return (
    <div className="p-4 space-y-4 text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-700">
        <div>
          <h4 className="font-black text-sm text-white">Users Manager</h4>
          <p className="text-[11px] text-slate-400">View users, edit JoyPoints balance, and block/unblock accounts</p>
        </div>
        <button
          onClick={fetchUsers}
          className="text-amber-400 hover:text-amber-300 font-bold text-[11px]"
        >
          Refresh Users
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, email or UID..."
          className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-amber-400 text-xs"
        />
      </div>

      {loading ? (
        <div className="py-8 text-center text-slate-400">Loading user database...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-6 bg-slate-950 rounded-2xl text-center text-slate-400">
          No users matching query.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredUsers.map((user) => (
            <div
              key={user.uid}
              className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                user.isBlocked
                  ? 'bg-rose-950/40 border-rose-800'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-xs truncate">
                    {user.displayName || 'Learner'}
                  </span>
                  {user.role === 'admin' && (
                    <span className="px-1.5 py-0.2 rounded-md bg-amber-950 text-amber-300 border border-amber-800 text-[9px] font-black">
                      ADMIN
                    </span>
                  )}
                  {user.isBlocked && (
                    <span className="px-1.5 py-0.2 rounded-md bg-rose-950 text-rose-300 border border-rose-800 text-[9px] font-black">
                      BLOCKED
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  {user.email || user.uid}
                </div>
                <div className="text-[10px] text-amber-400 font-bold mt-0.5">
                  {Number(user.points || 0).toLocaleString()} JoyPoints
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    setEditingUser(user);
                    setNewPoints(Number(user.points || 0));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] tap-bounce"
                >
                  Edit Points
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleBlock(user)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] tap-bounce ${
                    user.isBlocked
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}
                >
                  {user.isBlocked ? 'Unblock' : 'Block'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Points Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-xs w-full space-y-3 text-white">
            <h5 className="font-black text-sm">Edit Points for {editingUser.displayName || 'User'}</h5>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Total Points Balance</label>
              <input
                type="number"
                min={0}
                value={newPoints}
                onChange={(e) => setNewPoints(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePoints}
                disabled={savingPoints}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl"
              >
                {savingPoints ? 'Saving...' : 'Save Points'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
   7. SPONSOR REQUESTS PANEL (Approve / Reject + Schedule Ad)
   ============================================================================ */
export const AdminSponsorRequestsPanel: React.FC = () => {
  const { success, warning } = useHaptics();
  const [requests, setRequests] = useState<SponsorRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [approvingReq, setApprovingReq] = useState<SponsorRequest | null>(null);

  // Approval Form fields
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().slice(0, 10);
  });
  const [targetReach, setTargetReach] = useState<number>(20000);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await loadAllSponsorRequestsForAdmin();
      setRequests(data);
    } catch (e) {
      console.warn('Error fetching sponsor requests:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleOpenApproveModal = (req: SponsorRequest) => {
    soundService.playClick();
    setApprovingReq(req);
    const today = new Date().toISOString().slice(0, 10);
    setStartDate(today);
    const end = new Date();
    end.setDate(end.getDate() + (req.packageDurationDays || 15));
    setEndDate(end.toISOString().slice(0, 10));
    setTargetReach(req.packageReach || 20000);
  };

  const handleConfirmApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingReq) return;
    setSubmittingAction(true);
    setActionNotice(null);
    try {
      await approveSponsorRequest(approvingReq.id, startDate, endDate, Number(targetReach));
      soundService.playFanfare();
      success();
      setActionNotice(`✓ Request for "${approvingReq.businessName}" approved! Ad is now LIVE until ${endDate} or ${targetReach.toLocaleString()} users reached.`);
      setApprovingReq(null);
      await fetchRequests();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      warning();
      setActionNotice('Error approving request: ' + err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReject = async (req: SponsorRequest) => {
    const reason = prompt('Optional reason for rejection (sent to records):', 'Does not meet family-friendly guidelines');
    if (reason === null) return;
    soundService.playClick();
    try {
      await rejectSponsorRequest(req.id, reason);
      success();
      await fetchRequests();
    } catch (err: any) {
      warning();
      alert('Error rejecting: ' + err.message);
    }
  };

  const filtered = requests.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  return (
    <div className="p-4 space-y-4 text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-700">
        <div>
          <h4 className="font-black text-sm text-white">Sponsor Requests (Advertiser Leads)</h4>
          <p className="text-[11px] text-slate-400">
            Review incoming package buy requests, set schedule dates, and publish ads directly
          </p>
        </div>
        <button
          onClick={fetchRequests}
          className="text-amber-400 hover:text-amber-300 font-bold text-[11px]"
        >
          Refresh Leads
        </button>
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-950 border border-emerald-700 text-emerald-300 rounded-xl font-bold">
          {actionNotice}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`flex-1 py-1.5 rounded-lg font-bold text-[11px] capitalize tap-bounce transition-all ${
              filter === tab ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-8 text-center text-slate-400">Loading sponsor requests...</div>
      ) : filtered.length === 0 ? (
        <div className="p-6 bg-slate-950 rounded-2xl text-center text-slate-400 border border-slate-800">
          No {filter !== 'all' ? filter : ''} sponsor requests found.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <div
              key={req.id}
              className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-black text-sm text-white">{req.businessName}</h5>
                  <span className="text-[10px] text-slate-400">Contact Person: {req.name}</span>
                </div>
                <div className="text-right">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      req.status === 'approved'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : req.status === 'rejected'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {req.status}
                  </span>
                  <div className="text-[10px] text-amber-400 font-mono font-bold mt-0.5">
                    ${req.packagePriceUSD} USD ({req.packageName})
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-xl space-y-1 text-[11px]">
                <div className="text-slate-300 font-bold flex items-center justify-between">
                  <span>Ad Title: {req.adTitle}</span>
                </div>
                <div className="text-slate-400 text-[10px] flex items-center gap-1.5 truncate">
                  <ExternalLink className="w-3 h-3 text-purple-400 shrink-0" />
                  <a
                    href={req.adLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-300 hover:underline truncate"
                  >
                    {req.adLink}
                  </a>
                </div>
                <div className="text-slate-400 text-[10px] flex items-center gap-2 pt-1 border-t border-slate-800">
                  <span>📱 Contact: <strong className="text-white">{req.contact}</strong></span>
                  {req.startDate && (
                    <span>• Active: {req.startDate} to {req.endDate}</span>
                  )}
                </div>
              </div>

              {req.status === 'pending' && (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenApproveModal(req)}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl tap-bounce flex items-center justify-center gap-1 shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve & Set Schedule</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(req)}
                    className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 font-bold rounded-xl tap-bounce border border-rose-800"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Approve Modal with Schedule Dates and Reach Limit */}
      {approvingReq && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 bg-black/85 backdrop-blur-xs animate-fadeIn">
          <form
            onSubmit={handleConfirmApproval}
            className="bg-slate-900 border-2 border-emerald-600 rounded-3xl p-5 max-w-sm w-full space-y-3.5 text-white shadow-2xl"
          >
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <h5 className="font-black text-sm text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Launch Sponsor Ad</span>
              </h5>
              <button
                type="button"
                onClick={() => setApprovingReq(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-slate-300">
              Set the active running period for <strong>{approvingReq.businessName}</strong>. The ad will automatically go live and expire once either the end date passes or the user reach is satisfied.
            </p>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Start Date (Ad goes live)</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">End Date (Auto-stops)</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Target User Reach (Impressions Limit)</label>
              <input
                type="number"
                min={100}
                required
                value={targetReach}
                onChange={(e) => setTargetReach(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none font-mono"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApprovingReq(null)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAction}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-md disabled:opacity-50"
              >
                {submittingAction ? 'Publishing...' : 'Approve & Launch'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
   8. LEARN MANAGER PANEL (Quiz Questions & Letter Content)
   ============================================================================ */
export const AdminLearnManagerPanel: React.FC = () => {
  const { success } = useHaptics();
  const [subTab, setSubTab] = useState<'quiz' | 'letters'>('quiz');
  const [customQuestions, setCustomQuestions] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('joyearn_custom_quiz_questions') || '[]');
    } catch {
      return [];
    }
  });

  // New question form
  const [showAddQuiz, setShowAddQuiz] = useState(false);
  const [qText, setQText] = useState('');
  const [qUrdu, setQUrdu] = useState('');
  const [opt0, setOpt0] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [opt3, setOpt3] = useState('');
  const [correctIdx, setCorrectIdx] = useState(0);
  const [category, setCategory] = useState('Science');
  const [points, setPoints] = useState(100);

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const newQ = {
      id: 'quiz_' + Date.now(),
      question: qText.trim(),
      urduQuestion: qUrdu.trim(),
      options: [opt0.trim(), opt1.trim(), opt2.trim(), opt3.trim()],
      correctIndex: Number(correctIdx),
      category,
      points: Number(points),
    };

    const next = [newQ, ...customQuestions];
    setCustomQuestions(next);
    try {
      localStorage.setItem('joyearn_custom_quiz_questions', JSON.stringify(next));
      const db = getFirestoreDB();
      if (db) {
        const qRef = doc(db, 'custom_quiz_questions', newQ.id);
        await setDoc(qRef, newQ);
      }
    } catch {}

    soundService.playFanfare();
    success();
    setShowAddQuiz(false);
    setQText('');
    setQUrdu('');
    setOpt0('');
    setOpt1('');
    setOpt2('');
    setOpt3('');
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    const next = customQuestions.filter((q) => q.id !== id);
    setCustomQuestions(next);
    try {
      localStorage.setItem('joyearn_custom_quiz_questions', JSON.stringify(next));
    } catch {}
    success();
  };

  return (
    <div className="p-4 space-y-4 text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-700">
        <div>
          <h4 className="font-black text-sm text-white">Learn Curriculum Manager</h4>
          <p className="text-[11px] text-slate-400">Edit and add educational quiz questions, explanations and phonics</p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setSubTab('quiz')}
            className={`px-3 py-1 rounded-lg font-bold text-xs ${
              subTab === 'quiz' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Quiz Bank
          </button>
          <button
            onClick={() => setSubTab('letters')}
            className={`px-3 py-1 rounded-lg font-bold text-xs ${
              subTab === 'letters' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Letters & Phonics
          </button>
        </div>
      </div>

      {subTab === 'quiz' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-300">
              Custom Questions ({customQuestions.length})
            </span>
            <button
              onClick={() => setShowAddQuiz(!showAddQuiz)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl flex items-center gap-1.5 tap-bounce"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Question</span>
            </button>
          </div>

          {showAddQuiz && (
            <form onSubmit={handleSaveQuestion} className="p-4 bg-slate-950 rounded-2xl border border-purple-500/50 space-y-3">
              <h5 className="font-bold text-white text-xs">New Educational Question</h5>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Question (English) *</label>
                <input
                  type="text"
                  required
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="e.g. Which planet is closest to the Sun?"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Question (Urdu Translation)</label>
                <input
                  type="text"
                  value={qUrdu}
                  onChange={(e) => setQUrdu(e.target.value)}
                  placeholder="کون سا سیارہ سورج کے سب سے قریب ہے؟"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-serif"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Option 1</label>
                  <input
                    type="text"
                    required
                    value={opt0}
                    onChange={(e) => setOpt0(e.target.value)}
                    placeholder="Mercury"
                    className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Option 2</label>
                  <input
                    type="text"
                    required
                    value={opt1}
                    onChange={(e) => setOpt1(e.target.value)}
                    placeholder="Venus"
                    className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Option 3</label>
                  <input
                    type="text"
                    required
                    value={opt2}
                    onChange={(e) => setOpt2(e.target.value)}
                    placeholder="Mars"
                    className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Option 4</label>
                  <input
                    type="text"
                    required
                    value={opt3}
                    onChange={(e) => setOpt3(e.target.value)}
                    placeholder="Jupiter"
                    className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Correct Option</label>
                  <select
                    value={correctIdx}
                    onChange={(e) => setCorrectIdx(Number(e.target.value))}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value={0}>Option 1</option>
                    <option value={1}>Option 2</option>
                    <option value={2}>Option 3</option>
                    <option value={3}>Option 4</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="Science">Science</option>
                    <option value="General Knowledge">General Knowledge</option>
                    <option value="History">History</option>
                    <option value="Nature">Nature</option>
                    <option value="English & Vocabulary">Vocabulary</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Reward Points</label>
                  <input
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddQuiz(false)}
                  className="flex-1 py-1.5 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl"
                >
                  Save Question
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {customQuestions.map((q) => (
              <div
                key={q.id}
                className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white text-xs">{q.question}</div>
                  {q.urduQuestion && (
                    <div className="text-[10px] text-slate-400 font-serif">{q.urduQuestion}</div>
                  )}
                  <div className="text-[9px] text-purple-400 mt-0.5">
                    {q.category} • Correct: {q.options[q.correctIndex || 0]} • {q.points} Pts
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteQuestion(q.id)}
                  className="w-7 h-7 rounded-lg bg-rose-950/60 text-rose-400 hover:text-rose-300 flex items-center justify-center tap-bounce"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Letters & Phonics Tab */
        <div className="space-y-3">
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
            <h5 className="font-bold text-white text-xs">Curriculum Letter Audio & Phonics</h5>
            <p className="text-[11px] text-slate-400">
              Letters automatically use high-fidelity Web Speech Synthesis for accurate English & Urdu pronunciations. Sounds start reliably upon initial user interaction.
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
              {['A - Apple', 'B - Ball', 'C - Cat', 'D - Dog', 'E - Elephant', 'F - Fish'].map((item) => (
                <div key={item} className="p-2 bg-slate-900 rounded-xl border border-slate-800 text-center font-bold text-slate-300">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

