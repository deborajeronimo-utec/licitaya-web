# web-licitaya (LicitaYa)

Web responsiva en **React 19 + Vite 6** (Node 22 o superior), alojada en un bucket **S3 público**. Se despliega con Serverless Framework v4, igual que `web-chat-ia` de la Sesión 11.

## Pantallas

| Pantalla | Historias | APIs que usa |
|---|---|---|
| Mi empresa | HU01, HU07 | api-empresas (POST/GET/PUT), `/suscripciones` |
| Nuevo análisis | HU02, HU03 | `/lotes`, PUT con URL prefirmada a S3, `/analisis` |
| Análisis en proceso | HU03 | `GET /analisis/{id}` (consulta cada 4 s) |
| Resultados y detalle | HU04, HU05, HU06 | `/oportunidades`, `/csv` |
| Historial | HU08 | `GET /analisis?ruc=` |
| Inicio | Resumen | `GET /analisis?ruc=` (top 3) |

La sesión guarda solo el RUC en `localStorage`.

## Configuración y despliegue

```bash
export VITE_EMPRESAS_API=https://<id>.execute-api.us-east-1.amazonaws.com
export VITE_WORKFLOW_API=https://<id>.execute-api.us-east-1.amazonaws.com
export VITE_FECHA_REFERENCIA=2026-11-18   # opcional (demo con datos de prueba)
npm install
serverless deploy     # ejecuta "npm run build" y sincroniza dist/ con el bucket
```

Para desarrollo local: `npm run dev`. Contra el backend simulado, use `backend/workflow-licitaya/tests/servidor_local.py`.

Creado con asistencia de Claude (Anthropic), modelo Claude Opus 5.5, noviembre de 2026.
