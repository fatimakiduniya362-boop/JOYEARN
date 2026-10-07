import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Gift,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ShoppingBag,
  Zap,
  Star,
  Lock,
  Tv,
  HelpCircle,
  Award,
  DollarSign,
  ArrowRight,
  AlertCircle,
  Check,
  CreditCard,
  Building2,
  Smartphone,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { TransactionRecord, InAppProduct, PerkItem, AppUser, WithdrawalRequest, PaymentMethodType } from '../types';
import { IN_APP_PERKS, IN_APP_PRODUCTS } from '../data/mockData';
import { soundService } from '../services/soundService';
import { hapticService } from '../services/haptics';
import { submitWithdrawalRequestToCloud, loadUserWithdrawals } from '../services/firestoreService';
import { ADMIN_EMAIL } from './AdminWithdrawalModal';

// ============================================================================
// 💰 REAL REWARDS & WITHDRAWAL CONFIGURATION (EDITABLE AT TOP OF CODE)
// ============================================================================
export const POINTS_PER_DOLLAR = 1000; // 1,000 Points = $1.00 USD
export const MIN_WITHDRAW_POINTS = 5000; // Minimum 5,000 Points ($5.00) required to withdraw
export const DAILY_MAX_POINTS = 2500; // Anti-cheat: max points earnable per day
export const REWARDED_VIDEO_COOLDOWN_SECONDS = 120; // 2 minutes cooldown between rewarded video claims

// Mandatory Regulatory Notice for Wallet and Withdraw screens
export const MANDATORY_REWARDS_NOTICE =
  'Rewards depend on ad revenue, are reviewed manually and are not guaranteed. Amounts may be very small.';

interface WalletModalProps {
  points: number;
  todayPoints: number;
  transactions: TransactionRecord[];
  onRedeemPerk: (perkId: string, perkName: string, cost: number) => boolean;
  onEarnPoints: (points: number, reason: string) => void;
  onDeductPoints?: (points: number, reason: string) => void;
  onClose: () => void;
  seniorMode: boolean;
  hasAdFree?: boolean;
  onBuyAdFree?: () => void;
  currentUser?: AppUser | null;
  onOpenAdminPortal?: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  points,
  todayPoints,
  transactions,
  onRedeemPerk,
  onEarnPoints,
  onDeductPoints,
  onClose,
  seniorMode,
  hasAdFree = false,
  onBuyAdFree,
  currentUser,
  onOpenAdminPortal,
}) => {
  const [activeTab, setActiveTab] = useState<'wallet' | 'withdraw' | 'history' | 'perks' | 'shop'>('wallet');

  // Withdrawal Form State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('Easypaisa');
  const [accountDetails, setAccountDetails] = useState('');
  const [confirmAccountDetails, setConfirmAccountDetails] = useState('');
  const [accountName, setAccountName] = useState(currentUser?.displayName || '');
  const [withdrawPointsAmount, setWithdrawPointsAmount] = useState(MIN_WITHDRAW_POINTS);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  const [withdrawSuccessModal, setWithdrawSuccessModal] = useState<WithdrawalRequest | null>(null);
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalRequest[]>([]);

  // Perks State
  const [unlockedPerks, setUnlockedPerks] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('joyearn_unlocked_perks');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Simulated ad & cooldown state
  const [simulatedAdPlaying, setSimulatedAdPlaying] = useState(false);
  const [simulatedAdSeconds, setSimulatedAdSeconds] = useState(5);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [purchaseSuccessMessage, setPurchaseSuccessMessage] = useState<string | null>(null);

  // Load user's withdrawal history
  const fetchHistory = async () => {
    const list = await loadUserWithdrawals(currentUser?.uid || 'device_user');
    setWithdrawalHistory(list);
  };

  useEffect(() => {
    fetchHistory();
  }, [currentUser]);

  // Check rewarded video cooldown
  useEffect(() => {
    const checkCooldown = () => {
      const lastClaim = localStorage.getItem('joyearn_last_rewarded_video_time');
      if (lastClaim) {
        const elapsedSec = Math.floor((Date.now() - parseInt(lastClaim, 10)) / 1000);
        const rem = Math.max(0, REWARDED_VIDEO_COOLDOWN_SECONDS - elapsedSec);
        setCooldownRemaining(rem);
      } else {
        setCooldownRemaining(0);
      }
    };
    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Real Cash Value Calculations
  const cashValue = (points / POINTS_PER_DOLLAR).toFixed(2);
  const minCashRequired = (MIN_WITHDRAW_POINTS / POINTS_PER_DOLLAR).toFixed(2);
  const progressToMin = Math.min(100, Math.round((points / MIN_WITHDRAW_POINTS) * 100));
  const canWithdraw = points >= MIN_WITHDRAW_POINTS;

  // Validation logic
  const validateWithdrawalInputs = (): string | null => {
    if (!canWithdraw) {
      return `Minimum withdrawal requires ${MIN_WITHDRAW_POINTS.toLocaleString()} points ($${minCashRequired}).`;
    }

    // Block new request while a Pending one exists
    const hasPending = withdrawalHistory.some((w) => w.status === 'Pending');
    if (hasPending) {
      return 'You already have a Pending payout request. Please wait until it is processed before submitting another.';
    }

    const acc = accountDetails.trim();
    const confirm = confirmAccountDetails.trim();
    const name = accountName.trim();

    if (!acc) return 'Please enter your account details.';
    if (!confirm) return 'Please re-type your account details to confirm.';
    if (acc !== confirm) return 'Account details do not match! Please verify both entries are identical.';
    if (!name) return 'Please enter the registered account holder name / title.';

    if (paymentMethod === 'Easypaisa' || paymentMethod === 'JazzCash') {
      if (!/^03\d{9}$/.test(acc)) {
        return `${paymentMethod} number must be an 11-digit mobile number in the 03XXXXXXXXX format (e.g. 03001234567).`;
      }
    } else if (paymentMethod === 'PayPal') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(acc)) {
        return 'Please enter a valid PayPal email address.';
      }
    } else if (paymentMethod === 'Bank transfer') {
      if (acc.length < 10) {
        return 'Bank transfer requires a valid IBAN or account number (at least 10 characters) and title.';
      }
    }

    return null;
  };

  // Open confirmation screen before final submission
  const handleOpenConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    soundService.playClick();
    const err = validateWithdrawalInputs();
    if (err) {
      setValidationError(err);
      hapticService.warning();
      return;
    }
    setValidationError(null);
    hapticService.light();
    setShowConfirmModal(true);
  };

  // Final Atomic Withdrawal Submission
  const handleConfirmAndSubmitWithdrawal = async () => {
    if (isSubmittingWithdrawal) return;
    setIsSubmittingWithdrawal(true);
    soundService.playClick();

    const pointsToDeduct = Math.min(points, Math.max(MIN_WITHDRAW_POINTS, withdrawPointsAmount));
    const cashEquivalent = pointsToDeduct / POINTS_PER_DOLLAR;

    try {
      const request = await submitWithdrawalRequestToCloud({
        userUid: currentUser?.uid || 'device_user',
        userName: accountName.trim(),
        userEmail: currentUser?.email || 'unregistered@device.local',
        points: pointsToDeduct,
        cashAmount: cashEquivalent,
        paymentMethod,
        accountDetails: accountDetails.trim(),
        accountName: accountName.trim(),
        status: 'Pending',
      });

      if (onDeductPoints) {
        onDeductPoints(pointsToDeduct, `Withdrawal Request: ${paymentMethod} ($${cashEquivalent.toFixed(2)})`);
      }

      soundService.playFanfare();
      hapticService.heavy();
      setShowConfirmModal(false);
      setWithdrawSuccessModal(request);
      setIsSubmittingWithdrawal(false);
      setAccountDetails('');
      setConfirmAccountDetails('');
      await fetchHistory();
      setActiveTab('history');
    } catch (err: any) {
      console.error('Withdrawal error:', err);
      setIsSubmittingWithdrawal(false);
      alert(err?.message || 'Unable to process withdrawal right now. Please try again.');
    }
  };

  // Spend points on in-app perk
  const handleUnlockPerk = (perk: PerkItem) => {
    if (unlockedPerks[perk.id]) return;
    if (points < perk.pointsCost) {
      soundService.playClick();
      hapticService.warning();
      alert(`You need ${perk.pointsCost - points} more JoyPoints to unlock this perk!`);
      return;
    }

    const success = onRedeemPerk(perk.id, perk.name, perk.pointsCost);
    if (success) {
      soundService.playFanfare();
      hapticService.heavy();
      const updated = { ...unlockedPerks, [perk.id]: true };
      setUnlockedPerks(updated);
      try {
        localStorage.setItem('joyearn_unlocked_perks', JSON.stringify(updated));
      } catch {
        // Ignore
      }
    }
  };

  // Rewarded Video Ad with Anti-Cheat Cooldown
  const handleWatchRewardedAd = () => {
    if (simulatedAdPlaying) return;

    if (cooldownRemaining > 0) {
      soundService.playClick();
      alert(`Anti-cheat cooldown active: Please wait ${cooldownRemaining}s before watching another sponsored video.`);
      return;
    }

    // Check daily max limit
    if (todayPoints >= DAILY_MAX_POINTS) {
      alert(`Daily points limit reached (${DAILY_MAX_POINTS} Pts). Please return tomorrow to continue earning!`);
      return;
    }

    soundService.playClick();
    hapticService.light();
    setSimulatedAdPlaying(true);
    setSimulatedAdSeconds(5);

    const timer = setInterval(() => {
      setSimulatedAdSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setSimulatedAdPlaying(false);
          soundService.playCoin();
          hapticService.success();
          localStorage.setItem('joyearn_last_rewarded_video_time', String(Date.now()));
          setCooldownRemaining(REWARDED_VIDEO_COOLDOWN_SECONDS);
          onEarnPoints(50, 'Watched Rewarded Family Partner Ad');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSimulatePurchase = (product: InAppProduct) => {
    soundService.playClick();
    hapticService.heavy();
    soundService.playFanfare();

    if (product.id === 'ad_free_lifetime' && onBuyAdFree) {
      onBuyAdFree();
    } else {
      onEarnPoints(product.rawPrice * 100, `Purchased In-App Bundle: ${product.title}`);
    }

    setPurchaseSuccessMessage(`✓ Successfully simulated purchase of ${product.title}!`);
    setTimeout(() => {
      setPurchaseSuccessMessage(null);
    }, 4500);
  };

  const isAdmin =
    currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
    localStorage.getItem('joyearn_admin_override') === 'true';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border-4 border-amber-400">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
              🪙
            </div>
            <div>
              <h2 className="font-black text-base flex items-center gap-1.5">
                <span>{seniorMode ? 'جوائے ارن والیٹ اور انعامات' : 'JoyEarn Wallet & Rewards'}</span>
                {isAdmin && (
                  <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 rounded-full font-black uppercase">
                    Admin
                  </span>
                )}
              </h2>
              <p className="text-xs text-amber-100">
                {POINTS_PER_DOLLAR.toLocaleString()} Points = $1.00 USD • Ad-funded rewards
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isAdmin && onOpenAdminPortal && (
              <button
                onClick={onOpenAdminPortal}
                title="Open Admin Portal"
                className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white text-xs font-bold tap-bounce shadow-sm"
              >
                ⚙️
              </button>
            )}
            <button
              onClick={() => {
                soundService.playClick();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold tap-bounce"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Balance & Real Cash Value Card */}
        <div className="p-4 bg-gradient-to-b from-amber-50 to-orange-50/50 dark:from-slate-800 dark:to-slate-850 border-b border-amber-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider block">
              Available Balance
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {points.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Points</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-800 flex items-center gap-0.5">
                <span>≈ ${cashValue} USD</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                (+{todayPoints} today)
              </span>
            </div>
          </div>

          <div className="text-right space-y-1">
            <button
              onClick={() => setActiveTab('withdraw')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black tap-bounce shadow-md flex items-center gap-1.5 transition-all ${
                canWithdraw
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-95'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}
            >
              <span>{seniorMode ? 'رقم نکلوائیں' : 'Withdraw'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <p className="text-[9px] text-slate-400 dark:text-slate-500">
              Min: {MIN_WITHDRAW_POINTS.toLocaleString()} Pts (${minCashRequired})
            </p>
          </div>
        </div>

        {/* Progress Bar to Minimum Withdrawal */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <span>Goal: Min Withdrawal ({MIN_WITHDRAW_POINTS.toLocaleString()} Pts)</span>
            </span>
            <span className={canWithdraw ? 'text-emerald-600 font-black' : 'text-amber-600 font-black'}>
              {canWithdraw ? 'Goal Reached! ✓' : `${progressToMin}%`}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                canWithdraw
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-amber-400 to-orange-500'
              }`}
              style={{ width: `${progressToMin}%` }}
            />
          </div>
        </div>

        {/* MANDATORY POLICY NOTICE ON WALLET SCREEN */}
        <div className="bg-amber-50 dark:bg-amber-950/40 p-2.5 border-b border-amber-200 dark:border-amber-800 text-[10px] text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p>{MANDATORY_REWARDS_NOTICE}</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-black">
          {[
            { id: 'wallet', label: '💳 Wallet' },
            { id: 'withdraw', label: '📤 Withdraw' },
            { id: 'history', label: `📋 History (${withdrawalHistory.length})` },
            { id: 'perks', label: '🎁 Perks' },
            { id: 'shop', label: '💎 Shop' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                soundService.playClick();
                hapticService.selection();
                setActiveTab(tab.id as any);
              }}
              className={`flex-1 py-2.5 transition-all text-center select-none text-[11px] tap-bounce ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 border-b-2 border-amber-500 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {purchaseSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-800 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{purchaseSuccessMessage}</span>
            </div>
          )}

          {/* TAB 1: WALLET OVERVIEW & EARN EXTRA VIA REWARDED ADS */}
          {activeTab === 'wallet' && (
            <div className="space-y-3">
              {/* Mandatory Rewards Notice */}
              <div className="bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-2xl border border-amber-300 dark:border-amber-700 text-[10px] text-amber-900 dark:text-amber-200 leading-relaxed flex items-center gap-2">
                <span className="shrink-0 text-sm">ℹ️</span>
                <p className="font-semibold">{MANDATORY_REWARDS_NOTICE}</p>
              </div>

              {/* Cash Out Callout Card */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-md space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-100">
                      Cash Value Equivalent
                    </span>
                    <h3 className="text-2xl font-black">${cashValue} USD</h3>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shadow-inner">
                    💵
                  </div>
                </div>

                <p className="text-xs text-emerald-100 leading-relaxed">
                  Earn points by completing daily 5-question quizzes, maintaining streaks, and optional rewarded videos.
                </p>

                <button
                  onClick={() => setActiveTab('withdraw')}
                  disabled={!canWithdraw}
                  className={`w-full py-2.5 rounded-xl font-black text-xs tap-bounce flex items-center justify-center gap-2 ${
                    canWithdraw
                      ? 'bg-white text-emerald-800 hover:bg-emerald-50 shadow-md'
                      : 'bg-emerald-800/60 text-emerald-200 cursor-not-allowed'
                  }`}
                >
                  <span>
                    {canWithdraw
                      ? seniorMode
                        ? 'ابھی رقم ٹرانسفر کریں'
                        : 'Withdraw Funds Now'
                      : `Need ${(MIN_WITHDRAW_POINTS - points).toLocaleString()} more points to withdraw`}
                  </span>
                </button>
              </div>

              {/* Watch Rewarded Video Ad Card */}
              <div className="bg-white dark:bg-slate-800 border-2 border-amber-300 dark:border-slate-700 rounded-2xl p-3.5 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 flex items-center justify-center text-lg">
                      📺
                    </div>
                    <div>
                      <h4 className="font-black text-xs text-slate-900 dark:text-white">
                        Watch Sponsored Ad (+50 Points)
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {cooldownRemaining > 0
                          ? `Cooldown: ${cooldownRemaining}s remaining`
                          : 'Optional video • Anti-cheat protected'}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-black bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">
                    +50 Pts
                  </span>
                </div>

                {simulatedAdPlaying ? (
                  <div className="p-3 bg-slate-900 text-white rounded-xl text-center space-y-1.5">
                    <p className="text-xs font-bold text-amber-400">Playing Partner Message ({simulatedAdSeconds}s)</p>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-400 h-full transition-all duration-1000"
                        style={{ width: `${((5 - simulatedAdSeconds) / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleWatchRewardedAd}
                    disabled={cooldownRemaining > 0}
                    className={`w-full py-2.5 rounded-xl font-black text-xs tap-bounce flex items-center justify-center gap-1.5 shadow-sm ${
                      cooldownRemaining > 0
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 hover:opacity-95'
                    }`}
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>
                      {cooldownRemaining > 0
                        ? `Wait ${cooldownRemaining}s`
                        : seniorMode
                        ? 'ویڈیو دیکھیں (+50 پوائنٹس)'
                        : 'Watch Video (+50 Pts)'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: WITHDRAWAL FORM */}
          {activeTab === 'withdraw' && (
            <div className="space-y-3">
              {/* Mandatory Notice Banner */}
              <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-300 dark:border-amber-700 text-[10px] text-amber-900 dark:text-amber-200 leading-relaxed space-y-1">
                <span className="font-black uppercase tracking-wider block text-amber-950 dark:text-amber-300">
                  ⚠️ Important Payout Policy
                </span>
                <p>{MANDATORY_REWARDS_NOTICE}</p>
              </div>

              {!canWithdraw ? (
                <div className="text-center py-8 px-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <Lock className="w-8 h-8 text-slate-400 mx-auto" />
                  <h4 className="font-black text-sm text-slate-800 dark:text-slate-100">
                    Withdrawal Locked
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                    You currently have {points.toLocaleString()} points. You need at least {MIN_WITHDRAW_POINTS.toLocaleString()} points ($5.00) to submit a payout request.
                  </p>
                  <button
                    onClick={() => setActiveTab('wallet')}
                    className="px-4 py-2 bg-amber-500 text-white font-bold rounded-xl text-xs tap-bounce mt-2"
                  >
                    Earn More Points
                  </button>
                </div>
              ) : (
                <form onSubmit={handleOpenConfirmation} className="space-y-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm text-left">
                  <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center justify-between">
                    <span>Submit Payout Request</span>
                    <span className="text-xs text-emerald-600 font-bold">
                      Available: ${cashValue}
                    </span>
                  </h4>

                  {validationError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-200 font-bold flex items-center gap-1.5 animate-shake">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{validationError}</span>
                    </div>
                  )}

                  {/* Payment Method Dropdown */}
                  <div>
                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
                      Payment Method *
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => {
                        setPaymentMethod(e.target.value as PaymentMethodType);
                        setValidationError(null);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-hidden focus:border-amber-500"
                    >
                      <option value="Easypaisa">Easypaisa (Pakistan)</option>
                      <option value="JazzCash">JazzCash (Pakistan)</option>
                      <option value="PayPal">PayPal (International)</option>
                      <option value="Bank transfer">Bank Transfer (Direct IBAN)</option>
                      <option value="Gift card">Digital Gift Card (Google / Amazon)</option>
                    </select>
                  </div>

                  {/* Account Details */}
                  <div>
                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
                      Account Details (Mobile #, IBAN or PayPal Email) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        paymentMethod === 'PayPal'
                          ? 'your-paypal-email@example.com'
                          : paymentMethod === 'Bank transfer'
                          ? 'PK... IBAN or Account Number'
                          : '03001234567 (11 digits)'
                      }
                      value={accountDetails}
                      onChange={(e) => {
                        setAccountDetails(e.target.value);
                        setValidationError(null);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-amber-500"
                    />
                  </div>

                  {/* Re-enter Account Details (Type Twice to Confirm) */}
                  <div>
                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
                      Re-type Account Details (Must Match Above) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Re-enter your payment details exactly"
                      value={confirmAccountDetails}
                      onChange={(e) => {
                        setConfirmAccountDetails(e.target.value);
                        setValidationError(null);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-amber-500"
                    />
                  </div>

                  {/* Account Holder Name */}
                  <div>
                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
                      Account Holder Name / Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Full Name as registered on account"
                      value={accountName}
                      onChange={(e) => {
                        setAccountName(e.target.value);
                        setValidationError(null);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-amber-500"
                    />
                  </div>

                  {/* Amount to Withdraw */}
                  <div>
                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
                      Points to Withdraw: {withdrawPointsAmount.toLocaleString()} Pts ($
                      {(withdrawPointsAmount / POINTS_PER_DOLLAR).toFixed(2)})
                    </label>
                    <input
                      type="range"
                      min={MIN_WITHDRAW_POINTS}
                      max={points}
                      step={500}
                      value={withdrawPointsAmount}
                      onChange={(e) => setWithdrawPointsAmount(parseInt(e.target.value, 10))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingWithdrawal}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-xl text-xs shadow-md tap-bounce flex items-center justify-center gap-2"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>
                      Review Payout Request (${(withdrawPointsAmount / POINTS_PER_DOLLAR).toFixed(2)})
                    </span>
                  </button>
                </form>
              )}

              {/* Confirmation Screen Modal */}
              {showConfirmModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
                  <div className="bg-white dark:bg-slate-900 border-2 border-emerald-400 rounded-3xl p-4 w-full max-w-sm text-left shadow-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">⚠️</span>
                        <h4 className="font-black text-sm text-slate-900 dark:text-white">
                          Confirm Payout Details
                        </h4>
                      </div>
                      <button
                        onClick={() => setShowConfirmModal(false)}
                        className="text-slate-400 hover:text-slate-600 p-1"
                      >
                        ✕
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Please carefully double-check your payout details before submitting. Once submitted, your points will be held securely for manual review.
                    </p>

                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Method:</span>
                        <strong className="text-slate-900 dark:text-white">{paymentMethod}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Account:</span>
                        <strong className="text-amber-600 dark:text-amber-400 font-mono">{accountDetails}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Holder Title:</span>
                        <strong className="text-slate-900 dark:text-white">{accountName}</strong>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1">
                        <span className="text-slate-500">Payout Amount:</span>
                        <strong className="text-emerald-600 font-black">
                          ${(withdrawPointsAmount / POINTS_PER_DOLLAR).toFixed(2)} USD ({withdrawPointsAmount.toLocaleString()} Pts)
                        </strong>
                      </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950/50 p-2 rounded-xl text-[10px] text-amber-900 dark:text-amber-200">
                      {MANDATORY_REWARDS_NOTICE}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowConfirmModal(false)}
                        disabled={isSubmittingWithdrawal}
                        className="py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmAndSubmitWithdrawal}
                        disabled={isSubmittingWithdrawal}
                        className="py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white rounded-xl text-xs font-black shadow-md tap-bounce flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {isSubmittingWithdrawal ? (
                          <span>Submitting...</span>
                        ) : (
                          <span>Confirm & Submit ✓</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WITHDRAWAL HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-black text-slate-800 dark:text-white">
                  Payout History & Status
                </span>
                <span className="text-[10px] text-slate-500">
                  {withdrawalHistory.length} total request(s)
                </span>
              </div>

              {withdrawalHistory.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-400 space-y-1">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold">No withdrawal requests yet.</p>
                  <p className="text-[10px]">Reach {MIN_WITHDRAW_POINTS.toLocaleString()} points to request payout.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {withdrawalHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                            {item.paymentMethod || 'Payout'}
                          </span>
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                              item.status === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : item.status === 'Rejected'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <span className="font-black text-xs text-emerald-600">
                          ${item.cashAmount ? item.cashAmount.toFixed(2) : (item.points / POINTS_PER_DOLLAR).toFixed(2)}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>Account: {item.accountDetails || 'N/A'}</span>
                        <span>{item.points.toLocaleString()} Pts</span>
                      </div>

                      <div className="text-[9px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60">
                        <span>Submitted: {new Date(item.createdAt).toLocaleDateString()}</span>
                        {item.adminNote && <span className="text-amber-600 font-bold">{item.adminNote}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PERKS & BOOSTERS (ORIGINAL PRESERVED) */}
          {activeTab === 'perks' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-600 gap-2 px-1">
                <span>Spend earned JoyPoints to unlock cosmetic themes & powerups:</span>
                <span className="text-[11px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                  Earned Rewards Only
                </span>
              </div>

              <div className="space-y-2.5">
                {IN_APP_PERKS.map((perk) => {
                  const isUnlocked = unlockedPerks[perk.id];
                  const canAfford = points >= perk.pointsCost;

                  return (
                    <div
                      key={perk.id}
                      className={`p-3.5 rounded-2xl border-2 flex items-center justify-between transition-all ${
                        isUnlocked
                          ? 'bg-emerald-50/60 border-emerald-300'
                          : canAfford
                          ? 'bg-white border-amber-300 shadow-xs'
                          : 'bg-gray-50 border-gray-200 opacity-75'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-100 to-pink-100 border border-amber-200 flex items-center justify-center text-2xl shadow-inner">
                          {perk.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-extrabold text-xs text-gray-900">{perk.name}</h4>
                            <span className="text-[10px] font-bold text-amber-800">
                              ({perk.urduName})
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5">{perk.description}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xs font-black text-amber-800 bg-amber-100/80 px-2 py-0.2 rounded-md">
                              {perk.pointsCost.toLocaleString()} Pts
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        {isUnlocked ? (
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Unlocked
                          </span>
                        ) : (
                          <button
                            onClick={() => handleUnlockPerk(perk)}
                            disabled={!canAfford}
                            className={`px-3 py-1.5 rounded-xl font-extrabold text-xs tap-bounce ${
                              canAfford
                                ? 'bg-gradient-to-r from-amber-500 to-pink-500 text-white shadow-xs'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            Unlock
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: IN-APP PRODUCTS SHOP (ORIGINAL PRESERVED) */}
          {activeTab === 'shop' && (
            <div className="space-y-3">
              <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl text-xs space-y-1 text-purple-900">
                <div className="flex items-center gap-1.5 font-black">
                  <ShoppingBag className="w-4 h-4 text-purple-600" />
                  <span>Optional Google Play In-App Billing (USD)</span>
                </div>
                <p className="text-[11px] text-purple-700 leading-snug">
                  All learning, daily quizzes, and rewards are 100% free. These are optional supporter bundles.
                </p>
              </div>

              <div className="space-y-2.5">
                {IN_APP_PRODUCTS.map((prod) => {
                  const isOwned = prod.id === 'ad_free_lifetime' && hasAdFree;

                  return (
                    <div
                      key={prod.id}
                      className={`p-3.5 rounded-2xl border-2 flex items-center justify-between ${
                        isOwned
                          ? 'bg-emerald-50 border-emerald-300'
                          : 'bg-white border-purple-200 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 border border-purple-200 flex items-center justify-center text-2xl shadow-inner">
                          {prod.icon}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs text-gray-900">{prod.title}</h4>
                          <p className="text-[11px] text-gray-500 mt-0.5">{prod.description}</p>
                          <span className="text-xs font-black text-purple-800 bg-purple-100 px-2 py-0.2 rounded-md mt-1 inline-block">
                            {prod.priceUsd}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSimulatePurchase(prod)}
                        disabled={isOwned}
                        className={`px-3 py-1.5 rounded-xl font-extrabold text-xs tap-bounce ${
                          isOwned
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs'
                        }`}
                      >
                        {isOwned ? 'Active ✓' : 'Buy'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Withdrawal Success Confirmation Popup */}
        {withdrawSuccessModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-xs w-full text-center space-y-3.5 border-4 border-emerald-400 shadow-2xl animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-md">
                🎉
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">
                  Request Confirmed
                </span>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Withdrawal Submitted!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Your request of <strong>${withdrawSuccessModal.cashAmount?.toFixed(2)}</strong> via{' '}
                  <strong>{withdrawSuccessModal.paymentMethod}</strong> is now <strong>Pending</strong>.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 leading-snug">
                Review period: up to 7 business days. Payouts are manually approved from real ad revenue.
              </div>

              <button
                onClick={() => setWithdrawSuccessModal(null)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs tap-bounce shadow-md"
              >
                Great, View History!
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
