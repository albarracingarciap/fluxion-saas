'use client';

import { Building2 } from 'lucide-react';
import { LogoUpload } from '@/components/organization/LogoUpload';
import { SectionHeader, FieldLabel, inputCls, type OrgFormData } from './shared';

interface Props {
  formData: OrgFormData
  setFormData: React.Dispatch<React.SetStateAction<OrgFormData>>
  isAdmin: boolean
}

export function IdentidadTab({ formData, setFormData, isAdmin }: Props) {
  return (
    <div>
      <SectionHeader
        icon={<Building2 size={16} className="text-ltt2" />}
        title="Identidad"
        description="Nombre público, identificador interno y logotipo de la organización."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

        <div>
          <FieldLabel required>Nombre de la Organización</FieldLabel>
          <input
            type="text"
            required
            disabled={!isAdmin}
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            className={inputCls}
            placeholder="Ej. ACME Corp"
          />
        </div>

        <div>
          <FieldLabel required>ID Interno (Slug)</FieldLabel>
          <input
            type="text"
            required
            disabled={!isAdmin}
            value={formData.slug}
            onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
            className={inputCls}
            placeholder="ej-acme-corp"
          />
          <p className="font-sora text-[11.5px] text-lttm mt-1.5">Solo minúsculas y guiones.</p>
        </div>

        <div className="md:col-span-2">
          <FieldLabel>Logotipo de la organización</FieldLabel>
          <LogoUpload
            currentUrl={formData.logo_url}
            disabled={!isAdmin}
            onUploaded={(url) => setFormData((p) => ({ ...p, logo_url: url }))}
          />
          <p className="font-sora text-[11.5px] text-lttm mt-2">
            Se usará en los informes generados por el Agente 3.
          </p>
        </div>

      </div>
    </div>
  )
}
