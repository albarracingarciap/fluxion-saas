'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { updateOrganizationProfile } from './actions';
import { CommitteesTab } from './CommitteesTab';
import { Save, Loader2, AlertCircle, CheckCircle2, ArrowLeft, Building2, Globe, Shield, Settings2, CreditCard, Users2 } from 'lucide-react';
import Link from 'next/link';
import {
  EU_COUNTRIES,
  NORMATIVE_MODULES,
  ORGANIZATION_SECTORS,
  RISK_APPETITE_OPTIONS,
  REPORT_LANGUAGES,
  FISCAL_MONTHS,
  type NormativeModule,
  type RiskAppetite,
} from '@/lib/organization/options';
import { LogoUpload } from '@/components/organization/LogoUpload';

// ─── Helpers ────────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  starter:    'Starter',
  pro:        'Pro',
  enterprise: 'Enterprise',
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ─── Sub-componentes de sección ─────────────────────────────────────────────

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
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

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] font-plex uppercase tracking-[0.7px] text-ltt2 mb-1.5">
      {children}
      {required && <span className="text-re text-[10px]">*</span>}
    </label>
  )
}

const inputCls = "w-full bg-ltcard border border-ltb rounded-[8px] px-3 py-2.5 text-[13.5px] text-ltt font-sora outline-none transition-all focus:border-brand-cyan focus:ring-[3px] focus:ring-brand-cyan/10 disabled:opacity-50 disabled:bg-ltcard2"
const selectCls = inputCls + " appearance-none pr-8 cursor-pointer"

function SelectArrow() {
  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-lttm opacity-70">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
        <path d="M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
      </svg>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function OrganizationPage() {
  const { organization, role, loadUserData } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'config' | 'comites'>('config');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name:               '',
    slug:               '',
    logo_url:           '',
    sector:             '',
    country:            'Espana',
    size:               '',
    geography:          [] as string[],
    normative_modules:  [] as NormativeModule[],
    apetito_riesgo:     'moderado' as RiskAppetite,
    sgai_responsible:   '',
    sgai_email:         '',
    fiscal_year_start:  1,
    report_language:    'es',
  });

  const isAdmin = role === 'org_admin';

  useEffect(() => {
    if (organization) {
      const s = (organization.settings ?? {}) as Record<string, unknown>
      setFormData({
        name:               organization.name || '',
        slug:               organization.slug || '',
        logo_url:           organization.logo_url || '',
        sector:             organization.sector || '',
        country:            organization.country || 'Espana',
        size:               organization.size || '',
        geography:          (organization.geography as string[] | undefined) || [],
        normative_modules:  (organization.normative_modules as NormativeModule[] | undefined) || [],
        apetito_riesgo:     (organization.apetito_riesgo as RiskAppetite | undefined) || 'moderado',
        sgai_responsible:   typeof s.sgai_responsible === 'string' ? s.sgai_responsible : '',
        sgai_email:         typeof s.sgai_email === 'string' ? s.sgai_email : '',
        fiscal_year_start:  typeof s.fiscal_year_start === 'number' ? s.fiscal_year_start : 1,
        report_language:    typeof s.report_language === 'string' ? s.report_language : 'es',
      });
    }
  }, [organization]);

  function toggleNormativeModule(module: NormativeModule) {
    setFormData((prev) => ({
      ...prev,
      normative_modules: prev.normative_modules.includes(module)
        ? prev.normative_modules.filter((m) => m !== module)
        : [...prev.normative_modules, module],
    }));
  }

  function toggleGeography(country: string) {
    setFormData((prev) => ({
      ...prev,
      geography: prev.geography.includes(country)
        ? prev.geography.filter((c) => c !== country)
        : [...prev.geography, country],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
          sgai_responsible:  formData.sgai_responsible,
          sgai_email:        formData.sgai_email,
          fiscal_year_start: formData.fiscal_year_start,
          report_language:   formData.report_language,
        },
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

  return (
    <div className="max-w-[1280px] w-full mx-auto animate-fadein pb-10">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-[12px] font-plex text-lttm uppercase tracking-wider">
        <Link href="/dashboard" className="flex items-center gap-1.5 hover:text-brand-cyan transition-colors">
          <ArrowLeft size={14} className="text-lttm" />
          <span>Configuración</span>
        </Link>
        <span>/</span>
        <span className="text-ltt font-medium">Gestión de Organización</span>
      </div>

      <div className="mb-6">
        <h1 className="font-fraunces text-2xl font-semibold tracking-tight text-ltt mb-1.5">
          Organización
        </h1>
        <p className="text-[13px] text-ltt2 font-sora leading-relaxed">
          Configura los datos de tu tenant y gestiona los órganos de gobernanza del SGAI.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-ltb mb-7">
        {([
          { key: 'config',  label: 'Configuración', Icon: Settings2 },
          { key: 'comites', label: 'Comités',        Icon: Users2   },
        ] as const).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 font-sora text-[13px] border-b-2 -mb-px transition-all ${
              activeTab === key
                ? 'border-brand-cyan text-brand-navy font-medium'
                : 'border-transparent text-lttm hover:text-ltt'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Comités ──────────────────────────────────── */}
      {activeTab === 'comites' && <CommitteesTab />}

      {/* ── Tab: Configuración ───────────────────────────── */}
      {activeTab === 'config' && <>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-2 bg-redim border border-reb text-re text-[12px] font-sora p-3.5 rounded-[8px] mb-5">
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* ── 1. Identidad ─────────────────────────────────── */}
        <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-7">
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
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
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
                onUploaded={(url) => setFormData({ ...formData, logo_url: url })}
              />
              <p className="font-sora text-[11.5px] text-lttm mt-2">
                Se usará en los informes generados por el Agente 3.
              </p>
            </div>

          </div>
        </div>

        {/* ── 2. Perfil regulatorio ─────────────────────────── */}
        <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-7">
          <SectionHeader
            icon={<Globe size={16} className="text-ltt2" />}
            title="Perfil regulatorio"
            description="Sector, país principal, tamaño y presencia geográfica en la UE."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-5">

            <div>
              <FieldLabel>Sector de la Empresa</FieldLabel>
              <div className="relative">
                <select
                  disabled={!isAdmin}
                  value={formData.sector}
                  onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                  className={selectCls}
                >
                  <option value="">Selecciona un sector...</option>
                  {ORGANIZATION_SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {s === 'Banca y Finanzas' ? 'Banca y Finanzas (EBA/DORA)'
                        : s === 'Salud' ? 'Salud (MDR/IVDR)'
                        : s === 'Sector Publico' ? 'Sector Público (ENS)'
                        : s}
                    </option>
                  ))}
                </select>
                <SelectArrow />
              </div>
            </div>

            <div>
              <FieldLabel>País principal</FieldLabel>
              <div className="relative">
                <select
                  disabled={!isAdmin}
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className={selectCls}
                >
                  {EU_COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <SelectArrow />
              </div>
            </div>

            <div>
              <FieldLabel>Volumen de Empleados</FieldLabel>
              <div className="relative">
                <select
                  disabled={!isAdmin}
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  className={selectCls}
                >
                  <option value="">Selecciona un tamaño...</option>
                  <option value="micro">Micro (1-10)</option>
                  <option value="small">Pequeña (11-50)</option>
                  <option value="medium">Mediana (51-250)</option>
                  <option value="large">Grande (251-1000)</option>
                  <option value="enterprise">Enterprise (+1000)</option>
                </select>
                <SelectArrow />
              </div>
            </div>

            {/* Alcance geográfico */}
            <div className="md:col-span-3">
              <FieldLabel>Alcance geográfico</FieldLabel>
              <p className="font-sora text-[11.5px] text-lttm mb-3">
                Países de la UE donde opera la organización, además del país principal.
                {formData.geography.length > 0 && (
                  <span className="ml-2 text-brand-cyan font-medium">{formData.geography.length} seleccionados</span>
                )}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2">
                {EU_COUNTRIES.map((c) => {
                  const selected = formData.geography.includes(c)
                  return (
                    <button
                      key={c}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => toggleGeography(c)}
                      className={`px-2.5 py-1.5 rounded-[7px] border font-sora text-[11.5px] text-center transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        selected
                          ? 'border-brand-cyan bg-[var(--cyan-dim2)] text-brand-navy font-medium'
                          : 'border-ltb bg-ltcard2 text-ltt2 hover:border-ltbl hover:bg-ltbg'
                      }`}
                    >
                      {c}
                    </button>
                  )
                })}
              </div>
            </div>

          </div>
        </div>

        {/* ── 3. Marco normativo ──────────────────────────────── */}
        <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-7">
          <SectionHeader
            icon={<Shield size={16} className="text-ltt2" />}
            title="Marco normativo"
            description="Módulos regulatorios activos y nivel de apetito al riesgo de la organización."
          />

          <div className="flex flex-col gap-6">
            <div>
              <FieldLabel>Módulos normativos</FieldLabel>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-1">
                {NORMATIVE_MODULES.map((module) => {
                  const selected = formData.normative_modules.includes(module)
                  return (
                    <button
                      key={module}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => toggleNormativeModule(module)}
                      className={`flex items-center justify-between gap-3 rounded-[10px] border px-4 py-3 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        selected
                          ? 'border-brand-cyan bg-[var(--cyan-dim2)] shadow-[0_0_0_2px_#00adef14]'
                          : 'border-ltb bg-ltcard hover:border-ltbl hover:bg-ltbg'
                      }`}
                    >
                      <span className={`font-sora text-[13px] font-medium ${selected ? 'text-brand-navy' : 'text-ltt'}`}>
                        {module}
                      </span>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[11px] shrink-0 ${
                        selected ? 'border-brand-cyan bg-brand-cyan text-white' : 'border-ltbl text-transparent'
                      }`}>
                        ✓
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <FieldLabel>Apetito al riesgo</FieldLabel>
              <div className="grid grid-cols-3 gap-3 mt-1">
                {RISK_APPETITE_OPTIONS.map((item) => {
                  const selected = formData.apetito_riesgo === item
                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => setFormData({ ...formData, apetito_riesgo: item })}
                      className={`rounded-[10px] border px-4 py-3 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        selected
                          ? 'border-brand-cyan bg-[var(--cyan-dim2)] shadow-[0_0_0_2px_#00adef14]'
                          : 'border-ltb bg-ltcard hover:border-ltbl hover:bg-ltbg'
                      }`}
                    >
                      <span className={`font-sora text-[13px] font-medium block ${selected ? 'text-brand-navy' : 'text-ltt'}`}>
                        {item[0].toUpperCase() + item.slice(1)}
                      </span>
                      <span className="font-sora text-[11.5px] text-lttm mt-1 block">
                        {item === 'conservador' ? 'Mayor aversión al riesgo'
                          : item === 'moderado' ? 'Equilibrio entre control y agilidad'
                          : 'Mayor tolerancia al cambio'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. Parámetros del SGAI ──────────────────────────── */}
        <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-7">
          <SectionHeader
            icon={<Settings2 size={16} className="text-ltt2" />}
            title="Parámetros del SGAI"
            description="Datos de contacto del responsable del SGAI y preferencias operativas."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

            <div>
              <FieldLabel>Responsable del SGAI</FieldLabel>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.sgai_responsible}
                onChange={(e) => setFormData({ ...formData, sgai_responsible: e.target.value })}
                className={inputCls}
                placeholder="Nombre y apellidos"
              />
            </div>

            <div>
              <FieldLabel>Email de contacto del SGAI</FieldLabel>
              <input
                type="email"
                disabled={!isAdmin}
                value={formData.sgai_email}
                onChange={(e) => setFormData({ ...formData, sgai_email: e.target.value })}
                className={inputCls}
                placeholder="sgai@empresa.com"
              />
            </div>

            <div>
              <FieldLabel>Inicio del ejercicio fiscal</FieldLabel>
              <div className="relative">
                <select
                  disabled={!isAdmin}
                  value={formData.fiscal_year_start}
                  onChange={(e) => setFormData({ ...formData, fiscal_year_start: Number(e.target.value) })}
                  className={selectCls}
                >
                  {FISCAL_MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <SelectArrow />
              </div>
              <p className="font-sora text-[11.5px] text-lttm mt-1.5">
                Afecta a los ciclos de revisión FMEA y plazos de tratamiento.
              </p>
            </div>

            <div>
              <FieldLabel>Idioma de los documentos</FieldLabel>
              <div className="relative">
                <select
                  disabled={!isAdmin}
                  value={formData.report_language}
                  onChange={(e) => setFormData({ ...formData, report_language: e.target.value })}
                  className={selectCls}
                >
                  {REPORT_LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
                <SelectArrow />
              </div>
              <p className="font-sora text-[11.5px] text-lttm mt-1.5">
                Idioma por defecto para informes generados por el Agente 3.
              </p>
            </div>

          </div>
        </div>

        {/* ── 5. Plan (solo lectura) ───────────────────────────── */}
        <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-7">
          <SectionHeader
            icon={<CreditCard size={16} className="text-ltt2" />}
            title="Plan contratado"
            description="Información sobre la suscripción activa. Para cambiar de plan contacta con el equipo de Fluxion."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-[9px] border border-ltb bg-ltcard2 px-4 py-3">
              <div className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1">Plan activo</div>
              <div className="font-sora text-[14px] font-semibold text-ltt">
                {PLAN_LABELS[organization.plan] ?? organization.plan ?? '—'}
              </div>
            </div>
            <div className="rounded-[9px] border border-ltb bg-ltcard2 px-4 py-3">
              <div className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1">Inicio</div>
              <div className="font-sora text-[13.5px] text-ltt2">
                {formatDate(organization.plan_started_at)}
              </div>
            </div>
            <div className="rounded-[9px] border border-ltb bg-ltcard2 px-4 py-3">
              <div className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1">Vigencia</div>
              <div className="font-sora text-[13.5px] text-ltt2">
                {formatDate(organization.plan_expires_at)}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-1">
          {!isAdmin ? (
            <p className="text-[12px] text-lttm font-sora">
              Contacta a un administrador para modificar estos datos.
            </p>
          ) : (
            <p className="text-[12px] text-lttm font-sora">
              Verifica los datos antes de guardar cambios.
            </p>
          )}
          <button
            type="submit"
            disabled={!isAdmin || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-[9px] font-sora text-[13px] font-medium transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_18px_rgba(0,173,239,0.28)] shadow-[0_2px_12px_rgba(0,173,239,0.18)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>

      </form>
      </>}

    </div>
  );
}
