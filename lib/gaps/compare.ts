import type { GapsDataResult, GapSeverity, UnifiedGapRecord } from './data'

const SEVERITY_RANK: Record<GapSeverity, number> = { critico: 2, alto: 1, medio: 0 }

export type DeltaGap = {
  key: string
  title: string
  layer: string
  system_name: string
  severity: GapSeverity
  prev_severity?: GapSeverity
}

export type SnapshotDelta = {
  opened: DeltaGap[]
  closed: DeltaGap[]
  worsened: DeltaGap[]
  improved: DeltaGap[]
  unchanged_count: number
  summary: {
    total_a: number
    total_b: number
    critico_a: number
    critico_b: number
    alto_a: number
    alto_b: number
    medio_a: number
    medio_b: number
    avg_exposure_a: number
    avg_exposure_b: number
  }
}

function toDelta(gap: UnifiedGapRecord, prevSeverity?: GapSeverity): DeltaGap {
  return {
    key: gap.key,
    title: gap.title,
    layer: gap.layer,
    system_name: gap.system_name,
    severity: gap.severity,
    prev_severity: prevSeverity,
  }
}

export function computeSnapshotDelta(a: GapsDataResult, b: GapsDataResult): SnapshotDelta {
  const mapA = new Map<string, UnifiedGapRecord>(a.gaps.map((g) => [g.key, g]))
  const mapB = new Map<string, UnifiedGapRecord>(b.gaps.map((g) => [g.key, g]))

  const opened: DeltaGap[] = []
  const closed: DeltaGap[] = []
  const worsened: DeltaGap[] = []
  const improved: DeltaGap[] = []
  let unchanged_count = 0

  Array.from(mapB.entries()).forEach(([key, gapB]) => {
    const gapA = mapA.get(key)
    if (!gapA) {
      opened.push(toDelta(gapB))
    } else {
      const rankA = SEVERITY_RANK[gapA.severity]
      const rankB = SEVERITY_RANK[gapB.severity]
      if (rankB > rankA) {
        worsened.push(toDelta(gapB, gapA.severity))
      } else if (rankB < rankA) {
        improved.push(toDelta(gapB, gapA.severity))
      } else {
        unchanged_count++
      }
    }
  })

  Array.from(mapA.entries()).forEach(([key, gapA]) => {
    if (!mapB.has(key)) {
      closed.push(toDelta(gapA))
    }
  })

  const avgExposure = (data: GapsDataResult) =>
    data.exposure.length > 0
      ? Math.round(data.exposure.reduce((sum, s) => sum + s.exposure_score, 0) / data.exposure.length)
      : 0

  return {
    opened,
    closed,
    worsened,
    improved,
    unchanged_count,
    summary: {
      total_a: a.summary.total,
      total_b: b.summary.total,
      critico_a: a.summary.critico,
      critico_b: b.summary.critico,
      alto_a: a.summary.alto,
      alto_b: b.summary.alto,
      medio_a: a.summary.medio,
      medio_b: b.summary.medio,
      avg_exposure_a: avgExposure(a),
      avg_exposure_b: avgExposure(b),
    },
  }
}
