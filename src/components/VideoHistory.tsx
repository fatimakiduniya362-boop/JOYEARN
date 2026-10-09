import React from 'react';
import { History, RotateCcw, Play, CheckCircle2, Trash2 } from 'lucide-react';
import { VideoContent } from '../types';
import { VideoThumbnail } from './VideoThumbnail';
import { soundService } from '../services/soundService';

export interface VideoHistoryProps {
  historyVideos: VideoContent[];
  currentVideoId?: string;
  onSelectVideo: (video: VideoContent) => void;
  seniorMode?: boolean;
  onClearHistory?: () => void;
}

export const VideoHistory: React.FC<VideoHistoryProps> = ({
  historyVideos,
  currentVideoId,
  onSelectVideo,
  seniorMode = false,
  onClearHistory,
}) => {
  if (!historyVideos || historyVideos.length === 0) {
    return (
      <section
        aria-label="Video History"
        className="bg-white rounded-2xl p-3 border border-rose-100 shadow-2xs"
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-slate-700">
            <History className="w-4 h-4 text-rose-500" />
            <h3 className="font-extrabold text-xs tracking-tight">
              Video History (Last 5)
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold">0 watched</span>
        </div>
        <p className="text-[11px] text-slate-500 italic">
          No recently watched videos yet. Watch any video to build your history and quickly re-watch your favorites!
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Video History"
      className="bg-gradient-to-br from-white via-rose-50/30 to-pink-50/40 rounded-2xl p-3 border border-rose-200/80 shadow-2xs space-y-2"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-xs">
            <History className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className={`font-black text-slate-900 ${seniorMode ? 'text-sm' : 'text-xs'}`}>
                Video History
              </h3>
              <span className="bg-rose-100 text-rose-700 font-black text-[10px] px-1.5 py-0.2 rounded-full">
                Last {historyVideos.length}/5
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">
              Quickly re-watch your favorite educational videos
            </p>
          </div>
        </div>

        {onClearHistory && historyVideos.length > 0 && (
          <button
            type="button"
            onClick={() => {
              soundService.playClick();
              onClearHistory();
            }}
            className="text-[10px] text-slate-400 hover:text-rose-600 flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded-md hover:bg-rose-50 transition-colors"
            title="Clear watch history"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Horizontal List of Last 5 Watched Videos */}
      <div className="flex gap-2.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar scroll-smooth">
        {historyVideos.map((video, index) => {
          const isCurrent = video.id === currentVideoId;

          return (
            <div
              key={`history-${video.id}-${index}`}
              onClick={() => {
                soundService.playClick();
                onSelectVideo(video);
              }}
              className={`shrink-0 w-36 sm:w-40 bg-white rounded-xl border transition-all cursor-pointer p-2 flex flex-col justify-between shadow-2xs group hover:shadow-xs tap-bounce ${
                isCurrent
                  ? 'border-rose-400 ring-2 ring-rose-200 bg-rose-50/60'
                  : 'border-slate-200 hover:border-rose-300'
              }`}
              title={`Re-watch: ${video.title}`}
            >
              {/* Thumbnail Container with Re-watch Overlay */}
              <div className="relative rounded-lg overflow-hidden aspect-video w-full bg-slate-900 shadow-2xs">
                <VideoThumbnail
                  videoUrl={video.videoUrl}
                  title={video.title}
                  duration={video.duration}
                  className="w-full h-full object-cover"
                />

                {/* Re-watch hover / badge overlay */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="bg-rose-600 text-white rounded-full p-1.5 shadow-md transform scale-90 group-hover:scale-100 transition-transform flex items-center gap-1 text-[10px] font-bold px-2">
                    <RotateCcw className="w-3 h-3" />
                    <span>Re-watch</span>
                  </span>
                </div>

                {isCurrent && (
                  <div className="absolute top-1 left-1 bg-rose-600/90 backdrop-blur-xs text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-md shadow-xs flex items-center gap-0.5">
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>Playing</span>
                  </div>
                )}
              </div>

              {/* Title & Category Info */}
              <div className="mt-1.5 space-y-1">
                <h4 className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-rose-600 transition-colors">
                  {video.title}
                </h4>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                  <span className="truncate max-w-[70px] bg-slate-100 text-slate-600 font-semibold px-1 py-0.2 rounded text-[9px]">
                    {video.category || 'General'}
                  </span>
                  <span className="text-rose-600 font-black">
                    +{video.points} Pts
                  </span>
                </div>

                {/* Re-watch Action Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    soundService.playClick();
                    onSelectVideo(video);
                  }}
                  className={`w-full mt-1 py-1 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                    isCurrent
                      ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-rose-500 hover:text-white'
                  }`}
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>{isCurrent ? 'Playing Now' : 'Re-watch'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
