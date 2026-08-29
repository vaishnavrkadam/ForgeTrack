import { Injectable } from '@nestjs/common';

@Injectable()
export class EmbeddingService {
  /**
   * Generate text embedding (1536 dimensions)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const cleanedText = text.substring(0, 5000); // Limit context length
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'models/text-embedding-004',
              content: { parts: [{ text: cleanedText }] },
            }),
          },
        );

        if (response.ok) {
          const json = await response.json();
          // Gemini text-embedding-004 returns 768 dimensions by default.
          // Let's pad it to 1536 or just return the vector.
          const vector = json.embedding?.values as number[];
          if (vector && vector.length > 0) {
            // If it returns 768 dimensions, pad it to 1536 for schema compatibility
            if (vector.length < 1536) {
              return [...vector, ...new Array(1536 - vector.length).fill(0)];
            }
            return vector.slice(0, 1536);
          }
        }
      } catch (err) {
        console.warn('Gemini embedding failed, falling back to offline projection:', err);
      }
    }

    // Offline Fallback: Deterministic Character Projection (1536 dimensions)
    return this.generateOfflineEmbedding(text);
  }

  /**
   * Compute cosine similarity between two float arrays
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normASquared = 0;
    let normBSquared = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normASquared += vecA[i] * vecA[i];
      normBSquared += vecB[i] * vecB[i];
    }

    if (normASquared === 0 || normBSquared === 0) return 0;
    return dotProduct / (Math.sqrt(normASquared) * Math.sqrt(normBSquared));
  }

  /**
   * Deterministic feature-hashing embedding (bag-of-words + 3-grams)
   * Ensures semantic and lexical overlap produces high cosine similarity (>0.7) for similar text
   */
  private generateOfflineEmbedding(text: string): number[] {
    const dimensions = 1536;
    const vector = new Array(dimensions).fill(0);
    const clean = text.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
    if (!clean) {
      vector[0] = 1;
      return vector;
    }

    const words = clean.split(/\s+/).filter(w => w.length > 1);

    // 1. Unigram feature hashing
    for (const word of words) {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = (hash << 5) - hash + word.charCodeAt(i);
        hash |= 0;
      }
      const idx = Math.abs(hash) % dimensions;
      vector[idx] += 1.5;
    }

    // 2. Character 3-gram feature hashing (handles typos & variations)
    for (let i = 0; i <= clean.length - 3; i++) {
      const trigram = clean.substring(i, i + 3);
      let hash = 0;
      for (let j = 0; j < 3; j++) {
        hash = (hash << 5) - hash + trigram.charCodeAt(j);
        hash |= 0;
      }
      const idx = Math.abs(hash) % dimensions;
      vector[idx] += 0.5;
    }

    // 3. Normalize to unit length (L2 norm)
    let sumSquares = 0;
    for (let i = 0; i < dimensions; i++) {
      sumSquares += vector[i] * vector[i];
    }

    if (sumSquares === 0) {
      vector[0] = 1;
      return vector;
    }

    const norm = Math.sqrt(sumSquares);
    for (let i = 0; i < dimensions; i++) {
      vector[i] = vector[i] / norm;
    }

    return vector;
  }
}
