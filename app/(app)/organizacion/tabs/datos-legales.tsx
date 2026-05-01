'use client';

import { FileText, MapPin } from 'lucide-react';
import { SectionHeader, FieldLabel, inputCls, type OrgFormData } from './shared';

interface Props {
  formData: OrgFormData
  setFormData: React.Dispatch<React.SetStateAction<OrgFormData>>
  isAdmin: boolean
}

export function DatosLegalesTab({ formData, setFormData, isAdmin }: Props) {
  function set<K extends keyof OrgFormData>(key: K, value: OrgFormData[K]) {
    setFormData((p) => ({ ...p, [key]: value }))
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Identificadores registrales */}
      <div>
        <SectionHeader
          icon={<FileText size={16} className="text-ltt2" />}
          title="Datos legales"
          description="Razón social, identificadores fiscales e internacionales de la organización."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

          <div className="md:col-span-2">
            <FieldLabel>Razón social</FieldLabel>
            <input
              type="text"
              disabled={!isAdmin}
              value={formData.legal_name}
              onChange={(e) => set('legal_name', e.target.value)}
              className={inputCls}
              placeholder="Denominación oficial registrada"
            />
            <p className="font-sora text-[11.5px] text-lttm mt-1.5">
              Nombre completo tal como aparece en el Registro Mercantil.
            </p>
          </div>

          <div>
            <FieldLabel>CIF / NIF</FieldLabel>
            <input
              type="text"
              disabled={!isAdmin}
              value={formData.tax_id}
              onChange={(e) => set('tax_id', e.target.value.toUpperCase())}
              className={inputCls}
              placeholder="Ej. B12345678"
            />
          </div>

          <div>
            <FieldLabel>Número de IVA intracomunitario</FieldLabel>
            <input
              type="text"
              disabled={!isAdmin}
              value={formData.vat_number}
              onChange={(e) => set('vat_number', e.target.value.toUpperCase())}
              className={inputCls}
              placeholder="Ej. ES-B12345678"
            />
            <p className="font-sora text-[11.5px] text-lttm mt-1.5">
              Requerido para operaciones intracomunitarias en la UE.
            </p>
          </div>

          <div>
            <FieldLabel>LEI (Legal Entity Identifier)</FieldLabel>
            <input
              type="text"
              disabled={!isAdmin}
              value={formData.lei_code}
              onChange={(e) => set('lei_code', e.target.value.toUpperCase())}
              className={inputCls}
              placeholder="20 caracteres ISO 17442"
              maxLength={20}
            />
            <p className="font-sora text-[11.5px] text-lttm mt-1.5">
              Obligatorio para entidades financieras reguladas (DORA, EMIR).
            </p>
          </div>

          <div>
            <FieldLabel>Sitio web corporativo</FieldLabel>
            <input
              type="url"
              disabled={!isAdmin}
              value={formData.website}
              onChange={(e) => set('website', e.target.value)}
              className={inputCls}
              placeholder="https://www.empresa.com"
            />
          </div>

          <div className="md:col-span-2">
            <FieldLabel>Descripción de la entidad</FieldLabel>
            <textarea
              disabled={!isAdmin}
              value={formData.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              className={inputCls + ' resize-none'}
              placeholder="Breve descripción pública de la organización (actividad, misión…)"
            />
          </div>

        </div>
      </div>

      {/* Domicilio fiscal */}
      <div>
        <SectionHeader
          icon={<MapPin size={16} className="text-ltt2" />}
          title="Domicilio fiscal"
          description="Dirección registrada a efectos legales y notificaciones regulatorias."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

          <div className="md:col-span-2">
            <FieldLabel>Dirección</FieldLabel>
            <input
              type="text"
              disabled={!isAdmin}
              value={formData.address_street}
              onChange={(e) => set('address_street', e.target.value)}
              className={inputCls}
              placeholder="Calle, número, piso…"
            />
          </div>

          <div>
            <FieldLabel>Ciudad</FieldLabel>
            <input
              type="text"
              disabled={!isAdmin}
              value={formData.address_city}
              onChange={(e) => set('address_city', e.target.value)}
              className={inputCls}
              placeholder="Madrid"
            />
          </div>

          <div>
            <FieldLabel>Código postal</FieldLabel>
            <input
              type="text"
              disabled={!isAdmin}
              value={formData.address_postal_code}
              onChange={(e) => set('address_postal_code', e.target.value)}
              className={inputCls}
              placeholder="28001"
            />
          </div>

          <div>
            <FieldLabel>País</FieldLabel>
            <input
              type="text"
              disabled={!isAdmin}
              value={formData.address_country}
              onChange={(e) => set('address_country', e.target.value)}
              className={inputCls}
              placeholder="España"
            />
          </div>

        </div>
      </div>

    </div>
  )
}
