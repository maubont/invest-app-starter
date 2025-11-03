# Investment Analysis Cloud — Starter

Base monorepo con Next.js (frontend) y FastAPI (engine) para cálculos de VAN/TIR/Payback.

## Arranque local

### Engine (FastAPI)
```bash
cd services/engine
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

La API expone la documentación interactiva en `http://localhost:8000/docs`.

### Web (Next.js)
Crea un archivo `apps/web/.env.local` con la URL del engine:

```ini
NEXT_PUBLIC_ENGINE_URL=http://localhost:8000
```

Luego ejecuta:

```bash
cd apps/web
npm install
npm run dev
```

La interfaz estará disponible en `http://localhost:3000`.

## Docker
Existe un `docker-compose` de referencia en [`infra/docker-compose.yml`](infra/docker-compose.yml) para levantar los servicios de forma orquestada. Ajusta las variables de entorno según tus credenciales locales antes de usarlo.

## Variables de entorno
- `apps/web/.env.local`: valores públicos para el frontend (por ejemplo `NEXT_PUBLIC_ENGINE_URL`).
- `services/engine/.env`: valores privados para el engine (por ejemplo claves de terceros). Ambos archivos están ignorados en git por defecto.

## Calidad de código
### Frontend
```bash
cd apps/web
npm run lint
npm run format
```

### Engine
```bash
cd services/engine
make lint
make format
```

Los comandos anteriores utilizan ESLint/Prettier para la web y Ruff/Black para el engine.

## Integración continua
El workflow [`ci.yml`](.github/workflows/ci.yml) ejecuta en GitHub Actions:
- Lint y build del frontend con Node.js 22 (`npm ci`, `npm run lint`, `npm run build`).
- Ruff, Black y un smoke test de `uvicorn` sobre el engine con Python 3.11.

Verifica que el pipeline esté en verde antes de abrir un Pull Request.
