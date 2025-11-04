---
timestamp: 'Sun Nov 02 2025 18:41:23 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251102_184123.b6513e18.md]]'
content_id: 3445435e8c2756267ef97de714f0fb5b91804404017f199b61284b5c29832ef6
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
    // Synchronization to exclude /api/CSVImport/parseCSVFile
    when(
      Requesting.request,
      matches({ path: "/CSVImport/parseCSVFile" }), // Matching the conceptual path
      ({ request }) => // Capturing the 'request' variable from the output pattern
        actions([
          Requesting.respond,
          { request, error: "Route disabled: backend-only maintenance route." },
        ]),
    ),

    // Synchronization to exclude /api/CSVImport/parseCSVLine
    when(
      Requesting.request,
      matches({ path: "/CSVImport/parseCSVLine" }), // Matching the conceptual path
      ({ request }) => // Capturing the 'request' variable from the output pattern
        actions([
          Requesting.respond,
          { request, error: "Route disabled: backend-only maintenance route." },
        ]),
    ),
  ]),
];
```
