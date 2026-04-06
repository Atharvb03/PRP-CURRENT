/**
 * services/cacheService.js
 * Simple in-memory TTL cache using a Map.
 *
 * Usage:
 *   const cache = require('./services/cacheService');
 *   cache.set('mentees', data, 60);   // cache for 60 seconds
 *   cache.get('mentees');             // returns data or null if expired
 *   cache.invalidate('mentees');      // clear a specific key
 *   cache.invalidatePattern('mentee');// clear all keys containing 'mentee'
 *
 * Redis alternative (for scaling):
 *   Replace this file with ioredis calls.
 *   npm install ioredis
 *   const Redis = require('ioredis');
 *   const redis = new Redis(process.env.REDIS_URL);
 *   exports.set = (key, val, ttl) => redis.setex(key, ttl, JSON.stringify(val));
 *   exports.get = async (key) => { const v = await redis.get(key); return v ? JSON.parse(v) : null; };
 *   exports.invalidate = (key) => redis.del(key);
 */

const store = new Map(); // { key → { data, expiresAt } }

/**
 * Store a value with a TTL in seconds.
 */
function set(key, data, ttlSeconds = 60) {
  store.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
}

/**
 * Retrieve a cached value. Returns null if missing or expired.
 */
function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Remove a specific cache key.
 */
function invalidate(key) {
  store.delete(key);
}

/**
 * Remove all keys that contain the given substring.
 * Useful for invalidating all paginated variants of a resource.
 * e.g. invalidatePattern('mentees') clears 'mentees:1:50', 'mentees:2:50', etc.
 */
function invalidatePattern(pattern) {
  for (const key of store.keys()) {
    if (key.includes(pattern)) store.delete(key);
  }
}

/**
 * Clear the entire cache (useful for testing or admin reset).
 */
function flush() {
  store.clear();
}

/**
 * Returns current cache size (for monitoring/debugging).
 */
function size() {
  return store.size;
}

module.exports = { set, get, invalidate, invalidatePattern, flush, size };
