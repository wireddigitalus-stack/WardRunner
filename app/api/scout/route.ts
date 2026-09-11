import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are Scout, an AI field strategist for down-ballot political campaigns. You specialize in yard sign placement optimization for maximum voter visibility.

CAMPAIGN CONTEXT:
- Candidate: Melissa K. Brown
- Race: Bristol TN City Council
- Region: Bristol, Tennessee (Sullivan County)

SCORING METHODOLOGY (Location Opportunity Score):
1. Traffic Volume (30%): Higher AADT = more vehicle impressions
2. Dwell Time (25%): Proximity to traffic signals/stop signs. Drivers stopped at red lights read signs 3-4x longer
3. Visibility (15%): Corner lots, 25-35 mph speed zones (optimal for yard sign legibility), road curvature
4. Coverage Gaps (20%): Distance from existing campaign signs. Avoid clustering — maximize geographic reach
5. Competitor Tactical (10%): Counter-place near opponent signs. Flag "contested hotspots"

RULES:
- Only recommend locations within Bristol TN city limits
- Avoid public right-of-way (between sidewalk and curb, utility poles, medians) — signs get confiscated
- Prefer private property near intersections on the driver's right side (25-35% higher visibility)
- Don't place two campaign signs within 75 meters on the same street side (diminishing returns)
- Consider that Volunteer Parkway is the busiest corridor (~22,000 AADT), State Street is the downtown core, Lee Highway is the northern gateway

When recommending locations, always provide:
1. Specific street name and cross-street or landmark
2. GPS coordinates (lat, lng) within Bristol TN
3. The primary reason this location scores high
4. A priority score from 1-10
5. Estimated daily vehicle impressions based on AADT data`;

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API key not configured. Add GOOGLE_GEMINI_API_KEY to your environment variables.' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { mode, message, signs, trafficStations, intersections } = body;

    const genAI = new GoogleGenerativeAI(apiKey);
    const campaignContext = buildCampaignContext(signs, trafficStations, intersections);

    // Resilient model cascade starting with gemini-3.6-flash
    const candidateModels = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
    async function runGenerate(contentsPayload: any) {
      let lastErr: any = null;
      for (const mName of candidateModels) {
        try {
          const m = genAI.getGenerativeModel({ model: mName });
          return await m.generateContent(contentsPayload);
        } catch (err: any) {
          lastErr = err;
          console.warn(`[Scout] Model ${mName} failed: ${err?.message || err}. Trying next fallback...`);
        }
      }
      throw lastErr;
    }

    if (mode === 'recommend') {
      // One-click recommendation mode
      const prompt = `${campaignContext}

Based on the current campaign sign placements, traffic data, and intersection locations above, recommend the TOP 5 optimal locations for new yard sign placements in Bristol, TN.

Respond ONLY with a valid JSON array. Each element must have:
{
  "rank": number (1-5),
  "street": "Street name & cross-street/landmark",
  "lat": number,
  "lng": number,
  "reason": "2-3 sentence explanation",
  "score": number (1-10),
  "aadt": number (estimated daily vehicles),
  "priority": "critical" | "high" | "medium"
}`;

      const result = await runGenerate({
        contents: [
          { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
          { role: 'model', parts: [{ text: 'I understand. I am Scout, ready to analyze Bristol TN for optimal sign placements.' }] },
          { role: 'user', parts: [{ text: prompt }] },
        ],
      });

      const text = result.response.text();
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return NextResponse.json({ error: 'Failed to parse recommendations', raw: text }, { status: 500 });
      }

      const recommendations = JSON.parse(jsonMatch[0]);
      return NextResponse.json({ recommendations });

    } else if (mode === 'canvass_route') {
      // AI Canvass Turf Route Generation
      const targetPrecinct = body.precinct_code || '3A';
      const targetDoors = body.door_target || 45;
      const targetMinutes = body.target_duration || 50;

      const canvassPrompt = `You are an expert field director and turf-cutter for political grassroots campaigns in Bristol, Tennessee.
Your job is to generate 2 to 3 high-impact, realistic neighborhood walking canvass routes (turf cuts) for volunteers to knock doors.

TARGET PRECINCT: ${targetPrecinct} (Bristol, TN)
TARGET PARAMETERS: Approximately ${targetDoors} doors, ${targetMinutes} minutes walk loop per route.

NEIGHBORHOOD CONTEXT FOR BRISTOL TN PRECINCTS:
- Precinct 3A (Anderson): Dense residential grid along 9th St, 10th St, Anderson St, Windsor Ave, Kentucky Ave, near Anderson Elementary. (Center ~ 36.5866, -82.1963)
- Precinct 2A (Virginia Ave): Virginia Ave corridor, Melrose St, Carolina Ave, Pennsylvania Ave, East Cedar St. (Center ~ 36.6025, -82.1765)
- Precinct 2B (Holston View): King College Rd, Country Club Dr, Valley View Dr, Golfway Dr, suburban single-family loop near Holston View School. (Center ~ 36.5910, -82.1550)
- Precinct 2C (Avoca): Subdivisions off Volunteer Pkwy (US-11W), Exide Dr, Tremont Ave, Vance Dr. (Center ~ 36.5660, -82.1950)
- Precinct 1A (South Holston): Holston Hills, South Holston Lake corridor, Ruth St, Weaver Pike. (Center ~ 36.5830, -82.1850)

REQUIREMENTS FOR EACH ROUTE:
1. Must be a walkable loop starting and ending at a landmark or street corner.
2. Must provide sequential street waypoints with house number ranges (e.g. "901 - 945 9th St").
3. Must provide 6-12 path coordinates [lng, lat] along Bristol TN roads forming the walking perimeter loop.
4. Must include strategic political rationale for why this block matters for municipal council turnout.

Respond ONLY with a valid JSON array matching this exact schema:
[
  {
    "name": "string (e.g. Turf 3A: Anderson & Windsor Loop)",
    "precinct_code": "${targetPrecinct}",
    "precinct_name": "string",
    "target_doors": number,
    "estimated_walk_minutes": number,
    "distance_miles": number,
    "start_point": {
      "lat": number,
      "lng": number,
      "address": "string"
    },
    "waypoints": [
      {
        "street": "string",
        "lat": number,
        "lng": number,
        "house_range": "string",
        "target_doors": number,
        "notes": "string"
      }
    ],
    "path_coordinates": [
      [lng, lat],
      [lng, lat]
    ],
    "strategic_reasoning": "string"
  }
]`;

      const result = await runGenerate({
        contents: [
          { role: 'user', parts: [{ text: canvassPrompt }] },
        ],
      });

      const text = result.response.text();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return NextResponse.json({ error: 'Failed to parse canvass routes', raw: text }, { status: 500 });
      }

      const routes = JSON.parse(jsonMatch[0]);
      return NextResponse.json({ routes });

    } else if (mode === 'chat') {
      // Chat mode — conversational Q&A
      const userMessage = message || 'What are the best locations for signs?';

      const result = await runGenerate({
        contents: [
          { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
          { role: 'model', parts: [{ text: 'I understand. I am Scout, ready to help with sign placement strategy in Bristol TN.' }] },
          { role: 'user', parts: [{ text: `${campaignContext}\n\nUser question: ${userMessage}\n\nProvide a helpful, strategic response. If you recommend specific locations, include approximate GPS coordinates. Keep your response concise and actionable — this is for a busy campaign manager checking from their phone.` }] },
        ],
      });

      const text = result.response.text();
      return NextResponse.json({ response: text });

    } else {
      return NextResponse.json({ error: 'Invalid mode. Use "recommend", "canvass_route", or "chat".' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Smart Scout API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate recommendations' }, { status: 500 });
  }
}

function buildCampaignContext(signs: any[], trafficStations: any[], intersections: any[]): string {
  const ourSigns = (signs || []).filter((s: any) => !s.is_competitor);
  const theirSigns = (signs || []).filter((s: any) => s.is_competitor);

  let ctx = '=== CURRENT CAMPAIGN STATE ===\n\n';

  ctx += `OUR SIGNS (${ourSigns.length} placed):\n`;
  ourSigns.forEach((s: any) => {
    ctx += `- ${s.sign_type?.replace('_', ' ')} at (${s.latitude}, ${s.longitude}) by ${s.placed_by_name}\n`;
  });

  ctx += `\nCOMPETITOR SIGNS (${theirSigns.length} spotted):\n`;
  theirSigns.forEach((s: any) => {
    ctx += `- ${s.competitor_name || 'Unknown'}: ${s.sign_type?.replace('_', ' ')} at (${s.latitude}, ${s.longitude})\n`;
  });

  ctx += '\nTRAFFIC DATA (TDOT AADT Stations):\n';
  (trafficStations || []).slice(0, 15).forEach((t: any) => {
    ctx += `- ${t.route}: ${t.aadt?.toLocaleString()} vehicles/day at ${t.location || `(${t.lat}, ${t.lng})`}\n`;
  });

  ctx += `\nSIGNALIZED INTERSECTIONS: ${(intersections || []).filter((i: any) => i.type === 'traffic_signals').length} traffic lights in the area\n`;

  return ctx;
}
