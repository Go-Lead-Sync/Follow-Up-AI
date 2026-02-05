# Follow-Up AI

A standalone Follow-Up AI web app (separate from LeadSync) using:
- Neon Postgres
- Render backend
- Vercel frontend
- Groq for AI

## Structure
- `frontend/` Next.js app
- `backend/` Express API

## Local Setup (later)
1. Create `.env` files from the examples in each folder.
2. Install dependencies in each folder.
3. Run backend and frontend.

## Deploy
- Backend: Render (use `render.yaml` in repo root)
- Frontend: Vercel (set root directory to `frontend`)

## Deployment Checklist
1. Create Neon database and set `DATABASE_URL` in Render.
2. Set `GROQ_API_KEY` in Render.
3. Deploy backend on Render using `render.yaml`.
4. Set Vercel root to `frontend` and `NEXT_PUBLIC_API_BASE_URL` to the Render backend URL.
5. Verify `GET /health` returns `{ ok: true }`.

## Notes
- This project is intentionally separate from LeadSync.
