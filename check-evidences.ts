import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: 'fluxion' } })

async function checkEvidences() {
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1)
  const org = orgs?.[0]?.id

  console.log('Checking evidences for org:', org)
  
  const { data, error } = await supabase
    .from('system_evidences')
    .select('*')
    .eq('organization_id', org)

  console.log('Evidences:', data?.length)
  if (error) console.log('Error:', error)
  console.log(data)

  const { data: aiSys } = await supabase
    .from('ai_systems')
    .select('id, name')
  
  console.log('Systems:', aiSys?.length)
}

checkEvidences()
