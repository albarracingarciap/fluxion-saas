'use client';

import { useState } from 'react';
import { Bell, Mail, AppWindow } from 'lucide-react';
import {
  NotificationPrefs, NotifMatrix, NOTIFICATION_CATEGORIES,
  DEFAULT_NOTIF_MATRIX,
  selectCls, SelectArrow, SectionHeader, FieldLabel, MiniToggle, SaveBar,
} from './shared';
import { updateNotificationPrefs } from '../actions';

interface Props {
  initialPrefs: NotificationPrefs
  onSaved: () => void
}

export function NotificacionesTab({ initialPrefs, onSaved }: Props) {
  const [matrix, setMatrix]               = useState<NotifMatrix>(initialPrefs.matrix ?? DEFAULT_NOTIF_MATRIX)
  const [digestFreq, setDigestFreq]       = useState(initialPrefs.digest_frequency ?? 'daily')
  const [digestTime, setDigestTime]       = useState(initialPrefs.digest_time ?? '09:00')
  const [loading, setLoading]             = useState(false)
  const [saved, setSaved]                 = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  function toggleCell(cat: keyof NotifMatrix, channel: 'email' | 'inapp', value: boolean) {
    setMatrix((prev) => ({
      ...prev,
      [cat]: { ...prev[cat], [channel]: value },
    }))
    setSaved(false)
    setError(null)
  }

  async function handleSave() {
    setLoading(true)
    setError(null)
    const res = await updateNotificationPrefs({ matrix, digest_frequency: digestFreq, digest_time: digestTime })
    if (res.error) {
      setError(res.error)
    } else {
      setSaved(true)
      onSaved()
      setTimeout(() => setSaved(false), 3000)
    }
    setLoading(false)
  }

  return (
    <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-7">
      <SectionHeader
        icon={<Bell size={16} className="text-ltt2" />}
        title="Notificaciones"
        description="Elige por qué eventos y por qué canal quieres recibir avisos."
      />

      {/* Matrix */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left pb-3 pr-6 w-full">
                <span className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Categoría</span>
              </th>
              <th className="pb-3 px-4 shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <Mail size={13} className="text-lttm" />
                  <span className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm whitespace-nowrap">Email</span>
                </div>
              </th>
              <th className="pb-3 px-4 shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <AppWindow size={13} className="text-lttm" />
                  <span className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm whitespace-nowrap">In-app</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ltb">
            {NOTIFICATION_CATEGORIES.map((cat) => (
              <tr key={cat.key} className="hover:bg-ltbg/50 transition-colors">
                <td className="py-3.5 pr-6">
                  <p className="font-sora text-[13px] font-medium text-ltt">{cat.label}</p>
                  <p className="font-sora text-[11.5px] text-lttm mt-0.5">{cat.description}</p>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <MiniToggle
                    enabled={matrix[cat.key].email}
                    onChange={(v) => toggleCell(cat.key, 'email', v)}
                  />
                </td>
                <td className="py-3.5 px-4 text-center">
                  <MiniToggle
                    enabled={matrix[cat.key].inapp}
                    onChange={(v) => toggleCell(cat.key, 'inapp', v)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Digest */}
      <div className="mt-6 pt-5 border-t border-ltb grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

        <div>
          <FieldLabel>Resumen periódico por email</FieldLabel>
          <div className="relative">
            <select
              value={digestFreq}
              onChange={(e) => { setDigestFreq(e.target.value); setSaved(false) }}
              className={selectCls}
            >
              <option value="realtime">En tiempo real</option>
              <option value="daily">Resumen diario</option>
              <option value="weekly">Resumen semanal</option>
              <option value="never">Nunca</option>
            </select>
            <SelectArrow />
          </div>
          <p className="font-sora text-[11.5px] text-lttm mt-1.5">
            Consolida múltiples alertas en un único email periódico.
          </p>
        </div>

        {digestFreq !== 'never' && digestFreq !== 'realtime' && (
          <div>
            <FieldLabel>Hora de envío</FieldLabel>
            <input
              type="time"
              value={digestTime}
              onChange={(e) => { setDigestTime(e.target.value); setSaved(false) }}
              className="bg-ltcard border border-ltb rounded-[8px] px-3 py-2.5 text-[13.5px] text-ltt font-sora outline-none transition-all focus:border-brand-cyan focus:ring-[3px] focus:ring-brand-cyan/10"
            />
            <p className="font-sora text-[11.5px] text-lttm mt-1.5">
              Hora local según tu zona horaria.
            </p>
          </div>
        )}

      </div>

      <SaveBar loading={loading} saved={saved} error={error} onSave={handleSave} />
    </div>
  )
}
