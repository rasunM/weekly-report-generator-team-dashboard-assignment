-- Creates the second database used by the Jest/Supertest suite (TEST_DATABASE_URL) so tests never
-- touch your dev data. Not run automatically (docker-compose.yml no longer bind-mounts this into
-- /docker-entrypoint-initdb.d - that pattern was unreliable on Windows/OneDrive-synced folders).
-- Run it once yourself instead, after `docker compose up -d`:
--   docker exec -i weekly-reports-postgres psql -U report_app -d weekly_reports < docker/init-test-db.sql
-- or paste the one line below into `docker exec -it weekly-reports-postgres psql -U report_app -d weekly_reports`.
CREATE DATABASE weekly_reports_test OWNER report_app;
