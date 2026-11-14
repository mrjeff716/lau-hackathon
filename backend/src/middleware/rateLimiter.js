// =============================================================================
// rateLimiter.js — stops one device from flooding the API with requests.
//
// Simple in-memory version (no external service or credentials needed):
// each IP address may make MAX_REQUESTS requests per WINDOW_MS. Extra
// requests get HTTP 429 "Too many requests".
//
// Note: the counts live in this server's memory, so they reset when the server
// restarts. That is fine for a hackathon/demo. To switch to Upstash later, set
// UPSTASH_REDIS_REST_URL=[...] and UPSTASH_REDIS_REST_TOKEN=[...] in .env and
// replace this with @upstash/ratelimit.
// =============================================================================

const WINDOW_MS = 60 * 1000  // 1 minute
const MAX_REQUESTS = 100     // allowed requests per IP per minute

// ip -> { start: when this window began, count: requests so far }
const hits = new Map()

export default function rateLimiter(req, res, next) {
  const key = req.ip
  const now = Date.now()
  const entry = hits.get(key)

  // First request from this IP, or its last window has expired: start fresh
  if (!entry || now - entry.start > WINDOW_MS) {
    hits.set(key, { start: now, count: 1 })
    return next() // let the request continue to the route
  }

  // Same window: count it, and block if over the limit
  entry.count += 1
  if (entry.count > MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests, please try again later.' })
  }
  next()
}

// Every minute, delete expired entries so memory doesn't grow forever.
// .unref() means this timer won't keep the process alive on its own.
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of hits) {
    if (now - entry.start > WINDOW_MS) hits.delete(key)
  }
}, WINDOW_MS).unref()
