# Native Platform Migration Plan

Canonical plan for turning Speed Cube Hub from a web-first Next.js product into a multi-client platform with:

- web
- native iPhone/iPad app
- native Android app
- later native macOS app

Read this file before starting any native, backend-contract, monetization, sync, or store-release work.

Companion execution backlog: `plans/native-platform-agent-workstreams.md`

## 1. Executive Summary

Speed Cube Hub does **not** need a blind full rewrite. It does need a platform migration.

Today the product works because the web app, auth model, and a large amount of business logic all live in the same Next.js codebase. That is acceptable for a web-only product, but it is the wrong long-term shape for:

- native iPhone/iPad
- native Android
- native macOS
- cross-device sync
- in-app purchases and platform entitlements
- push notifications
- mobile/offline timer reliability

The migration strategy is:

1. Keep Supabase/Postgres/Auth/Storage as the system of record.
2. Stop treating Next.js server actions as the long-term backend boundary.
3. Extract shared backend contracts that every client can call safely.
4. Keep the website alive during the migration.
5. Build native Apple apps in Swift/SwiftUI.
6. Build native Android in Kotlin/Jetpack Compose.
7. Add macOS after the iPhone/iPad architecture is stable.

Do **not** try to ship web rewrite + iOS + Android + macOS simultaneously. That would create unnecessary schedule and quality risk.

## 2. Why This Program Exists

Current product reality:

- The website is already large and feature-rich.
- Phone web is intentionally blocked for app-style routes.
- Social/feed work is still expanding.
- The timer is a major product in its own right.
- The business model includes future paid digital features inside apps.

That combination means the native program is not "build a mobile shell." It is a second-generation platform effort.

## 3. Goals

### Primary goals

- One canonical backend and data model for every client.
- Native iPhone/iPad experience with product quality at or above the website.
- Native Android experience with the same backend and parity roadmap.
- Eventual native macOS app with shared data and shared account state.
- Cross-sync that feels obvious: solve on one device, refresh another, data is there.
- Monetization architecture that supports App Store and Play billing correctly.

### Secondary goals

- Reduce long-term coupling to Next.js server actions.
- Make new features easier to ship across web and native.
- Create clear parallel work lanes for multiple Codex agents.

### Non-goals

- Rebuilding the existing website UI immediately for aesthetic reasons.
- Introducing a cross-platform UI layer like React Native or Flutter.
- Replacing Supabase before it is a proven blocker.
- Shipping 100% feature parity in the first public mobile binary.

## 4. Current State Snapshot

### Already built

- Practice logging, stats, streaks, PBs, WCA integration
- Large timer surface including advanced scrambles, session management, import/export, multiple puzzle types, and hardware integrations
- Public profiles, leaderboards, feed, likes, comments, notifications, clubs, wrapped, share cards
- Web app architecture based on Next.js App Router + server actions + Supabase

### Still open or risky

- Current social/feed work is still active
- Some security items remain open
- T51 (`select("*")` replacement) was reverted multiple times and requires a schema audit before retry
- No native clients exist yet
- No app-store billing or entitlement layer exists yet
- No dedicated mobile moderation/reporting surface is defined yet

### Migration implication

The website proved product demand. It should now be treated as the first client of a broader platform rather than the permanent center of gravity.

## 5. Program Rules

These rules apply to every migration task unless the user explicitly overrides them.

1. One backend contract per behavior. Do not create separate web-only and app-only write paths for the same core mutation.
2. Keep the database canonical. Do not create client-specific shadow state that can become the real source of truth.
3. Use RLS where it cleanly expresses ownership rules. Use secure server-side contracts for complex, privileged, or multi-step behavior.
4. No service-role secrets in any client app. Ever.
5. New long-lived features should not deepen server-action lock-in after their in-flight branch lands.
6. Native UI should be platform-native. Shared UI abstractions are not a goal.
7. Shared behavior is expressed through schemas, contracts, database rules, and tests, not duplicated guesswork.
8. Sync must be reliable before it is fancy. Correctness beats real-time polish.
9. Monetization entitlements must be server-verified.
10. Every new native-facing backend surface needs explicit ownership, schema, failure handling, and tests.

## 6. Recommended Target Architecture

```text
                    +----------------------+
                    |   External Systems   |
                    |----------------------|
                    | WCA API              |
                    | Apple App Store      |
                    | Google Play Billing  |
                    | APNs / FCM           |
                    | Email / Webhooks     |
                    +----------+-----------+
                               |
                               v
+----------------+    +------------------------------+
| Web (Next.js)  |    | Shared Backend Contracts     |
| Existing site  |--->|------------------------------|
+----------------+    | Supabase RLS-safe CRUD       |
                      | Postgres RPCs                |
+----------------+    | Supabase Edge Functions      |
| iOS / iPadOS   |--->| Verified purchase handlers   |
| Swift / SwiftUI|    | Vendor webhooks              |
+----------------+    | Push token registration      |
                      +--------------+---------------+
+----------------+                   |
| Android        |-------------------+
| Kotlin /       |                   v
| Jetpack Compose|       +---------------------------+
+----------------+       | Supabase Core             |
                         |---------------------------|
+----------------+       | Auth                      |
| macOS (later)  |------>| Postgres                  |
| Swift / SwiftUI|       | Storage                   |
+----------------+       | Realtime                  |
                         +---------------------------+
```

## 7. Platform Decisions

### 7.1 Backend boundary

Recommended default:

- Keep Supabase as the primary backend.
- Use direct Supabase access from clients only when:
  - the table is protected entirely by RLS
  - no service-role secret is required
  - no multi-step orchestration is required
  - the behavior does not depend on hidden business rules
- Use RPCs, Edge Functions, or secure server handlers when:
  - multiple tables must change together
  - server-side validation or fan-out is required
  - service-role operations are needed
  - vendor secrets are involved
  - entitlements or webhooks are involved

This avoids the mistake of building a second monolithic backend just because multiple clients now exist.

### 7.2 Web strategy

- Keep the existing Next.js app running.
- Gradually move it to the same shared backend contracts the native apps will use.
- Do not try to visually rewrite the whole website as a precondition for native work.
- New web features in already-migrated domains must use the shared contract path, not a special server-action-only path.

### 7.3 Apple strategy

- Build one universal iPhone/iPad app in Swift/SwiftUI first.
- Share Apple-side domain/networking/state packages across iOS and later macOS.
- Treat macOS as a later dedicated target with shared logic, not as the final form of an iPad port.
- Mac Catalyst can be used as an intermediate step if schedule pressure requires it, but it is not the default long-term UX target.

### 7.4 Android strategy

- Build native Android in Kotlin/Jetpack Compose.
- Share backend contracts and product rules across platforms.
- Do not introduce a cross-platform UI stack.
- Defer Kotlin Multiplatform evaluation unless duplicate business logic becomes a real burden later.

## 8. Domain Migration Map

| Domain | Current Shape | Target Shape | Notes |
| --- | --- | --- | --- |
| Auth | Web-first Supabase auth flows + server cookies | Shared auth contracts; native token/session handling; Apple login support | Apple-side login requirements matter because Google login already exists on web |
| Profiles | Server actions + direct table reads | RLS-safe reads + validated mutation contracts | Public profile browsing must stay simple |
| Practice sessions | Mixed server actions and page fetches | Shared CRUD contracts + pagination + explicit schemas | Good early extraction candidate |
| Personal bests | Server actions with business rules | Shared mutation rules + history read contracts | Avoid client re-implementing PB promotion logic |
| Feed/social | Rapidly evolving web implementation | Shared social contracts + moderation/reporting surfaces | Wait for active social branch to land before invasive extraction |
| Notifications | Web-first notifications model | Shared notification reads + push token/device model | Native push requires new device token plumbing |
| Timer solves/sessions | Heavy web coupling and client logic | Split write-path, read-path, and local/offline sync responsibilities | Highest-risk migration area |
| Scrambles/training | Mix of client logic and server APIs | Standardize per scramble family where logic lives | Full parity must be explicit, not implied |
| WCA integration | Web-integrated flows | Shared backend integration + native linking UX | OAuth and callback behavior must be reviewed per platform |
| Purchases/entitlements | Not built | Verified entitlement service | New schema + webhooks + server notifications required |
| Moderation/UGC safety | Feedback exists; formal moderation flow unclear | Report, review, block, abuse handling, contact surfaces | App stores will care here |
| Admin/internal tools | Web-only | Keep web-only unless a strong native need appears | Not all admin flows need to go native |

## 9. Sync Model

Cross-sync is a product promise. The implementation rules below are the default unless a domain has a documented exception.

### 9.1 Canonical data rules

- Postgres is the source of truth.
- Every mutable record needs `id`, `created_at`, and `updated_at`.
- Client-generated UUIDs are preferred for offline-capable records like solves, local session drafts, queued comments, and device registrations.
- Server timestamps remain authoritative.

### 9.2 Conflict rules

- Solves: append-only by default; mutation actions must be idempotent.
- Practice sessions: last-write-wins unless domain-specific merge logic exists.
- Profile fields: last-write-wins with explicit dirty tracking in clients.
- Likes/follows/joins: unique-constraint-backed idempotent writes.
- Comments/posts: create/delete contracts should be explicit; edits should be limited and timestamped.
- Purchases/entitlements: server-verified only; client never becomes source of truth.

### 9.3 Offline rules

- The timer must save locally immediately.
- Network sync must be retryable and idempotent.
- Backgrounding the app must not lose solve data.
- If the client is offline, queue writes locally and reconcile when online.
- Do not let "offline mode" create a second hidden scoring system.

### 9.4 Real-time rules

- The minimum sync promise is cross-device correctness on refresh.
- Realtime subscriptions are optional at first, especially on web.
- Add realtime only where it materially improves UX: battles, notifications, active room state, maybe live feed updates.

## 10. Native Product Scope Strategy

Full parity is the long-term target. Staged delivery is still the correct execution model.

### Launch-critical for native public beta

- account creation/login
- profile read/edit
- dashboard/session history
- PBs
- core timer
- solve/session sync
- feed read/write
- likes/comments/follows
- leaderboards
- WCA linking/status display

### Near-term parity after public beta

- clubs
- challenges
- wrapped
- full timer analytics depth
- import/export
- share cards
- notifications polish

### Later parity / specialized releases

- full hardware matrix hardening
- advanced non-WCA timer tools
- admin/moderation consoles beyond essential surfaces
- macOS-specific workflows

Interpretation rule:

- Public messaging can say "native apps are coming."
- Internal execution must treat full parity as a roadmap, not a one-binary promise.

## 11. Migration Policy While Current Web Work Continues

The site is still under active feature development. That changes how this migration should start.

### Immediate rule

Do not interrupt already-claimed high-motion work just to start extraction in the same files.

### Current implication

The active social/feed foundation work touches feed, comments, likes, follows, profiles, types, and related migrations. Backend extraction work in those exact files should wait until those claims are released or merged.

### What can start immediately

- architecture audit
- API contract standards
- schema inventory
- purchase/entitlement design
- moderation/compliance design
- staging environment plan
- Apple/Android app skeleton planning
- timer sync and offline design

### Rule after current high-motion branches land

Any new backend-heavy feature in migrated domains must go through the shared contract path first.

## 12. Phased Delivery Plan

### Phase 0 — Audit, Standards, and Environment Readiness

### Goals

- Inventory schema, business rules, and external integrations
- Define contract patterns
- Define staging/release environments
- Decide first extraction order

### Required outputs

- live schema audit document
- domain inventory with current ownership
- API/RPC/Edge Function selection rubric
- environment/secrets matrix
- native release scope matrix

### Exit criteria

- Every core domain has an owner and target backend boundary
- T51-risk tables are explicitly audited
- Staging environment plan exists
- Native workstreams can start without guessing

### Phase 1 — Shared Backend Contract Foundation

### Goals

- Create the first stable shared backend surfaces
- Standardize validation, errors, pagination, and auth expectations
- Add missing platform tables and webhooks

### Candidate outputs

- shared contract schemas
- device token registration
- entitlement schema
- moderation/report tables
- contract tests
- vendor webhook handlers

### Exit criteria

- Core auth/profile/session/social/timer domains have a documented contract plan
- At least the first migration domains have stable shared contracts
- Web can start moving off bespoke server-action paths

### Phase 2 — Web Migration to Shared Contracts

### Goals

- Keep the web product shipping while reducing future duplication
- Retain existing UX
- Make web a client of the same platform the apps will use

### Exit criteria

- Priority domains no longer depend on web-only business rules
- New work in migrated domains uses the shared contract path
- Native clients can implement against the same data semantics

### Phase 3 — Apple Foundation

### Goals

- Establish the Swift/SwiftUI app foundation
- Implement auth, navigation, storage, design tokens, local queueing, and networking
- Prepare iPhone and iPad from the same project

### Exit criteria

- App boots with real auth and real API contracts
- Local persistence exists
- Core domain modules can be developed in parallel

### Phase 4 — iPhone/iPad Functional Parity Program

### Goals

- Deliver native mobile coverage for the highest-value product flows
- Match the website where users most care: timer reliability, stats, feed, identity

### Exit criteria

- Public beta quality is acceptable
- Cross-sync works end-to-end
- App Store blocking gaps are resolved for the shipped feature set

### Phase 5 — Monetization, Moderation, Push, and Store Hardening

### Goals

- Add verified purchase flows
- Add platform-safe moderation/reporting surfaces
- Add push notifications and store metadata readiness

### Exit criteria

- Entitlements are server-verified
- moderation/reporting requirements are met
- privacy/data safety disclosures are ready
- store review checklist passes

### Phase 6 — Android Program

### Goals

- Reuse the backend platform already created
- Build native Android using the same product rules

### Exit criteria

- Shared contracts cover Android needs without special-casing
- Android beta reaches core functional parity target

### Phase 7 — macOS Program

### Goals

- Reuse Apple-side shared logic where it helps
- Design a Mac experience that feels native instead of stretched iPad UI

### Exit criteria

- macOS target choice is confirmed
- Apple-side shared packages are stable enough to support it

## 13. Monetization and Entitlements Plan

Speed Cube Hub plans to sell digital features. That affects architecture immediately.

### Required principles

- Apple purchases must use StoreKit-compatible app-side purchase flows for digital entitlements sold in the iOS/macOS app.
- Android purchases must use Google Play Billing-compatible flows for digital entitlements sold in the Android app.
- The server owns entitlement truth after validating vendor events.
- The website may display entitlements and honor access, but it must not become the canonical source of purchase truth.

### Required backend pieces

- `products` or equivalent catalog mapping
- `user_entitlements` table
- purchase event history table
- App Store server notification handler
- Google Play purchase validation / RTDN handling
- reconciliation jobs for expired, refunded, revoked, or grace-period subscriptions

### Recommended product defaults

- Delay native ads until the paid entitlement path is stable
- Ship subscriptions/one-time unlocks only after entitlement verification exists
- Design web paywalls and app paywalls to read from the same entitlement model

## 14. Compliance and Store Readiness

These are part of product scope, not "release week paperwork."

### Apple

- Sign in with Apple support should be planned because Google login already exists on web.
- User-generated content requires formal moderation/reporting/blocking/contact surfaces.
- Privacy disclosures must match real data use.
- Export-compliance questions must be answered during submission.
- TestFlight and App Store Connect setup are part of the delivery plan.

### Google Play

- Billing compliance is required for in-app digital purchases.
- Data safety disclosures must match actual behavior.
- Internal/closed testing tracks must be part of the release workflow.

### Internal rule

No platform launch should be considered "almost done" if moderation, privacy, billing, push, or review-account requirements are still undefined.

## 15. Testing Strategy

### Backend

- contract tests for shared mutations and reads
- schema-level tests where practical
- idempotency and failure-path tests for webhooks and queued writes

### Web

- smoke test migrated domains against shared contracts
- keep existing UX behavior stable while swapping backend paths

### iOS / iPadOS

- unit tests for domain logic and queueing
- UI tests for key flows
- simulator for layout/basic flows
- physical-device testing for timer accuracy, backgrounding, push, Bluetooth, audio, purchases, and performance
- TestFlight for staged beta rollout

### Android

- unit tests for domain logic and queueing
- Compose UI tests
- emulator + physical-device matrix
- internal/closed tracks before public rollout

### Release rule

Timer and sync flows do not ship on the basis of simulator-only confidence.

## 16. Environments, Secrets, and Release Ops

Required environments:

- local development
- staging
- production

Recommended environment rules:

- separate Supabase project for staging
- separate Apple/Google app IDs for non-production builds
- environment-specific push credentials
- environment-specific purchase products where needed
- seeded test accounts and test data

Required operational docs:

- secrets matrix
- release checklist
- rollback checklist
- reviewer/demo account instructions
- entitlement troubleshooting flow

## 17. Repository Layout Recommendation

Short-term recommendation:

- keep the current web repo structure intact
- add migration docs under `plans/`
- add new backend contract surfaces without a full folder move first

Medium-term recommendation:

```text
plans/
  native-platform-migration.md
  native-platform-agent-workstreams.md
src/
  lib/
    contracts/
    domain/
    validations/
supabase/
  functions/
  migrations/
ios/
android/
docs/
  release/
  api/
```

Important rule:

- Do not move the current web app into `apps/web` just because it looks cleaner.
- Folder churn should follow concrete value, not architecture aesthetics.

## 18. Success Metrics

The migration is succeeding when:

- the website and native apps read/write the same canonical data correctly
- major product flows no longer depend on web-only business logic
- mobile solves are durable through backgrounding/network loss
- purchase entitlements survive refunds, renewals, and device changes
- native release velocity becomes predictable
- adding a feature once no longer means re-inventing backend behavior per client

## 19. Default Product Decisions Unless the User Changes Them

- Keep Supabase as the backend base.
- Use Swift/SwiftUI for Apple platforms.
- Use Kotlin/Jetpack Compose for Android.
- Do not use React Native or Flutter.
- Do not promise day-one full parity in the first public App Store build.
- Defer native ads until entitlement and privacy flows are mature.
- Plan Sign in with Apple support.
- Build a real moderation/report/blocking surface before native public launch.
- Treat macOS as a later dedicated target, not the main iPad shipping shortcut.

## 20. External References

Apple:

- [Apple Developer Program](https://developer.apple.com/programs/whats-included/)
- [TestFlight](https://developer.apple.com/testflight/)
- [App Store Connect](https://developer.apple.com/app-store-connect/)
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Privacy Details](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/)
- [Export Compliance](https://developer.apple.com/help/app-store-connect/manage-app-information/determine-and-upload-app-encryption-documentation/)
- [iPhone/iPad Apps on Apple Silicon Macs](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-of-iphone-and-ipad-apps-on-macs-with-apple-silicon/)

Google:

- [Play Console Overview](https://play.google.com/console/about/)
- [Google Play Billing Overview](https://developer.android.com/google/play/billing)
- [Google Play Testing Help](https://support.google.com/googleplay/android-developer/answer/9845334)

Supabase:

- [Supabase Swift Reference](https://supabase.com/docs/reference/swift/introduction)
- [Supabase Sign in with Apple Guide](https://supabase.com/docs/guides/auth/social-login/auth-apple)
