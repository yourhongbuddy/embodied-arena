import { cloudflare } from "@cloudflare/vite-plugin";
import { sites } from "@openai/sites-vite-plugin";
import { defineConfig } from "vite";
import vinext from "vinext";

// The default config continues to build the DigitalOcean standalone server.
export default defineConfig({
  plugins: [
    vinext(),
    cloudflare({
      configPath: "wrangler.sites.jsonc",
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
    }),
    sites(),
  ],
});
