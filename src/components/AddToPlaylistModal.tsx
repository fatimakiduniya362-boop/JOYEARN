import React, { useState } from 'react';
import { ListPlus, Plus, Check, Trash2, FolderCheck, X, Sparkles } from 'lucide-react';
import { CustomPlaylist, VideoContent } from '../types';
import { playlistService } from '../services/playlistService';
import { soundService } from '../services/soundService';

interface AddToPlaylistModalProps {
  video: VideoContent;
  playlists: CustomPlaylist[];
  onPlaylistsChange: (updated: CustomPlaylist[]) => void;
  onClose: () => void;
}

const EMOJI_OPTIONS = ['⭐', '🔬', '🎨', '📖', '🌿', '💡', '🎵', '🧠', '🚀', '❤️'];

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  video,
  playlists,
  onPlaylistsChange,
  onClose,
}) => {
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('⭐');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  const handleToggle = (playlistId: string) => {
    soundService.playClick();
    const { updated, isAdded } = playlistService.toggleVideoInPlaylist(playlistId, video.id);
    onPlaylistsChange(updated);
    const target = updated.find((p) => p.id === playlistId);
    showToast(isAdded ? `Added to "${target?.name}"` : `Removed from "${target?.name}"`);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    soundService.playSuccess();
    const created = playlistService.createPlaylist(newPlaylistName.trim(), selectedEmoji, video.id);
    const updated = playlistService.getPlaylists();
    onPlaylistsChange(updated);
    setNewPlaylistName('');
    setIsCreatingNew(false);
    showToast(`Created & added to "${created.name}"!`);
  };

  const handleDeletePlaylist = (playlistId: string, name: string) => {
    soundService.playClick();
    const updated = playlistService.deletePlaylist(playlistId);
    onPlaylistsChange(updated);
    showToast(`Deleted "${name}"`);
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border-2 border-rose-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 to-pink-600 p-3.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <ListPlus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm">Save to Playlist</h3>
              <p className="text-[10px] text-rose-100 font-medium truncate max-w-[200px]">
                {video.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toast alert */}
        {toastMessage && (
          <div className="bg-emerald-500 text-white text-xs font-bold py-1.5 px-3 text-center animate-fadeIn">
            ✓ {toastMessage}
          </div>
        )}

        {/* Playlist Checklist */}
        <div className="p-3.5 space-y-2 max-h-[300px] overflow-y-auto">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
            Your Playlists ({playlists.length})
          </p>

          {playlists.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              No playlists found. Create your first list below!
            </div>
          ) : (
            playlists.map((playlist) => {
              const isInList = playlistService.isVideoInPlaylist(playlist, video.id);

              return (
                <div
                  key={playlist.id}
                  onClick={() => handleToggle(playlist.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer tap-bounce ${
                    isInList
                      ? 'bg-rose-50/80 border-rose-300 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg shrink-0">{playlist.emoji || '📁'}</span>
                    <div className="min-w-0">
                      <p className="font-extrabold text-xs text-slate-800 truncate">
                        {playlist.name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {playlist.videoIds.length} video{playlist.videoIds.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                        isInList
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'border-2 border-slate-300 bg-white'
                      }`}
                    >
                      {isInList && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    {/* Don't allow deleting defaults easily or show subtle trash */}
                    {!playlist.id.startsWith('pl_favorites') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePlaylist(playlist.id, playlist.name);
                        }}
                        className="p-1 text-slate-300 hover:text-rose-500 rounded-md transition-colors"
                        title="Delete playlist"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Create New Playlist Form / Button */}
        <div className="p-3 bg-slate-50 border-t border-slate-200">
          {!isCreatingNew ? (
            <button
              type="button"
              onClick={() => {
                soundService.playClick();
                setIsCreatingNew(true);
              }}
              className="w-full py-2 px-3 bg-white hover:bg-rose-50 border border-dashed border-rose-300 text-rose-600 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 tap-bounce shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Playlist</span>
            </button>
          ) : (
            <form onSubmit={handleCreate} className="space-y-2">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedEmoji(emoji)}
                    className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center shrink-0 transition-transform ${
                      selectedEmoji === emoji
                        ? 'bg-rose-100 ring-2 ring-rose-400 scale-110'
                        : 'bg-white hover:bg-slate-100'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="e.g. Science Lab, Urdu Rhymes..."
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  maxLength={30}
                  autoFocus
                  className="flex-1 px-2.5 py-1.5 text-xs bg-white rounded-xl border border-slate-300 focus:outline-none focus:border-rose-500 font-medium text-slate-800"
                />
                <button
                  type="submit"
                  disabled={!newPlaylistName.trim()}
                  className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-xl font-bold text-xs tap-bounce shrink-0"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-2 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full mt-2 py-1.5 text-center text-xs font-bold text-slate-600 hover:text-slate-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
