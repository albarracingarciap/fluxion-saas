'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { updateOrganizationProfile } from './actions';
import { CommitteesTab } from './CommitteesTab';
import { IdentidadTab } from './tabs/identidad';
import { DatosLegalesTab } from './tabs/datos-legales';
import { PerfilRegulatoriTab } from './tabs/perfil-regulatorio';
import { GobernanzaTab } from './tabs/gobernanza';
import { OperacionesTab } from './tabs/operaciones';
import { PlanTab } from './tabs/plan';
import { DEFAULT_ORG_FORM, type OrgFormData } from './tabs/shared';
import {
  Save, Loader2, AlertCircle, CheckCircle2, ChevronRight,
  Building2, FileText, Globe, ShieldCheck, Settings2, Users2, CreditCard,
} from 'lucide-react';
import type { NormativeModule, RiskAppetite } from '@/lib/organization/options';

// ─── Tab config ──────────────────────────────────────────────────────────────

type TabKey = 'identidad' | 'datos-legales' | 'perfil-regulatorio' | 'gobernanza' | 'operaciones' | 'comites' | 'plan'

const TABS: Array<{ key: TabKey; label: string; icon: React.ReactNode; editable: boolean }> = [
  { key: 'identidad',          label: 'Identidad',          icon: <Building2 size={14} />,    editable: true  },
  { key: 'datos-legales',      label: 'Datos legales',      icon: <FileText size={14} />,     editable: true  },
  { key: 'perfil-regulatorio', label: 'Perfil regulatorio', icon: <Globe size={14} />,        editable: true  },
  { key: 'gobernanza',         label: 'Gobernanza',         icon: <ShieldCheck size={14} />,  editable: true  },
  { key: 'operaciones',        label: 'Operaciones',        icon: <Settings2 size={14} />,    editable: true  },
  { key: 'comites',            label: 'Comités',            icon: <Users2 size={14} />,       editable: false },
  { key: 'plan',               label: 'Plan',               icon: <CreditCard size={14} />,   editable: false },
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default function OrganizationPage() {
  const { organization, role, loadUserData } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabKey>('identidad');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<OrgFormData>(DEFAULT_ORG_FORM);

  const isAdmin = role === 'org_admin';

  useEffect(() => {
    if (organization) {
      const s = (organization.settings ?? {}) as Record<string, unknown>
      setFormData({
        name:               organization.name || '',
        slug:               organization.slug || '',
        logo_url:           organization.logo_url || '',
        sector:             organization.sector || '',
        country:            organization.country || 'España',
        size:               organization.size || '',
        geography:          (organization.geography as string[] | undefined) || [],
        normative_modules:  (organization.normative_modules as NormativeModule[] | undefined) || [],
        apetito_riesgo:     (organization.apetito_riesgo as RiskAppetite | undefined) || 'moderado',
        sgai_responsible:    typeof s.sgai_responsible === 'string' ? s.sgai_responsible : '',
        sgai_email:          typeof s.sgai_email === 'string' ? s.sgai_email : '',
        fiscal_year_start:   typeof s.fiscal_year_start === 'number' ? s.fiscal_year_start : 1,
        report_language:     typeof s.report_language === 'string' ? s.report_language : 'es',
        // Legal fields
        legal_name:          organization.legal_name || '',
        tax_id:              organization.tax_id || '',
        vat_number:          organization.vat_number || '',
        lei_code:            organization.lei_code || '',
        website:             organization.website || '',
        description:         organization.description || '',
        address_street:      organization.registered_address?.street || '',
        address_city:        organization.registered_address?.city || '',
        address_postal_code: organization.registered_address?.postal_code || '',
        address_country:     organization.registered_address?.country || '',
        // Governance fields
        dpo_name:                 organization.dpo_name || '',
        dpo_email:                organization.dpo_email || '',
        dpo_phone:                organization.dpo_phone || '',
        external_auditor_name:    organization.external_auditor_name || '',
        external_auditor_contact: organization.external_auditor_contact || '',
        external_auditor_cert:    organization.external_auditor_cert || '',
        // Retention fields
        evidence_retention_months:      organization.evidence_retention_months ?? 84,
        audit_log_retention_months:     organization.audit_log_retention_months ?? 36,
        personal_data_retention_months: organization.personal_data_retention_months ?? 60,
        // Branding (from settings jsonb)
        brand_primary_color: typeof s.brand_primary_color === 'string' ? s.brand_primary_color : '#00adef',
        doc_footer_text:     typeof s.doc_footer_text === 'string' ? s.doc_footer_text : '',
      });
    }
  }, [organization]);

  async function handleSave() {
    if (!isAdmin || !organization) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateOrganizationProfile({
        id:                organization.id,
        name:              formData.name,
        slug:              formData.slug,
        logo_url:          formData.logo_url,
        sector:            formData.sector,
        country:           formData.country,
        size:              formData.size,
        geography:         formData.geography,
        normative_modules: formData.normative_modules,
        apetito_riesgo:    formData.apetito_riesgo,
        settings: {
          sgai_responsible:    formData.sgai_responsible,
          sgai_email:          formData.sgai_email,
          fiscal_year_start:   formData.fiscal_year_start,
          report_language:     formData.report_language,
          brand_primary_color: formData.brand_primary_color,
          doc_footer_text:     formData.doc_footer_text,
        },
        legal_name:   formData.legal_name,
        tax_id:       formData.tax_id,
        vat_number:   formData.vat_number,
        lei_code:     formData.lei_code,
        website:      formData.website,
        description:  formData.description,
        registered_address: {
          street:      formData.address_street,
          city:        formData.address_city,
          postal_code: formData.address_postal_code,
          country:     formData.address_country,
        },
        dpo_name:                 formData.dpo_name,
        dpo_email:                formData.dpo_email,
        dpo_phone:                formData.dpo_phone,
        external_auditor_name:    formData.external_auditor_name,
        external_auditor_contact: formData.external_auditor_contact,
        external_auditor_cert:    formData.external_auditor_cert,
        evidence_retention_months:      formData.evidence_retention_months,
        audit_log_retention_months:     formData.audit_log_retention_months,
        personal_data_retention_months: formData.personal_data_retention_months,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        await loadUserData();
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setError('Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-brand-cyan animate-spin" />
      </div>
    );
  }

  const activeTabConfig = TABS.find((t) => t.key === activeTab)!

  return (
    <div className="max-w-[1280px] w-full mx-auto animate-fadein pb-10">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12px] font-plex text-lttm uppercase tracking-wider mb-4">
        <Building2 size={13} className="text-lttm" />
        <span>Configuración</span>
        <ChevronRight size={11} className="text-lttm" />
        <span className="text-ltt">Organización</span>
      </div>

      <div className="mb-7">
        <h1 className="font-fraunces text-2xl font-semibold tracking-tight text-ltt mb-1.5">
          Organización
        </h1>
        <p className="text-[13px] text-ltt2 font-sora leading-relaxed">
          Configura los datos de tu organización, gobernanza del SGAI y comités de supervisión.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-2 bg-red-dim border border-reb text-re text-[12px] font-sora p-3.5 rounded-[8px] mb-5">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 bg-grdim border border-grb text-gr text-[12px] font-sora p-3.5 rounded-[8px] mb-5">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Organización actualizada correctamente.</span>
        </div>
      )}

      {/* Layout: sidebar + content */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">

        {/* Sidebar */}
        <nav
          aria-label="Secciones de organización"
          className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-2 lg:sticky lg:top-4 lg:self-start"
        >
          <ul className="flex lg:flex-col gap-0.5 overflow-x-auto lg:overflow-visible">
            {TABS.map((tab) => {
              const isActive = tab.key === activeTab
              return (
                <li key={tab.key} className="shrink-0 lg:w-full">
                  <button
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[8px] font-sora text-[13px] text-left transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-cyan-dim text-brand-cyan font-medium'
                        : 'text-ltt2 hover:bg-ltbg hover:text-ltt'
                    }`}
                  >
                    <span className={isActive ? 'text-brand-cyan' : 'text-lttm'}>
                      {tab.icon}
                    </span>
                    <span className="flex-1">{tab.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Tab content */}
        <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-7">

          {activeTab === 'identidad' && (
            <IdentidadTab formData={formData} setFormData={setFormData} isAdmin={isAdmin} />
          )}

          {activeTab === 'datos-legales' && (
            <DatosLegalesTab formData={formData} setFormData={setFormData} isAdmin={isAdmin} />
          )}

          {activeTab === 'perfil-regulatorio' && (
            <PerfilRegulatoriTab formData={formData} setFormData={setFormData} isAdmin={isAdmin} />
          )}

          {activeTab === 'gobernanza' && (
            <GobernanzaTab formData={formData} setFormData={setFormData} isAdmin={isAdmin} />
          )}

          {activeTab === 'operaciones' && (
            <OperacionesTab formData={formData} setFormData={setFormData} isAdmin={isAdmin} />
          )}

          {activeTab === 'comites' && <CommitteesTab />}

          {activeTab === 'plan' && (
            <PlanTab
              plan={organization.plan}
              planStartedAt={organization.plan_started_at}
              planExpiresAt={organization.plan_expires_at}
            />
          )}

          {/* Save button (editable tabs only, excluding Comités which manages itself) */}
          {activeTabConfig.editable && (
            <div className="mt-7 pt-5 border-t border-ltb flex items-center justify-between gap-3">
              <p className="text-[12px] text-lttm font-sora">
                {isAdmin
                  ? 'Los cambios se reflejan en toda la plataforma al guardar.'
                  : 'Contacta a un administrador para modificar estos datos.'}
              </p>
              <button
                type="button"
                onClick={handleSave}
                disabled={!isAdmin || loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-[9px] font-sora text-[13px] font-medium transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_18px_rgba(0,173,239,0.28)] shadow-[0_2px_12px_rgba(0,173,239,0.18)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
