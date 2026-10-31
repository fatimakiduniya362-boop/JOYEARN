// ============================================================================
// 🌟 MORE APPS AND OFFERS - SPONSORED LINKS
// ============================================================================
// Only real, active and approved sponsored partners are shown.
// Demo/fake entries have been completely cleared.

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

export const PROMOTED_APPS_AND_OFFERS: PromotedAppOffer[] = [];
