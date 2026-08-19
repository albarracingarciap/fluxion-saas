import { listBudgets, getSystemsForBudget } from './actions'
import { PresupuestosClient } from './presupuestos-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Presupuestos de IA · Fluxion' }

export default async function PresupuestosPage() {
  const [budgets, systems] = await Promise.all([listBudgets(), getSystemsForBudget()])
  return <PresupuestosClient budgets={budgets} systems={systems} />
}
