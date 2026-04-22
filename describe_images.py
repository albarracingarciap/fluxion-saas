import os
import base64
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env.local")

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

image_paths = [f"recursos/flujo_fluxion/flujo_fluxion_{i}.png" for i in range(1, 10)]
content_array = [
    {
        "type": "text",
        "text": "Please analyze these 9 UI mockup images in order and describe the complete user flow they represent for our platform Fluxion. Detail the steps, main sections, and what actions the user is taking."
    }
]

for idx, path in enumerate(image_paths):
    if os.path.exists(path):
        base64_image = encode_image(path)
        content_array.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/png;base64,{base64_image}"
            }
        })

if len(content_array) > 1:
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": content_array
                }
            ],
            max_tokens=1500
        )
        print("--- RESULTADO DEL ANÁLISIS VISUAL ---")
        print(response.choices[0].message.content)
    except Exception as e:
        print(f"Error con OpenAI API: {e}")
else:
    print("No se encontraron las imágenes.")
