# MuleSoft Capacity Planner

A browser-only planning workspace for tracking MuleSoft flow licenses, API Manager capacity, project reservations, API demand, usage, and strategic reserve month by month. It intentionally does **not** calculate monetary cost.

## Run it

Open `index.html` directly in a current desktop browser. No installation, server, network connection, build command, or dependency is required. Use **Load sample data** on the Import / Export screen for the documented 2027 planning scenario.

## Guided labs

The labs use a separate, cumulative Northstar Outfitters scenario. Start with a clean browser workspace in Lab 1, then complete the labs in order because each one builds on the data from the previous lab.

1. [Lab 1 — Plan the Digital Checkout project](lab1.md)
2. [Lab 2 — Add the Store Fulfillment project](lab2.md)
3. [Lab 3 — Find and respond to a project overrun](lab3.md)
4. [Lab 4 — Add future capacity and compare forecast modes](lab4.md)
5. [Lab 5 — Record go-live and export the plan](lab5.md)

## Technical design

The application uses semantic HTML, responsive CSS, and plain JavaScript. There are no frameworks, external fonts, libraries, CDNs, backend services, or databases. Data is normalized around stable generated IDs and stored under the localStorage key `mulesoft-cost-estimator-data`. A schema version and application timestamps are included. Storage reads and writes are centralized in `js/storage.js`; corrupt stored JSON is reported rather than silently discarded.

### Files

- `index.html` — accessible application shell and dialogs.
- `styles.css` — responsive enterprise UI.
- `js/timelines.js` — month validation, lookup, upsert, range preview, and advisory detection.
- `js/storage.js` — dataset creation and centralized localStorage persistence/backup.
- `js/validation.js` — import structure, ID, reference, month, and value validation.
- `js/calculations.js` — API, project, and organization calculations.
- `js/sample-data.js` — optional, clearly identified 2027 scenario.
- `js/ui.js` — screen and table rendering.
- `js/app.js` — navigation, forms, CRUD, archive, automatic reservation coverage, import/export, and event handling.
- `tests.html` / `js/tests.js` — dependency-free storage, timeline, and calculation test harness.

## Counting rules

### Flow licenses

Flow capacity is shared across DEV, TEST, and PROD. For each active environment:

`environment flow demand = effective flow count × replica count`

The environment override is used when present; otherwise the shared base flow count applies. Inactive environments count zero. Used and reserved demand are tracked independently and both reduce availability.

### API Manager

DEV and TEST each consume one pre-production license when managed; PROD consumes one production license. Reserved and used states are independent from flow state. Replica count **never** multiplies API Manager demand. Not-managed environments count zero.

### Capacity and forecasts

The planner always uses the committed forecast: **Active** and **Ordered** entries count as owned capacity. **Planned** entries remain visible as uncertain future supply but do not count; cancelled entries never count. Capacity begins in its effective month and continues indefinitely; version one has no expiration or negative adjustments.

`freely available = owned − used − reserved − strategic reserve`

`shortfall = max(0, used + reserved + strategic reserve − owned)`

Strategic reserve is protected separately for every pool. It is never consumed automatically. An explicit effective-dated reduction releases it to the organization pool, but does not assign it to a project or API.

## Projects, APIs, and reservation coverage

Every active API has one effective-dated owner. The protected **Shared Platform / Unassigned** project is the fallback. Consumer projects are effective-dated informational relationships only and never duplicate demand. Project reservations are pool-level and persist until explicitly changed. API demand is covered automatically from its owning project’s available reservation whenever a project or API is saved. Coverage may be partial; demand beyond the project reservation remains unplanned organization demand. Changing reserved configuration to used changes classification without duplicating demand.

Lifecycle values are descriptive. They never alter demand automatically. Archive workflows are the exception: API archive adds inactive/not-managed environment records from its effective month, while preserving all history. Project archive releases unassigned reservation but preserves coverage for remaining APIs.

## Effective-dated timelines

Every timeline record has `effectiveMonth` (`YYYY-MM`) and `value`. A value applies to the whole month and continues until the next explicit override. Adding a historical value does not erase later overrides. Forms preview advisory impacts such as historical changes, later overrides, large changes, reserve releases, ownership changes, and reserved/used transitions. Advisory warnings can be saved anyway; invalid negative values or missing months are blocked.

## Import, export, and recovery

Export downloads the complete dataset: schema and metadata, capacity, reserve timelines, projects and reservations, APIs and lifecycle/environment/owner/allocation timelines (the legacy allocation records remain in the unchanged schema for backward-compatible imports and exports), consumers, and archive metadata. Import validates structure, unique IDs, references, months, and timeline shape, then presents a count summary and explicit replacement confirmation. Immediately before replacement, the prior raw dataset is copied to `mulesoft-cost-estimator-data-import-backup`. Invalid JSON never replaces current data. Reset requires typing `RESET`.

## Version-one limitations

- No dollar-cost calculations
- No backend
- No user accounts
- No API synchronization
- No license expiration
- No renewal reductions
- No negative capacity adjustments
- No multiple simultaneous API versions
- Month-level calculations only
- No daily prorating

Additional limitation: data is browser-profile specific, and permanent deletion intentionally uses native strong-confirmation prompts rather than a recoverable trash area.
