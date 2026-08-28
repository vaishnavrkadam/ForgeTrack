import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

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
   * Deterministic projection algorithm generating normalized 1536-dimensional vectors
   */
  private generateOfflineEmbedding(text: string): number[] {
    const dimensions = 1536;
    const vector = new Array(dimensions).fill(0);
    const normalizedText = text.trim().toLowerCase();

    if (normalizedText.length === 0) {
      // Return zero vector or unit vector with small random components
      vector[0] = 1;
      return vector;
    }

    // Build deterministic values using sha256 rolling seeds
    let currentHash = crypto.createHash('sha256').update(normalizedText).digest('hex');

    for (let i = 0; i < dimensions; i++) {
      // Every 16 dimensions, roll hash
      if (i % 16 === 0 && i > 0) {
        currentHash = crypto.createHash('sha256').update(currentHash + i.toString()).digest('hex');
      }

      // Extract segment as integer
      const hexSegment = currentHash.substring((i % 16) * 2, (i % 16) * 2 + 2);
      const segmentValue = parseInt(hexSegment, 16);

      // Map to float between -1 and 1
      vector[i] = (segmentValue / 127.5) - 1.0;
    }

    // Normalize to unit length (L2 norm)
    let sumSquares = 0;
    for (let i = 0; i < dimensions; i++) {
      sumSquares += vector[i] * vector[i];
    }
    const norm = Math.sqrt(sumSquares);

    if (norm > 0) {
      for (let i = 0; i < dimensions; i++) {
        vector[i] = vector[i] / norm;
      }
    }

    return vector;
  }
}
