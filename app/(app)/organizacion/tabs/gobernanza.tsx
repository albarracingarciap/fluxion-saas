'use client';

import { ShieldCheck, UserCog, ClipboardCheck } from 'lucide-react';
import { SectionHeader, FieldLabel, inputCls, type OrgFormData } from './shared';

interface Props {
  formData: OrgFormData
  setFormData: React.Dispatch<React.SetStateAction<OrgFormData>>
  isAdmin: boolean
}

export function GobernanzaTab({ formData, setFormData, isAdmin }: Props) {
  function set<K extends keyof OrgFormData>(key: K, value: OrgFormData[K]) {
    setFormData((p) => ({ ...p, [key]: value }))
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Responsable SGAI */}
      <div>
        <SectionHeader
          icon={<ShieldCheck size={16} className="text-ltt2" />}
          title="Responsable del SGAI"
          description="Persona designada como responsable del Sistema de Gestión de Inteligencia Artificial."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

          <div>
            <FieldLabel>Nombre completo</FieldLabel>
            <input
              type="text"
              disabled={!isAdmin}
              value={formData.sgai_responsible}
              onChange={(e) => set('sgai_responsible', e.target.value)}
              className={inputCls}
              placeholder="Nombre y apellidos"
            />
          </div>

          <div>
            <FieldLabel>Email de contacto</FieldLabel>
            <input
              type="email"
              disabled={!isAdmin}
              value={formData.sgai_email}
              onChange={(e) => set('sgai_email', e.target.value)}
              className={inputCls}
              placeholder="sgai@empresa.com"
            />
          </div>

        </div>
      </div>

      {/* DPO */}
      <div>
        <SectionHeader
          icon={<UserCog size={16} className="text-ltt2" />}
          title="Delegado de Protección de Datos (DPO)"
          description="Requerido por el RGPD para entidades que traten datos a gran escala o categorías especiales."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

          <div>
            <FieldLabel>Nombre completo</FieldLabel>
            <input
              type="text"
              disabled={!isAdmin}
              value={formData.dpo_name}
              onChange={(e) => set('dpo_name', e.target.value)}
              className={inputCls}
              placeholder="Nombre y apellidos del DPO"
            />
          </div>

          <div>
            <FieldLabel>Email del DPO</FieldLabel>
            <input
              type="email"
              disabled={!isAdmin}
              value={formData.dpo_email}
              onChange={(e) => set('dpo_email', e.target.value)}
              className={inputCls}
              placeholder="dpo@empresa.com"
            />
          </div>

          <div>
            <FieldLabel>Teléfono del DPO</FieldLabel>
            <input
              type="tel"
              disabled={!isAdmin}
              value={formData.dpo_phone}
              onChange={(e) => set('dpo_phone', e.target.value)}
              className={inputCls}
              placeholder="+34 600 000 000"
            />
          </div>

        </div>
      </div>

      {/* Auditor externo */}
      <div>
        <SectionHeader
          icon={<ClipboardCheck size={16} className="text-ltt2" />}
          title="Auditor externo designado"
          description="Entidad o profesional externo responsable de las auditorías del SGAI."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

          <div>
            <FieldLabel>Nombre / Empresa auditora</FieldLabel>
            <input
              type="text"
              disabled={!isAdmin}
              value={formData.external_auditor_name}
              onChange={(e) => set('external_auditor_name', e.target.value)}
              className={inputCls}
              placeholder="Ej. Deloitte Advisory S.L."
            />
          </div>

          <div>
            <FieldLabel>Contacto</FieldLabel>
            <input
              type="text"
              disabled={!isAdmin}
              value={formData.external_auditor_contact}
              onChange={(e) => set('external_auditor_contact', e.target.value)}
              className={inputCls}
              placeholder="Email o teléfono de contacto"
            />
          </div>

          <div>
            <FieldLabel>Certificación / Acreditación</FieldLabel>
            <input
              type="text"
              disabled={!isAdmin}
              value={formData.external_auditor_cert}
              onChange={(e) => set('external_auditor_cert', e.target.value)}
              className={inputCls}
              placeholder="Ej. ISO 27001 Lead Auditor, ENS"
            />
          </div>

        </div>
      </div>

    </div>
  )
}
