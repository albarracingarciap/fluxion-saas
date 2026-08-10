import type { NormativeModule, RiskAppetite } from '@/lib/organization/options';

// ─── Form data ───────────────────────────────────────────────────────────────

export type OrgFormData = {
  name:               string
  slug:               string
  logo_url:           string
  sector:             string
  country:            string
  size:               string
  geography:          string[]
  normative_modules:  NormativeModule[]
  apetito_riesgo:     RiskAppetite
  sgai_responsible:   string
  sgai_email:         string
  fiscal_year_start:  number
  report_language:    string
  // Legal fields (migration 081)
  legal_name:         string
  tax_id:             string
  vat_number:         string
  lei_code:           string
  website:            string
  description:        string
  address_street:     string
  address_city:       string
  address_postal_code: string
  address_country:    string
  // Governance fields (migration 082)
  dpo_name:                 string
  dpo_email:                string
  dpo_phone:                string
  external_auditor_name:    string
  external_auditor_contact: string
  external_auditor_cert:    string
  // Retention fields (migration 083)
  evidence_retention_months:      number
  audit_log_retention_months:     number
  personal_data_retention_months: number
  // Branding (settings jsonb)
  brand_primary_color: string
  doc_footer_text:     string
}

export const DEFAULT_ORG_FORM: OrgFormData = {
  name:               '',
  slug:               '',
  logo_url:           '',
  sector:             '',
  country:            'España',
  size:               '',
  geography:          [],
  normative_modules:  [],
  apetito_riesgo:     'moderado',
  sgai_responsible:   '',
  sgai_email:         '',
  fiscal_year_start:  1,
  report_language:    'es',
  // Legal fields
  legal_name:         '',
  tax_id:             '',
  vat_number:         '',
  lei_code:           '',
  website:            '',
  description:        '',
  address_street:     '',
  address_city:       '',
  address_postal_code: '',
  address_country:    '',
  // Governance fields
  dpo_name:                 '',
  dpo_email:                '',
  dpo_phone:                '',
  external_auditor_name:    '',
  external_auditor_contact: '',
  external_auditor_cert:    '',
  // Retention fields
  evidence_retention_months:      84,
  audit_log_retention_months:     36,
  personal_data_retention_months: 60,
  // Branding
  brand_primary_color: '#00adef',
  doc_footer_text:     '',
}

// ─── Shared UI helpers ───────────────────────────────────────────────────────

export function SectionHeader({ icon, title, description }: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3 pb-5 border-b border-ltb mb-6">
      <div className="w-[34px] h-[34px] rounded-[9px] bg-ltcard2 border border-ltb flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <h2 className="font-sora text-[14px] font-semibold text-ltt">{title}</h2>
        <p className="font-sora text-[12px] text-lttm mt-0.5">{description}</p>
      </div>
    </div>
  )
}

export function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] font-plex uppercase tracking-[0.7px] text-ltt2 mb-1.5">
      {children}
      {required && <span className="text-re text-[10px]">*</span>}
    </label>
  )
}

export const inputCls = "w-full bg-ltcard border border-ltb rounded-[8px] px-3 py-2.5 text-[13.5px] text-ltt font-sora outline-none transition-all focus:border-brand-cyan focus:ring-[3px] focus:ring-brand-cyan/10 disabled:opacity-50 disabled:bg-ltcard2"
export const selectCls = inputCls + " appearance-none pr-8 cursor-pointer"

export function SelectArrow() {
  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-lttm opacity-70">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
        <path d="M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
      </svg>
    </div>
  )
}
