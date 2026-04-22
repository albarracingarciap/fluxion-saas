import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Cargar variables de entorno locales
// Asumimos que se lanza desde la raíz del proyecto
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan las variables de entorno de Supabase.");
  process.exit(1);
}

// Inicializamos el cliente en el esquema 'public' (usamos el por defecto)
const supabase = createClient(supabaseUrl, supabaseKey);

// Regex para extraer el texto y el dominio: "Nombre de nodo [DOM]"
const nodeRegex = /^(.+?)\s*\[([A-Z]+)\]$/;

async function getOrInsertNode(rawName: string) {
  let name = rawName.trim();
  let domain = null;
  const match = rawName.match(nodeRegex);
  if (match) {
    name = match[1].trim();
    domain = match[2];
  }

  // Al insertar, Supabase devolverá el row existente gracias a onConflict
  // Asegúrate de que la tabla 'causal_nodes' fue creada con CONSTRAINT uq_causal_node UNIQUE (name, domain)
  const { data, error } = await supabase
    .from('causal_nodes')
    .upsert(
      { name, domain },
      { onConflict: 'name,domain', ignoreDuplicates: false }
    )
    .select('id')
    .single();

  if (error) {
    throw new Error(`Error insertando nodo ${rawName}: ${error.message}`);
  }
  return data.id;
}

async function main() {
  console.log("Iniciando la carga de Grafos Causales Normalizados...");

  const dataDir = join(__dirname, '../recursos/relaciones_causales');
  const files = readdirSync(dataDir).filter(f => f.endsWith('.json') && f.startsWith('familia_'));

  for (const file of files) {
    const rawData = readFileSync(join(dataDir, file), 'utf8');
    const json = JSON.parse(rawData);

    if (!json.familia || !json.relaciones) {
      console.warn(`[WARN] Formato inesperado en ${file}`);
      continue;
    }

    const familia = json.familia;
    const relaciones = json.relaciones;

    console.log(`\nProcesando ${file} - Familia: ${familia.nombre}`);

    // Insertar familia
    const { error: famError } = await supabase
      .from('causal_families')
      .upsert({
        id: familia.id,
        name: familia.nombre
      }, { onConflict: 'id' });

    if (famError) {
      console.error(`[ERROR] Falló Familia ${familia.id}:`, famError);
      continue;
    }

    // Insertar cada relación causal normalizada
    for (const rel of relaciones) {
      try {
        const sourceId = await getOrInsertNode(rel.nodo_origen);
        const targetId = await getOrInsertNode(rel.nodo_destino);

        const payload = {
          id: rel.id,
          family_id: familia.id,
          source_node_id: sourceId,
          target_node_id: targetId,
          type: rel.tipo,
          explanatory_mechanism: rel.mecanismo_explicativo,
          activation_condition: rel.condicion_activacion,
          confidence: rel.confianza
        };

        const { error: relError } = await supabase
          .from('causal_relationships')
          .upsert(payload, { onConflict: 'id' });

        if (relError) {
          console.error(`  [ERROR] Relación ${rel.id}:`, relError.message);
        } else {
          console.log(`  - Insertada relación ${rel.id}`);
        }
      } catch (err: any) {
        console.error(`  [ERROR FATAL] Relación ${rel.id}: ${err.message}`);
      }
    }
  }

  console.log("\nProceso finalizado con éxito.");
}

main().catch(console.error);
