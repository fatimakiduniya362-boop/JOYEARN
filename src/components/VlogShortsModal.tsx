import React, { useState } from 'react';
import {
  X,
  Upload,
  Play,
  Heart,
  MessageCircle,
  Share2,
  Music,
  Plus,
  Sparkles,
  CheckCircle2,
  Flag
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';
import { VideoThumbnail } from './VideoThumbnail';
import { submitContentReport } from '../services/firestoreService';

interface VlogShortsModalProps {
  isOpen: boolean;
  onClose: () => void;
  seniorMode?: boolean;
}

export const VlogShortsModal: React.FC<VlogShortsModalProps> = ({
  isOpen,
  onClose,
  seniorMode = false
}) => {
  const [activeTab, setActiveTab] = useState<'feed' | 'upload'>('feed');
  const [likes, setLikes] = useState<Record<string, number>>({
    vlog1: 0,
    vlog2: 0
  });
  const [isLiked, setIsLiked] = useState<Record<string, boolean>>({});
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Science');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [reportedIds, setReportedIds] = useState<Record<string, boolean>>({});
  const { light, success, warning } = useHaptics();

  if (!isOpen) return null;

  const handleReportVlog = async (id: string, title: string) => {
    warning();
    setReportedIds((prev) => ({ ...prev, [id]: true }));
    await submitContentReport('video', id, title, 'Vlog shorts safety report');
  };

  const toggleLike = (id: string) => {
    soundService.playClick();
    light();
    setIsLiked((prev) => {
      const next = !prev[id];
      setLikes((l) => ({ ...l, [id]: (l[id] || 0) + (next ? 1 : -1) }));
      return { ...prev, [id]: next };
    });
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) return;
    soundService.playFanfare();
    success();
    setUploadSuccess(true);
    setTimeout(() => {
      setUploadSuccess(false);
      setActiveTab('feed');
      setUploadTitle('');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md h-[90vh] bg-slate-900 text-white rounded-3xl overflow-hidden flex flex-col relative shadow-2xl border border-slate-800">
        {/* Header */}
        <div className="p-4 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎬</span>
            <span className="font-black text-sm text-white">
              {seniorMode ? 'تعلیمی وی لاگز اور مائیکرو ویڈیوز' : 'Educational Vlogs & Shorts'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(activeTab === 'feed' ? 'upload' : 'feed')}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{activeTab === 'feed' ? 'Upload' : 'Watch'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'feed' && (
            <div className="space-y-4">
              {/* Vlog Item 1 */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-3.5 space-y-3">
                <div className="relative rounded-xl overflow-hidden">
                  <VideoThumbnail
                    videoUrl="https://www.youtube-nocookie.com/embed/fJ9rUzIMcZQ"
                    title="Why Saturn Has Rings"
                    duration="1:00"
                    showPlayIcon
                  />
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs pointer-events-none">
                    <span className="font-extrabold text-amber-300 drop-shadow-md">Why Saturn Has Rings (60s)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-black">
                      🔭
                    </div>
                    <div>
                      <div className="text-xs font-black">CosmoScience Hub</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Music className="w-2.5 h-2.5" />
                        <span>Ambient Study Beats</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReportVlog('vlog1', 'Why Saturn Has Rings')}
                      className={`text-[11px] flex items-center gap-1 font-bold px-2 py-0.5 rounded-lg border transition-colors ${
                        reportedIds.vlog1
                          ? 'bg-rose-900/60 text-rose-300 border-rose-600'
                          : 'border-slate-700 text-slate-400 hover:text-rose-400'
                      }`}
                      title="Report video"
                    >
                      <Flag className="w-3 h-3" />
                      <span>{reportedIds.vlog1 ? 'Reported' : 'Report'}</span>
                    </button>
                    <button
                      onClick={() => toggleLike('vlog1')}
                      className={`flex items-center gap-1 text-xs font-bold ${
                        isLiked.vlog1 ? 'text-rose-500' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked.vlog1 ? 'fill-current' : ''}`} />
                      <span>{likes.vlog1}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Vlog Item 2 */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-3.5 space-y-3">
                <div className="relative rounded-xl overflow-hidden">
                  <VideoThumbnail
                    videoUrl="https://www.youtube-nocookie.com/embed/kJQP7kiw5Fk"
                    title="Mental Math Trick for 2-Digit Multiplication"
                    duration="0:45"
                    showPlayIcon
                  />
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs pointer-events-none">
                    <span className="font-extrabold text-amber-300 drop-shadow-md">Mental Math Trick for 2-Digit Multiplication</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-black">
                      📐
                    </div>
                    <div>
                      <div className="text-xs font-black">MathGenius PK</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Music className="w-2.5 h-2.5" />
                        <span>Lo-Fi Chill Focus</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReportVlog('vlog2', 'Mental Math Trick for 2-Digit Multiplication')}
                      className={`text-[11px] flex items-center gap-1 font-bold px-2 py-0.5 rounded-lg border transition-colors ${
                        reportedIds.vlog2
                          ? 'bg-rose-900/60 text-rose-300 border-rose-600'
                          : 'border-slate-700 text-slate-400 hover:text-rose-400'
                      }`}
                      title="Report video"
                    >
                      <Flag className="w-3 h-3" />
                      <span>{reportedIds.vlog2 ? 'Reported' : 'Report'}</span>
                    </button>
                    <button
                      onClick={() => toggleLike('vlog2')}
                      className={`flex items-center gap-1 text-xs font-bold ${
                        isLiked.vlog2 ? 'text-rose-500' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked.vlog2 ? 'fill-current' : ''}`} />
                      <span>{likes.vlog2}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center space-y-2 hover:border-rose-500 transition-colors">
                <Upload className="w-8 h-8 text-rose-500 mx-auto" />
                <div className="text-xs font-black text-white">Select Educational Video / Micro-Vlog</div>
                <div className="text-[10px] text-slate-400">MP4, MOV up to 60 seconds (Max 50MB)</div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Vlog Title / Topic</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g., Quick Mental Math or Science Fact"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="Science">Science & Nature</option>
                  <option value="Math">Math & Logic</option>
                  <option value="Geography">World Geography</option>
                  <option value="Urdu">Urdu Literature & Poetry</option>
                </select>
              </div>

              {uploadSuccess ? (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500 rounded-xl flex items-center justify-center gap-2 text-xs text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Vlog Uploaded Successfully! (+50 JoyPoints)</span>
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-md transition-colors"
                >
                  Publish Educational Vlog
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
