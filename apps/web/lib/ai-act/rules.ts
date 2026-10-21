/**
 * Motor único de clasificación AI Act (B13a): reglas.
 *
 * Orden de evaluación (§3): ámbito → prácticas prohibidas → Anexo I → Anexo III
 * con la excepción del Art. 6.3 → transparencia (Art. 50). Después, con
 * independencia del nivel, la categoría GPAI y los roles.
 *
 * Módulo puro. Ver `docs/producto/cuestionario-preliminar-reglas.md`.
 */
import { ANNEX_I_SECTION, ANNEX_III, LEVEL_LABELS, PRACTICE_EXCEPTION_TO_ANNEX_III, PROHIBITED_PRACTICES } from './catalog'
import {
  AIACT_RULES_VERSION,
  PRACTICES_WITH_EXCEPTION,
  type AiActInputs,
  type AiActLevel,
  type AiActResult,
  type AnnexIIIPoint,
  type RuleNote,
  type TransparencyCase,
  type ValueChainRole,
} from './types'

const EXCLUSION_ORDER = ['militar', 'cooperacion', 'uso_personal', 'id'] as const

const EXCLUSION_RULES: Record<(typeof EXCLUSION_ORDER)[number], { rule: string; reason: string }> = {
  militar:      { rule: 'RN-A03', reason: 'Art. 2.3: fines militares, de defensa o de seguridad nacional' },
  cooperacion:  { rule: 'RN-A04', reason: 'Art. 2.4: autoridades de terceros países y organizaciones internacionales en cooperación policial y judicial' },
  uso_personal: { rule: 'RN-A07', reason: 'Art. 2.10: uso por personas físicas en una actividad puramente personal de carácter no profesional' },
  id:           { rule: 'RN-A05', reason: 'Art. 2.6 / 2.8: investigación y desarrollo científico, o actividades previas a la introducción en el mercado' },
}

export function classifyAiAct(inputs: AiActInputs, declaredRoles: readonly ValueChainRole[] = []): AiActResult {
  const basis: RuleNote[] = []
  const warnings: RuleNote[] = []
  const declared = Array.from(new Set(declaredRoles))
  const openSource = (inputs.exclusions ?? []).includes('open_source')

  const base = (partial: Partial<AiActResult>): AiActResult => {
    // RN-A06: prohibido o alto riesgo con licencia abierta → la exclusión no aplica.
    if (openSource && (partial.level === 'prohibited' || partial.level === 'high')) {
      warnings.push({ rule: 'RN-A06', text: 'La exclusión del código abierto (Art. 2.12) no aplica a un sistema prohibido o de alto riesgo.' })
    }
    const result: AiActResult = {
      rulesVersion: AIACT_RULES_VERSION,
      method: 'supuestos',
      scope: 'pending',
      scopeReason: null,
      level: 'pending',
      highRiskRoute: null,
      art63: 'not_applicable',
      transparency: [],
      gpai: evaluateGpai(inputs, basis, warnings),
      roles: { declared, suggested: [] },
      basis,
      warnings,
      display: { label: '', basis: '', reason: '' },
      ...partial,
    }
    result.roles.suggested = suggestRoles(inputs, result, declared, warnings)
    result.display = displayFor(result)
    return result
  }

  // ── 4.1 Ámbito ──────────────────────────────────────────────────────────
  if (inputs.isAiSystem === null) {
    basis.push({ rule: 'RN-A02', text: 'No consta si el proyecto usa un sistema de IA.' })
    return base({ scope: 'pending', level: 'pending' })
  }

  const supuestosMarcados = hasAnySupuesto(inputs)
  if (inputs.isAiSystem === false) {
    if (supuestosMarcados) {
      warnings.push({ rule: 'RN-V05', text: 'Se indica que no usa IA, pero hay supuestos marcados en la finalidad prevista: resuelve la contradicción.' })
      return base({ scope: 'pending', level: 'pending' })
    }
    basis.push({ rule: 'RN-A01', text: 'No es un sistema de IA (Art. 3.1).' })
    return base({ scope: 'not_ai_system', level: null })
  }

  const exclusiones = inputs.exclusions ?? []
  const aplicables = EXCLUSION_ORDER.filter((e) => exclusiones.includes(e))
  if (aplicables.length > 0) {
    const primera = EXCLUSION_RULES[aplicables[0]]
    for (const e of aplicables) basis.push({ rule: EXCLUSION_RULES[e].rule, text: `Fuera del ámbito · ${EXCLUSION_RULES[e].reason}.` })
    if (aplicables.length > 1) basis.push({ rule: 'RN-A08', text: 'Varias exclusiones: se aplica la primera del orden.' })
    if (aplicables[0] === 'id') {
      warnings.push({ rule: 'RN-A05', text: 'Las pruebas en condiciones reales no están excluidas del AI Act.' })
    }
    return base({ scope: 'out_of_scope', scopeReason: primera.reason, level: null })
  }

  // RN-V01: lo mínimo para clasificar.
  const faltan: string[] = []
  if (inputs.prohibited === null) faltan.push('prácticas prohibidas')
  if (inputs.annexI === null) faltan.push('Anexo I')
  if (inputs.annexIII === null) faltan.push('Anexo III')
  if (inputs.functions === null) faltan.push('funciones del sistema')
  if (inputs.gpai === null || inputs.gpai.providesModel === null) faltan.push('modelo de IA de uso general')
  if (faltan.length > 0) {
    warnings.push({ rule: 'RN-V01', text: `Faltan respuestas para clasificar: ${faltan.join(', ')}.` })
    return base({ scope: 'in_scope', level: 'pending' })
  }

  // ── 4.2 Prácticas prohibidas ────────────────────────────────────────────
  const practicas = inputs.prohibited!.practices
  const excepciones = inputs.prohibited!.exceptions
  const sinExcepcion = practicas.filter((p) =>
    !(PRACTICES_WITH_EXCEPTION.includes(p) && (excepciones[p] ?? '').trim().length > 0))
  const conExcepcion = practicas.filter((p) => !sinExcepcion.includes(p))

  if (sinExcepcion.length > 0) {
    for (const p of sinExcepcion) {
      const meta = PROHIBITED_PRACTICES[p]
      basis.push({ rule: meta.rule, text: `Art. 5.1.${meta.letter}: ${meta.label}.` })
    }
    basis.push({ rule: 'RN-P10', text: 'Práctica prohibida sin excepción: no puede introducirse en el mercado ni utilizarse en la UE.' })
    warnings.push({ rule: 'RN-P12', text: 'Práctica prohibida: el sistema no puede introducirse en el mercado ni utilizarse en la UE. Retirada o rediseño.' })
    return base({ scope: 'in_scope', level: 'prohibited' })
  }

  // RN-P11: las prácticas con excepción se evalúan como supuestos del Anexo III.
  const annexIII = new Set<AnnexIIIPoint>(inputs.annexIII ?? [])
  for (const p of conExcepcion) {
    const punto = PRACTICE_EXCEPTION_TO_ANNEX_III[p]
    if (punto) {
      annexIII.add(punto)
      basis.push({ rule: 'RN-P11', text: `${PROHIBITED_PRACTICES[p].label}: excepción declarada; se evalúa como Anexo III, punto ${punto}.` })
    }
  }

  // ── 4.6 Transparencia (se calcula ya: el open source y el nivel limitado la necesitan) ──
  const transparency = evaluateTransparency(inputs, annexIII, conExcepcion)

  // ── 4.3 Anexo I ─────────────────────────────────────────────────────────
  const ai = inputs.annexI!
  const marcaA = ai.safetyComponent || ai.isProduct || ai.thirdPartyAssessment
  if ((ai.products.length > 0) !== marcaA) {
    warnings.push({ rule: 'RN-H03', text: 'Anexo I incompleto: hay categorías de producto sin supuesto, o supuestos sin categoría.' })
    return base({ scope: 'in_scope', level: 'pending', transparency })
  }
  if ((ai.safetyComponent || ai.isProduct) && ai.products.length > 0) {
    if (ai.thirdPartyAssessment) {
      const secciones = Array.from(new Set(ai.products.map((p) => ANNEX_I_SECTION[p])))
      const section: 'A' | 'B' = secciones.includes('A') ? 'A' : 'B'
      basis.push({ rule: 'RN-H01', text: `Alto riesgo · Anexo I, Sección ${section} (${ai.products.join(', ')}): componente de seguridad o producto con evaluación de la conformidad de terceros.` })
      if (section === 'B') {
        warnings.push({ rule: 'RN-H04', text: 'Anexo I Sección B: solo aplican determinados artículos del AI Act (Art. 2.2). Las obligaciones de alto riesgo se revisan a mano.' })
      }
      if (transparency.length > 0) basis.push({ rule: 'RN-T06', text: 'Los supuestos del Art. 50 se suman al alto riesgo.' })
      return base({
        scope: 'in_scope', level: 'high', transparency,
        highRiskRoute: { annex: 'I', section, products: ai.products },
      })
    }
    warnings.push({ rule: 'RN-H02', text: 'Sin evaluación de terceros no es alto riesgo por el Art. 6.1; se sigue evaluando el Anexo III.' })
  }

  // ── 4.4 y 4.5 Anexo III y excepción del Art. 6.3 ────────────────────────
  let art63: AiActResult['art63'] = 'not_applicable'
  if (annexIII.size > 0) {
    const puntos = Array.from(annexIII).sort()
    const e = inputs.art63
    let altoRiesgo = true
    if (e?.invoked) {
      const perfila = (inputs.functions ?? []).includes('perfiles') || annexIII.has('6e') || e.profiling === true
      if (perfila) {
        art63 = 'invalid'
        warnings.push({ rule: 'RN-E02', text: 'Excepción del Art. 6.3 no válida: el sistema elabora perfiles de personas físicas y siempre es de alto riesgo.' })
      } else if (e.justification.trim().length === 0) {
        art63 = 'invalid'
        warnings.push({ rule: 'RN-E04', text: 'Excepción del Art. 6.3 invocada sin justificación.' })
        return base({ scope: 'in_scope', level: 'pending', transparency, art63 })
      } else if (e.conditions.length === 0) {
        art63 = 'invalid'
        warnings.push({ rule: 'RN-E01', text: 'Excepción del Art. 6.3 invocada sin ninguna de las condiciones a) a d).' })
      } else {
        art63 = 'valid'
        altoRiesgo = false
        basis.push({ rule: 'RN-E01', text: `Excepción del Art. 6.3 válida (condiciones ${e.conditions.join(', ')}): no es alto riesgo.` })
        basis.push({ rule: 'RN-E03', text: 'Hay que documentar la evaluación antes de introducirlo en el mercado y registrarlo (Art. 6.4 y 49.2).' })
      }
    }
    if (altoRiesgo) {
      for (const p of puntos) basis.push({ rule: ANNEX_III[p].rule, text: `Anexo III, ${p}: ${ANNEX_III[p].label}.` })
      basis.push({ rule: 'RN-H22', text: 'Alto riesgo · Anexo III.' })
      if (transparency.length > 0) basis.push({ rule: 'RN-T06', text: 'Los supuestos del Art. 50 se suman al alto riesgo.' })
      return base({
        scope: 'in_scope', level: 'high', transparency, art63,
        highRiskRoute: { annex: 'III', points: puntos },
      })
    }
  }

  // ── 4.6 Transparencia ───────────────────────────────────────────────────
  let level: AiActLevel
  if (transparency.length > 0) {
    level = 'limited'
    basis.push({ rule: 'RN-T05', text: `Riesgo limitado: Art. ${transparency.map((t) => t.article).join(', ')}.` })
  } else {
    level = 'minimal'
    basis.push({ rule: 'RN-T07', text: 'Sin supuestos del Art. 50 ni de niveles superiores: riesgo mínimo.' })
  }

  // RN-A06: el open source solo excluye si queda en riesgo mínimo sin Art. 50.
  if (openSource) {
    if (level === 'minimal') {
      basis.push({ rule: 'RN-A06', text: 'Fuera del ámbito · Art. 2.12: licencia libre y de código abierto, sin riesgo prohibido, alto ni Art. 50.' })
      return base({ scope: 'out_of_scope', scopeReason: 'Art. 2.12: licencia libre y de código abierto', level: null, art63 })
    }
    warnings.push({ rule: 'RN-A06', text: 'La exclusión del código abierto (Art. 2.12) no aplica: el sistema tiene supuestos del Art. 50.' })
  }

  return base({ scope: 'in_scope', level, transparency, art63 })
}

// ── Auxiliares ───────────────────────────────────────────────────────────────

function hasAnySupuesto(i: AiActInputs): boolean {
  return (i.prohibited?.practices.length ?? 0) > 0
    || Boolean(i.annexI && (i.annexI.safetyComponent || i.annexI.isProduct || i.annexI.thirdPartyAssessment || i.annexI.products.length > 0))
    || (i.annexIII?.length ?? 0) > 0
    || (i.functions?.length ?? 0) > 0
}

function evaluateTransparency(
  inputs: AiActInputs,
  annexIII: Set<AnnexIIIPoint>,
  conExcepcion: readonly string[],
): TransparencyCase[] {
  const out: TransparencyCase[] = []
  const f = inputs.functions ?? []
  if (f.includes('interaccion')) out.push({ article: '50.1', obligated: 'provider', rule: 'RN-T01' })
  if (f.includes('generacion')) out.push({ article: '50.2', obligated: 'provider', rule: 'RN-T02' })
  if (annexIII.has('1b') || annexIII.has('1c')
      || conExcepcion.includes('emociones') || conExcepcion.includes('categorizacion_biometrica')) {
    out.push({ article: '50.3', obligated: 'deployer', rule: 'RN-T03' })
  }
  if (inputs.deepfake === true || inputs.publicInterestText === true) {
    out.push({ article: '50.4', obligated: 'deployer', rule: 'RN-T04' })
  }
  return out
}

function evaluateGpai(inputs: AiActInputs, basis: RuleNote[], warnings: RuleNote[]): AiActResult['gpai'] {
  const g = inputs.gpai
  const result: AiActResult['gpai'] = { modelProvider: false, systemicRisk: null, thirdPartyBased: false }
  if (!g) return result
  if (g.providesModel === true) {
    result.modelProvider = true
    basis.push({ rule: 'RN-G01', text: 'Proveedor de modelo de IA de uso general (Art. 53).' })
    if (g.compute === 'above') {
      result.systemicRisk = 'yes'
      basis.push({ rule: 'RN-G02', text: 'Modelo con riesgo sistémico (Art. 51 y 55).' })
    } else if (g.compute === 'below') {
      result.systemicRisk = 'no'
    } else {
      result.systemicRisk = 'unknown'
      warnings.push({ rule: 'RN-G03', text: 'Riesgo sistémico sin determinar: falta saber el cómputo de entrenamiento.' })
    }
    if (g.openLicense === true && result.systemicRisk !== 'yes') {
      warnings.push({ rule: 'RN-G04', text: 'Licencia libre y de código abierto: obligaciones del Art. 53 reducidas (Art. 53.2). Revisión manual.' })
    }
  }
  if (g.usesThirdPartyModel === true) {
    result.thirdPartyBased = true
    basis.push({ rule: 'RN-G05', text: 'Sistema basado en un modelo GPAI de terceros (informativo).' })
  }
  if (g.finetunesThirdPartyModel === true) {
    warnings.push({ rule: 'RN-G06', text: 'Se modifica un modelo GPAI de terceros: la organización puede pasar a ser proveedora del modelo. Revisión manual.' })
  }
  return result
}

function suggestRoles(
  inputs: AiActInputs,
  result: AiActResult,
  declared: readonly ValueChainRole[],
  warnings: RuleNote[],
): ValueChainRole[] {
  const suggested = new Set<ValueChainRole>()
  switch (inputs.ownership) {
    case 'propio_organizacion':
      suggested.add('provider')
      suggested.add('deployer')
      break
    case 'tercero_organizacion':
      suggested.add('deployer')
      if (inputs.providerInEurope === false) {
        warnings.push({ rule: 'RN-R05', text: 'Proveedor fuera de Europa: revisa si la organización actúa como importador.' })
      }
      break
    case 'propio_cliente':
      warnings.push({ rule: 'RN-R03', text: 'El proveedor suele ser el cliente; si la organización lo comercializa con su nombre, pasa a ser proveedor.' })
      break
    case 'tercero_cliente':
      warnings.push({ rule: 'RN-R04', text: 'El responsable del despliegue suele ser el cliente, salvo que la organización lo use bajo su propia autoridad.' })
      break
  }

  if (result.level === 'high' && !declared.includes('provider')) {
    const a = inputs.art25
    if ((a && (a.ownBrand || a.substantialModification || a.changedPurpose)) || inputs.fineTuning === true) {
      suggested.add('provider')
      warnings.push({ rule: 'RN-R06', text: 'Alto riesgo con nombre o marca propios, modificación sustancial, cambio de finalidad o fine-tuning: la organización pasa a ser proveedor (Art. 25.1).' })
    }
  }

  const sug = Array.from(suggested)
  if (result.scope === 'in_scope' && declared.length === 0) {
    warnings.push({ rule: 'RN-R09', text: 'Sin rol en la cadena de valor: solo se sugieren las obligaciones que aplican a cualquier rol.' })
  } else if (inputs.ownership && (sug.length !== declared.length || sug.some((r) => !declared.includes(r)))) {
    warnings.push({ rule: 'RN-R08', text: `Roles declarados (${declared.join(', ') || 'ninguno'}) distintos de los sugeridos (${sug.join(', ') || 'ninguno'}).` })
  }
  return sug
}

function displayFor(r: AiActResult): AiActResult['display'] {
  if (r.scope === 'not_ai_system') {
    return { label: 'No es un sistema de IA', basis: 'Art. 3.1', reason: 'No cumple la definición de sistema de IA del AI Act.' }
  }
  if (r.scope === 'out_of_scope') {
    return { label: 'Fuera del ámbito', basis: r.scopeReason ?? 'Art. 2', reason: 'Excluido del ámbito de aplicación del AI Act.' }
  }
  const label = LEVEL_LABELS[r.level ?? 'pending']
  const fundamento = r.basis.length > 0 ? r.basis[r.basis.length - 1].text : 'Sin fundamento'
  let basisText = ''
  if (r.level === 'prohibited') basisText = 'Art. 5 — Práctica prohibida'
  else if (r.highRiskRoute?.annex === 'I') basisText = `Art. 6.1 — Anexo I, Sección ${r.highRiskRoute.section}`
  else if (r.highRiskRoute?.annex === 'III') basisText = `Art. 6.2 — Anexo III (${r.highRiskRoute.points.join(', ')})`
  else if (r.level === 'limited') basisText = `Art. 50 (${r.transparency.map((t) => t.article).join(', ')})`
  else if (r.level === 'minimal') basisText = 'Sin categoría específica del AI Act'
  else basisText = 'Pendiente de clasificar'
  const reason = r.level === 'pending' && r.warnings.length > 0 ? r.warnings[0].text : fundamento
  return { label, basis: basisText, reason }
}
