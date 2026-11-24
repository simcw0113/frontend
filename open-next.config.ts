import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No R2 incremental cache yet (optional later). Default in-memory is enough for a temp demo.
export default defineCloudflareConfig({});
