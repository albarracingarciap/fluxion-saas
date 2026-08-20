"""Catalogo de deteccion.

Vive en el codigo del servicio y no en la base de datos a proposito:
actualizarlo es un despliegue, que es lo correcto para la logica del producto.
Una lista de deteccion que cada cliente puede editar deja de ser comparable
entre clientes, y entonces "cuantos repositorios con IA no declarada tienes"
significa algo distinto en cada sitio.
"""

from __future__ import annotations

import re

# ── Ficheros que se leen ─────────────────────────────────────────────────────

MANIFIESTOS = (
    "requirements.txt", "requirements-dev.txt", "pyproject.toml", "Pipfile",
    "environment.yml", "environment.yaml", "setup.py", "poetry.lock",
    "package.json", "go.mod", "pom.xml", "build.gradle", "Gemfile",
    "composer.json", "Cargo.toml",
)

EXTENSIONES_CODIGO = (
    ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go", ".rb", ".php",
    ".cs", ".scala", ".r", ".ipynb", ".env", ".yaml", ".yml", ".sh",
)

EXTENSIONES_MODELO = (
    ".pt", ".pth", ".onnx", ".pkl", ".joblib", ".h5", ".pb",
    ".safetensors", ".gguf", ".ggml", ".tflite",
)

# ── Librerias ────────────────────────────────────────────────────────────────
# patron -> (categoria, severidad)
#
# La severidad no mide riesgo tecnico sino "cuanto deberia importarte que esto
# no estuviera declarado": un `openai` sin declarar es un sistema de IA
# operando fuera del inventario; un `numpy` no dice nada.

LIBRERIAS: dict[str, tuple[str, str]] = {
    # LLM y agentes
    "openai": ("llm", "high"),
    "anthropic": ("llm", "high"),
    "google-generativeai": ("llm", "high"),
    "mistralai": ("llm", "high"),
    "cohere": ("llm", "high"),
    "langchain": ("llm", "high"),
    "langgraph": ("llm", "high"),
    "llama-index": ("llm", "high"),
    "llama_index": ("llm", "high"),
    "haystack-ai": ("llm", "high"),
    "semantic-kernel": ("llm", "high"),
    "crewai": ("llm", "high"),
    "autogen": ("llm", "high"),
    "instructor": ("llm", "medium"),
    "litellm": ("llm", "high"),
    "ollama": ("llm", "medium"),
    "transformers": ("llm", "high"),
    "sentence-transformers": ("llm", "medium"),
    "vllm": ("llm", "high"),
    # Aprendizaje automatico clasico
    "scikit-learn": ("ml", "medium"),
    "sklearn": ("ml", "medium"),
    "xgboost": ("ml", "medium"),
    "lightgbm": ("ml", "medium"),
    "catboost": ("ml", "medium"),
    "torch": ("ml", "high"),
    "pytorch": ("ml", "high"),
    "tensorflow": ("ml", "high"),
    "keras": ("ml", "medium"),
    "jax": ("ml", "medium"),
    "onnxruntime": ("ml", "medium"),
    "mlflow": ("ml", "medium"),
    # Bases vectoriales: casi siempre delatan un RAG
    "chromadb": ("vector_db", "medium"),
    "pinecone-client": ("vector_db", "medium"),
    "weaviate-client": ("vector_db", "medium"),
    "qdrant-client": ("vector_db", "medium"),
    "faiss-cpu": ("vector_db", "medium"),
    "faiss-gpu": ("vector_db", "medium"),
    "pgvector": ("vector_db", "low"),
}

# ── Puntos finales de proveedores ────────────────────────────────────────────

ENDPOINTS: dict[str, tuple[str, str]] = {
    "api.openai.com": ("provider", "high"),
    "api.anthropic.com": ("provider", "high"),
    "generativelanguage.googleapis.com": ("provider", "high"),
    "api.mistral.ai": ("provider", "high"),
    "api.cohere.ai": ("provider", "high"),
    "api-inference.huggingface.co": ("provider", "high"),
    "openai.azure.com": ("provider", "high"),
    "bedrock-runtime": ("provider", "high"),
    "api.groq.com": ("provider", "high"),
    "api.deepseek.com": ("provider", "high"),
}

# ── Credenciales ─────────────────────────────────────────────────────────────
#
# El NOMBRE del patron es lo que se publica. El valor encontrado se descarta
# entero: ni completo, ni truncado, ni en hash. Un hash parece inofensivo hasta
# que alguien lo compara contra un diccionario de claves filtradas, y para lo
# que sirve el hallazgo —rotarla y sacarla del repositorio— no aporta nada.

CREDENCIALES: list[tuple[str, re.Pattern[str], str]] = [
    ("clave_openai",      re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_\-]{20,}"), "critical"),
    ("clave_anthropic",   re.compile(r"\bsk-ant-[A-Za-z0-9_\-]{20,}"),       "critical"),
    ("clave_huggingface", re.compile(r"\bhf_[A-Za-z0-9]{30,}"),              "critical"),
    ("clave_google",      re.compile(r"\bAIza[0-9A-Za-z_\-]{35}"),           "critical"),
    ("clave_aws",         re.compile(r"\bAKIA[0-9A-Z]{16}\b"),               "critical"),
    ("clave_cohere",      re.compile(r"\bco-[A-Za-z0-9]{32,}"),              "critical"),
]

# Ficheros donde una clave con pinta de real casi siempre es un ejemplo. No se
# ignoran —un ejemplo copiado de produccion sigue siendo una fuga— pero bajan
# de severidad para no ahogar la lista de lo urgente.
RUTAS_DE_EJEMPLO = (".example", ".sample", "example", "sample", "test", "spec", "docs/", "fixtures")


def es_ejemplo(ruta: str) -> bool:
    r = ruta.lower()
    return any(p in r for p in RUTAS_DE_EJEMPLO)
