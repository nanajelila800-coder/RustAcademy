import { BadRequestException } from '@nestjs/common';

export const SUPPORTED_HEALTH_PROBES = ['liveness', 'readiness', 'startup'] as const;
export const SUPPORTED_PROBES = SUPPORTED_HEALTH_PROBES;
export type HealthProbe = (typeof SUPPORTED_HEALTH_PROBES)[number];
export const DEFAULT_HEALTH_PROBE: HealthProbe = 'liveness';
export const DEFAULT_PROBE = DEFAULT_HEALTH_PROBE;

const PROBE_ALIASES: Record<HealthProbe, string[]> = {
  liveness: ['liveness', 'live', 'alive'],
  readiness: ['readiness', 'ready'],
  startup: ['startup', 'start'],
};

export function isSupportedHealthProbe(value?: string | string[] | null): value is HealthProbe {
  const normalized = normalizeProbeValue(value);
  return SUPPORTED_HEALTH_PROBES.includes(normalized as HealthProbe);
}

export function normalizeProbeValue(value?: string | string[] | null): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  return String(candidate ?? '').trim().toLowerCase();
}

export function resolveHealthProbe(value?: string | string[] | null): HealthProbe {
  const normalized = normalizeProbeValue(value);
  if (!normalized) {
    return DEFAULT_HEALTH_PROBE;
  }

  for (const [probe, aliases] of Object.entries(PROBE_ALIASES) as [HealthProbe, string[]][]) {
    if (aliases.includes(normalized)) {
      return probe;
    }
  }

  throw new BadRequestException(
    `Unsupported probe option: "${value ?? ''}". Supported values: ${SUPPORTED_HEALTH_PROBES.join(', ')}`,
  );
}

export function parseHealthProbe(value?: string | string[] | null): HealthProbe {
  return resolveHealthProbe(value);
}

export const validateHealthProbe = resolveHealthProbe;
export const parseProbe = parseHealthProbe;
export const normalizeHealthProbe = resolveHealthProbe;
export const isValidProbeOption = isSupportedHealthProbe;

export default {
  SUPPORTED_HEALTH_PROBES,
  SUPPORTED_PROBES,
  DEFAULT_HEALTH_PROBE,
  DEFAULT_PROBE,
  isSupportedHealthProbe,
  isValidProbeOption,
  normalizeProbeValue,
  normalizeHealthProbe,
  resolveHealthProbe,
  parseHealthProbe,
  validateHealthProbe,
  parseProbe,
};
