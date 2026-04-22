import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: 'fluxion' } })

async function inspectProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error fetching profiles:', error)
  } else {
    console.log('Columns:', Object.keys(data[0] || {}))
  }
}

inspectProfiles()
