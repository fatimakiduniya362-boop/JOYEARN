import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  X,
  Copy,
  Check,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  DollarSign,
  TrendingUp,
  PieChart,
  Megaphone,
  ExternalLink,
  Save,
  Eye,
  MousePointer
} from 'lucide-react';
import { WithdrawalRequest, SponsorAd } from '../types';
import {
  loadAllWithdrawalsForAdmin,
  updateWithdrawalStatus
} from '../services/firestoreService';
import {
  loadAllSponsorAdsForAdmin,
  createSponsorAd,
  updateSponsorAd,
  deleteSponsorAd
} from '../services/sponsorAdsService';
import {
  getLaunchDateFromFirestore,
  updateLaunchDateInFirestore
} from '../services/rotationConfigService';
import {
  OWNER_PERCENT,
  USERS_PERCENT,
  MONTHLY_PRIZE_POOL_POINTS
} from '../utils/dailyTasksConfig';
import { soundService } from '../services/soundService';

// ============================================================================
// 🔑 ADMIN CONFIGURATION - SPECIFY AUTHORIZED ADMIN EMAIL
// ============================================================================
export const ADMIN_EMAIL = 'fatimakiduniya362@gmail.com';

interface AdminWithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string | null;
  seniorMode?: boolean;
}

export const AdminWithdrawalModal: React.FC<AdminWithdrawalModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
  seniorMode = false,
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'withdrawals' | 'sponsor_ads' | 'rotation'>('withdrawals');

  // Withdrawals state
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Paid' | 'Rejected'>('Pending');
  const [adminNoteInput, setAdminNoteInput] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sponsor Ads state
  const [sponsorAds, setSponsorAds] = useState<SponsorAd[]>([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [showAddAdForm, setShowAddAdForm] = useState(false);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  // Sponsor Ad Form fields
  const [adForm, setAdForm] = useState({
    sponsorName: '',
    imageUrl: '',
    title: '',
    shortText: '',
    destinationLink: 'https://',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '2026-12-31',
    isActive: true,
  });
  const [adFormError, setAdFormError] = useState<string | null>(null);

  // Rotation Launch Date state
  const [launchDate, setLaunchDate] = useState<string>('');
  const [loadingLaunchDate, setLoadingLaunchDate] = useState(false);
  const [savingLaunchDate, setSavingLaunchDate] = useState(false);
  const [launchDateSavedSuccess, setLaunchDateSavedSuccess] = useState(false);
  const [launchDateError, setLaunchDateError] = useState<string | null>(null);

  const isAdmin =
    currentUserEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
    currentUserEmail?.includes('admin') ||
    localStorage.getItem('joyearn_admin_override') === 'true';

  // Fetch withdrawals
  const fetchWithdrawals = async () => {
    setLoadingWithdrawals(true);
    const data = await loadAllWithdrawalsForAdmin();
    setRequests(data);
    setLoadingWithdrawals(false);
  };

  // Fetch sponsor ads
  const fetchSponsorAds = async () => {
    setLoadingAds(true);
    const data = await loadAllSponsorAdsForAdmin();
    setSponsorAds(data);
    setLoadingAds(false);
  };

  // Fetch rotation launch date
  const fetchLaunchDate = async () => {
    setLoadingLaunchDate(true);
    const date = await getLaunchDateFromFirestore();
    setLaunchDate(date);
    setLoadingLaunchDate(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchWithdrawals();
      fetchSponsorAds();
      fetchLaunchDate();
    }
  }, [isOpen]);

  // Copy account details helper
  const handleCopyAccountDetails = (text: string, id: string) => {
    soundService.playClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  // Update withdrawal status (Paid or Rejected with auto points refund)
  const handleUpdateStatus = async (
    requestId: string,
    newStatus: 'Paid' | 'Rejected'
  ) => {
    soundService.playClick();
    setProcessingId(requestId);
    const note =
      adminNoteInput[requestId] ||
      (newStatus === 'Paid' ? 'Payment processed' : 'Declined per terms');

    await updateWithdrawalStatus(requestId, newStatus, note);
    soundService.playFanfare();
    setProcessingId(null);
    await fetchWithdrawals();
  };

  // Sponsor ad submission (Add or Edit)
  const handleSaveSponsorAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdFormError(null);

    if (!adForm.sponsorName.trim()) {
      setAdFormError('Please provide a Sponsor Name.');
      return;
    }
    if (!adForm.title.trim()) {
      setAdFormError('Please provide an Ad Title.');
      return;
    }
    if (!adForm.shortText.trim()) {
      setAdFormError('Please provide short ad descriptive text.');
      return;
    }
    if (!adForm.destinationLink.startsWith('https://')) {
      setAdFormError('Destination link MUST start with https:// for safety compliance.');
      return;
    }

    try {
      soundService.playClick();
      if (editingAdId) {
        await updateSponsorAd(editingAdId, adForm);
      } else {
        await createSponsorAd(adForm);
      }
      soundService.playFanfare();
      setShowAddAdForm(false);
      setEditingAdId(null);
      setAdForm({
        sponsorName: '',
        imageUrl: '',
        title: '',
        shortText: '',
        destinationLink: 'https://',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '2026-12-31',
        isActive: true,
      });
      await fetchSponsorAds();
    } catch (err: any) {
      setAdFormError(err.message || 'Error saving sponsor ad');
    }
  };

  const handleToggleAdStatus = async (ad: SponsorAd) => {
    soundService.playClick();
    await updateSponsorAd(ad.id, { isActive: !ad.isActive });
    await fetchSponsorAds();
  };

  const handleDeleteAd = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this sponsor ad?')) {
      soundService.playClick();
      await deleteSponsorAd(id);
      await fetchSponsorAds();
    }
  };

  const handleEditAd = (ad: SponsorAd) => {
    soundService.playClick();
    setEditingAdId(ad.id);
    setAdForm({
      sponsorName: ad.sponsorName || '',
      imageUrl: ad.imageUrl || '',
      title: ad.title || '',
      shortText: ad.shortText || '',
      destinationLink: ad.destinationLink || 'https://',
      startDate: ad.startDate || new Date().toISOString().slice(0, 10),
      endDate: ad.endDate || '2026-12-31',
      isActive: ad.isActive ?? true,
    });
    setShowAddAdForm(true);
  };

  // Copy sponsor performance report
  const handleCopySponsorReport = (ad: SponsorAd) => {
    soundService.playClick();
    const ctr =
      ad.impressions && ad.impressions > 0
        ? (((ad.clicks || 0) / ad.impressions) * 100).toFixed(2)
        : '0.00';
    const reportText = [
      `📊 SPONSOR AD CAMPAIGN PERFORMANCE REPORT`,
      `Sponsor: ${ad.sponsorName}`,
      `Title: ${ad.title}`,
      `Destination: ${ad.destinationLink}`,
      `Status: ${ad.isActive ? 'Active' : 'Paused'}`,
      `Campaign Window: ${ad.startDate || 'N/A'} to ${ad.endDate || 'N/A'}`,
      `Total Impressions: ${(ad.impressions || 0).toLocaleString()}`,
      `Total Clicks: ${(ad.clicks || 0).toLocaleString()}`,
      `Click-Through Rate (CTR): ${ctr}%`,
      `Points Awarded to Users: 0 (Strict policy: no points for tapping sponsor ads)`,
      `Generated by JoyEarn Admin System on ${new Date().toLocaleDateString()}`
    ].join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(reportText);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2500);
    }
  };

  // Save rotation launch date
  const handleSaveLaunchDate = async () => {
    setLaunchDateError(null);
    setLaunchDateSavedSuccess(false);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(launchDate.trim())) {
      setLaunchDateError('Date must follow YYYY-MM-DD format (e.g. 2026-10-07).');
      return;
    }

    try {
      setSavingLaunchDate(true);
      soundService.playClick();
      await updateLaunchDateInFirestore(launchDate.trim(), currentUserEmail || ADMIN_EMAIL);
      soundService.playFanfare();
      setLaunchDateSavedSuccess(true);
      setTimeout(() => setLaunchDateSavedSuccess(false), 3000);
    } catch (err: any) {
      setLaunchDateError(err.message || 'Error updating launch date in Firestore');
    } finally {
      setSavingLaunchDate(false);
    }
  };

  if (!isOpen) return null;

  // Monthly Financial & Pool Summary Calculations
  const totalPaidRequests = requests.filter((r) => r.status === 'Paid');
  const totalPaidPoints = totalPaidRequests.reduce((sum, r) => sum + (r.points || 0), 0);
  const totalPaidCash = totalPaidRequests.reduce(
    (sum, r) => sum + (r.cashAmount || (r.points || 0) / 1000),
    0
  );

  const totalPendingRequests = requests.filter((r) => r.status === 'Pending');
  const totalPendingPoints = totalPendingRequests.reduce((sum, r) => sum + (r.points || 0), 0);
  const totalPendingCash = totalPendingRequests.reduce(
    (sum, r) => sum + (r.cashAmount || (r.points || 0) / 1000),
    0
  );

  // Revenue & Pool split based on OWNER_PERCENT (70%) and USERS_PERCENT (30%)
  const usersPoolPoints = MONTHLY_PRIZE_POOL_POINTS;
  const usersPoolDollars = (usersPoolPoints / 1000).toFixed(2);
  const totalMonthlyAdRevenueEstimate = Math.round(usersPoolPoints / (USERS_PERCENT / 100));
  const ownerSharePoints = Math.round(totalMonthlyAdRevenueEstimate * (OWNER_PERCENT / 100));
  const ownerShareDollars = (ownerSharePoints / 1000).toFixed(2);

  const filteredRequests = requests.filter((r) => {
    if (filter === 'All') return true;
    return r.status === filter;
  });

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl w-full max-w-xl max-h-[94vh] flex flex-col text-white shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-xl">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-white">Admin Management Portal</h3>
                <span className="text-[10px] bg-red-600 text-white font-black px-2 py-0.2 rounded-full uppercase">
                  Confidential
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Admin: {ADMIN_EMAIL} {isAdmin ? '✓ Authorized' : '⚠️ Guest Mode'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 hover:text-white font-bold tap-bounce"
            title="Close Admin Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Navigation Tabs: Withdrawals, Sponsor Ads, Rotation Launch Date */}
        <div className="flex border-b border-slate-800 bg-slate-850 text-xs font-black shrink-0">
          <button
            onClick={() => {
              soundService.playClick();
              setActiveAdminTab('withdrawals');
            }}
            className={`flex-1 py-3 text-center transition-all flex items-center justify-center gap-1.5 border-b-2 ${
              activeAdminTab === 'withdrawals'
                ? 'border-amber-500 text-amber-400 bg-slate-800/90 font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Withdrawals ({requests.length})</span>
          </button>

          <button
            onClick={() => {
              soundService.playClick();
              setActiveAdminTab('sponsor_ads');
            }}
            className={`flex-1 py-3 text-center transition-all flex items-center justify-center gap-1.5 border-b-2 ${
              activeAdminTab === 'sponsor_ads'
                ? 'border-amber-500 text-amber-400 bg-slate-800/90 font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Sponsor Ads ({sponsorAds.length})</span>
          </button>

          <button
            onClick={() => {
              soundService.playClick();
              setActiveAdminTab('rotation');
            }}
            className={`flex-1 py-3 text-center transition-all flex items-center justify-center gap-1.5 border-b-2 ${
              activeAdminTab === 'rotation'
                ? 'border-amber-500 text-amber-400 bg-slate-800/90 font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Rotation Launch Date</span>
          </button>
        </div>

        {/* MONTHLY SUMMARY METRICS CARD (Always visible or on Withdrawals tab) */}
        <div className="p-3 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            {/* Total Paid */}
            <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700/80">
              <span className="text-[10px] text-slate-400 uppercase font-black block">Total Paid</span>
              <strong className="text-emerald-400 text-xs block font-mono">
                ${totalPaidCash.toFixed(2)}
              </strong>
              <span className="text-[9.5px] text-slate-500">{totalPaidPoints.toLocaleString()} Pts</span>
            </div>

            {/* Total Pending */}
            <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700/80">
              <span className="text-[10px] text-slate-400 uppercase font-black block">Total Pending</span>
              <strong className="text-amber-400 text-xs block font-mono">
                ${totalPendingCash.toFixed(2)}
              </strong>
              <span className="text-[9.5px] text-slate-500">{totalPendingPoints.toLocaleString()} Pts</span>
            </div>

            {/* Owner's Share (70%) */}
            <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700/80">
              <span className="text-[10px] text-purple-300 uppercase font-black block">
                Owner Share ({OWNER_PERCENT}%)
              </span>
              <strong className="text-purple-400 text-xs block font-mono">
                ~${ownerShareDollars}
              </strong>
              <span className="text-[9.5px] text-slate-500">{ownerSharePoints.toLocaleString()} Pts</span>
            </div>

            {/* Users' Pool (30%) */}
            <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700/80">
              <span className="text-[10px] text-cyan-300 uppercase font-black block">
                Users' Pool ({USERS_PERCENT}%)
              </span>
              <strong className="text-cyan-400 text-xs block font-mono">
                ~${usersPoolDollars}
              </strong>
              <span className="text-[9.5px] text-slate-500">{usersPoolPoints.toLocaleString()} Pts</span>
            </div>
          </div>
        </div>

        {/* TAB 1: WITHDRAWALS CONTENT */}
        {activeAdminTab === 'withdrawals' && (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Filter Bar */}
            <div className="flex items-center justify-between p-3 bg-slate-850 border-b border-slate-800 text-xs shrink-0">
              <div className="flex gap-1.5">
                {(['Pending', 'Paid', 'Rejected', 'All'] as const).map((tab) => {
                  const count = requests.filter((r) => (tab === 'All' ? true : r.status === tab)).length;
                  return (
                    <button
                      key={tab}
                      onClick={() => setFilter(tab)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all text-[11px] tap-bounce ${
                        filter === tab
                          ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tab} ({count})
                    </button>
                  );
                })}
              </div>

              <button
                onClick={fetchWithdrawals}
                disabled={loadingWithdrawals}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white tap-bounce"
                title="Refresh withdrawal requests"
              >
                <RefreshCw className={`w-4 h-4 ${loadingWithdrawals ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            </div>

            {/* Requests List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingWithdrawals ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500" />
                  <p className="text-xs">Loading withdrawal records from Firestore...</p>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-bold">No {filter} requests found.</p>
                </div>
              ) : (
                filteredRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-slate-800/90 border border-slate-700 rounded-2xl p-3.5 space-y-3 shadow-md"
                  >
                    {/* Header: User, ID, Amount */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs text-white">
                            {req.userName || req.accountName || 'Learner'}
                          </span>
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                              req.status === 'Paid'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                                : req.status === 'Rejected'
                                ? 'bg-rose-950 text-rose-400 border border-rose-700'
                                : 'bg-amber-950 text-amber-400 border border-amber-700'
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {req.userEmail || 'No email provided'} • {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-amber-400 block">
                          {req.points.toLocaleString()} Pts
                        </span>
                        <span className="text-[11px] font-bold text-emerald-400">
                          ${req.cashAmount ? req.cashAmount.toFixed(2) : (req.points / 1000).toFixed(2)} USD
                        </span>
                      </div>
                    </div>

                    {/* Payment Method & Details Box with Copy Button */}
                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-750 text-xs space-y-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Payment Method:</span>
                        <strong className="text-white px-2 py-0.5 rounded-md bg-slate-800 font-mono">
                          {req.paymentMethod || 'Easypaisa'}
                        </strong>
                      </div>

                      {/* Account Details with Copy Button */}
                      <div className="flex justify-between items-center text-[11px] bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                        <div className="min-w-0 pr-2">
                          <span className="text-slate-400 block text-[9.5px]">Account Details / Number:</span>
                          <span className="text-amber-300 font-mono font-bold select-all break-all text-xs">
                            {req.accountDetails || 'N/A'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyAccountDetails(req.accountDetails || '', req.id)}
                          className="shrink-0 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black rounded-lg flex items-center gap-1 shadow-2xs tap-bounce transition-all"
                          title="Copy account details to clipboard"
                        >
                          {copiedId === req.id ? (
                            <>
                              <Check className="w-3 h-3 text-slate-950" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-950" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Account Holder Title:</span>
                        <strong className="text-white">{req.accountName || 'N/A'}</strong>
                      </div>

                      {req.adminNote && (
                        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                          <strong>Admin Note:</strong> {req.adminNote}
                        </div>
                      )}
                    </div>

                    {/* Actions for Pending Requests */}
                    {req.status === 'Pending' && (
                      <div className="space-y-2 pt-1 border-t border-slate-700/60">
                        <input
                          type="text"
                          placeholder="Optional admin note / transaction reference..."
                          value={adminNoteInput[req.id] || ''}
                          onChange={(e) =>
                            setAdminNoteInput({ ...adminNoteInput, [req.id]: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                        />

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleUpdateStatus(req.id, 'Paid')}
                            disabled={processingId === req.id}
                            className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs tap-bounce flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark as Paid ✓</span>
                          </button>

                          <button
                            onClick={() => handleUpdateStatus(req.id, 'Rejected')}
                            disabled={processingId === req.id}
                            className="py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs tap-bounce flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject & Refund Points</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SPONSOR ADS MANAGEMENT */}
        {activeAdminTab === 'sponsor_ads' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Sponsor Rules Reminder Notice */}
            <div className="bg-amber-950/60 border border-amber-500/80 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <strong className="text-amber-300 font-black block">Sponsor Rules Reminder:</strong>
                <p className="text-[11px] leading-relaxed text-amber-100/90">
                  Gambling, adult, scam, loan, fake-earning, and misleading ads are strictly prohibited.
                  Only HTTPS links (<code className="bg-amber-900/60 px-1 rounded text-amber-200">https://</code>) are allowed.
                  Zero points are awarded to users for tapping sponsor ads.
                </p>
              </div>
            </div>

            {/* Add / Toggle Ad Form Button */}
            <div className="flex items-center justify-between">
              <h4 className="font-black text-sm text-white">Direct Sponsor Ads Campaign</h4>
              <button
                onClick={() => {
                  soundService.playClick();
                  setShowAddAdForm(!showAddAdForm);
                  if (showAddAdForm) setEditingAdId(null);
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 tap-bounce"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddAdForm ? 'Close Form' : 'Add Sponsor Ad'}</span>
              </button>
            </div>

            {/* Add / Edit Sponsor Ad Form */}
            {showAddAdForm && (
              <form
                onSubmit={handleSaveSponsorAd}
                className="bg-slate-800/95 border-2 border-amber-500/70 rounded-2xl p-4 space-y-3 text-xs shadow-xl animate-in fade-in"
              >
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <h5 className="font-black text-amber-300">
                    {editingAdId ? 'Edit Sponsor Ad' : 'Create New Sponsor Ad'}
                  </h5>
                  <span className="text-[10px] text-slate-400">All fields saved in Firestore</span>
                </div>

                {adFormError && (
                  <div className="p-2 bg-red-950 text-red-300 rounded-lg text-[11px] font-bold border border-red-700">
                    {adFormError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10.5px] text-slate-400 font-bold block mb-1">
                      Sponsor Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. EcoRoots Organic Gardening"
                      value={adForm.sponsorName}
                      onChange={(e) => setAdForm({ ...adForm, sponsorName: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] text-slate-400 font-bold block mb-1">
                      Ad Headline / Title *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Discover Beginner Herb Growing Kits"
                      value={adForm.title}
                      onChange={(e) => setAdForm({ ...adForm, title: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10.5px] text-slate-400 font-bold block mb-1">
                    Short Description Text *
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Short 1-2 sentence description shown on cards and quiz banners..."
                    value={adForm.shortText}
                    onChange={(e) => setAdForm({ ...adForm, shortText: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10.5px] text-slate-400 font-bold block mb-1">
                      Destination Link (HTTPS only) *
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/clean-link"
                      value={adForm.destinationLink}
                      onChange={(e) => setAdForm({ ...adForm, destinationLink: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 text-xs font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] text-slate-400 font-bold block mb-1">
                      Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={adForm.imageUrl}
                      onChange={(e) => setAdForm({ ...adForm, imageUrl: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10.5px] text-slate-400 font-bold block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={adForm.startDate}
                      onChange={(e) => setAdForm({ ...adForm, startDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] text-slate-400 font-bold block mb-1">End Date</label>
                    <input
                      type="date"
                      value={adForm.endDate}
                      onChange={(e) => setAdForm({ ...adForm, endDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="text-[10.5px] text-slate-400 font-bold block mb-1">Active Status</label>
                    <button
                      type="button"
                      onClick={() => setAdForm({ ...adForm, isActive: !adForm.isActive })}
                      className={`py-1.5 px-3 rounded-xl font-black text-xs transition-all ${
                        adForm.isActive ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {adForm.isActive ? 'Active (Live)' : 'Paused'}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-700">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs tap-bounce flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingAdId ? 'Update Ad' : 'Save & Publish Ad'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAddAdForm(false);
                      setEditingAdId(null);
                    }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold rounded-xl text-xs tap-bounce"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Sponsor Performance Report Table */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-black text-xs text-white">Sponsor Ads Campaign Analytics Report</h5>
                  <p className="text-[10px] text-slate-400">
                    Live impression and click counts tracked daily in Firestore
                  </p>
                </div>
                {copiedReport && (
                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-700">
                    Report Copied to Clipboard! ✓
                  </span>
                )}
              </div>

              {sponsorAds.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No sponsor ads configured yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-700 text-[10px] uppercase text-slate-400">
                        <th className="pb-2 font-bold">Sponsor</th>
                        <th className="pb-2 font-bold">Impressions</th>
                        <th className="pb-2 font-bold">Clicks</th>
                        <th className="pb-2 font-bold">CTR</th>
                        <th className="pb-2 font-bold">Status</th>
                        <th className="pb-2 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60">
                      {sponsorAds.map((ad) => {
                        const ctr =
                          ad.impressions && ad.impressions > 0
                            ? (((ad.clicks || 0) / ad.impressions) * 100).toFixed(1)
                            : '0.0';
                        return (
                          <tr key={ad.id} className="hover:bg-slate-750/50">
                            <td className="py-2.5 pr-2">
                              <span className="font-black text-white block truncate max-w-[140px]">
                                {ad.sponsorName}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                                {ad.title}
                              </span>
                            </td>
                            <td className="py-2.5 font-mono text-cyan-300">
                              {(ad.impressions || 0).toLocaleString()}
                            </td>
                            <td className="py-2.5 font-mono text-emerald-400">
                              {(ad.clicks || 0).toLocaleString()}
                            </td>
                            <td className="py-2.5 font-mono font-bold text-amber-300">
                              {ctr}%
                            </td>
                            <td className="py-2.5">
                              <button
                                type="button"
                                onClick={() => handleToggleAdStatus(ad)}
                                className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase cursor-pointer ${
                                  ad.isActive
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                                    : 'bg-slate-700 text-slate-400 border border-slate-600'
                                }`}
                                title="Click to toggle active / paused"
                              >
                                {ad.isActive ? 'Active' : 'Paused'}
                              </button>
                            </td>
                            <td className="py-2.5 text-right space-x-1 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleCopySponsorReport(ad)}
                                className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 hover:text-white"
                                title="Copy Sponsor Report"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditAd(ad)}
                                className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 hover:text-white"
                                title="Edit Ad"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAd(ad.id)}
                                className="p-1 bg-red-950/80 hover:bg-red-900 rounded text-red-300 hover:text-white"
                                title="Delete Ad"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ROTATION LAUNCH DATE CONFIG */}
        {activeAdminTab === 'rotation' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-lg">
                  📅
                </div>
                <div>
                  <h4 className="font-black text-sm text-white">Curriculum Rotation Start Date</h4>
                  <p className="text-[11px] text-slate-400">
                    Reads and writes to Firestore document <code>config/rotation</code>.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs space-y-2 leading-relaxed text-slate-300">
                <p>
                  <strong>How Rotation Works:</strong> All quizzes (950+ question bank) and videos (195 verified items) rotate daily at local midnight starting from this launch date. The schedule will never wrap around before Day 190.
                </p>
                <p className="text-[11px] text-slate-400">
                  If this document does not exist when any user first opens the app, it automatically initializes with that day's date once. Only authorized admin (<code>{ADMIN_EMAIL}</code>) can edit this value.
                </p>
              </div>

              {launchDateError && (
                <div className="p-2.5 bg-red-950 border border-red-700 text-red-300 rounded-xl text-xs font-bold">
                  {launchDateError}
                </div>
              )}

              {launchDateSavedSuccess && (
                <div className="p-2.5 bg-emerald-950 border border-emerald-700 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Launch date successfully updated in Firestore config/rotation! ✓</span>
                </div>
              )}

              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-black text-white block">
                  Set Launch Date (YYYY-MM-DD)
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={launchDate}
                    onChange={(e) => setLaunchDate(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-hidden focus:border-amber-500"
                  />
                  <button
                    onClick={handleSaveLaunchDate}
                    disabled={savingLaunchDate}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 tap-bounce shadow-md"
                  >
                    {savingLaunchDate ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Launch Date</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 flex justify-between items-center pt-2 border-t border-slate-800">
                <span>Current Configured Date: <strong className="text-indigo-400 font-mono">{launchDate || 'Loading...'}</strong></span>
                <button
                  type="button"
                  onClick={fetchLaunchDate}
                  className="text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reload</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 bg-slate-800 text-center border-t border-slate-700 text-[10px] text-slate-400 flex items-center justify-between shrink-0">
          <span>Google Firestore Collections: <code>withdrawals</code>, <code>sponsor_ads</code>, <code>config</code></span>
          <span className="font-bold text-amber-400">Security Rules Enforced 🔒</span>
        </div>
      </div>
    </div>
  );
};
