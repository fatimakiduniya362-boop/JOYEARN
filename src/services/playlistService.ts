import { CustomPlaylist } from '../types';

const PLAYLISTS_STORAGE_KEY = 'joyearn_custom_playlists';

export const DEFAULT_INITIAL_PLAYLISTS: CustomPlaylist[] = [
  {
    id: 'pl_favorites',
    name: 'Family Favorites',
    emoji: '⭐',
    description: 'Our top wholesome and favorite educational videos',
    videoIds: ['v1', 'v2', 'v3'],
    createdAt: 1700000000000,
  },
  {
    id: 'pl_science',
    name: 'Science & Discovery',
    emoji: '🔬',
    description: 'Fascinating space, nature, and biology explorations',
    videoIds: ['v3', 'v1', 'v7'],
    createdAt: 1700000001000,
  },
  {
    id: 'pl_creativity',
    name: 'Creative & Stories',
    emoji: '🎨',
    description: 'Hands-on origami, art skills, and moral stories',
    videoIds: ['v4', 'v5', 'v6'],
    createdAt: 1700000002000,
  },
];

export const playlistService = {
  getPlaylists(): CustomPlaylist[] {
    try {
      const stored = localStorage.getItem(PLAYLISTS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to default
    }
    return DEFAULT_INITIAL_PLAYLISTS;
  },

  savePlaylists(playlists: CustomPlaylist[]): void {
    try {
      localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists));
    } catch {
      // Ignore localStorage errors
    }
  },

  createPlaylist(name: string, emoji = '📁', initialVideoId?: string): CustomPlaylist {
    const trimmedName = name.trim() || 'My Playlist';
    const newPlaylist: CustomPlaylist = {
      id: `pl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedName,
      emoji: emoji || '📁',
      videoIds: initialVideoId ? [initialVideoId] : [],
      createdAt: Date.now(),
    };

    const current = this.getPlaylists();
    const updated = [newPlaylist, ...current];
    this.savePlaylists(updated);
    return newPlaylist;
  },

  deletePlaylist(playlistId: string): CustomPlaylist[] {
    const current = this.getPlaylists();
    const updated = current.filter((p) => p.id !== playlistId);
    this.savePlaylists(updated);
    return updated;
  },

  toggleVideoInPlaylist(playlistId: string, videoId: string): { updated: CustomPlaylist[]; isAdded: boolean } {
    const current = this.getPlaylists();
    let isAdded = false;

    const updated = current.map((p) => {
      if (p.id !== playlistId) return p;

      const exists = p.videoIds.includes(videoId);
      if (exists) {
        isAdded = false;
        return {
          ...p,
          videoIds: p.videoIds.filter((id) => id !== videoId),
        };
      } else {
        isAdded = true;
        return {
          ...p,
          videoIds: [...p.videoIds, videoId],
        };
      }
    });

    this.savePlaylists(updated);
    return { updated, isAdded };
  },

  isVideoInPlaylist(playlist: CustomPlaylist, videoId: string): boolean {
    return Boolean(playlist?.videoIds?.includes(videoId));
  },
};
