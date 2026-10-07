import React, { useState } from 'react';
import { WifiOff, Play, Trash2, HardDrive, Wifi, ShieldCheck, Zap } from 'lucide-react';
import { VideoContent } from '../types';
import { VideoThumbnail } from './VideoThumbnail';

interface OfflineModalProps {
  videos: VideoContent[];
  onToggleOffline: (videoId: string) => void;
  onClose: () => void;
  seniorMode: boolean;
}

export const OfflineModal: React.FC<OfflineModalProps> = ({
  videos,
  onToggleOffline,
  onClose,
  seniorMode,
}) => {
  const offlineVideos = videos.filter((v) => v.isOffline);
  const [wifiOnly, setWifiOnly] = useState(true);
  const [dataSaver, setDataSaver] = useState(true);
  const [playingVideo, setPlayingVideo] = useState<VideoContent | null>(null);

  // Approximate storage calculation
  const totalStorageMb = offlineVideos.length * 8.5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border-4 border-cyan-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl">
              📥
            </div>
            <div>
              <h2 className={`font-bold flex items-center gap-1.5 ${seniorMode ? 'text-2xl' : 'text-lg'}`}>
                Offline Video Vault
              </h2>
              <p className="text-xs text-cyan-100">Play anytime without internet or high mobile data costs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold"
          >
            ✕
          </button>
        </div>

        {/* Offline Badge & Storage */}
        <div className="bg-cyan-50 p-3.5 border-b border-cyan-100 space-y-2">
          <div className="flex items-center justify-between text-xs text-cyan-900 font-bold">
            <span className="flex items-center gap-1">
              <HardDrive className="w-4 h-4 text-cyan-700" /> Storage Used: ~{totalStorageMb.toFixed(1)} MB
            </span>
            <span className="text-gray-500 font-normal">Max Safe Cache: 500 MB</span>
          </div>
          {/* Progress Bar */}
          <div className="w-full h-2 bg-cyan-200/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-600 rounded-full"
              style={{ width: `${Math.min(100, (totalStorageMb / 500) * 100)}%` }}
            />
          </div>
        </div>

        {/* Low-End Android Data Savers */}
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex justify-between text-xs text-gray-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={wifiOnly}
              onChange={(e) => setWifiOnly(e.target.checked)}
              className="rounded text-cyan-600 focus:ring-cyan-500"
            />
            <span className="font-medium text-[11px]">Wi-Fi Only Downloads</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dataSaver}
              onChange={(e) => setDataSaver(e.target.checked)}
              className="rounded text-cyan-600 focus:ring-cyan-500"
            />
            <span className="font-medium text-[11px]">Low-Data Mode (360p)</span>
          </label>
        </div>

        {/* Playing Video Preview */}
        {playingVideo && (
          <div className="bg-slate-900 text-white p-4 flex flex-col items-center relative">
            <button
              onClick={() => setPlayingVideo(null)}
              className="absolute top-2 right-2 text-xs bg-white/20 px-2 py-0.5 rounded-full"
            >
              Close Player ✕
            </button>
            <div className="w-36 rounded-xl overflow-hidden shadow-md my-2">
              <VideoThumbnail videoUrl={playingVideo.videoUrl} title={playingVideo.title} />
            </div>
            <h4 className="font-bold text-xs text-center">{playingVideo.title}</h4>
            <div className="flex items-center gap-1.5 text-[11px] text-cyan-300 mt-1">
              <WifiOff className="w-3 h-3" /> Playing Offline from Local Device Storage
            </div>
          </div>
        )}

        {/* Video List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-gray-700">
            <span>Downloaded Videos ({offlineVideos.length})</span>
            <span className="text-emerald-700">Playable with No Internet</span>
          </div>

          {offlineVideos.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              No offline videos downloaded yet.
              <p className="mt-1 text-[11px] text-gray-500">
                Go to the Watch hub and tap the download icon on your favorite videos.
              </p>
            </div>
          ) : (
            offlineVideos.map((video) => (
              <div
                key={video.id}
                className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm flex items-center justify-between gap-3"
              >
                <div className="w-20 shrink-0 rounded-xl overflow-hidden shadow-xs">
                  <VideoThumbnail
                    videoUrl={video.videoUrl}
                    title={video.title}
                    duration={video.duration}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs text-gray-900 truncate">{video.title}</h4>
                  <p className="text-[10px] text-gray-500">
                    {video.fileSize} • {video.duration} • {video.category}
                  </p>
                  <span className="inline-block mt-1 text-[9px] bg-cyan-100 text-cyan-800 px-1.5 py-0.2 rounded font-medium">
                    Verified Safe Copy
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setPlayingVideo(video)}
                    className="p-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl tap-bounce"
                    title="Play Offline"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onToggleOffline(video.id)}
                    className="p-2 bg-gray-100 hover:bg-rose-100 text-gray-500 hover:text-rose-600 rounded-xl tap-bounce"
                    title="Delete Download"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Offline notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 space-y-1">
            <p className="font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" /> Fair Offline Play Policy
            </p>
            <p className="leading-relaxed">
              Downloaded videos are available anytime for family education. In full offline mode, online sponsored activities and ads are paused to prevent fraudulent point farming.
            </p>
          </div>
        </div>

        {/* Real Offline Video Playback Popup */}
        {playingVideo && (
          <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
            <div className="bg-slate-900 text-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border-2 border-cyan-400 space-y-3">
              <div className="p-3.5 bg-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-14 h-9 rounded-lg overflow-hidden shrink-0 shadow-xs">
                    <VideoThumbnail videoUrl={playingVideo.videoUrl} title={playingVideo.title} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs truncate">{playingVideo.title}</h4>
                    <p className="text-[10px] text-cyan-300">Offline Vault Playback • {playingVideo.duration}</p>
                  </div>
                </div>
                <button
                  onClick={() => setPlayingVideo(null)}
                  className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="px-3 pb-4 space-y-3">
                <div className="rounded-2xl overflow-hidden bg-black aspect-video relative">
                  <video
                    src={playingVideo.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="bg-slate-800/80 p-2.5 rounded-xl text-[11px] text-gray-300 space-y-1">
                  <p className="font-semibold text-white">Summary</p>
                  <p className="text-[10px] leading-relaxed text-gray-400">{playingVideo.summary}</p>
                </div>

                <button
                  onClick={() => setPlayingVideo(null)}
                  className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl text-xs tap-bounce"
                >
                  Close Player
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
