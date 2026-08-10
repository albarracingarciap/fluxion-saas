'use client';

import { Globe, Shield } from 'lucide-react';
import {
  EU_COUNTRIES,
  NORMATIVE_MODULES,
  ORGANIZATION_SECTORS,
  RISK_APPETITE_OPTIONS,
  type NormativeModule,
} from '@/lib/organization/options';
import { SectionHeader, FieldLabel, selectCls, SelectArrow, type OrgFormData } from './shared';

interface Props {
  formData: OrgFormData
  setFormData: React.Dispatch<React.SetStateAction<OrgFormData>>
  isAdmin: boolean
}

export function PerfilRegulatoriTab({ formData, setFormData, isAdmin }: Props) {
  function toggleGeography(country: string) {
    setFormData((prev) => ({
      ...prev,
      geography: prev.geography.includes(country)
        ? prev.geography.filter((c) => c !== country)
        : [...prev.geography, country],
    }))
  }

  function toggleNormativeModule(module: NormativeModule) {
    setFormData((prev) => ({
      ...prev,
      normative_modules: prev.normative_modules.includes(module)
        ? prev.normative_modules.filter((m) => m !== module)
        : [...prev.normative_modules, module],
    }))
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Sector, país, tamaño */}
      <div>
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
                onChange={(e) => setFormData((p) => ({ ...p, sector: e.target.value }))}
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
                onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
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
                onChange={(e) => setFormData((p) => ({ ...p, size: e.target.value }))}
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

      {/* Marco normativo */}
      <div>
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
                    onClick={() => setFormData((p) => ({ ...p, apetito_riesgo: item }))}
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

    </div>
  )
}
