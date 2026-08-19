"""Modelos usados por cada ruta.

En variable de entorno y no en el codigo: cambiar de modelo es una decision de
producto que no deberia exigir un despliegue, y ademas separa el modelo del
asistente del de clasificacion, que tienen necesidades distintas.

La clasificacion decide un nivel de riesgo regulatorio y se beneficia de un
modelo que razone. El asistente conversa, y ahi lo que se nota es el tiempo
hasta la primera palabra.
"""

import os

ASSISTANT_MODEL = os.getenv("FLUXION_ASSISTANT_MODEL", "gpt-5.6-terra")
CLASSIFICATION_MODEL = os.getenv("FLUXION_CLASSIFICATION_MODEL", "gpt-5.6-terra")
