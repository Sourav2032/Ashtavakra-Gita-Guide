import { GoogleGenAI, Type } from "@google/genai";
import { ShlokaChunk } from "../types";

/**
 * Intelligent PDF Parser helper using Gemini.
 * Since typical Sanskrit/Hindi PDFs are compiled using phonetic ASCII/Kruti-Dev fonts,
 * standard text extractors extract phonetic gibberish (e.g., 'dFka KkueokIuksfr').
 * We use Gemini 3.5-flash to convert and reconstruct the text into accurate Unicode Devanagari.
 */
export async function convertRawPdfTextToShlokaChunks(
  ai: GoogleGenAI,
  rawText: string,
  onProgress?: (msg: string) => void
): Promise<ShlokaChunk[]> {
  const chunks: ShlokaChunk[] = [];
  
  if (!rawText || rawText.trim().length === 0) {
    return chunks;
  }

  // Split the raw text of the document into pages or sections of approx 12000 characters
  // This is because we want to pass manageable blocks to Gemini and respect token limits.
  const sections: string[] = [];
  const charsPerSection = 12000;
  for (let i = 0; i < rawText.length; i += charsPerSection) {
    sections.push(rawText.substring(i, i + charsPerSection));
  }

  // Process the entire document logical sections
  const maxSections = sections.length;
  if (onProgress) {
    onProgress(`Extracted text length is ${rawText.length} characters. Processing all ${maxSections} logical chapters/sections...`);
  }

  for (let idx = 0; idx < maxSections; idx++) {
    const rawBlock = sections[idx];
    if (onProgress) {
      onProgress(`Restoring Sanskrit & Hindi Unicode from section ${idx + 1}/${maxSections}...`);
    }

    // Add a small spacing delay between section requests to respect Gemini API thresholds
    if (idx > 0) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    try {
      let response: any = null;
      let attempt = 1;
      const maxAttempts = 5;

      while (attempt <= maxAttempts) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: [
              `You are an expert Sanskrit Scholar and Hindi translator specializing in the Ashtavakra Gita.
Your task is to analyze the following raw text extracted from a PDF of the Ashtavakra Gita.
This text is highly likely represented in an ASCII phonetic layout (like Kruti Dev or phonetic English characters, e.g. "igyk izdj.k", "dFka KkueokIuksfr").
Convert it into beautiful, standardized Unicode Devanagari Sanskrit and Hindi.

Carefully chunk the verses so that one Sanskrit shloka and its corresponding Hindi translation and Hindi Chhand (if present) are grouped together in a single JSON object.

Format of each parsed chunk:
1. chapter: The Chapter number (pramaran/प्रकरण). Default to 1 if not clear.
2. shlokaNumber: The shloka index.
3. sanskrit: The Sanskrit verse in proper Unicode Devanagari.
4. hindiTranslation: The Hindi translation in clean Unicode Devanagari.
5. hindiChhand: (Optional) The Hindi poetry chhand or song verse associated with the shloka.

Exclude any header/footer garbage, page numbers, or publication warnings, and focus pure spiritual content.

Extracted raw text block:
"""
${rawBlock}
"""`,
            ],
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                description: "Array of parsed and corrected Sanskrit/Hindi shloka chunks.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    chapter: { type: Type.INTEGER, description: "Chapter number" },
                    shlokaNumber: { type: Type.INTEGER, description: "Shloka number" },
                    sanskrit: { type: Type.STRING, description: "The Sanskrit shloka verse in proper Unicode Devanagari" },
                    hindiTranslation: { type: Type.STRING, description: "The Hindi translation in clean Unicode Devanagari" },
                    hindiChhand: { type: Type.STRING, description: "The poetic Hindi verse (Chhand) or Chhanda" },
                  },
                  required: ["chapter", "shlokaNumber", "sanskrit", "hindiTranslation"],
                },
              },
            },
          });
          break; // success
        } catch (genErr: any) {
          console.warn(`[PDF Parser Warning] Section ${idx + 1} attempt ${attempt}/${maxAttempts} failed:`, genErr.message || genErr);
          if (attempt === maxAttempts) {
            throw genErr;
          }
          const backoffTime = 2000 * Math.pow(2, attempt - 1) + Math.random() * 1000;
          if (onProgress) {
            onProgress(`Rate limit / error hit during page parsing. Backing off for ${Math.round(backoffTime)}ms (attempt ${attempt}/${maxAttempts})...`);
          }
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          attempt++;
        }
      }

      const responseText = response.text?.trim() || "[]";
      const parsed: any[] = JSON.parse(responseText);
      
      const mapped: ShlokaChunk[] = parsed
        .filter(item => item.sanskrit && item.hindiTranslation)
        .map((item, subIdx) => ({
          id: `uploaded-s-${idx}-${subIdx}-${item.chapter ?? 1}-${item.shlokaNumber ?? 1}`,
          chapter: Number(item.chapter) || 1,
          shlokaNumber: Number(item.shlokaNumber) || (subIdx + 1),
          sanskrit: String(item.sanskrit).trim(),
          hindiTranslation: String(item.hindiTranslation).trim(),
          hindiChhand: item.hindiChhand ? String(item.hindiChhand).trim() : undefined,
          source: "uploaded",
        }));

      chunks.push(...mapped);
    } catch (err: any) {
      console.error(`Error parsing section ${idx + 1}:`, err);
    }
  }

  // Deduplicate chunks by chapter and shloka number
  const uniqueChunks: ShlokaChunk[] = [];
  const seenKeys = new Set<string>();
  for (const c of chunks) {
    const key = `${c.chapter}-${c.shlokaNumber}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueChunks.push(c);
    }
  }

  return uniqueChunks;
}
