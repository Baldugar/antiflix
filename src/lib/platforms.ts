export type PlatformId = 'netflix' | 'prime' | 'disney' | 'hbomax';

export interface Platform {
  id: PlatformId;
  label: string;
  short: string;
  providerId: number;
}

export const PLATFORMS: Platform[] = [
  { id: 'netflix', label: 'Netflix', short: 'Netflix', providerId: 8 },
  { id: 'prime', label: 'Prime Video', short: 'Prime Video', providerId: 119 },
  { id: 'disney', label: 'Disney+', short: 'Disney+', providerId: 337 },
  { id: 'hbomax', label: 'HBO', short: 'HBO', providerId: 1899 },
];

export const DEFAULT_PLATFORM: PlatformId = 'netflix';

export function getPlatform(id: PlatformId): Platform {
  return PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[0];
}
