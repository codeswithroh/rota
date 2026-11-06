import { agentNative } from "@agent-native/core/vite";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

const reactRouterPlugins = reactRouter as unknown as () => any[];
const agentNativePlugins = agentNative as unknown as (
  options?: Parameters<typeof agentNative>[0],
) => any[];
// Dev only: ad/cookie blockers drop framework files by name
// ("consent-banner", "session-replay", "analytics"), which blanks the page.
// Serve every @agent-native .js file under a neutral hashed id instead.
function blockerSafeDevIds() {
  const files = new Map<string, string>();
  const isFramework = (id: string) =>
    id.includes("/node_modules/@agent-native/") &&
    !id.includes("/.vite/") &&
    /\.m?js(\?|$)/.test(id);
  return {
    name: "rota:blocker-safe-dev-ids",
    apply: "serve" as const,
    enforce: "pre" as const,
    async resolveId(
      this: any,
      source: string,
      importer: string | undefined,
      options: any,
    ) {
      if (!importer || options?.ssr) return null;
      const virtualImporter = files.get(importer);
      const realImporter = virtualImporter ?? importer;
      if (!virtualImporter && !source.includes("agent-native")) return null;
      const resolved = await this.resolve(source, realImporter, {
        ...options,
        skipSelf: true,
      });
      if (!resolved || resolved.external) return resolved ?? null;
      if (!isFramework(resolved.id)) return virtualImporter ? resolved : null;
      const { createHash } = await import("node:crypto");
      const hash = createHash("sha1").update(resolved.id).digest("hex");
      const key = `\0rota-dev-${hash.slice(0, 12)}`;
      files.set(key, resolved.id);
      return key;
    },
    async load(id: string) {
      const file = files.get(id);
      if (!file) return null;
      const { readFile } = await import("node:fs/promises");
      return readFile(file.split("?")[0]!, "utf8");
    },
  };
}

export default defineConfig({
  optimizeDeps: {
    entries: [
      "app/entry.client.tsx",
      "app/root.tsx",
      "app/components/layout/{Layout,Sidebar}.tsx",
      "app/components/chat/ChatRouteContent.tsx",
      "app/routes/{home,chat.$threadId}.tsx",
    ],
  },
  // Hash-only chunk names: ad/cookie blockers drop files named like
  // "analytics-*.js" or "consent-banner-*.js", which blanks the app.
  build: {
    rolldownOptions: {
      output: {
        chunkFileNames: "assets/c-[hash].js",
      },
    },
  },
  plugins: [
    blockerSafeDevIds(),
    ...reactRouterPlugins(),
    ...agentNativePlugins({
      ssrStubs: ["shiki"],
    }),
  ],
});
