/**
 * Proxy scopelock.smriad.tech → Render (same pattern as 29.smriad.tech Worker).
 * Origin host must match Render’s default hostname for TLS.
 */
const RENDER_HOST = "scopelock-m4bp.onrender.com";

export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const target = new URL(incoming);
    target.protocol = "https:";
    target.hostname = RENDER_HOST;

    const headers = new Headers(request.headers);
    headers.set("Host", RENDER_HOST);
    headers.set("X-Forwarded-Host", incoming.host);
    headers.set("X-Forwarded-Proto", "https");

    return fetch(
      new Request(target.toString(), {
        method: request.method,
        headers,
        body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
        redirect: "manual",
      }),
    );
  },
};
