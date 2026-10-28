import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AlertCircle } from 'lucide-react'

import {
  getOrCreateDocument, listDocumentRenders, listTemplatesForSystem,
  listDocumentNotifications, listGeneratedDocuments, listProviderDocuments, templateApplicability,
  getProviderRegistry, providerDocsAvailability,
} from './actions'
import { liveApprovalRequest } from '@/lib/approvals/open'
import { isTemplateKey } from '@/lib/documents/templates'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { ExpedienteClient } from './expediente-client'
import { ExpedienteTabs } from './expediente-tabs'
import { ProviderDocsClient } from './provider-docs-client'

export const dynamic = 'force-dynamic'

export default async function ExpedientePage({
  params,
  searchParams,
}: {
  params: { id: string; key: string }
  searchParams?: { vista?: string }
}) {
  // Clave desconocida es un 404, no un error de la aplicación: no existe ese
  // documento, igual que no existe un sistema con un id inventado.
  if (!isTemplateKey(params.key)) notFound()

  const [templates, aplicabilidad] = await Promise.all([
    listTemplatesForSystem(params.id),
    templateApplicability(params.id, params.key),
  ])
  const actual = templates.find((t) => t.key === params.key)
  const tieneDocumento = Boolean(actual?.hasDocument)

  // DP-11: si la organización no es proveedora, se adjunta la documentación del
  // proveedor en lugar de redactar. Lo que ya estuviera redactado se puede ver.
  // Desde 2026-10-28, en el Anexo IV y el registro UE también es opcional
  // cuando el documento no aplica y la organización no es la proveedora.
  const docProveedor = await providerDocsAvailability(params.id, params.key)
  if (docProveedor && searchParams?.vista !== 'documento' && !(docProveedor === 'opcional' && tieneDocumento)) {
    const { data: system } = await createFluxionClient()
      .from('ai_systems').select('name, organization_id').eq('id', params.id).maybeSingle()
    if (!system) notFound()
    return (
      <ProviderDocsClient
        systemName={String(system.name)}
        organizationId={String(system.organization_id)}
        templates={templates}
        templateKey={params.key}
        aiSystemId={params.id}
        reason={aplicabilidad.reason}
        documents={await listProviderDocuments(params.id, params.key)}
        hasDraftedDocument={tieneDocumento}
        optional={docProveedor === 'opcional'}
        registry={params.key === 'eu_registry' ? await getProviderRegistry(params.id) : null}
      />
    )
  }

  // DP-12: redactarla como buena práctica aunque no aplique (FRIA).
  const voluntaria = aplicabilidad.mode === 'no_aplica' && aplicabilidad.voluntary === true && searchParams?.vista === 'voluntaria'

  // No aplica y no hay nada redactado: se explica por qué, sin crear el documento.
  if (aplicabilidad.mode === 'no_aplica' && !tieneDocumento && !voluntaria) {
    return (
      <div className="max-w-[1000px] w-full mx-auto flex flex-col gap-5 py-6">
        <Link href={`/inventario/${params.id}`} className="font-sora text-[12.5px] text-lttm hover:text-ltt w-fit">
          ← Volver al sistema
        </Link>
        <ExpedienteTabs templates={templates} templateKey={params.key} aiSystemId={params.id} />
        <div className="border border-ltb bg-ltcard rounded-[12px] p-6 flex items-start gap-3">
          <AlertCircle size={18} className="text-lttm shrink-0 mt-0.5" />
          <div>
            <p className="font-sora text-[14px] text-ltt font-semibold">Este documento no aplica a este sistema</p>
            <p className="font-sora text-[13px] text-ltt2 mt-1">{aplicabilidad.reason}</p>
            <p className="font-sora text-[12.5px] text-lttm mt-2">
              Depende de la clasificación AI Act y del rol de la organización en la cadena de valor («Tu papel
              frente a este sistema», al editar el sistema).
            </p>
            {aplicabilidad.missingAnswer === 'publicBody' && (
              <Link href={`/inventario/${params.id}/editar`} className="font-sora text-[12.5px] text-brand-cyan hover:underline mt-2 inline-block">
                Responder al editar el sistema →
              </Link>
            )}
          </div>
        </div>
        {aplicabilidad.voluntary && (
          <div className="border border-ltb bg-ltcard rounded-[12px] p-6 flex items-start justify-between gap-4 flex-wrap">
            <div className="max-w-[640px]">
              <p className="font-sora text-[14px] text-ltt font-semibold">Redactarla como buena práctica</p>
              <p className="font-sora text-[13px] text-ltt2 mt-1">
                Aunque no sea obligatoria, puedes redactarla para documentar el impacto del sistema en los derechos
                fundamentales. Sigue el mismo ciclo (borrador, aprobación, PDF y evidencia), pero no cuenta como
                obligación, no se notifica a la autoridad y no exige revisión anual.
              </p>
            </div>
            <Link
              href={`/inventario/${params.id}/expediente/${params.key}?vista=voluntaria`}
              className="px-4 py-2 rounded-[8px] bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white font-sora text-[12.5px] font-medium shrink-0"
            >
              Redactar como buena práctica
            </Link>
          </div>
        )}
      </div>
    )
  }

  const result = await getOrCreateDocument(params.id, params.key, { voluntary: voluntaria })

  if ('error' in result) {
    return (
      <div className="max-w-[900px] w-full mx-auto py-10">
        <div className="border border-reb bg-red-dim rounded-[12px] p-6 flex items-start gap-3">
          <AlertCircle size={18} className="text-re shrink-0 mt-0.5" />
          <div>
            <p className="font-sora text-[13.5px] text-ltt">{result.error}</p>
            <Link
              href={`/inventario/${params.id}`}
              className="font-sora text-[12.5px] text-brand-cyan mt-2 inline-block"
            >
              Volver al sistema
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const [renders, generados, solicitud, notificaciones] = await Promise.all([
    listDocumentRenders(result.document.id),
    listGeneratedDocuments(params.id),
    liveApprovalRequest('document', result.document.id),
    listDocumentNotifications(result.document.id),
  ])

  return (
    <ExpedienteClient
      doc={result}
      renders={renders}
      generados={generados}
      templates={templates}
      templateKey={params.key}
      aiSystemId={params.id}
      inApprovalCircuit={Boolean(solicitud)}
      notifications={notificaciones}
    />
  )
}
