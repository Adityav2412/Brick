// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Enable nitro for ALL builds (not just Lovable sandbox).
  // Without this, `vite build` outside Lovable skips the nitro plugin
  // and produces a raw SSR bundle that platforms can't route to.
  //
  // The `defaultPreset` uses Nitro's zero-config auto-detection:
  //   - NITRO_PRESET env var wins if set (e.g. "vercel", "cloudflare-module")
  //   - Vercel/Netlify/CF Pages auto-detected from their CI env vars
  //   - Falls back to "cloudflare-module" if nothing else matches
  nitro: {
    preset: process.env.NITRO_PRESET || undefined,
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
