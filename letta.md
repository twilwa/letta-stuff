# Letta Local Server Setup

## Summary

Successfully set up a local Letta server in `/Users/anon/Projects/letta-stuff/letta` for use with Letta Desktop.

## Components Running

1. **PostgreSQL Database (Docker)**
   - Container: `letta-letta_db-1`
   - Image: `ankane/pgvector:v0.5.1`
   - Port: `localhost:5432`
   - Credentials: `letta:letta`
   - Database: `letta`
   - Status: Healthy

2. **Letta Server**
   - Port: `http://localhost:8283`
   - Version: `v0.16.1`
   - Status: Running
   - Process: Background (PID 12032)
   - Environment: Python virtual environment via `uv`

## Installation Steps Performed

1. Verified `uv` installation (already installed via mise)
2. Cloned Letta repository from GitHub
3. Installed dependencies with `uv sync --all-extras`
4. Started PostgreSQL database via Docker Compose
5. Ran database migrations using Alembic
6. Started Letta server with PostgreSQL connection

## Configuration

The server requires these environment variables to connect to PostgreSQL:

- `LETTA_PG_DB=letta`
- `LETTA_PG_USER=letta`
- `LETTA_PG_PASSWORD=letta`
- `LETTA_PG_HOST=localhost`
- `LETTA_PG_PORT=5432`

## Important Notes

1. **OPENAI_API_KEY Required**: The server is running but you need to set `OPENAI_API_KEY` environment variable to use OpenAI models. Set this before creating agents.

2. **Server Command**: To start the server again in the future:

   ```bash
   cd /Users/anon/Projects/letta-stuff/letta
   LETTA_PG_DB=letta LETTA_PG_USER=letta LETTA_PG_PASSWORD=letta \
   LETTA_PG_HOST=localhost LETTA_PG_PORT=5432 \
   uv run letta server
   ```

3. **Database Management**:
   - Start database: `cd /Users/anon/Projects/letta-stuff/letta && docker compose up letta_db -d`
   - Stop database: `cd /Users/anon/Projects/letta-stuff/letta && docker compose down`

4. **Server URL**: Letta Desktop expects the server at `http://localhost:8283` by default.

5. **Admin Dashboard**: You can also view the server at `https://app.letta.com/development-servers/local/dashboard`

## Verification

The server is responding correctly:

- Web interface: `http://localhost:8283/` (returns HTML)
- API ready for Letta Desktop connections

## Next Steps

1. Set `OPENAI_API_KEY` environment variable if you want to use OpenAI models
2. Connect Letta Desktop to `http://localhost:8283`
3. Start creating agents through the desktop app
