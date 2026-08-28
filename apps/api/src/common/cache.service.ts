import { Injectable } from '@nestjs/common';

interface CacheEntry {
  value: any;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private readonly store = new Map<string, CacheEntry>();

  /**
   * Retrieve cached value if it is not expired
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Cache a value with a Time-To-Live (TTL)
   */
  set(key: string, value: any, ttlSeconds: number = 300): void {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Delete specific cache key
   */
  del(key: string): void {
    this.store.delete(key);
  }

  /**
   * Flush all cached keys
   */
  clear(): void {
    this.store.clear();
  }
}
