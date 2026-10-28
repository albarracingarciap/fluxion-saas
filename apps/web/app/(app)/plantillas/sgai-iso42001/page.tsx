import { getSgaiView } from './actions'
import { SgaiClient } from './sgai-client'

export const dynamic = 'force-dynamic'

/** ISO 42001 › Sistema de gestión (B20a, DP-09). */
export default async function SgaiPage() {
  const view = await getSgaiView()
  if ('error' in view) {
    return <div className="max-w-[1100px] w-full mx-auto py-10 font-sora text-[13px] text-re">{view.error}</div>
  }
  return <SgaiClient view={view} />
}
