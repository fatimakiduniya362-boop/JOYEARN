/**
 * Fixed-Price Sponsor Packages in US Dollars
 * Clean, transparent pricing tiers for prospective app advertisers.
 */

export interface SponsorPackage {
  id: string;
  name: string;
  priceUsd: number;
  impressions: number;
  minDays: number;
  placements: string[];
  placementsText: string;
  description: string;
  badge?: string;
  priority?: 'normal' | 'top';
  hasHomeBanner?: boolean;
}

export const SPONSOR_AUDIENCE_TEXT = "Adults (18+), learning and family content";
export const SPONSOR_PAYMENT_TEXT = "Payment is made in advance directly to the owner. Placement and price are fixed as listed.";
export const SPONSOR_DISCLAIMER_TEXT = "Prices are in US dollars. Impressions are counted by the app and shown in your report. Clicks and results are not guaranteed.";

export const SPONSOR_PACKAGES: SponsorPackage[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceUsd: 5,
    impressions: 2000,
    minDays: 7,
    placements: ['Home'],
    placementsText: 'Home',
    description: 'Starter sponsored card positioned on the main Home feed.',
    badge: 'Starter',
  },
  {
    id: 'basic',
    name: 'Basic',
    priceUsd: 15,
    impressions: 8000,
    minDays: 14,
    placements: ['Home', 'Video list'],
    placementsText: 'Home and video list',
    description: 'Dual-placement card on the Home screen and the educational video list.',
    badge: 'Popular',
  },
  {
    id: 'standard',
    name: 'Standard',
    priceUsd: 40,
    impressions: 25000,
    minDays: 30,
    placements: ['Home', 'Video list', 'Between quiz questions'],
    placementsText: 'Home, video list and between quiz questions',
    description: 'Multi-touch visibility on Home, video list and between interactive quiz questions.',
    badge: 'Best Value',
  },
  {
    id: 'premium',
    name: 'Premium',
    priceUsd: 100,
    impressions: 80000,
    minDays: 30,
    placements: ['Home', 'Video list', 'Between quiz questions', 'All placements'],
    placementsText: 'All placements with top priority',
    description: 'Comprehensive high-frequency distribution across all app ad placements with top priority.',
    priority: 'top',
    badge: 'Priority',
  },
  {
    id: 'mega',
    name: 'Mega',
    priceUsd: 250,
    impressions: 250000,
    minDays: 60,
    placements: ['Home', 'Video list', 'Between quiz questions', 'Home announcement banner', 'All placements'],
    placementsText: 'All placements plus a Home announcement banner',
    description: 'Maximum exposure across all placements plus a featured Home announcement banner.',
    priority: 'top',
    hasHomeBanner: true,
    badge: 'Flagship',
  },
];

export function getSponsorPackageByName(name: string): SponsorPackage | undefined {
  if (!name) return undefined;
  return SPONSOR_PACKAGES.find(
    (p) => p.name.toLowerCase() === name.toLowerCase() || p.id.toLowerCase() === name.toLowerCase()
  );
}
