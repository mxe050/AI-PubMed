import type { AppSettings } from "../types";
import { NcbiRateLimiter } from "./ncbiRateLimiter";

export function createNcbiRateLimiter(settings: AppSettings): NcbiRateLimiter {
  const interval = settings.ncbiApiKey
    ? settings.requestIntervalWithKeyMs
    : settings.requestIntervalWithoutKeyMs;

  return new NcbiRateLimiter(interval);
}
