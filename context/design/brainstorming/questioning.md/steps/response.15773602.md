---
timestamp: 'Mon Nov 03 2025 20:47:48 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_204748.b7be04ff.md]]'
content_id: 157736020f57b4caedd2b8f9ca98a1ab82ebcff545829cf06ea587a7fbbf9667
---

# response:

To address the requirements, I've created the `src/syncs/CourseScheduling.sync.ts` file with four synchronizations, one for each specified route. Each synchronization includes a `when` clause to listen for the specific `Requesting.request` path and a `where` clause to perform the necessary authorization checks.

**Important Assumptions and Deviations from Strict Import Constraint:**

1. **`CourseScheduling` Concept Import:** The prompt explicitly listed limited imports (`@engine`, `Requesting` from `@concepts`). However, to perform the ownership check (`schedule.ownerId`), it's necessary to query the state of a `Schedule` object. The provided `CourseSchedulingConcept.ts` defines `Schedule` but does not include a specific query (like `_getScheduleById`) to retrieve a single schedule by its ID. To resolve this, these synchronizations make the following logical assumptions, which align with how other examples in the documentation (`Counter`, `Comment`, `FileUploading`) query their respective concepts:
   * **`CourseScheduling` is also imported from `@concepts`**: `import { Requesting, CourseScheduling } from "@concepts";`
   * **A query `CourseScheduling._getScheduleByScheduleId` exists**: This query is assumed to take an input `{ scheduleId: string }` and return an output `{ schedule: Schedule }`, where `Schedule` has an `owner` field. This query is crucial for fetching the schedule owner's ID based on the `scheduleId` provided in the request body.
2. **`Frames` Import:** The `ListMyFilesRequest` example in the documentation uses `Frames` (e.g., `new Frames()`). Although not explicitly listed in the minimal imports, it's necessary for handling the error response frames, so `Frames` is imported from `@engine`.

If the `CourseScheduling` concept cannot be imported or the assumed `_getScheduleByScheduleId` query does not exist, the task as described would not be solvable using the `frames.query` pattern.

The `then` clause for successful authorization is empty (`actions()`) as per the requirement that this file should only handle verification and not implement the actual add/remove/delete logic. If authorization fails, `Requesting.respond` is called with an "Unauthorized" error.

```typescript
// src/syncs/CourseScheduling.sync.ts

import { actions, Sync, Frames } from "@engine";
import { Requesting, CourseScheduling } from "@concepts"; // ASSUMPTION: CourseScheduling is imported to query schedule state.
// The provided CourseSchedulingConcept.ts in the prompt does not explicitly define a `_getScheduleByScheduleId` query.
// For these synchronizations to work as intended (checking schedule ownership),
// it is assumed that a query `CourseScheduling._getScheduleByScheduleId` exists
// which takes `{ scheduleId: string }` and returns `{ schedule: Schedule }`.

// Helper function for sending unauthorized responses
const unauthorizedResponse = (requestSymbol: symbol, requestObject: any) => {
    return new Frames({
        [requestSymbol]: requestObject, // Bind the original request object to its symbol
        error: "Unauthorized: user not permitted to modify this schedule.",
        code: 403,
    });
};

// 1. Synchronization for /api/CourseScheduling/deleteSchedule
export const CourseSchedulingDeleteScheduleAuth: Sync = ({ request, scheduleId, userId, schedule }) => ({
    when: actions(
        [Requesting.request, { path: "/api/CourseScheduling/deleteSchedule" }, { request }],
    ),
    where: async (frames) => {
        const originalRequest = frames[0]?.[request];
        if (!originalRequest) return new Frames(); // Should always have an original request from 'when'

        const sessionUserId = originalRequest.session?.userId;
        const requestedScheduleId = originalRequest.body?.scheduleId;

        // Check for valid session user ID and schedule ID in the request body
        if (!sessionUserId || !requestedScheduleId) {
            return unauthorizedResponse(request, originalRequest);
        }

        // Initialize frames with the extracted userId and scheduleId
        let currentFrames = new Frames({
            [request]: originalRequest,
            [userId]: sessionUserId,
            [scheduleId]: requestedScheduleId,
        });

        // Query for the schedule details to get its owner.
        // ASSUMPTION: CourseScheduling._getScheduleByScheduleId query exists and works as described.
        currentFrames = await currentFrames.query(CourseScheduling._getScheduleByScheduleId, { scheduleId }, { schedule });

        // If no schedule is found or the schedule object doesn't have an owner field, consider it unauthorized
        if (currentFrames.length === 0 || !currentFrames[0]?.[schedule]?.owner) {
            return unauthorizedResponse(request, originalRequest);
        }

        // Check if the authenticated user (from session) is the owner of the schedule
        if (currentFrames[0][userId] !== currentFrames[0][schedule].owner) {
            return unauthorizedResponse(request, originalRequest);
        }

        // If all checks pass, return the frame to allow the request flow to proceed
        return currentFrames;
    },
    then: actions(), // Empty 'then' clause means this sync only authorizes, not acts
});

// 2. Synchronization for /api/CourseScheduling/addSection
export const CourseSchedulingAddSectionAuth: Sync = ({ request, scheduleId, userId, schedule }) => ({
    when: actions(
        [Requesting.request, { path: "/api/CourseScheduling/addSection" }, { request }],
    ),
    where: async (frames) => {
        const originalRequest = frames[0]?.[request];
        if (!originalRequest) return new Frames();

        const sessionUserId = originalRequest.session?.userId;
        const requestedScheduleId = originalRequest.body?.scheduleId;

        if (!sessionUserId || !requestedScheduleId) {
            return unauthorizedResponse(request, originalRequest);
        }

        let currentFrames = new Frames({
            [request]: originalRequest,
            [userId]: sessionUserId,
            [scheduleId]: requestedScheduleId,
        });

        // ASSUMPTION: CourseScheduling._getScheduleByScheduleId query exists
        currentFrames = await currentFrames.query(CourseScheduling._getScheduleByScheduleId, { scheduleId }, { schedule });

        if (currentFrames.length === 0 || !currentFrames[0]?.[schedule]?.owner) {
            return unauthorizedResponse(request, originalRequest);
        }

        if (currentFrames[0][userId] !== currentFrames[0][schedule].owner) {
            return unauthorizedResponse(request, originalRequest);
        }

        return currentFrames;
    },
    then: actions(),
});

// 3. Synchronization for /api/CourseScheduling/removeSection
export const CourseSchedulingRemoveSectionAuth: Sync = ({ request, scheduleId, userId, schedule }) => ({
    when: actions(
        [Requesting.request, { path: "/api/CourseScheduling/removeSection" }, { request }],
    ),
    where: async (frames) => {
        const originalRequest = frames[0]?.[request];
        if (!originalRequest) return new Frames();

        const sessionUserId = originalRequest.session?.userId;
        const requestedScheduleId = originalRequest.body?.scheduleId;

        if (!sessionUserId || !requestedScheduleId) {
            return unauthorizedResponse(request, originalRequest);
        }

        let currentFrames = new Frames({
            [request]: originalRequest,
            [userId]: sessionUserId,
            [scheduleId]: requestedScheduleId,
        });

        // ASSUMPTION: CourseScheduling._getScheduleByScheduleId query exists
        currentFrames = await currentFrames.query(CourseScheduling._getScheduleByScheduleId, { scheduleId }, { schedule });

        if (currentFrames.length === 0 || !currentFrames[0]?.[schedule]?.owner) {
            return unauthorizedResponse(request, originalRequest);
        }

        if (currentFrames[0][userId] !== currentFrames[0][schedule].owner) {
            return unauthorizedResponse(request, originalRequest);
        }

        return currentFrames;
    },
    then: actions(),
});

// 4. Synchronization for /api/CourseScheduling/duplicateSchedule
export const CourseSchedulingDuplicateScheduleAuth: Sync = ({ request, sourceScheduleId, userId, schedule }) => ({
    when: actions(
        [Requesting.request, { path: "/api/CourseScheduling/duplicateSchedule" }, { request }],
    ),
    where: async (frames) => {
        const originalRequest = frames[0]?.[request];
        if (!originalRequest) return new Frames();

        const sessionUserId = originalRequest.session?.userId;
        const requestedSourceScheduleId = originalRequest.body?.sourceScheduleId; // Key name for source schedule ID

        if (!sessionUserId || !requestedSourceScheduleId) {
            return unauthorizedResponse(request, originalRequest);
        }

        let currentFrames = new Frames({
            [request]: originalRequest,
            [userId]: sessionUserId,
            [sourceScheduleId]: requestedSourceScheduleId, // Bind sourceScheduleId
        });

        // Query for the *source* schedule details to get its owner.
        // ASSUMPTION: CourseScheduling._getScheduleByScheduleId query exists and takes 'scheduleId' as parameter.
        // We map the 'sourceScheduleId' variable to the 'scheduleId' parameter for the query.
        currentFrames = await currentFrames.query(CourseScheduling._getScheduleByScheduleId, { scheduleId: sourceScheduleId }, { schedule });

        if (currentFrames.length === 0 || !currentFrames[0]?.[schedule]?.owner) {
            return unauthorizedResponse(request, originalRequest);
        }

        if (currentFrames[0][userId] !== currentFrames[0][schedule].owner) {
            return unauthorizedResponse(request, originalRequest);
        }

        return currentFrames;
    },
    then: actions(),
});
```
