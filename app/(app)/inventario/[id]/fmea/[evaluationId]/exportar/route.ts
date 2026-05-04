import { NextResponse } from 'next/server';

import { buildFmeaEvaluationData } from '@/lib/fmea/data';
import { calculateFmeaZone, getFmeaProgress, getZoneLabel } from '@/lib/fmea/domain';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

const DIMENSION_LABELS: Record<string, string> = {
  tecnica: 'Técnica',
  seguridad: 'Seguridad',
  etica: 'Ética',
  gobernanza: 'Gobernanza',
  roi: 'ROI',
  legal_b: 'Legal tipo B',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  evaluated: 'Confirmado',
  skipped: 'Pospuesto',
};

function esc(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


export async function GET(
  request: Request,
  { params }: { params: { id: string; evaluationId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const fluxion = createFluxionClient();
  const { data: membership } = await fluxion
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return new NextResponse('No autorizado', { status: 401 });
  }

  const data = await buildFmeaEvaluationData({
    organizationId: membership.organization_id,
    aiSystemId: params.id,
    evaluationId: params.evaluationId,
    viewerUserId: user.id,
  });

  if (!data) {
    return new NextResponse('Evaluación no encontrada', { status: 404 });
  }

  const { system, evaluation, items } = data;

  const progress = getFmeaProgress(
    items.map((item) => ({
      id: item.id,
      dimension_id: item.dimension_id,
      s_default_frozen: item.s_default_frozen,
      o_value: item.o_value,
      d_real_value: item.d_real_value,
      s_actual: item.status === 'evaluated' ? item.s_actual : null,
      status: item.status,
    }))
  );

  const zone = calculateFmeaZone(
    items.map((item) => ({
      id: item.id,
      dimension_id: item.dimension_id,
      s_default_frozen: item.s_default_frozen,
      o_value: item.o_value,
      d_real_value: item.d_real_value,
      s_actual: item.status === 'evaluated' ? item.s_actual : null,
      status: item.status,
    })),
    system.aiact_risk_level
  );

  const secondReviewCount = items.filter(
    (item) => item.requires_second_review && item.second_review_status !== 'approved'
  ).length;

  const byDimension = new Map<string, { label: string; order: number; items: typeof items }>();
  for (const item of items) {
    if (!byDimension.has(item.dimension_id)) {
      byDimension.set(item.dimension_id, {
        label: DIMENSION_LABELS[item.dimension_id] ?? item.dimension_name,
        order: item.dimension_order,
        items: [],
      });
    }
    byDimension.get(item.dimension_id)!.items.push(item);
  }
  const dimensionGroups = Array.from(byDimension.values()).sort((a, b) => a.order - b.order);

  const zoneClass =
    zone === 'zona_i' ? 'zone-i'
    : zone === 'zona_ii' ? 'zone-ii'
    : zone === 'zona_iii' ? 'zone-iii'
    : 'zone-iv';

  const stateLabel =
    evaluation.state === 'draft' ? 'Borrador'
    : evaluation.state === 'in_review' ? 'En revisión'
    : evaluation.state === 'approved' ? 'Aprobada'
    : 'Supersedida';

  const printedAt = new Intl.DateTimeFormat('es-ES', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date());

  const rowsHtml = dimensionGroups.map((group) => {
    const tableRows = group.items.map((item) => {
      const sVal = item.status === 'evaluated' ? item.s_actual : null;
      const sClass = sVal === null ? '' : sVal >= 9 ? 's-critical' : sVal >= 7 ? 's-high' : sVal >= 5 ? 's-medium' : 's-low';
      const statusBadgeClass = `status-${item.status}`;
      const reviewBadge = item.requires_second_review
        ? `<span class="second-review-badge">2ª rev</span>`
        : '';

      return `
        <tr>
          <td>
            <div class="code">${esc(item.failure_mode_code)}</div>
            <div class="mode-name">${esc(item.failure_mode_name)}</div>
          </td>
          <td style="text-align:center"><span class="mono">${item.s_default_frozen}</span></td>
          <td style="text-align:center"><span class="mono">${item.o_value ?? '—'}</span></td>
          <td style="text-align:center"><span class="mono">${item.d_real_value ?? '—'}</span></td>
          <td style="text-align:center">${sVal !== null ? `<span class="s-val ${sClass}">${sVal}</span>` : `<span class="mono" style="font-size:11px;color:#94a3b8">—</span>`}</td>
          <td style="text-align:center">
            <span class="status-badge ${statusBadgeClass}">${esc(STATUS_LABELS[item.status] ?? item.status)}</span>
            ${reviewBadge}
          </td>
          <td>${item.narrative_justification ? `<div class="justification">${esc(item.narrative_justification)}</div>` : ''}</td>
        </tr>`;
    }).join('');

    return `
      <div class="dim-section">
        <h2 class="dim-title">${esc(group.label)}</h2>
        <table>
          <thead>
            <tr>
              <th style="width:34%">Modo de fallo</th>
              <th style="width:7%;text-align:center">S_def</th>
              <th style="width:7%;text-align:center">O</th>
              <th style="width:7%;text-align:center">D</th>
              <th style="width:7%;text-align:center">S_act</th>
              <th style="width:13%;text-align:center">Estado</th>
              <th style="width:25%">Justificación</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FMEA ${esc(system.name)} — v${evaluation.version}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Sora:wght@400;500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box}
    body{font-family:'Sora',sans-serif;font-size:12px;color:#1a2a3a;margin:0;padding:0;background:white}
    .mono{font-family:'IBM Plex Mono',monospace}
    .print-page{max-width:960px;margin:0 auto;padding:32px 40px}
    .no-print{text-align:right;margin-bottom:24px}
    .btn-print{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:#00adef;color:white;border:none;border-radius:8px;font-size:13px;font-family:'Sora',sans-serif;font-weight:600;cursor:pointer}
    .btn-print:hover{background:#0095cc}
    .doc-header{border-bottom:2px solid #e2eaf2;padding-bottom:20px;margin-bottom:24px}
    .doc-title{font-size:22px;font-weight:700;color:#0d1f30;margin:0 0 4px}
    .doc-subtitle{font-size:11px;color:#5a7a94;letter-spacing:.08em;text-transform:uppercase;margin:0;font-family:'IBM Plex Mono',monospace}
    .doc-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:16px}
    .meta-cell{background:#f4f8fc;border-radius:8px;padding:10px 14px}
    .meta-label{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#5a7a94;margin-bottom:3px;font-family:'IBM Plex Mono',monospace}
    .meta-value{font-size:13px;font-weight:600;color:#0d1f30}
    .zone-i{color:#d92d20}.zone-ii{color:#f59e0b}.zone-iii{color:#0ea5e9}.zone-iv{color:#22c55e}
    .dim-section{margin-bottom:28px;page-break-inside:avoid}
    .dim-title{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#5a7a94;font-family:'IBM Plex Mono',monospace;margin:0 0 8px;padding:6px 0;border-bottom:1px solid #e2eaf2}
    table{width:100%;border-collapse:collapse;margin-bottom:4px}
    thead tr{background:#f4f8fc}
    th{padding:7px 10px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#5a7a94;font-family:'IBM Plex Mono',monospace;font-weight:500;border-bottom:1px solid #e2eaf2}
    td{padding:8px 10px;border-bottom:1px solid #f0f4f8;vertical-align:top}
    tr:last-child td{border-bottom:none}
    .code{font-family:'IBM Plex Mono',monospace;font-size:10px;color:#5a7a94}
    .mode-name{font-size:12px;font-weight:500;color:#0d1f30}
    .s-val{font-size:14px;font-weight:700;font-family:Georgia,serif}
    .s-critical{color:#d92d20}.s-high{color:#f59e0b}.s-medium{color:#0ea5e9}.s-low{color:#22c55e}
    .status-badge{display:inline-block;padding:2px 8px;border-radius:5px;font-size:9px;font-family:'IBM Plex Mono',monospace;letter-spacing:.05em;text-transform:uppercase}
    .status-evaluated{background:#dcfce7;color:#166534}
    .status-skipped{background:#ede9fe;color:#5b21b6}
    .status-pending{background:#f1f5f9;color:#475569}
    .justification{font-size:10.5px;color:#334155;margin-top:4px;font-style:italic;max-width:340px}
    .second-review-badge{display:inline-block;margin-left:6px;padding:1px 6px;border-radius:4px;font-size:9px;font-family:'IBM Plex Mono',monospace;background:#fef3c7;color:#92400e}
    .doc-footer{margin-top:32px;padding-top:14px;border-top:1px solid #e2eaf2;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;font-family:'IBM Plex Mono',monospace}
    @media print{.no-print{display:none!important}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.dim-section{page-break-inside:avoid}}
  </style>
</head>
<body>
<div class="print-page">
  <div class="no-print">
    <button id="btn-print" class="btn-print">Imprimir / Guardar PDF</button>
  </div>

  <div class="doc-header">
    <p class="doc-subtitle">Informe FMEA — Evaluación de riesgos de sistemas de IA</p>
    <h1 class="doc-title">${esc(system.name)}</h1>
    ${system.internal_id ? `<p class="doc-subtitle" style="margin-top:4px">${esc(system.internal_id)}</p>` : ''}
    <div class="doc-meta">
      <div class="meta-cell"><div class="meta-label">Versión</div><div class="meta-value">v${evaluation.version}</div></div>
      <div class="meta-cell"><div class="meta-label">Estado</div><div class="meta-value">${esc(stateLabel)}</div></div>
      <div class="meta-cell"><div class="meta-label">Zona global</div><div class="meta-value ${zoneClass}">${esc(getZoneLabel(zone))}</div></div>
      <div class="meta-cell"><div class="meta-label">Progreso</div><div class="meta-value">${progress.completed} / ${progress.total} modos</div></div>
      <div class="meta-cell"><div class="meta-label">AI Act nivel</div><div class="meta-value">${esc(system.aiact_risk_level) || '—'}</div></div>
      <div class="meta-cell"><div class="meta-label">Dominio</div><div class="meta-value">${esc(system.domain)}</div></div>
      <div class="meta-cell"><div class="meta-label">Pendientes</div><div class="meta-value">${progress.pending}</div></div>
      <div class="meta-cell"><div class="meta-label">2ª revisión</div><div class="meta-value">${secondReviewCount}</div></div>
    </div>
  </div>

  ${rowsHtml}

  <div class="doc-footer">
    <span>Fluxion SAAS — Módulo FMEA</span>
    <span>Generado: ${printedAt}</span>
  </div>
</div>
<script>document.getElementById('btn-print')?.addEventListener('click',function(){window.print();});</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
