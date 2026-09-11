import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Gemini API key not configured. Add GOOGLE_GEMINI_API_KEY to your environment.' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { imageBase64, mimeType = 'image/jpeg' } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'Missing imageBase64 in request body' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `You are an expert campaign field operations AI assistant specializing in political yard signs and field logistics in Bristol, Tennessee.

OUR CAMPAIGN:
- Candidate: Melissa K. Brown
- Target Race: Bristol TN City Council
- Location: Bristol, Tennessee (Sullivan County)

Analyze this photo taken in the field by a campaign worker. Read all visible text, slogans, and logos.
Determine:
1. is_sign: boolean (true if image contains a political campaign sign, yard sign, banner, or billboard)
2. candidate_name: string (Primary candidate name displayed on the sign)
3. office: string (Office sought, e.g. "City Council", "Mayor", "School Board", or "Unknown")
4. is_competitor: boolean (true if sign is for an OPPONENT or competitor, false if it is for Melissa K. Brown)
5. competitor_name: string | null (The competitor's name if is_competitor is true, otherwise null)
6. sign_type: "yard_sign" | "large_sign" | "banner" | "billboard"
   - "yard_sign": standard 24"x18" corrugated plastic lawn sign on wire H-frame
   - "large_sign": 4'x4' or 4'x8' wooden post roadside sign
   - "banner": flexible vinyl banner attached to fence or wall
   - "billboard": large commercial billboard
7. confidence: number (0.0 to 1.0 confidence score)
8. detected_text: string (The complete text transcribed from the sign)
9. condition: "good" | "damaged" | "down" | "obscured"
10. summary: string (Concise 1-sentence summary, e.g. "Competitor 4x4 sign for Jane Smith in front lawn")

Respond ONLY with a valid JSON object matching this schema. Do not include markdown code block syntax (like \`\`\`json).`;

    // Cascade through available Gemini Vision models
    const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
    let lastError: any = null;
    let resultText = '';

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: imageBase64,
              mimeType,
            },
          },
        ]);
        resultText = result.response.text();
        if (resultText) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`[ScanSign] Model ${modelName} attempt failed: ${err?.message || err}. Trying next...`);
      }
    }

    if (!resultText) {
      throw lastError || new Error('No response from Gemini Vision models');
    }

    // Parse JSON from model output
    let parsedData;
    try {
      const cleanJson = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedData = JSON.parse(cleanJson);
    } catch (parseErr) {
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json(
          { error: 'Failed to parse AI vision output', raw: resultText },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      scan: parsedData,
    });
  } catch (error: any) {
    console.error('Scan Sign API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to analyze sign image' },
      { status: 500 }
    );
  }
}
