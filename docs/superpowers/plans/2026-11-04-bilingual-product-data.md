# Bilingual Site and Product Catalog Implementation Plan

> **For agentic workers:** Implement the approved plan task-by-task in the current `main` workspace. Keep Chinese and English in the same change. Use `superpowers:executing-plans` for Native execution.

**Goal:** Add the approved Chinese/English site experience and update the product catalog to show SPU summaries with SKU cards and a dedicated, fully browsable SPU/SKU detail page.

**Architecture:** Persist `zh` / `en` in a validated HttpOnly cookie. Next Proxy rewrites page requests to internal `app/[locale]` routes while preserving public URLs and keeping API routes unchanged. Typed dictionaries localize interface copy; locale-aware Neon queries serve reviewed research translations. Product list queries return the latest five SKU cards and list-visible fields; the detail page fetches all SKU records through a paginated API, avoiding the existing 500-record cap.

**Tech Stack:** Next.js 16.4.2 App Router with Cache Components, React 19, TypeScript, Drizzle ORM, Neon Postgres, lucide-react.

**Spec:** `docs/superpowers/specs/2026-11-04-site-multilingual-design.md`

## Global Constraints

- Support only Simplified Chinese (`zh`) and English (`en`); default to Chinese.
- Keep public paths and query strings unchanged; internal localized paths are hidden by Proxy rewrites.
- Keep API routes out of locale rewriting and preserve existing authentication and redirect behavior.
- Preserve user-entered product values and custom field labels in their original language.
- Neon remains the source of record for product and editorial research data.
- Do not add or run automated tests; use TypeScript, ESLint, production build, and focused manual checks.
- The detail page must allow traversal of every SKU; API pages are capped at 50 records and must not imply that a partial page is the full collection.
- Before touching application code, consult the installed Next.js guides under `node_modules/next/dist/docs/` for the route, Proxy, cache, and Link behavior being changed; follow this repository's `AGENTS.md`.

## Review Focus

- Invalid locale cookies resolve to Chinese; unsupported locale strings never select arbitrary routes.
- API requests, static assets, login redirects, and internal locale prefetch retain the current authentication and public URL behavior.
- Missing English research text falls back to the Chinese value without hiding the record.
- SKU cards and SKU pagination respect active/archive state, including the final page after a delete/archive action.
- User-entered product values, custom labels, and existing Chinese research text remain unchanged.

---

### Task 1: Add locale routing, cookie preference, and dictionaries

**Files:**
- Create `src/lib/i18n/types.ts`, `src/lib/i18n/messages/zh.ts`, `src/lib/i18n/messages/en.ts`, `src/lib/i18n/locale-provider.tsx`, `src/lib/i18n/server.ts`, `src/lib/i18n/locale-link.tsx`.
- Create `src/app/api/preferences/locale/route.ts`.
- Move UI routes and root layout under `src/app/[locale]/`; keep every file under `src/app/api/**` at its current path.
- Modify `src/proxy.ts`.

**Interfaces:**
- `Locale = "zh" | "en"`.
- `getLocaleMessages(locale: Locale)` returns a typed dictionary with identical Chinese and English keys.
- `LocaleProvider` exposes validated `locale` and `t(key)` to client components; `getRequestLocale()` reads the validated locale route param for server components.
- `LocaleLink` accepts a public `href` and sends Next navigation/prefetch to the matching internal `/{locale}/...` target while displaying the original public URL.
- `POST /api/preferences/locale` accepts `{ locale: "zh" | "en" }`, writes the `site_locale` cookie, and returns a small success response.

- [x] Add the locale type, validation, structurally matched dictionaries, server helper, provider, and locale-aware link.
- [x] Implement the preference handler with allow-listed values and a one-year HttpOnly cookie (`sameSite: lax`, `path: /`, `secure` in production); reject malformed JSON or unsupported values with a stable error code.
- [x] Reorder Proxy handling so `/api/**`, auth endpoints, login, Next internals, and static assets retain existing behavior; authorize internal locale targets; rewrite ordinary public page paths from the cookie or default `zh`.
- [x] Move all current UI routes and root layout under `[locale]`; add `generateStaticParams` for `zh` and `en`, and set `<html lang>` from the locale.
- [x] Preserve the public login `next` pathname and query through redirects and localized internal routes.
- [ ] Manually verify full-page language switching and internal-link prefetch in a browser. Focused HTTP checks confirmed default/English locale rendering, locale-cookie validation, internal English login routing, query-preserving login redirects, and unchanged API authentication behavior.

### Task 2: Localize shared navigation, login, metadata, and simple pages

**Files:**
- Modify `src/components/app-shell.tsx`, `src/components/login-form.tsx`, `src/components/planned-feature-page.tsx`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/login/page.tsx`, `src/app/[locale]/analysis/page.tsx`, `src/app/[locale]/products/sales/page.tsx`, `src/app/[locale]/settings/schedules/page.tsx`, and `src/app/globals.css`.
- Replace UI `next/link` imports with `LocaleLink` on localized routes; leave API `fetch()` URLs unchanged.

**Interfaces:**
- The language control sits to the right of “配置” and left of logout, submits the target cookie value, then reloads the current URL after success.
- Page metadata helpers accept a `Locale` and return localized titles/descriptions.

- [x] Localize navigation labels, brand accessible name, logout, mobile menu labels, selected language state, and language-switch failure state.
- [x] Localize login copy and server/API feedback, analysis, sales, schedule placeholder, and shared planned-feature pages.
- [x] Localize metadata for every moved route and make all internal navigation locale-aware.
- [ ] Manually check desktop/mobile navigation, keyboard interaction, login persistence, metadata, and empty/error states in both languages.

### Task 3: Localize product model, product CRUD, and API errors

**Files:**
- Modify `src/components/products-page.tsx`, `src/components/product-form.tsx`, `src/components/product-detail-page.tsx`, `src/components/model-fields-page.tsx`, `src/components/model-configs-page.tsx`, `src/components/archive-confirmation.tsx`, `src/app/[locale]/products/page.tsx`, `src/app/[locale]/products/model/page.tsx`, `src/app/[locale]/settings/models/page.tsx`, and dictionary product/model/error sections.

**Interfaces:**
- A built-in-field display helper maps stable field keys (`category`, `sport`, `series`, `signing_athlete`, etc.) to translated labels without writing translations back to Neon.
- Known API error codes resolve to localized messages; unknown errors use a safe locale-specific fallback.

- [x] Localize built-in field names/types/options and fixed required, unique, visibility, search, and status labels; leave custom labels and values verbatim.
- [x] Localize product filters, forms, create/edit/archive/restore actions, confirmations, validation errors, loading/empty/error states, pagination, and toasts.
- [x] Format dates and numbers with `Intl` using the active locale; do not translate product names, model option values, SKU values, or codes.
- [ ] Manually check create/edit/archive/restore and validation states in both languages while confirming saved custom text remains unchanged.

### Task 4: Localize NBA and athlete research content in Neon

**Files:**
- Modify `src/lib/db/schema.ts`, `src/lib/sports-timeline/queries.ts`, `src/lib/stars/queries.ts`, `src/app/[locale]/sports/nba/page.tsx`, and `src/app/[locale]/stars/[sport]/page.tsx`.
- Create an additive migration after `0011_product_signing_athlete.sql` and append its Drizzle journal entry.

**Interfaces:**
- Research query functions receive a validated `Locale`; English fields are selected when present and otherwise fall back to Chinese.
- Existing record IDs, source links, evidence, image licenses, and Chinese values remain unchanged.

- [x] Add nullable English columns for timeline event text, classic game text, sports introductions, and the displayed athlete profile facts listed in the spec.
- [x] Add reviewed English translations for current published records using stable event keys and athlete slugs; migration uses conflict-safe updates and never resets maintained English text.
- [x] Localize fixed NBA/star headings, categories, date formats, source captions, relationship status, and loading/error states; preserve names and source metadata that are original-language identifiers.
- [ ] Manually inspect the same NBA and athlete pages in both languages, including a missing-English fallback case.

### Task 5: Reshape the product list into SPU and SKU rows

**Files:**
- Modify `src/lib/products/types.ts`, `src/lib/products/product-queries.ts`, `src/components/products-page.tsx`, and `src/app/globals.css`.
- The page and dictionaries are under the locale route/provider created in Tasks 1–3.

**Interfaces:**
- `SkuSummaryDto` includes `fields: FieldDisplayValue[]` in addition to ID, SKU code, name, and creation time.
- `SpuListItemDto.skuCount` and `latestSkus` both use the selected active/archive view; `latestSkus` contains at most five latest matching SKUs.
- The list-visible SKU fields are the non-system model fields with `showInList === true`.

- [x] Remove the tagline `以 SPU 为主体管理商品资料，在每个档案中维护颜色、尺码等 SKU 变体。` and do not add a translated replacement.
- [x] Extend `listSpus()` to fetch display-visible values for the latest five SKU records per SPU and attach their field labels/values without changing saved data.
- [x] Render each SPU's main information row followed by a full-width second row with up to five SKU cards; each card shows SKU name, code, and visible SKU fields. Show the remaining count as `max(0, skuCount - latestSkus.length)` and a bilingual no-SKU state.
- [x] Remove list-page inline detail expansion state/rows and change “查看详情” to `LocaleLink` at `/products/{spuId}`.
- [x] Keep SPU edit/archive/restore and SKU create actions reachable from the list; create a SKU form directly from the selected SPU summary without fetching a full detail payload.
- [ ] Manually inspect 0, 1, 5, and more-than-5 SKU cases in active and archived views in both languages.

### Task 6: Add the dedicated detail page and paginated SKU API

**Files:**
- Modify `src/lib/products/types.ts`, `src/lib/products/product-queries.ts`, and `src/app/api/spus/[spuId]/skus/route.ts`.
- Create `src/app/[locale]/products/[spuId]/page.tsx` and `src/components/product-detail-page.tsx`.

**Interfaces:**
- `GET /api/spus/{spuId}?status=active|archived` returns the SPU's complete fixed/custom fields and correct untruncated SKU count; it does not fetch a 500-row SKU array.
- `GET /api/spus/{spuId}/skus?status=active|archived&page=1&pageSize=50` returns `{ items: SkuDetailDto[], total, page, pageSize, pageCount }`; validate status and positive pagination values, with `pageSize` capped at 50. Existing `POST` create-SKU behavior remains unchanged.
- `SpuSkuPageDto` (or an equivalently named DTO) uses the exact response shape above.

- [x] Refactor `getSpuDetail()` to load the SPU record, complete SPU field values, and an uncapped SQL SKU count without loading SKU rows.
- [x] Add a `listSpuSkus(spuId, status, page, pageSize)` query that counts matching SKUs, selects the requested stable order (`createdAt DESC`, then ID DESC), and resolves all fields for only that page.
- [x] Add validated GET handling to the existing SKU collection route while preserving POST creation; return the typed pagination response.
- [x] Build `/products/{spuId}` with bilingual heading, SPU fields, SKU active/archive filters, page controls, loading/error/not-found states, and a locale-aware return link.
- [x] Show every field on each SKU record on the dedicated page; retain edit, archive, restore, and create SKU actions. After a mutation, reload the current page and move to the previous page if the current page became empty.
- [ ] Manually check deep pagination beyond 500 records with a controlled data fixture or existing data, status filters, the final-page archive case, and SKU CRUD in both languages.

### Task 7: Integrate and verify

**Files:**
- Review changed locale dictionaries, route tree, Proxy, Drizzle schema/migration, product APIs/components, and this spec.

- [x] Run `node node_modules/typescript/bin/tsc --noEmit` and confirm it exits successfully.
- [x] Run ESLint on every changed TS/TSX file and confirm there are no errors.
- [x] Run `node node_modules/next/dist/bin/next build --webpack` and confirm the production build succeeds.
- [x] Run `git diff --check` and scan changed files for credentials.
- [ ] Manually check authenticated list-to-detail navigation, active/archive SKU paging, and English database fallback. Neon migration `0012_bilingual_research_content.sql` is included but has not been applied to the connected database.
