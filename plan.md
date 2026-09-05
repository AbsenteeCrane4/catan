# Plan: Domain Name and HTTPS (Issue #24)

This is a planning document only — no implementation has been done. It exists to scope
the work in issue #24 against how this repo actually deploys today, so the eventual
implementer isn't guessing.

## Current state (relevant facts from the repo)

- The app is a single container built from [dockerfile](dockerfile); the `runner` stage
  runs `node server.js` and `EXPOSE 3000`. There is **no TLS termination in the
  container** — it only ever speaks plain HTTP on port 3000.
- `deploy` in [.github/workflows/ci.yml](.github/workflows/ci.yml) SSHes into the
  production server and runs `docker compose up -d` from `~/Catan`. **The
  `docker-compose.yml` file lives on the server, not in this repo** — so any change to
  how the container is exposed (adding a reverse proxy service, mapping port 443, mounting
  certs) is a server-side change this repo cannot fully capture or version-control today.
- `docker-publish` and `deploy` only run on **tag pushes**, not on every merge to `main`.
  Any HTTPS/domain change that requires a new image (e.g. if the app itself needs to know
  its origin) only reaches production via a tag.
- Socket.IO shares the same HTTP server as Next.js (`server.ts`), so a reverse proxy in
  front of the app **must forward WebSocket upgrade requests**, not just plain HTTP — a
  naive proxy config that only handles `GET`/`POST` will silently break multiplayer.
- There is no existing nginx/Caddy/Traefik config anywhere in this repo to build on.

## Scope decision

The bulk of this ticket (domain registration, DNS, certificate issuance, firewall,
port 443) is infrastructure work on the production server and registrar, not application
code. The repo's job is to:
1. Provide the reverse-proxy config as a reviewable, version-controlled artifact (even
   though the compose file itself lives on the server).
2. Make sure the app behaves correctly behind that proxy (correct origin checks, secure
   cookies/websocket behavior if any exist).
3. Document the server-side steps that can't live in the repo, so they're repeatable and
   survive a server rebuild.

## Proposed approach

Terminate TLS with a reverse proxy in front of the existing container, rather than
teaching the Node/Socket.IO server to speak TLS directly. This is the standard pattern
for this stack and keeps `server.ts` unchanged.

- **Reverse proxy**: nginx (or Caddy, which gets Let's Encrypt renewal for free with far
  less config — worth a deliberate choice early, since it changes several tasks below).
- **Certificates**: Let's Encrypt via certbot (nginx) or Caddy's built-in ACME client.
- **Proxy responsibilities**:
  - Terminate HTTPS on 443, redirect all HTTP (80) to HTTPS.
  - Forward to the app container on its internal port (3000), preserving
    `Upgrade`/`Connection` headers so Socket.IO's WebSocket transport works.
  - Set `X-Forwarded-Proto`/`X-Forwarded-Host` so the app can tell it's being served over
    HTTPS if it ever needs to (e.g. secure cookies).

## Work breakdown

### 1. Domain
- [ ] Register the domain (or confirm one is already owned/available for this project).
- [ ] Create the DNS A record (and AAAA if the server has IPv6) pointing at the
      production server's IP.
- [ ] Confirm propagation and resolution before touching server config, so DNS issues
      aren't confused with TLS/proxy issues later.

### 2. Reverse proxy service (server-side, plus a version-controlled config in-repo)
- [ ] Decide nginx vs. Caddy.
- [ ] Add the proxy as a service alongside the app in the server's `docker-compose.yml`
      (out of repo today) — or add an `infra/`-style config file to *this* repo that the
      server pulls from, so the config is diffable and reviewable like the rest of the
      codebase. Flag to the maintainer during implementation: is it acceptable to bring
      `docker-compose.yml` into this repo, or must it stay server-only?
- [ ] Confirm the WebSocket upgrade headers are forwarded correctly — test Socket.IO
      connectivity through the proxy, not just page loads.

### 3. Certificates
- [ ] Point cert issuance at the registered domain.
- [ ] Automate renewal (certbot timer/cron, or Caddy's automatic renewal) — a
      Let's Encrypt cert is only valid 90 days, so this must not be a one-time manual step.
- [ ] Verify HTTPS survives a full server/container restart, not just the initial issuance
      (`docker compose up -d` on redeploy must not lose the cert volume).

### 4. Server/firewall
- [ ] Open port 443 (and confirm 80 stays open only for the redirect, not general traffic).
- [ ] Update any existing firewall rules (ufw/security group/cloud provider console —
      whichever this server uses) to allow 443.
- [ ] Confirm port 3000 (the app's raw HTTP port) is **not** directly reachable from the
      internet once the proxy is in place — otherwise HTTPS enforcement can be bypassed
      by hitting the app port directly.

### 5. Verification
- [ ] `https://<domain>` loads the app with a valid, browser-trusted certificate.
- [ ] `http://<domain>` redirects to `https://<domain>`.
- [ ] Multiplayer (Socket.IO) works end-to-end over the HTTPS domain — this is the one
      most likely to silently break if the proxy doesn't forward upgrade headers.
- [ ] Restart the server/containers and reconfirm HTTPS still works (catches cert-volume
      or renewal-timer misconfiguration).

### 6. Documentation
- [ ] Document the proxy config, cert issuance, and renewal setup somewhere durable
      (README section or a doc under `docs/`), since none of this currently exists in the
      repo and a server rebuild would otherwise require re-deriving it from memory.

## Open questions for the maintainer

- Is the domain already registered, or does this ticket include registration itself?
- Is bringing the server's `docker-compose.yml` into this repo (so the proxy service is
  version-controlled) in scope, or should the proxy config be documented but managed
  purely on the server?
- nginx or Caddy — any existing preference or constraint on the production server?

## Explicitly out of scope (per issue body)

- No changes to game/reducer logic, board generation, or any other application feature.
- No changes to CI beyond what's needed to note the new server-side dependency (this plan
  does not propose CI changes; `docker-publish`/`deploy` already only run on tag pushes).
