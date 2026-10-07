// ============================================================================
// 🌟 MORE APPS AND OFFERS - EASY TO EDIT SPONSORED LINKS ARRAY
// ============================================================================
// You can freely add, update, or replace any of the promotional links below.

export interface PromotedAppOffer {
  id: string;
  title: string;
  urduTitle: string;
  description: string;
  urduDescription: string;
  badge: 'Sponsored';
  icon: string;
  gradient: string;
  url: string;
}

export const PROMOTED_APPS_AND_OFFERS: PromotedAppOffer[] = [
  {
    id: 'offer_math_quest',
    title: 'Math Quest & Puzzles',
    urduTitle: 'ریاضی کا دلچسپ سفر',
    description: 'Mental arithmetic puzzles and memory games for lifelong learners.',
    urduDescription: 'ذہنی ریاضی اور یادداشت کے دلچسپ کھیل۔',
    badge: 'Sponsored',
    icon: '🧮',
    gradient: 'from-blue-500 to-indigo-600',
    url: 'https://play.google.com/store/apps/details?id=com.joyearn.mathquest',
  },
  {
    id: 'offer_arabic_tutor',
    title: 'Quran & Arabic Reader',
    urduTitle: 'قرآن و عربی ریڈر',
    description: 'Learn Arabic alphabet pronunciation and daily Duas with clear audio.',
    urduDescription: 'عربی حروف تہجی اور روزمرہ کی دعائیں سیکھیں۔',
    badge: 'Sponsored',
    icon: '📖',
    gradient: 'from-emerald-500 to-teal-600',
    url: 'https://play.google.com/store/apps/details?id=com.joyearn.arabicreader',
  },
  {
    id: 'offer_nature_atlas',
    title: 'World Wildlife Explorer',
    urduTitle: 'عالمی جنگلی حیات اٹلس',
    description: 'Discover animal sounds, ocean creatures, and rainforest habitats.',
    urduDescription: 'جانوروں کی آوازیں اور جنگلی حیات کے حیرت انگیز حقائق۔',
    badge: 'Sponsored',
    icon: '🦁',
    gradient: 'from-amber-500 to-orange-600',
    url: 'https://play.google.com/store/apps/details?id=com.joyearn.wildlife',
  },
  {
    id: 'offer_brain_logic',
    title: 'Logic Maze Puzzles',
    urduTitle: 'ذہانت کی لاجک پہیلیاں',
    description: 'Daily brain teasers, crosswords, and spatial thinking challenges.',
    urduDescription: 'روزانہ کی ذہانت آزما پہیلیاں اور دماغی ورزش۔',
    badge: 'Sponsored',
    icon: '🧩',
    gradient: 'from-purple-500 to-pink-600',
    url: 'https://play.google.com/store/apps/details?id=com.joyearn.logicpuzzles',
  },
];
