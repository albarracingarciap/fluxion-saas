import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Convert import.meta.url to __dirname equivalent for ES modules or process.cwd() fallback
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Inicializar cliente apuntando al schema compliance
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'compliance'
  }
});

const dimensionMap: Record<string, { id: string, prefix: string }> = {
  "Técnicos": { id: "tecnica", prefix: "TEC" },
  "Éticos": { id: "etica", prefix: "ETI" },
  "Ética": { id: "etica", prefix: "ETI" },
  "Gobernanza": { id: "gobernanza", prefix: "GOB" },
  "Legales Tipo B": { id: "legal_b", prefix: "LEG" },
  "ROI": { id: "roi", prefix: "ROI" },
  "Seguridad": { id: "seguridad", prefix: "SEG" }
};

async function seed() {
  const dirPath = path.join(process.cwd(), 'recursos', 'modos_de_fallo');
  const files = [
    'tecnicos.json',
    'eticos.json',
    'gobernanza.json',
    'legales.json',
    'roi.json',
    'seguridad.json'
  ];

  const dimensionsToSeed = [
    { id: 'tecnica', name: 'Técnicas', description: 'Riesgos técnicos y de rendimiento', display_order: 1 },
    { id: 'seguridad', name: 'Seguridad', description: 'Riesgos de seguridad y ciberataques', display_order: 2 },
    { id: 'etica', name: 'Éticas', description: 'Riesgos éticos y sesgos', display_order: 3 },
    { id: 'gobernanza', name: 'Gobernanza', description: 'Riesgos de gobernanza y procesos', display_order: 4 },
    { id: 'roi', name: 'ROI', description: 'Riesgos de retorno de inversión', display_order: 5 },
    { id: 'legal_b', name: 'Legales Tipo B', description: 'Riesgos legales y de propiedad intelectual', display_order: 6 },
  ];

  console.log('Iniciando carga de modos de fallo...');

  // 1. Inyectar las dimensiones primero para evitar errores de Foreign Key
  for (const dim of dimensionsToSeed) {
    const { error: dimError } = await supabase
      .from('risk_dimensions')
      .upsert(dim, { onConflict: 'id' });
    if (dimError) console.error(`Error insertando dimensión ${dim.id}:`, dimError.message);
  }

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    if (!fs.existsSync(filePath)) {
        console.warn(`Archivo no encontrado: ${filePath}`);
        continue;
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const items = JSON.parse(fileContent);
    let counter = 1;
    
    for (const item of items) {
      const dimInfo = dimensionMap[item.dimension];
      if (!dimInfo) {
        console.error(`Dimensión desconocida: ${item.dimension}`);
        continue;
      }
      
      const code = `${dimInfo.prefix}-${String(counter).padStart(3, '0')}`;
      counter++;

      const payload = {
        dimension_id: dimInfo.id,
        code: code,
        name: item.modo_fallo,
        description: item.modo_fallo,
        bloque: item.bloque,
        subcategoria: item.subcategoria,
        tipo: item.tipo,
        r_value: item.R,
        i_value: item.I,
        d_value: item.D,
        e_value: item.E,
        w_calculated: item.W,
        s_default: item.S_default
      };

      const { data, error } = await supabase
        .from('failure_modes')
        .upsert(payload, { onConflict: 'code', ignoreDuplicates: false })
        .select();

      if (error) {
        console.error(`Error insertando ${code}:`, error.message);
      }
    }
    console.log(`✅ Procesado archivo: ${file} - Total insertados/actualizados: ${items.length}`);
  }
}

seed().catch(console.error);
