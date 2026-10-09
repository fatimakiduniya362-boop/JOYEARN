import React, { useState } from 'react';
import {
  ListMusic,
  Plus,
  Play,
  Trash2,
  Sparkles,
  Layers,
  ChevronRight
} from 'lucide-react';
import { CustomPlaylist, VideoContent } from '../types';
import { soundService } from '../services/soundService';

interface PlaylistBarProps {
  playlists: CustomPlaylist[];
  activePlaylistId: string | null; // null means 'All Videos'
  onSelectPlaylist: (playlistId: string | null) => void;
  onPlayAll: (videos: VideoContent[]) => void;
  onCreateNewPlaylist: (name: string, emoji?: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
  playlistVideos: VideoContent[];
}

export const PlaylistBar: React.FC<PlaylistBarProps> = ({
  playlists,
  activePlaylistId,
  onSelectPlaylist,
  onPlayAll,
  onCreateNewPlaylist,
  onDeletePlaylist,
  playlistVideos,
}) => {
  const [showCreateInline, setShowCreateInline] = useState(false);
  const [inlineName, setInlineName] = useState('');

  const activePlaylist = playlists.find((p) => p.id === activePlaylistId);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineName.trim()) return;
    soundService.playSuccess();
    onCreateNewPlaylist(inlineName.trim(), '📁');
    setInlineName('');
    setShowCreateInline(false);
  };

  const totalPoints = playlistVideos.reduce((sum, v) => sum + (v.points || 0), 0);

  return (
    <div className="bg-white border-b border-rose-100 shrink-0">
      {/* Scrollable Playlist Navigation Bar */}
      <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 text-[11px] font-black text-rose-500 uppercase tracking-wider shrink-0 pr-1">
          <ListMusic className="w-3.5 h-3.5" />
          <span>Lists:</span>
        </div>

        {/* 'All Videos' button */}
        <button
          type="button"
          onClick={() => {
            soundService.playClick();
            onSelectPlaylist(null);
          }}
          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 tap-bounce flex items-center gap-1 ${
            activePlaylistId === null
              ? 'bg-rose-500 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Layers className="w-3 h-3" />
          <span>All Videos</span>
        </button>

        {/* Each Playlist Chip */}
        {playlists.map((playlist) => {
          const isActive = activePlaylistId === playlist.id;

          return (
            <button
              key={playlist.id}
              type="button"
              onClick={() => {
                soundService.playClick();
                onSelectPlaylist(playlist.id);
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 tap-bounce flex items-center gap-1.5 ${
                isActive
                  ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-200'
                  : 'bg-rose-50/70 hover:bg-rose-100 text-rose-800 border border-rose-200/60'
              }`}
            >
              <span className="text-sm leading-none">{playlist.emoji || '📁'}</span>
              <span>{playlist.name}</span>
              <span
                className={`text-[10px] px-1 py-0.2 rounded-full font-extrabold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-rose-200/60 text-rose-700'
                }`}
              >
                {playlist.videoIds.length}
              </span>
            </button>
          );
        })}

        {/* Quick Add Playlist Button */}
        {!showCreateInline ? (
          <button
            type="button"
            onClick={() => {
              soundService.playClick();
              setShowCreateInline(true);
            }}
            className="px-2 py-1 rounded-xl text-xs font-bold bg-slate-50 hover:bg-rose-50 text-rose-600 border border-dashed border-rose-300 transition-all shrink-0 tap-bounce flex items-center gap-1"
            title="Create new playlist"
          >
            <Plus className="w-3 h-3" />
            <span>New List</span>
          </button>
        ) : (
          <form onSubmit={handleCreateSubmit} className="flex items-center gap-1 shrink-0">
            <input
              type="text"
              placeholder="List name..."
              value={inlineName}
              onChange={(e) => setInlineName(e.target.value)}
              autoFocus
              className="px-2 py-0.5 text-xs rounded-lg border border-rose-400 bg-white text-slate-800 w-24 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inlineName.trim()}
              className="px-2 py-0.5 bg-rose-500 text-white text-xs font-bold rounded-lg disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowCreateInline(false)}
              className="text-slate-400 hover:text-slate-600 text-xs px-1"
            >
              ✕
            </button>
          </form>
        )}
      </div>

      {/* Active Playlist Detail Card (When a playlist is selected) */}
      {activePlaylist && (
        <div className="px-3 py-2 bg-gradient-to-r from-rose-50 via-pink-50 to-purple-50 border-t border-rose-100 flex items-center justify-between text-xs animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl shrink-0">{activePlaylist.emoji || '📁'}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="font-extrabold text-slate-900 truncate">
                  {activePlaylist.name}
                </h4>
                <span className="bg-rose-200/70 text-rose-800 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {playlistVideos.length} Videos
                </span>
                {totalPoints > 0 && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.2 rounded-full hidden sm:inline">
                    +{totalPoints} Total JoyPoints
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 truncate">
                {activePlaylist.description || 'Custom curated list of wholesome family videos'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {playlistVideos.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  soundService.playClick();
                  onPlayAll(playlistVideos);
                }}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-[11px] tap-bounce flex items-center gap-1 shadow-xs"
                title="Play videos from this playlist"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Play All</span>
              </button>
            )}

            {!activePlaylist.id.startsWith('pl_favorites') && (
              <button
                type="button"
                onClick={() => {
                  soundService.playClick();
                  onDeletePlaylist(activePlaylist.id);
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-100/60 transition-colors"
                title="Delete this playlist"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
