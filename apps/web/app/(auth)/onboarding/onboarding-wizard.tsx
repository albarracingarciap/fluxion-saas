'use client'

import Image from 'next/image'
import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import { Building2, Users2, Rocket, Loader2, Upload, CheckCircle2, ClipboardList, PlusCircle, LayoutDashboard } from "lucide-react"
import {
  assumeOnboardingRole,
  completeOnboarding,
  createOnboardingCommittee,
  inviteOnboardingMember,
  saveOnboardingOrganization,
} from './actions'
import {
  EU_COUNTRIES,
  NORMATIVE_MODULES,
  ORGANIZATION_SECTORS,
  RISK_APPETITE_OPTIONS,
  SECTOR_MODULE_PRESETS,
  type NormativeModule,
  type RiskAppetite,
} from '@/lib/organization/options'

type GovRole = 'sgai_manager' | 'dpo'
type RoleState = { mode: 'invite' | 'self' | 'later'; email: string; done: string | null; error: string | null }

const GOV_ROLES: Array<{ role: GovRole; label: string; desc: string }> = [
  { role: 'sgai_manager', label: 'Responsable del SGAI', desc: 'Aprueba los planes de nivel 1, las evidencias y los documentos del expediente.' },
  { role: 'dpo', label: 'Delegado de Protección de Datos (DPO)', desc: 'Emite dictamen en la DPIA y la FRIA. No puede ser la misma persona que el Responsable del SGAI (RGPD, Art. 38.6).' },
]

const FIRST_SYSTEM: Array<{ href: string; label: string; desc: string; icon: React.ReactNode }> = [
  { href: '/cuestionario-preliminar/nuevo', label: 'Cuestionario preliminar', desc: 'Responde unas preguntas para saber si es un sistema de IA y su nivel de riesgo antes de darlo de alta.', icon: <ClipboardList size={22} /> },
  { href: '/inventario/nuevo', label: 'Registrar un sistema', desc: 'Da de alta el sistema directamente con su ficha completa.', icon: <PlusCircle size={22} /> },
  { href: '/dashboard', label: 'Más tarde', desc: 'Ir al Dashboard; la guía de inicio te acompañará.', icon: <LayoutDashboard size={22} /> },
]

/**
 * Onboarding del Administrador (B18c, F-17): Organización, Equipo y Primer
 * sistema. Madurez e ISO 42001 están en Organización › Perfil regulatorio.
 */
export function OnboardingWizard({ organizationName }: { organizationName: string }) {
  const [step, setStep] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Paso 1 · Organización
  const [sector, setSector] = useState('')
  const [country, setCountry] = useState('Espana')
  const [companySize, setCompanySize] = useState('small')
  const [normativeModules, setNormativeModules] = useState<NormativeModule[]>(['AI Act', 'ISO 42001', 'RGPD'])
  const [riskAppetite, setRiskAppetite] = useState<RiskAppetite>('moderado')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Paso 2 · Equipo
  const [team, setTeam] = useState<Record<GovRole, RoleState>>({
    sgai_manager: { mode: 'invite', email: '', done: null, error: null },
    dpo: { mode: 'invite', email: '', done: null, error: null },
  })
  const [committee, setCommittee] = useState<{ done: boolean; error: string | null }>({ done: false, error: null })

  // Paso 3 · Primer sistema
  const [destination, setDestination] = useState(FIRST_SYSTEM[0].href)

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

  const setRole = (role: GovRole, patch: Partial<RoleState>) =>
    setTeam(t => ({ ...t, [role]: { ...t[role], ...patch } }))

  async function applyRole(role: GovRole) {
    const r = team[role]
    setRole(role, { error: null })
    const res = r.mode === 'self' ? await assumeOnboardingRole(role) : await inviteOnboardingMember(r.email, role)
    if ('error' in res && res.error) setRole(role, { error: res.error })
    else setRole(role, { done: r.mode === 'self' ? 'Asumido por ti' : `Invitación creada para ${r.email.trim()}. Envíale el enlace desde Usuarios.` })
  }

  async function constituteCommittee() {
    const res = await createOnboardingCommittee()
    setCommittee('error' in res ? { done: false, error: res.error } : { done: true, error: null })
  }

  async function handleNext() {
    setError(null)
    if (step === 1) {
      setIsSaving(true)
      const res = await saveOnboardingOrganization({ sector, country, companySize, normativeModules, riskAppetite })
      setIsSaving(false)
      if ('error' in res) { setError(res.error); return }
    }
    setStep(s => Math.min(s + 1, 3))
  }

  async function handleFinish() {
    setError(null)
    setIsSaving(true)
    const res = await completeOnboarding()
    if ('error' in res) { setError(res.error); setIsSaving(false); return }
    router.push(destination)
  }

  return (
    <div className="flex flex-col w-full max-w-[940px] bg-ltcard border border-ltb p-0 rounded-[14px] shadow-[0_8px_32px_#004aad0c] animate-fadein overflow-hidden">
      <div className="bg-ltcard2 border-b border-ltb p-7 px-10 flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="font-fraunces text-[22px] font-semibold text-ltt">Configuración inicial</h1>
          <p className="font-sora text-[14px] text-ltt2 mt-1">Tres pasos para preparar el gobierno de la IA de {organizationName}.</p>
        </div>
        <Image src="/compaas-ia.png" alt="CompaaS IA" width={125} height={36} className="h-9 w-auto opacity-80" priority />
      </div>

      <div className="flex">
        <div className="w-[260px] bg-ltbg border-r border-ltb p-8 flex flex-col space-y-8">
          <StepIndicator currentStep={step} stepNum={1} icon={<Building2 size={18}/>} label="Organización" />
          <StepIndicator currentStep={step} stepNum={2} icon={<Users2 size={18}/>}    label="Equipo" />
          <StepIndicator currentStep={step} stepNum={3} icon={<Rocket size={18}/>}    label="Primer sistema" />
        </div>

        <div className="flex-1 p-10 flex flex-col min-h-[520px]">
          {step === 1 && (
            <div className="flex flex-col animate-fadein space-y-6">
              <h2 className="font-sora text-[18px] font-semibold text-ltt tracking-tight">1. Organización</h2>

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

          {step === 2 && (
            <div className="flex flex-col animate-fadein space-y-6">
              <div>
                <h2 className="font-sora text-[18px] font-semibold text-ltt tracking-tight">2. Equipo de gobierno</h2>
                <p className="font-sora text-[13.5px] text-ltt2 mt-1">
                  Sin estas personas no hay quien apruebe ni dictamine. Puedes invitarlas ahora o hacerlo después en Usuarios.
                </p>
              </div>

              {GOV_ROLES.map(({ role, label, desc }) => {
                const r = team[role]
                return (
                  <div key={role} className="rounded-[10px] border border-ltb bg-ltcard p-4 flex flex-col gap-3">
                    <div>
                      <p className="font-sora text-[14px] font-semibold text-ltt">{label}</p>
                      <p className="font-sora text-[12px] text-lttm mt-0.5">{desc}</p>
                    </div>
                    {r.done ? (
                      <p className="font-sora text-[12.5px] text-gr flex items-center gap-1.5"><CheckCircle2 size={14} /> {r.done}</p>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {([['invite', 'Invitar por correo'], ['self', 'Lo asumo yo'], ['later', 'Más tarde']] as const).map(([mode, text]) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setRole(role, { mode, error: null })}
                              className={`px-3 py-1.5 rounded-[8px] border font-sora text-[12.5px] transition-colors ${r.mode === mode ? 'border-brand-cyan bg-cyan-dim2 text-brand-navy' : 'border-ltb text-ltt2 hover:bg-ltbg'}`}
                            >
                              {text}
                            </button>
                          ))}
                        </div>
                        {r.mode !== 'later' && (
                          <div className="flex gap-2">
                            {r.mode === 'invite' && (
                              <input
                                type="email"
                                value={r.email}
                                onChange={(e) => setRole(role, { email: e.target.value })}
                                placeholder="correo@empresa.com"
                                className="flex-1 px-3 py-2 bg-ltcard border border-ltb rounded-lg font-sora text-[13px] text-ltt focus:border-brand-cyan outline-none"
                              />
                            )}
                            <Button type="button" onClick={() => applyRole(role)} className="font-sora text-[13px] h-auto py-2 px-4 rounded-[8px]">
                              {r.mode === 'invite' ? 'Invitar' : 'Asignarme el rol'}
                            </Button>
                          </div>
                        )}
                        {r.error && <p className="font-sora text-[12px] text-re">{r.error}</p>}
                      </>
                    )}
                  </div>
                )
              })}

              <div className="rounded-[10px] border border-ltb bg-ltcard p-4 flex items-start justify-between gap-4">
                <div>
                  <p className="font-sora text-[14px] font-semibold text-ltt">Comité de IA</p>
                  <p className="font-sora text-[12px] text-lttm mt-0.5">
                    Aprueba los planes de nivel 2 y las decisiones de riesgo. Se constituye contigo como presidente, con revisión
                    trimestral; añade a los demás miembros en Organización › Comités.
                  </p>
                  {committee.error && <p className="font-sora text-[12px] text-re mt-1">{committee.error}</p>}
                </div>
                {committee.done ? (
                  <p className="font-sora text-[12.5px] text-gr flex items-center gap-1.5 shrink-0"><CheckCircle2 size={14} /> Constituido</p>
                ) : (
                  <Button type="button" variant="outline" onClick={constituteCommittee} className="font-sora text-[13px] h-auto py-2 px-4 rounded-[8px] shrink-0">
                    Constituir
                  </Button>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col animate-fadein space-y-6">
              <div>
                <h2 className="font-sora text-[18px] font-semibold text-ltt tracking-tight">3. Primer sistema</h2>
                <p className="font-sora text-[13.5px] text-ltt2 mt-1">
                  ¿Por dónde empiezas? La madurez y el estado frente a ISO/IEC 42001 se indican cuando quieras en
                  Organización › Perfil regulatorio.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {FIRST_SYSTEM.map((opt) => (
                  <button
                    key={opt.href}
                    type="button"
                    onClick={() => setDestination(opt.href)}
                    className={`flex flex-col rounded-[12px] border p-5 text-left transition-all ${
                      destination === opt.href
                        ? 'border-brand-cyan bg-cyan-dim2 shadow-[0_0_0_2px_#00adef14]'
                        : 'border-ltb bg-ltcard hover:border-ltbl hover:bg-ltbg'
                    }`}
                  >
                    <span className={destination === opt.href ? 'text-brand-cyan' : 'text-lttm'}>{opt.icon}</span>
                    <span className={`font-sora text-[14px] font-semibold mt-3 ${destination === opt.href ? 'text-brand-navy' : 'text-ltt'}`}>{opt.label}</span>
                    <span className="font-sora text-[12.5px] text-lttm mt-1 leading-snug">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="font-sora text-[13px] text-re mt-4">{error}</p>}

          <div className="mt-auto pt-10 flex items-center justify-between border-t border-ltb">
            <Button
              variant="ghost"
              onClick={() => setStep(s => Math.max(s - 1, 1))}
              disabled={step === 1 || isSaving}
              className={`font-sora text-[14px] px-6 ${step === 1 ? 'opacity-0 cursor-default pointer-events-none' : 'opacity-100'} hover:bg-ltbg text-ltt2 transition-opacity`}
            >
              Volver atrás
            </Button>

            <div className="flex items-center space-x-4">
              {step < 3 ? (
                <Button onClick={handleNext} disabled={isSaving} className="bg-gradient-to-r from-brand-cyan to-cyan-light text-white shadow-[0_2px_10px_#00adef30] hover:shadow-[0_4px_15px_#00adef40] hover:translate-y-[-1px] transition-all font-sora py-2.5 px-7 h-auto rounded-[8px] text-[14px]">
                  {isSaving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                  Siguiente paso
                </Button>
              ) : (
                <Button
                  onClick={handleFinish}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-gr to-te text-white shadow-[0_2px_10px_#1a8f3830] hover:shadow-[0_4px_15px_#1a8f3840] hover:translate-y-[-1px] transition-all font-sora py-3 px-8 h-auto rounded-[8px] text-[15px] font-semibold disabled:opacity-70 disabled:pointer-events-none"
                >
                  {isSaving ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : null}
                  Terminar
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

