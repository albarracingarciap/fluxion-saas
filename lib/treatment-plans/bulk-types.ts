import type { TreatmentOption } from '@/lib/fmea/treatment-plan'

export type BulkSkippedItem = {
  actionId: string
  reason: string
}

export type BulkActionResult =
  | { error: string }
  | {
      ok: true
      updated: number
      skipped: BulkSkippedItem[]
    }

export type BulkAssignOwnerInput = {
  aiSystemId: string
  evaluationId: string
  actionIds: string[]
  ownerId: string
}

export type BulkSetDueDateInput = {
  aiSystemId: string
  evaluationId: string
  actionIds: string[]
  dueDate: string
}

export type BulkChangeOptionInput = {
  aiSystemId: string
  evaluationId: string
  actionIds: string[]
  option: Exclude<TreatmentOption, 'mitigar'>
  justification: string
  reviewDueDate: string | null
}

// Estados terminales: NO admiten edición bulk
export const BULK_TERMINAL_STATUSES = ['completed', 'accepted', 'cancelled'] as const
