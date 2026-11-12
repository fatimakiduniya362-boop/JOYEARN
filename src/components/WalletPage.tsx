import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Sparkles,
  TrendingUp,
  ArrowDownToLine,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Info,
  DollarSign,
  Play,
  RotateCcw,
  AlertCircle,
  X,
  CreditCard,
  Building2,
  Smartphone,
  Check,
  Lock,
  ArrowRight,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { TransactionRecord, AppUser, PaymentMethodType, WithdrawalRequest } from '../types';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';
import { submitWithdrawalRequestToCloud, loadUserWithdrawals } from '../services/firestoreService';
import {
  DAILY_MAX_POINTS,
  POINTS_PER_DOLLAR,
  MIN_WITHDRAW_USD,
  MAX_WITHDRAW_USD_PER_REQUEST,
  MAX_WITHDRAWALS_PER_MONTH,
  MIN_ACCOUNT_AGE_DAYS,
  MIN_ACTIVE_DAYS_TO_WITHDRAW,
  OWNER_PERCENT,
  USERS_PERCENT,
  PAYOUT_FEE_PERCENT,
  POOL_CARRY_OVER,
  MANDATORY_REWARDS_NOTICE,
  POOL_REVENUE_NOTICE,
  UNPUBLISHED_MONTH_NOTICE,
  PAYOUT_REVIEW_TEXT,
  PAYOUT_REVIEW_NOTICE,
} from '../config/paymentConfig';
import { calculatePayoutFee } from '../services/monthlyPoolService';

export {
  DAILY_MAX_POINTS,
  POINTS_PER_DOLLAR,
  MIN_WITHDRAW_USD,
  MAX_WITHDRAW_USD_PER_REQUEST,
  OWNER_PERCENT,
  USERS_PERCENT,
  PAYOUT_FEE_PERCENT,
  POOL_CARRY_OVER,
  MANDATORY_REWARDS_NOTICE,
  POOL_REVENUE_NOTICE,
  PAYOUT_REVIEW_TEXT,
  PAYOUT_REVIEW_NOTICE,
};

const REWARDED_VIDEO_COOLDOWN_SECONDS = 60;

export interface SavedPayoutProfile {
  method: 'Easypaisa' | 'JazzCash' | 'Bank' | 'PayPal';
  accountTitle: string;
  accountNumber: string;
  bankName?: string;
  savedAt: string;
}

type SummaryModalType = 'total_earned' | 'today_points' | 'pending_rewards' | 'completed_tasks' | null;

interface WalletPageProps {
  points: number;
  todayPoints: number;
  totalJoyPointsEarned?: number;
  completedTasksCount?: number;
  transactions: TransactionRecord[];
  onEarnPoints: (points: number, reason: string) => void;
  onDeductPoints?: (points: number, reason: string) => void;
  seniorMode: boolean;
  currentUser: AppUser | null;
  onOpenAdminPortal?: () => void;
  onBackToHome?: () => void;
}

export const WalletPage: React.FC<WalletPageProps> = ({
  points,
  todayPoints,
  totalJoyPointsEarned = 0,
  completedTasksCount = 0,
  transactions,
  onEarnPoints,
  onDeductPoints,
  seniorMode,
  currentUser,
  onOpenAdminPortal,
  onBackToHome,
}) => {
  const { light, success, warning, heavy, selection } = useHaptics();

  // Tab: 'overview' | 'withdraw' | 'history'
  const [activeTab, setActiveTab] = useState<'overview' | 'withdraw' | 'history'>('overview');

  // Interactive 4 Summary Cards Modal State
  const [activeSummaryModal, setActiveSummaryModal] = useState<SummaryModalType>(null);

  // Rewarded Video Cooldown state
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(() => {
    try {
      const last = localStorage.getItem('joyearn_last_rewarded_video_time');
      if (last) {
        const diffSeconds = Math.floor((Date.now() - parseInt(last, 10)) / 1000);
        return Math.max(0, REWARDED_VIDEO_COOLDOWN_SECONDS - diffSeconds);
      }
    } catch {}
    return 0;
  });

  const [simulatedAdPlaying, setSimulatedAdPlaying] = useState(false);
  const [simulatedAdSeconds, setSimulatedAdSeconds] = useState(5);

  // Payout Method & Saved Details State
  const [withdrawalMethod, setWithdrawalMethod] = useState<'Easypaisa' | 'JazzCash' | 'Bank' | 'PayPal'>('Easypaisa');
  const [withdrawalAccount, setWithdrawalAccount] = useState('');
  const [confirmWithdrawalAccount, setConfirmWithdrawalAccount] = useState('');
  const [withdrawalAccountTitle, setWithdrawalAccountTitle] = useState(currentUser?.displayName || '');
  const [withdrawalBankName, setWithdrawalBankName] = useState('Meezan Bank');
  const [saveDetailsForFuture, setSaveDetailsForFuture] = useState(true);

  // Field validation error states
  const [accountError, setAccountError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  // Saved profile loaded from local storage
  const [savedProfile, setSavedProfile] = useState<SavedPayoutProfile | null>(() => {
    try {
      const saved = localStorage.getItem('joyearn_saved_payout_details');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Approved USD Balance credited upon admin monthly pool publication
  const approvedBalanceUSD = typeof currentUser?.approvedBalanceUSD === 'number' ? currentUser.approvedBalanceUSD : 0;

  // Withdrawal Amount State (in USD, min $100, max $500 per request)
  const [withdrawalAmountUSD, setWithdrawalAmountUSD] = useState<number>(() => {
    return Math.max(MIN_WITHDRAW_USD, Math.min(approvedBalanceUSD, MAX_WITHDRAW_USD_PER_REQUEST));
  });

  // Review & Confirmation Step Modal
  const [showReviewStep, setShowReviewStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawalSuccessVoucher, setWithdrawalSuccessVoucher] = useState<{
    id: string;
    amountDollars: string;
    feeDollars: string;
    netDollars: string;
    method: string;
    account: string;
    accountTitle: string;
    date: string;
  } | null>(null);

  const [userWithdrawals, setUserWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loadingUserWithdrawals, setLoadingUserWithdrawals] = useState(false);

  const fetchMyWithdrawals = async () => {
    setLoadingUserWithdrawals(true);
    try {
      const list = await loadUserWithdrawals(currentUser?.uid || 'device_user', true);
      setUserWithdrawals(list);
    } catch (err) {
      console.warn('Error loading user withdrawals:', err);
    } finally {
      setLoadingUserWithdrawals(false);
    }
  };

  useEffect(() => {
    fetchMyWithdrawals();
  }, [currentUser?.uid]);

  const [withdrawalNotice, setWithdrawalNotice] = useState<string | null>(null);
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null);

  // Active pending transactions & rewards
  const pendingTransactions = transactions.filter((t) => t.status === 'Pending');

  // Requirements Checklist calculations
  const userAccountAgeDays = useMemo(() => {
    try {
      const created = localStorage.getItem('joyearn_account_created_at');
      if (created) {
        const diff = Math.floor((Date.now() - new Date(created).getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(diff, 10);
      }
    } catch {}
    return 14;
  }, []);

  const userActiveDaysThisMonth = useMemo(() => {
    try {
      const days = parseInt(localStorage.getItem('joyearn_active_days_month') || '18', 10);
      return Math.max(days, 18);
    } catch {
      return 18;
    }
  }, []);

  const pendingRequestsCount = userWithdrawals.filter((w) => w.status === 'Pending' || w.status === 'Submitted' || w.status === 'Under review').length;
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const monthlyWithdrawalsCount = userWithdrawals.filter(
    (w) => w.createdAt && w.createdAt.slice(0, 7) === currentMonthStr && w.status !== 'Rejected'
  ).length;

  const reqBalance = approvedBalanceUSD >= MIN_WITHDRAW_USD;
  const reqNoPending = pendingRequestsCount === 0;
  const reqAccountAge = userAccountAgeDays >= MIN_ACCOUNT_AGE_DAYS;
  const reqActiveDays = userActiveDaysThisMonth >= MIN_ACTIVE_DAYS_TO_WITHDRAW;
  const reqMonthlyCount = monthlyWithdrawalsCount < MAX_WITHDRAWALS_PER_MONTH;

  const allRequirementsMet = reqBalance && reqNoPending && reqAccountAge && reqActiveDays && reqMonthlyCount;

  const disabledReason = useMemo(() => {
    if (!reqBalance) {
      return `Approved balance is $${approvedBalanceUSD.toFixed(2)} USD (minimum $${MIN_WITHDRAW_USD}.00 USD required, shortfall: $${(MIN_WITHDRAW_USD - approvedBalanceUSD).toFixed(2)} USD). Your share will be calculated when this month is published.`;
    }
    if (!reqNoPending) {
      return `You currently have ${pendingRequestsCount} active withdrawal request under review (${PAYOUT_REVIEW_TEXT}). Only 1 active request is permitted at a time.`;
    }
    if (!reqAccountAge) {
      return `Your account age is ${userAccountAgeDays} days (minimum ${MIN_ACCOUNT_AGE_DAYS} days required).`;
    }
    if (!reqActiveDays) {
      return `You have ${userActiveDaysThisMonth} active days this month (minimum ${MIN_ACTIVE_DAYS_TO_WITHDRAW} days required).`;
    }
    if (!reqMonthlyCount) {
      return `You have reached the limit of ${MAX_WITHDRAWALS_PER_MONTH} withdrawal requests for this calendar month.`;
    }
    return '';
  }, [reqBalance, reqNoPending, reqAccountAge, reqActiveDays, reqMonthlyCount, approvedBalanceUSD, pendingRequestsCount, userAccountAgeDays, userActiveDaysThisMonth, monthlyWithdrawalsCount]);

  const canWithdraw = allRequirementsMet;
  const missingDollarsToWithdraw = Math.max(0, MIN_WITHDRAW_USD - approvedBalanceUSD).toFixed(2);
  const balanceProgressPercentage = Math.min(100, Math.max(0, Math.round((approvedBalanceUSD / MIN_WITHDRAW_USD) * 100)));

  // Current fee details for selected USD amount
  const currentFeeDetails = calculatePayoutFee(withdrawalAmountUSD);

  // Check if account title differs from user displayName
  const accountTitleMismatch = useMemo(() => {
    if (!currentUser?.displayName || !withdrawalAccountTitle) return false;
    return withdrawalAccountTitle.trim().toLowerCase() !== currentUser.displayName.trim().toLowerCase();
  }, [currentUser?.displayName, withdrawalAccountTitle]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  // Load saved profile into form if available
  useEffect(() => {
    if (savedProfile && !withdrawalAccount) {
      setWithdrawalMethod(savedProfile.method);
      setWithdrawalAccount(savedProfile.accountNumber);
      setConfirmWithdrawalAccount(savedProfile.accountNumber);
      setWithdrawalAccountTitle(savedProfile.accountTitle);
      if (savedProfile.bankName) {
        setWithdrawalBankName(savedProfile.bankName);
      }
    }
  }, [savedProfile]);

  // Sync withdrawalAmountUSD if available balance changes
  useEffect(() => {
    if (approvedBalanceUSD >= MIN_WITHDRAW_USD && withdrawalAmountUSD > approvedBalanceUSD) {
      setWithdrawalAmountUSD(Math.min(approvedBalanceUSD, MAX_WITHDRAW_USD_PER_REQUEST));
    }
  }, [approvedBalanceUSD]);

  // Handle Full Balance Selection
  const handleSelectFullBalance = () => {
    soundService.playClick();
    selection();
    if (approvedBalanceUSD >= MIN_WITHDRAW_USD) {
      const target = Math.min(approvedBalanceUSD, MAX_WITHDRAW_USD_PER_REQUEST);
      setWithdrawalAmountUSD(target);
      setWithdrawalNotice(`Full available balance of $${target.toFixed(2)} USD selected for payout.`);
      setTimeout(() => setWithdrawalNotice(null), 3500);
    } else {
      warning();
      setWithdrawalError(
        `Withdrawal Blocked: Your approved balance is $${approvedBalanceUSD.toFixed(2)} USD, which is below the mandatory $100 USD threshold. Current Shortfall: $${missingDollarsToWithdraw} USD. Minimum withdrawal is $100.`
      );
      setTimeout(() => setWithdrawalError(null), 6000);
    }
  };

  // Rewarded Ad Simulation Countdown
  const handleWatchRewardedAd = () => {
    if (cooldownRemaining > 0 || simulatedAdPlaying) return;
    soundService.playClick();
    light();
    setSimulatedAdPlaying(true);
    setSimulatedAdSeconds(5);

    const timer = setInterval(() => {
      setSimulatedAdSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (simulatedAdPlaying && simulatedAdSeconds === 0) {
      setSimulatedAdPlaying(false);
      soundService.playCoin();
      success();
      try {
        localStorage.setItem('joyearn_last_rewarded_video_time', String(Date.now()));
      } catch {}
      setCooldownRemaining(REWARDED_VIDEO_COOLDOWN_SECONDS);
      onEarnPoints(50, 'Watched Rewarded Family Partner Ad');
    }
  }, [simulatedAdPlaying, simulatedAdSeconds, onEarnPoints, success]);

  // Export Transaction History as a downloadable CSV file
  const handleExportCSV = () => {
    soundService.playClick();
    light();

    if (!transactions || transactions.length === 0) {
      warning();
      setWithdrawalNotice('No transaction history records available to export yet.');
      return;
    }

    const escapeCSV = (val: string | number | null | undefined): string => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = ['Record ID', 'Date', 'Description', 'JoyPoints', 'Status'];
    const rows = transactions.map((tx) => [
      escapeCSV(tx.id),
      escapeCSV(tx.date),
      escapeCSV(tx.title),
      escapeCSV(tx.points >= 0 ? `+${tx.points}` : `${tx.points}`),
      escapeCSV(tx.status || 'Completed'),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `joyearn_transactions_ledger_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    success();
    setWithdrawalNotice(`Ledger exported successfully as CSV (${transactions.length} records).`);
  };

  // Step 1: Validate and open review confirmation
  const handleOpenReview = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawalError(null);
    setAccountError(null);
    setConfirmError(null);
    setTitleError(null);

    // 1. Mandatory Checklist Check
    if (!allRequirementsMet) {
      warning();
      setWithdrawalError(disabledReason || 'Withdrawal requirements are not yet met.');
      return;
    }

    // 2. Minimum Requested Amount Validation
    if (withdrawalAmountUSD < MIN_WITHDRAW_USD) {
      warning();
      setWithdrawalError(`The minimum withdrawal threshold is $${MIN_WITHDRAW_USD}.00 USD. You cannot withdraw less than $${MIN_WITHDRAW_USD}.`);
      return;
    }

    // 3. Balance Sufficiency Check
    if (withdrawalAmountUSD > approvedBalanceUSD) {
      warning();
      setWithdrawalError(
        `Insufficient Balance: Requested amount ($${withdrawalAmountUSD.toFixed(2)} USD) exceeds your approved balance ($${approvedBalanceUSD.toFixed(2)} USD). Maximum you can withdraw right now is $${approvedBalanceUSD.toFixed(2)} USD.`
      );
      return;
    }

    // 4. Per request maximum check
    if (withdrawalAmountUSD > MAX_WITHDRAW_USD_PER_REQUEST) {
      warning();
      setWithdrawalError(
        `The maximum withdrawal per request is $${MAX_WITHDRAW_USD_PER_REQUEST}.00 USD.`
      );
      return;
    }

    const cleanTitle = withdrawalAccountTitle.trim();
    let cleanAccount = withdrawalAccount.trim();
    let cleanConfirm = confirmWithdrawalAccount.trim();

    if (!cleanTitle) {
      warning();
      setTitleError('Please enter the registered Account Holder Name / Title.');
      return;
    }

    if (!cleanAccount) {
      warning();
      setAccountError('Please enter your recipient account number, phone number, or IBAN.');
      return;
    }

    if (!cleanConfirm) {
      warning();
      setConfirmError('Please confirm your account number or IBAN by typing it again.');
      return;
    }

    // Format conversion and validation
    if (withdrawalMethod === 'Easypaisa' || withdrawalMethod === 'JazzCash') {
      let digits = cleanAccount.replace(/[\s-]/g, '');
      let confirmDigits = cleanConfirm.replace(/[\s-]/g, '');

      // Support +923XXXXXXXXX and 923XXXXXXXXX conversion
      if (digits.startsWith('+92')) digits = '0' + digits.slice(3);
      else if (digits.startsWith('92')) digits = '0' + digits.slice(2);

      if (confirmDigits.startsWith('+92')) confirmDigits = '0' + confirmDigits.slice(3);
      else if (confirmDigits.startsWith('92')) confirmDigits = '0' + confirmDigits.slice(2);

      cleanAccount = digits;
      cleanConfirm = confirmDigits;

      if (!/^03\d{9}$/.test(digits)) {
        warning();
        setAccountError(`${withdrawalMethod} requires an 11-digit Pakistani mobile number starting with 03 (e.g. 03001234567).`);
        return;
      }
    } else if (withdrawalMethod === 'PayPal') {
      if (!/^\S+@\S+\.\S+$/.test(cleanAccount)) {
        warning();
        setAccountError('Please enter a valid PayPal email address (e.g. user@example.com).');
        return;
      }
    } else if (withdrawalMethod === 'Bank') {
      const ibanClean = cleanAccount.replace(/[\s-]/g, '').toUpperCase();
      const confirmIbanClean = cleanConfirm.replace(/[\s-]/g, '').toUpperCase();

      cleanAccount = ibanClean;
      cleanConfirm = confirmIbanClean;

      // Pakistani IBAN format: PK + 2 digits + 4 letters + 16 digits (total 24 characters)
      const pakIbanRegex = /^PK\d{2}[A-Z]{4}\d{16}$/;
      if (!pakIbanRegex.test(ibanClean)) {
        warning();
        setAccountError('Pakistani IBAN must be 24 characters starting with PK, 2 digits, 4 bank letters, and 16 account digits (e.g. PK36MEZN0000001234567890).');
        return;
      }
    }

    // Double-entry match verification
    if (cleanAccount !== cleanConfirm) {
      warning();
      setConfirmError('The confirmed account number does not match. Please verify and retype carefully.');
      return;
    }

    // Save details if requested
    if (saveDetailsForFuture) {
      const profileToSave: SavedPayoutProfile = {
        method: withdrawalMethod,
        accountTitle: cleanTitle,
        accountNumber: cleanAccount,
        bankName: withdrawalMethod === 'Bank' ? withdrawalBankName : undefined,
        savedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem('joyearn_saved_payout_details', JSON.stringify(profileToSave));
        setSavedProfile(profileToSave);
      } catch {}
    }

    soundService.playClick();
    selection();
    setShowReviewStep(true);
  };

  // Step 2: Final Confirmation & Submission (Idempotent)
  const handleConfirmFinalPayout = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setWithdrawalError(null);

    const uniqueTxId = `JOY-WD-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const feeCalc = calculatePayoutFee(withdrawalAmountUSD);

      // 1. Submit to Firestore cloud / audit service
      await submitWithdrawalRequestToCloud({
        userUid: currentUser?.uid || 'device_user',
        userName: withdrawalAccountTitle.trim(),
        userEmail: currentUser?.email || 'user@joyearn.com',
        points: Math.round(withdrawalAmountUSD * 1000), // legacy point logging reference
        cashAmount: feeCalc.gross,
        feePercent: feeCalc.feePercent,
        feeAmount: feeCalc.feeAmount,
        netAmount: feeCalc.netAmount,
        paidAmount: feeCalc.netAmount,
        paymentMethod: withdrawalMethod === 'Bank' ? `Bank (${withdrawalBankName})` : withdrawalMethod,
        accountDetails: withdrawalAccount.trim(),
        accountName: withdrawalAccountTitle.trim(),
        status: 'Pending',
      });

      soundService.playFanfare();
      heavy();

      // 2. Set success confirmation voucher
      setWithdrawalSuccessVoucher({
        id: uniqueTxId,
        amountDollars: feeCalc.gross.toFixed(2),
        feeDollars: feeCalc.feeAmount.toFixed(2),
        netDollars: feeCalc.netAmount.toFixed(2),
        method: withdrawalMethod === 'Bank' ? `Bank (${withdrawalBankName})` : withdrawalMethod,
        account: withdrawalAccount.trim(),
        accountTitle: withdrawalAccountTitle.trim(),
        date: new Date().toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      });

      setShowReviewStep(false);
      setIsSubmitting(false);

      // Refresh user withdrawal history
      fetchMyWithdrawals().catch(() => {});

      // Reset withdrawal amount
      const remainingApproved = Math.max(0, approvedBalanceUSD - withdrawalAmountUSD);
      setWithdrawalAmountUSD(Math.max(MIN_WITHDRAW_USD, Math.min(remainingApproved, MAX_WITHDRAW_USD_PER_REQUEST)));

    } catch (err: any) {
      console.error('Withdrawal submission error:', err);
      setIsSubmitting(false);
      warning();
      setWithdrawalError(err?.message || 'Failed to submit withdrawal request. Please check connection and retry.');
    }
  };

  return (
    <div className="w-full flex flex-col bg-slate-50 min-h-full pb-28">
      {/* Wallet Header */}
      <div className="bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 text-white p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white tap-bounce shrink-0"
                title="Back to Home"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shadow-inner shrink-0">
              💼
            </div>
            <div>
              <h1 className={`font-black flex items-center gap-1.5 ${seniorMode ? 'text-2xl' : 'text-lg'}`}>
                {seniorMode ? 'والیٹ اور محفوظ کیش آؤٹ' : 'Wallet & Rewards'}
              </h1>
              <p className="text-xs text-sky-100 font-medium">
                Verified genuine rewards • Ad revenue backed
              </p>
            </div>
          </div>

          {(currentUser?.email === 'admin@joyearn.com' || currentUser?.email === 'fatimakiduniya362@gmail.com') && onOpenAdminPortal && (
            <button
              onClick={onOpenAdminPortal}
              className="text-[11px] font-bold bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-xl text-sky-100 tap-bounce"
            >
              Admin Portal
            </button>
          )}
        </div>

        {/* Main Balance Card: Points first, then Approved balance: $X.XX USD */}
        <div className="mt-4 bg-white/15 backdrop-blur-md rounded-3xl p-4 border border-white/20 space-y-3">
          <div className="flex items-center justify-between text-xs text-sky-100">
            <span className="font-extrabold uppercase tracking-wider text-[10px]">
              My Accumulated Balance
            </span>
            <span className="font-black bg-white/20 px-2 py-0.5 rounded-full text-white flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-300" />
              <span>Verified Account</span>
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              {/* Points first */}
              <div className="text-3xl font-black text-white tracking-tight flex items-center">
                <span>{points.toLocaleString()}</span>
                <span className="text-xs text-sky-200 ml-1.5 font-bold">JoyPoints</span>
              </div>
              {/* Approved balance */}
              <div className="text-xs text-sky-100 font-bold mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="bg-white/20 px-2 py-0.5 rounded-md text-white font-extrabold">
                  Approved balance: ${approvedBalanceUSD.toFixed(2)} USD
                </span>
                {canWithdraw ? (
                  <span className="text-emerald-300 font-extrabold">• Ready to Withdraw</span>
                ) : (
                  <span className="text-amber-200 font-semibold">• Min $100.00 USD</span>
                )}
              </div>
              {/* Notice for unpublished month with no dollar estimate */}
              <p className="text-[10px] text-sky-200/90 font-medium mt-1">
                {UNPUBLISHED_MONTH_NOTICE}
              </p>
            </div>

            <button
              onClick={() => {
                soundService.playClick();
                selection();
                setActiveTab('withdraw');
              }}
              className="px-4 py-2 bg-white text-sky-700 hover:bg-sky-50 rounded-2xl font-black text-xs tap-bounce shadow-md flex items-center gap-1.5 shrink-0"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Withdraw</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4-Stat Metric Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3">
        {/* Card 1: Total Earned */}
        <div
          onClick={() => {
            soundService.playClick();
            selection();
            setActiveSummaryModal('total_earned');
          }}
          className="bg-white p-3 rounded-2xl border border-slate-200/90 hover:border-sky-300 transition-all cursor-pointer tap-bounce shadow-2xs group relative overflow-hidden"
          title="Tap to view Lifetime Points Breakdown"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
              Total Points
            </span>
            <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-sky-600 transition-colors" />
          </div>
          <div className="text-sm font-black text-slate-900 mt-0.5">
            {totalJoyPointsEarned.toLocaleString()} Pts
          </div>
          <span className="text-[10px] text-slate-500 font-semibold block truncate">
            Lifetime Verified • View ↗
          </span>
        </div>

        {/* Card 2: Today's Points */}
        <div
          onClick={() => {
            soundService.playClick();
            selection();
            setActiveSummaryModal('today_points');
          }}
          className="bg-white p-3 rounded-2xl border border-slate-200/90 hover:border-sky-300 transition-all cursor-pointer tap-bounce shadow-2xs group relative overflow-hidden"
          title="Tap to view Today's Points Breakdown"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
              Today's Points
            </span>
            <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-sky-600 transition-colors" />
          </div>
          <div className="text-sm font-black text-sky-600 mt-0.5">
            +{todayPoints.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 font-semibold block truncate">
            Cap: {DAILY_MAX_POINTS} Pts • View ↗
          </span>
        </div>

        {/* Card 3: Pending Requests */}
        <div
          onClick={() => {
            soundService.playClick();
            selection();
            setActiveSummaryModal('pending_rewards');
          }}
          className="bg-white p-3 rounded-2xl border border-slate-200/90 hover:border-amber-300 transition-all cursor-pointer tap-bounce shadow-2xs group relative overflow-hidden"
          title="Tap to view Pending Requests"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
              Pending Requests
            </span>
            <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-amber-600 transition-colors" />
          </div>
          <div className="text-sm font-black text-amber-600 mt-0.5">
            {pendingRequestsCount} Pending
          </div>
          <span className="text-[10px] text-slate-500 font-semibold block truncate">
            {PAYOUT_REVIEW_TEXT} • View ↗
          </span>
        </div>

        {/* Card 4: Completed Tasks */}
        <div
          onClick={() => {
            soundService.playClick();
            selection();
            setActiveSummaryModal('completed_tasks');
          }}
          className="bg-white p-3 rounded-2xl border border-slate-200/90 hover:border-emerald-300 transition-all cursor-pointer tap-bounce shadow-2xs group relative overflow-hidden"
          title="Tap to view Verified Completed Tasks History"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
              Completed Tasks
            </span>
            <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-emerald-600 transition-colors" />
          </div>
          <div className="text-sm font-black text-emerald-600 mt-0.5">
            {completedTasksCount} Verified
          </div>
          <span className="text-[10px] text-slate-500 font-semibold block truncate">
            100% Genuine • View ↗
          </span>
        </div>
      </div>

      {/* Tabs Switcher: Overview | Withdraw | Ledger */}
      <div className="px-3 flex gap-1.5 border-b border-slate-200 pb-2">
        <button
          onClick={() => {
            soundService.playClick();
            selection();
            setActiveTab('overview');
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all tap-bounce ${
            activeTab === 'overview'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          Overview & Boosts
        </button>

        <button
          onClick={() => {
            soundService.playClick();
            selection();
            setActiveTab('withdraw');
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all tap-bounce ${
            activeTab === 'withdraw'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          Withdraw ($100 Min)
        </button>

        <button
          onClick={() => {
            soundService.playClick();
            selection();
            setActiveTab('history');
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all tap-bounce ${
            activeTab === 'history'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          Ledger ({transactions.length})
        </button>
      </div>

      {/* In-Page Success & Error Notice Banners */}
      {withdrawalNotice && (
        <div className="m-3 p-3.5 bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-xs rounded-2xl shadow-xs animate-fadeIn flex items-center justify-between">
          <span>{withdrawalNotice}</span>
          <button onClick={() => setWithdrawalNotice(null)} className="text-emerald-700 font-bold ml-2">✕</button>
        </div>
      )}

      {withdrawalError && (
        <div className="m-3 p-3.5 bg-rose-100 border border-rose-300 text-rose-900 font-bold text-xs rounded-2xl shadow-xs animate-fadeIn flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
            <span>{withdrawalError}</span>
          </div>
          <button onClick={() => setWithdrawalError(null)} className="text-rose-700 font-bold ml-2">✕</button>
        </div>
      )}

      {/* TAB 1: OVERVIEW & BOOSTS */}
      {activeTab === 'overview' && (
        <div className="p-3 space-y-3 animate-fadeIn">
          {/* Daily Rewarded Video Boost Card */}
          <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-4 text-white shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  Instant Points Boost
                </span>
                <h3 className="text-base font-black mt-1">Watch Family Partner Ad</h3>
                <p className="text-xs text-purple-100 mt-0.5">
                  Earn +50 genuine JoyPoints instantly • 1 min cooldown
                </p>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shadow-inner">
                📺
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between pt-2 border-t border-white/20">
              <span className="text-xs font-black text-amber-200">+50 JoyPoints</span>

              {simulatedAdPlaying ? (
                <div className="px-4 py-2 bg-white text-indigo-700 rounded-xl text-xs font-black flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>Viewing Partner Ad ({simulatedAdSeconds}s)</span>
                </div>
              ) : cooldownRemaining > 0 ? (
                <button
                  disabled
                  className="px-4 py-2 bg-white/30 text-white/80 rounded-xl text-xs font-black cursor-not-allowed flex items-center gap-1"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Cooldown ({cooldownRemaining}s)</span>
                </button>
              ) : (
                <button
                  onClick={handleWatchRewardedAd}
                  className="px-4 py-2 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl text-xs font-black tap-bounce shadow flex items-center gap-1"
                >
                  <Play className="w-3.5 h-3.5 fill-indigo-700" />
                  <span>Watch & Claim (+50)</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Withdrawal Jump Banner with Minimum withdrawal: $100 & Progress bar */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                  Minimum withdrawal: ${MIN_WITHDRAW_USD}.00 USD
                </span>
                <h3 className="font-black text-xs sm:text-sm text-slate-900 mt-1">
                  {canWithdraw
                    ? `You have $${approvedBalanceUSD.toFixed(2)} USD ready to withdraw!`
                    : `Need $${missingDollarsToWithdraw} more in approved balance to reach $100 min`}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Supported: Easypaisa, JazzCash, Pakistani Banks & PayPal.
                </p>
              </div>

              <button
                onClick={() => {
                  soundService.playClick();
                  selection();
                  setActiveTab('withdraw');
                }}
                disabled={!canWithdraw}
                className={`px-3.5 py-2 font-black text-xs rounded-xl shadow tap-bounce shrink-0 flex items-center gap-1 ${
                  canWithdraw
                    ? 'bg-sky-600 hover:bg-sky-700 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>Cash Out</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Progress bar toward $100 */}
            <div className="space-y-1 pt-1 border-t border-slate-100">
              <div className="flex justify-between text-[10px] font-bold text-slate-600">
                <span>Progress to $100 Goal:</span>
                <span className="font-black text-sky-600">{balanceProgressPercentage}% (${approvedBalanceUSD.toFixed(2)} / $100.00 USD)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(2, balanceProgressPercentage))}%` }}
                />
              </div>
            </div>
          </div>


        </div>
      )}

      {/* TAB 2: WITHDRAW EARNINGS ($100 Flow with Checklist) */}
      {activeTab === 'withdraw' && (
        <div className="p-3 space-y-3.5 animate-fadeIn">
          {/* Success Voucher Banner */}
          {withdrawalSuccessVoucher && (
            <div className="bg-emerald-50 border-2 border-emerald-400 rounded-3xl p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black">
                    ✓
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-emerald-950">
                      Withdrawal Request Submitted!
                    </h3>
                    <span className="text-[10px] text-emerald-700 font-bold">
                      Tracking ID: {withdrawalSuccessVoucher.id}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setWithdrawalSuccessVoucher(null)}
                  className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="bg-white rounded-2xl p-3 border border-emerald-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Gross Payout Request:</span>
                  <strong className="text-slate-900 font-black">${withdrawalSuccessVoucher.amountDollars} USD</strong>
                </div>
                <div className="flex justify-between text-amber-700 font-bold">
                  <span>Transfer Fee ({PAYOUT_FEE_PERCENT}%):</span>
                  <span>-${withdrawalSuccessVoucher.feeDollars} USD</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-700 font-bold">Amount You Will Receive:</span>
                  <strong className="text-emerald-700 font-black text-sm">${withdrawalSuccessVoucher.netDollars} USD</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Method:</span>
                  <span className="font-extrabold text-slate-800">{withdrawalSuccessVoucher.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Account:</span>
                  <span className="font-bold text-slate-800">{withdrawalSuccessVoucher.accountTitle} ({withdrawalSuccessVoucher.account})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md font-black text-[10px]">
                    Under Review ({PAYOUT_REVIEW_TEXT})
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-emerald-800 leading-snug">
                Your withdrawal request has been securely recorded for review.
              </p>
            </div>
          )}

          {/* REQUIREMENTS CHECKLIST (Prominently displayed at top of Withdraw screen) */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  📋
                </div>
                <h3 className="font-black text-sm text-slate-900">
                  Withdrawal Requirements Checklist
                </h3>
              </div>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                allRequirementsMet
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                {allRequirementsMet ? 'All Requirements Met' : 'Action Required'}
              </span>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              {/* Req 1: Balance >= MIN_WITHDRAW_USD */}
              <div className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-150">
                <div className="flex items-center gap-2">
                  {reqBalance ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-slate-800 block">Approved Balance: Minimum ${MIN_WITHDRAW_USD}.00 USD</span>
                    <span className="text-[10px] text-slate-500">
                      Current approved balance: ${approvedBalanceUSD.toFixed(2)} USD {reqBalance ? '(Eligible)' : `(Shortfall: $${missingDollarsToWithdraw} USD)`}
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
                  reqBalance ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {reqBalance ? '✓ PASS' : '✕ INCOMPLETE'}
                </span>
              </div>

              {/* Req 2: No Pending Request */}
              <div className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-150">
                <div className="flex items-center gap-2">
                  {reqNoPending ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-slate-800 block">Pending Request Gate: No active request under review</span>
                    <span className="text-[10px] text-slate-500">
                      {reqNoPending ? 'No pending requests active' : `${pendingRequestsCount} active request in review queue (${PAYOUT_REVIEW_TEXT})`}
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
                  reqNoPending ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {reqNoPending ? '✓ PASS' : '✕ 1 IN PROGRESS'}
                </span>
              </div>

              {/* Req 3: Account Age >= 7 days */}
              <div className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-150">
                <div className="flex items-center gap-2">
                  {reqAccountAge ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-slate-800 block">Account Maturity: At least {MIN_ACCOUNT_AGE_DAYS} days</span>
                    <span className="text-[10px] text-slate-500">
                      Account age: {userAccountAgeDays} days registered
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
                  reqAccountAge ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {reqAccountAge ? '✓ PASS' : '✕ INSUFFICIENT'}
                </span>
              </div>

              {/* Req 4: Active Days >= 15 days */}
              <div className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-150">
                <div className="flex items-center gap-2">
                  {reqActiveDays ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-slate-800 block">Monthly Activity: Minimum {MIN_ACTIVE_DAYS_TO_WITHDRAW} active days</span>
                    <span className="text-[10px] text-slate-500">
                      Active days this calendar month: {userActiveDaysThisMonth} days
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
                  reqActiveDays ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {reqActiveDays ? '✓ PASS' : '✕ INSUFFICIENT'}
                </span>
              </div>

              {/* Req 5: Monthly Request Limit < 2 */}
              <div className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-150">
                <div className="flex items-center gap-2">
                  {reqMonthlyCount ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-slate-800 block">Monthly Request Limit: Max {MAX_WITHDRAWALS_PER_MONTH} requests per month</span>
                    <span className="text-[10px] text-slate-500">
                      Submitted this month: {monthlyWithdrawalsCount} of {MAX_WITHDRAWALS_PER_MONTH} limit
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
                  reqMonthlyCount ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {reqMonthlyCount ? '✓ PASS' : '✕ LIMIT REACHED'}
                </span>
              </div>
            </div>

            {/* Plain-text reason why withdraw button is disabled */}
            {!allRequirementsMet && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-black text-amber-950">Why is the Withdraw button disabled?</strong>
                  <p className="mt-0.5 leading-relaxed text-[11px] font-medium">
                    {disabledReason}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* MAIN WITHDRAWAL FORM CARD */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="font-black text-base text-slate-900">
                  Request Payout
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Minimum: ${MIN_WITHDRAW_USD}.00 USD
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Available to withdraw: <strong className="text-slate-900 font-black">${approvedBalanceUSD.toFixed(2)} USD</strong> (from published months)
              </p>

              {/* Mandatory Rewards and Pool Revenue Notice */}
              <div className="mt-3 p-3 bg-sky-50/70 border border-sky-200/70 rounded-2xl space-y-1.5 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5 text-sky-800 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>Rewards &amp; Pool Terms:</span>
                </div>
                <p className="leading-relaxed">{MANDATORY_REWARDS_NOTICE}</p>
                <p className="leading-relaxed text-slate-700 font-semibold pt-1 border-t border-sky-100">
                  {POOL_REVENUE_NOTICE}
                </p>
              </div>
            </div>

            <form onSubmit={handleOpenReview} className="space-y-4">
              {/* STEP 1: CHOOSE AMOUNT & METHOD */}
              <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 block">
                    Step 1: Choose Amount &amp; Payment Method
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectFullBalance}
                    className="text-[11px] font-black text-sky-600 hover:text-sky-700 hover:underline tap-bounce"
                  >
                    Max (${Math.min(approvedBalanceUSD, MAX_WITHDRAW_USD_PER_REQUEST).toFixed(2)})
                  </button>
                </div>

                {/* Amount Numeric Input & Slider */}
                <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500">Amount to Withdraw (USD):</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-black text-slate-400">$</span>
                      <input
                        type="number"
                        min={MIN_WITHDRAW_USD}
                        max={Math.min(approvedBalanceUSD, MAX_WITHDRAW_USD_PER_REQUEST)}
                        step={5}
                        value={withdrawalAmountUSD}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setWithdrawalAmountUSD(val);
                        }}
                        disabled={!canWithdraw}
                        className="w-24 p-1.5 rounded-lg border border-slate-300 font-black text-right text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500/30"
                      />
                      <span className="text-xs font-bold text-slate-500">USD</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={MIN_WITHDRAW_USD}
                    max={Math.max(MIN_WITHDRAW_USD, Math.min(approvedBalanceUSD, MAX_WITHDRAW_USD_PER_REQUEST))}
                    step={5}
                    value={withdrawalAmountUSD}
                    onChange={(e) => setWithdrawalAmountUSD(parseFloat(e.target.value))}
                    disabled={!canWithdraw}
                    className="w-full accent-sky-600 cursor-pointer"
                  />

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                    <span>Min: ${MIN_WITHDRAW_USD}.00 USD</span>
                    <span>Max: ${Math.min(approvedBalanceUSD, MAX_WITHDRAW_USD_PER_REQUEST).toFixed(2)} USD (Per request cap: $500)</span>
                  </div>
                </div>

                {/* Quick preset amount chips */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[100, 150, 200, 250].map((amt) => {
                    const isSelected = withdrawalAmountUSD === amt;
                    const isEligible = approvedBalanceUSD >= amt;

                    return (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => {
                          soundService.playClick();
                          selection();
                          setWithdrawalAmountUSD(amt);
                        }}
                        className={`p-2 rounded-xl border text-center transition-all tap-bounce ${
                          isSelected
                            ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                            : isEligible
                            ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                        }`}
                      >
                        <span className="block text-xs font-black">${amt}.00</span>
                        <span className={`block text-[9px] ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>
                          USD
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Method selector buttons */}
                <div className="pt-1 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 block">Select Payment Method:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Easypaisa', 'JazzCash', 'Bank', 'PayPal'] as const).map((method) => {
                      const isSelected = withdrawalMethod === method;
                      return (
                        <button
                          type="button"
                          key={method}
                          onClick={() => {
                            soundService.playClick();
                            selection();
                            setWithdrawalMethod(method);
                            setAccountError(null);
                            setConfirmError(null);
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-black transition-all tap-bounce text-left flex items-center justify-between ${
                            isSelected
                              ? 'bg-sky-50 border-sky-500 text-sky-900 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {method === 'Easypaisa' || method === 'JazzCash' ? (
                              <Smartphone className="w-4 h-4 text-sky-600 shrink-0" />
                            ) : method === 'Bank' ? (
                              <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
                            ) : (
                              <CreditCard className="w-4 h-4 text-sky-600 shrink-0" />
                            )}
                            <span className="truncate">{method === 'Bank' ? 'Bank transfer' : method}</span>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* STEP 2: ENTER ACCOUNT DETAILS */}
              <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 block">
                    Step 2: Enter Recipient Details
                  </label>
                  {savedProfile && savedProfile.method === withdrawalMethod && (
                    <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                      Saved Account Loaded
                    </span>
                  )}
                </div>

                {/* Account Title */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Account Holder Full Name / Title
                  </label>
                  <input
                    type="text"
                    value={withdrawalAccountTitle}
                    onChange={(e) => {
                      setWithdrawalAccountTitle(e.target.value);
                      setTitleError(null);
                    }}
                    placeholder="e.g. Muhammad Ali"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                  />
                  {titleError && (
                    <span className="text-[10.5px] font-bold text-rose-600 block mt-1">{titleError}</span>
                  )}
                  {/* Warning if title differs from registered profile */}
                  {accountTitleMismatch && (
                    <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-xl text-[10.5px] text-amber-900 font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>
                        Note: Account title differs from your profile name ({currentUser?.displayName}). Please verify your recipient bank name matches exactly to avoid transfer cancellation.
                      </span>
                    </div>
                  )}
                </div>

                {/* Bank Name if Bank Transfer */}
                {withdrawalMethod === 'Bank' && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Bank Name
                    </label>
                    <select
                      value={withdrawalBankName}
                      onChange={(e) => setWithdrawalBankName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/30"
                    >
                      <option value="Meezan Bank">Meezan Bank</option>
                      <option value="Habib Bank Limited (HBL)">Habib Bank Limited (HBL)</option>
                      <option value="United Bank Limited (UBL)">United Bank Limited (UBL)</option>
                      <option value="Bank Alfalah">Bank Alfalah</option>
                      <option value="Allied Bank Limited (ABL)">Allied Bank Limited (ABL)</option>
                      <option value="MCB Bank">MCB Bank</option>
                      <option value="Faysal Bank">Faysal Bank</option>
                      <option value="National Bank of Pakistan (NBP)">National Bank of Pakistan (NBP)</option>
                      <option value="Standard Chartered">Standard Chartered</option>
                      <option value="Other Bank">Other Bank</option>
                    </select>
                  </div>
                )}

                {/* Account Number / Mobile / Email */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    {withdrawalMethod === 'PayPal'
                      ? 'PayPal Registered Email Address'
                      : withdrawalMethod === 'Bank'
                      ? 'Pakistani IBAN (24 Characters: PK + 2 digits + 4 letters + 16 digits)'
                      : `${withdrawalMethod} Mobile Number (03XXXXXXXXX or +923XXXXXXXXX)`}
                  </label>
                  <input
                    type={withdrawalMethod === 'PayPal' ? 'email' : 'text'}
                    value={withdrawalAccount}
                    onChange={(e) => {
                      setWithdrawalAccount(e.target.value);
                      setAccountError(null);
                    }}
                    placeholder={
                      withdrawalMethod === 'PayPal'
                        ? 'recipient@example.com'
                        : withdrawalMethod === 'Bank'
                        ? 'PK36MEZN0000001234567890'
                        : '03001234567'
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 font-mono"
                  />
                  {accountError && (
                    <span className="text-[10.5px] font-bold text-rose-600 block mt-1">{accountError}</span>
                  )}
                </div>

                {/* Confirm Account Number (Typed twice and must match) */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Confirm Account Number / IBAN (Must match above)
                  </label>
                  <input
                    type={withdrawalMethod === 'PayPal' ? 'email' : 'text'}
                    value={confirmWithdrawalAccount}
                    onChange={(e) => {
                      setConfirmWithdrawalAccount(e.target.value);
                      setConfirmError(null);
                    }}
                    placeholder={
                      withdrawalMethod === 'PayPal'
                        ? 'retype recipient@example.com'
                        : withdrawalMethod === 'Bank'
                        ? 'retype PK36MEZN0000001234567890'
                        : 'retype 03001234567'
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 font-mono"
                  />
                  {confirmError && (
                    <span className="text-[10.5px] font-bold text-rose-600 block mt-1">{confirmError}</span>
                  )}
                  {confirmWithdrawalAccount && withdrawalAccount && confirmWithdrawalAccount.trim() === withdrawalAccount.trim() && (
                    <span className="text-[10.5px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Account entries match</span>
                    </span>
                  )}
                </div>

                {/* Save Details Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={saveDetailsForFuture}
                    onChange={(e) => setSaveDetailsForFuture(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-[11px] font-semibold text-slate-600">
                    Save this payout account securely for faster future withdrawals
                  </span>
                </label>
              </div>

              {/* STEP 3: FEE & REVIEW SUMMARY BREAKDOWN */}
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">
                  Step 3: Transfer Breakdown
                </span>
                <div className="flex justify-between text-slate-600">
                  <span>Requested Amount:</span>
                  <span className="font-bold text-slate-900">${currentFeeDetails.gross.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Payout Transfer Fee ({PAYOUT_FEE_PERCENT}%):</span>
                  <span className="font-bold">-${currentFeeDetails.feeAmount.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between text-slate-800 pt-1 border-t border-slate-200">
                  <span className="font-extrabold">Amount You Will Receive:</span>
                  <strong className="font-black text-emerald-600 text-sm">${currentFeeDetails.netAmount.toFixed(2)} USD</strong>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px] pt-0.5">
                  <span>Processing Review Time:</span>
                  <span className="font-bold text-slate-700">{PAYOUT_REVIEW_TEXT}</span>
                </div>
                <p className="text-[10px] text-slate-500 pt-1 leading-snug border-t border-slate-200">
                  Transfer fees are deducted from the payout amount.
                </p>
              </div>

              {/* Submit Review Button */}
              <button
                type="submit"
                disabled={!canWithdraw}
                className={`w-full py-3.5 rounded-2xl font-black text-xs tap-bounce shadow-md flex items-center justify-center gap-2 transition-all ${
                  canWithdraw
                    ? 'bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-sky-600/20'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
                }`}
              >
                {canWithdraw ? (
                  <>
                    <ArrowDownToLine className="w-4 h-4" />
                    <span>Review Payout Request (${withdrawalAmountUSD.toFixed(2)} USD) →</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Withdrawal Requirements Incomplete (See Checklist Above)</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: AUDITABLE TRANSACTION LEDGER */}
      {activeTab === 'history' && (
        <div className="p-3 space-y-4 animate-fadeIn">
          {/* Section 1: User's Withdrawal Requests History */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-900">
                  Payout Requests ({userWithdrawals.length})
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  Showing requested amount, 2% transfer fee &amp; net payout
                </p>
              </div>
              <button
                onClick={fetchMyWithdrawals}
                disabled={loadingUserWithdrawals}
                className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded-lg border border-sky-200 tap-bounce"
              >
                {loadingUserWithdrawals ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {userWithdrawals.length === 0 ? (
              <div className="bg-white rounded-2xl p-4 text-center border border-slate-200 text-xs text-slate-500">
                No payout requests submitted yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {userWithdrawals.map((w) => {
                  const gross = +(w.cashAmount || (w.points || 0) / POINTS_PER_DOLLAR).toFixed(2);
                  const fee = w.feeAmount !== undefined ? w.feeAmount : +((gross * PAYOUT_FEE_PERCENT) / 100).toFixed(2);
                  const net = w.netAmount !== undefined ? w.netAmount : +(gross - fee).toFixed(2);

                  return (
                    <div
                      key={w.id}
                      className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-900">{w.paymentMethod || 'Payout'}</span>
                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                                w.status === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : w.status === 'Rejected'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {w.status}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            ID: {w.id} • {new Date(w.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-600 block">
                            ${net.toFixed(2)} USD
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold block">
                            Net to Receive
                          </span>
                        </div>
                      </div>

                      {/* Detailed Fee & Amount Breakdown */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 space-y-1 text-[11px]">
                        <div className="flex justify-between text-slate-600">
                          <span>Requested Amount:</span>
                          <strong className="text-slate-800">${gross.toFixed(2)} USD</strong>
                        </div>
                        <div className="flex justify-between text-amber-700 font-medium">
                          <span>Transfer Fee ({w.feePercent ?? PAYOUT_FEE_PERCENT}%):</span>
                          <span>-${fee.toFixed(2)} USD</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
                          <span>Net Payout to Account:</span>
                          <strong className="text-emerald-700 font-black">${net.toFixed(2)} USD</strong>
                        </div>
                        <div className="flex justify-between text-slate-500 text-[10px] pt-0.5">
                          <span>Account:</span>
                          <span className="font-mono text-slate-700">{w.maskedAccount || w.accountDetails || 'N/A'}</span>
                        </div>
                        {w.paymentReference && (
                          <div className="flex justify-between text-emerald-700 font-semibold text-[10px] pt-0.5">
                            <span>Payment Reference:</span>
                            <span className="font-mono">{w.paymentReference}</span>
                          </div>
                        )}
                        {w.rejectionReason && (
                          <div className="p-1.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[10px]">
                            <strong>Reason:</strong> {w.rejectionReason} (Points returned to balance)
                          </div>
                        )}
                      </div>

                      {/* Contact support button */}
                      <div className="pt-1 flex justify-end">
                        <a
                          href={`mailto:fatimakiduniya362@gmail.com?subject=JoyEarn Withdrawal Inquiry - ${w.id}&body=Hello JoyEarn Support,%0D%0A%0D%0AMy withdrawal request ID is: ${w.id}%0D%0AAccount Title: ${w.accountName || ''}%0D%0APayout Method: ${w.paymentMethod || ''}%0D%0ANet Amount: $${net.toFixed(2)} USD%0D%0A%0D%0APlease assist with my request.`}
                          className="text-[10px] font-bold text-sky-600 hover:text-sky-800 hover:underline tap-bounce"
                        >
                          Contact support about this request ✉
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Verified Activity Ledger */}
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-900">
                  Verified Activity Ledger
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold">
                  {transactions.length} Records
                </p>
              </div>

              <button
                onClick={handleExportCSV}
                disabled={transactions.length === 0}
                className={`px-3.5 py-2 rounded-xl font-black text-xs tap-bounce shadow-2xs flex items-center gap-1.5 transition-all ${
                  transactions.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-emerald-600/20'
                }`}
                title="Download your transaction records as a CSV file"
              >
                <Download className="w-4 h-4" />
                <span>Download CSV Ledger</span>
              </button>
            </div>

            {transactions.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 space-y-2">
                <div className="text-3xl">📝</div>
                <h4 className="font-bold text-slate-700 text-xs">No transactions yet</h4>
                <p className="text-[11px] text-slate-400">
                  Complete daily quizzes, watch tutorials, or check in to start accumulating verified JoyPoints.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => {
                  const isPositive = tx.points >= 0;
                  return (
                    <div
                      key={tx.id}
                      className="p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md ${
                              tx.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {tx.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {tx.date}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 truncate mt-0.5">
                          {tx.title}
                        </h4>
                      </div>

                      <span
                        className={`text-xs font-black shrink-0 ${
                          isPositive ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isPositive ? `+${tx.points}` : tx.points} Pts
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: STEP 3 REVIEW & FINAL CONFIRMATION MODAL */}
      {showReviewStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold">
                  ✓
                </div>
                <h3 className="font-black text-sm text-slate-900">
                  Confirm Payout Details
                </h3>
              </div>
              <button
                onClick={() => setShowReviewStep(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 tap-bounce"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Payout Method:</span>
                <span className="font-extrabold text-slate-900">
                  {withdrawalMethod === 'Bank' ? `Bank (${withdrawalBankName})` : withdrawalMethod}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Account Title:</span>
                <span className="font-bold text-slate-800">{withdrawalAccountTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Account Number:</span>
                <span className="font-bold text-slate-800 font-mono">{withdrawalAccount}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">Requested Amount:</span>
                <strong className="text-slate-900 font-black">
                  ${currentFeeDetails.gross.toFixed(2)} USD
                </strong>
              </div>
              <div className="flex justify-between text-amber-700">
                <span>Payout Transfer Fee ({PAYOUT_FEE_PERCENT}%):</span>
                <span className="font-bold">-${currentFeeDetails.feeAmount.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="font-bold text-slate-800">Amount You Will Receive:</span>
                <strong className="text-emerald-600 font-black text-sm">
                  ${currentFeeDetails.netAmount.toFixed(2)} USD
                </strong>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 leading-snug">
              {POOL_REVENUE_NOTICE}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowReviewStep(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs tap-bounce hover:bg-slate-50"
              >
                Back / Edit
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmFinalPayout}
                className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs tap-bounce shadow flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Confirm Request</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: 4 SUMMARY CARDS INTERACTIVE DETAIL SHEETS */}
      {activeSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl border border-slate-200 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {activeSummaryModal === 'total_earned' && '💎'}
                  {activeSummaryModal === 'today_points' && '⭐'}
                  {activeSummaryModal === 'pending_rewards' && '⏳'}
                  {activeSummaryModal === 'completed_tasks' && '✅'}
                </span>
                <h3 className="font-black text-sm text-slate-900">
                  {activeSummaryModal === 'total_earned' && 'Total Verified Lifetime Points'}
                  {activeSummaryModal === 'today_points' && "Today's Verified Points"}
                  {activeSummaryModal === 'pending_rewards' && 'Pending Verification Queue'}
                  {activeSummaryModal === 'completed_tasks' && 'Verified Completed Tasks'}
                </h3>
              </div>
              <button
                onClick={() => setActiveSummaryModal(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 tap-bounce"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* DETAIL SHEET 1: TOTAL EARNED */}
            {activeSummaryModal === 'total_earned' && (
              <div className="space-y-3 text-xs">
                <div className="bg-sky-50 rounded-2xl p-3.5 border border-sky-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-sky-700">All-Time Cumulative</span>
                    <div className="text-xl font-black text-slate-900 mt-0.5">{totalJoyPointsEarned.toLocaleString()} JoyPoints</div>
                    <span className="text-[11px] font-bold text-sky-600">Approved Balance: ${approvedBalanceUSD.toFixed(2)} USD</span>
                  </div>
                  <div className="text-3xl">🏆</div>
                </div>

                <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="font-black text-[10px] uppercase tracking-wider text-slate-500 block">
                    Points Summary:
                  </span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Rewards depend on ad revenue, are reviewed manually and are not guaranteed.
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      setActiveSummaryModal(null);
                      setActiveTab('history');
                    }}
                    className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-black text-xs tap-bounce shadow"
                  >
                    View Ledger →
                  </button>
                  <button
                    onClick={() => {
                      handleExportCSV();
                    }}
                    disabled={transactions.length === 0}
                    className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs tap-bounce shadow flex items-center justify-center gap-1.5"
                    title="Download Transaction History (CSV)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download History</span>
                  </button>
                </div>
              </div>
            )}

            {/* DETAIL SHEET 2: TODAY'S POINTS */}
            {activeSummaryModal === 'today_points' && (
              <div className="space-y-3 text-xs">
                <div className="bg-sky-50 rounded-2xl p-3.5 border border-sky-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-sky-700">Today's Accumulated</span>
                    <div className="text-xl font-black text-sky-600 mt-0.5">+{todayPoints.toLocaleString()} Pts</div>
                    <span className="text-[10px] text-slate-500 font-semibold">Resets at local calendar midnight</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-bold">Daily Fair Cap</span>
                    <strong className="text-slate-800 text-xs font-black">{DAILY_MAX_POINTS} Pts</strong>
                  </div>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full"
                    style={{ width: `${Math.min(100, Math.round((todayPoints / DAILY_MAX_POINTS) * 100))}%` }}
                  />
                </div>

                <p className="text-[11px] text-slate-500 leading-snug">
                  The daily cap ensures fair play, preventing automated bot abuse and ensuring Google Play Family Policy compliance. Complete your daily activities to maximize points today.
                </p>

                <button
                  onClick={() => setActiveSummaryModal(null)}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs tap-bounce shadow"
                >
                  Got It ✓
                </button>
              </div>
            )}

            {/* DETAIL SHEET 3: PENDING REWARDS */}
            {activeSummaryModal === 'pending_rewards' && (
              <div className="space-y-3 text-xs">
                <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-700">Awaiting Verification</span>
                    <div className="text-xl font-black text-amber-700 mt-0.5">{pendingRequestsCount} Requests</div>
                    <span className="text-[11px] font-bold text-amber-600">Review time: {PAYOUT_REVIEW_TEXT}</span>
                  </div>
                  <div className="text-3xl">⏳</div>
                </div>

                {pendingRequestsCount === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-1">
                    <p className="font-bold text-slate-700">No Pending Requests</p>
                    <p className="text-[11px] text-slate-400">
                      All your activities and approved balances are up to date.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {userWithdrawals.filter((w) => w.status === 'Pending' || w.status === 'Submitted' || w.status === 'Under review').map((pt) => (
                      <div key={pt.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-800 text-[11px] truncate">${pt.cashAmount?.toFixed(2) || '0.00'} USD via {pt.paymentMethod}</p>
                          <span className="text-[9px] text-slate-400">{new Date(pt.createdAt).toLocaleDateString()}</span>
                        </div>
                        <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md shrink-0">
                          {pt.status} ({PAYOUT_REVIEW_TEXT})
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setActiveSummaryModal(null)}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs tap-bounce shadow"
                >
                  Close Window
                </button>
              </div>
            )}

            {/* DETAIL SHEET 4: COMPLETED TASKS */}
            {activeSummaryModal === 'completed_tasks' && (
              <div className="space-y-3 text-xs">
                <div className="bg-emerald-50 rounded-2xl p-3.5 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700">Verified Completed</span>
                    <div className="text-xl font-black text-emerald-700 mt-0.5">{completedTasksCount} Quests</div>
                    <span className="text-[11px] font-bold text-emerald-600">100% Genuine Activity</span>
                  </div>
                  <div className="text-3xl">🎯</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-slate-800">150-Day Curriculum Quests</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-slate-800">Verified Community Challenges</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-slate-800">Safe STEM &amp; Educational Goals</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActiveSummaryModal(null);
                    onBackToHome?.();
                  }}
                  className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-black text-xs tap-bounce shadow"
                >
                  Explore More Quests →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
