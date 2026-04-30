'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Minus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import type {
  FmeaDimensionComparisonRow,
  FmeaModeComparisonRow,
  FmeaVersionComparisonData,
} from '@/lib/fmea/data';
import { getZoneClasses, getZoneLabel } from '@/lib/fmea/domain';

type FilterMode = 'all' | 'improved' | 'deteriorated' | 'unchanged' | 'new';

const ZONE_ORDER: Record<string, number> = {
  zona_i: 1,
  zona_ii: 2,
  zona_iii: 3,
  zona_iv: 4,
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function DeltaBadge({ delta, size = 'md' }: { delta: number | null; size?: 'sm' | 'md' }) {
  if (delta === null) return <span className="font-plex text-lttm text-[11px]">—</span>;

  const textSize = size === 'sm' ? 'text-[10.5px]' : 'text-[12px]';

  if (delta < 0) {
    return (
      <span className={`inline-flex items-center gap-1 font-plex font-medium ${textSize} text-gr`}>
        <TrendingDown className="w-3 h-3 shrink-0" />
        {delta}
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span className={`inline-flex items-center gap-1 font-plex font-medium ${textSize} text-re`}>
        <TrendingUp className="w-3 h-3 shrink-0" />
        +{delta}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 font-plex ${textSize} text-lttm`}>
      <Minus className="w-3 h-3 shrink-0" />0
    </span>
  );
}

function SActualCell({ value, status }: { value: number | null; status: string | null }) {
  if (status === 'skipped') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] border bg-[#f1ebff] border-[#d2c1ff] text-[#7c5cff] font-plex text-[10.5px]">
        Pospuesto
      </span>
    );
  }
  if (value === null) {
    return <span className="font-plex text-[11px] text-lttm">Pendiente</span>;
  }
  const severity =
    value === 9
      ? 'text-re'
      : value === 8
      ? 'text-re'
      : value >= 6
      ? 'text-or'
      : 'text-gr';
  return <span className={`font-fraunces text-[15px] font-semibold ${severity}`}>{value}</span>;
}

function ZoneArrow({
  prev,
  curr,
}: {
  prev: string | null;
  curr: string | null;
}) {
  const prevZone = prev ?? 'zona_iv';
  const currZone = curr ?? 'zona_iv';
  const prevClasses = getZoneClasses(prevZone as Parameters<typeof getZoneClasses>[0]);
  const currClasses = getZoneClasses(currZone as Parameters<typeof getZoneClasses>[0]);

  const prevOrder = ZONE_ORDER[prevZone] ?? 4;
  const currOrder = ZONE_ORDER[currZone] ?? 4;
  const improved = currOrder > prevOrder;
  const worsened = currOrder < prevOrder;

  return (
    <div className="flex items-center gap-3">
      <span className={`inline-flex items-center px-3 py-1.5 rounded-[8px] border font-fraunces text-[14px] ${prevClasses.pill}`}>
        {getZoneLabel(prevZone as Parameters<typeof getZoneLabel>[0])}
      </span>
      <ArrowRight
        className={`w-4 h-4 shrink-0 ${
          improved ? 'text-gr' : worsened ? 'text-re' : 'text-lttm'
        }`}
      />
      <span className={`inline-flex items-center px-3 py-1.5 rounded-[8px] border font-fraunces text-[14px] ${currClasses.pill}`}>
        {getZoneLabel(currZone as Parameters<typeof getZoneLabel>[0])}
      </span>
    </div>
  );
}

function DimensionRow({ dim }: { dim: FmeaDimensionComparisonRow }) {
  const [open, setOpen] = useState(false);

  const hasChange = dim.improved > 0 || dim.deteriorated > 0;
  const dominant =
    dim.improved > dim.deteriorated
      ? 'improved'
      : dim.deteriorated > dim.improved
      ? 'deteriorated'
      : 'neutral';

  return (
    <div className="border border-ltb rounded-[10px] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-ltcard hover:bg-ltcard2 transition-colors text-left"
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-lttm shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-lttm shrink-0" />
        )}
        <span className="font-sora text-[13px] font-semibold text-ltt flex-1 min-w-0 truncate capitalize">
          {dim.dimension_name}
        </span>

        <div className="flex items-center gap-4 shrink-0">
          {dim.avg_delta !== null && (
            <DeltaBadge delta={dim.avg_delta} size="sm" />
          )}
          <div className="flex items-center gap-2">
            {dim.improved > 0 && (
              <span className="inline-flex items-center gap-1 font-plex text-[10.5px] text-gr bg-grdim border border-grb px-2 py-0.5 rounded-[6px]">
                <TrendingDown className="w-3 h-3" />
                {dim.improved}
              </span>
            )}
            {dim.deteriorated > 0 && (
              <span className="inline-flex items-center gap-1 font-plex text-[10.5px] text-re bg-red-dim border border-reb px-2 py-0.5 rounded-[6px]">
                <TrendingUp className="w-3 h-3" />
                {dim.deteriorated}
              </span>
            )}
            {dim.new_modes > 0 && (
              <span className="inline-flex items-center gap-1 font-plex text-[10.5px] text-brand-cyan bg-cyan-dim border border-cyan-border px-2 py-0.5 rounded-[6px]">
                +{dim.new_modes} nuevo{dim.new_modes > 1 ? 's' : ''}
              </span>
            )}
            {!hasChange && dim.new_modes === 0 && (
              <span className="font-plex text-[10.5px] text-lttm">Sin cambios</span>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[11px] font-plex text-lttm min-w-[140px] justify-end">
            <span>
              Máx:{' '}
              <span className="text-ltt font-medium">
                {dim.prev_max_s ?? '—'} → {dim.curr_max_s ?? '—'}
              </span>
            </span>
            <span>
              Avg:{' '}
              <span className="text-ltt font-medium">
                {dim.prev_avg_s ?? '—'} → {dim.curr_avg_s ?? '—'}
              </span>
            </span>
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-ltb bg-ltbg px-4 py-3 text-[12px] font-sora text-ltt2 grid grid-cols-3 gap-4">
          <div>
            <div className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm mb-1">Avg S_actual</div>
            <div className="text-ltt font-medium">
              {dim.prev_avg_s ?? '—'} → {dim.curr_avg_s ?? '—'}
              {dim.avg_delta !== null && (
                <span className={`ml-2 ${dim.avg_delta < 0 ? 'text-gr' : dim.avg_delta > 0 ? 'text-re' : 'text-lttm'}`}>
                  ({dim.avg_delta > 0 ? '+' : ''}{dim.avg_delta})
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm mb-1">Máx S_actual</div>
            <div className="text-ltt font-medium">
              {dim.prev_max_s ?? '—'} → {dim.curr_max_s ?? '—'}
            </div>
          </div>
          <div>
            <div className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm mb-1">Tendencia</div>
            <div className={`font-medium ${dominant === 'improved' ? 'text-gr' : dominant === 'deteriorated' ? 'text-re' : 'text-lttm'}`}>
              {dominant === 'improved'
                ? `${dim.improved} mejoraron`
                : dominant === 'deteriorated'
                ? `${dim.deteriorated} empeoraron`
                : `${dim.unchanged} sin cambio`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModeRow({ mode, prevVersion, currVersion }: { mode: FmeaModeComparisonRow; prevVersion: number; currVersion: number }) {
  let rowBg = '';
  if (mode.is_new) rowBg = 'bg-[rgba(0,173,239,0.04)]';
  else if (mode.is_removed) rowBg = 'bg-[rgba(217,45,32,0.03)]';
  else if (mode.delta !== null && mode.delta < 0) rowBg = 'bg-[rgba(34,197,94,0.04)]';
  else if (mode.delta !== null && mode.delta > 0) rowBg = 'bg-[rgba(217,45,32,0.04)]';

  return (
    <tr className={`border-b border-ltb last:border-b-0 ${rowBg}`}>
      <td className="px-4 py-3 align-top">
        <div className="font-plex text-[10.5px] text-lttm">{mode.failure_mode_code}</div>
        <div className="font-sora text-[12.5px] text-ltt leading-snug">{mode.failure_mode_name}</div>
      </td>
      <td className="px-4 py-3 align-middle text-center">
        <SActualCell value={mode.prev_s_actual} status={mode.prev_status} />
      </td>
      <td className="px-4 py-3 align-middle text-center">
        <SActualCell value={mode.curr_s_actual} status={mode.curr_status} />
      </td>
      <td className="px-4 py-3 align-middle text-center">
        {mode.is_new ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] border border-cyan-border bg-cyan-dim text-brand-cyan font-plex text-[10px]">
            Nuevo
          </span>
        ) : mode.is_removed ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] border border-reb bg-red-dim text-re font-plex text-[10px]">
            Retirado
          </span>
        ) : (
          <DeltaBadge delta={mode.delta} />
        )}
      </td>
    </tr>
  );
}

export function FmeaComparisonClient({ data }: { data: FmeaVersionComparisonData }) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [expandedDims, setExpandedDims] = useState<Set<string>>(new Set());

  const { system, currentEvaluation, previousEvaluation, modes, dimensions, summary } = data;

  const aiSystemId = system.id;
  const evalId = currentEvaluation.id;

  const filteredModes = useMemo(() => {
    switch (filter) {
      case 'improved':
        return modes.filter((m) => m.delta !== null && m.delta < 0);
      case 'deteriorated':
        return modes.filter((m) => m.delta !== null && m.delta > 0);
      case 'unchanged':
        return modes.filter((m) => m.delta === 0);
      case 'new':
        return modes.filter((m) => m.is_new || m.is_removed);
      default:
        return modes;
    }
  }, [modes, filter]);

  const dimensionsInFilter = useMemo(
    () => Array.from(new Set(filteredModes.map((m) => m.dimension_id))),
    [filteredModes]
  );

  const zoneImproved =
    summary.curr_zone &&
    summary.prev_zone &&
    (ZONE_ORDER[summary.curr_zone] ?? 4) > (ZONE_ORDER[summary.prev_zone] ?? 4);
  const zoneWorsened =
    summary.curr_zone &&
    summary.prev_zone &&
    (ZONE_ORDER[summary.curr_zone] ?? 4) < (ZONE_ORDER[summary.prev_zone] ?? 4);

  return (
    <div className="max-w-[1200px] mx-auto w-full animate-fadein pb-10">
      {/* ── Breadcrumb + header ────────────────────────────────────────────── */}
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] font-plex text-lttm uppercase tracking-wider mb-3">
            <Link
              href={`/inventario/${aiSystemId}`}
              className="flex items-center gap-1.5 hover:text-brand-cyan transition-colors"
            >
              <ArrowLeft size={14} className="text-lttm" />
              <span>Volver al sistema</span>
            </Link>
            <span>/</span>
            <Link
              href={`/inventario/${aiSystemId}/fmea/${evalId}/evaluar`}
              className="hover:text-brand-cyan transition-colors"
            >
              Evaluación FMEA
            </Link>
            <span>/</span>
            <span className="text-ltt">Comparativa de versiones</span>
          </div>
          <h1 className="font-fraunces text-[28px] leading-none font-semibold text-ltt mb-1.5">
            {system.name}
          </h1>
          <div className="font-plex text-[11px] uppercase tracking-[1px] text-lttm">
            Comparativa · v{previousEvaluation.version} → v{currentEvaluation.version}
          </div>
        </div>
      </div>

      {/* ── Evaluaciones header ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-[12px] border border-ltb bg-ltcard p-4">
          <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-1">
            Versión anterior · v{previousEvaluation.version}
          </div>
          <div className="font-sora text-[13px] text-ltt font-medium capitalize">
            {previousEvaluation.state === 'superseded' ? 'Supersedida' : 'Aprobada'}
          </div>
          {previousEvaluation.approved_at && (
            <div className="font-plex text-[11px] text-lttm mt-1">
              Aprobada: {formatDate(previousEvaluation.approved_at)}
            </div>
          )}
          {previousEvaluation.cached_zone && (
            <div className="mt-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-[7px] border font-fraunces text-[12px] ${
                  getZoneClasses(previousEvaluation.cached_zone as Parameters<typeof getZoneClasses>[0]).pill
                }`}
              >
                {getZoneLabel(previousEvaluation.cached_zone as Parameters<typeof getZoneLabel>[0])}
              </span>
            </div>
          )}
        </div>

        <div className="rounded-[12px] border border-ltb bg-ltcard p-4">
          <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-1">
            Versión actual · v{currentEvaluation.version}
          </div>
          <div className="font-sora text-[13px] text-ltt font-medium capitalize">
            {currentEvaluation.state === 'draft'
              ? 'Borrador'
              : currentEvaluation.state === 'in_review'
              ? 'En revisión'
              : currentEvaluation.state === 'approved'
              ? 'Aprobada'
              : 'Supersedida'}
          </div>
          <div className="font-plex text-[11px] text-lttm mt-1">
            Creada: {formatDate(currentEvaluation.created_at)}
          </div>
          {currentEvaluation.cached_zone && (
            <div className="mt-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-[7px] border font-fraunces text-[12px] ${
                  getZoneClasses(currentEvaluation.cached_zone as Parameters<typeof getZoneClasses>[0]).pill
                }`}
              >
                {getZoneLabel(currentEvaluation.cached_zone as Parameters<typeof getZoneLabel>[0])}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── KPI summary ────────────────────────────────────────────────────── */}
      <div className="rounded-[12px] border border-ltb bg-[#070c14] text-white overflow-hidden shadow-[0_2px_14px_rgba(0,0,0,0.08)] mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#18324a]">
          <div className="px-5 py-4">
            <div className="font-plex text-[10px] uppercase tracking-[1px] text-[#94b0c8] mb-1.5 flex items-center gap-1.5">
              <TrendingDown className="w-3 h-3 text-gr" />
              Mejoraron
            </div>
            <div className="font-fraunces text-[24px] text-gr">{summary.improved}</div>
          </div>
          <div className="px-5 py-4">
            <div className="font-plex text-[10px] uppercase tracking-[1px] text-[#94b0c8] mb-1.5 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-re" />
              Empeoraron
            </div>
            <div className="font-fraunces text-[24px] text-re">{summary.deteriorated}</div>
          </div>
          <div className="px-5 py-4">
            <div className="font-plex text-[10px] uppercase tracking-[1px] text-[#94b0c8] mb-1.5 flex items-center gap-1.5">
              <Minus className="w-3 h-3 text-[#94b0c8]" />
              Sin cambio
            </div>
            <div className="font-fraunces text-[24px] text-[#c3d6e7]">{summary.unchanged}</div>
          </div>
          <div className="px-5 py-4">
            <div className="font-plex text-[10px] uppercase tracking-[1px] text-[#94b0c8] mb-1.5">
              Nuevos modos
            </div>
            <div className="font-fraunces text-[24px] text-[#00adef]">{summary.new_modes}</div>
          </div>
          <div className="px-5 py-4">
            <div className="font-plex text-[10px] uppercase tracking-[1px] text-[#94b0c8] mb-1.5">
              Zona global
            </div>
            {summary.prev_zone && summary.curr_zone ? (
              <ZoneArrow prev={summary.prev_zone} curr={summary.curr_zone} />
            ) : (
              <span className="font-plex text-[13px] text-[#94b0c8]">—</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Dimensiones ────────────────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-3">
          Por dimensión
        </div>
        <div className="space-y-2">
          {dimensions.map((dim) => (
            <DimensionRow key={dim.dimension_id} dim={dim} />
          ))}
        </div>
      </div>

      {/* ── Modos de fallo — tabla ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="font-plex text-[11px] uppercase tracking-[1px] text-lttm">
            Modos de fallo ({filteredModes.length})
          </div>
          <div className="flex items-center gap-1.5">
            {(
              [
                { value: 'all', label: 'Todos' },
                { value: 'improved', label: 'Mejoraron' },
                { value: 'deteriorated', label: 'Empeoraron' },
                { value: 'unchanged', label: 'Sin cambio' },
                { value: 'new', label: 'Nuevos/Retirados' },
              ] as { value: FilterMode; label: string }[]
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`px-2.5 py-1 rounded-[7px] border font-plex text-[10.5px] transition-colors ${
                  filter === value
                    ? 'border-cyan-border bg-cyan-dim text-brand-cyan'
                    : 'border-ltb bg-ltcard text-lttm hover:border-ltb2 hover:text-ltt'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filteredModes.length === 0 ? (
          <div className="rounded-[12px] border border-ltb bg-ltcard p-8 text-center font-sora text-[13px] text-lttm">
            No hay modos que coincidan con el filtro seleccionado.
          </div>
        ) : (
          <div className="rounded-[12px] border border-ltb bg-ltcard overflow-hidden">
            {dimensionsInFilter.map((dimId) => {
              const dimMeta = dimensions.find((d) => d.dimension_id === dimId);
              const dimModes = filteredModes.filter((m) => m.dimension_id === dimId);
              if (dimModes.length === 0) return null;

              return (
                <div key={dimId}>
                  <div className="px-4 py-2.5 bg-ltcard2 border-b border-ltb">
                    <span className="font-plex text-[10.5px] uppercase tracking-[0.9px] text-lttm capitalize">
                      {dimMeta?.dimension_name ?? dimId}
                    </span>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-ltb bg-ltbg">
                        <th className="px-4 py-2 text-left font-plex text-[10px] uppercase tracking-[0.9px] text-lttm">
                          Modo de fallo
                        </th>
                        <th className="px-4 py-2 text-center font-plex text-[10px] uppercase tracking-[0.9px] text-lttm w-24">
                          v{previousEvaluation.version}
                        </th>
                        <th className="px-4 py-2 text-center font-plex text-[10px] uppercase tracking-[0.9px] text-lttm w-24">
                          v{currentEvaluation.version}
                        </th>
                        <th className="px-4 py-2 text-center font-plex text-[10px] uppercase tracking-[0.9px] text-lttm w-20">
                          Delta
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dimModes.map((mode) => (
                        <ModeRow
                          key={mode.failure_mode_id}
                          mode={mode}
                          prevVersion={previousEvaluation.version}
                          currVersion={currentEvaluation.version}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
