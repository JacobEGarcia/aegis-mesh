import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Aegis Mesh ships incident retrieval and replay concepts", async () => {
  const [page, route, readme] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/search/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Incident command/);
  assert.match(page, /REMEDIATION VERIFIED/);
  assert.match(route, /DIMENSIONS = 96/);
  assert.match(route, /QDRANT_URL/);
  assert.match(route, /embedded-cosine/);
  assert.match(readme, /isolated replay environment/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
});
