import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  MessageSquare,
  Users,
  Search,
  CheckCheck,
  Smile,
  Mic,
  Gift,
  Flag,
  UserX,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';
import { submitContentReport } from '../services/firestoreService';

interface CommunityChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  seniorMode?: boolean;
}

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  time: string;
  isMe?: boolean;
}

// Family-safe profanity filter list
const INAPPROPRIATE_KEYWORDS = [
  'hate', 'ugly', 'stupid', 'idiot', 'kill', 'murder', 'shut up', 'damn', 'crap',
  'bastard', 'hell', 'fool', 'loser', 'scam', 'cheat', 'fake', 'porn', 'sex'
];

export const CommunityChatModal: React.FC<CommunityChatModalProps> = ({
  isOpen,
  onClose,
  seniorMode = false
}) => {
  const [activeChannel, setActiveChannel] = useState<'global' | 'study' | 'urdu'>('global');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('joyearn_community_chat_msgs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [blockedUsers, setBlockedUsers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('joyearn_blocked_chat_users');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [safetyNotice, setSafetyNotice] = useState<string | null>(null);
  const [reportSuccessId, setReportSuccessId] = useState<string | null>(null);
  const { light, success, warning } = useHaptics();

  if (!isOpen) return null;

  const containsInappropriateWords = (text: string): boolean => {
    const lower = text.toLowerCase();
    return INAPPROPRIATE_KEYWORDS.some((word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(lower);
    });
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = inputText.trim();
    if (!cleanText) return;

    // Bad-words filter check
    if (containsInappropriateWords(cleanText)) {
      warning();
      setSafetyNotice('Please use family-safe, polite language according to Community Guidelines.');
      setTimeout(() => setSafetyNotice(null), 4000);
      return;
    }

    const now = new Date();
    const timeStr = `${now.getHours() % 12 || 12}:${now.getMinutes().toString().padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      user: 'You',
      text: cleanText,
      time: timeStr,
      isMe: true
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    try {
      localStorage.setItem('joyearn_community_chat_msgs', JSON.stringify(updated));
    } catch {}

    setInputText('');
    soundService.playClick();
    light();
  };

  const handleReportMessage = async (msg: ChatMessage) => {
    warning();
    setReportSuccessId(msg.id);
    await submitContentReport('chat_message', msg.id, msg.text, 'Community chat safety report');
    setTimeout(() => setReportSuccessId(null), 3000);
  };

  const handleBlockUser = (user: string) => {
    if (user === 'You') return;
    soundService.playClick();
    const updated = [...blockedUsers, user];
    setBlockedUsers(updated);
    try {
      localStorage.setItem('joyearn_blocked_chat_users', JSON.stringify(updated));
    } catch {}
    setSafetyNotice(`User ${user} has been blocked and their messages hidden.`);
    setTimeout(() => setSafetyNotice(null), 3000);
  };

  const visibleMessages = messages.filter((m) => !blockedUsers.includes(m.user));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md h-[88vh] bg-white rounded-3xl shadow-2xl border-2 border-indigo-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">
              💬
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-black text-sm sm:text-base leading-tight">
                  {seniorMode ? 'کمیونٹی لرنرز لاؤنج' : 'Community Learning Lounge'}
                </h2>
                <span className="text-[9px] bg-emerald-500/80 px-1.5 py-0.2 rounded-full font-bold">
                  Safe & Moderated
                </span>
              </div>
              <p className="text-[11px] text-indigo-100 font-medium">
                {seniorMode ? 'محفوظ خاندانی تعلیمی ماحول' : 'Family-safe • Zero simulated messages'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Safety Banner */}
        <div className="bg-indigo-50 px-3 py-1.5 border-b border-indigo-100 flex items-center justify-between text-[10px] text-indigo-900 font-bold">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            Safe For All Ages: Bad-words filtered & real-time report protection
          </span>
        </div>

        {/* Channel Selector */}
        <div className="flex items-center bg-slate-100 p-1.5 border-b border-slate-200 text-xs font-black">
          <button
            onClick={() => setActiveChannel('global')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              activeChannel === 'global' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            # Global Lounge
          </button>
          <button
            onClick={() => setActiveChannel('study')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              activeChannel === 'study' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            # Study Group 📚
          </button>
          <button
            onClick={() => setActiveChannel('urdu')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              activeChannel === 'urdu' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            اردو فورم 🇵🇰
          </button>
        </div>

        {/* Notifications / Feedback Alert */}
        {safetyNotice && (
          <div className="bg-amber-100 text-amber-900 text-xs px-3 py-2 border-b border-amber-200 flex items-center gap-1.5 font-bold animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{safetyNotice}</span>
          </div>
        )}

        {/* Messages Feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
          {visibleMessages.length === 0 ? (
            /* Friendly Empty State When No Messages */
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-slate-400">
              <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl shadow-inner">
                💭
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-sm text-slate-800">
                  {seniorMode ? 'اس چینل میں ابھی کوئی پیغام نہیں ہے' : 'No messages in this lounge yet'}
                </h4>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  {seniorMode
                    ? 'گفتگو شروع کرنے اور مطالعہ کا مثبت مشورہ شیئر کرنے والے پہلے فرد بنیں!'
                    : 'Be the first to say hello and share an encouraging study tip with fellow learners!'}
                </p>
              </div>
            </div>
          ) : (
            visibleMessages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col group ${m.isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="text-[10px] text-slate-400 font-bold px-1 mb-0.5 flex items-center gap-1.5">
                  <span>{m.user}</span>
                  <span>•</span>
                  <span>{m.time}</span>
                  {!m.isMe && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-1">
                      <button
                        onClick={() => handleReportMessage(m)}
                        className="text-[9px] text-rose-500 hover:underline flex items-center gap-0.5"
                        title="Report message"
                      >
                        <Flag className="w-2.5 h-2.5" /> Report
                      </button>
                      <button
                        onClick={() => handleBlockUser(m.user)}
                        className="text-[9px] text-slate-500 hover:underline flex items-center gap-0.5"
                        title="Block user"
                      >
                        <UserX className="w-2.5 h-2.5" /> Block
                      </button>
                    </div>
                  )}
                </div>

                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-xs relative ${
                    m.isMe
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                  }`}
                >
                  {m.text}

                  {reportSuccessId === m.id && (
                    <div className="absolute -top-6 right-0 bg-rose-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                      ✓ Reported for review
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <div className="flex-1 flex items-center bg-slate-100 rounded-2xl px-3 py-2 border border-slate-200">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={seniorMode ? 'محفوظ پیغام لکھیں...' : 'Type family-friendly message...'}
              maxLength={200}
              className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-10 h-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white flex items-center justify-center shadow-md transition-transform"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
