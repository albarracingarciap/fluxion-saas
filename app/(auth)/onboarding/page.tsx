'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import { Building2, Package, Users, CheckCircle2, Loader2, X } from "lucide-react"
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

export default function OnboardingWizard() {
  const [step, setStep] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

  // --- LOCAL STATE ACCUMULATOR ---
  const [sector, setSector] = useState('')
  const [country, setCountry] = useState('Espana')
  const [companySize, setCompanySize] = useState('')
  const [normativeModules, setNormativeModules] = useState<NormativeModule[]>([
    'AI Act',
    'ISO 42001',
    'RGPD',
  ])
  const [riskAppetite, setRiskAppetite] = useState<RiskAppetite>('moderado')
  const [plan, setPlan] = useState('professional')
  
  // Invitaciones Draft
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('viewer')
  const [invitations, setInvitations] = useState<{email: string, role: string}[]>([])

  const handleNext = () => setStep(s => Math.min(s + 1, 4))
  const handlePrev = () => setStep(s => Math.max(s - 1, 1))

  const handleSectorChange = (value: string) => {
    setSector(value)
    const preset = SECTOR_MODULE_PRESETS[value]
    if (preset) {
      setNormativeModules(preset)
      return
    }

    setNormativeModules((current) =>
      current.filter(
        (module) => !['ENS', 'DORA', 'MDR/IVDR'].includes(module)
      )
    )
  }

  const toggleNormativeModule = (module: NormativeModule) => {
    setNormativeModules((current) =>
      current.includes(module)
        ? current.filter((item) => item !== module)
        : [...current, module]
    )
  }
  
  const handleAddInvite = () => {
    if (!inviteEmail) return
    setInvitations([...invitations, { email: inviteEmail, role: inviteRole }])
    setInviteEmail('') // clear input
  }

  const handleRemoveInvite = (emailToRemove: string) => {
    setInvitations(invitations.filter(i => i.email !== emailToRemove))
  }

  const handleFinish = async () => {
    setIsSaving(true)
    try {
      // Mandamos todos los datos recopilados al backend a través del Server Action
      const result = await saveOnboarding({
        sector,
        country,
        companySize,
        normativeModules,
        riskAppetite,
        plan,
        invitations
      })
      if (result.success) {
        router.push('/dashboard')
      }
    } catch (e) {
      console.error(e)
      alert("Uh oh, hubo un error de escritura. Revisa tus logs en consola.")
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
        <Image
          src="/fluxion.png"
          alt="Fluxion Logo"
          width={126}
          height={36}
          className="h-9 w-auto opacity-80"
          priority
        />
      </div>

      <div className="flex">
        {/* Sidebar Stepper */}
        <div className="w-[260px] bg-ltbg border-r border-ltb p-8 flex flex-col space-y-8">
           <StepIndicator currentStep={step} stepNum={1} icon={<Building2 size={18}/>} label="Perfil Org" />
           <StepIndicator currentStep={step} stepNum={2} icon={<Package size={18}/>} label="Plan y Módulos" />
           <StepIndicator currentStep={step} stepNum={3} icon={<Users size={18}/>} label="Equipo" />
           <StepIndicator currentStep={step} stepNum={4} icon={<CheckCircle2 size={18}/>} label="Completado" />
        </div>

        {/* Content Area */}
        <div className="flex-1 p-10 flex flex-col min-h-[460px]">
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
                      {item === 'Banca y Finanzas'
                        ? 'Banca y Finanzas (EBA/DORA)'
                        : item === 'Salud'
                          ? 'Salud (MDR/IVDR)'
                          : item === 'Sector Publico'
                            ? 'Sector Público (ENS)'
                            : item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="flex flex-col space-y-2">
                  <label className="font-plex text-[11.5px] uppercase text-lttm tracking-wider">Pais de operación principal</label>
                  <select 
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="px-4 py-3 bg-ltcard border border-ltb rounded-lg font-sora text-[14px] text-ltt focus:border-brand-cyan outline-none shadow-[0_0_0_2px_transparent] focus:shadow-[0_0_0_3px_#00adef15]"
                  >
                    {EU_COUNTRIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
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
                      <option key={item} value={item}>
                        {item[0].toUpperCase() + item.slice(1)}
                      </option>
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
                  <label className="font-plex text-[11.5px] uppercase text-lttm tracking-wider">Modulos normativos activos</label>
                  <span className="font-sora text-[12px] text-lttm">
                    Se precargan segun el sector y puedes ajustarlos.
                  </span>
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
                          <span className={`font-sora text-[14px] font-medium ${isSelected ? 'text-brand-navy' : 'text-ltt'}`}>
                            {module}
                          </span>
                          <span className="font-sora text-[11.5px] text-lttm">
                            {isSelected ? 'Activo en tu tenant' : 'Pulsa para activarlo'}
                          </span>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[11px] ${
                          isSelected
                            ? 'border-brand-cyan bg-brand-cyan text-white'
                            : 'border-ltbl text-transparent'
                        }`}>
                          ✓
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
              
              <div className="flex flex-col space-y-2">
                <label className="font-plex text-[11.5px] uppercase text-lttm tracking-wider">Logotipo Corporativo</label>
                <div className="border-2 border-dashed border-ltb rounded-[10px] p-8 flex flex-col items-center justify-center bg-ltbg cursor-pointer hover:bg-cyan-dim transition-colors group">
                  <span className="font-sora text-[14px] text-ltt2 group-hover:text-brand-cyan transition-colors">Haz clic para subir un logo oficial (Max 2MB)</span>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
             <div className="flex flex-col animate-fadein space-y-6">
              <h2 className="font-sora text-[18px] font-semibold text-ltt tracking-tight">2. Selecciona tu Plan Operativo</h2>
              <div className="grid grid-cols-2 gap-5 mt-2">
                <div 
                  onClick={() => setPlan('professional')}
                  className={`border rounded-[12px] p-5 cursor-pointer relative overflow-hidden transition-all ${plan === 'professional' ? 'bg-cyan-dim2 border-brand-cyan ring-2 ring-brand-cyan ring-offset-1' : 'border-ltb bg-ltcard hover:border-ltbl opacity-70'}`}
                >
                  {plan === 'professional' && <div className="absolute top-0 right-0 bg-brand-cyan text-white font-plex text-[10px] uppercase px-3 py-1 rounded-bl-xl">Actual</div>}
                  <h3 className={`font-fraunces text-xl ${plan === 'professional' ? 'text-brand-navy' : 'text-ltt'}`}>Professional</h3>
                  <p className="font-sora text-[13.5px] text-ltt2 mt-1.5 leading-relaxed">Sistemas ilimitados, 15 usuarios. Norma ISO 42001 incluida.</p>
                  <p className={`font-plex font-medium mt-4 text-[16px] ${plan === 'professional' ? 'text-brand-cyan' : 'text-ltt'}`}>899€<span className="text-[11px] text-lttm"> / mes</span></p>
                </div>
                
                <div 
                  onClick={() => setPlan('starter')}
                  className={`border rounded-[12px] p-5 cursor-pointer relative overflow-hidden transition-all ${plan === 'starter' ? 'bg-cyan-dim2 border-brand-cyan ring-2 ring-brand-cyan ring-offset-1' : 'border-ltb bg-ltcard hover:border-ltbl opacity-70'}`}
                >
                  {plan === 'starter' && <div className="absolute top-0 right-0 bg-brand-cyan text-white font-plex text-[10px] uppercase px-3 py-1 rounded-bl-xl">Actual</div>}
                  <h3 className={`font-fraunces text-xl ${plan === 'starter' ? 'text-brand-navy' : 'text-ltt'}`}>Starter</h3>
                  <p className="font-sora text-[13.5px] text-ltt2 mt-1.5 leading-relaxed">10 sistemas IA y 3 usuarios. Funciones base AI Act.</p>
                  <p className={`font-plex font-medium mt-4 text-[16px] ${plan === 'starter' ? 'text-brand-cyan' : 'text-ltt'}`}>299€<span className="text-[11px] text-lttm"> / mes</span></p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col animate-fadein space-y-6">
              <h2 className="font-sora text-[18px] font-semibold text-ltt tracking-tight">3. Invita a tu Equipo Estratégico</h2>
              <p className="font-sora text-[14px] text-ltt2">Envía acceso al Data Protection Officer (DPO), Auditores o líderes técnicos del comité.</p>
              
              <div className="flex items-center space-x-3 mt-2">
                <input 
                  type="email" 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddInvite(); } }}
                  placeholder="email@empresa.com" 
                  className="flex-1 px-4 py-3 bg-ltcard border border-ltb rounded-lg font-sora text-[14px] text-ltt focus:border-brand-cyan outline-none shadow-[0_0_0_2px_transparent] focus:shadow-[0_0_0_3px_#00adef15]" 
                />
                <select 
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-[140px] px-4 py-3 bg-ltcard border border-ltb rounded-lg font-sora text-[14px] text-ltt focus:border-brand-cyan outline-none"
                >
                  <option value="dpo">DPO</option>
                  <option value="editor">Editor / Técnico</option>
                  <option value="admin">Administrador</option>
                  <option value="viewer">Lector</option>
                </select>
                <Button onClick={(e) => { e.preventDefault(); handleAddInvite(); }} className="bg-ltcard2 border border-ltb text-ltt hover:bg-cyan-dim hover:text-brand-cyan hover:border-cyan-border transition-colors h-auto py-3 px-6 font-sora text-[14px]">
                  Añadir
                </Button>
              </div>

              {/* Lista de invitaciones */}
              {invitations.length > 0 && (
                <div className="bg-ltbg border border-ltb rounded-lg overflow-hidden mt-4">
                  {invitations.map((inv, idx) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-3 border-b border-ltb last:border-0 bg-white">
                      <div className="flex items-center space-x-3">
                        <span className="font-sora text-[13.5px] text-ltt font-medium">{inv.email}</span>
                        <span className="font-plex text-[10px] uppercase bg-ltcard2 border border-ltb text-ltt2 px-2 py-0.5 rounded">{inv.role}</span>
                      </div>
                      <button onClick={() => handleRemoveInvite(inv.email)} className="text-lttm hover:text-re transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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

function StepIndicator({ currentStep, stepNum, icon, label }: { currentStep: number, stepNum: number, icon: React.ReactNode, label: string }) {
  const isCompleted = currentStep > stepNum
  const isActive = currentStep === stepNum
  
  return (
    <div className={`flex items-center space-x-4 transition-colors ${isActive ? 'text-brand-cyan' : isCompleted ? 'text-ltt' : 'text-lttm'}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300
        ${isActive ? 'bg-cyan-dim border-cyan-border text-brand-cyan shadow-[0_0_8px_#00adef15]' : 
          isCompleted ? 'bg-ltcard2 border-ltb text-ltt' : 'bg-transparent border-ltb text-lttm'}`}>
        {icon}
      </div>
      <span className={`font-sora text-[14px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{label}</span>
    </div>
  )
}
