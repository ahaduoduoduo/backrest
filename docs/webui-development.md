# WebUI hot-reload development

Updated: 2026-08-08

The production Backrest binary embeds `webui/dist`. Visual iteration does not
need to rebuild that binary or a Docker image. The development Compose service
runs Vite against the checked-out `webui` directory and proxies same-origin API
requests to the existing Backrest container.

## Start

The deployed Backrest container must be attached to the external Docker network
named `autofilm` with the network alias `backrest`.

```bash
docker compose -f compose.dev.yaml up -d
docker compose -f compose.dev.yaml logs -f webui
```

Open the development UI from another device on the LAN:

```text
http://10.0.1.7:5173
```

Vite watches TSX, TypeScript, Sass, messages, and assets. It sends component and
style changes through HMR. Changes to application providers or startup modules
may cause a full browser reload.

The first start installs the locked pnpm dependencies into a named Docker
volume. Later starts reuse both the dependency volume and the pnpm store.

## Request routing

The browser uses `./` as its backend URL, so authentication and API calls stay
on the Vite origin. Vite proxies these paths to `http://backrest:9898` inside the
existing Docker network:

- `/v1.Backrest`
- `/v1.Authentication`
- `/download`
- `/api/openlist`

`UI_BROWSER_BACKEND_URL` controls the URL compiled into the browser bundle.
`UI_PROXY_TARGET` controls only the Vite development proxy. The legacy
`UI_BACKEND_URL` behavior remains available when those variables are absent.

## Stop

```bash
docker compose -f compose.dev.yaml down
```

Stopping the development service does not stop or recreate the production
Backrest container. Named dependency volumes remain available for the next
development session.

## Release boundary

Use the Vite service for iterative visual work. After the selected interface
passes TypeScript, component, and mobile browser checks, run the manual GitHub
Actions image workflow once and deploy its immutable SHA tag.
