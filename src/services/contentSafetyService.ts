/**
 * JoyEarn Content Safety & Family-Friendly Media Moderation Service
 * 
 * Enforces strict, zero-tolerance safety policies for family-friendly, educational,
 * and creative media. Prohibits any mature, violent, suggestive, hateful, commercial pop,
 * or unvetted content.
 */

import { VideoContent } from '../types';

// Whitelist of verified, human-moderated, family-safe educational channels & creators
export const TRUSTED_EDUCATIONAL_CREATORS = [
  'JoyEarn Creative Studio',
  'Art For Kids Hub',
  'National Geographic',
  'Science Sparks',
  'SSLFamilyDad',
  'Handmade Haven',
  'Eco Crafts Family',
  'Color Harmony Studio',
  'Doodle Master',
  'JR PAPER ART',
  'Paper Magic Studio',
  'Creative Paper World',
  'KidsTV123',
  'Science Academy',
  'Dogs Inc',
  'Fun Experiments Lab',
  'Mind Games Studio',
  'SciShow Kids',
  'Origami Plus',
] as const;

// Strict approved categories
export const APPROVED_CATEGORIES = [
  'Art and Craft',
  'DIY Projects',
  'Drawing and Painting',
  'Paper Crafts',
  'Science & Nature',
  'Educational Videos',
  'Creative Activities',
  'Nature',
  'Science',
  'Cooking',
  'Crafts',
  'Education',
] as const;

export type ApprovedCategory = (typeof APPROVED_CATEGORIES)[number];

// Known blocked / unvetted / meme / commercial pop music video IDs that MUST NEVER play
export const PROHIBITED_VIDEO_IDS = new Set([
  'dQw4w9WgXcQ', // Rick Astley
  '3JZ_D3ELwOQ', // Psy Gangnam Style
  'kJQP7kiw5Fk', // Despacito
  'fJ9rUzIMcZQ', // Queen Bohemian Rhapsody
  'L_LUpnjgPso',
  'JGwWNGJdvx8',
  '9bZkp7q19f0',
  'CevxZvSJLk8',
  'OPf0YbXqDm0',
]);

// Blocked keywords in title, description, or author
const BANNED_KEYWORDS = [
  'nude', 'naked', 'sex', 'sexy', 'bikini', 'erotic', 'porn', 'nsfw', 'adult',
  'kill', 'blood', 'murder', 'gore', 'weapon', 'gun', 'violent', 'fight', 'death', 'horror',
  'terror', 'hate', 'racist', 'gamble', 'casino', 'betting', 'prank', 'vape', 'tobacco',
  'alcohol', 'beer', 'drugs', 'curse', 'swear', 'fuck', 'shit', 'bitch', 'ass'
];

// Verified, Human-Reviewed Educational Media Catalogue
export const VERIFIED_SAFE_MEDIA_CATALOGUE: VideoContent[] = [
  // --- Art and Craft ---
  {
    id: 'safe_art_1',
    title: 'Easy Clay Modeling & Sculpting for Beginners',
    category: 'Art and Craft',
    duration: '3:45',
    points: 25,
    author: 'JoyEarn Creative Studio',
    thumbnail: 'https://i.ytimg.com/vi/3o_0mE7mI0E/hqdefault.jpg',
    isOffline: true,
    fileSize: '9.2 MB',
    summary: 'Learn basic clay modeling techniques to create charming miniature animal figures and desk decor.',
    videoUrl: 'https://www.youtube-nocookie.com/embed/3o_0mE7mI0E?rel=0',
    approved: true,
  },
  {
    id: 'safe_art_2',
    title: 'Handmade Pop-Up Greeting Cards & Gift Decor',
    category: 'Art and Craft',
    duration: '4:10',
    points: 30,
    author: 'Handmade Haven',
    thumbnail: 'https://i.ytimg.com/vi/7i7pL_1J4pY/hqdefault.jpg',
    isOffline: false,
    fileSize: '11.0 MB',
    summary: 'Step-by-step tutorial on making heartwarming pop-up flower cards using everyday supplies.',
    videoUrl: 'https://www.youtube-nocookie.com/embed/7i7pL_1J4pY?rel=0',
    approved: true,
  },
  {
    id: 'safe_art_3',
    title: 'Recycled Cardboard Jewelry & Stationery Box',
    category: 'Art and Craft',
    duration: '3:30',
    points: 25,
    author: 'Eco Crafts Family',
    thumbnail: 'https://i.ytimg.com/vi/T3QfX6gN0vY/hqdefault.jpg',
    isOffline: false,
    fileSize: '8.8 MB',
    summary: 'Turn spare delivery cartons into organized decorative organizers with vibrant scrap fabric.',
    videoUrl: 'https://www.youtube-nocookie.com/embed/T3QfX6gN0vY?rel=0',
    approved: true,
  },

  // --- DIY Projects ---
  {
    id: 'safe_diy_1',
    title: 'Beginner Home Herb Gardening & Planter DIY',
    category: 'DIY Projects',
    duration: '3:15',
    points: 25,
    author: 'SSLFamilyDad',
    thumbnail: 'https://i.ytimg.com/vi/B0DrWAUsNSc/hqdefault.jpg',
    isOffline: true,
    fileSize: '8.4 MB',
    summary: 'Complete beginner guide to creating self-watering kitchen planters and growing fresh herbs indoors.',
    videoUrl: 'https://www.youtube-nocookie.com/embed/B0DrWAUsNSc?rel=0',
    approved: true,
  },
  {
    id: 'safe_diy_2',
    title: 'DIY Solar Oven Science Project for Family Fun',
    category: 'DIY Projects',
    duration: '4:20',
    points: 30,
    author: 'Science Sparks',
    thumbnail: 'https://i.ytimg.com/vi/6v2L2UGZJAM/hqdefault.jpg',
    isOffline: false,
    fileSize: '12.4 MB',
    summary: 'Build a working solar thermal cooker with foil, cardboard, and sunlight to melt marshmallows.',
    videoUrl: 'https://www.youtube-nocookie.com/embed/6v2L2UGZJAM?rel=0',
    approved: true,
  },
  {
    id: 'safe_diy_3',
    title: 'Simple Water Filtration Experiment at Home',
    category: 'DIY Projects',
    duration: '3:50',
    points: 25,
    author: 'Eco Crafts Family',
    thumbnail: 'https://i.ytimg.com/vi/R8z8bU6tMlg/hqdefault.jpg',
    isOffline: false,
    fileSize: '9.6 MB',
    summary: 'Demonstrate natural layers of sand, gravel, and charcoal for educational clean water filtering.',
    videoUrl: 'https://www.youtube-nocookie.com/embed/R8z8bU6tMlg?rel=0',
    approved: true,
  },

  // --- Drawing and Painting ---
  {
    id: 'safe_drawing_1',
    title: 'Easy Step-by-Step Drawing: Cute Animals & Nature',
    category: 'Drawing and Painting',
    duration: '4:15',
    points: 25,
    author: 'Art For Kids Hub',
    thumbnail: 'https://i.ytimg.com/vi/rW2FaX6p_v8/hqdefault.jpg',
    isOffline: true,
    fileSize: '10.5 MB',
    summary: 'Friendly guided sketching tutorial teaching simple geometric shapes into adorable animals.',
    videoUrl: 'https://www.youtube-nocookie.com/embed/rW2FaX6p_v8?rel=0',
    approved: true,
  },
  {
    id: 'safe_drawing_2',
    title: 'Watercolor Basics: Sunset Sky & Silhouette Trees',
    category: 'Drawing and Painting',
    duration: '4:40',
    points: 30,
    author: 'Color Harmony Studio',
    thumbnail: 'https://i.ytimg.com/vi/7Mv_2Ew2M0M/hqdefault.jpg',
    isOffline: false,
    fileSize: '13.1 MB',
    summary: 'Master wet-on-wet watercolor blending to capture vibrant evening skies and deep silhouettes.',
    videoUrl: 'https://www.youtube-nocookie.com/embed/7Mv_2Ew2M0M?rel=0',
    approved: true,
  },
  {
    id: 'safe_drawing_3',
    title: 'Doodling Secrets: Patterns, Letters & Cartooning',
    category: 'Drawing and Painting',
    duration: '3:20',
    points: 20,
    author: 'Doodle Master',
    thumbnail: 'https://i.ytimg.com/vi/5Gj_dE2_aM0/hqdefault.jpg',
    isOffline: false,
    fileSize: '8.2 MB',
    summary: 'Creative mindfulness doodling techniques that enhance focus, handwriting, and imagination.',
    videoUrl: 'https://www.youtube-nocookie.com/embed/5Gj_dE2_aM0?rel=0',
    approved: true,
  },

  // --- Paper Crafts ---
  {
    id: 'safe_paper_1',
    title: '3D Cube Stacking Origami Craft & Geometric Art',
    category: 'Paper Crafts',
    duration: '3:10',
    points: 30,
    author: 'JR PAPER ART',
    thumbnail: 'https://i.ytimg.com/vi/cScuMgYHKeM/hqdefault.jpg',
    isOffline: true,
    fileSize: '11.5 MB',
    summary: 'Fun weekend crafting activity using safe, colorful scrap paper for 3D geometric structures.',
    videoUrl: 'https://www.youtube-nocookie.com/embed/cScuMgYHKeM?rel=0',
    approved: true,
  },
  {
    id: 'safe_paper_2',
    title: 'Traditional Origami Jumping Frog Tutorial',
    category: 'Paper Crafts',
    duration: '2:50',
    points: 20,
    author: 'Paper Magic Studio',
    thumbnail: 'https://i.ytimg.com/vi/W1x02FwJkF8/hqdefault.jpg',
    isOffline: true,
    fileSize: '7.1 MB',
    summary: 'Fold an authentic jumping origami frog in under 3 minutes with standard square origami paper.',
    videoUrl: 'https://www.youtube-nocookie.com/embed/W1x02FwJkF8?rel=0',
    approved: true,
  },
  {
    id: 'safe_paper_3',
    title: 'Beautiful Paper Flower Bouquet for Celebrations',
    category: 'Paper Crafts',
    duration: '4:05',
    points: 30,
    author: 'Creative Paper World',
    thumbnail: 'https://i.ytimg.com/vi/p1w_Zk3F8m4/hqdefault.jpg',
    isOffline: false,
    fileSize: '10.8 MB',
    summary: 'Create everlasting paper roses and daisies with simple accordion folds and paper stems.',
    videoUrl: 'https://www.youtube-nocookie.com/embed/p1w_Zk3F8m4?rel=0',
    approved: true,
  },

  // --- Educational Videos ---
  {
    id: 'safe_edu_1',
    title: 'Solar System 101: Planetary Science & Space Exploration',
    category: 'Educational Videos',
    duration: '3:00',
    points: 25,
    author: 'National Geographic',
    thumbnail: 'https://i.ytimg.com/vi/libKVRa01L8/hqdefault.jpg',
    isOffline: true,
    fileSize: '7.8 MB',
    summary: 'Fascinating introduction to our solar system, inner rocky planets, and giant gas worlds.',
    videoUrl: 'https://www.youtube-nocookie.com/embed/libKVRa01L8?rel=0',
    approved: true,
  },
  {
    id: 'safe_edu_2',
    title: 'Rainforests 101: Earth Ecosystems & Amazing Wildlife',
    category: 'Educational Videos',
    duration: '3:40',
    points: 25,
    author: 'National Geographic',
    thumbnail: 'https://i.ytimg.com/vi/3vijLre760w/hqdefault.jpg',
    isOffline: true,
    fileSize: '9.1 MB',
    summary: 'Breathtaking wildlife documentary on lush rainforest biodiversity, plants, and animals.',
    videoUrl: 'https://www.youtube-nocookie.com/embed/3vijLre760w?rel=0',
    approved: true,
  },
  {
    id: 'safe_edu_3',
    title: 'English Alphabet Phonics & Vocabulary for Young Learners',
    category: 'Educational Videos',
    duration: '1:45',
    points: 20,
    author: 'KidsTV123',
    thumbnail: 'https://i.ytimg.com/vi/BELlZKpi1Zs/hqdefault.jpg',
    isOffline: true,
    fileSize: '6.2 MB',
    summary: 'Fun musical rhymes teaching alphabet phonics and vocabulary with cheerful animations.',
    videoUrl: 'https://www.youtube-nocookie.com/embed/BELlZKpi1Zs?rel=0',
    approved: true,
  },
  {
    id: 'safe_edu_4',
    title: 'How The Human Body Works: The Heart & Circulatory System',
    category: 'Educational Videos',
    duration: '4:15',
    points: 30,
    author: 'Science Academy',
    thumbnail: 'https://i.ytimg.com/vi/ZzO_7M9U0jU/hqdefault.jpg',
    isOffline: false,
    fileSize: '12.0 MB',
    summary: 'Animated exploration of blood circulation, oxygen transport, and heart health.',
    videoUrl: 'https://www.youtube-nocookie.com/embed/ZzO_7M9U0jU?rel=0',
    approved: true,
  },

  // --- Creative Activities ---
  {
    id: 'safe_creative_1',
    title: 'Pip | Heartfelt Animated Family Moral Story',
    category: 'Creative Activities',
    duration: '4:05',
    points: 30,
    author: 'Dogs Inc',
    thumbnail: 'https://i.ytimg.com/vi/07d2dXHYb94/hqdefault.jpg',
    isOffline: true,
    fileSize: '10.2 MB',
    summary: 'Award-winning heartfelt animated tale of perseverance, kindness, and helping others.',
    videoUrl: 'https://www.youtube-nocookie.com/embed/07d2dXHYb94?rel=0',
    approved: true,
  },
  {
    id: 'safe_creative_2',
    title: 'Kitchen Science: Rainbow Milk & Surface Tension',
    category: 'Creative Activities',
    duration: '3:15',
    points: 25,
    author: 'Fun Experiments Lab',
    thumbnail: 'https://i.ytimg.com/vi/k8nLg7fN5lY/hqdefault.jpg',
    isOffline: false,
    fileSize: '8.9 MB',
    summary: 'Fascinating food coloring and dish soap reaction demonstrating molecular surface tension.',
    videoUrl: 'https://www.youtube-nocookie.com/embed/k8nLg7fN5lY?rel=0',
    approved: true,
  },
  {
    id: 'safe_creative_3',
    title: 'Fun Brain Teasers & Optical Illusion Riddles',
    category: 'Creative Activities',
    duration: '3:50',
    points: 25,
    author: 'Mind Games Studio',
    thumbnail: 'https://i.ytimg.com/vi/q2qJ8e0K3xM/hqdefault.jpg',
    isOffline: false,
    fileSize: '9.8 MB',
    summary: 'Sharpen cognitive reflexes with visual paradoxes, hidden object riddles, and logic puzzles.',
    videoUrl: 'https://www.youtube-nocookie.com/embed/q2qJ8e0K3xM?rel=0',
    approved: true,
  },
];

// Helper to extract YouTube ID
export function extractYouTubeId(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  const match = trimmed.match(/(?:embed\/|v=|vi\/|youtu\.be\/|\/v\/|watch\?v=|[?&]v=)([a-zA-Z0-9_-]{11})/);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return '';
}

/**
 * Checks quarantined (user-reported) videos
 */
export function getQuarantinedVideoIds(): Set<string> {
  try {
    const raw = localStorage.getItem('joyearn_quarantined_video_ids');
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return new Set(list);
    }
  } catch {}
  return new Set();
}

/**
 * Quarantines a video ID so it never appears again for this user
 */
export function quarantineVideo(videoId: string) {
  try {
    const set = getQuarantinedVideoIds();
    set.add(videoId);
    localStorage.setItem('joyearn_quarantined_video_ids', JSON.stringify(Array.from(set)));
  } catch {}
}

/**
 * Validates a video against strict safety requirements.
 * Returns true ONLY if the video is strictly verified and family-safe.
 */
export function isMediaContentSafe(video: VideoContent): boolean {
  if (!video) return false;

  // 1. Check approval flag
  if (video.approved !== true) return false;

  // 2. Check quarantine
  const quarantined = getQuarantinedVideoIds();
  if (quarantined.has(video.id)) return false;

  // 3. Check for valid video source: direct media stream or valid YouTube ID
  const directMedia =
    Boolean(video.mediaUrl && (video.mediaUrl.startsWith('https://') || video.mediaUrl.startsWith('http://'))) ||
    Boolean(video.videoUrl && (video.videoUrl.endsWith('.webm') || video.videoUrl.endsWith('.mp4') || video.videoUrl.endsWith('.ogv')));
  const youtubeId = extractYouTubeId(video.videoUrl);

  if (!directMedia && !youtubeId) return false;

  // 4. Blocklist check (prohibit blocked music or inappropriate videos)
  if (youtubeId && PROHIBITED_VIDEO_IDS.has(youtubeId)) return false;

  // 5. Category check: must belong to approved creative or educational categories
  const cat = (video.category || '').toLowerCase();
  const isApprovedCat = APPROVED_CATEGORIES.some(
    (c) => c.toLowerCase() === cat || cat.includes(c.toLowerCase())
  );
  if (!isApprovedCat) return false;

  // 6. Text content moderation check (Title & Summary)
  const fullText = `${video.title} ${video.summary || ''} ${video.author || ''}`.toLowerCase();
  for (const word of BANNED_KEYWORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(fullText)) {
      return false;
    }
  }

  // 7. URL integrity check: must have either valid HTTP(S) stream or valid embed URL
  const urlToCheck = video.mediaUrl || video.videoUrl || '';
  if (!urlToCheck.startsWith('https://') && !urlToCheck.startsWith('http://')) {
    return false;
  }

  return true;
}

/**
 * Filters any list of videos, returning only strictly verified safe items.
 * If input is empty or invalid, returns the official verified safe catalogue.
 */
export function filterApprovedMedia(videos?: VideoContent[]): VideoContent[] {
  if (!videos || videos.length === 0) {
    return VERIFIED_SAFE_MEDIA_CATALOGUE;
  }

  const safeItems = videos.filter((v) => isMediaContentSafe(v));

  // If filtered list is empty, default safely to the verified catalogue
  if (safeItems.length === 0) {
    return VERIFIED_SAFE_MEDIA_CATALOGUE;
  }

  return safeItems;
}
