import React, { useState } from 'react';
import {
  X,
  Heart,
  MessageCircle,
  Gift,
  Share2,
  Users,
  Sparkles,
  Send,
  Video,
  Mic,
  MicOff,
  Flame,
  Award,
  Flag,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';
import { submitContentReport } from '../services/firestoreService';

interface LiveStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPoints: number;
  onSpendPoints?: (amount: number) => void;
  seniorMode?: boolean;
}

interface StreamComment {
  id: string;
  user: string;
  text: string;
  isGift?: boolean;
}

// Family-safe profanity filter list
const INAPPROPRIATE_KEYWORDS = [
  'hate', 'ugly', 'stupid', 'idiot', 'kill', 'murder', 'shut up', 'damn', 'crap',
  'bastard', 'hell', 'fool', 'loser', 'scam', 'cheat', 'fake', 'porn', 'sex'
];

export const LiveStreamModal: React.FC<LiveStreamModalProps> = ({
  isOpen,
  onClose,
  userPoints = 1250,
  onSpendPoints,
  seniorMode = false
}) => {
  // Real values: 0 starting likes and 1 viewer (current active user) - zero fake data
  const [likes, setLikes] = useState(0);
  const [isMicOn, setIsMicOn] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<StreamComment[]>([]);
  const [flyingHearts, setFlyingHearts] = useState<{ id: number; left: number }[]>([]);
  const [filterWarning, setFilterWarning] = useState<string | null>(null);
  const [reportedId, setReportedId] = useState<string | null>(null);
  const { light, success, warning } = useHaptics();

  if (!isOpen) return null;

  const containsInappropriateWords = (text: string): boolean => {
    const lower = text.toLowerCase();
    return INAPPROPRIATE_KEYWORDS.some((word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(lower);
    });
  };

  const handleLike = () => {
    setLikes((l) => l + 1);
    soundService.playClick();
    light();
    const id = Date.now();
    setFlyingHearts((prev) => [...prev, { id, left: Math.floor(Math.random() * 60) + 20 }]);
    setTimeout(() => {
      setFlyingHearts((prev) => prev.filter((h) => h.id !== id));
    }, 1200);
  };

  const handleSendComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = commentText.trim();
    if (!clean) return;

    if (containsInappropriateWords(clean)) {
      warning();
      setFilterWarning('Please use polite, respectful language in the study stream.');
      setTimeout(() => setFilterWarning(null), 3500);
      return;
    }

    setComments((prev) => [
      ...prev,
      { id: Date.now().toString(), user: 'You', text: clean }
    ]);
    setCommentText('');
    soundService.playClick();
  };

  const handleReportComment = async (comment: StreamComment) => {
    warning();
    setReportedId(comment.id);
    await submitContentReport('chat_message', comment.id, comment.text, 'Live stream comment safety report');
    setTimeout(() => setReportedId(null), 3000);
  };

  const handleSendGift = (giftName: string, cost: number, icon: string) => {
    if (userPoints < cost) {
      alert(`You need ${cost} JoyPoints to send this gift!`);
      return;
    }
    if (onSpendPoints) onSpendPoints(cost);
    soundService.playCoin();
    success();
    setComments((prev) => [
      ...prev,
      { id: Date.now().toString(), user: 'You', text: `Sent ${icon} ${giftName} (+${cost} Pts)`, isGift: true }
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md h-[92vh] bg-slate-950 text-white rounded-3xl overflow-hidden flex flex-col relative shadow-2xl border border-slate-800">
        {/* Stream Visual Area */}
        <div className="relative flex-1 bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 flex flex-col justify-between p-4 overflow-hidden">
          {/* Animated Background Simulation */}
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Top Bar */}
          <div className="relative z-10 flex items-center justify-between gap-2 bg-slate-900/60 backdrop-blur-md p-2 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 p-0.5">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-xs font-black">
                  🎙️
                </div>
              </div>
              <div>
                <div className="text-xs font-black flex items-center gap-1.5">
                  <span>Professor Tariq</span>
                  <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-black rounded-md animate-pulse">
                    LIVE
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Users className="w-3 h-3 text-slate-400" />
                  <span>Real Room • Safe Stream</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsMicOn(!isMicOn)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs text-white"
                title={isMicOn ? 'Mute' : 'Unmute'}
              >
                {isMicOn ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4 text-rose-400" />}
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs text-white"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Warning Banner */}
          {filterWarning && (
            <div className="relative z-20 bg-amber-500 text-slate-950 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-md">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{filterWarning}</span>
            </div>
          )}

          {/* Central Live Badge */}
          <div className="relative z-10 my-auto text-center space-y-2 pointer-events-none">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/15 text-xs font-bold text-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Topic: Global Capitals & Astronomy Quiz</span>
            </div>
          </div>

          {/* Flying Hearts */}
          {flyingHearts.map((h) => (
            <div
              key={h.id}
              style={{ left: `${h.left}%` }}
              className="absolute bottom-20 text-rose-500 animate-bounce text-xl pointer-events-none"
            >
              ❤️
            </div>
          ))}

          {/* Comments Stream Area or Friendly Empty State */}
          <div className="relative z-10 space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {comments.length === 0 ? (
              <div className="bg-black/35 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-center space-y-1">
                <p className="text-xs text-slate-200 font-bold">
                  {seniorMode ? 'لائیو روم میں ابھی کوئی تبصرہ نہیں ہے' : 'No comments in this stream yet'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {seniorMode
                    ? 'گفتگو شروع کرنے کے لیے دل ❤️ پر ٹیپ کریں یا پیغام بھیجیں!'
                    : 'Tap ❤️ or send an encouraging study message to cheer the room!'}
                </p>
              </div>
            ) : (
              comments.slice(-5).map((c) => (
                <div
                  key={c.id}
                  className={`text-xs p-2 rounded-xl backdrop-blur-md leading-relaxed flex items-center justify-between group ${
                    c.isGift
                      ? 'bg-gradient-to-r from-amber-500/30 to-orange-500/30 border border-amber-400/40 text-amber-200'
                      : 'bg-black/40 border border-white/10 text-white'
                  }`}
                >
                  <div>
                    <span className="font-extrabold text-amber-400 mr-1.5">{c.user}:</span>
                    <span>{c.text}</span>
                  </div>
                  {c.user !== 'You' && (
                    <button
                      onClick={() => handleReportComment(c)}
                      className="opacity-0 group-hover:opacity-100 text-[9px] text-rose-400 hover:text-rose-300 flex items-center gap-0.5 ml-1"
                    >
                      <Flag className="w-2.5 h-2.5" />
                      <span>{reportedId === c.id ? 'Reported' : 'Report'}</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Interaction Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 space-y-2">
          {/* Quick Gift Row */}
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 text-[11px] font-bold">
            <button
              onClick={() => handleSendGift('Rose', 20, '🌹')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center gap-1 border border-white/10 shrink-0"
            >
              <span>🌹</span>
              <span>Rose (20p)</span>
            </button>
            <button
              onClick={() => handleSendGift('Star', 50, '⭐')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center gap-1 border border-white/10 shrink-0"
            >
              <span>⭐</span>
              <span>Star (50p)</span>
            </button>
            <button
              onClick={() => handleSendGift('Crown', 100, '👑')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center gap-1 border border-white/10 shrink-0"
            >
              <span>👑</span>
              <span>Crown (100p)</span>
            </button>
          </div>

          {/* Comment input & Heart button */}
          <div className="flex items-center gap-2">
            <form onSubmit={handleSendComment} className="flex-1 flex items-center bg-slate-800 rounded-2xl px-3 py-1.5 border border-slate-700">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={seniorMode ? 'لائیو چیٹ میں لکھیں...' : 'Chat with learners...'}
                maxLength={140}
                className="w-full bg-transparent text-xs text-white placeholder-slate-400 outline-none"
              />
              <button type="submit" className="text-amber-400 hover:text-amber-300 ml-1">
                <Send className="w-4 h-4" />
              </button>
            </form>

            <button
              onClick={handleLike}
              className="w-10 h-10 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white flex items-center justify-center shadow-lg transition-transform relative"
              title="Like stream"
            >
              <Heart className="w-5 h-5 fill-current" />
              {likes > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-slate-950 text-[9px] font-black px-1.5 rounded-full shadow-xs">
                  {likes}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
