"""
agent1/rag/retriever.py
Retriever RAG para el Agente 1.
Usa el cliente HTTP de Supabase (no asyncpg) para compatibilidad
con el entorno de desarrollo local.
"""

import os
import time
import logging
from typing import Optional
import voyageai
from supabase import create_client, Client

logger = logging.getLogger(__name__)

# Cliente Supabase (inicializado una vez)
_sb: Optional[Client] = None
_voyage: Optional[voyageai.Client] = None


def get_clients() -> tuple[Client, voyageai.Client]:
    global _sb, _voyage
    if _sb is None:
        _sb = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_KEY")
        )
    if _voyage is None:
        _voyage = voyageai.Client(api_key=os.getenv("VOYAGE_API_KEY"))
    return _sb, _voyage


def embed_query(query: str) -> list[float]:
    """Genera embedding para una query usando voyage-law-2."""
    _, voyage = get_clients()
    result = voyage.embed(
        [query],
        model="voyage-law-2",
        input_type="query"  # importante: 'query' no 'document'
    )
    return result.embeddings[0]


def retrieve_chunks(
    query: str,
    source_types: list[str],
    short_name: Optional[str] = None,
    match_count: int = 4,
    match_threshold: float = 0.50,
) -> list[dict]:
    """
    Recupera chunks relevantes del corpus RAG.

    Args:
        query:          texto de la query en lenguaje natural
        source_types:   ['eu_regulation'] | ['authority_guide'] | ambos
        short_name:     filtrar por documento específico ('AI Act', 'RGPD'...)
        match_count:    número de resultados a devolver
        match_threshold: similitud mínima (0-1)

    Returns:
        Lista de chunks con {id, section_ref, short_name, content,
                              content_tokens, similarity, metadata}
    """
    sb, _ = get_clients()

    # Generar embedding de la query
    embedding = embed_query(query)

    # Llamar a la función RPC pública (wrapper de rag.search_chunks)
    params = {
        "query_embedding":   str(embedding),
        "source_types":      source_types,
        "match_count":       match_count,
        "match_threshold":   match_threshold,
        "org_id":            None,
        "filter_metadata":   None,
        "filter_short_name": short_name,
    }

    result = sb.rpc("search_chunks", params).execute()
    return result.data or []


# ═══════════════════════════════════════════════════════════
# Queries específicas por atributos del sistema
# ═══════════════════════════════════════════════════════════

def build_rag_queries(system: dict) -> list[dict]:
    """
    Construye queries RAG específicas basadas en los atributos del sistema.
    No lanza una query genérica — cada query va dirigida a un aspecto
    concreto de la clasificación.
    """
    queries = []
    domain = system.get('domain', '')
    output_type = system.get('output_type', '')
    affects_persons = system.get('affects_persons', False)
    biometric = system.get('biometric', False)
    is_gpai = system.get('is_gpai', False)
    uses_third_party = system.get('uses_third_party_model', False)
    external_provider = system.get('external_provider', False)
    is_chatbot = system.get('ai_system_type') == 'chatbot'
    critical_infra = system.get('critical_infra', False)

    # Siempre: definición y árbol de clasificación base
    queries.append({
        "query": "definición sistema inteligencia artificial Art. 3 clasificación riesgo Art. 6",
        "source_types": ["eu_regulation"],
        "short_name": "AI Act",
        "description": "Definición base y árbol de clasificación"
    })

    # Prácticas prohibidas — si hay señales de biometría o uso sensible
    if biometric or system.get('is_emotion_recognition') or system.get('is_social_scoring'):
        queries.append({
            "query": "prácticas IA prohibidas Art. 5 biometría reconocimiento emociones identificación",
            "source_types": ["eu_regulation"],
            "short_name": "AI Act",
            "description": "Prácticas prohibidas Art. 5"
        })

    # Sector financiero / banca / seguros → Anexo III §4
    if domain in ['finanzas', 'banca', 'seguros', 'credito', 'banking']:
        queries.append({
            "query": "sistemas IA alto riesgo servicios financieros scoring crediticio seguros Anexo III",
            "source_types": ["eu_regulation"],
            "short_name": "AI Act",
            "description": "Anexo III §4 servicios financieros"
        })

    # RRHH / empleo → Anexo III §3
    if domain in ['recursos_humanos', 'empleo', 'hr']:
        queries.append({
            "query": "sistemas IA empleo gestión trabajadores selección personal Anexo III",
            "source_types": ["eu_regulation"],
            "short_name": "AI Act",
            "description": "Anexo III §3 empleo"
        })

    # Educación → Anexo III §2
    if domain in ['educacion', 'formacion']:
        queries.append({
            "query": "sistemas IA educación formación profesional acceso evaluación Anexo III",
            "source_types": ["eu_regulation"],
            "short_name": "AI Act",
            "description": "Anexo III §2 educación"
        })

    # Sector público / ley / justicia → Anexo III §5, §7
    if domain in ['sector_publico', 'justicia', 'policia', 'law_enforcement']:
        queries.append({
            "query": "sistemas IA aplicación ley sector público justicia Anexo III alto riesgo",
            "source_types": ["eu_regulation"],
            "short_name": "AI Act",
            "description": "Anexo III §5 §7 sector público"
        })

    # Infraestructura crítica → Anexo III §1
    if critical_infra:
        queries.append({
            "query": "sistemas IA infraestructura crítica componente seguridad Anexo III alto riesgo",
            "source_types": ["eu_regulation"],
            "short_name": "AI Act",
            "description": "Anexo III §1 infraestructura crítica"
        })

    # Decisiones que afectan a personas → Art. 6 obligaciones
    if affects_persons and output_type in ['decision', 'clasificacion', 'puntuacion']:
        queries.append({
            "query": "sistemas IA alto riesgo decisiones personas físicas obligaciones proveedor Art. 9",
            "source_types": ["eu_regulation"],
            "short_name": "AI Act",
            "description": "Obligaciones sistemas alto riesgo"
        })

    # GPAI o modelo de terceros → Arts. 51-55
    if is_gpai or uses_third_party:
        queries.append({
            "query": "modelo IA uso general GPAI obligaciones proveedor Art. 51 riesgo sistémico",
            "source_types": ["eu_regulation"],
            "short_name": "AI Act",
            "description": "GPAI Arts. 51-55"
        })

    # Roles en cadena de valor → Arts. 25-26
    if external_provider or uses_third_party:
        queries.append({
            "query": "responsable despliegue proveedor obligaciones cadena valor Art. 25 Art. 26",
            "source_types": ["eu_regulation"],
            "short_name": "AI Act",
            "description": "Roles cadena de valor Arts. 25-26"
        })

    # Chatbot / sistema conversacional → Art. 50 transparencia
    if is_chatbot or system.get('output_type') == 'texto':
        queries.append({
            "query": "chatbot sistema conversacional transparencia información usuario Art. 50",
            "source_types": ["eu_regulation"],
            "short_name": "AI Act",
            "description": "Transparencia Art. 50"
        })

    # Guías AESIA siempre: orientación práctica española
    queries.append({
        "query": "clasificación sistema IA riesgo obligaciones proveedor responsable despliegue",
        "source_types": ["authority_guide"],
        "short_name": None,  # buscar en todas las guías AESIA
        "description": "Guías AESIA contexto práctico"
    })

    return queries


def retrieve_for_classification(system: dict, max_chunks: int = 12) -> tuple[list[dict], list[dict]]:
    """
    Punto de entrada principal para el Agente 1.
    Ejecuta todas las queries pertinentes y devuelve chunks únicos.

    Returns:
        (chunks_únicos, rag_metadata)
    """
    queries = build_rag_queries(system)
    all_chunks = []
    rag_metadata = []
    seen_ids = set()

    for q in queries:
        try:
            chunks = retrieve_chunks(
                query=q['query'],
                source_types=q['source_types'],
                short_name=q.get('short_name'),
                match_count=3,
                match_threshold=0.50,
            )

            # Deduplicar
            new_chunks = [c for c in chunks if c.get('id') not in seen_ids]
            for c in new_chunks:
                seen_ids.add(c.get('id'))

            all_chunks.extend(new_chunks)
            rag_metadata.append({
                "query":          q['query'],
                "description":    q.get('description', ''),
                "source_types":   q['source_types'],
                "short_name":     q.get('short_name'),
                "results_count":  len(chunks),
                "new_unique":     len(new_chunks),
                "top_similarity": round(float(chunks[0].get('similarity', 0)), 3) if chunks else 0
            })

            logger.debug(f"RAG query '{q['description']}': {len(chunks)} resultados, {len(new_chunks)} nuevos")

        except Exception as e:
            logger.error(f"Error en RAG query '{q['query']}': {e}")
            rag_metadata.append({
                "query":          q['query'],
                "description":    q.get('description', ''),
                "error":          str(e),
                "results_count":  0
            })

    # Limitar al máximo de chunks (ordenados por similitud)
    all_chunks.sort(key=lambda c: float(c.get('similarity', 0)), reverse=True)
    unique_chunks = all_chunks[:max_chunks]

    logger.info(
        f"RAG completado: {len(queries)} queries, "
        f"{len(all_chunks)} chunks totales, "
        f"{len(unique_chunks)} seleccionados"
    )

    return unique_chunks, rag_metadata
