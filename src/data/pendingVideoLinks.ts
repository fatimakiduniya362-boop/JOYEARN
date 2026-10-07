/**
 * JoyEarn - Pending / Customizable Video Links Registry
 *
 * This file lists which video curriculum entries can be customized with your own
 * YouTube embed links (e.g., https://www.youtube-nocookie.com/embed/YOUR_VIDEO_ID).
 *
 * HOW IT WORKS:
 * 1. The app automatically checks every video in `src/data/videos.ts`.
 * 2. If an entry's URL contains 'PASTE_YOUR_CUSTOM_LINK_HERE' or is invalid, the app
 *    AUTOMATICALLY HIDES that entry so users never see broken players.
 * 3. Once you paste a valid embed URL into `src/data/videos.ts`, it immediately unlocks!
 */

export interface PendingVideoEntry {
  id: string;
  dayNumber: number;
  title: string;
  category: string;
  currentStatus: 'Ready for custom link' | 'Using curated educational embed';
  notes: string;
}

/**
 * Registry of entries where you can paste your custom YouTube link.
 * Search for the video ID or Day Number in `src/data/videos.ts` to update.
 */
export const ENTRIES_NEEDING_CUSTOM_LINKS: PendingVideoEntry[] = [
  {
    id: 'v_day_1',
    dayNumber: 1,
    title: 'Day 1: How To Start A Home Organic Garden',
    category: 'Nature',
    currentStatus: 'Using curated educational embed',
    notes: 'To replace with your custom garden video, edit videoUrl in src/data/videos.ts line ~33.'
  },
  {
    id: 'v_day_2',
    dayNumber: 2,
    title: 'Day 2: How Seeds Germinate and Grow',
    category: 'Nature',
    currentStatus: 'Using curated educational embed',
    notes: 'To replace with your custom seed germination video, edit videoUrl in src/data/videos.ts line ~48.'
  },
  {
    id: 'v_day_3',
    dayNumber: 3,
    title: 'Day 3: Photosynthesis Explained for Beginners',
    category: 'Nature',
    currentStatus: 'Using curated educational embed',
    notes: 'To replace with your custom photosynthesis video, edit videoUrl in src/data/videos.ts line ~63.'
  },
  {
    id: 'v_day_7',
    dayNumber: 7,
    title: 'Day 7: The Water Cycle & Rain Formation',
    category: 'Science',
    currentStatus: 'Using curated educational embed',
    notes: 'To replace with your custom science video, edit videoUrl in src/data/videos.ts.'
  },
  {
    id: 'v_day_14',
    dayNumber: 14,
    title: 'Day 14: How Solar Panels Turn Sunlight to Electricity',
    category: 'Energy',
    currentStatus: 'Using curated educational embed',
    notes: 'To replace with your custom clean energy video, edit videoUrl in src/data/videos.ts.'
  },
  {
    id: 'v_day_30',
    dayNumber: 30,
    title: 'Day 30: The Human Heart and Blood Circulation',
    category: 'Health',
    currentStatus: 'Using curated educational embed',
    notes: 'To replace with your custom health/anatomy video, edit videoUrl in src/data/videos.ts.'
  },
  {
    id: 'v_day_60',
    dayNumber: 60,
    title: 'Day 60: Deep Ocean Secrets & Marine Biology',
    category: 'Biology',
    currentStatus: 'Using curated educational embed',
    notes: 'To replace with your custom oceanography video, edit videoUrl in src/data/videos.ts.'
  },
  {
    id: 'v_day_90',
    dayNumber: 90,
    title: 'Day 90: How Telescopes Look Back in Time',
    category: 'Astronomy',
    currentStatus: 'Using curated educational embed',
    notes: 'To replace with your custom space video, edit videoUrl in src/data/videos.ts.'
  },
  {
    id: 'v_day_120',
    dayNumber: 120,
    title: 'Day 120: Microscopic World of Bacteria & Viruses',
    category: 'Microbiology',
    currentStatus: 'Using curated educational embed',
    notes: 'To replace with your custom microbiology video, edit videoUrl in src/data/videos.ts.'
  },
  {
    id: 'v_day_150',
    dayNumber: 150,
    title: 'Day 150: Climate Zones & World Ecosystems',
    category: 'Geography',
    currentStatus: 'Using curated educational embed',
    notes: 'To replace with your custom geography video, edit videoUrl in src/data/videos.ts.'
  },
  {
    id: 'v_day_190',
    dayNumber: 190,
    title: 'Day 190: 6-Month Grand Learning Journey Celebration',
    category: 'Milestone',
    currentStatus: 'Using curated educational embed',
    notes: 'To replace with your grand finale video message, edit videoUrl in src/data/videos.ts.'
  }
];

export default ENTRIES_NEEDING_CUSTOM_LINKS;
