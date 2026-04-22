import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: 'fluxion' } })

async function checkDb() {
  console.log('Checking database for SOA controls...')
  const { data, error, count } = await supabase
    .from('organization_soa_controls')
    .select('*', { count: 'exact' })

  if (error) {
    console.error('Error fetching controls:', error)
  } else {
    console.log(`Found ${count} controls. Data:`)
    console.log(data)
  }
}

checkDb()
