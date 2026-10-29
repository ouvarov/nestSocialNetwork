# ADR-0003: Access token in memory, rotating refresh token in a first-party cookie

- Status: accepted
- Date: 2026-10-27 (records the design built in phase 1)

## Context

The original version had a 15-minute access JWT in `localStorage`, where any XSS could read it. The 30-day refresh cookie was never rotated, and some write endpoints even authenticated with the refresh cookie instead of the access token. The client never refreshed, so the session silently died after 15 minutes. The new design has to:

- keep tokens out of reach of page scripts;
- survive reloads and several open tabs;
- let a stolen refresh token be detected and stopped;
- authenticate the Socket.IO connection;
- work when the web app is hosted on Vercel and the API on Render, two different sites.

## Decision

**Access token**

- A JWT valid for 15 minutes, held only in a module variable on the client.
- It goes out as a `Bearer` header and in the Socket.IO handshake (`auth.token`).
- The strategy rejects any token whose `typ` is not `access`. So a refresh token can't be used as an access token.

**Refresh token**

- A JWT with its own secret, valid for 30 days.
- It lives in an `httpOnly`, `SameSite=Lax` cookie scoped to `/api/auth`, `Secure` in production.
- Every token is a row in `refresh_tokens`: `jti`, `family_id`, `expires_at`, `revoked_at`, `replaced_by`.

**Rotation**

- Each refresh revokes the presented token and issues its successor in the same family.
- **Reuse detection:** presenting a token that was already rotated revokes the whole family. This catches a stolen token being used after its owner has refreshed.
- **Concurrent refresh:** two tabs refreshing with the same token within 10 seconds get a new token each, from the same family, instead of a false theft alarm.
- **Logout** revokes the whole family, so a sibling token from a concurrent refresh dies too.

**Socket**

- The handshake is checked once, in namespace middleware. A refused client gets `connect_error` with `Unauthorized`.
- The socket keeps the token's `exp`. A timer closes it at `exp`, and every event checks `exp` again without touching the database.
- Each socket joins the room `user:<id>`. Logout, reuse detection and account deletion close every socket in that room.
- Every event answers through its acknowledgement: `{ ok: true, data }` or `{ ok: false, error: { statusCode, message } }`. There is no separate `exception` event, so an error always reaches the call that caused it.

**Client**

- A single-flight refresh: parallel 401s wait for one refresh call, then retry their original requests.
- A failed refresh ends the session everywhere: it clears the query cache, disconnects the socket and redirects to sign-in.
- When the server closes the socket (`io server disconnect`), the client refreshes the access token and reconnects. If the refresh fails, the session ends.

**Same-origin proxy**

- In production the browser calls `/api/*` on the web origin, and Vercel proxies it to Render. The refresh cookie therefore stays first-party, and Safari doesn't block it.
- The API accepts proxied requests only when they carry a shared secret header. That also makes the visitor IP from Vercel trustworthy for rate limits.

## Alternatives considered

- **`localStorage` tokens:** simplest, but readable by any injected script, and nothing can be revoked.
- **Server sessions with a CSRF token:** solid, but a stateful session store and CSRF plumbing for every call, plus a second mechanism for the socket.
- **A cross-site cookie (`SameSite=None`):** works in Chrome. Safari's tracking prevention blocks it, so Safari users would be signed out on every reload.

## Consequences

- An XSS can still act as the user while the page is open. It can't take a long-lived credential away with it.
- Every refresh writes to the database. Revoked rows are kept until they expire, because reuse detection needs them. A daily job deletes expired rows.
- A socket lives at most until its access token expires, so a stolen access token can't keep a socket open after logout.
- The web hosting must proxy `/api/*`. Local dev mirrors this with the Vite proxy.
