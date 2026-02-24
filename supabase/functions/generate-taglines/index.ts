import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, checkRateLimit, rateLimitResponse, getClientIdentifier, Logger } from '../_shared/security.ts';

const logger = new Logger('generate-taglines');

// Extract relevant content from website for context
async function fetchWebsiteContent(domain: string): Promise<string> {
  try {
    let url = domain.trim();
    if (!url.startsWith('http')) {
      url = `https://${url}`;
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      return '';
    }

    const html = await response.text();
    
    // Extract meaningful content
    const contentParts: string[] = [];
    
    // Title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) contentParts.push(`Website Title: ${titleMatch[1].trim()}`);
    
    // Meta description
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    if (metaDescMatch) contentParts.push(`Description: ${metaDescMatch[1].trim()}`);
    
    // Open Graph title/description
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    if (ogTitleMatch) contentParts.push(`OG Title: ${ogTitleMatch[1].trim()}`);
    
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    if (ogDescMatch) contentParts.push(`OG Description: ${ogDescMatch[1].trim()}`);
    
    // H1 headings
    const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi);
    if (h1Matches) {
      const cleanH1s = h1Matches.slice(0, 3).map(h => h.replace(/<[^>]+>/g, '').trim()).filter(h => h.length > 0);
      if (cleanH1s.length > 0) contentParts.push(`Main Headlines: ${cleanH1s.join(' | ')}`);
    }
    
    // H2 headings
    const h2Matches = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi);
    if (h2Matches) {
      const cleanH2s = h2Matches.slice(0, 5).map(h => h.replace(/<[^>]+>/g, '').trim()).filter(h => h.length > 0);
      if (cleanH2s.length > 0) contentParts.push(`Subheadlines: ${cleanH2s.join(' | ')}`);
    }
    
    // Look for tagline/slogan patterns
    const sloganPatterns = [
      /<[^>]*class=["'][^"']*(?:tagline|slogan|motto|hero-text|subtitle)[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/gi,
      /<p[^>]*class=["'][^"']*lead[^"']*["'][^>]*>([\s\S]*?)<\/p>/gi,
    ];
    
    for (const pattern of sloganPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const text = match[1].replace(/<[^>]+>/g, '').trim();
        if (text.length > 5 && text.length < 100) {
          contentParts.push(`Existing Tagline: ${text}`);
        }
      }
    }
    
    return contentParts.join('\n');
  } catch (error) {
    logger.warn('Failed to fetch website content', { error: error instanceof Error ? error.message : String(error) });
    return '';
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const clientId = getClientIdentifier(req);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 10, windowMs: 60000 });
  
  if (!rateLimit.allowed) {
    logger.warn('Rate limit exceeded', { clientId });
    return rateLimitResponse(corsHeaders, rateLimit.resetIn);
  }

  try {
    const { companyName, industry, keywords, domain, websiteContent: providedContent } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    logger.info('Generating taglines', { companyName, industry, keywords: keywords?.join?.(', '), domain });

    // Fetch website content if domain is provided and no content was passed
    let websiteContent = providedContent || '';
    if (domain && !websiteContent) {
      websiteContent = await fetchWebsiteContent(domain);
      logger.info('Fetched website content', { contentLength: websiteContent.length });
    }

    const systemPrompt = `You are a creative branding expert specializing in crafting memorable, impactful taglines. 
Your taglines should:
- Be concise (3-7 words typically)
- Evoke emotion and trust
- Be memorable and unique
- Reflect the company's actual brand voice and industry
- Sound professional yet approachable
- Work well for a welcome screen/login page
- Be inspired by the actual website content when available

IMPORTANT: 
- Analyze the website content carefully to understand the brand's tone, values, and messaging
- Create taglines that feel authentic to THIS specific brand
- Return ONLY a JSON array of exactly 6 tagline strings. No explanations, no markdown, just the JSON array.`;

    const userPrompt = `Generate 6 unique, creative taglines for:

Company Name: ${companyName || 'Unknown Company'}
Industry/Niche: ${industry || 'General Business'}
Brand Keywords: ${Array.isArray(keywords) ? keywords.join(', ') : keywords || 'quality, service, excellence'}

${websiteContent ? `
=== WEBSITE CONTENT (use this for inspiration) ===
${websiteContent}
=== END WEBSITE CONTENT ===

Analyze the website content above to understand:
1. The brand's tone of voice (formal, casual, playful, professional)
2. Key value propositions mentioned
3. Target audience
4. Unique selling points

Create taglines that align with the brand's existing messaging and feel authentic.
` : ''}

The taglines should feel personalized for this specific company. Make them inspiring, professional, and memorable.
Avoid generic phrases like "Your Trusted Partner" unless the website actually uses similar language.

Return ONLY a JSON array like: ["Tagline 1", "Tagline 2", "Tagline 3", "Tagline 4", "Tagline 5", "Tagline 6"]`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Failed to generate taglines');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    logger.info('AI response received', { contentLength: content.length });

    // Parse the JSON array from the response
    let taglines: string[] = [];
    try {
      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        taglines = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: split by newlines and clean up
        taglines = content
          .split('\n')
          .map((line: string) => line.replace(/^[\d\.\-\*]+\s*/, '').replace(/^["']|["']$/g, '').trim())
          .filter((line: string) => line.length > 5 && line.length < 100);
      }
    } catch (parseError) {
      console.error('Error parsing taglines:', parseError);
      // Return generic fallback
      taglines = [
        `${companyName} - Excellence Delivered`,
        'Your Success, Our Mission',
        'Where Quality Meets Speed',
        'Fulfillment Reimagined',
        'Beyond Expectations',
        'Precision. Passion. Perfection.',
      ];
    }

    // Ensure we have at least 6 taglines
    while (taglines.length < 6) {
      taglines.push(`${companyName || 'Excellence'} - Your Trusted Partner`);
    }

    return new Response(JSON.stringify({ 
      taglines: taglines.slice(0, 6),
      websiteContentUsed: !!websiteContent,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating taglines:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
