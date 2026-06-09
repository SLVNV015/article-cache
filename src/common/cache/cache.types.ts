/**
 * Cache options
 */
export interface CacheOptions {
  /**
   * Cache time to live (секундыо)
   */
  ttl: number;
  /**
   * Stale time to live (секунды)
   */
  staleTtl?: number;

  /**
   * Lock time to live (секунды) - время мутекса
   */
  lockTtl?: number;
}

export interface CacheResult<T> {
  data: T;
  /**
   * Свежее или нет
   */
  isStale: boolean;
}
