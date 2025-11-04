---
timestamp: 'Sun Nov 02 2025 18:25:49 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251102_182549.a793aab2.md]]'
content_id: 92ae8f9b826e4d55fb92fe96c998b757c9e3176a491bca8884ae1f71cd2b1107
---

# response:

To implement the exclusion synchronizations for `/api/CSVImport/parseCSVFile` and `/api/CSVImport/parseCSVLine`, we need to perform two main steps:

1. **Exclude the full API routes in `passthrough.ts`**: This prevents them from being automatically handled as passthrough routes or generating "UNVERIFIED ROUTE" warnings. This file is typically located at the root of your `src/` directory.
2. **Create a new sync file `src/syncs/CSVImport.sync.ts`**: This file will define synchronizations that explicitly catch `Requesting.request` actions for these paths and respond with an error, indicating that these routes are restricted. This aligns with the requirement that they are backend-only maintenance actions and should not be accessible externally.

## Step 1: Modify `passthrough.ts`

Assuming `passthrough.ts` is located in `src/` (or a similar location that is *not* inside `src/concepts/Requesting/` as per the prompt's instruction), you would add the full API paths to the `exclusions` array.

**File: `src/passthrough.ts` (Example Modification)**

```typescript
// This file configures which routes are directly exposed by the Requesting concept.

// A map of routes that are explicitly included as passthrough, with a justification.
export const inclusions = {
    // ... existing inclusions
    // "/api/LikertSurvey/_getSurveyQuestions": "this is a public query",
};

// An array of routes that are explicitly excluded from passthrough.
export const exclusions = [
    // ... existing exclusions
    // "/api/LikertSurvey/createSurvey",
    // Add the CSV import routes to the exclusion list
    "/api/CSVImport/parseCSVFile",
    "/api/CSVImport/parseCSVLine",
];

// Any route not in inclusions or exclusions, and not matching a concept-action pattern,
// will trigger a Requesting.request action and log an "UNVERIFIED ROUTE" warning.
// If it matches a concept-action pattern but is not in inclusions, it will be excluded
// and also trigger a Requesting.request.
```

## Step 2: Create `src/syncs/CSVImport.sync.ts`

This new file will contain synchronizations that catch requests targeting these specific paths and respond with a 403 Forbidden error. This fulfills the requirement of handling the `Requesting.request` actions for these routes by explicitly rejecting them, which is a form of "exclusion" as requested.

**File: `src/syncs/CSVImport.sync.ts`**

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting } from "@concepts";

/**
 * Synchronization to catch requests to `/CSVImport/parseCSVFile`
 * and respond with a 403 Forbidden error.
 *
 * This marks the route as explicitly excluded for external use,
 * preventing any actual CSV parsing operations from being triggered.
 */
export const ExcludeCSVParseFileRequest: Sync = ({ request, error }) => ({
    when: actions(
        // The path in the 'when' clause does NOT include the '/api' prefix,
        // as specified in the "Requesting Routes" documentation.
        [Requesting.request, { path: "/CSVImport/parseCSVFile" }, { request }],
    ),
    where: async (frames) => {
        // For each matching frame (typically one per request), augment it
        // with an 'error' binding containing the forbidden message.
        return frames.map(f => ({
            ...f,
            [error]: {
                message: "Access to this CSV file parsing route is restricted and will not be processed.",
                code: 403 // HTTP 403 Forbidden
            }
        }));
    },
    then: actions(
        // Respond to the original request with the formulated error,
        // providing immediate feedback to the client.
        [Requesting.respond, { request, error }],
    ),
});

/**
 * Synchronization to catch requests to `/CSVImport/parseCSVLine`
 * and respond with a 403 Forbidden error.
 *
 * Similar to the file parsing, this ensures line parsing is also restricted.
 */
export const ExcludeCSVParseLineRequest: Sync = ({ request, error }) => ({
    when: actions(
        // The path in the 'when' clause does NOT include the '/api' prefix.
        [Requesting.request, { path: "/CSVImport/parseCSVLine" }, { request }],
    ),
    where: async (frames) => {
        // Augment the frame with an 'error' binding for the forbidden response.
        return frames.map(f => ({
            ...f,
            [error]: {
                message: "Access to this CSV line parsing route is restricted and will not be processed.",
                code: 403 // HTTP 403 Forbidden
            }
        }));
    },
    then: actions(
        // Respond to the original request with the error.
        [Requesting.respond, { request, error }],
    ),
});
```
