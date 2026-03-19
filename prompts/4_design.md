## FLUXION — SISTEMA DE DISEÑO (Capa 3)

═══════════════════════════════════════════════════
IDENTIDAD VISUAL
═══════════════════════════════════════════════════

Nombre: FLUXION
Paleta corporativa extraída del logotipo oficial:
  #00adef — Cian corporativo (acento primario)
  #3871c1 — Azul medio corporativo (acento secundario)
  #004aad — Azul profundo corporativo (terciario)

El logotipo combina una nube con el símbolo del infinito,
comunicando flujo continuo y gobierno en la nube. El sistema
de diseño refleja esa identidad: frialdad técnica, profundidad
y movimiento.

═══════════════════════════════════════════════════
LAYOUT FUNDAMENTAL — DOS ZONAS
═══════════════════════════════════════════════════

El layout de la aplicación divide el espacio en dos zonas
con tratamiento visual radicalmente distinto:

ZONA OSCURA: sidebar + topbar + intel banner
  → Transmite estructura, navegación, contexto permanente
  → Fondo: #0d1520, texto claro, bordes oscuros

ZONA CLARA: área de contenido central
  → Transmite trabajo, datos, legibilidad
  → Fondo: #f0f5fc, cards blancas, bordes sutiles

Esta separación es inviolable. Nunca mezclar tonos oscuros
en el área de contenido ni tonos claros en sidebar/topbar.

═══════════════════════════════════════════════════
CSS VARIABLES COMPLETAS
═══════════════════════════════════════════════════

:root {
  /* ── BRAND ── */
  --brand-cyan:   #00adef;
  --brand-blue:   #3871c1;
  --brand-navy:   #004aad;
  --cyan-light:   #33c3f5;
  --cyan-dim:     #00adef12;
  --cyan-dim2:    #00adef20;
  --cyan-border:  #00adef35;
  --blue-dim:     #3871c112;
  --blue-border:  #3871c130;

  /* Degradados corporativos */
  --grad-brand: linear-gradient(135deg, #00adef, #3871c1, #004aad);
  --grad-cyan:  linear-gradient(135deg, #00adef, #33c3f5);
  --grad-blue:  linear-gradient(135deg, #3871c1, #004aad);

  /* ── ZONA OSCURA (sidebar, topbar, intel banner) ── */
  --dk9: #070c14;   /* fondo más profundo */
  --dk8: #0d1520;   /* sidebar + topbar */
  --dk7: #131f2e;   /* hover en nav items */
  --dk6: #1a2840;   /* elementos terciarios dark */
  --dkb: #1e3050;   /* borde estándar dark */
  --dkbl:#2a4268;   /* borde hover dark */
  --dkt: #e8f0fe;   /* texto principal dark */
  --dkt2:#7a9cc4;   /* texto secundario dark */
  --dktm:#3d5a82;   /* texto muted dark */

  /* ── ZONA CLARA (contenido central) ── */
  --ltbg:   #f0f5fc;  /* fondo del área de contenido */
  --ltcard: #ffffff;  /* fondo de cards */
  --ltcard2:#f7faff;  /* fondo de card headers */
  --ltb:    #dce8f7;  /* borde estándar light */
  --ltbl:   #b8d0ee;  /* borde hover / scrollbar light */
  --ltt:    #0d1b2e;  /* texto principal light */
  --ltt2:   #4a6180;  /* texto secundario light */
  --lttm:   #8aa2bc;  /* texto muted light */

  /* ── SEMÁNTICOS (ajustados para fondo claro) ── */
  --re: #d93025;  --red:  #d9302510;  --reb: #d9302528;
  --gr: #1a8f38;  --grd:  #1a8f3810;  --grb: #1a8f3828;
  --or: #c96b00;  --ord:  #c96b0010;  --orb: #c96b0028;
  --pu: #6b3bbf;  --pud:  #6b3bbf10;  --pub: #6b3bbf28;
  --te: #0b8a6d;  --ted:  #0b8a6d10;  --teb: #0b8a6d28;
}

═══════════════════════════════════════════════════
TIPOGRAFÍA
═══════════════════════════════════════════════════

Importar siempre las tres familias:
@import url('https://fonts.googleapis.com/css2?
  family=Sora:wght@300;400;500;600;700&
  family=IBM+Plex+Mono:wght@400;500;600&
  family=Fraunces:ital,opsz,wght@0,9..144,300;
    0,9..144,600;1,9..144,300&display=swap');

Reglas de uso:
  Fraunces serif    → Logo, títulos principales, KPIs (valores
                      numéricos grandes), nombres de sistemas
  Sora sans-serif   → Cuerpo, labels, botones, navegación,
                      descripciones
  IBM Plex Mono     → IDs, fechas, referencias normativas (Art. 11),
                      badges, porcentajes en tablas, metadata técnica,
                      contadores, labels de sección en uppercase

NUNCA usar: Inter, Roboto, Arial, system-ui ni ninguna fuente
del sistema como fuente visible al usuario.

═══════════════════════════════════════════════════
LOGO EN LA APLICACIÓN
═══════════════════════════════════════════════════

El logo dentro del sidebar se implementa así:
- Logo en sidebar: tarjeta blanca con border-radius:11px y
box-shadow azul sobre el fondo oscuro. img dentro
del contenedor .logo-card. Hover: glow cian sutil.

═══════════════════════════════════════════════════
SIDEBAR (ZONA OSCURA)
═══════════════════════════════════════════════════

width: 228px
background: var(--dk8)
border-right: 1px solid var(--dkb)

Efecto de borde derecho luminoso (sutil):
::after {
  position:absolute; top:0; right:0; bottom:0; width:1px;
  background: linear-gradient(180deg,
    transparent, #00adef28, #3871c118, transparent);
}

Nav items:
  padding: 7.5px 12px; border-radius: 8px; margin: 1px 8px;
  font-size: 13px; font-family: Sora; color: var(--dkt2);
  border: 1px solid transparent; transition: all .15s;
  hover → background: var(--dk7); color: var(--dkt)
  active → background: var(--cyan-dim2); color: var(--cyan-light);
           border-color: var(--cyan-border)

Labels de sección:
  font-size: 9.5px; IBM Plex Mono; uppercase;
  letter-spacing: 1.2px; color: var(--dktm)

Org chip (footer):
  background: var(--dk7); border-radius: 9px;
  border: 1px solid var(--dkb)
  Avatar: 30px, border-radius:8px, background: var(--grad-brand),
          box-shadow: 0 2px 8px #00adef25

═══════════════════════════════════════════════════
TOPBAR (ZONA OSCURA)
═══════════════════════════════════════════════════

height: 52px
background: var(--dk8)
border-bottom: 1px solid var(--dkb)
Título: Fraunces serif 17px font-weight:600 color:var(--dkt)

Botones en topbar (sobre fondo oscuro):
  btn-primary → background: var(--grad-cyan); color: #fff;
                box-shadow: 0 2px 12px #00adef30
                hover: translateY(-1px); box-shadow más intenso
  btn-ghost   → background: transparent; color: var(--dkt2);
                border: 1px solid var(--dkb)
                hover: background var(--dk7); color var(--dkt)

═══════════════════════════════════════════════════
INTELLIGENCE BANNER (ZONA OSCURA)
═══════════════════════════════════════════════════

Franja estrecha entre topbar y contenido.
background: var(--dk9)
border-bottom: 1px solid var(--dkb)
padding: 9px 26px

Overlay sutil:
::before { background: linear-gradient(90deg,
  #004aad08, #00adef05, #004aad08) }

Items: IBM Plex Mono 12px, color: var(--dkt2)
  strong → color: var(--dkt)
Dots de estado animados (pulse 2s infinite):
  re → var(--re) con box-shadow del mismo color
  cy → var(--brand-cyan) con box-shadow
  gr → #22c55e
Separadores: 1px height:16px background:var(--dkb)

═══════════════════════════════════════════════════
ÁREA DE CONTENIDO (ZONA CLARA)
═══════════════════════════════════════════════════

background: var(--ltbg)   /* #f0f5fc */
padding: 24px 26px
overflow-y: auto

Scrollbar personalizado:
::-webkit-scrollbar { width: 4px }
::-webkit-scrollbar-thumb { background: var(--ltbl); border-radius: 2px }

═══════════════════════════════════════════════════
CARDS (ZONA CLARA)
═══════════════════════════════════════════════════

background: var(--ltcard)          /* #ffffff */
border: 1px solid var(--ltb)       /* #dce8f7 */
border-radius: 12px
box-shadow: 0 1px 4px #004aad08, 0 2px 12px #004aad06

hover: border-color var(--cyan-border);
       box-shadow: 0 4px 20px #00adef18

Card header:
  padding: 14px 18px
  border-bottom: 1px solid var(--ltb)
  background: var(--ltcard2)   /* #f7faff */
  title: IBM Plex Mono 11px uppercase letter-spacing:.8px
         color: var(--ltt2) font-weight:600

Metric cards (KPI):
  Acento de color en borde superior (height:3px):
    cyan → var(--grad-cyan)
    blue → var(--grad-blue)
    red  → linear-gradient(90deg, var(--re), #f87171)
    green→ linear-gradient(90deg, var(--gr), var(--te))
  Glow decorativo (círculo top-right, opacity:.07):
    color según variante de la card
  Valor: Fraunces serif 34px font-weight:600
    cy → color: var(--brand-cyan)
    bl → color: var(--brand-blue)
    re → color: var(--re)
    gr → color: var(--gr)
  Label: IBM Plex Mono 10.5px uppercase color: var(--lttm)
  Sub: Sora 12px color: var(--ltt2)

═══════════════════════════════════════════════════
BADGES (ZONA CLARA — sobre fondo blanco)
═══════════════════════════════════════════════════

Estructura: inline-flex, padding:2px 8px, border-radius:20px,
font-size:10.5px, font-weight:500, IBM Plex Mono

Variantes ajustadas para fondo claro:
  b-cy  → bg:#e6f5fd  color:#006fa3  border:#9dd8f5
  b-bl  → bg:#edf2fb  color:#2658a3  border:#a8c2e8
  b-re  → bg:#fdf0ef  color:#b52119  border:#f0b4b0
  b-gr  → bg:#edfaf1  color:#0c7230  border:#8ed4a8
  b-or  → bg:#fff5e9  color:#8f4c00  border:#f0c07a
  b-gy  → bg:var(--ltcard2) color:var(--ltt2) border:var(--ltb)
  b-pu  → bg:#f4f0fb  color:#4d2b99  border:#c2a8e8

NOTA CRÍTICA: Los badges con colores dim oscuros (#00adef15 sobre
negro) son completamente invisibles sobre fondo blanco. Usar siempre
las variantes pasteles definidas aquí cuando el contexto sea claro.

═══════════════════════════════════════════════════
BOTONES (ZONA CLARA — dentro de cards o modales)
═══════════════════════════════════════════════════

btn-primary:
  background: var(--grad-cyan); color: #fff; border: none
  border-radius: 7px; padding: 7px 14px; Sora font-weight:500
  box-shadow: 0 2px 12px #00adef30
  hover: translateY(-1px); box-shadow: 0 4px 18px #00adef45

btn-secondary (claro):
  background: var(--ltcard2); color: var(--ltt);
  border: 1px solid var(--ltb)
  hover: border-color var(--cyan-border)

btn-ghost (claro):
  background: transparent; color: var(--ltt2);
  border: 1px solid var(--ltb)
  hover: background var(--ltbg); color var(--ltt)

btn-danger (claro):
  background: #fdf0ef; color: var(--re);
  border: 1px solid #f0b4b0

═══════════════════════════════════════════════════
TEXTOS EN ZONA CLARA
═══════════════════════════════════════════════════

Títulos principales:  Fraunces serif, color: var(--ltt)
Subtítulos:           Sora font-weight:600, color: var(--ltt)
Cuerpo / descripciones: Sora 13-14px, color: var(--ltt2)
Labels de campo:      IBM Plex Mono 10.5-11px uppercase,
                      color: var(--lttm)
Metadata / timestamps: IBM Plex Mono 11px, color: var(--lttm)
Referencias normativas: IBM Plex Mono, color: var(--lttm)
                        (ej. "Art. 11 · Anexo IV")

═══════════════════════════════════════════════════
ELEMENTOS INTERACTIVOS EN ZONA CLARA
═══════════════════════════════════════════════════

Filas de tabla/lista:
  border-bottom: 1px solid var(--ltb)
  hover: background var(--ltbg)
  cursor: pointer

Inputs y selects:
  background: var(--ltcard); border: 1px solid var(--ltb)
  border-radius: 8px; color: var(--ltt); Sora 13.5px
  focus: border-color var(--brand-cyan);
         box-shadow: 0 0 0 3px #00adef15
  placeholder: color var(--lttm)

Progress bars:
  track: background var(--ltb); border-radius: 4px
  fill activo: linear-gradient(90deg, var(--brand-cyan), var(--brand-blue))
               con shimmer animado (blanco 30% opacity)
  fill semántico: color según valor (re < 40%, or < 70%, cy < 90%, gr)

Rings SVG:
  track circle: stroke #dce8f7 (ltb)
  fill circle: stroke url(#gradient-cyan-blue)
  center: Fraunces 24px color: var(--brand-cyan)

═══════════════════════════════════════════════════
ANIMACIONES
═══════════════════════════════════════════════════

fadein (entrada de elementos):
  @keyframes fadein {
    from { opacity:0; transform:translateY(5px) }
    to   { opacity:1; transform:translateY(0) }
  }
  Uso: animation: fadein .35s ease forwards
  Stagger: animation-delay: N * 60ms (N = índice)

pulse (indicadores de estado activo):
  @keyframes pulse {
    0%,100% { opacity:1 }
    50%     { opacity:.35 }
  }
  Aplicar a: dot del agente activo, alerts en intel banner

shimmer (barras de progreso en movimiento):
  @keyframes shimmer {
    0%   { transform: translateX(-100%) }
    100% { transform: translateX(100%) }
  }
  Aplicar con ::after sobre el fill de las progress bars
  background: linear-gradient(90deg,
    transparent, rgba(255,255,255,.3), transparent)

Hover en cards:
  transition: all .2s
  hover: translateY(-2px) + box-shadow más intenso

═══════════════════════════════════════════════════
ESTRUCTURA LAYOUT (todas las páginas de app)
═══════════════════════════════════════════════════

.layout { display:flex; height:100vh; overflow:hidden; }

.sidebar {
  width: 228px; flex-shrink: 0;
  background: var(--dk8);           /* ZONA OSCURA */
}

.main {
  flex: 1; overflow: hidden;
  display: flex; flex-direction: column; min-width: 0;
}

.topbar {
  height: 52px; flex-shrink: 0;
  background: var(--dk8);           /* ZONA OSCURA */
  border-bottom: 1px solid var(--dkb);
}

.intel-banner {
  flex-shrink: 0;
  background: var(--dk9);           /* ZONA OSCURA (más profunda) */
  border-bottom: 1px solid var(--dkb);
}

.content {
  flex: 1; overflow-y: auto;
  background: var(--ltbg);          /* ZONA CLARA */
  padding: 24px 26px;
}

═══════════════════════════════════════════════════
GRIDS DE CONTENIDO
═══════════════════════════════════════════════════

KPIs: grid-template-columns: repeat(4, 1fr); gap: 14px
2 columnas: grid-template-columns: 1fr 1fr; gap: 16px
3 columnas: grid-template-columns: 1fr 1fr 1fr; gap: 14px
Full width: width 100%
margin-bottom entre filas: 22px

═══════════════════════════════════════════════════
REGLAS DE ORO — NUNCA VIOLAR
═══════════════════════════════════════════════════

1. NUNCA usar Inter, Roboto, Arial ni system-ui.
   Siempre Fraunces + Sora + IBM Plex Mono.

2. NUNCA usar fondos oscuros (dk*) en el área de contenido.
   NUNCA usar fondos claros (lt*) en sidebar o topbar.

3. NUNCA usar los badges dim oscuros (#color + 12-20%)
   sobre fondo claro. Usar siempre las variantes pastel.

4. SIEMPRE el acento primario es el cian (#00adef).
   El ámbar no existe en el sistema Fluxion.

5. Los semánticos (re, gr, or, pu, te) tienen versiones
   ajustadas para fondo claro — son más oscuros y saturados
   que sus equivalentes en sistemas dark. Usar los definidos
   en este documento, no los del sistema dark anterior.

6. Las sombras de cards usan el azul navy como color base
   (#004aad con opacidad muy baja) para mantener coherencia
   de temperatura con la paleta corporativa.

7. Los gradientes corporativos se usan para:
   acentos de borde superior en metric cards,
   botones primarios, avatar del logo, barras de progreso
   principales. No usar en fondos grandes ni en texto
   de cuerpo.