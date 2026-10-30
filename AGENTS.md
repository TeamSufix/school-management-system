<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Verification

- Install dependencies with `npm ci`.
- Run authorization regression tests with `npm test`. Database policy tests use in-memory PGlite with synthetic fixtures; they do not connect to Supabase.
- SQL under `supabase/proposals/` is unapplied review material, not a production migration. Test it against a staging copy of the actual schema and policies before requesting approval to apply it.
- Check TypeScript with `npm run typecheck` and lint with `npm run lint`.
- Verify production compilation with `npm run build`.
- Supabase-backed runtime checks require `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; account provisioning also requires server-only `SUPABASE_SERVICE_ROLE_KEY`.
- Never use the service-role client for parent record queries. Verify the parent identity and student links, then scope queries by school and linked student IDs.

## Database rollout

- `supabase/proposals/preflight.sql` is read-only and reports counts, not student records. Investigate duplicate login/normalized-period groups and cross-school inconsistencies before applying proposals; do not delete or rewrite existing records automatically.
- Review and apply proposals in staging in this order: `rls_hardening.sql`, `payment_integrity.sql`, `school_configuration.sql`, then `academic_integrity.sql`. Each script is transactional and intended to run once. Production application requires separate explicit approval.
- `school_configuration.sql` depends on helpers from `rls_hardening.sql`. Its unique indexes intentionally fail if duplicate teacher logins or equivalent slash/hyphen academic periods already exist.
- Configure the current year/term and teacher class/subject assignments in `/school/settings` or `/platform/schools/[id]/settings`. Teachers with no assignments have no academic access. Legacy teacher records without `user_id` must be linked to an existing same-school teacher login using the settings screen.
- New academic years use `YYYY/YYYY`; fee/result reads also support existing `YYYY-YYYY` records. Original results and financial records are immutable through authenticated database access; result corrections use append-only amendments.
- Printable student reports are at `/reports/students/[id]` and receipts at `/receipts/[id]`. Super-admin links supply an explicit `school` query parameter; parent access always verifies the student link.
