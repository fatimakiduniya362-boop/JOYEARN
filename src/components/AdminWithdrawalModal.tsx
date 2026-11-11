import React, { useState, useEffect, useMemo } from 'react';
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
  MousePointer,
  Mail,
  Phone,
  Inbox,
  Building,
  Globe,
  Film,
  ArrowUp,
  ArrowDown,
  Video,
  Target,
  Sliders,
  ShieldAlert,
  Ban
} from 'lucide-react';
import {
  VlogItem,
  getAdminPendingVlogs,
  getAdminReportedVlogs,
  approveVlog,
  rejectVlog,
  deleteVlog,
  blockCreatorGlobally,
} from '../services/vlogService';
import {
  adMobManager,
  TodayAdImpressions,
} from '../services/adMobService';
import { DynamicAdsConfig } from '../config/adsConfig';
import { WithdrawalRequest, SponsorAd, SponsorEnquiry } from '../types';
import {
  loadAllWithdrawalsForAdmin,
  loadPaginatedWithdrawalsForAdmin,
  updateWithdrawalStatus
} from '../services/firestoreService';
import {
  loadAllSponsorAdsForAdmin,
  createSponsorAd,
  updateSponsorAd,
  deleteSponsorAd,
  loadAllSponsorEnquiriesForAdmin,
  markSponsorEnquiryContacted,
  isSponsorAdRunning
} from '../services/sponsorAdsService';
import {
  AdminVideo,
  ParsedBulkVideoResult,
  parseBulkVideoLines,
  loadAllFirestoreVideos,
  saveBulkFirestoreVideos,
  addSingleFirestoreVideo,
  updateFirestoreVideo,
  toggleFirestoreVideoApproved,
  deleteFirestoreVideo,
  extractYouTubeId
} from '../services/videoAdminService';
import { SponsorAdCard } from './SponsorAdCard';
import {
  AdminAppSettingsPanel,
  AdminPointsSettingsPanel,
  AdminWalletSettingsPanel,
  AdminFeatureSwitchesPanel,
  AdminSponsorPackagesPanel,
  AdminUsersManagerPanel,
  AdminSponsorRequestsPanel,
  AdminLearnManagerPanel,
} from './AdminSettingsComponents';
import { appSettingsService } from '../services/appSettingsService';
import {
  getLaunchDateFromFirestore,
  updateLaunchDateInFirestore
} from '../services/rotationConfigService';
import {
  OWNER_PERCENT,
  USERS_PERCENT,
  PAYOUT_FEE_PERCENT,
  POOL_CARRY_OVER,
  POINTS_PER_DOLLAR,
  MANDATORY_REWARDS_NOTICE,
  POOL_REVENUE_NOTICE,
} from '../config/paymentConfig';
import {
  loadAllMonthlyRevenues,
  saveMonthlyNetRevenue,
  computeMonthlyPoolMetrics,
  validatePayoutFromPool,
  calculatePayoutFee,
} from '../services/monthlyPoolService';
import { SPONSOR_PACKAGES, getSponsorPackageByName } from '../data/sponsorPackages';
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
  const [activeAdminTab, setActiveAdminTab] = useState<
    | 'withdrawals'
    | 'app_settings'
    | 'points_settings'
    | 'wallet_settings'
    | 'features'
    | 'packages'
    | 'sponsor_requests'
    | 'sponsor_ads'
    | 'users'
    | 'videos'
    | 'learn'
    | 'rotation'
    | 'vlogs'
    | 'enquiries'
    | 'revenue_target'
  >('withdrawals');

  // Admin Vlogs Moderation State
  const [pendingVlogs, setPendingVlogs] = useState<VlogItem[]>([]);
  const [reportedVlogs, setReportedVlogs] = useState<VlogItem[]>([]);
  const [loadingVlogs, setLoadingVlogs] = useState(false);
  const [rejectReasonInput, setRejectReasonInput] = useState<Record<string, string>>({});
  const [vlogActionNotice, setVlogActionNotice] = useState<string | null>(null);
  const [vlogSubTab, setVlogSubTab] = useState<'pending' | 'reported'>('pending');

  // Revenue Target State
  const [dailyRevTarget, setDailyRevTarget] = useState<number>(100);
  const [estimatedEcpm, setEstimatedEcpm] = useState<number>(2.00);
  const [adsPerUser, setAdsPerUser] = useState<number>(8);
  const [realDau, setRealDau] = useState<number>(250);
  const [todayImpressions, setTodayImpressions] = useState<TodayAdImpressions>(() => adMobManager.getTodayImpressions());
  const [dynamicConfig, setDynamicConfig] = useState<DynamicAdsConfig>(() => adMobManager.getConfig());
  const [savingDynamicConfig, setSavingDynamicConfig] = useState(false);
  const [configSaveNotice, setConfigSaveNotice] = useState<string | null>(null);

  const fetchAdminVlogs = async () => {
    setLoadingVlogs(true);
    try {
      const [pending, reported] = await Promise.all([
        getAdminPendingVlogs(),
        getAdminReportedVlogs(),
      ]);
      setPendingVlogs(pending);
      setReportedVlogs(reported);
    } catch (e) {
      console.warn('Failed to fetch admin vlogs:', e);
    } finally {
      setLoadingVlogs(false);
    }
  };

  // Admin Videos State
  const [adminVideos, setAdminVideos] = useState<AdminVideo[]>([]);
  const [loadingAdminVideos, setLoadingAdminVideos] = useState(false);
  const [bulkVideoText, setBulkVideoText] = useState('');
  const [parsedBulkResults, setParsedBulkResults] = useState<ParsedBulkVideoResult[]>([]);
  const [adminVideoFilter, setAdminVideoFilter] = useState<string>('All');
  const [savingBulkVideos, setSavingBulkVideos] = useState(false);
  const [bulkSaveNotice, setBulkSaveNotice] = useState<string | null>(null);

  // Single Video Add/Edit form state
  const [showSingleVideoForm, setShowSingleVideoForm] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [singleVideoCategory, setSingleVideoCategory] = useState('Science');
  const [singleVideoTitle, setSingleVideoTitle] = useState('');
  const [singleVideoLink, setSingleVideoLink] = useState('');
  const [singleVideoOrder, setSingleVideoOrder] = useState<number>(1);

  // Ad Placement Preview Modal State
  const [previewAd, setPreviewAd] = useState<SponsorAd | null>(null);
  const [previewPlacement, setPreviewPlacement] = useState<'home' | 'video_list' | 'quiz'>('home');

  // Withdrawals state
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);
  const [hasMoreWithdrawals, setHasMoreWithdrawals] = useState(false);
  const [lastWithdrawalCreatedAt, setLastWithdrawalCreatedAt] = useState<string | undefined>(undefined);
  const [loadingMoreWithdrawals, setLoadingMoreWithdrawals] = useState(false);
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Paid' | 'Rejected'>('Pending');
  const [adminNoteInput, setAdminNoteInput] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Monthly Revenue & Pool Management State
  const [allRevenues, setAllRevenues] = useState<Record<string, number>>({});
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [netRevenueInput, setNetRevenueInput] = useState<string>('1000');
  const [savingRevenue, setSavingRevenue] = useState(false);
  const [revenueSaveNotice, setRevenueSaveNotice] = useState<string | null>(null);
  const [poolRefusalError, setPoolRefusalError] = useState<string | null>(null);

  // Sponsor Ads state
  const [sponsorAds, setSponsorAds] = useState<SponsorAd[]>([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [showAddAdForm, setShowAddAdForm] = useState(false);

  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  // Sponsor Enquiries state
  const [enquiries, setEnquiries] = useState<SponsorEnquiry[]>([]);
  const [loadingEnquiries, setLoadingEnquiries] = useState(false);
  const [copiedEnquiryKey, setCopiedEnquiryKey] = useState<string | null>(null);
  const [contactingId, setContactingId] = useState<string | null>(null);

  // Sponsor Ad Form fields
  const [adForm, setAdForm] = useState({
    sponsorName: '',
    imageUrl: '',
    title: '',
    shortText: '',
    destinationLink: 'https://',
    package: 'Starter',
    packageImpressions: 2000,
    packageMinDays: 7,
    languageTarget: 'both' as 'English' | 'Urdu' | 'both',
    paid: 'yes' as 'yes' | 'no',
    amountPaid: 5,
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

  const [ownerPasswordInput, setOwnerPasswordInput] = useState('');
  const [ownerPasswordError, setOwnerPasswordError] = useState<string | null>(null);
  const [isUnlockedWithPassword, setIsUnlockedWithPassword] = useState(() => {
    try {
      return localStorage.getItem('joyearn_owner_unlocked') === 'true';
    } catch {
      return false;
    }
  });

  const handleUnlockWithPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = ownerPasswordInput.trim().toLowerCase();
    if (clean === 'joyearn2026' || clean === 'owner2026' || clean === 'fatima362') {
      soundService.playFanfare();
      setIsUnlockedWithPassword(true);
      try {
        localStorage.setItem('joyearn_owner_unlocked', 'true');
        localStorage.setItem('joyearn_admin_override', 'true');
      } catch {}
      setOwnerPasswordError(null);
    } else {
      soundService.playWrong();
      setOwnerPasswordError('Incorrect owner password. Default is: joyearn2026');
    }
  };

  const activeOwnerEmail = (appSettingsService.getSettings().general?.ownerEmail || ADMIN_EMAIL).trim().toLowerCase();
  const isOwnerEmailMatch =
    Boolean(currentUserEmail && (
      currentUserEmail.trim().toLowerCase() === activeOwnerEmail ||
      currentUserEmail.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()
    ));

  const isAdmin = isOwnerEmailMatch || isUnlockedWithPassword;

  // Fetch withdrawals with pagination (50 items per query)
  const fetchWithdrawals = async () => {
    setLoadingWithdrawals(true);
    const result = await loadPaginatedWithdrawalsForAdmin(50);
    setRequests(result.requests);
    setHasMoreWithdrawals(result.hasMore);
    setLastWithdrawalCreatedAt(result.lastCreatedAt);
    setLoadingWithdrawals(false);
  };

  const handleLoadMoreWithdrawals = async () => {
    if (loadingMoreWithdrawals || !hasMoreWithdrawals) return;
    soundService.playClick();
    setLoadingMoreWithdrawals(true);
    const result = await loadPaginatedWithdrawalsForAdmin(50, lastWithdrawalCreatedAt);
    setRequests((prev) => [...prev, ...result.requests]);
    setHasMoreWithdrawals(result.hasMore);
    setLastWithdrawalCreatedAt(result.lastCreatedAt);
    setLoadingMoreWithdrawals(false);
  };

  // Fetch sponsor ads
  const fetchSponsorAds = async () => {
    setLoadingAds(true);
    const data = await loadAllSponsorAdsForAdmin();
    setSponsorAds(data);
    setLoadingAds(false);
  };

  // Fetch sponsor enquiries
  const fetchEnquiries = async () => {
    setLoadingEnquiries(true);
    const data = await loadAllSponsorEnquiriesForAdmin();
    setEnquiries(data);
    setLoadingEnquiries(false);
  };

  // Fetch rotation launch date
  const fetchLaunchDate = async () => {
    setLoadingLaunchDate(true);
    const date = await getLaunchDateFromFirestore();
    setLaunchDate(date);
    setLoadingLaunchDate(false);
  };

  // Fetch monthly net revenues
  const fetchRevenues = async () => {
    const revs = await loadAllMonthlyRevenues();
    setAllRevenues(revs);
    if (revs[selectedMonth] !== undefined) {
      setNetRevenueInput(String(revs[selectedMonth]));
    }
  };

  // Sync net revenue input when selectedMonth changes
  useEffect(() => {
    if (allRevenues[selectedMonth] !== undefined) {
      setNetRevenueInput(String(allRevenues[selectedMonth]));
    } else {
      setNetRevenueInput('1000');
    }
    setPoolRefusalError(null);
  }, [selectedMonth, allRevenues]);

  // Fetch admin videos from Firestore
  const fetchAdminVideos = async () => {
    setLoadingAdminVideos(true);
    try {
      const list = await loadAllFirestoreVideos();
      setAdminVideos(list);
    } catch (err) {
      console.warn('Error fetching admin videos:', err);
    } finally {
      setLoadingAdminVideos(false);
    }
  };

  // Live parse bulk video lines on input change
  useEffect(() => {
    if (!bulkVideoText.trim()) {
      setParsedBulkResults([]);
      return;
    }
    const results = parseBulkVideoLines(bulkVideoText);
    setParsedBulkResults(results);
  }, [bulkVideoText]);

  // Save valid bulk videos to Firestore
  const handleSaveBulkVideos = async () => {
    const valid = parsedBulkResults.filter((r) => r.isValid && r.videoId);
    if (valid.length === 0) {
      setBulkSaveNotice('No valid video lines found to save. Please fix any red errors in the preview.');
      return;
    }
    setSavingBulkVideos(true);
    setBulkSaveNotice(null);
    soundService.playClick();
    try {
      const res = await saveBulkFirestoreVideos(
        valid.map((v, i) => ({
          category: v.category,
          title: v.title,
          videoId: v.videoId!,
          order: i + 1,
        }))
      );
      soundService.playFanfare();
      setBulkSaveNotice(`✓ Successfully saved ${res.addedCount} videos to Firestore collection 'videos'!`);
      setBulkVideoText('');
      setParsedBulkResults([]);
      await fetchAdminVideos();
      setTimeout(() => setBulkSaveNotice(null), 5000);
    } catch (err: any) {
      setBulkSaveNotice(`Error saving bulk videos: ${err?.message || 'Firestore write error'}`);
    } finally {
      setSavingBulkVideos(false);
    }
  };

  // Add or update single video in Firestore
  const handleSaveSingleVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    const vId = extractYouTubeId(singleVideoLink);
    if (!vId) {
      soundService.playWrong();
      try {
        alert('Please enter a valid YouTube link or 11-character video ID.');
      } catch {}
      return;
    }
    soundService.playClick();
    try {
      if (editingVideoId) {
        await updateFirestoreVideo(editingVideoId, {
          category: singleVideoCategory.trim(),
          title: singleVideoTitle.trim(),
          videoId: vId,
          order: singleVideoOrder,
        });
      } else {
        await addSingleFirestoreVideo({
          category: singleVideoCategory.trim(),
          title: singleVideoTitle.trim(),
          videoId: vId,
          order: singleVideoOrder,
        });
      }
      soundService.playFanfare();
      setShowSingleVideoForm(false);
      setEditingVideoId(null);
      setSingleVideoTitle('');
      setSingleVideoLink('');
      await fetchAdminVideos();
    } catch (err: any) {
      try {
        alert(`Error saving video: ${err?.message || 'Write failed'}`);
      } catch {}
    }
  };

  const handleToggleVideoApproved = async (v: AdminVideo) => {
    soundService.playClick();
    const next = await toggleFirestoreVideoApproved(v.id, v.approved !== false);
    setAdminVideos((prev) => prev.map((item) => (item.id === v.id ? { ...item, approved: next } : item)));
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm('Are you sure you want to delete this video from Firestore?')) return;
    soundService.playClick();
    await deleteFirestoreVideo(id);
    setAdminVideos((prev) => prev.filter((item) => item.id !== id));
  };

  const handleMoveVideoOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= adminVideos.length) return;
    soundService.playClick();

    const current = adminVideos[index];
    const target = adminVideos[targetIndex];

    const currentOrder = current.order || index + 1;
    const targetOrder = target.order || targetIndex + 1;

    await updateFirestoreVideo(current.id, { order: targetOrder });
    await updateFirestoreVideo(target.id, { order: currentOrder });

    await fetchAdminVideos();
  };

  // Sponsor Ad Status Badge Helper
  const getSponsorAdStatusBadge = (ad: SponsorAd) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const pkg = ad.package ? getSponsorPackageByName(ad.package) : undefined;
    const targetImpressions = ad.packageImpressions || pkg?.impressions;
    const minDays = ad.packageMinDays !== undefined ? ad.packageMinDays : (pkg?.minDays || 0);
    const startMs = ad.startDate ? new Date(ad.startDate).getTime() : (ad.createdAt ? new Date(ad.createdAt).getTime() : Date.now());
    const elapsedDays = Math.max(0, Math.floor((Date.now() - startMs) / (1000 * 60 * 60 * 24)));
    const delivered = ad.impressions || 0;

    if ((targetImpressions && delivered >= targetImpressions && elapsedDays >= minDays) || (ad.endDate && ad.endDate < todayStr)) {
      return {
        status: 'Finished',
        label: 'Finished',
        badgeClass: 'bg-purple-950 text-purple-300 border-purple-800',
      };
    }

    if (!ad.paid || ad.paid === 'no') {
      return {
        status: 'Waiting for payment',
        label: 'Waiting for payment',
        badgeClass: 'bg-amber-950 text-amber-300 border-amber-700 animate-pulse',
      };
    }

    if (!ad.isActive) {
      return {
        status: 'Paused',
        label: 'Paused',
        badgeClass: 'bg-slate-800 text-slate-400 border-slate-750',
      };
    }

    if (isSponsorAdRunning(ad)) {
      return {
        status: 'Running',
        label: 'Running',
        badgeClass: 'bg-emerald-950 text-emerald-300 border-emerald-700',
      };
    }

    return {
      status: 'Draft',
      label: 'Draft',
      badgeClass: 'bg-blue-950 text-blue-300 border-blue-700',
    };
  };

  useEffect(() => {
    if (isOpen) {
      fetchWithdrawals();
      fetchRevenues();
      fetchSponsorAds();
      fetchEnquiries();
      fetchLaunchDate();
      fetchAdminVideos();
      fetchAdminVlogs();
    }
  }, [isOpen]);

  // Handle saving net revenue for selected month (Admin only)
  const handleSaveNetRevenue = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rev = parseFloat(netRevenueInput);
    if (isNaN(rev) || rev < 0) {
      setRevenueSaveNotice('Please enter a valid positive revenue amount in USD.');
      return;
    }
    try {
      setSavingRevenue(true);
      soundService.playClick();
      await saveMonthlyNetRevenue(selectedMonth, rev, currentUserEmail || ADMIN_EMAIL);
      setAllRevenues((prev) => ({ ...prev, [selectedMonth]: rev }));
      setRevenueSaveNotice(`✓ Saved $${rev.toFixed(2)} USD net revenue for ${selectedMonth}! Users' pool updated.`);
      setPoolRefusalError(null);
      soundService.playFanfare();
      setTimeout(() => setRevenueSaveNotice(null), 3500);
    } catch (err: any) {
      setRevenueSaveNotice(err.message || 'Error saving revenue');
    } finally {
      setSavingRevenue(false);
    }
  };

  // Copy helper for sponsor enquiry fields
  const handleCopyEnquiryField = (text: string, key: string) => {
    soundService.playClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedEnquiryKey(key);
      setTimeout(() => setCopiedEnquiryKey(null), 2500);
    }
  };

  // Mark sponsor enquiry contacted
  const handleMarkEnquiryContacted = async (id: string) => {
    soundService.playClick();
    setContactingId(id);
    try {
      await markSponsorEnquiryContacted(id);
      setEnquiries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: 'contacted' as const } : e))
      );
      soundService.playFanfare();
    } finally {
      setContactingId(null);
    }
  };

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
  // CRITICAL REQUIREMENT: User payouts are strictly paid from the users' pool (30%)
  // and NEVER from the owner's share (70%). Refuse if remaining pool would become negative.
  const handleUpdateStatus = async (
    requestId: string,
    newStatus: 'Paid' | 'Rejected'
  ) => {
    soundService.playClick();
    setPoolRefusalError(null);

    const targetReq = requests.find((r) => r.id === requestId);
    if (!targetReq) return;

    // STRICT POOL VALIDATION ON PAYOUT
    if (newStatus === 'Paid') {
      const validation = validatePayoutFromPool(targetReq, requests, allRevenues);
      if (!validation.allowed) {
        setPoolRefusalError(validation.errorMessage || 'Cannot mark as Paid: insufficient users pool balance.');
        return;
      }
    }

    setProcessingId(requestId);
    const note =
      adminNoteInput[requestId] ||
      (newStatus === 'Paid' ? 'Payment processed' : 'Declined per terms');

    await updateWithdrawalStatus(requestId, newStatus, note);
    soundService.playFanfare();
    setProcessingId(null);
    await fetchWithdrawals();
    await fetchRevenues();
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
        package: 'Starter',
        packageImpressions: 2000,
        packageMinDays: 7,
        languageTarget: 'both',
        paid: 'yes',
        amountPaid: 5,
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
    const pkg = ad.package ? getSponsorPackageByName(ad.package) : undefined;
    setAdForm({
      sponsorName: ad.sponsorName || '',
      imageUrl: ad.imageUrl || '',
      title: ad.title || '',
      shortText: ad.shortText || '',
      destinationLink: ad.destinationLink || 'https://',
      package: ad.package || 'Starter',
      packageImpressions: ad.packageImpressions || pkg?.impressions || 2000,
      packageMinDays: ad.packageMinDays !== undefined ? ad.packageMinDays : (pkg?.minDays || 7),
      languageTarget: ad.languageTarget || 'both',
      paid: ad.paid || 'yes',
      amountPaid: ad.amountPaid !== undefined ? ad.amountPaid : (pkg?.priceUsd || 5),
      startDate: ad.startDate || new Date().toISOString().slice(0, 10),
      endDate: ad.endDate || '2026-12-31',
      isActive: ad.isActive ?? true,
    });
    setShowAddAdForm(true);
  };

  // Copy sponsor performance report (delivering against purchased impressions)
  const handleCopySponsorReport = (ad: SponsorAd) => {
    soundService.playClick();
    const pkg = ad.package ? getSponsorPackageByName(ad.package) : undefined;
    const purchased = ad.packageImpressions || pkg?.impressions || 2000;
    const delivered = ad.impressions || 0;
    const minDays = ad.packageMinDays !== undefined ? ad.packageMinDays : (pkg?.minDays || 7);
    const startMs = ad.startDate ? new Date(ad.startDate).getTime() : Date.now();
    const elapsedDays = Math.max(0, Math.floor((Date.now() - startMs) / (1000 * 60 * 60 * 24)));
    const percentDelivered = purchased > 0 ? Math.round((delivered / purchased) * 100) : 0;
    const isCompleted = delivered >= purchased && elapsedDays >= minDays;

    const ctr =
      ad.impressions && ad.impressions > 0
        ? (((ad.clicks || 0) / ad.impressions) * 100).toFixed(2)
        : '0.00';

    const reportText = [
      `📊 SPONSOR AD CAMPAIGN PERFORMANCE REPORT`,
      `Sponsor: ${ad.sponsorName}`,
      `Title: ${ad.title}`,
      `Package: ${ad.package || 'Starter'} ($${ad.amountPaid ?? pkg?.priceUsd ?? 5} USD)`,
      `Paid Status: ${ad.paid === 'yes' ? 'Yes (Paid in full)' : 'No (Payment pending)'}`,
      `Language Target: ${ad.languageTarget || 'both (English & Urdu)'}`,
      `Destination: ${ad.destinationLink}`,
      `Campaign Window: ${ad.startDate || 'N/A'} to ${ad.endDate || 'N/A'} (Minimum ${minDays} days)`,
      `Active Elapsed Days: ${elapsedDays} days`,
      `Purchased Impressions: ${purchased.toLocaleString()}`,
      `Delivered Impressions: ${delivered.toLocaleString()} (${percentDelivered}% delivered)`,
      `Remaining Impressions: ${Math.max(0, purchased - delivered).toLocaleString()}`,
      `Total Clicks: ${(ad.clicks || 0).toLocaleString()}`,
      `Click-Through Rate (CTR): ${ctr}%`,
      `Campaign Status: ${isCompleted ? 'Delivered & Completed (Auto-stopped)' : (ad.isActive && ad.paid === 'yes' ? 'Active & Running' : 'Paused / Unpaid')}`,
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

  // Monthly Financial & Pool Summary Calculations using computeMonthlyPoolMetrics
  const monthlyMetrics = computeMonthlyPoolMetrics(selectedMonth, requests, allRevenues);

  const filteredRequests = requests.filter((r) => {
    if (filter === 'All') return true;
    return r.status === filter;
  });

  const adminVideoCategories = useMemo(() => {
    const set = new Set<string>();
    set.add('All');
    adminVideos.forEach((v) => {
      if (v.category) set.add(v.category.trim());
    });
    return Array.from(set);
  }, [adminVideos]);

  const filteredAdminVideos = useMemo(() => {
    if (adminVideoFilter === 'All') return adminVideos;
    return adminVideos.filter((v) => v.category === adminVideoFilter);
  }, [adminVideos, adminVideoFilter]);

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

        {/* Top Navigation Tabs: Comprehensive Owner Controls */}
        <div className="flex overflow-x-auto border-b border-slate-800 bg-slate-850 text-xs font-black shrink-0 whitespace-nowrap scrollbar-none">
          <button
            onClick={() => {
              soundService.playClick();
              setActiveAdminTab('app_settings');
            }}
            className={`px-3.5 py-3 text-center transition-all flex items-center justify-center gap-1.5 border-b-2 shrink-0 ${
              activeAdminTab === 'app_settings'
                ? 'border-purple-500 text-purple-400 bg-slate-800/90 font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            <span>App Settings</span>
          </button>

          <button
            onClick={() => {
              soundService.playClick();
              setActiveAdminTab('points_settings');
            }}
            className={`px-3.5 py-3 text-center transition-all flex items-center justify-center gap-1.5 border-b-2 shrink-0 ${
              activeAdminTab === 'points_settings'
                ? 'border-amber-500 text-amber-400 bg-slate-800/90 font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>⭐ Points</span>
          </button>

          <button
            onClick={() => {
              soundService.playClick();
              setActiveAdminTab('wallet_settings');
            }}
            className={`px-3.5 py-3 text-center transition-all flex items-center justify-center gap-1.5 border-b-2 shrink-0 ${
              activeAdminTab === 'wallet_settings'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/90 font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>💳 Wallet</span>
          </button>

          <button
            onClick={() => {
              soundService.playClick();
              setActiveAdminTab('features');
            }}
            className={`px-3.5 py-3 text-center transition-all flex items-center justify-center gap-1.5 border-b-2 shrink-0 ${
              activeAdminTab === 'features'
                ? 'border-sky-500 text-sky-400 bg-slate-800/90 font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>🎛️ Feature Switches</span>
          </button>

          <button
            onClick={() => {
              soundService.playClick();
              setActiveAdminTab('packages');
            }}
            className={`px-3.5 py-3 text-center transition-all flex items-center justify-center gap-1.5 border-b-2 shrink-0 ${
              activeAdminTab === 'packages'
                ? 'border-purple-500 text-purple-400 bg-slate-800/90 font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>📦 Sponsor Packages</span>
          </button>

          <button
            onClick={() => {
              soundService.playClick();
              setActiveAdminTab('sponsor_requests');
            }}
            className={`px-3.5 py-3 text-center transition-all flex items-center justify-center gap-1.5 border-b-2 shrink-0 ${
              activeAdminTab === 'sponsor_requests'
                ? 'border-amber-500 text-amber-400 bg-slate-800/90 font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>📩 Sponsor Requests</span>
          </button>

          <button
            onClick={() => {
              soundService.playClick();
              setActiveAdminTab('sponsor_ads');
            }}
            className={`px-3.5 py-3 text-center transition-all flex items-center justify-center gap-1.5 border-b-2 shrink-0 ${
              activeAdminTab === 'sponsor_ads'
                ? 'border-amber-500 text-amber-400 bg-slate-800/90 font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Sponsors ({sponsorAds.length})</span>
          </button>

          <button
            onClick={() => {
              soundService.playClick();
              setActiveAdminTab('withdrawals');
            }}
            className={`px-3.5 py-3 text-center transition-all flex items-center justify-center gap-1.5 border-b-2 shrink-0 ${
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
              setActiveAdminTab('users');
            }}
            className={`px-3.5 py-3 text-center transition-all flex items-center justify-center gap-1.5 border-b-2 shrink-0 ${
              activeAdminTab === 'users'
                ? 'border-amber-500 text-amber-400 bg-slate-800/90 font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>👥 Users</span>
          </button>

          <button
            onClick={() => {
              soundService.playClick();
              setActiveAdminTab('videos');
            }}
            className={`px-3.5 py-3 text-center transition-all flex items-center justify-center gap-1.5 border-b-2 shrink-0 ${
              activeAdminTab === 'videos'
                ? 'border-amber-500 text-amber-400 bg-slate-800/90 font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Videos ({adminVideos.length})</span>
          </button>

          <button
            onClick={() => {
              soundService.playClick();
              setActiveAdminTab('learn');
            }}
            className={`px-3.5 py-3 text-center transition-all flex items-center justify-center gap-1.5 border-b-2 shrink-0 ${
              activeAdminTab === 'learn'
                ? 'border-amber-500 text-amber-400 bg-slate-800/90 font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>📚 Learn</span>
          </button>

          <button
            onClick={() => {
              soundService.playClick();
              fetchAdminVlogs();
              setActiveAdminTab('vlogs');
            }}
            className={`px-3.5 py-3 text-center transition-all flex items-center justify-center gap-1.5 border-b-2 shrink-0 ${
              activeAdminTab === 'vlogs'
                ? 'border-amber-500 text-amber-400 bg-slate-800/90 font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Vlogs ({pendingVlogs.length})</span>
          </button>
        </div>

        {/* MONTHLY POOL & NET REVENUE CONTROLS (Always visible in Admin portal) */}
        <div className="p-3 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 shrink-0 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Month Selector */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
              <label className="text-[11px] font-black text-slate-300 uppercase">
                Active Month:
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  soundService.playClick();
                  setSelectedMonth(e.target.value);
                }}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-amber-300 focus:outline-hidden focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => {
                  soundService.playClick();
                  setSelectedMonth(new Date().toISOString().slice(0, 7));
                }}
                className="text-[10px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md font-bold tap-bounce"
              >
                Current
              </button>
            </div>

            {/* Net Revenue Input Form for this month */}
            <form onSubmit={handleSaveNetRevenue} className="flex items-center gap-1.5 flex-1 sm:justify-end">
              <span className="text-[11px] text-slate-300 font-bold whitespace-nowrap">Net Revenue:</span>
              <div className="relative flex items-center">
                <span className="absolute left-2 text-xs text-slate-400 font-mono">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={netRevenueInput}
                  onChange={(e) => setNetRevenueInput(e.target.value)}
                  placeholder="0.00"
                  className="w-24 pl-5 pr-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>
              <button
                type="submit"
                disabled={savingRevenue}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-lg flex items-center gap-1 tap-bounce shadow-xs transition-all"
                title="Save Net Revenue for this month"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingRevenue ? 'Saving...' : 'Set'}</span>
              </button>
            </form>
          </div>

          {/* Revenue Save Success or Error feedback */}
          {revenueSaveNotice && (
            <div className="text-[10.5px] font-bold text-amber-300 bg-amber-950/40 border border-amber-600/40 px-2.5 py-1 rounded-lg">
              {revenueSaveNotice}
            </div>
          )}

          {/* 8 CRITICAL MONTHLY POOL METRICS CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            {/* 1. Net revenue entered */}
            <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700/80">
              <span className="text-[9.5px] text-slate-400 uppercase font-black block">Funds Received</span>
              <strong className="text-white text-xs block font-mono">
                ${monthlyMetrics.fundsReceived.toFixed(2)}
              </strong>
              <span className="text-[9px] text-slate-500">Entered by admin</span>
            </div>

            {/* 2. Owner share */}
            <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700/80">
              <span className="text-[9.5px] text-purple-300 uppercase font-black block">
                Owner Share
              </span>
              <strong className="text-purple-400 text-xs block font-mono">
                ${monthlyMetrics.ownerShare.toFixed(2)}
              </strong>
              <span className="text-[9px] text-slate-500">Platform operations</span>
            </div>

            {/* 3. Users' pool */}
            <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700/80">
              <span className="text-[9.5px] text-cyan-300 uppercase font-black block">
                Disbursable Pool
              </span>
              <strong className="text-cyan-400 text-xs block font-mono">
                ${monthlyMetrics.usersPool.toFixed(2)}
              </strong>
              <span className="text-[9px] text-slate-500">Monthly allocation</span>
            </div>

            {/* 4. Carried-over balance */}
            <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700/80">
              <span className="text-[9.5px] text-blue-300 uppercase font-black block">
                Carried Over
              </span>
              <strong className="text-blue-400 text-xs block font-mono">
                ${monthlyMetrics.carriedOver.toFixed(2)}
              </strong>
              <span className="text-[9px] text-slate-500">{POOL_CARRY_OVER ? 'From prior months' : 'Carry disabled'}</span>
            </div>

            {/* 5. Total Available Pool */}
            <div className="bg-slate-800/90 p-2 rounded-xl border border-cyan-700/60 bg-cyan-950/20">
              <span className="text-[9.5px] text-cyan-300 uppercase font-black block">Total Avail Pool</span>
              <strong className="text-cyan-300 text-xs block font-mono">
                ${monthlyMetrics.totalAvailablePool.toFixed(2)}
              </strong>
              <span className="text-[9px] text-slate-400">Pool + Carried</span>
            </div>

            {/* 6. Total Paid */}
            <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700/80">
              <span className="text-[9.5px] text-emerald-400 uppercase font-black block">Total Paid</span>
              <strong className="text-emerald-400 text-xs block font-mono">
                ${monthlyMetrics.totalPaid.toFixed(2)}
              </strong>
              <span className="text-[9px] text-slate-500">From users pool</span>
            </div>

            {/* 7. Total Pending */}
            <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700/80">
              <span className="text-[9.5px] text-amber-300 uppercase font-black block">Total Pending</span>
              <strong className="text-amber-400 text-xs block font-mono">
                ${monthlyMetrics.totalPending.toFixed(2)}
              </strong>
              <span className="text-[9px] text-slate-500">Awaiting review</span>
            </div>

            {/* 8. Remaining Pool Balance */}
            <div className={`p-2 rounded-xl border ${
              monthlyMetrics.remainingPool > 0
                ? 'bg-emerald-950/30 border-emerald-500/60'
                : 'bg-rose-950/40 border-rose-500/80'
            }`}>
              <span className="text-[9.5px] uppercase font-black block text-slate-300">Remaining Pool</span>
              <strong className={`text-xs block font-mono ${
                monthlyMetrics.remainingPool > 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                ${monthlyMetrics.remainingPool.toFixed(2)}
              </strong>
              <span className="text-[9px] text-slate-400">
                {monthlyMetrics.remainingPool > 0 ? 'Solvent' : 'Exhausted'}
              </span>
            </div>
          </div>
        </div>

        {/* POOL REFUSAL WARNING BANNER */}
        {poolRefusalError && (
          <div className="p-3 bg-red-950/90 border-b border-red-500 flex items-start gap-2.5 text-xs text-red-200 shrink-0 animate-in fade-in">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <strong className="text-white font-black">PAYOUT REFUSED: INSUFFICIENT USERS' POOL</strong>
                <button
                  onClick={() => setPoolRefusalError(null)}
                  className="text-red-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded-md hover:bg-red-900 tap-bounce"
                >
                  ✕ Dismiss
                </button>
              </div>
              <p className="text-[11px] leading-relaxed">{poolRefusalError}</p>
            </div>
          </div>
        )}

        {/* APP GENERAL SETTINGS TAB */}
        {activeAdminTab === 'app_settings' && (
          <div className="flex-1 overflow-y-auto">
            <AdminAppSettingsPanel />
          </div>
        )}

        {/* POINTS SETTINGS TAB */}
        {activeAdminTab === 'points_settings' && (
          <div className="flex-1 overflow-y-auto">
            <AdminPointsSettingsPanel />
          </div>
        )}

        {/* WALLET SETTINGS TAB */}
        {activeAdminTab === 'wallet_settings' && (
          <div className="flex-1 overflow-y-auto">
            <AdminWalletSettingsPanel />
          </div>
        )}

        {/* FEATURE SWITCHES TAB */}
        {activeAdminTab === 'features' && (
          <div className="flex-1 overflow-y-auto">
            <AdminFeatureSwitchesPanel />
          </div>
        )}

        {/* SPONSOR PACKAGES TAB */}
        {activeAdminTab === 'packages' && (
          <div className="flex-1 overflow-y-auto">
            <AdminSponsorPackagesPanel />
          </div>
        )}

        {/* SPONSOR REQUESTS TAB */}
        {activeAdminTab === 'sponsor_requests' && (
          <div className="flex-1 overflow-y-auto">
            <AdminSponsorRequestsPanel />
          </div>
        )}

        {/* USERS MANAGER TAB */}
        {activeAdminTab === 'users' && (
          <div className="flex-1 overflow-y-auto">
            <AdminUsersManagerPanel />
          </div>
        )}

        {/* LEARN MANAGER TAB */}
        {activeAdminTab === 'learn' && (
          <div className="flex-1 overflow-y-auto">
            <AdminLearnManagerPanel />
          </div>
        )}

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
                filteredRequests.map((req) => {
                  const feeDetails = calculatePayoutFee(req.cashAmount || (req.points || 0) / POINTS_PER_DOLLAR);
                  const isPending = req.status === 'Pending';
                  const exceedsAvailablePool = isPending && feeDetails.gross > monthlyMetrics.remainingPool;

                  return (
                    <div
                      key={req.id}
                      className="bg-slate-800/90 border border-slate-700 rounded-2xl p-3.5 space-y-3 shadow-md"
                    >
                      {/* Header: User, ID, Amount */}
                      <div className="flex items-start justify-between gap-2">
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

                        {/* Amount breakdown: Gross, Transfer Fee (2%), Net to Send */}
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-amber-400 block font-mono">
                            {req.points.toLocaleString()} Pts
                          </span>
                          <div className="text-[10px] space-y-0.5 mt-0.5 font-mono">
                            <div className="text-slate-300">
                              Gross: <strong className="text-white">${feeDetails.gross.toFixed(2)}</strong>
                            </div>
                            <div className="text-amber-400">
                              Fee ({PAYOUT_FEE_PERCENT}%): <strong>-${feeDetails.feeAmount.toFixed(2)}</strong>
                            </div>
                            <div className="text-emerald-400 font-bold border-t border-slate-700/60 pt-0.5">
                              Net: <strong>${feeDetails.netAmount.toFixed(2)} USD</strong>
                            </div>
                          </div>
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

                        {/* Fee notice note */}
                        <div className="text-[9.5px] text-slate-400 italic">
                          ℹ️ Transfer fee of {PAYOUT_FEE_PERCENT}% (${feeDetails.feeAmount.toFixed(2)}) is deducted from user payout (never from owner share).
                        </div>

                        {req.adminNote && (
                          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                            <strong>Admin Note:</strong> {req.adminNote}
                          </div>
                        )}
                      </div>

                      {/* Insufficient Pool Warning for this Request */}
                      {exceedsAvailablePool && (
                        <div className="p-2.5 bg-rose-950/60 border border-rose-500/70 rounded-xl text-[10.5px] text-rose-200 flex items-start gap-1.5 font-bold">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <span>
                            Payout Refused by Rule: Gross ${feeDetails.gross.toFixed(2)} USD exceeds the remaining users' pool ($${monthlyMetrics.remainingPool.toFixed(2)} USD). You must enter higher net revenue above to pay this user.
                          </span>
                        </div>
                      )}

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
                              disabled={processingId === req.id || exceedsAvailablePool}
                              className="py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl text-xs tap-bounce flex items-center justify-center gap-1.5 shadow-sm"
                              title={exceedsAvailablePool ? 'Refused: Insufficient users pool balance' : 'Mark as Paid'}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{processingId === req.id ? 'Processing...' : 'Mark as Paid ✓'}</span>
                            </button>

                            <button
                              onClick={() => handleUpdateStatus(req.id, 'Rejected')}
                              disabled={processingId === req.id}
                              className="py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs tap-bounce flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>{processingId === req.id ? 'Refunding...' : 'Reject & Refund Points'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Paginated Load More Button */}
              {hasMoreWithdrawals && !loadingWithdrawals && (
                <div className="pt-2 pb-1 text-center">
                  <button
                    onClick={handleLoadMoreWithdrawals}
                    disabled={loadingMoreWithdrawals}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-amber-400 font-black rounded-xl text-xs tap-bounce border border-slate-700 flex items-center justify-center gap-2 shadow-sm"
                  >
                    {loadingMoreWithdrawals ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        <span>Loading more requests...</span>
                      </>
                    ) : (
                      <span>Load more requests (50) ↓</span>
                    )}
                  </button>
                </div>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10.5px] text-slate-400 font-bold block mb-1">
                      Sponsor Package (Purchased Tier) *
                    </label>
                    <select
                      value={adForm.package}
                      onChange={(e) => {
                        const pkgName = e.target.value;
                        const pkg = getSponsorPackageByName(pkgName);
                        setAdForm({
                          ...adForm,
                          package: pkgName,
                          packageImpressions: pkg?.impressions || 2000,
                          packageMinDays: pkg?.minDays || 7,
                          amountPaid: pkg?.priceUsd || 5,
                        });
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-amber-500 text-xs font-bold"
                    >
                      {SPONSOR_PACKAGES.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name} — ${p.priceUsd} USD ({p.impressions.toLocaleString()} Impr., Min {p.minDays}d)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10.5px] text-slate-400 font-bold block mb-1">
                      Language Target *
                    </label>
                    <select
                      value={adForm.languageTarget}
                      onChange={(e) =>
                        setAdForm({
                          ...adForm,
                          languageTarget: e.target.value as 'English' | 'Urdu' | 'both',
                        })
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-amber-500 text-xs font-bold"
                    >
                      <option value="both">Both (English & Urdu)</option>
                      <option value="English">English</option>
                      <option value="Urdu">Urdu</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10.5px] text-slate-400 font-bold block mb-1">
                      Paid Status (Runs only when Yes) *
                    </label>
                    <select
                      value={adForm.paid}
                      onChange={(e) =>
                        setAdForm({
                          ...adForm,
                          paid: e.target.value as 'yes' | 'no',
                        })
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-amber-500 text-xs font-bold"
                    >
                      <option value="yes">Yes (Payment received in full)</option>
                      <option value="no">No (Payment pending / unpaid)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10.5px] text-slate-400 font-bold block mb-1">
                      Amount Paid in Dollars ($ USD) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={adForm.amountPaid}
                      onChange={(e) =>
                        setAdForm({
                          ...adForm,
                          amountPaid: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-amber-500 text-xs font-mono font-bold"
                      placeholder="e.g. 5"
                      required
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
                        <th className="pb-2 font-bold">Sponsor & Package</th>
                        <th className="pb-2 font-bold">Delivered / Purchased</th>
                        <th className="pb-2 font-bold">Clicks</th>
                        <th className="pb-2 font-bold">CTR (Delivered / Purchased)</th>
                        <th className="pb-2 font-bold">Campaign Status</th>
                        <th className="pb-2 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60">
                      {sponsorAds.map((ad) => {
                        const pkg = ad.package ? getSponsorPackageByName(ad.package) : undefined;
                        const purchased = ad.packageImpressions || pkg?.impressions || 2000;
                        const delivered = ad.impressions || 0;
                        const clicks = ad.clicks || 0;
                        const minDays = ad.packageMinDays !== undefined ? ad.packageMinDays : (pkg?.minDays || 7);
                        const startMs = ad.startDate ? new Date(ad.startDate).getTime() : (ad.createdAt ? new Date(ad.createdAt).getTime() : Date.now());
                        const elapsedDays = Math.max(0, Math.floor((Date.now() - startMs) / (1000 * 60 * 60 * 24)));
                        const isCompleted = delivered >= purchased && elapsedDays >= minDays;
                        const percentDelivered = purchased > 0 ? Math.round((delivered / purchased) * 100) : 0;
                        const ctrDelivered = delivered > 0 ? ((clicks / delivered) * 100).toFixed(1) : '0.0';
                        const ctrPurchased = purchased > 0 ? ((clicks / purchased) * 100).toFixed(2) : '0.00';

                        return (
                          <tr key={ad.id} className="hover:bg-slate-750/50">
                            <td className="py-2.5 pr-2">
                              <span className="font-black text-white block truncate max-w-[150px]">
                                {ad.sponsorName}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                                  {ad.package || 'Starter'}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                  ad.paid === 'yes'
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                    : 'bg-rose-950 text-rose-400 border border-rose-800'
                                }`}>
                                  ${ad.amountPaid ?? pkg?.priceUsd ?? 5} • {ad.paid === 'yes' ? 'Paid' : 'Unpaid'}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 font-mono">
                              <span className="text-cyan-300 font-bold">
                                {delivered.toLocaleString()}
                              </span>
                              <span className="text-slate-400 text-[10.5px]">
                                {' '}/ {purchased.toLocaleString()}
                              </span>
                              <span className="text-[9.5px] text-slate-500 block">
                                ({percentDelivered}% delivered • {elapsedDays}/{minDays}d)
                              </span>
                            </td>
                            <td className="py-2.5 font-mono text-emerald-400 font-bold">
                              {clicks.toLocaleString()}
                            </td>
                            <td className="py-2.5 font-mono text-xs">
                              <span className="font-bold text-amber-300">{ctrDelivered}%</span>
                              <span className="text-[10px] text-slate-400 block font-normal">
                                vs Purchased: {ctrPurchased}%
                              </span>
                            </td>
                            <td className="py-2.5">
                              {(() => {
                                const badge = getSponsorAdStatusBadge(ad);
                                return (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAdStatus(ad)}
                                    className={`text-[9.5px] font-black px-2.5 py-0.5 rounded-full uppercase border cursor-pointer tap-bounce block text-center max-w-[130px] ${badge.badgeClass}`}
                                    title="Status: Draft, Waiting for payment, Running, Finished, Paused (Click to toggle)"
                                  >
                                    {badge.label}
                                  </button>
                                );
                              })()}
                            </td>
                            <td className="py-2.5 text-right space-x-1 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  soundService.playClick();
                                  setPreviewAd(ad);
                                  setPreviewPlacement('home');
                                }}
                                className="p-1 bg-sky-950 hover:bg-sky-900 border border-sky-800 rounded text-sky-300 hover:text-white"
                                title="Preview ad in Home, Video list & Quiz placements"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
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

        {/* TAB: SPONSOR ENQUIRIES */}
        {activeAdminTab === 'enquiries' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg">
                    📢
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-white">Sponsor Enquiries</h4>
                    <p className="text-[11px] text-slate-400">
                      Inbound sponsor partnership requests ({enquiries.length} total) • Newest first
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fetchEnquiries}
                  disabled={loadingEnquiries}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 tap-bounce"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingEnquiries ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingEnquiries ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                  <span>Loading sponsor enquiries...</span>
                </div>
              ) : enquiries.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs bg-slate-900/50 rounded-2xl border border-slate-800 p-6 space-y-1">
                  <Inbox className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p className="font-black text-slate-300">No sponsor enquiries yet</p>
                  <p className="text-[11px] text-slate-500">
                    When prospective sponsors submit an enquiry through the &quot;Advertise with us&quot; section, their details will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {enquiries.map((enquiry) => {
                    const isContacted = enquiry.status === 'contacted';
                    const isContacting = contactingId === enquiry.id;
                    const dateFormatted = enquiry.createdAt?.toMillis
                      ? new Date(enquiry.createdAt.toMillis()).toLocaleString()
                      : enquiry.createdAt
                      ? new Date(enquiry.createdAt).toLocaleString()
                      : 'Recently submitted';

                    return (
                      <div
                        key={enquiry.id}
                        className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                          isContacted
                            ? 'bg-slate-900/70 border-slate-800 opacity-90'
                            : 'bg-slate-900 border-amber-500/40 ring-1 ring-amber-500/20'
                        }`}
                      >
                        {/* Top row: Status, timestamp, and Mark as Contacted action */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                isContacted
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                              }`}
                            >
                              {isContacted ? 'Contacted ✓' : 'New Enquiry'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {dateFormatted}
                            </span>
                          </div>

                          {!isContacted ? (
                            <button
                              type="button"
                              onClick={() => handleMarkEnquiryContacted(enquiry.id)}
                              disabled={isContacting}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-[10px] font-black flex items-center gap-1 shadow-xs tap-bounce"
                            >
                              {isContacting ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  <span>Saving...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Mark as Contacted</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Contacted</span>
                            </span>
                          )}
                        </div>

                        {/* Business Name and Link */}
                        <div className="space-y-1">
                          <h5 className="font-black text-sm text-white flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{enquiry.businessName}</span>
                          </h5>
                          {enquiry.websiteLink && (
                            <a
                              href={enquiry.websiteLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-sky-400 hover:underline flex items-center gap-1 font-mono break-all"
                            >
                              <Globe className="w-3 h-3 shrink-0" />
                              <span>{enquiry.websiteLink}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          )}
                        </div>

                        {/* Contact details with Copy buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {/* Email copy */}
                          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/80 border border-slate-700">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-xs text-slate-200 font-mono truncate" title={enquiry.email}>
                                {enquiry.email}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyEnquiryField(enquiry.email, `${enquiry.id}-email`)}
                              className="ml-2 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-[10px] font-black rounded-lg text-slate-200 flex items-center gap-1 shrink-0 tap-bounce"
                              title="Copy Email"
                            >
                              {copiedEnquiryKey === `${enquiry.id}-email` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Email</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Phone copy */}
                          {enquiry.phone ? (
                            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/80 border border-slate-700">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="text-xs text-slate-200 font-mono truncate" title={enquiry.phone}>
                                  {enquiry.phone}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyEnquiryField(enquiry.phone!, `${enquiry.id}-phone`)}
                                className="ml-2 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-[10px] font-black rounded-lg text-slate-200 flex items-center gap-1 shrink-0 tap-bounce"
                                title="Copy Phone"
                              >
                                {copiedEnquiryKey === `${enquiry.id}-phone` ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span className="text-emerald-400">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy Phone</span>
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center p-2 rounded-xl bg-slate-800/40 border border-slate-800 text-[11px] text-slate-500 italic">
                              <Phone className="w-3.5 h-3.5 mr-1.5 opacity-50 shrink-0" />
                              <span>No phone provided</span>
                            </div>
                          )}
                        </div>

                        {/* Message */}
                        <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-750 text-xs text-slate-200 space-y-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                            Enquiry Message ({enquiry.message?.length || 0}/1000)
                          </span>
                          <p className="whitespace-pre-wrap leading-relaxed font-sans text-slate-300">
                            {enquiry.message}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: VIDEOS MANAGEMENT */}
        {activeAdminTab === 'videos' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Header / Actions Bar */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center text-lg">
                    🎬
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-white">Curated Learning Videos</h4>
                    <p className="text-[11px] text-slate-400">
                      Firestore collection <code>videos</code> ({adminVideos.length} custom videos)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundService.playClick();
                      setShowSingleVideoForm(!showSingleVideoForm);
                      setEditingVideoId(null);
                      setSingleVideoTitle('');
                      setSingleVideoLink('');
                    }}
                    className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 tap-bounce shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showSingleVideoForm ? 'Close Form' : 'Add Video'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={fetchAdminVideos}
                    disabled={loadingAdminVideos}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 tap-bounce"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAdminVideos ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* SECTION 1: BULK ADD VIDEOS TEXT BOX */}
              <div className="bg-slate-900/90 border border-slate-750 p-3.5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-black text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span>Bulk Add Videos</span>
                      <span className="text-[10px] text-pink-400 bg-pink-950/60 border border-pink-700 px-2 py-0.2 rounded-full font-mono">
                        category | title | YouTube link
                      </span>
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Paste many lines below. Video ID and thumbnail will be automatically extracted from any YouTube URL format.
                    </p>
                  </div>
                </div>

                <textarea
                  rows={4}
                  value={bulkVideoText}
                  onChange={(e) => setBulkVideoText(e.target.value)}
                  placeholder={`Science | Solar System & Space Exploration | https://www.youtube.com/watch?v=libKVRa01L8\nArts | 3D Origami Cube Craft | https://youtu.be/cScuMgYHKeM\nCooking | How to Grow Home Organic Mint | https://www.youtube.com/watch?v=B0DrWAUsNSc\nNature | Rainforest Ecosystems Documentary | https://www.youtube.com/watch?v=3vijLre760w`}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-600 focus:outline-hidden focus:border-pink-500 resize-none leading-relaxed"
                />

                {/* Bulk Save Feedback Notice */}
                {bulkSaveNotice && (
                  <div className="p-2.5 rounded-xl bg-slate-800 border border-pink-500/50 text-xs font-bold text-pink-300">
                    {bulkSaveNotice}
                  </div>
                )}

                {/* LIVE PREVIEW TABLE WITH TICK OR ERROR FOR EACH LINE */}
                {parsedBulkResults.length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">
                        Live Preview ({parsedBulkResults.filter((r) => r.isValid).length} valid / {parsedBulkResults.length} total)
                      </span>
                      <button
                        type="button"
                        onClick={handleSaveBulkVideos}
                        disabled={savingBulkVideos || parsedBulkResults.filter((r) => r.isValid).length === 0}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md tap-bounce"
                      >
                        {savingBulkVideos ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving to Cloud...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Save Valid Videos to Cloud ({parsedBulkResults.filter((r) => r.isValid).length})</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="overflow-x-auto max-h-48 rounded-xl border border-slate-700/80 bg-slate-950/60 scrollbar-thin">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800 text-[10px] uppercase">
                          <tr>
                            <th className="p-2">Line</th>
                            <th className="p-2">Status</th>
                            <th className="p-2">Category</th>
                            <th className="p-2">Title</th>
                            <th className="p-2">Video ID</th>
                            <th className="p-2">Thumb</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 font-mono text-[11px]">
                          {parsedBulkResults.map((item) => (
                            <tr
                              key={item.lineIndex}
                              className={item.isValid ? 'hover:bg-slate-900/50' : 'bg-red-950/20 text-red-300'}
                            >
                              <td className="p-2 font-bold text-slate-400">#{item.lineIndex}</td>
                              <td className="p-2">
                                {item.isValid ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-400 font-bold font-sans text-xs">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Valid</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-red-400 font-bold font-sans text-[10px]" title={item.error}>
                                    <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                    <span className="truncate max-w-[120px]">{item.error}</span>
                                  </span>
                                )}
                              </td>
                              <td className="p-2 font-sans text-slate-200">{item.category}</td>
                              <td className="p-2 font-sans text-white max-w-[160px] truncate" title={item.title}>
                                {item.title}
                              </td>
                              <td className="p-2 text-cyan-300">{item.videoId || '—'}</td>
                              <td className="p-2">
                                {item.videoId ? (
                                  <img
                                    src={item.thumbnail}
                                    alt=""
                                    className="w-10 h-6 object-cover rounded border border-slate-700"
                                  />
                                ) : (
                                  '—'
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: SINGLE ADD / EDIT VIDEO FORM */}
              {showSingleVideoForm && (
                <form
                  onSubmit={handleSaveSingleVideo}
                  className="bg-slate-900 p-4 rounded-2xl border border-pink-500/40 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h5 className="font-black text-xs text-white uppercase tracking-wider">
                      {editingVideoId ? 'Edit Video' : 'Add Single Video'}
                    </h5>
                    <button
                      type="button"
                      onClick={() => setShowSingleVideoForm(false)}
                      className="text-slate-400 hover:text-white text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-300 block mb-1 text-[11px]">
                        Category *
                      </label>
                      <input
                        type="text"
                        required
                        value={singleVideoCategory}
                        onChange={(e) => setSingleVideoCategory(e.target.value)}
                        placeholder="Science, Arts, Cooking, Nature..."
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-hidden focus:border-pink-500 text-xs"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-300 block mb-1 text-[11px]">
                        Display Order (1 = top)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={singleVideoOrder}
                        onChange={(e) => setSingleVideoOrder(parseInt(e.target.value, 10) || 1)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-medium focus:outline-hidden focus:border-pink-500 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-300 block mb-1 text-[11px]">
                      Video Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={singleVideoTitle}
                      onChange={(e) => setSingleVideoTitle(e.target.value)}
                      placeholder="e.g. Solar System & Planetary Science 101"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-hidden focus:border-pink-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-300 block mb-1 text-[11px]">
                      YouTube Link or 11-char Video ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={singleVideoLink}
                      onChange={(e) => setSingleVideoLink(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=libKVRa01L8 or libKVRa01L8"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-hidden focus:border-pink-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-pink-600 hover:bg-pink-500 text-white font-black text-xs rounded-xl shadow-md tap-bounce flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingVideoId ? 'Update Video' : 'Save Video to Firestore'}</span>
                  </button>
                </form>
              )}

              {/* SECTION 3: VIDEO LIST WITH CATEGORY FILTERS & CONTROLS */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                    {adminVideoCategories.map((cat: string) => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => {
                          soundService.playClick();
                          setAdminVideoFilter(cat);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold tap-bounce transition-all ${
                          adminVideoFilter === cat
                            ? 'bg-pink-600 text-white font-black shadow-xs'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-750'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {filteredAdminVideos.length} videos
                  </span>
                </div>

                {loadingAdminVideos ? (
                  <div className="py-10 text-center text-slate-400 text-xs">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-pink-500" />
                    <span>Loading Firestore videos...</span>
                  </div>
                ) : filteredAdminVideos.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 space-y-2">
                    <Film className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="font-bold text-slate-300 text-xs">No custom Firestore videos yet</p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Use the bulk paste tool above to add multiple educational videos in one click!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredAdminVideos.map((video: AdminVideo, idx: number) => (
                      <div
                        key={video.id}
                        className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                          video.approved !== false
                            ? 'bg-slate-900 border-slate-800'
                            : 'bg-slate-900/60 border-slate-850 opacity-60'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="w-16 h-10 rounded-lg overflow-hidden bg-slate-950 shrink-0 border border-slate-800 relative">
                          <img
                            src={video.thumbnail}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>

                        {/* Title & Metadata */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-pink-950 text-pink-300 border border-pink-800">
                              {video.category}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              #{video.order ?? idx + 1}
                            </span>
                            {video.approved === false && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-400">
                                Hidden
                              </span>
                            )}
                          </div>
                          <h5 className="font-bold text-xs text-white truncate mt-0.5">
                            {video.title}
                          </h5>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ID: {video.videoId}
                          </span>
                        </div>

                        {/* Reorder Buttons (Up / Down) */}
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveVideoOrder(idx, 'up')}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === filteredAdminVideos.length - 1}
                            onClick={() => handleMoveVideoOrder(idx, 'down')}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Actions: Hide/Show, Edit, Delete */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleVideoApproved(video)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-black tap-bounce border ${
                              video.approved !== false
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                            title="Toggle Approved / Hidden"
                          >
                            {video.approved !== false ? 'Show' : 'Hide'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              soundService.playClick();
                              setEditingVideoId(video.id);
                              setSingleVideoCategory(video.category);
                              setSingleVideoTitle(video.title);
                              setSingleVideoLink(video.videoId);
                              setSingleVideoOrder(video.order || idx + 1);
                              setShowSingleVideoForm(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                            title="Edit Video"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteVideo(video.id)}
                            className="p-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 hover:text-white"
                            title="Delete Video"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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

        {/* VLOGS COMMUNITY MODERATION TAB */}
        {activeAdminTab === 'vlogs' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Top Subtab switcher & Actions */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    setVlogSubTab('pending');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    vlogSubTab === 'pending'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Pending Approvals ({pendingVlogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    setVlogSubTab('reported');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    vlogSubTab === 'reported'
                      ? 'bg-rose-600 text-white font-black'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Reported Vlogs ({reportedVlogs.length})
                </button>
              </div>

              <button
                type="button"
                onClick={fetchAdminVlogs}
                disabled={loadingVlogs}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingVlogs ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {vlogActionNotice && (
              <div className="p-3 bg-emerald-950/90 border border-emerald-600 text-emerald-300 text-xs font-bold rounded-xl flex items-center justify-between">
                <span>{vlogActionNotice}</span>
                <button
                  onClick={() => setVlogActionNotice(null)}
                  className="text-emerald-400 hover:text-white text-xs font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            {/* PENDING VLOGS LIST */}
            {vlogSubTab === 'pending' && (
              <div className="space-y-3">
                <div className="text-[11px] text-slate-400">
                  Review community-submitted YouTube vlogs. Only approved vlogs appear in the public feed.
                </div>

                {pendingVlogs.length === 0 ? (
                  <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-70" />
                    <h4 className="font-bold text-slate-300 text-sm">No Pending Vlogs</h4>
                    <p className="text-xs text-slate-500">All submissions have been reviewed.</p>
                  </div>
                ) : (
                  pendingVlogs.map((vlog) => (
                    <div
                      key={vlog.id}
                      className="bg-slate-850 border border-slate-700 rounded-2xl p-3.5 space-y-3 shadow-md"
                    >
                      <div className="flex flex-col sm:flex-row gap-3">
                        <img
                          src={vlog.thumbnail || `https://i.ytimg.com/vi/${vlog.videoId}/hqdefault.jpg`}
                          alt={vlog.title}
                          className="w-full sm:w-40 h-24 object-cover rounded-xl bg-slate-900 shrink-0 border border-slate-700"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase">
                              {vlog.category}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Type: {vlog.videoType === 'upload' ? 'Native Upload' : vlog.videoType === 'recorded' ? 'Recorded Live' : 'YouTube'} {vlog.videoId ? `(ID: ${vlog.videoId})` : ''}
                            </span>
                          </div>

                          <h4 className="font-black text-sm text-white leading-snug">
                            {vlog.title}
                          </h4>

                          <p className="text-xs text-slate-300 line-clamp-2">
                            {vlog.description}
                          </p>

                          <div className="text-[11px] text-slate-400 pt-1">
                            Creator: <strong className="text-slate-200">{vlog.creatorName}</strong> • Submitted: {new Date(vlog.createdAt).toLocaleDateString()}
                          </div>

                          {vlog.videoId ? (
                            <a
                              href={`https://www.youtube.com/watch?v=${vlog.videoId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-bold pt-1"
                            >
                              <span>Open on YouTube</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-pink-400 font-bold pt-1">
                              <span>Native Video File ({vlog.duration || 'Short'})</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Rejection reason & actions */}
                      <div className="pt-2 border-t border-slate-800 space-y-2">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            placeholder="Rejection reason (required if rejecting)..."
                            value={rejectReasonInput[vlog.id] || ''}
                            onChange={(e) =>
                              setRejectReasonInput((prev) => ({ ...prev, [vlog.id]: e.target.value }))
                            }
                            className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                          />

                          <div className="flex gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={async () => {
                                soundService.playClick();
                                await approveVlog(vlog.id);
                                setVlogActionNotice(`✓ Approved vlog "${vlog.title}"!`);
                                await fetchAdminVlogs();
                              }}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl tap-bounce shadow-sm flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>

                            <button
                              type="button"
                              onClick={async () => {
                                const reason = rejectReasonInput[vlog.id]?.trim();
                                if (!reason) {
                                  soundService.playWrong();
                                  alert('Please enter a rejection reason first.');
                                  return;
                                }
                                soundService.playClick();
                                await rejectVlog(vlog.id, reason);
                                setVlogActionNotice(`✕ Rejected vlog with reason: ${reason}`);
                                await fetchAdminVlogs();
                              }}
                              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl tap-bounce shadow-sm"
                            >
                              Reject
                            </button>

                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`Delete vlog "${vlog.title}" permanently?`)) {
                                  soundService.playClick();
                                  await deleteVlog(vlog.id);
                                  setVlogActionNotice(`Deleted vlog "${vlog.title}".`);
                                  await fetchAdminVlogs();
                                }
                              }}
                              className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 font-bold text-xs rounded-xl tap-bounce"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* REPORTED VLOGS LIST */}
            {vlogSubTab === 'reported' && (
              <div className="space-y-3">
                <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-xs text-rose-200 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Auto-Hide Policy Active:</strong> Any community vlog with 3 or more reports is automatically hidden from public feed playback. You can block abusive creators or dismiss reports below.
                  </div>
                </div>

                {reportedVlogs.length === 0 ? (
                  <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-70" />
                    <h4 className="font-bold text-slate-300 text-sm">No Reported Vlogs</h4>
                    <p className="text-xs text-slate-500">Community reports are clean.</p>
                  </div>
                ) : (
                  reportedVlogs.map((vlog) => (
                    <div
                      key={vlog.id}
                      className="bg-slate-850 border border-slate-700 rounded-2xl p-3.5 space-y-3 shadow-md"
                    >
                      <div className="flex flex-col sm:flex-row gap-3">
                        <img
                          src={vlog.thumbnail || `https://i.ytimg.com/vi/${vlog.videoId}/hqdefault.jpg`}
                          alt={vlog.title}
                          className="w-full sm:w-40 h-24 object-cover rounded-xl bg-slate-900 shrink-0 border border-slate-700"
                        />

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black uppercase flex items-center gap-1">
                              <span>⚠️</span>
                              <span>{vlog.reportCount} {vlog.reportCount === 1 ? 'Report' : 'Reports'}</span>
                            </span>
                            {vlog.reportCount >= 3 && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                                Auto-Hidden From Feed
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono">
                              Category: {vlog.category}
                            </span>
                          </div>

                          <h4 className="font-black text-sm text-white">
                            {vlog.title}
                          </h4>

                          <p className="text-xs text-slate-300 line-clamp-2">
                            {vlog.description}
                          </p>

                          <div className="text-[11px] text-slate-400 pt-1">
                            Creator: <strong className="text-slate-200">{vlog.creatorName}</strong> (UID: <code className="text-[10px] font-mono text-slate-300">{vlog.uid}</code>)
                          </div>

                          {vlog.videoId ? (
                            <a
                              href={`https://www.youtube.com/watch?v=${vlog.videoId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-bold pt-1"
                            >
                              <span>Open on YouTube</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-pink-400 font-bold pt-1">
                              <span>Native Video File ({vlog.duration || 'Short'})</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2 justify-end">
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`Block creator "${vlog.creatorName}" globally from submitting vlogs?`)) {
                              soundService.playClick();
                              await blockCreatorGlobally(vlog.uid);
                              setVlogActionNotice(`Blocked creator "${vlog.creatorName}" globally.`);
                              await fetchAdminVlogs();
                            }
                          }}
                          className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs rounded-xl tap-bounce shadow-sm flex items-center gap-1"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Block Creator</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            soundService.playClick();
                            await approveVlog(vlog.id);
                            setVlogActionNotice(`Cleared reports and re-approved vlog "${vlog.title}".`);
                            await fetchAdminVlogs();
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl tap-bounce"
                        >
                          Dismiss Reports
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`Delete reported vlog "${vlog.title}"?`)) {
                              soundService.playClick();
                              await deleteVlog(vlog.id);
                              setVlogActionNotice(`Deleted vlog "${vlog.title}".`);
                              await fetchAdminVlogs();
                            }
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl tap-bounce"
                        >
                          Delete Vlog
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* REVENUE TARGET TAB */}
        {activeAdminTab === 'revenue_target' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Header info */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg">
                  🎯
                </div>
                <div>
                  <h4 className="font-black text-sm text-white">Ad Revenue Target &amp; DAU Calculator</h4>
                  <p className="text-[11px] text-slate-400">
                    Calculate required Daily Active Users (DAU) and manage dynamic ad frequency capping.
                  </p>
                </div>
              </div>

              {/* Calculator Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase block">
                    Daily Revenue Target ($ USD)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={dailyRevTarget}
                    onChange={(e) => setDailyRevTarget(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono font-bold text-sm focus:outline-hidden focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500">
                    Monthly target: ${(dailyRevTarget * 30).toLocaleString()} USD
                  </span>
                </div>

                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase block">
                    Estimated eCPM ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    min="0.10"
                    value={estimatedEcpm}
                    onChange={(e) => setEstimatedEcpm(Math.max(0.1, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono font-bold text-sm focus:outline-hidden focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500">
                    Avg earnings per 1,000 impressions
                  </span>
                </div>

                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase block">
                    Ads Per User / Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={adsPerUser}
                    onChange={(e) => setAdsPerUser(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono font-bold text-sm focus:outline-hidden focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500">
                    Banners + Native + Interstitial
                  </span>
                </div>
              </div>

              {/* Calculated Results Cards */}
              {(() => {
                const dailyRevPerUser = (adsPerUser * estimatedEcpm) / 1000;
                const revPer100Users = dailyRevPerUser * 100;
                const requiredDau = Math.ceil(dailyRevTarget / (dailyRevPerUser || 0.001));
                const currentEstDaily = realDau * dailyRevPerUser;

                return (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
                        <span className="text-[10px] uppercase font-bold text-amber-400 block">
                          Required DAU
                        </span>
                        <div className="text-lg font-black text-amber-300 font-mono mt-0.5">
                          {requiredDau.toLocaleString()}
                        </div>
                        <span className="text-[10px] text-slate-400">Users/Day</span>
                      </div>

                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                          Rev / User / Day
                        </span>
                        <div className="text-lg font-black text-emerald-300 font-mono mt-0.5">
                          ${dailyRevPerUser.toFixed(4)}
                        </div>
                        <span className="text-[10px] text-slate-400">USD</span>
                      </div>

                      <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-xl text-center">
                        <span className="text-[10px] uppercase font-bold text-sky-400 block">
                          Rev / 100 Users
                        </span>
                        <div className="text-lg font-black text-sky-300 font-mono mt-0.5">
                          ${revPer100Users.toFixed(3)}
                        </div>
                        <span className="text-[10px] text-slate-400">USD / 100 users</span>
                      </div>

                      <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-center">
                        <span className="text-[10px] uppercase font-bold text-indigo-400 block">
                          Current Real DAU
                        </span>
                        <div className="text-lg font-black text-indigo-300 font-mono mt-0.5">
                          {realDau.toLocaleString()}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Est. ${currentEstDaily.toFixed(2)}/day
                        </span>
                      </div>
                    </div>

                    {/* Prominent Mandatory Disclaimer */}
                    <div className="p-3 bg-slate-900 border border-amber-500/40 rounded-xl text-center space-y-1">
                      <div className="text-amber-400 text-xs font-black uppercase tracking-wider">
                        Estimate only, not a promise.
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Actual ad revenue depends entirely on live Google AdMob bidding, CPM fluctuations by region, fill rates, user engagement, and seasonal demand. JoyEarn provides virtual JoyPoints with no fixed dollar guarantee.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* TODAY'S IMPRESSION COUNTS PER FORMAT */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-amber-400" />
                  <h4 className="font-black text-sm text-white">Today's Impressions by Ad Format</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setTodayImpressions(adMobManager.getTodayImpressions())}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Banner</span>
                  <div className="text-lg font-black text-white font-mono mt-0.5">{todayImpressions.banner}</div>
                  <span className="text-[10px] text-slate-500">Impressions</span>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Native</span>
                  <div className="text-lg font-black text-white font-mono mt-0.5">{todayImpressions.native}</div>
                  <span className="text-[10px] text-slate-500">In feed lists</span>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Interstitial</span>
                  <div className="text-lg font-black text-amber-400 font-mono mt-0.5">{todayImpressions.interstitial}</div>
                  <span className="text-[10px] text-slate-500">Full screen</span>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Rewarded</span>
                  <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">{todayImpressions.rewarded}</div>
                  <span className="text-[10px] text-slate-500">Opt-in bonus</span>
                </div>
              </div>
            </div>

            {/* DYNAMIC AD CONFIGURATION EDITOR */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <div>
                  <h4 className="font-black text-sm text-white">Dynamic Ad Configuration</h4>
                  <p className="text-[11px] text-slate-400">
                    Adjust ad rules on the fly without rebuilding or redeploying the app.
                  </p>
                </div>
              </div>

              {configSaveNotice && (
                <div className="p-2.5 bg-emerald-950 border border-emerald-600 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{configSaveNotice}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* adsEnabled Toggle */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-white block">AdMob Ads Enabled</span>
                    <span className="text-[10px] text-slate-400">Master switch for Google AdMob units</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDynamicConfig((prev) => ({ ...prev, adsEnabled: !prev.adsEnabled }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black tap-bounce transition-all ${
                      dynamicConfig.adsEnabled ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {dynamicConfig.adsEnabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>

                {/* adAfterFeature Toggle */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-white block">Ad After Feature</span>
                    <span className="text-[10px] text-slate-400">Show interstitial on return to Home</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDynamicConfig((prev) => ({ ...prev, adAfterFeature: !prev.adAfterFeature }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black tap-bounce transition-all ${
                      dynamicConfig.adAfterFeature ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {dynamicConfig.adAfterFeature ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>

                {/* Cooldown Seconds */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <label className="text-xs font-black text-white block">
                    Interstitial Cooldown (Seconds)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="600"
                    value={dynamicConfig.interstitialCooldownSeconds}
                    onChange={(e) =>
                      setDynamicConfig((prev) => ({
                        ...prev,
                        interstitialCooldownSeconds: Math.max(30, parseInt(e.target.value, 10) || 30),
                      }))
                    }
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-hidden focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-400">Default: 90 seconds</span>
                </div>

                {/* Max Daily Fullscreen */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <label className="text-xs font-black text-white block">
                    Max Fullscreen Ads Per Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={dynamicConfig.maxFullscreenAdsPerDay}
                    onChange={(e) =>
                      setDynamicConfig((prev) => ({
                        ...prev,
                        maxFullscreenAdsPerDay: Math.max(1, parseInt(e.target.value, 10) || 1),
                      }))
                    }
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-hidden focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-400">Default: 12 ads/day</span>
                </div>

                {/* Native Ad Spacing */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1 sm:col-span-2">
                  <label className="text-xs font-black text-white block">
                    Native Ad Frequency (Every N Items in Feed)
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="20"
                    value={dynamicConfig.nativeAdEveryNItems}
                    onChange={(e) =>
                      setDynamicConfig((prev) => ({
                        ...prev,
                        nativeAdEveryNItems: Math.max(2, parseInt(e.target.value, 10) || 4),
                      }))
                    }
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-hidden focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-400">Insert native sponsor card every N items (Default: 4)</span>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    setSavingDynamicConfig(true);
                    adMobManager.updateConfig(dynamicConfig);
                    setTimeout(() => {
                      setSavingDynamicConfig(false);
                      setConfigSaveNotice('✓ Ad configuration saved dynamically! Takes effect immediately.');
                      setTimeout(() => setConfigSaveNotice(null), 5000);
                    }, 300);
                  }}
                  disabled={savingDynamicConfig}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs tap-bounce shadow-md flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Ad Configuration</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 bg-slate-800 text-center border-t border-slate-700 text-[10px] text-slate-400 flex items-center justify-between shrink-0">
          <span>Google Firestore Collections: <code>withdrawals</code>, <code>sponsor_ads</code>, <code>videos</code>, <code>config</code></span>
          <span className="font-bold text-amber-400">Security Rules Enforced 🔒</span>
        </div>
      </div>

      {/* SPONSOR AD PLACEMENT PREVIEW MODAL (Admin Only) */}
      {previewAd && (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border-2 border-sky-500 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white">
            <div className="p-3.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-sky-400" />
                <h4 className="font-black text-xs sm:text-sm text-white">
                  Placement Preview: {previewAd.sponsorName}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAd(null)}
                className="w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Placement Tabs */}
            <div className="flex bg-slate-850 border-b border-slate-700 text-[11px] font-bold">
              {[
                { id: 'home', label: 'Home Feed' },
                { id: 'video_list', label: 'Video List' },
                { id: 'quiz', label: 'Quiz Interstitial' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    setPreviewPlacement(tab.id as any);
                  }}
                  className={`flex-1 py-2 text-center border-b-2 transition-all ${
                    previewPlacement === tab.id
                      ? 'border-sky-400 text-sky-400 font-black bg-slate-800/80'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Preview Card Display */}
            <div className="p-4 overflow-y-auto space-y-4 bg-slate-950">
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">
                  Live Placement: {previewPlacement === 'quiz' ? 'Compact Question Interstitial' : previewPlacement === 'video_list' ? 'Video List Feed' : 'Home Main Feed'}
                </span>
                <SponsorAdCard
                  ad={previewAd}
                  variant={previewPlacement === 'quiz' ? 'compact' : 'card'}
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p><strong>Package:</strong> {previewAd.package || 'Custom'} (${previewAd.amountPaid || 0} USD)</p>
                <p><strong>Destination:</strong> <code className="text-sky-300">{previewAd.destinationLink}</code></p>
                <p><strong>Tracking:</strong> Taps award 0 points. Impressions and clicks are recorded in Firestore.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-850 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={() => setPreviewAd(null)}
                className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl tap-bounce shadow-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
