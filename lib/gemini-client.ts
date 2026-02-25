/**
 * Shared Gemini API client
 *
 * Features:
 *  - Exponential backoff retry on 429 (up to 3 retries: 1 s → 2 s → 4 s)
 *  - Respects Retry-After header when present
 *  - In-memory response cache (90 s TTL, 200-entry max) — skips identical prompts
 *  - Per-key cooldown guard to prevent the same feature from hammering the API
 */

const MODEL = 'gemini-flash-lite-latest';
// model safeguard: this library is only allowed to call the flash‑lite variant.
if (MODEL !== 'gemini-flash-lite-latest') {
  throw new Error(`gemini-client: MODEL constant changed to ${MODEL}; only gemini-flash-lite-latest is permitted`);
}
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1_000; // doubles each retry: 1 s, 2 s, 4 s

// ── Response cache ────────────────────────────────────────────────────────────

type CacheEntry = { text: string; expiresAt: number };
const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 90_000; // 90 seconds
const CACHE_MAX_SIZE = 200;

/** Lightweight deterministic key: first 80 + last 80 chars + length + maxTokens */
function buildCacheKey(prompt: string, maxTokens: number): string {
  return (
    prompt.slice(0, 80) +
    '||' +
    prompt.slice(-80) +
    '||' +
    prompt.length +
    '||' +
    maxTokens
  );
}

function getFromCache(key: string): string | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return entry.text;
}

function putInCache(key: string, text: string): void {
  if (responseCache.size >= CACHE_MAX_SIZE) {
    // Evict the oldest entry (insertion-order)
    const firstKey = responseCache.keys().next().value;
    if (firstKey !== undefined) responseCache.delete(firstKey);
  }
  responseCache.set(key, { text, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── Per-key cooldown ──────────────────────────────────────────────────────────

const cooldownMap = new Map<string, number>();

// Periodic cleanup so the map doesn't grow unbounded
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cutoff = Date.now() - 120_000;
    for (const [k, t] of cooldownMap) {
      if (t < cutoff) cooldownMap.delete(k);
    }
  }, 5 * 60_000);
}

/**
 * Enforces a per-`cooldownKey` minimum gap between Gemini calls.
 *
 * @returns `true` if the call is allowed and the timestamp was updated.
 *          `false` if the cooldown has not yet expired — caller should return a
 *          cached / fallback response instead of calling the API.
 */
export function checkCooldown(cooldownKey: string, minGapMs: number): boolean {
  const last = cooldownMap.get(cooldownKey);
  if (last !== undefined && Date.now() - last < minGapMs) return false;
  cooldownMap.set(cooldownKey, Date.now());
  return true;
}

// ── Core Gemini call ──────────────────────────────────────────────────────────

/**
 * Call Gemini with automatic exponential-backoff retry on 429 and an
 * optional in-process response cache.
 *
 * @param prompt       Full prompt text
 * @param maxTokens    Max output tokens (default 400)
 * @param temperature  Sampling temperature (default 0.5)
 * @param useCache     Whether to check / populate the in-memory cache (default true)
 * @param apiKey       User-supplied Gemini API key — overrides the env var
 * @param maxRetries   How many 429 retries to attempt (default 3). Pass 0 to fail fast.
 */
export async function callGemini(
  prompt: string,
  maxTokens = 400,
  temperature = 0.5,
  useCache = true,
  apiKey?: string,
  maxRetries = MAX_RETRIES,
): Promise<string> {
  const resolvedKey = apiKey?.trim() || process.env.GEMINI_API_KEY;
  if (!resolvedKey) throw new Error('GEMINI_API_KEY is not set and no user key provided');

  const cacheKey = buildCacheKey(prompt, maxTokens);

  if (useCache) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log('[gemini] cache hit — skipping API call');
      return cached;
    }
  }

  // log model for visibility in server/browser logs (can be useful when auditing)
  console.log(`[gemini] using model ${MODEL}`);
  const url = `${BASE_URL}/${MODEL}:generateContent?key=${resolvedKey}`;
  const bodyStr = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: maxTokens, temperature },
  });

  let lastError: Error = new Error('Gemini request failed');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Exponential back-off: 1 s, 2 s, 4 s
      const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`[gemini] retry ${attempt}/${maxRetries} — waiting ${delay} ms`);
      await new Promise((r) => setTimeout(r, delay));
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr,
    });

    if (res.status === 429) {
      // log headers/body to help diagnose why the key is being throttled
      const retryAfter = res.headers.get('Retry-After');
      console.warn(`[gemini] received 429 from API (attempt ${attempt}/${maxRetries})`, {
        url,
        retryAfter,
      });
      // Honour Retry-After if provided (cap at 15 s to avoid hanging too long)
      if (retryAfter && attempt === 0 && maxRetries > 0) {
        const waitMs = Math.min(parseInt(retryAfter, 10) * 1000, 15_000);
        console.log(`[gemini] Retry-After: ${retryAfter} s — waiting ${waitMs} ms`);
        await new Promise((r) => setTimeout(r, waitMs));
      }
      lastError = new Error('Gemini 429: rate limit exceeded');
      continue; // retry
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '(no body)');
      throw new Error(`Gemini ${res.status}: ${body}`);
    }

    const data = await res.json();
    const text: string =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

    if (useCache && text) putInCache(cacheKey, text);
    return text;
  }

  throw lastError;
}
