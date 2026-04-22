import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { ISO_42001_CONTROLS } from './lib/templates/iso42001-catalog'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const orgId = 'replace-this' // we need an org ID

  const { data: orgs } = await supabase.from('organizations').select('id').limit(1)
  const org = orgs?.[0]?.id

  if (!org) {
    console.error('No org found')
    return
  }
  
  const payload = ISO_42001_CONTROLS.map((control) => ({
    organization_id: org,
    control_code: control.id,
    is_applicable: false,
    status: 'not_started',
  }))

  const { error } = await supabase.from('organization_soa_controls').insert(payload)
  if (error) {
    console.error('Insert Error:', error)
  } else {
    console.log('Inserted successfully')
  }
}

test()
