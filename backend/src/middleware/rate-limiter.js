/**
 * Lightweight, zero-dependency, in-memory sliding window rate limiter.
 * Protects auth and CPU-intensive endpoints from brute-force and DoS attacks.
 */
export function createRateLimiter({
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = "Too many requests, please try again later.",
  keyGenerator = (req) => req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "global"
} = {}) {
  const records = new Map();

  // Periodically clean up expired entries to prevent memory leaks
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of records.entries()) {
      if (now > record.resetTime) {
        records.delete(key);
      }
    }
  }, Math.max(10_000, windowMs));

  if (interval.unref) {
    interval.unref();
  }

  return function rateLimiterMiddleware(req, res, next) {
    // Generous bypass in test environment to avoid slowing down or blocking integration suites
    if (process.env.NODE_ENV === "test" && !req.headers["x-test-rate-limit"]) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();
    let record = records.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      records.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader("RateLimit-Limit", max);
    res.setHeader("RateLimit-Remaining", remaining);
    res.setHeader("RateLimit-Reset", resetSeconds);

    if (record.count > max) {
      res.setHeader("Retry-After", resetSeconds);
      return res.status(429).json({
        error: "TOO_MANY_REQUESTS",
        message
      });
    }

    next();
  };
}

