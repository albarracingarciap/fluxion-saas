import os
import sys
from openai import OpenAI
from supabase import create_client, Client
from dotenv import load_dotenv

# Asegurar contextos desde raiz
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(dotenv_path="../.env.local")

# Configurar conectores
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
supabase: Client = create_client(
    os.environ.get("NEXT_PUBLIC_SUPABASE_URL", ""),
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
)

class RegulatoryIngestor:
    def __init__(self, namespace: str, source_name: str):
        self.namespace = namespace
        self.source_name = source_name

    def chunk_text(self, text: str):
        """Implementar partición semántica, preferible por párrafos/artículos"""
        pass
        
    def embed_chunk(self, chunk: str) -> list[float]:
        """Calcula el embedding con text-embedding-3-small a 1536d"""
        response = client.embeddings.create(
            input=chunk,
            model="text-embedding-3-small"
        )
        return response.data[0].embedding
        
    def store_document(self, metadata: dict, chunk: str, vector: list[float]):
        """Guarda en rag.documents"""
        data = {
            "namespace": self.namespace,
            "regulatory_source": self.source_name,
            "chapter": metadata.get("chapter"),
            "article_ref": metadata.get("article_ref"),
            "title": metadata.get("title"),
            "content": chunk,
            "content_tokens": len(chunk.split()), # Estimación cruda
            "embedding": vector
        }
        
        res = supabase.table("documents").insert(data).execute()
        return res
        
if __name__ == "__main__":
    print("El RAG Ingestor está listo. Pendiente añadir adaptador de lectura PDF/HTML.")
    # test_ingestor = RegulatoryIngestor("ai_act", "eur-lex-ai-act-2024")
