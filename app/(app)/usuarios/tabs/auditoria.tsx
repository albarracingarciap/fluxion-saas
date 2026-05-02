'use client';

import { ClipboardList, Clock } from 'lucide-react';

export function AuditoriaTab() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-12 h-12 rounded-[14px] bg-ltcard2 border border-ltb flex items-center justify-center">
        <ClipboardList size={22} className="text-lttm" />
      </div>
      <div>
        <p className="font-sora text-[13.5px] font-semibold text-ltt mb-1.5">Auditoría de accesos</p>
        <p className="font-sora text-[12px] text-lttm max-w-sm leading-relaxed">
          Historial de cambios de rol, invitaciones enviadas y modificaciones de permisos.
          Disponible en la próxima actualización.
        </p>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-lttm font-sora mt-1">
        <Clock size={12} />
        <span>Próximamente</span>
      </div>
    </div>
  )
}
