import React, { useState } from 'react';

export function extractYouTubeId(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  const match = trimmed.match(/(?:embed\/|v=|vi\/|youtu\.be\/|\/v\/|watch\?v=|[?&]v=)([a-zA-Z0-9_-]{11})/);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return '';
}

interface VideoThumbnailProps {
  videoUrl?: string;
  title: string;
  duration?: string;
  className?: string;
  showPlayIcon?: boolean;
}

export const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  videoUrl,
  title,
  duration,
  className = '',
  showPlayIcon = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const videoId = extractYouTubeId(videoUrl);
  const thumbnailUrl = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '';

  if (!thumbnailUrl || hasError) {
    // Plain colored card with video title written on it (never an emoji)
    return (
      <div
        className={`relative aspect-video w-full rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-700/80 p-2.5 flex flex-col justify-between overflow-hidden shadow-inner select-none ${className}`}
      >
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1 text-indigo-400">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Educational Video
          </span>
          {duration && (
            <span className="px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-slate-200 font-mono">
              {duration}
            </span>
          )}
        </div>
        <p className="font-extrabold text-xs text-white line-clamp-2 leading-snug drop-shadow-sm">
          {title}
        </p>
        <div className="text-[9px] text-slate-400 font-medium truncate">
          JoyEarn Learning Channel
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative aspect-video w-full rounded-xl bg-slate-900 overflow-hidden shadow-sm group select-none ${className}`}
    >
      <img
        src={thumbnailUrl}
        alt={title}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Loading Shimmer Placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-slate-800 animate-pulse flex items-center justify-center p-2 text-center">
          <span className="text-[10px] text-slate-400 font-medium line-clamp-2">{title}</span>
        </div>
      )}

      {/* Subtle Bottom Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />

      {/* Optional Play Icon Badge */}
      {showPlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-xs border border-white/40 flex items-center justify-center text-white text-xs shadow-lg group-hover:scale-110 transition-transform">
            ▶
          </div>
        </div>
      )}

      {/* Bottom Duration Badge */}
      {duration && (
        <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/80 backdrop-blur-xs rounded text-[9px] text-white font-mono font-bold">
          {duration}
        </span>
      )}
    </div>
  );
};
