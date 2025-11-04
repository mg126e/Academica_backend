---
timestamp: 'Sun Nov 02 2025 18:35:31 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251102_183531.ea791761.md]]'
content_id: 608005120c6e0bed4a69c3ba39f4044168c45578537d25e9a9e03c19aac15786
---

# response:

```typescript
/**
 * src/syncs/CSVImport.sync.ts
 *
 * Synchronizations for backend-only CSV import routes.
 * These routes are intentionally disabled for client or public access.
 * They should only ever be used by the backend at the start of a new semester.
 */

import { sync, when, actions, matches } from "syncing";
import { Requesting } from "../concepts/Requesting/mod.ts";

export default [
  sync("CSVImport_DisabledRoutes", [
    when(
      Requesting.request,
      matches({ path: "/CSVImport/parseCSVFile" }),
      ({ request }) =>
        actions([
          Requesting.respond,
          { request, error: "Route disabled: backend-only maintenance route." },
        ]),
    ),

    when(
      Requesting.request,
      matches({ path: "/CSVImport/parseCSVLine" }),
      ({ request }) =>
        actions([
          Requesting.respond,
          { request, error: "Route disabled: backend-only maintenance route." },
        ]),
    ),
  ]),
];
```
