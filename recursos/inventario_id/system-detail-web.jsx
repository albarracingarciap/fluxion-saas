import { useState } from "react";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;1,9..144,300&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg-900: #0d1117;
    --bg-800: #161b22;
    --bg-700: #21262d;
    --bg-600: #2d333b;
    --border: #30363d;
    --border-light: #3d444d;
    --text-primary: #e6edf3;
    --text-secondary: #8b949e;
    --text-muted: #484f58;
    --amber: #d4a017;
    --amber-light: #f0c040;
    --amber-dim: #d4a01718;
    --amber-border: #d4a01730;
    --red: #f85149;
    --red-dim: #f8514912;
    --red-border: #f8514928;
    --green: #3fb950;
    --green-dim: #3fb95012;
    --green-border: #3fb95028;
    --blue: #58a6ff;
    --blue-dim: #58a6ff12;
    --blue-border: #58a6ff28;
    --orange: #e3913a;
    --orange-dim: #e3913a12;
    --orange-border: #e3913a28;
    --purple: #bc8cff;
    --purple-dim: #bc8cff12;
  }

  html, body { height: 100%; }

  body {
    font-family: 'Sora', sans-serif;
    background: var(--bg-900);
    color: var(--text-primary);
    min-height: 100vh;
  }

  .mono { font-family: 'IBM Plex Mono', monospace; }
  .serif { font-family: 'Fraunces', serif; }

  /* ─── LAYOUT ─── */
  .layout { display: flex; height: 100vh; overflow: hidden; }

  /* SIDEBAR */
  .sidebar {
    width: 220px;
    background: var(--bg-800);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    z-index: 10;
  }

  .logo {
    padding: 18px 16px;
    border-bottom: 1px solid var(--border);
  }

  .logo-wordmark {
    font-family: 'Fraunces', serif;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: -0.5px;
    color: var(--text-primary);
  }

  .logo-sub {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--amber);
    margin-top: 2px;
  }

  .nav { flex: 1; padding: 10px 0; overflow-y: auto; }

  .nav-group-label {
    padding: 10px 14px 4px;
    font-size: 9.5px;
    font-family: 'IBM Plex Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: var(--text-muted);
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 7px 12px;
    border-radius: 6px;
    margin: 1px 8px;
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.12s;
    border: 1px solid transparent;
  }

  .nav-item:hover { background: var(--bg-700); color: var(--text-primary); }

  .nav-item.active {
    background: var(--amber-dim);
    color: var(--amber-light);
    border-color: var(--amber-border);
  }

  .nav-item .ni-icon { font-size: 14px; width: 16px; text-align: center; }

  .nav-badge {
    margin-left: auto;
    background: var(--red);
    color: white;
    font-size: 9px;
    font-family: 'IBM Plex Mono', monospace;
    padding: 1px 5px;
    border-radius: 8px;
    font-weight: 600;
  }

  .sidebar-footer {
    padding: 12px;
    border-top: 1px solid var(--border);
  }

  .org-chip {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px 10px;
    background: var(--bg-700);
    border-radius: 8px;
    cursor: pointer;
    border: 1px solid var(--border);
  }

  .org-avatar {
    width: 28px; height: 28px; border-radius: 7px;
    background: linear-gradient(135deg, #d4a017, #e3913a);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; color: #0d1117; flex-shrink: 0;
  }

  .org-name { font-size: 12px; font-weight: 500; }
  .org-role { font-size: 10px; color: var(--text-muted); font-family: 'IBM Plex Mono', monospace; }

  /* MAIN */
  .main {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  /* TOPBAR */
  .topbar {
    height: 50px;
    background: var(--bg-800);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    padding: 0 24px;
    gap: 12px;
    flex-shrink: 0;
    position: sticky;
    top: 0;
    z-index: 20;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-muted);
    font-family: 'IBM Plex Mono', monospace;
  }

  .breadcrumb a {
    color: var(--text-secondary);
    cursor: pointer;
    transition: color 0.12s;
    text-decoration: none;
  }

  .breadcrumb a:hover { color: var(--amber-light); }
  .breadcrumb .current { color: var(--text-primary); font-weight: 500; }
  .breadcrumb .sep { color: var(--text-muted); }

  .topbar-right {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .btn {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 13px; border-radius: 6px;
    font-size: 12.5px; cursor: pointer; border: none;
    font-family: 'Sora', sans-serif; font-weight: 500;
    transition: all 0.12s;
  }

  .btn-primary { background: var(--amber); color: #0d1117; }
  .btn-primary:hover { background: var(--amber-light); }

  .btn-ghost {
    background: transparent; color: var(--text-secondary);
    border: 1px solid var(--border);
  }

  .btn-ghost:hover { background: var(--bg-700); color: var(--text-primary); }

  .btn-danger {
    background: var(--red-dim); color: var(--red);
    border: 1px solid var(--red-border);
  }

  .btn-danger:hover { background: #f8514920; }

  /* CONTENT AREA */
  .content-area {
    flex: 1;
    overflow-y: auto;
    display: grid;
    grid-template-columns: 1fr 340px;
    grid-template-rows: auto 1fr;
    gap: 0;
  }

  /* SYSTEM HEADER */
  .sys-header {
    grid-column: 1 / -1;
    padding: 24px 28px 0;
    background: linear-gradient(180deg, var(--bg-800) 0%, transparent 100%);
    border-bottom: 1px solid var(--border);
  }

  .sys-header-inner {
    display: flex;
    align-items: flex-start;
    gap: 18px;
    padding-bottom: 20px;
  }

  .sys-icon-xl {
    width: 58px; height: 58px; border-radius: 16px;
    background: var(--red-dim); border: 1px solid var(--red-border);
    display: flex; align-items: center; justify-content: center;
    font-size: 28px; flex-shrink: 0;
  }

  .sys-header-body { flex: 1; min-width: 0; }

  .sys-title {
    font-family: 'Fraunces', serif;
    font-size: 24px; font-weight: 600;
    letter-spacing: -0.5px; margin-bottom: 8px;
    line-height: 1.2;
  }

  .sys-tags {
    display: flex; align-items: center; gap: 7px; flex-wrap: wrap;
  }

  .sys-header-metrics {
    display: flex; gap: 0;
    border: 1px solid var(--border);
    border-radius: 10px; overflow: hidden;
    flex-shrink: 0; align-self: flex-start;
    background: var(--bg-700);
  }

  .hm-cell {
    padding: 10px 18px;
    border-right: 1px solid var(--border);
    min-width: 100px;
  }

  .hm-cell:last-child { border-right: none; }

  .hm-label {
    font-size: 9.5px; font-family: 'IBM Plex Mono', monospace;
    text-transform: uppercase; letter-spacing: 0.8px;
    color: var(--text-muted); margin-bottom: 5px;
  }

  .hm-value {
    font-family: 'Fraunces', serif;
    font-size: 20px; font-weight: 600; line-height: 1;
    margin-bottom: 3px;
  }

  .hm-sub { font-size: 11px; color: var(--text-secondary); }

  /* TABS */
  .tabs-bar {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0 28px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-900);
  }

  .tab {
    padding: 12px 16px;
    font-size: 13px;
    cursor: pointer;
    color: var(--text-secondary);
    border-bottom: 2px solid transparent;
    transition: all 0.12s;
    white-space: nowrap;
    font-weight: 500;
  }

  .tab:hover { color: var(--text-primary); }

  .tab.active {
    color: var(--amber-light);
    border-bottom-color: var(--amber);
  }

  /* MAIN COLUMN */
  .main-col {
    padding: 24px 0 24px 28px;
    overflow-y: auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  /* RIGHT PANEL */
  .right-panel {
    padding: 24px 28px 24px 20px;
    overflow-y: auto;
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* ─── CARDS ─── */
  .card {
    background: var(--bg-800);
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
  }

  .card-header {
    display: flex; align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
  }

  .card-title {
    font-size: 11px; font-family: 'IBM Plex Mono', monospace;
    text-transform: uppercase; letter-spacing: 0.8px;
    color: var(--text-secondary); font-weight: 600;
  }

  /* ─── BADGES ─── */
  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 20px;
    font-size: 11px; font-weight: 500;
    font-family: 'IBM Plex Mono', monospace;
  }

  .badge-red { background: var(--red-dim); color: var(--red); border: 1px solid var(--red-border); }
  .badge-green { background: var(--green-dim); color: var(--green); border: 1px solid var(--green-border); }
  .badge-amber { background: var(--amber-dim); color: var(--amber-light); border: 1px solid var(--amber-border); }
  .badge-blue { background: var(--blue-dim); color: var(--blue); border: 1px solid var(--blue-border); }
  .badge-gray { background: var(--bg-700); color: var(--text-secondary); border: 1px solid var(--border); }
  .badge-orange { background: var(--orange-dim); color: var(--orange); border: 1px solid var(--orange-border); }
  .badge-purple { background: var(--purple-dim); color: var(--purple); border: 1px solid #bc8cff28; }

  /* ─── CLASSIFICATION BOX ─── */
  .classification-box {
    background: linear-gradient(135deg, #f8514908, #0d1117);
    border: 1px solid var(--red-border);
    border-radius: 10px;
    padding: 18px 20px;
  }

  .cl-header {
    display: flex; align-items: flex-start;
    justify-content: space-between; gap: 12px;
    margin-bottom: 12px;
  }

  .cl-left { flex: 1; }

  .cl-label {
    font-size: 10px; font-family: 'IBM Plex Mono', monospace;
    text-transform: uppercase; letter-spacing: 1px;
    color: var(--red); margin-bottom: 5px;
  }

  .cl-value {
    font-family: 'Fraunces', serif;
    font-size: 20px; font-weight: 600; color: var(--red);
    margin-bottom: 4px;
  }

  .cl-basis {
    font-size: 12px; font-family: 'IBM Plex Mono', monospace;
    color: var(--text-muted);
  }

  .cl-reasoning {
    font-size: 13.5px; color: var(--text-secondary);
    line-height: 1.7; margin-bottom: 14px;
    border-left: 2px solid var(--red-border);
    padding-left: 12px;
  }

  .cl-tags { display: flex; gap: 6px; flex-wrap: wrap; }

  /* ─── OBLIGATIONS TABLE ─── */
  .obl-table { width: 100%; border-collapse: collapse; }

  .obl-table thead th {
    font-size: 10px; font-family: 'IBM Plex Mono', monospace;
    text-transform: uppercase; letter-spacing: 0.8px;
    color: var(--text-muted); padding: 8px 14px;
    border-bottom: 1px solid var(--border);
    text-align: left; background: var(--bg-900);
    font-weight: 500;
  }

  .obl-row {
    border-bottom: 1px solid #21262d;
    cursor: pointer;
    transition: background 0.1s;
  }

  .obl-row:last-child { border-bottom: none; }
  .obl-row:hover td { background: var(--bg-700); }

  .obl-row td {
    padding: 11px 14px;
    vertical-align: middle;
    font-size: 13.5px;
  }

  .obl-icon-cell {
    width: 36px; height: 36px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 15px; flex-shrink: 0;
  }

  .obl-name { font-weight: 500; margin-bottom: 2px; }
  .obl-ref { font-size: 11px; font-family: 'IBM Plex Mono', monospace; color: var(--text-muted); }

  .status-cell {
    display: flex; align-items: center; gap: 7px;
    font-size: 12.5px; font-family: 'IBM Plex Mono', monospace;
  }

  .status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

  .progress-thin {
    width: 80px; height: 4px;
    background: var(--bg-600); border-radius: 2px; overflow: hidden;
  }

  .progress-fill { height: 100%; border-radius: 2px; }

  /* ─── INFO GRID ─── */
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
  }

  .info-cell {
    padding: 13px 16px;
    border-right: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }

  .info-cell:nth-child(2n) { border-right: none; }
  .info-cell:nth-last-child(-n+2) { border-bottom: none; }

  .info-key {
    font-size: 10.5px; font-family: 'IBM Plex Mono', monospace;
    text-transform: uppercase; letter-spacing: 0.5px;
    color: var(--text-muted); margin-bottom: 5px;
  }

  .info-val { font-size: 13.5px; color: var(--text-primary); line-height: 1.5; }

  /* ─── TIMELINE ─── */
  .timeline { padding: 6px 0; }

  .tl-item {
    display: flex; gap: 14px;
    padding: 0 16px 0 14px;
    position: relative;
  }

  .tl-track {
    display: flex; flex-direction: column;
    align-items: center; width: 20px; flex-shrink: 0;
    padding-top: 14px;
  }

  .tl-dot {
    width: 11px; height: 11px; border-radius: 50%;
    border: 2px solid var(--border);
    background: var(--bg-900); z-index: 1; flex-shrink: 0;
    transition: all 0.2s;
  }

  .tl-dot.done { background: var(--green); border-color: var(--green); }
  .tl-dot.active { background: var(--amber); border-color: var(--amber); box-shadow: 0 0 8px #d4a01760; }

  .tl-line {
    width: 2px; flex: 1; min-height: 18px;
    background: var(--border); margin: 3px 0;
  }

  .tl-line.done { background: var(--green-border); }

  .tl-body { flex: 1; padding: 10px 0 16px; }

  .tl-title {
    font-size: 13.5px; font-weight: 500; margin-bottom: 4px;
    color: var(--text-primary);
  }

  .tl-title.pending { color: var(--text-muted); }

  .tl-meta {
    display: flex; align-items: center; gap: 8px;
    font-size: 11.5px; color: var(--text-secondary);
    font-family: 'IBM Plex Mono', monospace;
  }

  /* ─── AGENT NUDGE ─── */
  .agent-nudge {
    background: var(--amber-dim);
    border: 1px solid var(--amber-border);
    border-radius: 10px; padding: 14px 16px;
    display: flex; gap: 12px;
    cursor: pointer; transition: all 0.15s;
  }

  .agent-nudge:hover { background: #d4a01722; border-color: var(--amber); }

  .nudge-icon { font-size: 20px; flex-shrink: 0; margin-top: 1px; }

  .nudge-body { flex: 1; }

  .nudge-title {
    font-size: 13px; font-weight: 600;
    color: var(--amber-light); margin-bottom: 4px;
    display: flex; align-items: center; gap: 8px;
  }

  .nudge-text {
    font-size: 13px; color: var(--text-secondary); line-height: 1.6;
  }

  .nudge-cta {
    margin-top: 10px;
    display: flex; gap: 7px;
  }

  .chip-btn {
    padding: 5px 11px; border-radius: 20px;
    font-size: 12px; cursor: pointer;
    border: 1px solid var(--amber-border);
    background: var(--amber-dim); color: var(--amber-light);
    transition: all 0.12s; font-family: 'Sora', sans-serif;
  }

  .chip-btn:hover { background: var(--amber); color: #0d1117; }

  .chip-btn.ghost {
    background: transparent; color: var(--text-secondary);
    border-color: var(--border);
  }

  .chip-btn.ghost:hover { background: var(--bg-700); color: var(--text-primary); }

  /* ─── QUICK ACTIONS ─── */
  .quick-actions {
    display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
  }

  .qa-btn {
    background: var(--bg-700); border: 1px solid var(--border);
    border-radius: 8px; padding: 12px 13px;
    cursor: pointer; transition: all 0.12s;
    display: flex; align-items: flex-start; gap: 10px;
    text-align: left;
  }

  .qa-btn:hover { background: var(--bg-600); border-color: var(--border-light); }

  .qa-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }

  .qa-label { font-size: 12.5px; font-weight: 500; margin-bottom: 2px; }
  .qa-sub { font-size: 11px; color: var(--text-muted); font-family: 'IBM Plex Mono', monospace; }

  /* ─── RISK METER ─── */
  .risk-meter {
    display: flex; flex-direction: column; gap: 8px;
  }

  .risk-bar-row {
    display: flex; align-items: center; gap: 10px;
  }

  .risk-bar-label {
    font-size: 11.5px; color: var(--text-secondary);
    width: 80px; flex-shrink: 0;
  }

  .risk-bar-track {
    flex: 1; height: 6px; background: var(--bg-600);
    border-radius: 3px; overflow: hidden;
  }

  .risk-bar-fill { height: 100%; border-radius: 3px; }

  .risk-bar-val {
    font-size: 11px; font-family: 'IBM Plex Mono', monospace;
    color: var(--text-muted); width: 32px; text-align: right;
  }

  /* ─── PROVIDER CARD ─── */
  .provider-card {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
  }

  .provider-card:last-child { border-bottom: none; }

  .provider-avatar {
    width: 34px; height: 34px; border-radius: 8px;
    background: var(--bg-600); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; flex-shrink: 0;
  }

  .provider-body { flex: 1; min-width: 0; }
  .provider-name { font-size: 13px; font-weight: 500; margin-bottom: 2px; }
  .provider-meta { font-size: 11px; color: var(--text-muted); font-family: 'IBM Plex Mono', monospace; }

  /* ─── COMPLIANCE RING ─── */
  .compliance-ring-wrap {
    display: flex; flex-direction: column; align-items: center;
    padding: 16px;
    border-bottom: 1px solid var(--border);
  }

  .ring-relative { position: relative; width: 110px; height: 110px; margin-bottom: 12px; }
  .ring-relative svg { transform: rotate(-90deg); }

  .ring-center {
    position: absolute; inset: 0;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
  }

  .ring-pct {
    font-family: 'Fraunces', serif;
    font-size: 26px; font-weight: 600; line-height: 1;
  }

  .ring-sub {
    font-size: 9.5px; font-family: 'IBM Plex Mono', monospace;
    text-transform: uppercase; letter-spacing: 0.5px;
    color: var(--text-muted); margin-top: 3px;
  }

  .ring-legend {
    display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;
  }

  .legend-item {
    display: flex; align-items: center; gap: 5px;
    font-size: 11px; font-family: 'IBM Plex Mono', monospace; color: var(--text-secondary);
  }

  .legend-dot { width: 7px; height: 7px; border-radius: 50%; }
`;

const obligations = [
  { name: "Gestión de Riesgos", ref: "Art. 9", status: "gap", icon: "🔴", iconBg: "var(--red-dim)", progress: 0, label: "Sin implementar" },
  { name: "Datos de Entrenamiento", ref: "Art. 10", status: "gap", icon: "🔴", iconBg: "var(--red-dim)", progress: 0, label: "Sin implementar" },
  { name: "Documentación Técnica", ref: "Art. 11 · Anexo IV", status: "gap", icon: "🔴", iconBg: "var(--red-dim)", progress: 10, label: "Sin implementar" },
  { name: "Logging de Actividad", ref: "Art. 12", status: "gap", icon: "🔴", iconBg: "var(--red-dim)", progress: 0, label: "Sin implementar" },
  { name: "Transparencia hacia usuarios", ref: "Art. 13", status: "ok", icon: "🟢", iconBg: "var(--green-dim)", progress: 100, label: "Implementado" },
  { name: "Supervisión Humana", ref: "Art. 14", status: "partial", icon: "🟡", iconBg: "var(--amber-dim)", progress: 55, label: "Parcial" },
  { name: "Precisión y Robustez", ref: "Art. 15", status: "partial", icon: "🟡", iconBg: "var(--amber-dim)", progress: 40, label: "Parcial" },
  { name: "Registro en base de datos EU", ref: "Art. 71", status: "gap", icon: "🔴", iconBg: "var(--red-dim)", progress: 0, label: "Sin implementar" },
];

const oblStatus = (s) => ({
  ok: { color: "var(--green)", dot: "var(--green)", label: "Implementado" },
  partial: { color: "var(--amber-light)", dot: "var(--amber)", label: "Parcial" },
  gap: { color: "var(--red)", dot: "var(--red)", label: "Sin implementar" },
}[s]);

const timeline = [
  { title: "Sistema registrado en inventario", meta: "DPO · Ana García · 14 Mar 2025", status: "done", badge: null },
  { title: "Clasificación AI Act completada", meta: "Agente IA · 15 Mar 2025", status: "done", badge: "Alto Riesgo · Anexo III.5(b)" },
  { title: "Gap analysis iniciado", meta: "DPO · 16 Mar 2025", status: "active", badge: null },
  { title: "Remediación: documentación técnica", meta: "Pendiente · Sprint 2 · Equipo ML", status: "pending", badge: null },
  { title: "Remediación: supervisión humana", meta: "Pendiente · Sprint 3 · Operaciones", status: "pending", badge: null },
  { title: "Registro en base de datos EU", meta: "Pendiente · Antes Ago 2026", status: "pending", badge: null },
  { title: "Revisión final de compliance", meta: "Pendiente · Jul 2026", status: "pending", badge: null },
];

const navItems = [
  { id: "inventory", icon: "⊞", label: "Inventario", active: true },
  { id: "aiact", icon: "⚖", label: "AI Act" },
  { id: "gaps", icon: "⬡", label: "Gap Analysis", badge: "11" },
  { id: "evidence", icon: "◫", label: "Evidencias" },
  { id: "roadmap", icon: "⊹", label: "Roadmap" },
  { id: "reporting", icon: "▤", label: "Reporting" },
];

const tabs = ["Obligaciones AI Act", "Ficha técnica", "ISO 42001", "Historial", "Evidencias"];

export default function SystemDetail() {
  const [activeTab, setActiveTab] = useState("Obligaciones AI Act");

  const compliance = 32;

  return (
    <>
      <style>{styles}</style>
      <div className="layout">

        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="logo">
            <div className="logo-wordmark">AIComply</div>
            <div className="logo-sub">AI Governance Platform</div>
          </div>

          <nav className="nav">
            <div className="nav-group-label">Proceso</div>
            {navItems.map(n => (
              <div key={n.id} className={`nav-item ${n.active ? "active" : ""}`}>
                <span className="ni-icon">{n.icon}</span>
                <span>{n.label}</span>
                {n.badge && <span className="nav-badge">{n.badge}</span>}
              </div>
            ))}
            <div className="nav-group-label" style={{ marginTop: 16 }}>Configuración</div>
            <div className="nav-item"><span className="ni-icon">⚙</span><span>Ajustes</span></div>
            <div className="nav-item"><span className="ni-icon">👥</span><span>Usuarios</span></div>
          </nav>

          <div className="sidebar-footer">
            <div className="org-chip">
              <div className="org-avatar">BI</div>
              <div>
                <div className="org-name">Banco Iberia</div>
                <div className="org-role">DPO · Professional</div>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <div className="main">

          {/* TOPBAR */}
          <div className="topbar">
            <div className="breadcrumb">
              <a>Inventario</a>
              <span className="sep">/</span>
              <span className="current">Motor de Scoring Crediticio</span>
            </div>
            <div className="topbar-right">
              <button className="btn btn-ghost">↑ Exportar PDF</button>
              <button className="btn btn-ghost">🤖 Abrir agente</button>
              <button className="btn btn-primary">+ Nueva evidencia</button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="content-area">

            {/* SYSTEM HEADER */}
            <div className="sys-header">
              <div className="sys-header-inner">
                <div className="sys-icon-xl">🏦</div>
                <div className="sys-header-body">
                  <div className="sys-title">Motor de Scoring Crediticio</div>
                  <div className="sys-tags">
                    <span className="badge badge-red">● Alto Riesgo</span>
                    <span className="badge badge-green">Producción</span>
                    <span className="badge badge-gray">Interno</span>
                    <span className="badge badge-blue">Crédito y financiación</span>
                    <span className="badge badge-orange">⚠ Plazo: 90 días</span>
                  </div>
                </div>
                <div className="sys-header-metrics">
                  <div className="hm-cell">
                    <div className="hm-label">Compliance</div>
                    <div className="hm-value" style={{ color: "var(--red)" }}>32%</div>
                    <div className="hm-sub">5 gaps críticos</div>
                  </div>
                  <div className="hm-cell">
                    <div className="hm-label">Obligaciones</div>
                    <div className="hm-value" style={{ color: "var(--text-primary)" }}>8</div>
                    <div className="hm-sub">1 OK · 2 parcial · 5 gap</div>
                  </div>
                  <div className="hm-cell">
                    <div className="hm-label">Próximo plazo</div>
                    <div className="hm-value" style={{ color: "var(--orange)" }}>90d</div>
                    <div className="hm-sub">Ago 2025 · GPAI</div>
                  </div>
                  <div className="hm-cell">
                    <div className="hm-label">Responsable</div>
                    <div className="hm-value" style={{ fontSize: 14, marginTop: 2, fontFamily: "Sora, sans-serif", fontWeight: 600 }}>Ana G.</div>
                    <div className="hm-sub">Equipo ML</div>
                  </div>
                </div>
              </div>

              {/* TABS */}
              <div className="tabs-bar" style={{ padding: "0", margin: "0 -28px" }}>
                {/* reuse same left padding */}
                <div style={{ display: "flex", paddingLeft: 28 }}>
                  {tabs.map(t => (
                    <div
                      key={t}
                      className={`tab ${activeTab === t ? "active" : ""}`}
                      onClick={() => setActiveTab(t)}
                    >{t}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* MAIN COLUMN */}
            <div className="main-col">

              {/* AGENT NUDGE */}
              <div className="agent-nudge">
                <div className="nudge-icon">🤖</div>
                <div className="nudge-body">
                  <div className="nudge-title">
                    El agente necesita tu input
                    <span className="badge badge-amber" style={{ fontSize: 10 }}>Pendiente</span>
                  </div>
                  <div className="nudge-text">
                    Para evaluar la obligación de supervisión humana (Art. 14), necesito saber: ¿existe algún proceso por el que un analista pueda revisar o revertir las decisiones del sistema para importes inferiores a 5.000€?
                  </div>
                  <div className="nudge-cta">
                    <button className="chip-btn">Sí, existe un proceso</button>
                    <button className="chip-btn">No, es automático</button>
                    <button className="chip-btn ghost">Responder con más detalle →</button>
                  </div>
                </div>
              </div>

              {/* TAB: OBLIGACIONES */}
              {activeTab === "Obligaciones AI Act" && (
                <>
                  <div className="classification-box">
                    <div className="cl-header">
                      <div className="cl-left">
                        <div className="cl-label">Clasificación AI Act — Resultado del análisis</div>
                        <div className="cl-value">Alto Riesgo</div>
                        <div className="cl-basis">Fundamento: Anexo III, Sección 5(b) · Evaluado por Agente IA el 15 Mar 2025</div>
                      </div>
                      <button className="btn btn-ghost" style={{ fontSize: 11 }}>✏ Revisar clasificación</button>
                    </div>
                    <div className="cl-reasoning">
                      Este sistema genera puntuaciones que intervienen directamente en decisiones de concesión de crédito a personas físicas. La clasificación como alto riesgo se basa en que el sistema afecta el acceso de personas a servicios financieros esenciales mediante decisiones automatizadas. El artículo 22 del GDPR añade obligaciones adicionales sobre el derecho a explicación y a intervención humana.
                    </div>
                    <div className="cl-tags">
                      <span className="badge badge-red">Anexo III · 5(b)</span>
                      <span className="badge badge-orange">Art. 22 GDPR</span>
                      <span className="badge badge-purple">DORA Art. 28</span>
                      <span className="badge badge-blue">EBA Guidelines ML</span>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">Obligaciones aplicables</span>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span className="badge badge-red">5 gaps</span>
                        <span className="badge badge-amber">2 parciales</span>
                        <span className="badge badge-green">1 implementado</span>
                      </div>
                    </div>
                    <table className="obl-table">
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}></th>
                          <th>Obligación</th>
                          <th>Referencia</th>
                          <th>Estado</th>
                          <th>Avance</th>
                          <th style={{ width: 80 }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {obligations.map((o, i) => {
                          const s = oblStatus(o.status);
                          return (
                            <tr key={i} className="obl-row">
                              <td>
                                <div className="obl-icon-cell" style={{ background: o.iconBg }}>
                                  {o.icon}
                                </div>
                              </td>
                              <td>
                                <div className="obl-name">{o.name}</div>
                              </td>
                              <td>
                                <span style={{ fontSize: 11.5, fontFamily: "monospace", color: "var(--text-muted)" }}>{o.ref}</span>
                              </td>
                              <td>
                                <div className="status-cell">
                                  <div className="status-dot" style={{ background: s.dot }} />
                                  <span style={{ color: s.color }}>{s.label}</span>
                                </div>
                              </td>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div className="progress-thin">
                                    <div className="progress-fill" style={{
                                      width: `${o.progress}%`,
                                      background: o.progress === 100 ? "var(--green)" : o.progress > 20 ? "var(--amber)" : "var(--red)"
                                    }} />
                                  </div>
                                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-muted)", minWidth: 28 }}>{o.progress}%</span>
                                </div>
                              </td>
                              <td>
                                <button className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }}>
                                  {o.status === "ok" ? "Ver" : "Resolver →"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* TAB: FICHA */}
              {activeTab === "Ficha técnica" && (
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Atributos del sistema</span>
                    <button className="btn btn-ghost" style={{ fontSize: 11 }}>✏ Editar</button>
                  </div>
                  <div className="info-grid">
                    {[
                      { key: "Descripción", val: "Modelo de scoring que genera puntuación de riesgo crediticio (0–1000) para decisiones de concesión de préstamos personales y líneas de crédito." },
                      { key: "Dominio de aplicación", val: "Crédito y financiación personal" },
                      { key: "Tipo de output", val: "Puntuación numérica + decisión sugerida (aprobado / revisión / denegado)" },
                      { key: "¿Afecta a personas?", val: "Sí — clientes solicitantes de productos de crédito" },
                      { key: "Modelo base", val: "XGBoost gradient boosting + reglas de negocio capa post-modelo" },
                      { key: "Datos de entrenamiento", val: "Histórico de créditos 2015–2022 · ~2.1M registros · Fuente: Core Banking" },
                      { key: "Proveedor / Origen", val: "Desarrollo interno · Equipo ML Banco Iberia" },
                      { key: "Responsable técnico", val: "Ana García · Lead ML Engineer" },
                      { key: "Fecha de despliegue", val: "Marzo 2022 · v2.3 activa desde Ene 2024" },
                      { key: "Entornos activos", val: "Producción (ES, PT) · Staging · No hay dev con datos reales" },
                      { key: "Documentación existente", val: "Parcial — falta documentación Anexo IV completa" },
                      { key: "Revisión humana", val: "Obligatoria para importes > 10.000€ · Automática para menores" },
                    ].map((r, i) => (
                      <div key={i} className="info-cell" style={
                        i === 0 ? { gridColumn: "1 / -1" } : {}
                      }>
                        <div className="info-key">{r.key}</div>
                        <div className="info-val">{r.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: ISO 42001 */}
              {activeTab === "ISO 42001" && (
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Evaluación ISO 42001 — Controles relevantes</span>
                    <span className="badge badge-gray">Madurez org. 28%</span>
                  </div>
                  {[
                    { clause: "A.5.1 — Evaluación de impacto", level: 1, max: 3, desc: "No existe proceso formal de evaluación de impacto antes del despliegue de este sistema.", priority: "critico" },
                    { clause: "A.6.1 — Gestión de datos de IA", level: 2, max: 3, desc: "Los datos de entrenamiento están parcialmente documentados. Falta análisis de sesgo formal.", priority: "importante" },
                    { clause: "A.10.1 — Documentación técnica", level: 1, max: 3, desc: "Existe documentación interna pero no cumple el formato del Anexo IV del AI Act.", priority: "critico" },
                    { clause: "A.3.2 — Roles y responsabilidades", level: 2, max: 3, desc: "El responsable técnico está identificado. Falta definición formal del rol de CAIO.", priority: "importante" },
                  ].map((c, i) => (
                    <div key={i} style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1, fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }}>{c.clause}</span>
                        <span className={`badge ${c.priority === "critico" ? "badge-red" : "badge-amber"}`}>
                          {c.priority === "critico" ? "Crítico" : "Importante"}
                        </span>
                        <span style={{ fontSize: 12, fontFamily: "monospace", color: "var(--text-muted)" }}>Nivel {c.level}/{c.max}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 8 }}>{c.desc}</div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {Array.from({ length: c.max + 1 }).map((_, l) => (
                          <div key={l} style={{
                            flex: 1, height: 5, borderRadius: 3,
                            background: l <= c.level
                              ? (c.level < c.max ? "var(--amber)" : "var(--green)")
                              : "var(--bg-600)"
                          }} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB: HISTORIAL */}
              {activeTab === "Historial" && (
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Ciclo de vida del sistema</span>
                  </div>
                  <div className="timeline">
                    {timeline.map((t, i) => (
                      <div key={i} className="tl-item">
                        <div className="tl-track">
                          <div className={`tl-dot ${t.status}`} />
                          {i < timeline.length - 1 && (
                            <div className={`tl-line ${t.status === "done" ? "done" : ""}`} />
                          )}
                        </div>
                        <div className="tl-body">
                          <div className={`tl-title ${t.status === "pending" ? "pending" : ""}`}>{t.title}</div>
                          <div className="tl-meta">
                            <span>{t.meta}</span>
                            {t.status === "done" && <span className="badge badge-green" style={{ padding: "1px 6px", fontSize: 10 }}>✓ Completado</span>}
                            {t.status === "active" && <span className="badge badge-amber" style={{ padding: "1px 6px", fontSize: 10 }}>En curso</span>}
                            {t.badge && <span className="badge badge-gray" style={{ fontSize: 10 }}>{t.badge}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: EVIDENCIAS */}
              {activeTab === "Evidencias" && (
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Repositorio de evidencias</span>
                    <button className="btn btn-primary" style={{ fontSize: 11 }}>+ Añadir evidencia</button>
                  </div>
                  {[
                    { name: "Política de IA corporativa", type: "PDF", status: "ok", date: "10 Mar 2025", owner: "DPO", obligation: "Art. 13" },
                    { name: "Registro de métricas de rendimiento", type: "XLSX", status: "ok", date: "15 Feb 2025", owner: "Equipo ML", obligation: "Art. 15" },
                    { name: "Documentación técnica (borrador)", type: "DOCX", status: "partial", date: "01 Mar 2025", owner: "Ana García", obligation: "Art. 11" },
                  ].map((e, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bg-700)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                        {e.type === "PDF" ? "📄" : e.type === "XLSX" ? "📊" : "📝"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 3 }}>{e.name}</div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11.5, color: "var(--text-muted)", fontFamily: "monospace" }}>
                          <span>{e.type}</span>
                          <span>·</span>
                          <span>{e.date}</span>
                          <span>·</span>
                          <span>{e.owner}</span>
                        </div>
                      </div>
                      <span className="badge badge-blue" style={{ fontSize: 10 }}>{e.obligation}</span>
                      <span className={`badge ${e.status === "ok" ? "badge-green" : "badge-amber"}`}>
                        {e.status === "ok" ? "✓ Válida" : "◑ Incompleta"}
                      </span>
                      <button className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }}>↓ Ver</button>
                    </div>
                  ))}
                  <div style={{ padding: "14px 16px", background: "var(--red-dim)", borderTop: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 12.5, color: "var(--red)", marginBottom: 6, fontWeight: 500 }}>⚠ 5 obligaciones sin evidencia</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      Gestión de riesgos, datos de entrenamiento, logging, documentación técnica completa y registro EU requieren evidencias documentales antes de Ago 2026.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT PANEL */}
            <div className="right-panel">

              {/* COMPLIANCE RING */}
              <div className="card" style={{ overflow: "visible" }}>
                <div className="compliance-ring-wrap">
                  <div className="ring-relative">
                    <svg width="110" height="110" viewBox="0 0 110 110">
                      <circle cx="55" cy="55" r="44" fill="none" stroke="var(--bg-600)" strokeWidth="8" />
                      <circle cx="55" cy="55" r="44" fill="none"
                        stroke="var(--red)" strokeWidth="8"
                        strokeDasharray={`${2 * Math.PI * 44 * compliance / 100} ${2 * Math.PI * 44 * (1 - compliance / 100)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="ring-center">
                      <span className="ring-pct" style={{ color: "var(--red)" }}>{compliance}%</span>
                      <span className="ring-sub">AI Act</span>
                    </div>
                  </div>
                  <div className="ring-legend">
                    <div className="legend-item"><div className="legend-dot" style={{ background: "var(--green)" }} />1 OK</div>
                    <div className="legend-item"><div className="legend-dot" style={{ background: "var(--amber)" }} />2 parcial</div>
                    <div className="legend-item"><div className="legend-dot" style={{ background: "var(--red)" }} />5 gaps</div>
                  </div>
                </div>
                <div style={{ padding: "12px 16px 14px" }}>
                  <div className="risk-meter">
                    {[
                      { label: "Art. 9", pct: 0, color: "var(--red)" },
                      { label: "Art. 11", pct: 10, color: "var(--red)" },
                      { label: "Art. 14", pct: 55, color: "var(--amber)" },
                      { label: "Art. 15", pct: 40, color: "var(--amber)" },
                      { label: "Art. 13", pct: 100, color: "var(--green)" },
                    ].map((r, i) => (
                      <div key={i} className="risk-bar-row">
                        <div className="risk-bar-label">{r.label}</div>
                        <div className="risk-bar-track">
                          <div className="risk-bar-fill" style={{ width: `${r.pct}%`, background: r.color }} />
                        </div>
                        <div className="risk-bar-val">{r.pct}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* QUICK ACTIONS */}
              <div>
                <div style={{ fontSize: 10.5, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", marginBottom: 10 }}>Acciones rápidas</div>
                <div className="quick-actions">
                  {[
                    { icon: "📄", label: "Generar doc. técnica", sub: "Borrador Anexo IV" },
                    { icon: "⚠️", label: "Evaluar riesgos", sub: "Art. 9 · Plantilla" },
                    { icon: "🇪🇺", label: "Registro EU DB", sub: "Art. 71 · Formulario" },
                    { icon: "📋", label: "Gap report PDF", sub: "Exportar informe" },
                  ].map((a, i) => (
                    <div key={i} className="qa-btn">
                      <div className="qa-icon">{a.icon}</div>
                      <div>
                        <div className="qa-label">{a.label}</div>
                        <div className="qa-sub">{a.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PROVIDERS */}
              <div>
                <div style={{ fontSize: 10.5, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", marginBottom: 10 }}>Dependencias externas</div>
                <div className="card">
                  {[
                    { icon: "🏦", name: "Core Banking API", meta: "Datos · Contrato vigente", badge: "badge-green", bl: "OK" },
                    { icon: "☁️", name: "Azure ML · Inference", meta: "Infraestructura · Rev. pendiente", badge: "badge-amber", bl: "Revisar" },
                    { icon: "📊", name: "Bureau de crédito", meta: "Scores externos · GDPR activo", badge: "badge-blue", bl: "Activo" },
                  ].map((p, i) => (
                    <div key={i} className="provider-card">
                      <div className="provider-avatar">{p.icon}</div>
                      <div className="provider-body">
                        <div className="provider-name">{p.name}</div>
                        <div className="provider-meta">{p.meta}</div>
                      </div>
                      <span className={`badge ${p.badge}`} style={{ fontSize: 10 }}>{p.bl}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* RELATED SYSTEMS */}
              <div>
                <div style={{ fontSize: 10.5, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", marginBottom: 10 }}>Sistemas relacionados</div>
                <div className="card">
                  {[
                    { icon: "🔍", name: "Detección de Fraude", risk: "badge-red", rl: "Alto Riesgo" },
                    { icon: "📋", name: "Análisis KYC", risk: "badge-red", rl: "Alto Riesgo" },
                  ].map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderBottom: i === 0 ? "1px solid var(--border)" : "none", cursor: "pointer" }}>
                      <div style={{ width: 30, height: 30, borderRadius: 7, background: "var(--red-dim)", border: "1px solid var(--red-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{s.icon}</div>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                      <span className={`badge ${s.risk}`} style={{ fontSize: 10 }}>{s.rl}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
