import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, checkRateLimit, rateLimitResponse, getClientIdentifier, Logger } from '../_shared/security.ts';

const logger = new Logger('extract-brand-colors');

// Calculate relative luminance for a color
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate contrast ratio between two colors
function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  
  if (!rgb1 || !rgb2) return 1;
  
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

// Check if color is too light (luminance > 0.85) - more strict
function isColorTooLight(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  return luminance > 0.85;
}

// Check if color is too dark (luminance < 0.05) - more strict
function isColorTooDark(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  return luminance < 0.05;
}

// Check if color is grayscale (r, g, b values are very similar)
function isGrayscale(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  // If the difference between max and min is less than 15, it's likely grayscale
  return (max - min) < 15;
}

// Convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Get color saturation (0-1)
function getColorSaturation(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  
  if (max === min) return 0;
  
  const d = max - min;
  return l > 0.5 ? d / (2 - max - min) : d / (max + min);
}

// Common color extraction patterns - improved for better detection
function extractColorsFromHTML(html: string): { colors: { hex: string; priority: number; source: string }[]; websiteContent: string } {
  const colors: { hex: string; priority: number; source: string }[] = [];
  
  // Extract text content for slogan generation
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const h1Matches = html.match(/<h1[^>]*>([^<]+)<\/h1>/gi);
  const h2Matches = html.match(/<h2[^>]*>([^<]+)<\/h2>/gi);
  
  let websiteContent = '';
  if (titleMatch) websiteContent += `Title: ${titleMatch[1].trim()}\n`;
  if (metaDescMatch) websiteContent += `Description: ${metaDescMatch[1].trim()}\n`;
  if (h1Matches) {
    const cleanH1s = h1Matches.slice(0, 3).map(h => h.replace(/<[^>]+>/g, '').trim());
    websiteContent += `Headlines: ${cleanH1s.join(', ')}\n`;
  }
  if (h2Matches) {
    const cleanH2s = h2Matches.slice(0, 5).map(h => h.replace(/<[^>]+>/g, '').trim());
    websiteContent += `Subheadlines: ${cleanH2s.join(', ')}\n`;
  }
  
  // PRIORITY 1: Theme color meta tag - highest priority
  const themeColorMatch = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i);
  if (themeColorMatch) {
    colors.push({ hex: themeColorMatch[1], priority: 100, source: 'theme-color' });
  }
  
  // Also check alternate format
  const themeColorMatch2 = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']theme-color["']/i);
  if (themeColorMatch2) {
    colors.push({ hex: themeColorMatch2[1], priority: 100, source: 'theme-color-alt' });
  }
  
  // PRIORITY 2: msapplication-TileColor
  const tileColorMatch = html.match(/<meta[^>]*name=["']msapplication-TileColor["'][^>]*content=["']([^"']+)["']/i);
  if (tileColorMatch) {
    colors.push({ hex: tileColorMatch[1], priority: 90, source: 'tile-color' });
  }
  
  // PRIORITY 3: SVG fill colors (often logos) - look for non-gray fills
  const svgFillRegex = /fill=["']([#][a-fA-F0-9]{3,6})["']/gi;
  let svgMatch;
  while ((svgMatch = svgFillRegex.exec(html)) !== null) {
    colors.push({ hex: svgMatch[1], priority: 85, source: 'svg-fill' });
  }
  
  // PRIORITY 4: CSS custom properties with brand-related names
  const cssVarPatterns = [
    { pattern: /--(?:brand|primary)(?:-color)?:\s*([#][a-fA-F0-9]{3,6})/gi, priority: 80 },
    { pattern: /--(?:main|accent)(?:-color)?:\s*([#][a-fA-F0-9]{3,6})/gi, priority: 75 },
    { pattern: /--(?:color-primary|color-brand|color-main):\s*([#][a-fA-F0-9]{3,6})/gi, priority: 75 },
  ];
  
  for (const { pattern, priority } of cssVarPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      colors.push({ hex: match[1], priority, source: 'css-var' });
    }
  }
  
  // PRIORITY 5: Header/nav background colors - often brand colors
  const headerBgRegex = /(?:header|nav(?:bar)?|\.header|\.nav)[^{]*\{[^}]*background(?:-color)?:\s*([#][a-fA-F0-9]{3,6})/gi;
  let headerMatch;
  while ((headerMatch = headerBgRegex.exec(html)) !== null) {
    colors.push({ hex: headerMatch[1], priority: 70, source: 'header-bg' });
  }
  
  // PRIORITY 6: Button colors
  const buttonBgRegex = /\.(?:btn|button)[^{]*\{[^}]*background(?:-color)?:\s*([#][a-fA-F0-9]{3,6})/gi;
  let btnMatch;
  while ((btnMatch = buttonBgRegex.exec(html)) !== null) {
    colors.push({ hex: btnMatch[1], priority: 65, source: 'button-bg' });
  }
  
  // PRIORITY 7: Link colors
  const linkColorRegex = /a\s*\{[^}]*color:\s*([#][a-fA-F0-9]{3,6})/gi;
  let linkMatch;
  while ((linkMatch = linkColorRegex.exec(html)) !== null) {
    colors.push({ hex: linkMatch[1], priority: 60, source: 'link-color' });
  }
  
  // PRIORITY 8: Text colors on body - often primary brand color
  const bodyColorRegex = /body[^{]*\{[^}]*color:\s*([#][a-fA-F0-9]{3,6})/gi;
  let bodyMatch;
  while ((bodyMatch = bodyColorRegex.exec(html)) !== null) {
    colors.push({ hex: bodyMatch[1], priority: 55, source: 'body-color' });
  }
  
  // PRIORITY 9: Inline style colors - background colors in hero sections
  const inlineBgRegex = /style=["'][^"']*background(?:-color)?:\s*([#][a-fA-F0-9]{6})/gi;
  let inlineBgMatch;
  while ((inlineBgMatch = inlineBgRegex.exec(html)) !== null) {
    colors.push({ hex: inlineBgMatch[1], priority: 50, source: 'inline-bg' });
  }
  
  // PRIORITY 10: All other hex colors with frequency counting
  const allHexRegex = /#([a-fA-F0-9]{6})\b/g;
  let hexMatch;
  while ((hexMatch = allHexRegex.exec(html)) !== null) {
    const hex = `#${hexMatch[1]}`.toLowerCase();
    colors.push({ hex, priority: 30, source: 'general' });
  }
  
  return { colors, websiteContent };
}

// Convert various color formats to hex
function normalizeToHex(color: string): string {
  if (!color) return '#1e3a5f';
  
  color = color.trim().toLowerCase();
  
  if (color.startsWith('#')) {
    if (color.length === 4) {
      return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    }
    return color.length === 7 ? color : '#1e3a5f';
  }
  
  const rgbMatch = color.match(/rgb[a]?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    const r = Math.min(255, parseInt(rgbMatch[1])).toString(16).padStart(2, '0');
    const g = Math.min(255, parseInt(rgbMatch[2])).toString(16).padStart(2, '0');
    const b = Math.min(255, parseInt(rgbMatch[3])).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
  
  return '#1e3a5f';
}

// Generate a complementary accent color with good contrast
function generateAccentColor(primaryHex: string): string {
  const rgb = hexToRgb(primaryHex);
  if (!rgb) return '#2f9e8f';
  
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  // Shift hue by ~144 degrees for triadic harmony
  const newH = (h + 0.4) % 1;
  const newS = Math.min(s * 1.1, 0.7);
  const newL = 0.55; // Ensure readable luminance
  
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  
  const q = newL < 0.5 ? newL * (1 + newS) : newL + newS - newL * newS;
  const p = 2 * newL - q;
  
  const newR = Math.round(hue2rgb(p, q, newH + 1/3) * 255);
  const newG = Math.round(hue2rgb(p, q, newH) * 255);
  const newB = Math.round(hue2rgb(p, q, newH - 1/3) * 255);
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

// Filter colors to exclude neutrals
const NEUTRAL_COLORS = new Set([
  '#ffffff', '#000000', '#fff', '#000', 
  '#f5f5f5', '#e5e5e5', '#d4d4d4', '#333333', '#666666', '#999999', 
  '#fafafa', '#eeeeee', '#cccccc', '#111111', '#222222', '#444444',
  '#555555', '#777777', '#888888', '#aaaaaa', '#bbbbbb', '#dddddd',
  '#f0f0f0', '#e0e0e0', '#d0d0d0', '#c0c0c0', '#b0b0b0', '#a0a0a0',
  '#1a1a1a', '#2a2a2a', '#3a3a3a', '#4a4a4a', '#5a5a5a',
]);

// Select best colors with priority and contrast validation
function selectBestColors(colorData: { hex: string; priority: number; source: string }[]): { primary: string; accent: string } {
  // Normalize and filter colors
  const validColors: { hex: string; priority: number; source: string; saturation: number }[] = [];
  
  for (const { hex, priority, source } of colorData) {
    const normalized = normalizeToHex(hex);
    
    // Skip invalid, neutral, too light, too dark, or grayscale colors
    if (!normalized || normalized.length !== 7) continue;
    if (NEUTRAL_COLORS.has(normalized)) continue;
    if (isColorTooLight(normalized)) continue;
    if (isColorTooDark(normalized)) continue;
    if (isGrayscale(normalized)) continue;
    
    const saturation = getColorSaturation(normalized);
    
    validColors.push({ hex: normalized, priority, source, saturation });
  }
  
  // Sort by priority (highest first), then by saturation for equal priorities
  validColors.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.saturation - a.saturation;
  });
  
  // Count frequency for lower priority colors
  const colorCounts: Record<string, number> = {};
  for (const { hex, priority } of validColors) {
    if (priority < 50) {
      colorCounts[hex] = (colorCounts[hex] || 0) + 1;
    }
  }
  
  // Get unique colors in priority order
  const uniqueColors: string[] = [];
  const seen = new Set<string>();
  for (const { hex } of validColors) {
    if (!seen.has(hex)) {
      seen.add(hex);
      uniqueColors.push(hex);
    }
  }
  
  logger.info('Color analysis', { 
    totalFound: colorData.length, 
    validColors: validColors.length,
    topColors: uniqueColors.slice(0, 5)
  });
  
  // Select primary color (highest priority, good saturation)
  let primary = uniqueColors[0] || '#1e3a5f';
  
  // Find accent color - should be different from primary and have good contrast
  let accent: string | null = null;
  const MIN_CONTRAST = 1.5; // Minimum contrast between primary and accent
  const MIN_COLOR_DISTANCE = 50; // Minimum RGB distance
  
  for (const color of uniqueColors.slice(1)) {
    const contrast = getContrastRatio(primary, color);
    const distance = getColorDistance(primary, color);
    
    if (contrast >= MIN_CONTRAST && distance >= MIN_COLOR_DISTANCE) {
      accent = color;
      break;
    }
  }
  
  // If no good accent found, generate one
  if (!accent) {
    accent = generateAccentColor(primary);
  }
  
  return { primary, accent };
}

// Calculate color distance in RGB space
function getColorDistance(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 0;
  
  return Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
    Math.pow(rgb1.g - rgb2.g, 2) +
    Math.pow(rgb1.b - rgb2.b, 2)
  );
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const clientId = getClientIdentifier(req);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 30, windowMs: 60000 });
  
  if (!rateLimit.allowed) {
    logger.warn('Rate limit exceeded', { clientId });
    return rateLimitResponse(corsHeaders, rateLimit.resetIn);
  }

  try {
    const { domain } = await req.json();
    
    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'Domain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let url = domain.trim();
    if (!url.startsWith('http')) {
      url = `https://${url}`;
    }

    logger.info('Extracting colors', { domain: url });

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.status}`);
    }

    const html = await response.text();
    
    const { colors, websiteContent } = extractColorsFromHTML(html);
    
    // Select best colors with priority and contrast validation
    const { primary, accent } = selectBestColors(colors);
    
    const contrastRatio = getContrastRatio(primary, accent);

    logger.info('Colors extracted', { 
      primary, 
      accent, 
      contrastRatio: contrastRatio.toFixed(2),
      totalColorsFound: colors.length 
    });

    return new Response(
      JSON.stringify({
        success: true,
        primary_color: primary,
        accent_color: accent,
        contrast_ratio: contrastRatio,
        website_content: websiteContent,
        source: colors.length > 0 ? 'extracted' : 'generated',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Color extraction failed', error instanceof Error ? error : new Error(String(error)));
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'Failed to extract colors',
        message: errorMessage,
        primary_color: '#1e3a5f',
        accent_color: '#2f9e8f',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
