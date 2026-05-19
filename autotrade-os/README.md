# AutoTrade OS

AutoTrade OS is a paper-first automated trading application for personal research. It includes a Next.js dashboard, FastAPI backend, PostgreSQL persistence, strategy creation, historical backtesting, paper order execution, risk controls, audit logs, and a disabled-by-default live broker adapter stub.

> This app is for education and paper trading only. Trading involves risk.

## Safety Defaults

- `ENABLE_LIVE_TRADING=false` by default.
- Real-money execution is not implemented in this build.
- The Interactive Brokers adapter is present only as a guarded extension point.
- Every paper order runs through risk checks before execution.
- Buy orders require a stop-loss when `stop_loss_required=true`.
- Risk per trade is capped at 2% or lower.
- The emergency kill switch blocks new orders.
- Market-hours checks block paper orders outside regular U.S. market hours unless explicitly changed in risk settings.

## Run Locally

```bash
docker-compose up --build
```

Open:

- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

## Project Structure

```text
autotrade-os/
  frontend/          Next.js, TypeScript, Tailwind, Recharts
  backend/           FastAPI, SQLAlchemy, trading domain services
  docs/              Architecture notes
  docker-compose.yml PostgreSQL, backend, frontend
  .env.example       Safe environment defaults
```

## Backend Development

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend defaults to SQLite if `DATABASE_URL` is not provided. Docker Compose uses PostgreSQL.

## Frontend Development

```bash
cd frontend
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL=http://localhost:8000/api` for browser-side API calls and `API_INTERNAL_URL=http://localhost:8000/api` for server-rendered pages when running outside Docker.

## Tests

```bash
cd backend
pytest
```

Tests cover indicators and strategy signals, the backtesting engine, risk management, the paper broker, and API endpoints.

## Paper Trading Flow

1. Create a strategy in `/strategies`.
2. Run a historical backtest in `/backtest`.
3. Review risk settings in `/risk`.
4. Start a paper session in `/paper-trading`.
5. Submit simulated orders with stop-loss values.
6. Review positions, trades, dashboard performance, and logs.

## Extending Toward Live Trading Later

Live trading should be added only after additional authentication, permissions, secrets handling, broker reconciliation, order idempotency, kill-switch verification, compliance logging, and manual confirmation workflows are in place.

Do not remove the `ENABLE_LIVE_TRADING=false` default. Any live broker implementation must check that flag at execution time and fail closed.

