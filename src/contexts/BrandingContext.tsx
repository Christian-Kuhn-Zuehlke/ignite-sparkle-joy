import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

// MS Direct default colors (fallback)
const MS_DIRECT_PRIMARY = '#1e3a5f';
const MS_DIRECT_ACCENT = '#2f9e8f';

// Company brand data from database
export interface CompanyBrandData {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  brand_keywords: string[] | null;
  primary_color: string | null;
  accent_color: string | null;
  logo_url: string | null;
  tagline: string | null;
}

// Processed brand configuration
export interface CompanyBrand {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  keywords: string[];
  primaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  iconTheme: IconTheme;
  gradient: string;
  // Computed HSL values for backwards compatibility
  primaryHue: number;
  primarySaturation: number;
  primaryLightness: number;
  accentHue: number;
  accentSaturation: number;
  accentLightness: number;
  // Display values
  logoText: string;
  tagline: string;
}

// Icon themes based on industry/keywords
export type IconTheme = 'default' | 'golf' | 'fashion' | 'jewelry' | 'outdoor' | 'tech' | 'aviation' | 'kids';

// Keyword to icon theme mapping
const keywordToTheme: Record<string, IconTheme> = {
  // Golf
  'golf': 'golf',
  'golfball': 'golf',
  'putting': 'golf',
  'driving range': 'golf',
  'fairway': 'golf',
  'green': 'golf',
  
  // Jewelry / Schmuck
  'jewelry': 'jewelry',
  'jewellery': 'jewelry',
  'schmuck': 'jewelry',
  'diamond': 'jewelry',
  'diamant': 'jewelry',
  'ring': 'jewelry',
  'ringe': 'jewelry',
  'earring': 'jewelry',
  'ohrringe': 'jewelry',
  'necklace': 'jewelry',
  'kette': 'jewelry',
  'gold': 'jewelry',
  'silber': 'jewelry',
  'silver': 'jewelry',
  
  // Fashion
  'fashion': 'fashion',
  'mode': 'fashion',
  'kleidung': 'fashion',
  'kleider': 'fashion',
  'clothing': 'fashion',
  'textile': 'fashion',
  'apparel': 'fashion',
  'pullover': 'fashion',
  'cashmere': 'fashion',
  'kaschmir': 'fashion',
  'tshirt': 'fashion',
  'sweater': 'fashion',
  
  // Outdoor
  'outdoor': 'outdoor',
  'hiking': 'outdoor',
  'wandern': 'outdoor',
  'camping': 'outdoor',
  'nature': 'outdoor',
  'berg': 'outdoor',
  'mountain': 'outdoor',
  'trekking': 'outdoor',
  
  // Tech
  'tech': 'tech',
  'technology': 'tech',
  'software': 'tech',
  'digital': 'tech',
  'it': 'tech',
  'computer': 'tech',
  'electronics': 'tech',
  
  // Aviation
  'aviation': 'aviation',
  'flug': 'aviation',
  'flight': 'aviation',
  'aerospace': 'aviation',
  'airline': 'aviation',
  
  // Kids
  'kids': 'kids',
  'kinder': 'kids',
  'children': 'kids',
  'spielzeug': 'kids',
  'toys': 'kids',
  'baby': 'kids',
  'young': 'kids',
};

// Industry to theme mapping
const industryToTheme: Record<string, IconTheme> = {
  'sport & freizeit': 'outdoor',
  'sport': 'golf', // Default sport to golf, but keywords can override
  'golf': 'golf',
  'fashion': 'fashion',
  'mode': 'fashion',
  'kleider': 'fashion',
  'kleidung': 'fashion',
  'schmuck': 'jewelry',
  'jewelry': 'jewelry',
  'jewellery': 'jewelry',
  'technologie': 'tech',
  'technology': 'tech',
  'aviation': 'aviation',
  'luftfahrt': 'aviation',
  'kinder': 'kids',
  'kinderbekleidung': 'kids',
  'kinderkleider': 'kids',
  'outdoor': 'outdoor',
};

// CURATED INDUSTRY PALETTES - Professionally designed, always readable
// Each palette has: sidebar (dark), accent (vibrant), and foreground colors
interface IndustryPalette {
  sidebar: { h: number; s: number; l: number }; // Dark background for sidebar
  accent: { h: number; s: number; l: number };  // Vibrant accent for buttons/highlights
  sidebarHover: { h: number; s: number; l: number }; // Hover state
}

const CURATED_PALETTES: Record<IconTheme, IndustryPalette> = {
  // Default - Professional Navy/Teal (MS Direct style)
  default: {
    sidebar: { h: 220, s: 60, l: 20 },
    accent: { h: 175, s: 60, l: 40 },
    sidebarHover: { h: 220, s: 50, l: 28 },
  },
  // Golf - Deep Forest Green
  golf: {
    sidebar: { h: 150, s: 45, l: 18 },
    accent: { h: 140, s: 55, l: 45 },
    sidebarHover: { h: 150, s: 40, l: 25 },
  },
  // Fashion - Elegant Charcoal
  fashion: {
    sidebar: { h: 0, s: 0, l: 15 },
    accent: { h: 340, s: 65, l: 55 },
    sidebarHover: { h: 0, s: 0, l: 22 },
  },
  // Jewelry - Rich Burgundy
  jewelry: {
    sidebar: { h: 340, s: 40, l: 18 },
    accent: { h: 45, s: 70, l: 50 },
    sidebarHover: { h: 340, s: 35, l: 25 },
  },
  // Outdoor - Earth Brown/Green
  outdoor: {
    sidebar: { h: 30, s: 35, l: 18 },
    accent: { h: 85, s: 50, l: 45 },
    sidebarHover: { h: 30, s: 30, l: 25 },
  },
  // Tech - Modern Dark Blue
  tech: {
    sidebar: { h: 230, s: 50, l: 15 },
    accent: { h: 200, s: 90, l: 50 },
    sidebarHover: { h: 230, s: 45, l: 22 },
  },
  // Aviation - Steel Blue
  aviation: {
    sidebar: { h: 210, s: 35, l: 20 },
    accent: { h: 35, s: 85, l: 50 },
    sidebarHover: { h: 210, s: 30, l: 27 },
  },
  // Kids - Playful Navy
  kids: {
    sidebar: { h: 250, s: 45, l: 22 },
    accent: { h: 45, s: 90, l: 55 },
    sidebarHover: { h: 250, s: 40, l: 30 },
  },
};

// Helper to convert hex to HSL
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Check if a color is safe for white text overlay (dark enough)
function isColorSafeForWhiteText(color: { h: number; s: number; l: number }): boolean {
  return color.l <= 45 && color.s >= 15;
}

// Check if a color is too light (would need dark text, not suitable for sidebar)
function isColorTooLight(color: { h: number; s: number; l: number }): boolean {
  return color.l > 60;
}

// Check if a color can be used as a vibrant accent (exported for potential use)
export function isColorVibrantEnough(color: { h: number; s: number; l: number }): boolean {
  return color.s >= 40 && color.l >= 30 && color.l <= 60;
}

// Determine icon theme from keywords and industry (exported for use in other components)
export function getIconTheme(keywords: string[], industry: string | null): IconTheme {
  // First check keywords
  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    if (keywordToTheme[lowerKeyword]) {
      return keywordToTheme[lowerKeyword];
    }
  }
  
  // Then check industry
  if (industry) {
    const lowerIndustry = industry.toLowerCase();
    if (industryToTheme[lowerIndustry]) {
      return industryToTheme[lowerIndustry];
    }
  }
  
  return 'default';
}

// Extended icon theme type with more industries
export type ExtendedIconTheme = IconTheme | 'luxury' | 'cashmere' | 'sports' | 'beauty' | 'food' | 'home' | 'pet' | 'wellness' | 'automotive';

// Creative tagline pools per theme - designed for WOW effect!
const CREATIVE_TAGLINES: Record<string, string[]> = {
  // Default / General Fulfillment
  'default': [
    'Fulfillment Excellence - Every Day',
    'Your Success, Delivered',
    'Where Precision Meets Passion',
    'Beyond Logistics - We Deliver Dreams',
    'Seamless. Swift. Sensational.',
    'The Art of Perfect Delivery',
    'Excellence is Our Standard',
    'Your Vision, Our Mission',
  ],
  
  // Golf - Premium & Precision
  'golf': [
    'Your Perfect Swing Partner',
    'From Tee to Doorstep - Flawlessly',
    'Where Every Shot Counts',
    'Precision Delivery for Precision Players',
    'Driving Excellence to Your Door',
    'The Fairway to Your Customers',
    'Game-Changing Fulfillment',
    'Par Excellence in Every Delivery',
    'Your Ace in Logistics',
    'Championship-Level Service',
  ],
  
  // Fashion & Mode - Style & Elegance
  'fashion': [
    'Style Arrives in Perfect Form',
    'Where Fashion Meets Flawless Delivery',
    'Runway-Ready Logistics',
    'Elegance in Every Package',
    'Your Style, Perfectly Delivered',
    'The Couture of Fulfillment',
    'Fashion Forward, Always On Time',
    'Dressed for Success - Every Delivery',
    'Chic. Swift. Impeccable.',
    'Where Trends Meet Timely Delivery',
  ],
  
  // Cashmere & Luxury Textiles - Soft & Premium
  'cashmere': [
    'Softness, Delivered with Care',
    'Luxury Wrapped in Excellence',
    'The Gentle Touch of Perfect Logistics',
    'Premium Fibers, Premium Service',
    'Where Quality Meets Quiet Excellence',
    'Crafted Care for Crafted Goods',
    'Elegance in Every Thread, Every Delivery',
    'The Whisper of Luxury Logistics',
    'Handled with the Care It Deserves',
    'Timeless Quality, Timeless Service',
  ],
  
  // Luxury & High-End
  'luxury': [
    'Where Luxury Meets Logistics',
    'Excellence Without Compromise',
    'The White-Glove Standard',
    'Curated Care for Curated Goods',
    'Prestige in Every Package',
    'The Art of Luxury Fulfillment',
    'Beyond Expectations, Always',
    'Refined Service for Refined Brands',
    'Where Every Detail Matters',
    'The Pinnacle of Precision',
  ],
  
  // Jewelry & Precious Items
  'jewelry': [
    'Precious Cargo, Priceless Service',
    'Every Gem Deserves This Journey',
    'Brilliance in Every Delivery',
    'The Sparkle of Perfect Logistics',
    'Where Every Piece Shines',
    'Treasured Items, Treasured Service',
    'Diamond-Standard Fulfillment',
    'Crafted Delivery for Crafted Beauty',
    'The Jewel of Logistics',
    'Radiant Service, Every Time',
  ],
  
  // Outdoor & Adventure
  'outdoor': [
    'Adventure Starts at Your Doorstep',
    'Peak Performance in Delivery',
    'Where the Wild Meets the Reliable',
    'Trailblazing Logistics',
    'Ready for Any Terrain',
    'Summit-Level Service',
    'Nature-Inspired Excellence',
    'Your Gateway to Adventure',
    'Explore More, Worry Less',
    'The Spirit of the Outdoors, Delivered',
  ],
  
  // Tech & Digital
  'tech': [
    'Innovation, Delivered Fast',
    'Smart Solutions for Smart Products',
    'The Future of Fulfillment',
    'Digital Precision, Physical Excellence',
    'Where Tech Meets Logistics',
    'Powering Your Digital Success',
    'Next-Gen Delivery for Next-Gen Products',
    'Connecting Innovation to Customers',
    'The Algorithm of Perfect Delivery',
    'Tech-Driven, Customer-Focused',
  ],
  
  // Aviation & Aerospace
  'aviation': [
    'Sky-High Standards, Ground-Level Care',
    'Precision That Takes Flight',
    'Aerospace-Grade Excellence',
    'Where Quality Soars',
    'Cleared for Exceptional Delivery',
    'First-Class Logistics',
    'The Altitude of Excellence',
    'Flying High on Service',
    'Mission-Critical Fulfillment',
    'Above and Beyond, Every Time',
  ],
  
  // Kids & Children
  'kids': [
    'Joy Delivered Daily',
    'Where Smiles Are Wrapped with Care',
    'Making Little Ones Smile, Big Time',
    'The Magic of Happy Deliveries',
    'For Little Adventurers Everywhere',
    'Dreams Delivered, Smiles Guaranteed',
    'The Fun Starts at the Doorstep',
    'Kid-Approved, Parent-Trusted',
    'Spreading Joy, One Package at a Time',
    'Where Every Unboxing is an Adventure',
  ],
  
  // Sports & Athletics
  'sports': [
    'Champions Choose Us',
    'Peak Performance Logistics',
    'Game On - Delivered',
    'Where Athletes Trust',
    'Victory Starts with Delivery',
    'Training Partners in Logistics',
    'The Winning Edge',
    'From Field to Front Door',
    'Athletic Excellence, Delivered',
    'Your MVP in Fulfillment',
  ],
  
  // Beauty & Cosmetics
  'beauty': [
    'Beauty Delivered Beautifully',
    'The Glow of Perfect Service',
    'Where Beauty Meets Precision',
    'Radiance in Every Package',
    'Self-Care, Delivered with Care',
    'The Art of Beautiful Logistics',
    'Flawless Delivery for Flawless Products',
    'Beauty Unboxed, Perfectly',
    'Glowing Reviews, Glowing Service',
    'Your Beauty Routine, On Time',
  ],
  
  // Food & Gourmet
  'food': [
    'Fresh Ideas, Fresh Deliveries',
    'The Recipe for Perfect Logistics',
    'Savoring Excellence in Service',
    'From Source to Satisfaction',
    'Deliciously Reliable',
    'The Taste of Timely Delivery',
    'Quality Ingredients, Quality Service',
    'Freshness First, Always',
    'Culinary Care in Every Package',
    'The Flavor of Excellence',
  ],
  
  // Home & Living
  'home': [
    'Home is Where the Heart Is - Delivered',
    'Living Beautifully, Delivered Perfectly',
    'Where Comfort Meets Care',
    'The Heart of Home Logistics',
    'Creating Happy Homes, One Delivery at a Time',
    'Home Sweet Delivery',
    'Living Excellence, Daily',
    'Your Sanctuary, Our Priority',
    'The Art of Home Fulfillment',
    'Comfort Delivered to Your Door',
  ],
  
  // Pets & Animals
  'pet': [
    'Tail-Wagging Deliveries',
    'Where Pets Come First',
    'Paws-itively Perfect Logistics',
    'Happy Pets, Happy Deliveries',
    'The Pack You Can Trust',
    'Furry Friends Fulfilled',
    'Loyal Service for Loyal Companions',
    'Pet Parents Trust Us',
    'Every Creature Deserves the Best',
    'The Purr-fect Delivery Partner',
  ],
  
  // Wellness & Health
  'wellness': [
    'Wellness Delivered with Care',
    'Your Health, Our Priority',
    'The Balance of Perfect Service',
    'Mindful Logistics for Mindful Living',
    'Where Wellbeing Meets Excellence',
    'Healthy Habits, Healthy Deliveries',
    'The Harmony of Health Logistics',
    'Caring for Your Care Products',
    'Vitality in Every Package',
    'Your Wellness Journey, Supported',
  ],
  
  // Automotive & Vehicles
  'automotive': [
    'Driving Excellence Forward',
    'Precision-Engineered Logistics',
    'Where Performance Meets Delivery',
    'The Fast Lane of Fulfillment',
    'Built for Speed, Delivered with Care',
    'Rev Up Your Logistics',
    'Turbocharged Service',
    'From Factory to Front Door',
    'The Engine of E-Commerce',
    'High-Performance Delivery',
  ],
};

// Extended keyword mapping for new themes
const extendedKeywordToTheme: Record<string, string> = {
  // Cashmere / Luxury Textiles
  'cashmere': 'cashmere',
  'kaschmir': 'cashmere',
  'merino': 'cashmere',
  'wolle': 'cashmere',
  'wool': 'cashmere',
  'alpaca': 'cashmere',
  'alpaka': 'cashmere',
  'seide': 'cashmere',
  'silk': 'cashmere',
  'strick': 'cashmere',
  'knit': 'cashmere',
  
  // Luxury
  'luxury': 'luxury',
  'luxus': 'luxury',
  'premium': 'luxury',
  'exclusive': 'luxury',
  'exklusiv': 'luxury',
  'high-end': 'luxury',
  'designer': 'luxury',
  
  // Sports
  'sports': 'sports',
  'sport': 'sports',
  'fitness': 'sports',
  'athletic': 'sports',
  'training': 'sports',
  'gym': 'sports',
  'running': 'sports',
  'laufen': 'sports',
  
  // Beauty
  'beauty': 'beauty',
  'cosmetics': 'beauty',
  'kosmetik': 'beauty',
  'skincare': 'beauty',
  'makeup': 'beauty',
  'parfum': 'beauty',
  'perfume': 'beauty',
  
  // Food
  'food': 'food',
  'gourmet': 'food',
  'essen': 'food',
  'culinary': 'food',
  'lebensmittel': 'food',
  'delicatessen': 'food',
  'delikatessen': 'food',
  
  // Home
  'home': 'home',
  'living': 'home',
  'wohnen': 'home',
  'interior': 'home',
  'furniture': 'home',
  'möbel': 'home',
  'decor': 'home',
  
  // Pet
  'pet': 'pet',
  'pets': 'pet',
  'haustier': 'pet',
  'hund': 'pet',
  'dog': 'pet',
  'katze': 'pet',
  'cat': 'pet',
  'tier': 'pet',
  
  // Wellness
  'wellness': 'wellness',
  'health': 'wellness',
  'gesundheit': 'wellness',
  'yoga': 'wellness',
  'meditation': 'wellness',
  'spa': 'wellness',
  'selfcare': 'wellness',
  
  // Automotive
  'automotive': 'automotive',
  'auto': 'automotive',
  'car': 'automotive',
  'vehicle': 'automotive',
  'fahrzeug': 'automotive',
  'motor': 'automotive',
  'motorrad': 'automotive',
  'motorcycle': 'automotive',
};

// Simple hash function to get consistent tagline per company
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Generate smart tagline based on industry and keywords
// Uses company ID for consistent tagline selection (no flickering)
function generateSmartTagline(
  customTagline: string | null,
  industry: string | null, 
  keywords: string[],
  iconTheme: IconTheme,
  companyId: string
): string {
  // Use custom tagline if set
  if (customTagline && customTagline.trim()) {
    return customTagline;
  }
  
  // First, check for extended themes in keywords
  let extendedTheme: string | null = null;
  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    if (extendedKeywordToTheme[lowerKeyword]) {
      extendedTheme = extendedKeywordToTheme[lowerKeyword];
      break;
    }
  }
  
  // Also check industry for extended themes
  if (!extendedTheme && industry) {
    const lowerIndustry = industry.toLowerCase();
    if (extendedKeywordToTheme[lowerIndustry]) {
      extendedTheme = extendedKeywordToTheme[lowerIndustry];
    }
  }
  
  // Determine which tagline pool to use
  const themeToUse = extendedTheme || iconTheme;
  const taglines = CREATIVE_TAGLINES[themeToUse] || CREATIVE_TAGLINES['default'];
  
  // Use consistent hash based on company ID to always pick the same tagline
  const index = simpleHash(companyId) % taglines.length;
  return taglines[index];
}

// Export function to get all tagline suggestions for a theme
export function getTaglineSuggestions(
  industry: string | null,
  keywords: string[],
  iconTheme: IconTheme
): string[] {
  // Check for extended themes
  let extendedTheme: string | null = null;
  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    if (extendedKeywordToTheme[lowerKeyword]) {
      extendedTheme = extendedKeywordToTheme[lowerKeyword];
      break;
    }
  }
  
  if (!extendedTheme && industry) {
    const lowerIndustry = industry.toLowerCase();
    if (extendedKeywordToTheme[lowerIndustry]) {
      extendedTheme = extendedKeywordToTheme[lowerIndustry];
    }
  }
  
  const themeToUse = extendedTheme || iconTheme;
  return CREATIVE_TAGLINES[themeToUse] || CREATIVE_TAGLINES['default'];
}

// Default brand for unknown companies (MS Direct design)
const defaultPrimary = hexToHSL(MS_DIRECT_PRIMARY);
const defaultAccent = hexToHSL(MS_DIRECT_ACCENT);

const defaultBrand: CompanyBrand = {
  id: 'MSD',
  name: 'MS Direct',
  domain: 'ms-direct.ch',
  industry: 'Fulfillment',
  keywords: ['logistics', 'fulfillment'],
  primaryColor: MS_DIRECT_PRIMARY,
  accentColor: MS_DIRECT_ACCENT,
  logoUrl: null,
  iconTheme: 'default',
  gradient: 'linear-gradient(135deg, hsl(220 60% 20%) 0%, hsl(175 60% 40%) 100%)',
  primaryHue: defaultPrimary.h,
  primarySaturation: defaultPrimary.s,
  primaryLightness: defaultPrimary.l,
  accentHue: defaultAccent.h,
  accentSaturation: defaultAccent.s,
  accentLightness: defaultAccent.l,
  logoText: 'MS DIRECT',
  tagline: 'Fulfillment Excellence - Every Day',
};

interface BrandingContextType {
  brand: CompanyBrand;
  companyData: CompanyBrandData | null;
  isCustomBranded: boolean;
  isLoading: boolean;
  showWelcome: boolean;
  dismissWelcome: () => void;
  hasSessionStarted: boolean;
  refetchBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}

interface BrandingProviderProps {
  children: ReactNode;
}

export function BrandingProvider({ children }: BrandingProviderProps) {
  const { profile, user, activeCompanyId: authActiveCompanyId } = useAuth();
  const [companyData, setCompanyData] = useState<CompanyBrandData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [hasSessionStarted, setHasSessionStarted] = useState(false);
  const [welcomeTriggered, setWelcomeTriggered] = useState(false);
  const [lastUserId, setLastUserId] = useState<string | null>(null);
  const [lastCompanyId, setLastCompanyId] = useState<string | null>(null);
  
  // Storage key must be user-specific AND company-specific so welcome shows when company changes
  const getStorageKey = useCallback((userId: string, companyId: string) => {
    return `msd_welcome_last_shown_${userId}_${companyId}`;
  }, []);
  
  // CRITICAL FIX: Reset CSS variables immediately to MSD defaults
  // This prevents stale branding from previous user/company
  const resetToMSDDefaults = useCallback(() => {
    const root = document.documentElement;
    const defaultPrimary = { h: 220, s: 60, l: 20 };
    const defaultAccent = { h: 175, s: 60, l: 40 };
    
    // Reset all brand-related CSS variables immediately
    root.style.setProperty('--primary', `${defaultPrimary.h} ${defaultPrimary.s}% ${defaultPrimary.l}%`);
    root.style.setProperty('--primary-foreground', '0 0% 100%');
    root.style.setProperty('--primary-button', `${defaultPrimary.h} ${defaultPrimary.s}% ${defaultPrimary.l}%`);
    root.style.setProperty('--primary-button-hover', `${defaultPrimary.h} ${defaultPrimary.s}% 15%`);
    root.style.setProperty('--accent', `${defaultAccent.h} ${defaultAccent.s}% ${defaultAccent.l}%`);
    root.style.setProperty('--accent-foreground', '0 0% 100%');
    root.style.setProperty('--ring', `${defaultAccent.h} ${defaultAccent.s}% ${defaultAccent.l}%`);
    root.style.setProperty('--sidebar-background', `${defaultPrimary.h} ${defaultPrimary.s}% ${defaultPrimary.l}%`);
    root.style.setProperty('--sidebar-foreground', '210 20% 90%');
    root.style.setProperty('--sidebar-primary', `${defaultAccent.h} ${defaultAccent.s}% 50%`);
    root.style.setProperty('--sidebar-primary-foreground', '0 0% 100%');
    root.style.setProperty('--sidebar-accent', `${defaultPrimary.h} ${defaultPrimary.s}% 28%`);
    root.style.setProperty('--sidebar-accent-foreground', '0 0% 100%');
    root.style.setProperty('--sidebar-border', `${defaultPrimary.h} ${defaultPrimary.s}% 25%`);
    root.style.setProperty('--sidebar-ring', `${defaultAccent.h} ${defaultAccent.s}% ${defaultAccent.l}%`);
    root.style.setProperty('--gradient-hero', `linear-gradient(135deg, hsl(${defaultPrimary.h} ${defaultPrimary.s}% ${defaultPrimary.l}%) 0%, hsl(${defaultPrimary.h} ${defaultPrimary.s}% 35%) 100%)`);
    root.style.setProperty('--gradient-accent', `linear-gradient(135deg, hsl(${defaultAccent.h} ${defaultAccent.s}% ${defaultAccent.l}%) 0%, hsl(${defaultAccent.h} ${defaultAccent.s}% 55%) 100%)`);
    
    console.log('🎨 CSS RESET: Applied MSD defaults immediately');
  }, []);
  
  // Reset welcomeTriggered AND branding when user changes (new login)
  useEffect(() => {
    const currentUserId = user?.id || null;
    if (currentUserId !== lastUserId) {
      console.log('🔄 User changed:', lastUserId, '->', currentUserId);
      
      // CRITICAL: Reset CSS immediately when user changes
      if (lastUserId !== null || currentUserId === null) {
        // User logged out or switched - reset CSS NOW
        resetToMSDDefaults();
        setCompanyData(null); // Clear stale company data
      }
      
      setLastUserId(currentUserId);
      // Only reset if user actually logged in (not on logout)
      if (currentUserId) {
        setWelcomeTriggered(false);
      }
    }
  }, [user?.id, lastUserId, resetToMSDDefaults]);
  
  // Function to check if welcome was already shown TODAY for this specific user + company
  const checkIfShownToday = useCallback((userId: string, companyId: string) => {
    const storageKey = getStorageKey(userId, companyId);
    const lastShownDate = localStorage.getItem(storageKey);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    return lastShownDate === today;
  }, [getStorageKey]);

  // Use activeCompanyId from auth (respects company switcher), fallback to profile.company_id
  // For MSD staff with "ALL" selected, use MSD branding
  const companyId = user 
    ? (authActiveCompanyId === 'ALL' ? 'MSD' : authActiveCompanyId || profile?.company_id || 'MSD')
    : 'MSD';

  // Extract colors from domain and save to database
  const extractAndSaveColors = useCallback(async (domain: string, companyId: string) => {
    try {
      console.log(`Extracting colors from domain: ${domain}`);
      
      const { data, error } = await supabase.functions.invoke('extract-brand-colors', {
        body: { domain }
      });

      if (error) {
        console.error('Error calling extract-brand-colors:', error);
        return null;
      }

      if (data?.primary_color && data.source === 'extracted') {
        // Save extracted colors to database
        const { error: updateError } = await supabase
          .from('companies')
          .update({
            primary_color: data.primary_color,
            accent_color: data.accent_color,
          })
          .eq('id', companyId);

        if (updateError) {
          console.error('Error saving extracted colors:', updateError);
        } else {
          console.log(`Saved extracted colors for ${companyId}: ${data.primary_color}, ${data.accent_color}`);
        }

        return {
          primary_color: data.primary_color,
          accent_color: data.accent_color,
        };
      }

      return null;
    } catch (err) {
      console.error('Error extracting colors:', err);
      return null;
    }
  }, []);

  // Fetch company branding data from database
  const fetchCompanyBranding = useCallback(async () => {
    if (!companyId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, domain, industry, brand_keywords, primary_color, accent_color, logo_url, tagline')
        .eq('id', companyId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching company branding:', error);
        setIsLoading(false);
        return;
      }

      if (data) {
        // Check if colors need to be extracted
        if (!data.primary_color && data.domain) {
          // Automatically try to extract colors from domain (silent, no error toast)
          const extractedColors = await extractAndSaveColors(data.domain, data.id);
          
          if (extractedColors) {
            // Update local data with extracted colors
            setCompanyData({
              ...data,
              primary_color: extractedColors.primary_color,
              accent_color: extractedColors.accent_color,
              tagline: data.tagline,
            });
            console.log(`✅ Automatisch Farben extrahiert für ${data.name}: ${extractedColors.primary_color}`);
          } else {
            // Use MS Direct fallback colors
            setCompanyData({
              ...data,
              primary_color: MS_DIRECT_PRIMARY,
              accent_color: MS_DIRECT_ACCENT,
              tagline: data.tagline,
            });
          }
        } else if (!data.primary_color) {
          // No domain and no colors - use MS Direct fallback
          setCompanyData({
            ...data,
            primary_color: MS_DIRECT_PRIMARY,
            accent_color: MS_DIRECT_ACCENT,
            tagline: data.tagline,
          });
        } else {
          setCompanyData(data);
        }
      }
    } catch (err) {
      console.error('Error fetching company branding:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, extractAndSaveColors]);

  // Reset and refetch when company changes
  // CRITICAL FIX: Reset CSS immediately when company changes to prevent stale branding
  useEffect(() => {
    // Detect company change
    if (lastCompanyId !== null && lastCompanyId !== companyId) {
      console.log('🔄 Company changed:', lastCompanyId, '->', companyId, '- Resetting CSS immediately');
      resetToMSDDefaults();
      setCompanyData(null); // Clear stale company data immediately
    }
    setLastCompanyId(companyId);
    
    setIsLoading(true);
    fetchCompanyBranding();
  }, [companyId, fetchCompanyBranding, lastCompanyId, resetToMSDDefaults]);

  // Process company data into brand configuration
  const brand: CompanyBrand = companyData
    ? (() => {
        const primary = hexToHSL(companyData.primary_color || '#1e3a5f');
        const accent = hexToHSL(companyData.accent_color || '#2f9e8f');
        const iconTheme = getIconTheme(companyData.brand_keywords || [], companyData.industry);
        return {
          id: companyData.id,
          name: companyData.name,
          domain: companyData.domain,
          industry: companyData.industry,
          keywords: companyData.brand_keywords || [],
          primaryColor: companyData.primary_color || '#1e3a5f',
          accentColor: companyData.accent_color || '#2f9e8f',
          logoUrl: companyData.logo_url,
          iconTheme,
          gradient: `linear-gradient(135deg, hsl(${primary.h} ${primary.s}% ${primary.l}%) 0%, hsl(${accent.h} ${accent.s}% ${accent.l}%) 100%)`,
          primaryHue: primary.h,
          primarySaturation: primary.s,
          primaryLightness: primary.l,
          accentHue: accent.h,
          accentSaturation: accent.s,
          accentLightness: accent.l,
          logoText: companyData.name.toUpperCase(),
          tagline: generateSmartTagline(companyData.tagline, companyData.industry, companyData.brand_keywords || [], iconTheme, companyData.id),
        };
      })()
    : defaultBrand;

  const isCustomBranded = !!companyData && companyId !== 'MSD' && !!user;

    // Apply custom CSS variables when brand changes
    // PRIORITY: ALWAYS use the brand's actual extracted colors - they are intentionally chosen!
    // Curated palettes are ONLY used as fallback when brand colors are unsafe
    useEffect(() => {
      const root = document.documentElement;
      
      // Get the curated palette based on the brand's icon theme (fallback only)
      const palette = CURATED_PALETTES[brand.iconTheme] || CURATED_PALETTES.default;
      
      // Parse the brand's actual colors
      const brandPrimary = hexToHSL(brand.primaryColor);
      const brandAccent = hexToHSL(brand.accentColor);
      
      // Detect inverted color scheme (light primary + dark accent)
      // This happens when brands have a light background color as "primary"
      const isInvertedScheme = isColorTooLight(brandPrimary) && isColorSafeForWhiteText(brandAccent);
      
      // Determine if brand colors are safe to use
      const brandPrimaryIsSafe = isColorSafeForWhiteText(brandPrimary);
      
      // For sidebar: PREFER brand primary if it's dark enough, otherwise use curated
      let sidebar: { h: number; s: number; l: number };
      let sidebarHover: { h: number; s: number; l: number };
      let accent: { h: number; s: number; l: number };
      let buttonPrimary: { h: number; s: number; l: number };
      
      if (isInvertedScheme) {
        // Inverted: Use brand's dark accent color for sidebar
        sidebar = brandAccent;
        sidebarHover = { ...brandAccent, l: Math.min(brandAccent.l + 8, 35) };
        // Light primary becomes the accent
        accent = { ...brandPrimary, l: Math.max(brandPrimary.l, 45) };
        buttonPrimary = brandAccent;
        console.log(`🎨 INVERTED SCHEME for ${brand.name} - using accent as sidebar`);
      } else if (brandPrimaryIsSafe) {
        // NORMAL - Brand primary is dark enough - USE IT for sidebar!
        // This is the key fix: respect the extracted brand colors
        sidebar = { ...brandPrimary, l: Math.min(brandPrimary.l, 25) }; // Ensure dark enough for sidebar
        sidebarHover = { ...brandPrimary, l: Math.min(brandPrimary.l + 8, 35) };
        // Use brand accent for accents (buttons, highlights)
        // If accent is very light (like pink #fcc4c5), still use it but adjust for visibility
        accent = brandAccent.l > 70 
          ? { ...brandAccent, s: Math.min(brandAccent.s + 10, 80), l: Math.max(brandAccent.l - 20, 50) }
          : brandAccent;
        buttonPrimary = sidebar;
        console.log(`🎨 BRAND PRIMARY for ${brand.name} - sidebar uses ${brand.primaryColor}`);
      } else {
        // Fallback: brand primary too light, use curated palette
        sidebar = palette.sidebar;
        sidebarHover = palette.sidebarHover;
        accent = palette.accent;
        buttonPrimary = sidebar;
        console.log(`🎨 CURATED FALLBACK for ${brand.name} - primary too light`);
      }
      
      console.log(`🎨 Theme: ${brand.iconTheme} | Inverted: ${isInvertedScheme} | Primary L:${brandPrimary.l}% | Accent L:${brandAccent.l}%`);
      
      // Apply brand primary for logos/text (original color, no adjustment)
      root.style.setProperty('--primary', `${brandPrimary.h} ${brandPrimary.s}% ${brandPrimary.l}%`);
      root.style.setProperty('--primary-foreground', isInvertedScheme ? '0 0% 20%' : '0 0% 100%');
      
      // Apply SAFE button primary
      root.style.setProperty('--primary-button', `${buttonPrimary.h} ${buttonPrimary.s}% ${buttonPrimary.l}%`);
      root.style.setProperty('--primary-button-hover', `${buttonPrimary.h} ${buttonPrimary.s}% ${Math.max(buttonPrimary.l - 5, 15)}%`);
      
      // Apply accent colors - use the brand accent with proper foreground
      const accentNeedsDarkText = accent.l > 55;
      root.style.setProperty('--accent', `${accent.h} ${accent.s}% ${accent.l}%`);
      root.style.setProperty('--accent-foreground', accentNeedsDarkText ? '0 0% 20%' : '0 0% 100%');
      root.style.setProperty('--ring', `${accent.h} ${accent.s}% ${accent.l}%`);
      
      // Apply sidebar colors - BRAND colors with proper dark adjustment
      root.style.setProperty('--sidebar-background', `${sidebar.h} ${sidebar.s}% ${sidebar.l}%`);
      root.style.setProperty('--sidebar-foreground', '210 20% 90%');
      root.style.setProperty('--sidebar-primary', `${accent.h} ${accent.s}% ${Math.min(accent.l + 10, 65)}%`);
      root.style.setProperty('--sidebar-primary-foreground', accentNeedsDarkText ? '0 0% 20%' : '0 0% 100%');
      root.style.setProperty('--sidebar-accent', `${sidebarHover.h} ${sidebarHover.s}% ${sidebarHover.l}%`);
      root.style.setProperty('--sidebar-accent-foreground', '0 0% 100%');
      root.style.setProperty('--sidebar-border', `${sidebar.h} ${sidebar.s}% ${Math.min(sidebar.l + 5, 30)}%`);
      root.style.setProperty('--sidebar-ring', `${accent.h} ${accent.s}% ${accent.l}%`);
      
      // Gradients - use brand colors for personalized feel
      root.style.setProperty('--gradient-hero', `linear-gradient(135deg, hsl(${sidebar.h} ${sidebar.s}% ${sidebar.l}%) 0%, hsl(${sidebar.h} ${sidebar.s}% ${Math.min(sidebar.l + 15, 40)}%) 100%)`);
      root.style.setProperty('--gradient-accent', `linear-gradient(135deg, hsl(${accent.h} ${accent.s}% ${accent.l}%) 0%, hsl(${accent.h} ${accent.s}% ${Math.min(accent.l + 15, 70)}%) 100%)`);
      
      console.log(`🎨 Applied: Sidebar HSL(${sidebar.h}, ${sidebar.s}%, ${sidebar.l}%) | Accent HSL(${accent.h}, ${accent.s}%, ${accent.l}%)`);
    }, [brand, user]);

  // Show welcome animation - only trigger ONCE per calendar day per user+company
  // Check localStorage dynamically when user is authenticated and profile is loaded
  useEffect(() => {
    // Only proceed when we have user and profile (auth complete)
    if (!user || !profile) {
      console.log('Welcome: waiting for auth...', { hasUser: !!user, hasProfile: !!profile });
      return;
    }
    
    // Don't show if already triggered this session
    if (welcomeTriggered) {
      console.log('Welcome: already triggered this session');
      return;
    }
    
    // Use the active company for the storage key
    const activeCompany = companyId || profile.company_id || 'MSD';
    const storageKey = getStorageKey(user.id, activeCompany);
    const hasShownToday = checkIfShownToday(user.id, activeCompany);
    const today = new Date().toISOString().split('T')[0];
    const storedDate = localStorage.getItem(storageKey);
    
    console.log('Welcome check:', { 
      hasShownToday, 
      storedDate,
      today,
      userId: user.id,
      profileCompany: profile.company_id,
      activeCompany,
      storageKey,
    });
    
    if (!hasShownToday) {
      console.log('Showing welcome screen NOW!');
      // Set all states immediately - no timeout needed
      setWelcomeTriggered(true);
      setShowWelcome(true);
      setHasSessionStarted(true);
      localStorage.setItem(storageKey, today);
      console.log('Welcome screen shown, saved date:', today);
    } else {
      console.log('Welcome already shown today, skipping');
      setWelcomeTriggered(true); // Mark as handled
    }
  }, [user, profile, welcomeTriggered, checkIfShownToday, getStorageKey, companyId]);

  const dismissWelcome = () => {
    setShowWelcome(false);
  };

  const refetchBranding = async () => {
    await fetchCompanyBranding();
  };

  return (
    <BrandingContext.Provider 
      value={{ 
        brand, 
        companyData,
        isCustomBranded, 
        isLoading,
        showWelcome, 
        dismissWelcome, 
        hasSessionStarted,
        refetchBranding,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}
