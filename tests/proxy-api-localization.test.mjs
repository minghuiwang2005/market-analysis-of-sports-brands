import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { NextRequest } = require("next/server");
const { getRewrittenUrl, isRewrite } = require("next/experimental/testing/server");

process.env.AUTH_SESSION_SECRET = "proxy-localization-test-secret-at-least-32-bytes";

const jitiPackage = (await readdir(new URL("../node_modules/.pnpm/", import.meta.url))).find((name) => name.startsWith("jiti@"));
assert.ok(jitiPackage, "jiti must be available from the installed Next.js toolchain");
const { createJiti } = await import(new URL(`../node_modules/.pnpm/${jitiPackage}/node_modules/jiti/lib/jiti.mjs`, import.meta.url));
const jiti = createJiti(import.meta.url, {
  alias: {
    "@": new URL("../src/", import.meta.url).pathname,
    "server-only": new URL("./server-only-stub.mjs", import.meta.url).pathname,
  },
});
const { proxy } = await jiti.import("../src/proxy.ts");
const { createSessionToken } = await jiti.import("../src/lib/auth/session.ts");
const sessionCookie = `sports_admin_session=${createSessionToken("test-admin")}`;

for (const locale of ["zh", "en"]) {
  test(`authenticated API requests stay unprefixed with ${locale} preference`, () => {
    const request = new NextRequest("https://example.test/api/spus?page=1", {
      headers: { cookie: `${sessionCookie}; site_locale=${locale}` },
    });

    const response = proxy(request);

    assert.equal(isRewrite(response), false);
    assert.equal(response.headers.get("x-middleware-next"), "1");
  });
}

test("unauthenticated API requests remain protected", () => {
  const response = proxy(new NextRequest("https://example.test/api/spus"));

  assert.equal(response.status, 401);
});

test("localized page requests still rewrite according to the locale cookie", () => {
  const request = new NextRequest("https://example.test/products", {
    headers: { cookie: `${sessionCookie}; site_locale=en` },
  });

  const response = proxy(request);

  assert.equal(isRewrite(response), true);
  assert.equal(new URL(getRewrittenUrl(response)).pathname, "/en/products");
});
