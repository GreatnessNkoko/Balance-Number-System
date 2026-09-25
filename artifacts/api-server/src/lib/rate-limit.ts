import type { Request, Response } from "express";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function enforceRateLimit(
  req: Request,
  res: Response,
  scope: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const key = `${scope}:${req.ip ?? "unknown"}`;
  const current = buckets.get(key);
  const bucket =
    current && current.resetAt > now
      ? current
      : { count: 0, resetAt: now + windowMs };

  bucket.count += 1;
  buckets.set(key, bucket);

  if (bucket.count <= limit) return true;

  res.status(429).json({
    message: "Too many requests. Please try again shortly.",
    code: "rate_limited",
  });
  return false;
}