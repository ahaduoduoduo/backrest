import { authenticatedFetch } from "./client";
import { backendUrl } from "../state/buildcfg";

export interface OpenListRepositoryUsage {
  name: string;
  day_bytes: number;
  day_limit: number;
  month_bytes: number;
  month_limit: number;
  rate_bytes_per_second: number;
  stored_bytes: number;
  stored_objects: number;
  storage_initialized: boolean;
  storage_updated_at?: string;
}

export interface OpenListUsage {
  day: string;
  month: string;
  day_bytes: number;
  day_limit: number;
  month_bytes: number;
  month_limit: number;
  rate_bytes_per_second: number;
  stored_bytes: number;
  stored_objects: number;
  storage_initialized: boolean;
  repositories: OpenListRepositoryUsage[];
}

interface OpenListUsageResponse {
  configured: boolean;
  usage?: OpenListUsage;
}

export async function getOpenListUsage(): Promise<OpenListUsage | null> {
  const base = backendUrl.endsWith("/") ? backendUrl : `${backendUrl}/`;
  const response = await authenticatedFetch(`${base}api/openlist/restic/usage`);
  if (!response.ok) return null;
  const payload = (await response.json()) as OpenListUsageResponse;
  return payload.configured ? (payload.usage ?? null) : null;
}

export const openListRepositoryName = (uri: string): string | null => {
  const match = uri.match(/\/(?:api\/)?restic\/([^/?#]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
};

export function getOpenListStoredBytes(
  usage: OpenListUsage | null,
  repositoryNames: string[],
): number | null {
  if (!usage) return null;
  const uniqueNames = Array.from(new Set(repositoryNames));
  if (uniqueNames.length === 0) return null;

  let storedBytes = 0;
  for (const name of uniqueNames) {
    const repository = usage.repositories.find(
      (candidate) => candidate.name === name,
    );
    if (!repository?.storage_initialized) return null;
    storedBytes += repository.stored_bytes;
  }
  return storedBytes;
}
