// OpenNext Cloudflare adapter configuration
import type { OpenNextConfig } from "@opennextjs/aws/types/open-next.js";

const config = {
  default: {},
  middleware: {
    external: true,
  },
} satisfies OpenNextConfig;

export default config;
