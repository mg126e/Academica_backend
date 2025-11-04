---
timestamp: 'Sun Nov 02 2025 18:22:09 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251102_182209.dae5a8b3.md]]'
content_id: 8fc7bc4f194d1a51b67c90c6603057a4b936b828caacffd5e9826bb171d0c7b4
---

# response:

To configure the `Requesting` concept to exclude `/api/CSVImport/parseCSVFile` and `/api/CSVImport/parseCSVLine` from direct passthrough, you need to modify or create the `passthrough.ts` file within the `src/concepts/Requesting/` directory.

As per the `Requesting` documentation, when specifying routes for exclusion, you should **omit the `REQUESTING_BASE_URL` prefix** (e.g., "/api"). Therefore, the paths to be excluded are `/CSVImport/parseCSVFile` and `/CSVImport/parseCSVLine`.

Here is the content for `src/concepts/Requesting/passthrough.ts`:

```typescript
// src/concepts/Requesting/passthrough.ts

// This file configures which concept actions are directly exposed as API routes
// (passthrough routes) and which should be explicitly excluded.

// For every passthrough route you think makes sense and should be **included**,
// add it to `inclusions` as a key/value pair `"route": "justification"`.
// For example, `"/LikertSurvey/_getSurveyQuestions": "this is a public query"`
export const inclusions: Record<string, string> = {
  // Add any routes that should explicitly be included for direct passthrough here.
  // Example: "/LikertSurvey/_getSurveyQuestions": "Public query for survey questions",
};

// For every passthrough route that should be **excluded** from direct passthrough,
// add the route to the `exclusions` array.
//
// When a route is excluded, it will not directly trigger a concept action.
// Instead, it will fire a `Requesting.request` action. Since no synchronizations
// are provided for these specific excluded routes, any requests made to them
// will result in a timeout, as intended by the requirement.
//
// Note: The path should NOT include the `REQUESTING_BASE_URL` prefix (e.g., "/api").
export const exclusions: string[] = [
  // Exclude CSVImport parsing routes. These are backend-only maintenance actions
  // that should not be exposed via direct passthrough or trigger any syncs.
  "/CSVImport/parseCSVFile",
  "/CSVImport/parseCSVLine",
];
```

**Explanation:**

1. **File Location:** This `passthrough.ts` file should be located at `src/concepts/Requesting/passthrough.ts`.
2. **`exclusions` Array:** We've added `/CSVImport/parseCSVFile` and `/CSVImport/parseCSVLine` to the `exclusions` array.
3. **Effect of Exclusion:**
   * By adding these routes to `exclusions`, the `Requesting` concept will no longer consider them "unverified routes" that could potentially become passthrough routes. This addresses point 1 (no "UNVERIFIED ROUTE" warnings).
   * When an HTTP request is made to `/api/CSVImport/parseCSVFile` or `/api/CSVImport/parseCSVLine`, because they are excluded from passthrough, the `Requesting` concept will automatically fire a `Requesting.request` action.
   * Since the prompt explicitly states that "no syncs should be written for them" and these actions are "backend-only maintenance actions", there will be no synchronizations (`.sync.ts` files) that match the `Requesting.request` action for these specific paths.
   * As a result, the `Requesting.request` action for these paths will not be processed by any synchronizations and will eventually timeout, fulfilling point 2 of the requirements.
4. **Other Routes:** The `inclusions` array is left as an example or empty (if no other specific inclusions are needed), ensuring all other routes and included actions remain unchanged, as required by point 3.
