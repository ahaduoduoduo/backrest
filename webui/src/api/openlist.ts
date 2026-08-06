import { authenticatedFetch } from "./client";
import { backendUrl } from "../state/buildcfg";

export interface OpenListRepositoryUsage {
  name: string;
  day_bytes: number;
  day_limit: number;
  month_bytes: number;
  month_limit: number;
  rate_bytes_per_second: number;
}

export interface OpenListUsage {
  day: string;
  month: string;
  day_bytes: number;
  day_limit: number;
  month_bytes: number;
  month_limit: number;
  rate_bytes_per_second: number;
  repositories: OpenListRepositoryUsage[];
}

interface OpenListUsageResponse {
  configured: boolean;
  usage?: OpenListUsage;
}

export async function getOpenListUsage(): Promise<OpenListUsage | null> {
  const base = backendUrl.endsWith("/") ? backendUrl : `${backendUrl}/`;
  const response = await authenticatedFetch(
    `${base}api/openlist/restic/usage`,
  );
  if (!response.ok) return null;
  const payload = (await response.json()) as OpenListUsageResponse;
  return payload.configured ? (payload.usage ?? null) : null;
}
