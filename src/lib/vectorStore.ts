import { ShlokaChunk, VectorNode, MatchResult } from '../types';

/**
 * Calculates the cosine similarity between two dimensional vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculates a basic keyword matching score between query and shloka content.
 */
export function searchKeywordScore(query: string, chunk: ShlokaChunk): number {
  if (!query) return 0;
  const normalizedQuery = query.toLowerCase().trim();
  const words = normalizedQuery.split(/\s+/).filter(w => w.length > 1);
  if (words.length === 0) return 0;

  const sanskrit = (chunk.sanskrit || "").toLowerCase();
  const hindi = (chunk.hindiTranslation || "").toLowerCase();
  const chhand = (chunk.hindiChhand || "").toLowerCase();
  const english = (chunk.englishTranslation || "").toLowerCase();
  const combinedText = `${sanskrit} ${hindi} ${chhand} ${english}`;

  let matchCount = 0;
  for (const word of words) {
    if (combinedText.includes(word)) {
      matchCount++;
    }
  }

  let phraseBooster = 0;
  if (combinedText.includes(normalizedQuery)) {
    phraseBooster = 0.5; // High boost for exact phrase match
  }

  return (matchCount / words.length) * 0.5 + phraseBooster;
}

/**
 * Generates a local, deterministic, 768-dimensional term frequency vector
 * using the Hashing Trick. Perfect for offline fallback with cosine similarity.
 */
export function generateLocalVector(text: string): number[] {
  const vector = new Array(768).fill(0);
  const normalizedText = text.toLowerCase()
    .replace(/[^\w\s\u0900-\u097f]/g, " ") // Keep Sanskrit/Hindi unicode chars & English letters
    .trim();
  
  const words = normalizedText.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) {
    vector[0] = 1;
    return vector;
  }

  // Hash function (DJB2)
  const djb2Hash = (str: string): number => {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return Math.abs(hash);
  };

  // Add words to vector
  for (const word of words) {
    const h = djb2Hash(word) % 768;
    vector[h] += 1.0;
    
    // Character bigrams for fuzzy match
    if (word.length > 2) {
      for (let i = 0; i < word.length - 1; i++) {
        const bg = word.substring(i, i + 2);
        const hBg = djb2Hash(bg) % 768;
        vector[hBg] += 0.3;
      }
    }
  }

  // Add word bigrams for context
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i+1]}`;
    const h = djb2Hash(bigram) % 768;
    vector[h] += 0.5;
  }

  // L2 Normalize the vector
  let magnitude = 0;
  for (let i = 0; i < 768; i++) {
    magnitude += vector[i] * vector[i];
  }
  magnitude = Math.sqrt(magnitude);

  if (magnitude > 0) {
    for (let i = 0; i < 768; i++) {
      vector[i] /= magnitude;
    }
  } else {
    vector[0] = 1;
  }

  return vector;
}

/**
 * In-memory Vector Store for Ashtavakra Gita Chunks.
 */
export class InMemoryVectorStore {
  private nodes: VectorNode[] = [];
  private localVectorCache = new Map<string, number[]>();

  constructor() {}

  /**
   * Adds a single chunk and its embedding to the store.
   * If the chunk ID already exists, it is replaced to avoid duplicates.
   */
  public addNode(chunk: ShlokaChunk, embedding: number[]) {
    this.nodes = this.nodes.filter(n => n.chunk.id !== chunk.id);
    this.nodes.push({ chunk, embedding });

    // Warm up the local fallback vector cache
    const textToEmbed = `प्रकरण/अध्याय: ${chunk.chapter}\nश्लोक संख्या: ${chunk.shlokaNumber}\nमूल संस्कृत श्लोक:\n${chunk.sanskrit}\nहिन्दी अनुवाद:\n${chunk.hindiTranslation}\nहिन्दी छंद:\n${chunk.hindiChhand || ""}\nEnglish Translation:\n${chunk.englishTranslation || ""}`;
    this.localVectorCache.set(chunk.id, generateLocalVector(textToEmbed));
  }

  /**
   * Clears all stored nodes.
   */
  public clear() {
    this.nodes = [];
    this.localVectorCache.clear();
  }

  /**
   * Searches the store for the top K matching chunks against the query queryEmbedding and optional raw text.
   */
  public search(queryEmbedding: number[], limit: number = 3, queryText?: string): MatchResult[] {
    if (this.nodes.length === 0) return [];

    // Determine if the query embedding is actually a local hash vector (offline fallback) or a zero vector
    const numZeros = queryEmbedding.filter(v => v === 0).length;
    const isLocalHash = numZeros > 100;
    const isZeroFilled = numZeros === queryEmbedding.length;
    
    const results: MatchResult[] = this.nodes.map(node => {
      let semanticScore = 0;

      if (isZeroFilled) {
        semanticScore = 0;
      } else if (isLocalHash) {
        // Compare the query local vector with the node's cached local vector 
        let nodeLocalVec = this.localVectorCache.get(node.chunk.id);
        if (!nodeLocalVec) {
          const textToEmbed = `प्रकरण/अध्याय: ${node.chunk.chapter}\nश्लोक संख्या: ${node.chunk.shlokaNumber}\nमूल संस्कृत श्लोक:\n${node.chunk.sanskrit}\nहिन्दी अनुवाद:\n${node.chunk.hindiTranslation}\nहिन्दी छंद:\n${node.chunk.hindiChhand || ""}\nEnglish Translation:\n${node.chunk.englishTranslation || ""}`;
          nodeLocalVec = generateLocalVector(textToEmbed);
          this.localVectorCache.set(node.chunk.id, nodeLocalVec);
        }
        semanticScore = cosineSimilarity(queryEmbedding, nodeLocalVec);
      } else {
        // Compare real dense Gemini embedding
        try {
          semanticScore = cosineSimilarity(queryEmbedding, node.embedding);
        } catch (err) {
          semanticScore = 0;
        }
      }

      if (isNaN(semanticScore)) semanticScore = 0;

      // 2. Keyword/text overlap fallback
      let textScore = 0;
      if (queryText) {
        textScore = searchKeywordScore(queryText, node.chunk);
      }

      // Hybrid combination score:
      const totalScore = semanticScore * 0.7 + textScore * 0.3;

      return {
        chunk: node.chunk,
        score: totalScore
      };
    });

    // Sort by descending similarity score
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  /**
   * Gets the list of currently indexed chunks.
   */
  public getAllChunks(): ShlokaChunk[] {
    return this.nodes.map(n => n.chunk);
  }

  /**
   * Checks if a chunk is already indexed by ID.
   */
  public hasChunk(id: string): boolean {
    return this.nodes.some(n => n.chunk.id === id);
  }
}
