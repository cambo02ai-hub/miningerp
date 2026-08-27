# Railway Deployment

This repository contains two deployable application layers. The existing `miningerp` Railway service is the React/Vite frontend. The Spring Boot API is deployed as a second service from the same GitHub repository, using `backend-java` as its root directory. PostgreSQL is provisioned as a third Railway service and is connected to the API through Railway reference variables.

## Required Railway topology

| Service | Source or template | Root directory | Purpose |
|---|---|---|---|
| `miningerp` | Existing GitHub service | `/` | React/Vite frontend |
| `miningerp-api` | Same GitHub repository | `/backend-java` | Java 21 Spring Boot API |
| `Postgres` | Railway PostgreSQL template | Not applicable | Persistent PostgreSQL database |

Railway’s PostgreSQL service exposes `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, and `DATABASE_URL`. The API should reference these values instead of copying credentials. Reference variables use Railway’s `${{SERVICE_NAME.VARIABLE_NAME}}` syntax.

## Create the database service

From the `resourceful-spontaneity` project canvas, choose **New**, then **Database**, then **PostgreSQL**. Keep the database service name as `Postgres`, or replace `Postgres` in every reference below with the exact name you choose. Do not enable public TCP access for the application connection; the API should use Railway’s private service networking.

## Create the API service

Add a new service from the GitHub repository `cambo02ai-hub/miningerp`. In the API service settings, set **Root Directory** to `/backend-java`. Railway will detect `backend-java/Dockerfile` and build the Java 21 application from that directory. Generate a public domain for this service so the frontend can call it.

Add the following variables to the API service. The password and JWT values must be generated as secrets in Railway and must not be committed to Git.

| Variable | Value |
|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}` |
| `SPRING_DATASOURCE_USERNAME` | `${{Postgres.PGUSER}}` |
| `SPRING_DATASOURCE_PASSWORD` | `${{Postgres.PGPASSWORD}}` |
| `SPRING_PROFILES_ACTIVE` | `production` |
| `JWT_SECRET` | A random secret of at least 32 characters |
| `ADMIN_PASSWORD` | A strong initial password for the `admin` account |
| `APP_CORS_ALLOWED_ORIGINS` | `https://${{miningerp.RAILWAY_PUBLIC_DOMAIN}}` |

If the frontend service is renamed, replace `miningerp` in the CORS value with the exact frontend service name. If the frontend and API are served from more than one origin, provide a comma-separated list of origins.

## Point the frontend at the API

The frontend reads `VITE_API_BASE_URL` at build time. Add this variable to the existing `miningerp` frontend service and redeploy it:

```text
VITE_API_BASE_URL=https://${{miningerp-api.RAILWAY_PUBLIC_DOMAIN}}/api
```

Replace `miningerp-api` with the exact API service name if it differs. Because this is a Vite build variable, changing it requires a new frontend deployment.

## Verify the connection

After deploying the API, open `https://<api-domain>/actuator/health`. A healthy response indicates that the application is running. Confirm the deployment logs show Flyway completing successfully and that the API does not report datasource connection errors. The migrations in `backend-java/api/src/main/resources/db/migration` create the schema automatically on a new PostgreSQL service.

The first login uses the `admin` username and the value configured in `ADMIN_PASSWORD`. Change that password immediately after the first successful login. Do not use the old local-development default in a production deployment.

## Local compatibility

The Spring configuration accepts Railway’s explicit `SPRING_DATASOURCE_*` variables and continues to support the existing local `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` variables. It also accepts Railway’s injected `PORT` variable while retaining port `8080` as the local default.

## References

1. [Railway PostgreSQL documentation](https://docs.railway.com/databases/postgresql)
2. [Railway variables documentation](https://docs.railway.com/variables)
3. [Railway Spring Boot deployment guide](https://docs.railway.com/guides/spring-boot)
4. [Railway Dockerfile documentation](https://docs.railway.com/builds/dockerfiles)
