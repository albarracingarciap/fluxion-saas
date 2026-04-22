'use client';
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { saveAISystem } from './actions';
import { buildIsoChecksSnapshot, calcISO, classifyAIAct, getStatusLabel } from '@/lib/ai-systems/scoring';

// ─────────────────────────────────────────────────────────────
// FLUXION DESIGN SYSTEM — Inventario de Sistemas IA
// 7 pasos · Clasificación AI Act automática · Score ISO 42001
// ─────────────────────────────────────────────────────────────

const CSS = `
  .wiz-wrapper {
    --cy:#00adef;--bl:#3871c1;--nv:#004aad;--cy-l:#33c3f5;
    --cy-d:#00adef11;--cy-b:#00adef35;--bl-d:#3871c111;--bl-b:#3871c130;
    --grad:linear-gradient(135deg,#00adef,#3871c1,#004aad);
    --grad-cy:linear-gradient(135deg,#00adef,#33c3f5);
    --d9:#070c14;--d8:#0d1520;--d7:#131f2e;--d6:#1a2840;--db:#1e3050;--dbl:#2a4268;
    --dt:#e8f0fe;--dt2:#7a9cc4;--dtm:#82a3c7;--dtd:#233249;
    --lt:#f0f5fc;--lc:#ffffff;--lc2:#f7faff;--lb:#dce8f7;--lbl:#b8d0ee;
    --lt1:#0d1b2e;--lt2:#4a6180;--ltm:#8aa2bc;
    --re:#d93025;--red:#d9302510;--reb:#d9302530;
    --gr:#1a8f38;--grd:#1a8f3812;--grb:#1a8f3830;
    --or:#c96b00;--ord:#c96b0012;--orb:#c96b0030;
    --pu:#6b3bbf;--pud:#6b3bbf12;--pub:#6b3bbf30;
    --te:#0b8a6d;--ted:#0b8a6d12;--teb:#0b8a6d30;
    display: flex;
    flex-direction: column;
    height: calc(100vh - 140px);
    overflow: hidden;
  }
  .wiz-wrapper * { box-sizing:border-box; font-family:'Sora',sans-serif; color:var(--lt1); }
  .wiz-wrapper ::-webkit-scrollbar{width:4px}
  .wiz-wrapper ::-webkit-scrollbar-thumb{background:var(--lbl);border-radius:2px}

  /* SIDEBAR */
  .sb{width:228px;background:var(--d8);border-right:1px solid var(--db);display:flex;flex-direction:column;flex-shrink:0}
  .logo-wrap{padding:14px 13px 13px;border-bottom:1px solid var(--db)}
  .logo-card{background:#fff;border-radius:11px;padding:9px 14px 8px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.9);cursor:pointer;transition:box-shadow .25s}
  .logo-card:hover{box-shadow:0 4px 16px rgba(0,173,239,.25),0 0 0 1px rgba(0,173,239,.2),inset 0 1px 0 rgba(255,255,255,.9)}
  .nav{flex:1;padding:10px 0;overflow-y:auto}
  .nav-g{padding:10px 16px 4px;font-size:9.5px;font-family:'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:1.2px;color:var(--dtm)}
  .nav-i{display:flex;align-items:center;gap:10px;padding:7px 12px;border-radius:8px;margin:1px 8px;font-size:13px;color:var(--dt2);cursor:pointer;transition:all .15s;border:1px solid transparent}
  .nav-i:hover{background:var(--d7);color:var(--dt)}
  .nav-i.on{background:var(--cy-d);color:var(--cy-l);border-color:var(--cy-b)}
  .nav-ico{font-size:14px;width:18px;text-align:center}
  .nav-badge{margin-left:auto;background:var(--re);color:#fff;font-size:9px;font-family:'IBM Plex Mono',monospace;padding:1px 5px;border-radius:8px;font-weight:700}
  .sb-foot{padding:12px;border-top:1px solid var(--db)}
  .org-chip{display:flex;align-items:center;gap:9px;padding:9px 11px;background:var(--d7);border-radius:9px;border:1px solid var(--db);cursor:pointer}
  .org-av{width:30px;height:30px;border-radius:8px;background:var(--grad);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff}
  .org-nm{font-size:12.5px;font-weight:600;color:var(--dt)}
  .org-rl{font-size:10px;color:var(--dtm);font-family:'IBM Plex Mono',monospace}

  /* MAIN */
  .main{flex:1;overflow:hidden;display:flex;flex-direction:column;min-width:0}
  .topbar{height:50px;background:var(--d8);border-bottom:1px solid var(--db);display:flex;align-items:center;padding:0 0 0 24px;gap:12px;flex-shrink:0}
  .bc{display:flex;align-items:center;gap:6px;font-size:12px;font-family:'IBM Plex Mono',monospace;color:var(--dtm)}
  .bc a{color:var(--dt2);cursor:pointer}
  .bc a:hover{color:var(--cy-l)}
  .bc .cur{color:var(--dt);font-weight:500}
  .tbr{margin-left:auto;display:flex;align-items:center;gap:8px;padding:0 20px}
  .btn{display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:7px;font-size:12.5px;cursor:pointer;border:none;font-family:'Sora',sans-serif;font-weight:500;transition:all .15s;white-space:nowrap}
  .btn-p{background:var(--grad-cy);color:#fff;box-shadow:0 2px 12px #00adef30}
  .btn-p:hover{transform:translateY(-1px);box-shadow:0 4px 18px #00adef45}
  .btn-g{background:transparent;color:var(--dt2);border:1px solid var(--db)}
  .btn-g:hover{background:var(--d7);color:var(--dt)}
  .btn-g2{background:var(--lb);color:var(--lt2);border:1px solid var(--lbl)}
  .btn-g2:hover{background:var(--lbl);color:var(--lt1)}
  .btn-te{background:var(--ted);color:var(--te);border:1px solid var(--teb)}
  .btn-te:hover{background:#0b8a6d20}

  /* WIZARD */
  .wiz{flex:1;overflow:hidden;display:grid;grid-template-columns:1fr 370px;background:var(--lc);border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.05);border:1px solid var(--lb)}
  .form-col{overflow-y:auto;display:flex;flex-direction:column;background:var(--lc)}

  /* STEP TRACK */
  .step-hd{padding:22px 30px 0;flex-shrink:0}
  .step-track{display:flex;align-items:flex-start;margin-bottom:26px}
  .step-conn{flex:1;height:2px;background:var(--lb);margin-top:14px}
  .step-conn.done{background:var(--cy-b)}
  .step-node{display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;flex-shrink:0}
  .step-circle{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:700;font-family:'IBM Plex Mono',monospace;border:2px solid var(--lb);background:var(--lc);color:var(--ltm);transition:all .2s;z-index:1}
  .step-node.done .step-circle{background:var(--grd);border-color:var(--gr);color:var(--gr)}
  .step-node.active .step-circle{background:var(--cy-d);border-color:var(--cy);color:var(--cy);box-shadow:0 0 14px #00adef20}
  .step-lbl{font-size:9px;font-family:'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:.5px;color:var(--ltm)}
  .step-node.active .step-lbl{color:var(--cy)}
  .step-node.done .step-lbl{color:var(--gr)}

  /* STEP TITLE */
  .step-ta{margin-bottom:22px}
  .step-eye{font-size:10px;font-family:'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:1.5px;color:var(--cy);margin-bottom:5px}
  .step-title{font-family:'Fraunces',serif;font-size:22px;font-weight:600;letter-spacing:-.4px;margin-bottom:5px;color:var(--lt1)}
  .step-sub{font-size:13px;color:var(--lt2);line-height:1.6}

  /* FORM BODY */
  .form-body{padding:0 30px 24px;flex:1}
  .field{margin-bottom:18px}
  .field-row{display:grid;gap:14px;margin-bottom:18px}
  .fr2{grid-template-columns:1fr 1fr}
  .fr3{grid-template-columns:1fr 1fr 1fr}
  .fr13{grid-template-columns:1fr 2fr}

  /* LABELS */
  .lbl{display:flex;align-items:center;gap:6px;font-size:11px;font-family:'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:.7px;color:var(--lt2);margin-bottom:6px}
  .lbl .req{color:var(--re);font-size:10px}
  .lbl .hint{color:var(--ltm);font-size:10px;text-transform:none;letter-spacing:0;font-family:'Sora',sans-serif;margin-left:auto}
  .reg-tag{font-size:9px;padding:1px 6px;border-radius:10px;font-family:'IBM Plex Mono',monospace;text-transform:none;letter-spacing:0;white-space:nowrap}
  .rt-aiact{background:var(--cy-d);color:var(--cy);border:1px solid var(--cy-b)}
  .rt-iso{background:var(--bl-d);color:var(--bl);border:1px solid var(--bl-b)}
  .rt-rgpd{background:var(--pud);color:var(--pu);border:1px solid var(--pub)}
  .rt-dora{background:var(--ted);color:var(--te);border:1px solid var(--teb)}

  /* INPUTS */
  .inp{width:100%;background:var(--lc);border:1px solid var(--lb);border-radius:8px;padding:9px 12px;font-size:13.5px;color:var(--lt1);font-family:'Sora',sans-serif;outline:none;transition:all .15s}
  .inp:focus{border-color:var(--cy);box-shadow:0 0 0 3px #00adef12}
  .inp:hover:not(:focus){border-color:var(--lbl)}
  .inp::placeholder{color:var(--ltm)}
  textarea.inp{resize:vertical;min-height:72px;line-height:1.6}
  select.inp{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%238aa2bc' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 11px center;padding-right:30px}
  .helper{font-size:11.5px;color:var(--ltm);margin-top:5px;line-height:1.5}

  /* OPTION CARDS */
  .opts{display:grid;gap:8px}
  .c2{grid-template-columns:1fr 1fr}
  .c3{grid-template-columns:1fr 1fr 1fr}
  .c4{grid-template-columns:1fr 1fr 1fr 1fr}
  .opt{padding:11px 13px;border-radius:8px;border:1.5px solid var(--lb);background:var(--lc);cursor:pointer;transition:all .15s;display:flex;align-items:flex-start;gap:9px}
  .opt:hover{border-color:var(--lbl);background:var(--lc2)}
  .opt.sel{border-color:var(--cy);background:var(--cy-d)}
  .opt.compact{flex-direction:column;align-items:center;gap:6px;padding:13px 10px;text-align:center}
  .opt-ico{font-size:18px;flex-shrink:0;margin-top:1px}
  .opt.compact .opt-ico{font-size:22px;margin-top:0}
  .opt-b{flex:1;min-width:0}
  .opt-lbl{font-size:13px;font-weight:600;margin-bottom:2px;color:var(--lt1)}
  .opt.sel .opt-lbl{color:var(--cy)}
  .opt.compact .opt-lbl{font-size:12px}
  .opt-desc{font-size:11.5px;color:var(--lt2);line-height:1.5}
  .opt-chk{width:17px;height:17px;border-radius:50%;border:2px solid var(--lb);flex-shrink:0;margin-top:2px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;transition:all .15s}
  .opt.sel .opt-chk{background:var(--cy);border-color:var(--cy);color:#fff}

  /* TOGGLES */
  .tgl-row{display:flex;align-items:center;justify-content:space-between;padding:11px 13px;background:var(--lc);border:1px solid var(--lb);border-radius:8px;margin-bottom:8px;cursor:pointer;transition:all .15s}
  .tgl-row:hover{border-color:var(--lbl)}
  .tgl-row.on{border-color:var(--cy-b);background:var(--cy-d)}
  .tgl-inf{flex:1}
  .tgl-lbl{font-size:13px;font-weight:500;margin-bottom:2px;color:var(--lt1)}
  .tgl-sub{font-size:11.5px;color:var(--lt2)}
  .tgl{width:38px;height:20px;border-radius:10px;background:var(--lb);border:1px solid var(--lbl);cursor:pointer;position:relative;transition:all .2s;flex-shrink:0}
  .tgl.on{background:var(--cy);border-color:var(--cy)}
  .tgl-k{width:14px;height:14px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;transition:all .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
  .tgl.on .tgl-k{left:20px}

  /* CHECKBOXES */
  .cb-grid{display:grid;gap:6px}
  .cb2{grid-template-columns:1fr 1fr}
  .cb3{grid-template-columns:1fr 1fr 1fr}
  .cb-i{display:flex;align-items:center;gap:9px;padding:8px 12px;background:var(--lc);border:1px solid var(--lb);border-radius:7px;cursor:pointer;transition:all .15s;font-size:12.5px;color:var(--lt1)}
  .cb-i:hover{border-color:var(--lbl);background:var(--lc2)}
  .cb-i.ck{border-color:var(--cy-b);background:var(--cy-d);color:var(--cy)}
  .cb-box{width:15px;height:15px;border-radius:4px;border:2px solid var(--lb);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;transition:all .15s}
  .cb-i.ck .cb-box{background:var(--cy);border-color:var(--cy);color:#fff}

  /* TAG INPUT */
  .tag-wrap{background:var(--lc);border:1px solid var(--lb);border-radius:8px;padding:7px;display:flex;flex-wrap:wrap;gap:5px;min-height:44px;cursor:text;transition:all .15s}
  .tag-wrap:focus-within{border-color:var(--cy);box-shadow:0 0 0 3px #00adef12}
  .tag{display:flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;background:var(--cy-d);border:1px solid var(--cy-b);color:var(--cy);font-size:11.5px;font-family:'IBM Plex Mono',monospace}
  .tag-x{cursor:pointer;opacity:.6;font-size:10px}
  .tag-x:hover{opacity:1}
  .tag-inp{border:none;background:transparent;outline:none;font-size:13px;color:var(--lt1);font-family:'Sora',sans-serif;min-width:100px;flex:1}
  .tag-inp::placeholder{color:var(--ltm)}

  /* SECTION DIVIDER */
  .sec-div{display:flex;align-items:center;gap:10px;margin:18px 0 14px}
  .sec-div-lbl{font-size:9.5px;font-family:'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:1px;color:var(--ltm);white-space:nowrap}
  .sec-div-line{flex:1;height:1px;background:var(--lb)}

  /* WARN BOX */
  .warn{padding:10px 14px;border-radius:8px;margin-bottom:14px;border:1px solid;display:flex;gap:9px;align-items:flex-start;font-size:12px;line-height:1.55}
  .warn.re{background:var(--red);border-color:var(--reb);color:var(--re)}
  .warn.or{background:var(--ord);border-color:var(--orb);color:var(--or)}
  .warn.cy{background:var(--cy-d);border-color:var(--cy-b);color:var(--cy)}
  .warn-ico{flex-shrink:0;font-size:14px}

  /* STEP NAV */
  .step-nav{padding:16px 30px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--lb);background:var(--lc2);flex-shrink:0}
  .step-prog{font-size:11.5px;font-family:'IBM Plex Mono',monospace;color:var(--ltm)}
  .step-btns{display:flex;gap:8px}

  /* PREVIEW */
  .prev-col{background:var(--d8);border-left:1px solid var(--db);display:flex;flex-direction:column;overflow:hidden}
  .prev-hd{padding:13px 17px;border-bottom:1px solid var(--db);display:flex;align-items:center;gap:8px;flex-shrink:0}
  .prev-dot{width:7px;height:7px;border-radius:50%;background:var(--cy);animation:ppulse 2s infinite}
  @keyframes ppulse{0%,100%{opacity:1}50%{opacity:.3}}
  .prev-ttl{font-size:12.5px;font-weight:600;color:var(--dt);flex:1}
  .prev-sub{font-size:9px;font-family:'IBM Plex Mono',monospace;color:var(--dtm);text-transform:uppercase;letter-spacing:.5px}
  .prev-body{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:12px}
  .p-sec{font-size:9.5px;font-family:'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:.8px;color:var(--dtm);margin-bottom:7px}

  /* SYSTEM CARD */
  .sys-card{background:var(--d7);border:1px solid var(--db);border-radius:10px;overflow:hidden}
  .sys-card-hd{padding:13px 15px;border-bottom:1px solid var(--db);display:flex;align-items:flex-start;gap:10px}
  .sys-card-ico{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;transition:all .3s}
  .sys-card-nm{font-family:'Fraunces',serif;font-size:15px;font-weight:600;color:var(--dt);margin-bottom:5px;line-height:1.3}
  .sys-card-tags{display:flex;gap:4px;flex-wrap:wrap}
  .sys-card-body{padding:11px 15px}
  .prev-row{display:flex;align-items:baseline;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--dtd);gap:10px}
  .prev-row:last-child{border-bottom:none}
  .prev-k{font-size:10px;font-family:'IBM Plex Mono',monospace;color:var(--dtm);text-transform:uppercase;letter-spacing:.4px;flex-shrink:0}
  .prev-v{font-size:12.5px;color:var(--dt2);text-align:right}
  .prev-empty{font-size:11px;color:var(--dtm);font-style:italic;font-family:'IBM Plex Mono',monospace}

  /* CLASSIFICATION */
  .cls-prev{border-radius:9px;padding:13px 15px;border:1px solid;transition:all .35s}
  .cls-unk{background:var(--d7);border-color:var(--db)}
  .cls-hi{background:var(--red);border-color:var(--reb)}
  .cls-li{background:var(--ord);border-color:var(--orb)}
  .cls-mi{background:var(--grd);border-color:var(--grb)}
  .cls-pr{background:#130808;border-color:#5a1010}
  .cls-gp{background:var(--bl-d);border-color:var(--bl-b)}
  .cls-tag{font-size:9.5px;font-family:'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px}
  .cls-unk .cls-tag{color:var(--dtm)} .cls-hi .cls-tag{color:var(--re)}
  .cls-li .cls-tag{color:var(--or)} .cls-mi .cls-tag{color:var(--gr)}
  .cls-pr .cls-tag{color:#f87171} .cls-gp .cls-tag{color:var(--cy-l)}
  .cls-val{font-family:'Fraunces',serif;font-size:17px;font-weight:600;margin-bottom:6px}
  .cls-unk .cls-val{color:var(--dtm)} .cls-hi .cls-val{color:var(--re)}
  .cls-li .cls-val{color:var(--or)} .cls-mi .cls-val{color:var(--gr)}
  .cls-pr .cls-val{color:#f87171} .cls-gp .cls-val{color:var(--cy-l)}
  .cls-basis{font-size:10px;font-family:'IBM Plex Mono',monospace;color:var(--dtm);margin-bottom:6px}
  .cls-reason{font-size:12px;color:var(--dt2);line-height:1.6;margin-bottom:8px}
  .cls-obls{display:flex;flex-direction:column;gap:3px;border-top:1px solid #ffffff08;padding-top:8px;margin-top:8px}
  .cls-obl{font-size:10.5px;font-family:'IBM Plex Mono',monospace;color:var(--dt2);display:flex;align-items:center;gap:5px}
  .cls-obl-dot{width:4px;height:4px;border-radius:50%;flex-shrink:0}
  .cls-hi .cls-obl-dot{background:var(--re)} .cls-li .cls-obl-dot{background:var(--or)}
  .cls-mi .cls-obl-dot{background:var(--gr)}

  /* ISO GAUGE */
  .iso-gauge{background:var(--d7);border:1px solid var(--db);border-radius:9px;padding:13px 15px}
  .iso-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
  .iso-ttl{font-size:9.5px;font-family:'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:.8px;color:var(--dtm)}
  .iso-pct{font-family:'Fraunces',serif;font-size:19px;font-weight:600}
  .iso-bar{height:5px;background:var(--d6);border-radius:3px;overflow:hidden;margin-bottom:10px}
  .iso-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--cy),var(--bl));transition:width .5s ease}
  .iso-items{display:flex;flex-direction:column;gap:4px}
  .iso-item{display:flex;align-items:center;gap:7px;font-size:10.5px;font-family:'IBM Plex Mono',monospace;color:var(--dt2)}
  .iso-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}
  .iso-dot.ok{background:var(--gr)} .iso-dot.partial{background:var(--or)} .iso-dot.no{background:var(--re)} .iso-dot.na{background:var(--dtm)}

  /* BADGES */
  .bdg{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:20px;font-size:10.5px;font-weight:500;font-family:'IBM Plex Mono',monospace}
  .b-cy{background:var(--cy-d);color:var(--cy);border:1px solid var(--cy-b)}
  .b-bl{background:var(--bl-d);color:var(--bl);border:1px solid var(--bl-b)}
  .b-re{background:var(--red);color:var(--re);border:1px solid var(--reb)}
  .b-gr{background:var(--grd);color:var(--gr);border:1px solid var(--grb)}
  .b-or{background:var(--ord);color:var(--or);border:1px solid var(--orb)}
  .b-gy{background:var(--d7);color:var(--dt2);border:1px solid var(--db)}
  .b-pu{background:var(--pud);color:var(--pu);border:1px solid var(--pub)}

  /* SPINNER */
  .spin{width:12px;height:12px;border-radius:50%;border:2px solid var(--cy-b);border-top-color:var(--cy);animation:sp .7s linear infinite;flex-shrink:0}
  @keyframes sp{to{transform:rotate(360deg)}}
  .analysis-row{display:flex;align-items:center;gap:8px;font-size:11.5px;font-family:'IBM Plex Mono',monospace;color:var(--cy);padding:8px 12px;background:var(--cy-d);border:1px solid var(--cy-b);border-radius:7px}

  /* COMPLETION */
  .comp-banner{background:linear-gradient(135deg,var(--grd),var(--ted));border:1px solid var(--grb);border-radius:10px;padding:18px;text-align:center}
  .comp-ico{font-size:32px;margin-bottom:8px}
  .comp-ttl{font-family:'Fraunces',serif;font-size:17px;font-weight:600;color:var(--gr);margin-bottom:5px}
  .comp-sub{font-size:12px;color:var(--dt2);line-height:1.6}

  @keyframes fi{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
  .fi{animation:fi .3s ease forwards}
`;

// ─── STATIC DATA ──────────────────────────────────────────────

const DOMAINS = [
  {v:"finanzas",l:"Finanzas y Banca",i:"🏦"},
  {v:"seguros",l:"Seguros",i:"🛡️"},
  {v:"credito",l:"Crédito y Scoring",i:"📊"},
  {v:"salud",l:"Salud y Medicina",i:"🏥"},
  {v:"rrhh",l:"RRHH y Empleo",i:"👥"},
  {v:"educacion",l:"Educación y Formación",i:"🎓"},
  {v:"seguridad",l:"Seguridad Pública",i:"🔒"},
  {v:"justicia",l:"Justicia y Legal",i:"⚖️"},
  {v:"migracion",l:"Migración y Fronteras",i:"🛂"},
  {v:"infra",l:"Infraestructura Crítica",i:"⚡"},
  {v:"marketing",l:"Marketing y Publicidad",i:"📣"},
  {v:"operaciones",l:"Operaciones Internas",i:"⚙️"},
  {v:"atencion",l:"Atención al Cliente",i:"💬"},
  {v:"cumplimiento",l:"Cumplimiento Normativo",i:"📋"},
  {v:"otro",l:"Otro",i:"◎"},
];

const OUTPUTS = [
  {v:"decision",l:"Decisión automática",d:"El sistema decide sin intervención humana",i:"⚡"},
  {v:"recomendacion",l:"Recomendación",d:"Sugiere al humano qué decidir",i:"💡"},
  {v:"clasificacion",l:"Clasificación / Scoring",d:"Asigna categorías, etiquetas o puntuaciones",i:"🏷️"},
  {v:"generacion",l:"Generación de contenido",d:"Crea texto, imágenes, código u otro contenido",i:"✍️"},
  {v:"prediccion",l:"Predicción / Estimación",d:"Estima un valor numérico o probabilidad futura",i:"📈"},
  {v:"deteccion",l:"Detección / Alerta",d:"Identifica anomalías, fraudes o eventos",i:"🔍"},
  {v:"optimizacion",l:"Optimización",d:"Mejora parámetros de un proceso automáticamente",i:"🔧"},
  {v:"otro",l:"Otro",i:"◎",d:""},
];

const AI_TYPES = [
  {v:"ml",l:"ML Tradicional",i:"📐",d:"Regresión, árboles, XGBoost..."},
  {v:"dl",l:"Deep Learning",i:"🧠",d:"Redes neuronales profundas"},
  {v:"llm",l:"LLM / Generativo",i:"💬",d:"GPT, Claude, Llama..."},
  {v:"agentico",l:"Sistema Agéntico",i:"🤖",d:"Toma acciones autónomas, usa herramientas"},
  {v:"reglas",l:"Reglas de Negocio",i:"📜",d:"Lógica determinista, no ML"},
  {v:"hibrido",l:"Híbrido",i:"🔀",d:"Combina ML + reglas u otros"},
  {v:"otro",l:"Otro",i:"◎",d:""},
];

const PROVIDERS = [
  {v:"interno",l:"Desarrollo interno",i:"🏠"},
  {v:"proveedor",l:"Proveedor externo",i:"🏢"},
  {v:"saas",l:"SaaS / API tercero",i:"☁️"},
  {v:"oss",l:"Open Source",i:"🔓"},
];

const TARGET_USERS = [
  "Clientes personas físicas","Clientes corporativos","Empleados internos",
  "Ciudadanos","Pacientes","Estudiantes","Administradores / Gestores",
  "Profesionales de la salud","Entidades financieras","Proveedores y socios",
  "Robots / Sistemas autónomos","Otro",
];

const DATA_TYPES = [
  "Datos de identificación","Datos financieros","Datos de comportamiento",
  "Datos de localización","Historial de crédito","Datos de empleo",
  "Datos de salud","Datos biométricos","Datos de comunicaciones",
  "Datos de dispositivos / IoT","Datos de redes sociales","Datos sintéticos","Otro",
];

const SPECIAL_CATS = [
  "Origen racial o étnico","Opiniones políticas","Creencias religiosas",
  "Datos biométricos (Art. 9)","Datos de salud","Datos genéticos",
  "Vida sexual / orientación","Datos sobre condenas penales",
];

const LEGAL_BASES = [
  {v:"consentimiento",l:"Consentimiento (Art. 6.1.a)"},
  {v:"contrato",l:"Ejecución de contrato (Art. 6.1.b)"},
  {v:"obligacion_legal",l:"Obligación legal (Art. 6.1.c)"},
  {v:"interes_vital",l:"Interés vital (Art. 6.1.d)"},
  {v:"interes_publico",l:"Interés público (Art. 6.1.e)"},
  {v:"interes_legitimo",l:"Interés legítimo (Art. 6.1.f)"},
];

const DATA_SOURCES = [
  "Datos propios de clientes","Bases de datos internas",
  "Proveedores de datos externos","Fuentes públicas / open data",
  "Web scraping","Datos de terceros / partners",
  "Datos sintéticos generados","Registros de sistemas propios",
];

const OVERSIGHT_TYPES = [
  {v:"previo",l:"Revisión previa a la decisión"},
  {v:"posterior",l:"Revisión posterior con posibilidad de reversión"},
  {v:"muestral",l:"Revisión muestral periódica"},
  {v:"umbral",l:"Intervención solo si supera umbral de riesgo"},
  {v:"auditoria",l:"Solo auditoría retrospectiva"},
];

const REVIEW_FREQS = [
  {v:"mensual",l:"Mensual"},{v:"trimestral",l:"Trimestral"},
  {v:"semestral",l:"Semestral"},{v:"anual",l:"Anual"},
  {v:"adhoc",l:"Ad-hoc / Sin periodicidad fija"},
];

const MLOPS = [
  {v:"mlflow",l:"MLflow"},{v:"azureml",l:"Azure ML"},
  {v:"sagemaker",l:"SageMaker"},{v:"vertex",l:"Vertex AI"},
  {v:"databricks",l:"Databricks"},{v:"ninguno",l:"Sin integración MLOps"},
  {v:"otro",l:"Otro"},
];

const ENVS = ["Producción","Preproducción","Staging","Desarrollo","Piloto","DR / Backup"];
const GEOS = ["España","Portugal","Resto UE","EEUU","LATAM","Global"];

// ─── HELPERS ──────────────────────────────────────────────────

function Toggle({on,onToggle,label,sub}){return(
  <div className={`tgl-row${on?" on":""}`} onClick={onToggle}>
    <div className="tgl-inf">
      <div className="tgl-lbl">{label}</div>
      {sub&&<div className="tgl-sub">{sub}</div>}
    </div>
    <div className={`tgl${on?" on":""}`}><div className="tgl-k"/></div>
  </div>
)}

function Opt({options,value,onChange,grid="c2",compact=false}){return(
  <div className={`opts ${grid}`}>
    {options.map(o=>(
      <div key={o.v} className={`opt${compact?" compact":""}${value===o.v?" sel":""}`} onClick={()=>onChange(o.v)}>
        <div className="opt-ico">{o.i}</div>
        {!compact&&<div className="opt-b"><div className="opt-lbl">{o.l}</div>{o.d&&<div className="opt-desc">{o.d}</div>}</div>}
        {compact&&<div className="opt-lbl">{o.l}</div>}
        {!compact&&<div className="opt-chk">{value===o.v&&"✓"}</div>}
      </div>
    ))}
  </div>
)}

function CBGrid({items,selected,onToggle,grid="cb2"}){return(
  <div className={`cb-grid ${grid}`}>
    {items.map((item,i)=>{
      const lbl=typeof item==="string"?item:item.l;
      const val=typeof item==="string"?item:item.v;
      const ck=selected.includes(val);
      return(
        <div key={i} className={`cb-i${ck?" ck":""}`} onClick={()=>onToggle(val)}>
          <div className="cb-box">{ck&&"✓"}</div>
          {lbl}
        </div>
      );
    })}
  </div>
)}

function SecDiv({label}){return(
  <div className="sec-div">
    <div className="sec-div-line"/>
    <div className="sec-div-lbl">{label}</div>
    <div className="sec-div-line"/>
  </div>
)}

function Lbl({children,req=false,hint,tags=[]}){return(
  <div className="lbl">
    {children}
    {req&&<span className="req">*</span>}
    {tags.map((t,i)=><span key={i} className={`reg-tag rt-${t}`}>{t.toUpperCase()}</span>)}
    {hint&&<span className="hint">{hint}</span>}
  </div>
)}

// ─── STEPS CONFIG ─────────────────────────────────────────────

const STEPS = [
  {id:1,lbl:"Identificación"},
  {id:2,lbl:"Propósito"},
  {id:3,lbl:"Impacto"},
  {id:4,lbl:"Datos"},
  {id:5,lbl:"Tecnología"},
  {id:6,lbl:"Gobierno"},
  {id:7,lbl:"Controles"},
];

// ─── INITIAL FORM ─────────────────────────────────────────────

const INIT = {
  // Step 1
  name:"",version:"1.0.0",internalId:"",domain:"",
  status:"",deployedAt:"",description:"",technicalDesc:"",tags:[],
  // Step 2
  intendedUse:"",prohibitedUses:"",outputType:"",fullyAutomated:null,
  interactsPersons:false,targetUsers:[],usageScale:"",geoScope:[],
  // Step 3
  isAISystem:null,isGPAI:false,prohibitedPractice:false,
  affectsPersons:null,vulnerableGroups:false,biometric:false,
  criticalInfra:false,hasMinors:false,
  // Step 4
  processesPersonalData:null,dataCategories:[],specialCategories:[],
  legalBases:[],dataSources:[],trainingDataDoc:null,
  dataVolume:"",dataRetention:"",dpiaCompleted:null,
  // Step 5
  aiSystemType:"",baseModel:"",externalModel:"",extProvider:"",
  frameworks:"",origin:"",hasFineTuning:false,
  hasExternalTools:false,environments:[],mlopsIntegration:"",
  // Step 6
  aiOwner:"",responsibleTeam:"",dpoInvolved:false,techLead:"",
  executiveSponsor:"",criticalProviders:"",reviewFrequency:"",
  hasSLA:false,incidentContact:"",
  // Step 7
  hasTechDoc:null,hasLogging:null,humanOversight:null,
  oversightType:"",hasComplaintMechanism:false,
  hasRiskAssessment:null,residualRisk:"",mitigationNotes:"",
  hasAdversarialTest:false,certStatus:"",nextAudit:"",
};

// ─── LIVE PREVIEW ─────────────────────────────────────────────

function LivePreview({f,step,analysing}){
  const cls = useMemo(()=>classifyAIAct(f),[f]);
  const iso = useMemo(()=>calcISO({
    aiOwner:f.aiOwner,hasTechDoc:f.hasTechDoc,hasLogging:f.hasLogging,
    humanOversight:f.humanOversight,hasRiskAssessment:f.hasRiskAssessment,
    dpoInvolved:f.dpoInvolved,reviewFrequency:f.reviewFrequency,
    incidentContact:f.incidentContact,dpiaCompleted:f.dpiaCompleted,
    hasAdversarialTest:f.hasAdversarialTest
  }),[f]);

  const domObj = DOMAINS.find(d=>d.v===f.domain);
  const outObj = OUTPUTS.find(o=>o.v===f.outputType);
  const statusColors = {produccion:"b-gr",desarrollo:"b-bl",piloto:"b-or",deprecado:"b-gy",retirado:"b-re"};
  
  const clsStyle = {prohibited:"cls-pr",gpai:"cls-gp",high:"cls-hi",limited:"cls-li",minimal:"cls-mi"}[cls?.level]||"cls-unk";

  const isoColor = iso.score>=70?"var(--gr)":iso.score>=40?"var(--or)":"var(--re)";

  return(
    <div className="prev-col">
      <div className="prev-hd">
        <div className="prev-dot"/>
        <div>
          <div className="prev-ttl">Vista previa en tiempo real</div>
          <div className="prev-sub">Se actualiza mientras completas</div>
        </div>
      </div>
      <div className="prev-body">

        {/* SYSTEM CARD */}
        <div>
          <div className="p-sec">Ficha del sistema</div>
          <div className="sys-card">
            <div className="sys-card-hd">
              <div className="sys-card-ico" style={{background:cls?.level==="high"?"var(--red)":cls?.level==="limited"?"var(--ord)":cls?.level==="minimal"?"var(--grd)":"var(--d6)"}}>
                {domObj?.i||"◎"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div className="sys-card-nm">
                  {f.name||<span style={{color:"var(--dtm)",fontStyle:"italic",fontSize:13}}>Nombre del sistema...</span>}
                </div>
                <div className="sys-card-tags">
                  {domObj&&<span className="bdg b-cy">{domObj.l}</span>}
                  {f.status&&<span className={`bdg ${statusColors[f.status]||"b-gy"}`}>{f.status.charAt(0).toUpperCase()+f.status.slice(1)}</span>}
                  {f.version&&f.version!=="1.0.0"&&<span className="bdg b-gy">v{f.version}</span>}
                </div>
              </div>
            </div>
            <div className="sys-card-body">
              {[
                {k:"Output",v:outObj?.l},
                {k:"Tipo IA",v:AI_TYPES.find(a=>a.v===f.aiSystemType)?.l},
                {k:"Afecta personas",v:f.affectsPersons===true?"Sí":f.affectsPersons===false?"No":null},
                {k:"Sup. humana",v:getStatusLabel(f.humanOversight)},
                {k:"Responsable",v:f.aiOwner||null},
                {k:"Revisión",v:REVIEW_FREQS.find(r=>r.v===f.reviewFrequency)?.l},
              ].map((r,i)=>(
                <div key={i} className="prev-row">
                  <div className="prev-k">{r.k}</div>
                  {r.v?<div className="prev-v">{r.v}</div>:<div className="prev-empty">— pendiente</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI ACT CLASSIFICATION */}
        <div>
          <div className="p-sec">Clasificación AI Act · Preliminar</div>
          {analysing?(
            <div className="analysis-row"><div className="spin"/>Analizando según AI Act...</div>
          ):(
            <div className={`cls-prev ${clsStyle}`}>
              <div className="cls-tag">{cls?"Clasificación detectada":"Pendiente de datos suficientes"}</div>
              <div className="cls-val">{cls?.label||"—"}</div>
              {cls&&<div className="cls-basis">{cls.basis}</div>}
              {cls&&<div className="cls-reason">{cls.reason}</div>}
              {!cls&&<div className="cls-reason" style={{color:"var(--dtm)"}}>Completa al menos dominio, tipo de output y si afecta a personas.</div>}
              {cls?.obls?.length>0&&(
                <div className="cls-obls">
                  {cls.obls.slice(0,5).map((o,i)=>(
                    <div key={i} className="cls-obl"><div className="cls-obl-dot"/>{o}</div>
                  ))}
                  {cls.obls.length>5&&<div className="cls-obl" style={{color:"var(--dtm)"}}>+{cls.obls.length-5} obligaciones más</div>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ISO 42001 */}
        {step>=5&&(
          <div>
            <div className="p-sec">Madurez ISO 42001</div>
            <div className="iso-gauge">
              <div className="iso-hd">
                <div className="iso-ttl">Score de gobierno IA</div>
                <div className="iso-pct" style={{color:isoColor}}>{iso.score}%</div>
              </div>
              <div className="iso-bar"><div className="iso-fill" style={{width:`${iso.score}%`}}/></div>
              <div className="iso-items">
                {iso.checks.filter(c=>!c.na).map((c,i)=>(
                  <div key={i} className="iso-item">
                    <div className={`iso-dot ${c.ok?"ok":c.partial?"partial":"no"}`}/>
                    {c.ok?"✓":c.partial?"~":"-"} {c.lbl}
                  </div>
                ))}
                {iso.checks.filter(c=>c.na).length>0&&(
                  <div className="iso-item"><div className="iso-dot na"/>···  {iso.checks.filter(c=>c.na).length} ítems pendientes</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* COMPLETION */}
        {step===7&&f.name&&f.domain&&cls&&(
          <div className="comp-banner fi">
            <div className="comp-ico">✓</div>
            <div className="comp-ttl">Listo para registrar</div>
            <div className="comp-sub">El sistema quedará en el inventario y el agente iniciará la evaluación de conformidad formal.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── STEP FORMS ───────────────────────────────────────────────

function Step1({f,set,tags,setTags,tagInput,setTagInput}){
  const addTag=e=>{if(e.key==="Enter"&&tagInput.trim()){setTags([...tags,tagInput.trim()]);setTagInput("")}}
  const rmTag=i=>setTags(tags.filter((_,j)=>j!==i));
  return(<>
    <div className="field-row fr2">
      <div className="field">
        <Lbl req>Nombre del sistema</Lbl>
        <input className="inp" placeholder="ej. Motor de Scoring Crediticio" value={f.name} onChange={e=>set("name",e.target.value)}/>
      </div>
      <div className="field">
        <Lbl hint="Semver recomendado">Versión</Lbl>
        <input className="inp" placeholder="1.0.0" value={f.version} onChange={e=>set("version",e.target.value)}/>
      </div>
    </div>
    <div className="field-row fr2">
      <div className="field">
        <Lbl req>Dominio de aplicación <span className="req">*</span></Lbl>
        <select className="inp" value={f.domain} onChange={e=>set("domain",e.target.value)}>
          <option value="">Seleccionar dominio...</option>
          {DOMAINS.map(d=><option key={d.v} value={d.v}>{d.i} {d.l}</option>)}
        </select>
      </div>
      <div className="field">
        <Lbl req>Estado actual</Lbl>
        <select className="inp" value={f.status} onChange={e=>set("status",e.target.value)}>
          <option value="">Seleccionar estado...</option>
          {[["produccion","🟢 Producción"],["desarrollo","🔵 Desarrollo"],["piloto","🟡 Piloto / Testing"],["deprecado","⚫ Deprecado"],["retirado","🔴 Retirado"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
      </div>
    </div>
    <div className="field-row fr2">
      <div className="field">
        <Lbl hint="Código de activo interno">ID interno / código</Lbl>
        <input className="inp" placeholder="ej. SYS-042" value={f.internalId} onChange={e=>set("internalId",e.target.value)}/>
      </div>
      <div className="field">
        <Lbl>Fecha de primer despliegue</Lbl>
        <input type="date" className="inp" value={f.deployedAt} onChange={e=>set("deployedAt",e.target.value)}/>
      </div>
    </div>
    <div className="field">
      <Lbl req>Descripción para directivos</Lbl>
      <textarea className="inp" placeholder="¿Qué hace este sistema? ¿Para qué se usa? Explícalo como si hablaras con el CEO." value={f.description} onChange={e=>set("description",e.target.value)} rows={3}/>
    </div>
    <div className="field">
      <Lbl hint="Opcional">Descripción técnica</Lbl>
      <textarea className="inp" placeholder="Arquitectura del sistema, flujo de datos, algoritmos empleados, integraciones..." value={f.technicalDesc} onChange={e=>set("technicalDesc",e.target.value)} rows={3}/>
    </div>
    <div className="field">
      <Lbl>Etiquetas / palabras clave</Lbl>
      <div className="tag-wrap" onClick={()=>document.getElementById("tag-inp").focus()}>
        {tags.map((t,i)=><span key={i} className="tag">{t}<span className="tag-x" onClick={()=>rmTag(i)}>✕</span></span>)}
        <input id="tag-inp" className="tag-inp" placeholder="Añadir etiqueta y pulsar Enter..." value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={addTag}/>
      </div>
      <div className="helper">Facilita la búsqueda y agrupación en el inventario.</div>
    </div>
  </>);
}

function Step2({f,set,cbToggle}){return(<>
  <div className="field">
    <Lbl req tags={["aiact"]}>Uso previsto (intended use)</Lbl>
    <textarea className="inp" placeholder="Describe con precisión para qué se usa este sistema, en qué contextos y bajo qué condiciones. Este texto formará parte de la documentación técnica Art. 11 AI Act." value={f.intendedUse} onChange={e=>set("intendedUse",e.target.value)} rows={4}/>
    <div className="helper">Artículo 11 AI Act — este campo es obligatorio para sistemas de alto riesgo.</div>
  </div>
  <div className="field">
    <Lbl>Usos prohibidos / fuera de alcance</Lbl>
    <textarea className="inp" placeholder="¿Para qué NO debe usarse este sistema? ¿Qué usos están expresamente prohibidos?" value={f.prohibitedUses} onChange={e=>set("prohibitedUses",e.target.value)} rows={2}/>
  </div>
  <div className="field">
    <Lbl req tags={["aiact"]}>Tipo de output que produce <span className="req">*</span></Lbl>
    <Opt options={OUTPUTS} value={f.outputType} onChange={v=>set("outputType",v)} grid="c2"/>
  </div>
  <div className="field">
    <Lbl req tags={["aiact"]}>¿Las decisiones o recomendaciones son totalmente automáticas?</Lbl>
    <Opt options={[
      {v:true,l:"Sí — completamente automático",d:"No hay intervención humana antes de aplicar el output",i:"⚡"},
      {v:false,l:"No — siempre hay revisión humana",d:"Un analista puede modificar o revertir antes de aplicar",i:"👤"},
    ]} value={f.fullyAutomated} onChange={v=>set("fullyAutomated",v==="true"||v===true)} grid="c2"/>
  </div>
  <Toggle on={f.interactsPersons} onToggle={()=>set("interactsPersons",!f.interactsPersons)}
    label="El sistema interactúa directamente con personas en tiempo real"
    sub="Chatbot, asistente virtual, recomendador con interfaz de usuario, etc."/>
  <SecDiv label="Alcance"/>
  <div className="field">
    <Lbl>Usuarios / colectivos objetivo</Lbl>
    <CBGrid items={TARGET_USERS} selected={f.targetUsers} onToggle={v=>cbToggle("targetUsers",v)} grid="cb2"/>
  </div>
  <div className="field-row fr2">
    <div className="field">
      <Lbl>Escala de uso</Lbl>
      <select className="inp" value={f.usageScale} onChange={e=>set("usageScale",e.target.value)}>
        <option value="">Seleccionar...</option>
        {["<100 decisiones/mes","100-1.000/mes","1.000-10.000/mes","10.000-100.000/mes",">100.000/mes"].map(v=><option key={v} value={v}>{v}</option>)}
      </select>
    </div>
    <div className="field">
      <Lbl>Geografía de despliegue</Lbl>
      <CBGrid items={GEOS} selected={f.geoScope} onToggle={v=>cbToggle("geoScope",v)} grid="cb3"/>
    </div>
  </div>
</>);}

function Step3({f,set}){return(<>
  {f.prohibitedPractice&&(
    <div className="warn re"><span className="warn-ico">⛔</span>
      <span><strong>Práctica prohibida detectada.</strong> Este sistema no puede desplegarse en la UE según el Art. 5 del AI Act. Debes rediseñarlo o retirarlo.</span>
    </div>
  )}
  <div className="field">
    <Lbl req tags={["aiact"]}>¿Es este un sistema de inteligencia artificial?</Lbl>
    <Opt options={[
      {v:true,l:"Sí, es un sistema de IA",d:"Usa aprendizaje automático, lógica estadística u otras técnicas de IA",i:"🤖"},
      {v:"gpai",l:"Es un modelo GPAI",d:"Modelo de IA de propósito general (GPT, Claude, Llama, Mistral...)",i:"🧩"},
      {v:false,l:"No, no es IA",d:"Software determinista, reglas de negocio simples sin aprendizaje",i:"⚙️"},
    ]} value={f.isGPAI?"gpai":f.isAISystem} onChange={v=>{
      if(v==="gpai"){set("isAISystem",true);set("isGPAI",true)}
      else{set("isAISystem",v===true||v==="true");set("isGPAI",false)}
    }} grid="c3"/>
  </div>
  {f.isAISystem!==false&&(
  <div className="field">
    <Lbl req tags={["aiact"]}>¿Las salidas del sistema afectan directamente a personas físicas?</Lbl>
    <Opt options={[
      {v:true,l:"Sí — afecta a personas",d:"Las salidas impactan en derechos, acceso a servicios o situación de personas identificables",i:"👤"},
      {v:false,l:"No — solo procesos internos",d:"Opera sobre datos o procesos de negocio sin impacto directo en personas físicas",i:"⚙️"},
    ]} value={f.affectsPersons} onChange={v=>set("affectsPersons",v===true||v==="true")} grid="c2"/>
  </div>)}
  <SecDiv label="Características de riesgo específicas"/>
  <Toggle on={f.biometric} onToggle={()=>set("biometric",!f.biometric)}
    label="Procesa datos biométricos" sub="Rostro, voz, huella dactilar, marcha, patrones de comportamiento → Anexo III §1"/>
  <Toggle on={f.criticalInfra} onToggle={()=>set("criticalInfra",!f.criticalInfra)}
    label="Gestiona infraestructura crítica" sub="Energía, agua, transporte, sistemas financieros → Anexo III §2"/>
  <Toggle on={f.vulnerableGroups} onToggle={()=>set("vulnerableGroups",!f.vulnerableGroups)}
    label="Puede afectar a grupos vulnerables" sub="Menores, personas mayores, personas con discapacidad, situación económica precaria"/>
  <Toggle on={f.hasMinors} onToggle={()=>set("hasMinors",!f.hasMinors)}
    label="Puede interactuar con o procesar datos de menores de edad" sub="Requiere salvaguardias adicionales"/>
  <Toggle on={f.prohibitedPractice} onToggle={()=>set("prohibitedPractice",!f.prohibitedPractice)}
    label="⚠️ El sistema podría constituir una práctica prohibida (Art. 5)" sub="Manipulación subliminal, scoring social, biometría remota en espacios públicos en tiempo real..."/>
</>);}

function Step4({f,set,cbToggle}){return(<>
  <div className="field">
    <Lbl req tags={["rgpd"]}>¿El sistema trata datos personales?</Lbl>
    <Opt options={[
      {v:true,l:"Sí, trata datos personales",d:"El sistema procesa información que identifica o puede identificar a personas",i:"🔒"},
      {v:false,l:"No, solo datos anonimizados / agregados",d:"Sin posibilidad de reidentificación",i:"📊"},
    ]} value={f.processesPersonalData} onChange={v=>set("processesPersonalData",v===true||v==="true")} grid="c2"/>
  </div>
  {f.processesPersonalData&&(<>
    <div className="field">
      <Lbl tags={["rgpd"]}>Categorías de datos personales tratados</Lbl>
      <CBGrid items={DATA_TYPES} selected={f.dataCategories} onToggle={v=>cbToggle("dataCategories",v)} grid="cb2"/>
    </div>
    {f.dataCategories.some(c=>["Datos biométricos","Datos de salud","Datos genéticos"].includes(c))&&(
      <div className="warn or"><span className="warn-ico">⚠️</span>
        <span>Has seleccionado categorías especiales (Art. 9 RGPD). Requieren base legal específica y medidas reforzadas.</span>
      </div>
    )}
    <div className="field">
      <Lbl tags={["rgpd"]}>Categorías especiales Art. 9 RGPD</Lbl>
      <CBGrid items={SPECIAL_CATS} selected={f.specialCategories} onToggle={v=>cbToggle("specialCategories",v)} grid="cb2"/>
    </div>
    <div className="field">
      <Lbl req tags={["rgpd"]}>Base(s) legal(es) del tratamiento</Lbl>
      <CBGrid items={LEGAL_BASES} selected={f.legalBases} onToggle={v=>cbToggle("legalBases",v)} grid="cb2"/>
    </div>
  </>)}
  <SecDiv label="Origen y ciclo de vida de los datos"/>
  <div className="field">
    <Lbl>Fuentes de datos de entrada</Lbl>
    <CBGrid items={DATA_SOURCES} selected={f.dataSources} onToggle={v=>cbToggle("dataSources",v)} grid="cb2"/>
  </div>
  <div className="field-row fr2">
    <div className="field">
      <Lbl tags={["aiact"]}>Volumen de datos</Lbl>
      <select className="inp" value={f.dataVolume} onChange={e=>set("dataVolume",e.target.value)}>
        <option value="">Seleccionar...</option>
        {["<1 GB","1-100 GB","100 GB - 1 TB","1-10 TB",">10 TB","Desconocido"].map(v=><option key={v} value={v}>{v}</option>)}
      </select>
    </div>
    <div className="field">
      <Lbl>Retención de datos</Lbl>
      <select className="inp" value={f.dataRetention} onChange={e=>set("dataRetention",e.target.value)}>
        <option value="">Seleccionar...</option>
        {["<6 meses","6-12 meses","1-3 años","3-5 años",">5 años","Sin política definida"].map(v=><option key={v} value={v}>{v}</option>)}
      </select>
    </div>
  </div>
  <div className="field">
    <Lbl tags={["aiact"]}>¿Están documentados los datos de entrenamiento y su calidad?</Lbl>
    <Opt options={[
      {v:"si",l:"Sí, documentados",i:"✅"},{v:"parcial",l:"Parcialmente",i:"🟡"},{v:"no",l:"No documentados",i:"❌"}
    ]} value={f.trainingDataDoc} onChange={v=>set("trainingDataDoc",v)} grid="c3"/>
    <div className="helper">Obligatorio para sistemas de alto riesgo — Art. 10 AI Act.</div>
  </div>
  <div className="field">
    <Lbl tags={["rgpd"]}>¿Se ha realizado una Evaluación de Impacto (DPIA)?</Lbl>
    <Opt options={[
      {v:"si",l:"Sí, completada",i:"✅"},{v:"proceso",l:"En proceso",i:"🔄"},{v:"no",l:"No realizada",i:"❌"}
    ]} value={f.dpiaCompleted} onChange={v=>set("dpiaCompleted",v)} grid="c3"/>
    <div className="helper">Obligatoria si hay tratamiento a gran escala de datos sensibles o perfilado de personas.</div>
  </div>
</>);}

function Step5({f,set,cbToggle}){return(<>
  <div className="field">
    <Lbl req tags={["aiact"]}>Tipo de sistema de IA</Lbl>
    <div className="opts c4">
      {AI_TYPES.map(o=>(
        <div key={o.v} className={`opt compact${f.aiSystemType===o.v?" sel":""}`} onClick={()=>set("aiSystemType",o.v)}>
          <div className="opt-ico">{o.i}</div>
          <div className="opt-lbl">{o.l}</div>
          <div className="opt-desc" style={{fontSize:10.5}}>{o.d}</div>
        </div>
      ))}
    </div>
  </div>
  {f.aiSystemType==="agentico"&&(
    <div className="warn cy"><span className="warn-ico">🤖</span>
      <span><strong>Sistema agéntico detectado.</strong> Requiere perfilado de riesgo específico: grafo de herramientas, checkpoints de supervisión, logging de cada acción y protocolo de interrupción humana.</span>
    </div>
  )}
  <div className="field-row fr2">
    <div className="field">
      <Lbl req tags={["aiact"]}>Modelo / Algoritmo base</Lbl>
      <input className="inp" placeholder="ej. XGBoost, GPT-4o, BERT, Random Forest..." value={f.baseModel} onChange={e=>set("baseModel",e.target.value)}/>
    </div>
    <div className="field">
      <Lbl tags={["aiact"]}>Origen del sistema</Lbl>
      <div className="opts c4">
        {PROVIDERS.map(o=>(
          <div key={o.v} className={`opt compact${f.origin===o.v?" sel":""}`} onClick={()=>set("origin",o.v)}>
            <div className="opt-ico">{o.i}</div>
            <div className="opt-lbl">{o.l}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
  {(f.origin==="saas"||f.origin==="proveedor")&&(
    <div className="field-row fr2">
      <div className="field">
        <Lbl tags={["dora"]}>Modelo fundacional externo</Lbl>
        <input className="inp" placeholder="ej. claude-3-5-sonnet, gpt-4o..." value={f.externalModel} onChange={e=>set("externalModel",e.target.value)}/>
      </div>
      <div className="field">
        <Lbl tags={["dora"]}>Proveedor del modelo</Lbl>
        <input className="inp" placeholder="ej. Anthropic, OpenAI, Google, Meta..." value={f.extProvider} onChange={e=>set("extProvider",e.target.value)}/>
        <div className="helper">DORA: si es proveedor TIC crítico, debe registrarse.</div>
      </div>
    </div>
  )}
  <div className="field">
    <Lbl>Frameworks y librerías principales</Lbl>
    <input className="inp" placeholder="ej. PyTorch 2.1, scikit-learn 1.3, LangChain, FastAPI..." value={f.frameworks} onChange={e=>set("frameworks",e.target.value)}/>
  </div>
  <Toggle on={f.hasFineTuning} onToggle={()=>set("hasFineTuning",!f.hasFineTuning)}
    label="Se aplica fine-tuning o reentrenamiento sobre modelo base"
    sub="El modelo base se adapta con datos propios"/>
  <Toggle on={f.hasExternalTools} onToggle={()=>set("hasExternalTools",!f.hasExternalTools)}
    label="El sistema usa herramientas o APIs externas (capacidad agéntica)"
    sub="Acceso a internet, bases de datos, sistemas externos, ejecución de código..."/>
  <SecDiv label="Infraestructura"/>
  <div className="field-row fr2">
    <div className="field">
      <Lbl>Entornos activos</Lbl>
      <CBGrid items={ENVS} selected={f.environments} onToggle={v=>cbToggle("environments",v)} grid="cb3"/>
    </div>
    <div className="field">
      <Lbl tags={["aiact","iso"]}>Integración MLOps</Lbl>
      <select className="inp" value={f.mlopsIntegration} onChange={e=>set("mlopsIntegration",e.target.value)}>
        <option value="">Seleccionar...</option>
        {MLOPS.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
      </select>
      <div className="helper">Facilita el cumplimiento del Art. 12 (logging) y el gobierno del ciclo de vida.</div>
    </div>
  </div>
</>);}

function Step6({f,set}){return(<>
  <div className="field-row fr2">
    <div className="field">
      <Lbl req tags={["aiact","iso"]}>Responsable del sistema IA (AI Owner)</Lbl>
      <input className="inp" placeholder="Nombre y apellidos" value={f.aiOwner} onChange={e=>set("aiOwner",e.target.value)}/>
    </div>
    <div className="field">
      <Lbl req tags={["iso"]}>Equipo responsable</Lbl>
      <input className="inp" placeholder="ej. Equipo ML, Riesgo Operacional..." value={f.responsibleTeam} onChange={e=>set("responsibleTeam",e.target.value)}/>
    </div>
  </div>
  <div className="field-row fr2">
    <div className="field">
      <Lbl>Responsable técnico</Lbl>
      <input className="inp" placeholder="Lead técnico / arquitecto del sistema" value={f.techLead} onChange={e=>set("techLead",e.target.value)}/>
    </div>
    <div className="field">
      <Lbl>Sponsor ejecutivo</Lbl>
      <input className="inp" placeholder="Director / VP que aprueba el sistema" value={f.executiveSponsor} onChange={e=>set("executiveSponsor",e.target.value)}/>
    </div>
  </div>
  <Toggle on={f.dpoInvolved} onToggle={()=>set("dpoInvolved",!f.dpoInvolved)}
    label="El DPO ha revisado este sistema" sub="Obligatorio si trata datos personales o categorías especiales (RGPD + Art. 26 AI Act)"/>
  <Toggle on={f.hasSLA} onToggle={()=>set("hasSLA",!f.hasSLA)}
    label="Existe un SLA o acuerdo de nivel de servicio definido" sub="Define disponibilidad, tiempo de respuesta ante incidentes y penalizaciones"/>
  <SecDiv label="Mantenimiento y supervisión"/>
  <div className="field-row fr2">
    <div className="field">
      <Lbl req tags={["aiact","iso"]}>Periodicidad de revisión del sistema</Lbl>
      <select className="inp" value={f.reviewFrequency} onChange={e=>set("reviewFrequency",e.target.value)}>
        <option value="">Seleccionar...</option>
        {REVIEW_FREQS.map(r=><option key={r.v} value={r.v}>{r.l}</option>)}
      </select>
      <div className="helper">Obligatorio para sistemas de alto riesgo — revisión formal del sistema de gestión de riesgos.</div>
    </div>
    <div className="field">
      <Lbl tags={["aiact","dora"]}>Contacto de incidentes / alertas IA</Lbl>
      <input className="inp" placeholder="email o canal de escalado" value={f.incidentContact} onChange={e=>set("incidentContact",e.target.value)}/>
    </div>
  </div>
  <div className="field">
    <Lbl tags={["dora"]}>Proveedores TIC críticos (DORA)</Lbl>
    <input className="inp" placeholder="ej. Anthropic (Claude), OpenAI (GPT), AWS, Azure, GCP..." value={f.criticalProviders} onChange={e=>set("criticalProviders",e.target.value)}/>
    <div className="helper">DORA Art. 28 — los proveedores TIC que prestan servicios críticos deben registrarse y gestionarse formalmente.</div>
  </div>
</>);}

function Step7({f,set}){return(<>
  <div className="field">
    <Lbl req tags={["aiact"]}>Documentación técnica disponible (Art. 11)</Lbl>
    <Opt options={[
      {v:"si",l:"Sí, completa",i:"✅",d:"Cubre todos los requisitos del Anexo IV"},
      {v:"parcial",l:"Parcialmente",i:"🟡",d:"Existe pero no cubre todos los requisitos"},
      {v:"no",l:"No existe",i:"❌",d:"Sin documentación técnica formal"},
    ]} value={f.hasTechDoc} onChange={v=>set("hasTechDoc",v)} grid="c3"/>
    {f.hasTechDoc==="no"&&<div className="warn re" style={{marginTop:10}}><span className="warn-ico">⚠️</span><span>La documentación técnica es <strong>obligatoria</strong> para sistemas de alto riesgo. Gap crítico detectado.</span></div>}
  </div>
  <div className="field">
    <Lbl req tags={["aiact"]}>Logging / registro de actividad (Art. 12)</Lbl>
    <Opt options={[
      {v:"si",l:"Sí, logging activo",i:"📋",d:"Registra inputs, outputs, decisiones y eventos relevantes"},
      {v:"parcial",l:"Parcial",i:"🟡",d:"Logging básico pero no cubre todos los requisitos"},
      {v:"no",l:"No hay logging",i:"❌",d:"Sin registro de actividad del sistema"},
    ]} value={f.hasLogging} onChange={v=>set("hasLogging",v)} grid="c3"/>
  </div>
  <div className="field">
    <Lbl req tags={["aiact","iso"]}>Supervisión humana (Art. 14)</Lbl>
    <Opt options={[
      {v:"si",l:"Sí, supervisión activa",i:"👤",d:"Humanos pueden intervenir, pausar o revertir"},
      {v:"parcial",l:"Supervisión parcial",i:"🔍",d:"Solo en casos de umbral o muestreo"},
      {v:"no",l:"Sin supervisión humana",i:"⚡",d:"El sistema opera completamente autónomo"},
    ]} value={f.humanOversight} onChange={v=>set("humanOversight",v)} grid="c3"/>
    {f.humanOversight!=="si"&&f.affectsPersons&&<div className="warn or" style={{marginTop:10}}><span className="warn-ico">⚠️</span><span>La supervisión humana es <strong>obligatoria</strong> para sistemas de alto riesgo que afectan a personas.</span></div>}
  </div>
  {(f.humanOversight==="si"||f.humanOversight==="parcial")&&(
    <div className="field">
      <Lbl>Tipo de supervisión humana</Lbl>
      <select className="inp" value={f.oversightType} onChange={e=>set("oversightType",e.target.value)}>
        <option value="">Seleccionar tipo...</option>
        {OVERSIGHT_TYPES.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  )}
  <SecDiv label="Evaluación de riesgos y conformidad"/>
  <div className="field">
    <Lbl tags={["aiact","iso"]}>Evaluación de riesgos completada (Art. 9)</Lbl>
    <Opt options={[
      {v:"si",l:"Sí, completada",i:"✅"},{v:"proceso",l:"En proceso",i:"🔄"},{v:"no",l:"Pendiente",i:"❌"}
    ]} value={f.hasRiskAssessment} onChange={v=>set("hasRiskAssessment",v)} grid="c3"/>
  </div>
  {(f.hasRiskAssessment==="si"||f.hasRiskAssessment==="proceso")&&(
    <div className="field-row fr2">
      <div className="field">
        <Lbl>Nivel de riesgo residual</Lbl>
        <select className="inp" value={f.residualRisk} onChange={e=>set("residualRisk",e.target.value)}>
          <option value="">Seleccionar...</option>
          {["Bajo","Medio","Alto","Muy alto","No determinado"].map(v=><option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <div className="field">
        <Lbl>Próxima auditoría planificada</Lbl>
        <input type="date" className="inp" value={f.nextAudit} onChange={e=>set("nextAudit",e.target.value)}/>
      </div>
    </div>
  )}
  <div className="field">
    <Lbl>Medidas de mitigación principales</Lbl>
    <textarea className="inp" placeholder="¿Qué controles, salvaguardias o medidas se han implementado para reducir el riesgo?" value={f.mitigationNotes} onChange={e=>set("mitigationNotes",e.target.value)} rows={2}/>
  </div>
  <Toggle on={f.hasAdversarialTest} onToggle={()=>set("hasAdversarialTest",!f.hasAdversarialTest)}
    label="Se han realizado pruebas de robustez / adversarial testing"
    sub="Art. 15 AI Act — precisión, robustez y resiliencia frente a ataques o manipulaciones"/>
  <Toggle on={f.hasComplaintMechanism} onToggle={()=>set("hasComplaintMechanism",!f.hasComplaintMechanism)}
    label="Existe mecanismo de reclamación para personas afectadas"
    sub="Art. 13 — las personas afectadas deben poder cuestionar las decisiones del sistema"/>
  <div className="field" style={{marginTop:8}}>
    <Lbl>Estado de certificación / conformidad</Lbl>
    <select className="inp" value={f.certStatus} onChange={e=>set("certStatus",e.target.value)}>
      <option value="">Seleccionar estado...</option>
      {["Declaración de conformidad emitida","En proceso de evaluación","Certificación CE obtenida","Pendiente de iniciar","No aplica"].map(v=><option key={v} value={v}>{v}</option>)}
    </select>
  </div>
</>);}

// ─── MAIN APP ─────────────────────────────────────────────────

const STEP_META = [
  {eye:"Paso 1 de 7",title:"Identificación del sistema",sub:"¿Cómo se llama, qué hace y en qué estado está este sistema?"},
  {eye:"Paso 2 de 7",title:"Propósito y función",sub:"¿Para qué se usa? ¿Qué tipo de output produce y a quién afecta?"},
  {eye:"Paso 3 de 7",title:"Impacto y clasificación AI Act",sub:"¿Qué tipo de sistema es y qué características de riesgo tiene?"},
  {eye:"Paso 4 de 7",title:"Datos e inputs",sub:"¿Qué datos trata el sistema y cuál es su base legal?"},
  {eye:"Paso 5 de 7",title:"Tecnología y arquitectura",sub:"¿Qué tecnología usa, cómo funciona y quién lo provee?"},
  {eye:"Paso 6 de 7",title:"Gobierno y responsabilidad",sub:"¿Quién es responsable y cómo se supervisa?"},
  {eye:"Paso 7 de 7",title:"Controles y documentación",sub:"¿Qué salvaguardias, documentación y evidencias existen?"},
];

export default function NewInventorySystemPage(){
  const router = useRouter();
  const [step,setStep]=useState(1);
  const [f,setF]=useState(INIT);
  const [tags,setTags]=useState([]);
  const [tagInput,setTagInput]=useState("");
  const [analysing,setAnalysing]=useState(false);
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState(null);

  const set=(k,v)=>{
    setF(prev=>({...prev,[k]:v}));
    if(["domain","outputType","affectsPersons","biometric","criticalInfra","isAISystem","isGPAI","prohibitedPractice","interactsPersons"].includes(k)){
      setAnalysing(true);
      setTimeout(()=>setAnalysing(false),700);
    }
  };

  const cbToggle=(key,val)=>setF(prev=>({
    ...prev,[key]:prev[key].includes(val)?prev[key].filter(x=>x!==val):[...prev[key],val]
  }));

  const canNext=()=>{
    if(step===1) return f.name.trim().length>2&&!!f.domain&&!!f.status;
    if(step===2) return !!f.outputType&&f.fullyAutomated!==null;
    if(step===3) return f.isAISystem!==null;
    if(step===4) return f.processesPersonalData!==null;
    return true;
  };

  const handleRegister = async () => {
    setSaving(true);
    setSaveError(null);
    // Enrich with computed classification
    const cls = classifyAIAct({...f, tags});
    const iso = calcISO({
      aiOwner:f.aiOwner, hasTechDoc:f.hasTechDoc, hasLogging:f.hasLogging,
      humanOversight:f.humanOversight, hasRiskAssessment:f.hasRiskAssessment,
      dpoInvolved:f.dpoInvolved, reviewFrequency:f.reviewFrequency,
      incidentContact:f.incidentContact, dpiaCompleted:f.dpiaCompleted,
      hasAdversarialTest:f.hasAdversarialTest
    });
    const payload = {
      ...f,
      tags,
      aiact_risk_level: cls?.level ?? 'pending',
      aiact_risk_basis: cls?.basis ?? null,
      aiact_risk_reason: cls?.reason ?? null,
      aiact_obligations: cls?.obls ?? [],
      iso_42001_score: iso.score,
      iso_42001_checks: buildIsoChecksSnapshot(iso.checks),
    };
    const result = await saveAISystem(payload);
    setSaving(false);
    if(result?.error) {
      setSaveError(result.error);
    } else {
      router.push('/inventario');
    }
  };

  const m=STEP_META[step-1];

  return(
    <div className="flex flex-col min-h-screen bg-ltbg text-ltt">
      {/* LOCAL TOPBAR */}
      <div className="h-14 bg-ltcard border-b border-ltb flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2 font-plex text-[12px] text-lttm">
          <Link href="/inventario" className="flex items-center gap-1 hover:text-brand-cyan transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Inventario
          </Link>
          <span className="text-ltb">/</span>
          <span className="text-ltt font-medium">Registrar sistema</span>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Vacío de botones por ahora, listos para añadir si aplica */}
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden p-6 max-w-[1440px] mx-auto w-full">
        <div className="wiz-wrapper" style={{ height: '100%' }}>
          <style dangerouslySetInnerHTML={{ __html: CSS }} />
          <div className="wiz">

          {/* FORM */}
          <div className="form-col">
            <div className="step-hd">
              {/* Step track */}
              <div className="step-track">
                {STEPS.map((s,i)=>(
                  <div key={s.id} style={{display:"flex",alignItems:"flex-start",flex:i<STEPS.length-1?1:0}}>
                    <div className={`step-node${step>s.id?" done":step===s.id?" active":""}`}
                      onClick={()=>step>s.id&&setStep(s.id)}>
                      <div className="step-circle">{step>s.id?"✓":s.id}</div>
                      <div className="step-lbl">{s.lbl}</div>
                    </div>
                    {i<STEPS.length-1&&<div className={`step-conn${step>s.id?" done":""}`}/>}
                  </div>
                ))}
              </div>
              {/* Step title */}
              <div className="step-ta fi" key={step}>
                <div className="step-eye">{m.eye}</div>
                <div className="step-title">{m.title}</div>
                <div className="step-sub">{m.sub}</div>
              </div>
            </div>

            <div className="form-body fi" key={`b${step}`}>
              {step===1&&<Step1 f={f} set={set} tags={tags} setTags={setTags} tagInput={tagInput} setTagInput={setTagInput}/>}
              {step===2&&<Step2 f={f} set={set} cbToggle={cbToggle}/>}
              {step===3&&<Step3 f={f} set={set}/>}
              {step===4&&<Step4 f={f} set={set} cbToggle={cbToggle}/>}
              {step===5&&<Step5 f={f} set={set} cbToggle={cbToggle}/>}
              {step===6&&<Step6 f={f} set={set}/>}
              {step===7&&<Step7 f={f} set={set}/>}
            </div>

            <div className="step-nav">
              <div className="step-prog">
                {step<7?`Siguiente: ${STEPS[step]?.lbl||""}`:"Listo para registrar"}
              </div>
              <div className="step-btns">
                {step>1&&<button className="btn btn-g2" onClick={()=>setStep(s=>s-1)}>← Anterior</button>}
                {step<7?(
                  <button className="btn btn-p" onClick={()=>canNext()&&setStep(s=>s+1)}
                    style={{opacity:canNext()?1:.4,cursor:canNext()?"pointer":"not-allowed"}}>
                    Continuar →
                  </button>
                ):(
                  <>
                    {saveError&&<span style={{fontSize:11.5,color:'var(--re)',fontFamily:"'IBM Plex Mono',monospace",maxWidth:200}}>{saveError}</span>}
                    <button className="btn btn-te" onClick={handleRegister} disabled={saving}
                      style={{opacity:saving?.6:1,cursor:saving?"not-allowed":"pointer"}}>
                      {saving?'Guardando...':'✓ Registrar sistema'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* PREVIEW */}
          <LivePreview f={{...f,tags}} step={step} analysing={analysing}/>
        </div>
        </div>
      </div>
    </div>
  );
}
