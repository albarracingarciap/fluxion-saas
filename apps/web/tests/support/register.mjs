// Registra el hook de resolución de módulos para `node --test` (ver loader.mjs).
import { register } from 'node:module'

register('./loader.mjs', import.meta.url)
