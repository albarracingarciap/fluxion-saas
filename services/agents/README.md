# fluxion-agents

## Modelos

En variable de entorno, no en el codigo: cambiar de modelo es una decision de
producto que no deberia exigir un despliegue de codigo.

```
FLUXION_ASSISTANT_MODEL=gpt-5.6-terra
FLUXION_CLASSIFICATION_MODEL=gpt-5.6-terra
```

Estan separados a proposito. La clasificacion decide un nivel de riesgo
regulatorio y se beneficia de un modelo que razone; el asistente conversa, y
ahi lo que se nota es el tiempo hasta la primera palabra. Son necesidades
distintas y no tienen por que compartir modelo.

Al cambiar de modelo hay que dar de alta su tarifa en `telemetry.model_prices`,
o el coste de las llamadas nuevas entrara como `unknown` y la pantalla de
observabilidad lo dira en naranja.

## Cliente asincrono

`AsyncOpenAI`, no `OpenAI`. El cliente sincrono dentro de un manejador `async`
bloquea el bucle de eventos: mientras una llamada al modelo avanza, ninguna otra
peticion del servicio progresa. Con un usuario no se nota; con dos peticiones
solapadas los tiempos se triplican para el mismo trabajo, que es exactamente lo
que destapo la telemetria (7 s y 25 s con los mismos tokens).

Las llamadas a Supabase siguen siendo sincronas. Son de milisegundos y no
justifican el cambio hoy, pero si el servicio crece son el siguiente sitio donde
mirar.
