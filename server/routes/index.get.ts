import { defineEventHandler } from "h3";

import page from "./[...page].get";

// The landing page stays at "/" for everyone. The framework injects a script
// that bounces signed-in visitors to the dashboard; the page already has an
// "Open the dashboard" button, so drop that script on this one route.
const REDIRECT = /<script data-agent-native-auth-redirect>[\s\S]*?<\/script>/;

export default defineEventHandler(async (event) => {
  const res = await (page as any)(event);
  if (!(res instanceof Response)) return res;
  if (!(res.headers.get("content-type") ?? "").includes("text/html")) return res;
  const html = await res.text();
  const headers = new Headers(res.headers);
  headers.delete("content-length");
  // Browsers revalidate each visit so an old copy with the redirect can't
  // linger; the CDN keeps its own cache via CDN-Cache-Control.
  headers.set("cache-control", "public, max-age=0, must-revalidate");
  return new Response(html.replace(REDIRECT, ""), { status: res.status, statusText: res.statusText, headers });
});
