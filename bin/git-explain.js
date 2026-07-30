#!/usr/bin/env node
import("../dist/index.js").catch((err) => {
  console.error("Failed to load git-explain. Did you run `npm run build`?", err.message);
  process.exit(1);
});
