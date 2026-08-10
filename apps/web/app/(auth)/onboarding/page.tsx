'use client'

import Image from 'next/image'
import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import { Building2, ShieldCheck, Target, CheckCircle2, Loader2, Upload } from "lucide-react"
import { saveOnboarding } from './actions'
import {
  EU_COUNTRIES,
  NORMATIVE_MODULES,
  ORGANIZATION_SECTORS,
  RISK_APPETITE_OPTIONS,
  SECTOR_MODULE_PRESETS,
  type NormativeModule,
  type RiskAppetite,
} from '@/lib/organization/options'

type Iso42001Status = 'certified' | 'in_progress' | 'none'
type AiInventoryStatus = 'complete' | 'partial' | 'none'
type ComplianceMaturity = 0 | 25 | 50 | 75
type FirstFocus = 'inventory' | 'compliance' | 'risk' | 'governance'

const MATURITY_OPTIONS: { value: ComplianceMaturity; label: string; desc: string }[] = [
  { value: 0,  label: 'Inicial',       desc: 'Sin procesos formales de gobernanza IA' },
  { value: 25, label: 'En desarrollo', desc: 'Primeros controles y políticas en marcha' },
  { value: 50, label: 'Avanzado',      desc: 'Procesos documentados y en uso regular' },
  { value: 75, label: 'Optimizado',    desc: 'Mejora continua y auditorías periódicas' },
]

const FOCUS_OPTIONS: { value: FirstFocus; label: string; desc: string; icon: string }[] = [
  { value: 'inventory',   label: 'Inventario de Sistemas IA', desc: 'Registra y clasifica todos los sistemas IA en uso', icon: '📦' },
  { value: 'compliance',  label: 'Cumplimiento Regulatorio',  desc: 'Verifica el estado frente a AI Act e ISO 42001',   icon: '⚖️' },
  { value: 'risk',        label: 'Gestión de Riesgos',        desc: 'Evalúa y mitiga riesgos de tus sistemas de IA',    icon: '🛡️' },
  { value: 'governance',  label: 'Gobernanza y Comités',      desc: 'Configura comités y define responsabilidades',      icon: '🏛️' },
]

export default function OnboardingWizard() {
  const [step, setStep] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

  // Step 1: Perfil Org
  const [sector, setSector] = useState('')
  const [country, setCountry] = useState('Espana')
  const [companySize, setCompanySize] = useState('small')
  const [normativeModules, setNormativeModules] = useState<NormativeModule[]>(['AI Act', 'ISO 42001', 'RGPD'])
  const [riskAppetite, setRiskAppetite] = useState<RiskAppetite>('moderado')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 2: Cumplimiento ISO 42001
  const [iso42001Status, setIso42001Status] = useState<Iso42001Status>('none')
  const [iso42001CertDate, setIso42001CertDate] = useState('')
  const [iso42001CertBody, setIso42001CertBody] = useState('')
  const [aiInventoryStatus, setAiInventoryStatus] = useState<AiInventoryStatus>('none')
  const [complianceMaturity, setComplianceMaturity] = useState<ComplianceMaturity>(0)

  // Step 3: Foco inicial
  const [firstFocus, setFirstFocus] = useState<FirstFocus>('inventory')

  const handleNext = () => setStep(s => Math.min(s + 1, 4))
  const handlePrev = () => setStep(s => Math.max(s - 1, 1))

  const handleSectorChange = (value: string) => {
    setSector(value)
    const preset = SECTOR_MODULE_PRESETS[value]
    if (preset) { setNormativeModules(preset); return }
    setNormativeModules(current => current.filter(m => !['ENS', 'DORA', 'MDR/IVDR'].includes(m)))
  }

  const toggleNormativeModule = (module: NormativeModule) => {
    setNormativeModules(current =>
      current.includes(module) ? current.filter(m => m !== module) : [...current, module]
    )
  }

  const handleLogoClick = () => fileInputRef.current?.click()

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingLogo(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/organization/upload-logo', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al subir logo')
      setLogoUrl(json.url)
    } catch (err) {
      console.error('[logo-upload]', err)
      alert('No se pudo subir el logo. Comprueba el tamaño (máx. 2 MB) e inténtalo de nuevo.')
    } finally {
      setIsUploadingLogo(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFinish = async () => {
    setIsSaving(true)
    try {
      const result = await saveOnboarding({
        sector,
        country,
        companySize,
        normativeModules,
        riskAppetite,
        iso42001Status,
        iso42001CertDate: iso42001CertDate || null,
        iso42001CertBody: iso42001CertBody || null,
        aiInventoryStatus,
        complianceMaturity,
        firstFocus,
      })
      if (result.success) router.push('/dashboard')
    } catch (e) {
      console.error(e)
      alert('Uh oh, hubo un error de escritura. Revisa tus logs en consola.')
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col w-full max-w-[940px] bg-ltcard border border-ltb p-0 rounded-[14px] shadow-[0_8px_32px_#004aad0c] animate-fadein overflow-hidden">
      {/* Header */}
      <div className="bg-ltcard2 border-b border-ltb p-7 px-10 flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="font-fraunces text-[22px] font-semibold text-ltt">Configuración Inicial</h1>
          <p className="font-sora text-[14px] text-ltt2 mt-1">Completa estos pasos para adaptar Fluxion a tu organización.</p>
        </div>
        <Image src="/fluxion.png" alt="Fluxion Logo" width={126} height={36} className="h-9 w-auto opacity-80" priority />
      </div>

      <div className="flex">
        {/* Sidebar Stepper */}
        <div className="w-[260px] bg-ltbg border-r border-ltb p-8 flex flex-col space-y-8">
          <StepIndicator currentStep={step} stepNum={1} icon={<Building2 size={18}/>}    label="Perfil Org" />
          <StepIndicator currentStep={step} stepNum={2} icon={<ShieldCheck size={18}/>}  label="Cumplimiento ISO" />
          <StepIndicator currentStep={step} stepNum={3} icon={<Target size={18}/>}       label="Foco Inicial" />
          <StepIndicator currentStep={step} stepNum={4} icon={<CheckCircle2 size={18}/>} label="Completado" />
        </div>

        {/* Content Area */}
        <div className="flex-1 p-10 flex flex-col min-h-[460px]">

          {/* ─── STEP 1: Perfil Org ─── */}
          {step === 1 && (
            <div className="flex flex-col animate-fadein space-y-6">
              <h2 className="font-sora text-[18px] font-semibold text-ltt tracking-tight">1. Detalles de la Organización</h2>

              <div className="flex flex-col space-y-2">
                <label className="font-plex text-[11.5px] uppercase text-lttm tracking-wider">Sector Industrial Principal</label>
                <select
                  value={sector}
                  onChange={(e) => handleSectorChange(e.target.value)}
                  className="px-4 py-3 bg-ltcard border border-ltb rounded-lg font-sora text-[14px] text-ltt focus:border-brand-cyan outline-none shadow-[0_0_0_2px_transparent] focus:shadow-[0_0_0_3px_#00adef15]"
                >
                  <option value="">Selecciona un sector...</option>
                  {ORGANIZATION_SECTORS.map((item) => (
                    <option key={item} value={item}>
                      {item === 'Banca y Finanzas' ? 'Banca y Finanzas (EBA/DORA)' :
                       item === 'Salud'             ? 'Salud (MDR/IVDR)' :
                       item === 'Sector Publico'    ? 'Sector Público (ENS)' : item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="flex flex-col space-y-2">
                  <label className="font-plex text-[11.5px] uppercase text-lttm tracking-wider">País de operación principal</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="px-4 py-3 bg-ltcard border border-ltb rounded-lg font-sora text-[14px] text-ltt focus:border-brand-cyan outline-none shadow-[0_0_0_2px_transparent] focus:shadow-[0_0_0_3px_#00adef15]"
                  >
                    {EU_COUNTRIES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>

                <div className="flex flex-col space-y-2">
                  <label className="font-plex text-[11.5px] uppercase text-lttm tracking-wider">Apetito al riesgo</label>
                  <select
                    value={riskAppetite}
                    onChange={(e) => setRiskAppetite(e.target.value as RiskAppetite)}
                    className="px-4 py-3 bg-ltcard border border-ltb rounded-lg font-sora text-[14px] text-ltt focus:border-brand-cyan outline-none shadow-[0_0_0_2px_transparent] focus:shadow-[0_0_0_3px_#00adef15]"
                  >
                    {RISK_APPETITE_OPTIONS.map((item) => (
                      <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <label className="font-plex text-[11.5px] uppercase text-lttm tracking-wider">Tamaño de la Compañía</label>
                <select
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  className="px-4 py-3 bg-ltcard border border-ltb rounded-lg font-sora text-[14px] text-ltt focus:border-brand-cyan outline-none shadow-[0_0_0_2px_transparent] focus:shadow-[0_0_0_3px_#00adef15]"
                >
                  <option value="small">1 - 50 empleados</option>
                  <option value="medium">51 - 500 empleados</option>
                  <option value="large">Más de 500 empleados</option>
                </select>
              </div>

              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <label className="font-plex text-[11.5px] uppercase text-lttm tracking-wider">Módulos normativos activos</label>
                  <span className="font-sora text-[12px] text-lttm">Se precargan según el sector y puedes ajustarlos.</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {NORMATIVE_MODULES.map((module) => {
                    const isSelected = normativeModules.includes(module)
                    return (
                      <button
                        key={module}
                        type="button"
                        onClick={() => toggleNormativeModule(module)}
                        className={`flex items-center justify-between gap-3 rounded-[10px] border px-4 py-3 text-left transition-all ${
                          isSelected
                            ? 'border-brand-cyan bg-cyan-dim2 shadow-[0_0_0_2px_#00adef14]'
                            : 'border-ltb bg-ltcard hover:border-ltbl hover:bg-ltbg'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className={`font-sora text-[14px] font-medium ${isSelected ? 'text-brand-navy' : 'text-ltt'}`}>{module}</span>
                          <span className="font-sora text-[11.5px] text-lttm">{isSelected ? 'Activo en tu tenant' : 'Pulsa para activarlo'}</span>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[11px] ${
                          isSelected ? 'border-brand-cyan bg-brand-cyan text-white' : 'border-ltbl text-transparent'
                        }`}>✓</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Logo upload */}
              <div className="flex flex-col space-y-2">
                <label className="font-plex text-[11.5px] uppercase text-lttm tracking-wider">Logotipo Corporativo</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <button
                  type="button"
                  onClick={handleLogoClick}
                  disabled={isUploadingLogo}
                  className="border-2 border-dashed border-ltb rounded-[10px] p-6 flex flex-col items-center justify-center bg-ltbg cursor-pointer hover:bg-cyan-dim transition-colors group disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isUploadingLogo ? (
                    <Loader2 className="animate-spin text-brand-cyan w-6 h-6 mb-2" />
                  ) : logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="Logo corporativo" className="h-12 object-contain mb-2" />
                  ) : (
                    <Upload size={22} className="text-lttm group-hover:text-brand-cyan transition-colors mb-2" />
                  )}
                  <span className="font-sora text-[13px] text-ltt2 group-hover:text-brand-cyan transition-colors">
                    {isUploadingLogo ? 'Subiendo...' : logoUrl ? 'Haz clic para cambiar el logo' : 'Haz clic para subir un logo oficial (máx. 2 MB)'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 2: Cumplimiento ISO 42001 ─── */}
          {step === 2 && (
            <div className="flex flex-col animate-fadein space-y-6">
              <div>
                <h2 className="font-sora text-[18px] font-semibold text-ltt tracking-tight">2. Contexto de Cumplimiento</h2>
                <p className="font-sora text-[13.5px] text-ltt2 mt-1">Indica tu situación actual frente a ISO 42001. Esta información personaliza las recomendaciones de la plataforma.</p>
              </div>

              {/* Estado ISO 42001 */}
              <div className="flex flex-col space-y-3">
                <label className="font-plex text-[11.5px] uppercase text-lttm tracking-wider">Estado frente a ISO 42001</label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { value: 'none' as Iso42001Status,        label: 'Sin certificación',    desc: 'No iniciado o no aplica' },
                    { value: 'in_progress' as Iso42001Status, label: 'En proceso',            desc: 'Implantación en marcha' },
                    { value: 'certified' as Iso42001Status,   label: 'Certificado',           desc: 'Certificado y vigente' },
                  ]).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setIso42001Status(opt.value)}
                      className={`flex flex-col rounded-[10px] border px-4 py-3 text-left transition-all ${
                        iso42001Status === opt.value
                          ? 'border-brand-cyan bg-cyan-dim2 shadow-[0_0_0_2px_#00adef14]'
                          : 'border-ltb bg-ltcard hover:border-ltbl hover:bg-ltbg'
                      }`}
                    >
                      <span className={`font-sora text-[13.5px] font-semibold ${iso42001Status === opt.value ? 'text-brand-navy' : 'text-ltt'}`}>{opt.label}</span>
                      <span className="font-sora text-[11.5px] text-lttm mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Campos condicionales si está certificado */}
              {iso42001Status === 'certified' && (
                <div className="grid grid-cols-2 gap-5 animate-fadein">
                  <div className="flex flex-col space-y-2">
                    <label className="font-plex text-[11.5px] uppercase text-lttm tracking-wider">Fecha de certificación</label>
                    <input
                      type="date"
                      value={iso42001CertDate}
                      onChange={(e) => setIso42001CertDate(e.target.value)}
                      className="px-4 py-3 bg-ltcard border border-ltb rounded-lg font-sora text-[14px] text-ltt focus:border-brand-cyan outline-none shadow-[0_0_0_2px_transparent] focus:shadow-[0_0_0_3px_#00adef15]"
                    />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <label className="font-plex text-[11.5px] uppercase text-lttm tracking-wider">Organismo certificador</label>
                    <input
                      type="text"
                      value={iso42001CertBody}
                      onChange={(e) => setIso42001CertBody(e.target.value)}
                      placeholder="Ej. Bureau Veritas, AENOR..."
                      className="px-4 py-3 bg-ltcard border border-ltb rounded-lg font-sora text-[14px] text-ltt placeholder:text-lttm focus:border-brand-cyan outline-none shadow-[0_0_0_2px_transparent] focus:shadow-[0_0_0_3px_#00adef15]"
                    />
                  </div>
                </div>
              )}

              {/* Inventario IA */}
              <div className="flex flex-col space-y-3">
                <label className="font-plex text-[11.5px] uppercase text-lttm tracking-wider">Estado del inventario de sistemas IA</label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { value: 'none' as AiInventoryStatus,    label: 'No iniciado', desc: 'Sin inventario formal' },
                    { value: 'partial' as AiInventoryStatus, label: 'Parcial',     desc: 'Algunos sistemas registrados' },
                    { value: 'complete' as AiInventoryStatus,label: 'Completo',    desc: 'Inventario exhaustivo' },
                  ]).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAiInventoryStatus(opt.value)}
                      className={`flex flex-col rounded-[10px] border px-4 py-3 text-left transition-all ${
                        aiInventoryStatus === opt.value
                          ? 'border-brand-cyan bg-cyan-dim2 shadow-[0_0_0_2px_#00adef14]'
                          : 'border-ltb bg-ltcard hover:border-ltbl hover:bg-ltbg'
                      }`}
                    >
                      <span className={`font-sora text-[13.5px] font-semibold ${aiInventoryStatus === opt.value ? 'text-brand-navy' : 'text-ltt'}`}>{opt.label}</span>
                      <span className="font-sora text-[11.5px] text-lttm mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Madurez de cumplimiento */}
              <div className="flex flex-col space-y-3">
                <label className="font-plex text-[11.5px] uppercase text-lttm tracking-wider">Madurez de gobernanza IA</label>
                <div className="grid grid-cols-2 gap-3">
                  {MATURITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setComplianceMaturity(opt.value)}
                      className={`flex items-center justify-between gap-3 rounded-[10px] border px-4 py-3 text-left transition-all ${
                        complianceMaturity === opt.value
                          ? 'border-brand-cyan bg-cyan-dim2 shadow-[0_0_0_2px_#00adef14]'
                          : 'border-ltb bg-ltcard hover:border-ltbl hover:bg-ltbg'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className={`font-sora text-[13.5px] font-semibold ${complianceMaturity === opt.value ? 'text-brand-navy' : 'text-ltt'}`}>{opt.label}</span>
                        <span className="font-sora text-[11.5px] text-lttm mt-0.5">{opt.desc}</span>
                      </div>
                      <span className={`font-plex text-[12px] font-semibold shrink-0 ${complianceMaturity === opt.value ? 'text-brand-cyan' : 'text-lttm'}`}>{opt.value}%</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Foco Inicial ─── */}
          {step === 3 && (
            <div className="flex flex-col animate-fadein space-y-6">
              <div>
                <h2 className="font-sora text-[18px] font-semibold text-ltt tracking-tight">3. Prioridad de Despliegue</h2>
                <p className="font-sora text-[13.5px] text-ltt2 mt-1">¿Por dónde quieres comenzar tu viaje de gobernanza IA? Podrás cambiar el foco en cualquier momento desde el dashboard.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {FOCUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFirstFocus(opt.value)}
                    className={`flex flex-col rounded-[12px] border p-5 text-left transition-all ${
                      firstFocus === opt.value
                        ? 'border-brand-cyan bg-cyan-dim2 shadow-[0_0_0_2px_#00adef14]'
                        : 'border-ltb bg-ltcard hover:border-ltbl hover:bg-ltbg'
                    }`}
                  >
                    <span className="text-[26px] mb-3">{opt.icon}</span>
                    <span className={`font-sora text-[14px] font-semibold ${firstFocus === opt.value ? 'text-brand-navy' : 'text-ltt'}`}>{opt.label}</span>
                    <span className="font-sora text-[12.5px] text-lttm mt-1 leading-snug">{opt.desc}</span>
                    {firstFocus === opt.value && (
                      <span className="mt-3 self-start font-plex text-[10px] uppercase text-brand-cyan border border-brand-cyan/30 bg-brand-cyan/10 rounded px-2 py-0.5">Seleccionado</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── STEP 4: Completado ─── */}
          {step === 4 && (
            <div className="flex flex-col items-center justify-center flex-1 animate-fadein text-center">
              <div className="relative">
                {isSaving && (
                  <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center rounded-full">
                    <Loader2 className="animate-spin text-brand-cyan w-8 h-8" />
                  </div>
                )}
                <div className="w-20 h-20 bg-grdim rounded-full flex items-center justify-center mb-5 shrink-0">
                  <CheckCircle2 className="text-gr w-10 h-10" />
                </div>
              </div>
              <h2 className="font-fraunces text-3xl font-semibold text-ltt">
                {isSaving ? 'Guardando...' : '¡Todo configurado!'}
              </h2>
              <p className="font-sora text-[15px] text-ltt2 mt-3 max-w-[360px] leading-relaxed">
                Tu organización y acceso seguro a la plataforma están listos. Accediendo al entorno principal en breves instantes...
              </p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-auto pt-10 flex items-center justify-between border-t border-ltb">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={step === 1 || step === 4 || isSaving}
              className={`font-sora text-[14px] px-6 ${step === 1 || step === 4 ? 'opacity-0 cursor-default pointer-events-none' : 'opacity-100'} hover:bg-ltbg text-ltt2 transition-opacity`}
            >
              Volver atrás
            </Button>

            <div className="flex items-center space-x-4">
              {step < 4 && (
                <Button variant="link" onClick={handleNext} className="font-sora text-[14px] text-lttm hover:text-ltt transition-colors">
                  Omitir paso
                </Button>
              )}
              {step < 4 ? (
                <Button onClick={handleNext} className="bg-gradient-to-r from-brand-cyan to-cyan-light text-white shadow-[0_2px_10px_#00adef30] hover:shadow-[0_4px_15px_#00adef40] hover:translate-y-[-1px] transition-all font-sora py-2.5 px-7 h-auto rounded-[8px] text-[14px]">
                  Siguiente paso
                </Button>
              ) : (
                <Button
                  onClick={handleFinish}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-gr to-te text-white shadow-[0_2px_10px_#1a8f3830] hover:shadow-[0_4px_15px_#1a8f3840] hover:translate-y-[-1px] transition-all font-sora py-3 px-8 h-auto rounded-[8px] text-[15px] font-semibold disabled:opacity-70 disabled:pointer-events-none"
                >
                  {isSaving ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : null}
                  Acceder al Dashboard
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepIndicator({ currentStep, stepNum, icon, label }: { currentStep: number; stepNum: number; icon: React.ReactNode; label: string }) {
  const isCompleted = currentStep > stepNum
  const isActive = currentStep === stepNum

  return (
    <div className={`flex items-center space-x-4 transition-colors ${isActive ? 'text-brand-cyan' : isCompleted ? 'text-ltt' : 'text-lttm'}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300
        ${isActive    ? 'bg-cyan-dim border-cyan-border text-brand-cyan shadow-[0_0_8px_#00adef15]' :
          isCompleted ? 'bg-ltcard2 border-ltb text-ltt' :
                        'bg-transparent border-ltb text-lttm'}`}>
        {icon}
      </div>
      <span className={`font-sora text-[14px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{label}</span>
    </div>
  )
}
