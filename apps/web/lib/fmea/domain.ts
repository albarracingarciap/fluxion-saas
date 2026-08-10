export type FmeaZone = 'zona_i' | 'zona_ii' | 'zona_iii' | 'zona_iv';

export type FmeaEditableItem = {
  id: string;
  dimension_id: string;
  s_default_frozen: number;
  o_value: number | null;
  d_real_value: number | null;
  s_actual: number | null;
  status: 'pending' | 'evaluated' | 'skipped';
};

export const FMEA_ZONE_ORDER: FmeaZone[] = ['zona_iv', 'zona_iii', 'zona_ii', 'zona_i'];

export function clampFmeaSeverity(value: number) {
  return Math.max(2, Math.min(9, Math.round(value)));
}

export function calculateSuggestedSActual(params: {
  oValue: number | null;
  dRealValue: number | null;
  sDefault: number;
}) {
  const { oValue, dRealValue, sDefault } = params;

  if (oValue === null || dRealValue === null) return null;

  if (oValue <= 2 && dRealValue <= 2) {
    return clampFmeaSeverity(sDefault - 3);
  }

  if (oValue <= 2 && dRealValue === 3) {
    return clampFmeaSeverity(sDefault - 2);
  }

  if (oValue <= 2 && dRealValue >= 4) {
    return clampFmeaSeverity(sDefault - 1);
  }

  if (oValue >= 4 && dRealValue >= 4) {
    return clampFmeaSeverity(sDefault);
  }

  if (oValue >= 4) {
    return clampFmeaSeverity(sDefault);
  }

  if (dRealValue >= 4) {
    return clampFmeaSeverity(sDefault - 1);
  }

  return clampFmeaSeverity(sDefault - 1);
}

export function requiresJustification(params: {
  sDefault: number;
  sActual: number | null;
  status: 'pending' | 'evaluated' | 'skipped';
  justification?: string | null;
}) {
  const justification = params.justification?.trim() ?? '';

  if (params.status === 'evaluated' && justification.length > 0) return true;
  if (params.sActual === null) return false;
  if (Math.abs(params.sActual - params.sDefault) >= 2) return true;
  if (params.sActual === 9 && params.sDefault < 9) return true;
  if (params.sActual < 5 && params.sDefault >= 7) return true;
  return false;
}

export function requiresSecondReview(params: {
  sDefault: number;
  sActual: number | null;
  manualMode: boolean;
}) {
  if (params.sActual === null) return false;
  if (!params.manualMode) return false;
  return params.sDefault - params.sActual >= 3;
}

function maxZone(left: FmeaZone, right: FmeaZone): FmeaZone {
  return FMEA_ZONE_ORDER.indexOf(left) > FMEA_ZONE_ORDER.indexOf(right) ? left : right;
}

function calculateAggregateZone(items: Array<Pick<FmeaEditableItem, 'dimension_id' | 's_actual'>>) {
  const evaluated = items.filter((item) => typeof item.s_actual === 'number') as Array<
    Pick<FmeaEditableItem, 'dimension_id'> & { s_actual: number }
  >;

  const ge8 = evaluated.filter((item) => item.s_actual >= 8);
  const ge7 = evaluated.filter((item) => item.s_actual >= 7);
  const ge6 = evaluated.filter((item) => item.s_actual >= 6);

  const dimGe8 = new Set(ge8.map((item) => item.dimension_id)).size;
  const dimGe7 = new Set(ge7.map((item) => item.dimension_id)).size;
  const dimGe6 = new Set(ge6.map((item) => item.dimension_id)).size;

  if (ge8.length >= 3 && dimGe8 >= 2) return 'zona_i' as const;
  if (ge7.length >= 5 && dimGe7 >= 3) return 'zona_ii' as const;
  if (ge6.length >= 8 && dimGe6 >= 2) return 'zona_iii' as const;
  return 'zona_iv' as const;
}

export function getAiActZoneFloor(aiActLevel: string | null | undefined): FmeaZone {
  switch (aiActLevel) {
    case 'prohibited':
      return 'zona_i';
    case 'high':
      return 'zona_ii';
    case 'limited':
      return 'zona_iii';
    case 'minimal':
    case 'pending':
    case 'gpai':
    default:
      return 'zona_iv';
  }
}

export function calculateFmeaZone(items: FmeaEditableItem[], aiActLevel: string | null | undefined): FmeaZone {
  const evaluated = items.filter((item) => typeof item.s_actual === 'number') as Array<
    FmeaEditableItem & { s_actual: number }
  >;

  if (evaluated.length === 0) {
    return getAiActZoneFloor(aiActLevel);
  }

  const sMax = Math.max(...evaluated.map((item) => item.s_actual));
  let primaryZone: FmeaZone = 'zona_iv';

  if (sMax >= 9) primaryZone = 'zona_i';
  else if (sMax >= 8) primaryZone = 'zona_ii';
  else if (sMax >= 7) primaryZone = 'zona_iii';

  const aggregateZone = calculateAggregateZone(evaluated);
  return maxZone(maxZone(primaryZone, aggregateZone), getAiActZoneFloor(aiActLevel));
}

export function getZoneLabel(zone: FmeaZone) {
  return (
    {
      zona_i: 'Zona I',
      zona_ii: 'Zona II',
      zona_iii: 'Zona III',
      zona_iv: 'Zona IV',
    }[zone] ?? zone
  );
}

export function getZoneClasses(zone: FmeaZone) {
  switch (zone) {
    case 'zona_i':
      return {
        dot: 'bg-re',
        text: 'text-re',
        pill: 'bg-red-dim border-reb text-re',
      };
    case 'zona_ii':
      return {
        dot: 'bg-or',
        text: 'text-or',
        pill: 'bg-ordim border-orb text-or',
      };
    case 'zona_iii':
      return {
        dot: 'bg-brand-cyan',
        text: 'text-brand-cyan',
        pill: 'bg-cyan-dim border-cyan-border text-brand-cyan',
      };
    case 'zona_iv':
    default:
      return {
        dot: 'bg-gr',
        text: 'text-gr',
        pill: 'bg-grdim border-grb text-gr',
      };
  }
}

export function getSeverityClasses(value: number | null) {
  if (value === null) {
    return {
      pill: 'bg-ltcard2 border-ltb text-lttm',
      text: 'text-lttm',
    };
  }

  if (value >= 9) {
    return {
      pill: 'bg-red-dim border-reb text-re',
      text: 'text-re',
    };
  }

  if (value >= 8) {
    return {
      pill: 'bg-ordim border-orb text-or',
      text: 'text-or',
    };
  }

  if (value >= 7) {
    return {
      pill: 'bg-cyan-dim border-cyan-border text-brand-cyan',
      text: 'text-brand-cyan',
    };
  }

  return {
    pill: 'bg-grdim border-grb text-gr',
    text: 'text-gr',
  };
}

export function getFmeaProgress(items: FmeaEditableItem[]) {
  const total = items.length;
  const evaluated = items.filter((item) => item.status === 'evaluated').length;
  const skipped = items.filter((item) => item.status === 'skipped').length;
  const completed = evaluated;
  const pending = items.filter((item) => item.status === 'pending').length;
  const percent = total === 0 ? 0 : Math.round((evaluated / total) * 100);

  return { total, evaluated, skipped, completed, pending, percent };
}
