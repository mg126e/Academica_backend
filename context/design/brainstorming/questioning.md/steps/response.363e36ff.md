---
timestamp: 'Mon Nov 03 2025 20:52:38 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_205238.bf582781.md]]'
content_id: 363e36ffe731d706eb77e54b28cb95578620f7b572338a531293ab386c54b9b5
---

# response:

```typescript
// src/syncs/CourseScheduling.sync.ts

import { actions, Frames, Sync } from "@engine";
import { Requesting, CourseScheduling } from "@concepts";

// Common response for unauthorized access
const UNAUTHORIZED_RESPONSE = {
  message: "Unauthorized: user not permitted to modify this schedule.",
  code: 403,
};

/**
 * Helper function to perform common authorization checks for CourseScheduling operations.
 * It extracts the userId from the request session and queries for the schedule's owner,
 * then compares them.
 *
 * ASSUMPTION: The `@concepts` generated `CourseScheduling` concept includes a query
 * `_getSchedule` that takes an input pattern `{ scheduleId: string }` and returns
 * an output pattern `{ schedule: CourseScheduling.Schedule }`. This is a common
 * inference pattern for concepts backed by a database where entities can be
 * retrieved by their ID.
 *
 * @param frames The current set of frames from the `where` clause.
 * @param requestSym The symbol bound to the `Requesting.request` object.
 * @param scheduleIdInputSym The symbol bound to the schedule ID parameter (e.g., `scheduleId` or `sourceScheduleId`).
 * @param userSessionIdSym The symbol to bind the extracted userId from the session.
 * @param scheduleObjectSym The symbol to bind the queried `Schedule` object.
 * @returns An object containing `authorizedFrames` (if successful) and `errorFrames` (if unauthorized).
 */
async function checkAuthorization(
  frames: Frames,
  requestSym: symbol,
  scheduleIdInputSym: symbol,
  userSessionIdSym: symbol,
  scheduleObjectSym: symbol,
): Promise<{ authorizedFrames: Frames; errorFrames: Frames }> {
  const originalFrame = frames[0];
  const incomingRequest = originalFrame[requestSym];
  const userIdFromSession = incomingRequest?.session?.userId;
  const scheduleIdToQuery = originalFrame[scheduleIdInputSym];

  // 1. Check for userId in session (authentication)
  if (!userIdFromSession) {
    console.warn(
      `Authorization failed: userId not found in session for request path ${incomingRequest?.path}`,
    );
    // Return original frame so the 'then' clause can respond with an error.
    return { authorizedFrames: new Frames(), errorFrames: new Frames(originalFrame) };
  }

  // Bind userId to the frame for consistent access within subsequent operations.
  const framesWithUserId = frames.map((f) => ({ ...f, [userSessionIdSym]: userIdFromSession }));

  // 2. Query for the schedule to check ownership.
  let scheduleFrames: Frames;
  try {
    scheduleFrames = await framesWithUserId.query(
      CourseScheduling._getSchedule, // Hypothetical query: scheduleId -> schedule object
      { scheduleId: scheduleIdToQuery },
      { schedule: scheduleObjectSym },
    );
  } catch (e) {
    // Handle cases where _getSchedule might throw (e.g., invalid/non-existent scheduleId)
    console.error(`Error querying schedule ${scheduleIdToQuery} for authorization:`, e);
    return { authorizedFrames: new Frames(), errorFrames: new Frames(originalFrame) };
  }

  // 3. Check if a schedule was found and if the owner matches the session userId.
  const authorized = scheduleFrames.filter(
    ($) => $[scheduleObjectSym]?.owner === $[userSessionIdSym],
  );

  if (authorized.length === 0) {
    console.warn(
      `Authorization failed: Owner mismatch or schedule not found for scheduleId ${scheduleIdToQuery} by userId ${userIdFromSession}`,
    );
    // Return original frame so the 'then' clause can respond with an error.
    return { authorizedFrames: new Frames(), errorFrames: new Frames(originalFrame) };
  }

  // If authorized, return the filtered frames which contain the necessary bindings.
  // If not authorized, `authorized` would be empty, so `new Frames()` is returned here.
  return { authorizedFrames: authorized, errorFrames: new Frames() };
}

// =======================================================
// /api/CourseScheduling/deleteSchedule Synchronizations
// =======================================================

/**
 * Synchronization for handling unauthorized attempts to delete a schedule.
 * If authentication or ownership checks fail, it responds with a 403 error.
 */
export const DeleteScheduleAuthFailed: Sync = (
  { request, scheduleId, userSessionId, schedule },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/CourseScheduling/deleteSchedule", scheduleId },
      { request },
    ],
  ),
  where: async (frames) => {
    // Perform authorization check
    const { errorFrames } = await checkAuthorization(
      frames,
      request,
      scheduleId,
      userSessionId,
      schedule,
    );
    // Return only frames that indicate an authorization failure.
    return errorFrames;
  },
  then: actions(
    // This action fires only if `where` returns `errorFrames`, effectively responding
    // to the unauthorized request and preventing the actual delete operation.
    [Requesting.respond, { request, ...UNAUTHORIZED_RESPONSE }],
  ),
});

/**
 * Synchronization for handling authorized attempts to delete a schedule.
 * If authentication and ownership checks pass, it allows the request to proceed.
 */
export const DeleteScheduleAuthSuccess: Sync = (
  { request, scheduleId, userSessionId, schedule },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/CourseScheduling/deleteSchedule", scheduleId },
      { request },
    ],
  ),
  where: async (frames) => {
    // Perform authorization check
    const { authorizedFrames } = await checkAuthorization(
      frames,
      request,
      scheduleId,
      userSessionId,
      schedule,
    );
    // Return only frames that indicate successful authorization.
    // An empty `then` clause means the request is allowed to continue in the system.
    return authorizedFrames;
  },
  then: actions(
    // Empty `then` clause: The original `Requesting.request` is implicitly
    // allowed to remain in the engine's history. Another sync (not defined
    // in this file) is expected to pick up this authorized request and
    // perform the actual `CourseScheduling.deleteSchedule` operation.
  ),
});

// ===================================================
// /api/CourseScheduling/addSection Synchronizations
// ===================================================

/**
 * Synchronization for handling unauthorized attempts to add a section to a schedule.
 */
export const AddSectionAuthFailed: Sync = (
  { request, scheduleId, sectionId, userSessionId, schedule },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/CourseScheduling/addSection", scheduleId, sectionId },
      { request },
    ],
  ),
  where: async (frames) => {
    const { errorFrames } = await checkAuthorization(
      frames,
      request,
      scheduleId,
      userSessionId,
      schedule,
    );
    return errorFrames;
  },
  then: actions(
    [Requesting.respond, { request, ...UNAUTHORIZED_RESPONSE }],
  ),
});

/**
 * Synchronization for handling authorized attempts to add a section to a schedule.
 */
export const AddSectionAuthSuccess: Sync = (
  { request, scheduleId, sectionId, userSessionId, schedule },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/CourseScheduling/addSection", scheduleId, sectionId },
      { request },
    ],
  ),
  where: async (frames) => {
    const { authorizedFrames } = await checkAuthorization(
      frames,
      request,
      scheduleId,
      userSessionId,
      schedule,
    );
    return authorizedFrames;
  },
  then: actions(),
});

// =====================================================
// /api/CourseScheduling/removeSection Synchronizations
// =====================================================

/**
 * Synchronization for handling unauthorized attempts to remove a section from a schedule.
 */
export const RemoveSectionAuthFailed: Sync = (
  { request, scheduleId, sectionId, userSessionId, schedule },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/CourseScheduling/removeSection", scheduleId, sectionId },
      { request },
    ],
  ),
  where: async (frames) => {
    const { errorFrames } = await checkAuthorization(
      frames,
      request,
      scheduleId,
      userSessionId,
      schedule,
    );
    return errorFrames;
  },
  then: actions(
    [Requesting.respond, { request, ...UNAUTHORIZED_RESPONSE }],
  ),
});

/**
 * Synchronization for handling authorized attempts to remove a section from a schedule.
 */
export const RemoveSectionAuthSuccess: Sync = (
  { request, scheduleId, sectionId, userSessionId, schedule },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/CourseScheduling/removeSection", scheduleId, sectionId },
      { request },
    ],
  ),
  where: async (frames) => {
    const { authorizedFrames } = await checkAuthorization(
      frames,
      request,
      scheduleId,
      userSessionId,
      schedule,
    );
    return authorizedFrames;
  },
  then: actions(),
});

// =========================================================
// /api/CourseScheduling/duplicateSchedule Synchronizations
// =========================================================

/**
 * Synchronization for handling unauthorized attempts to duplicate a schedule.
 * Note: `sourceScheduleId` is used for the authorization check.
 */
export const DuplicateScheduleAuthFailed: Sync = (
  { request, sourceScheduleId, newName, userSessionId, schedule },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/CourseScheduling/duplicateSchedule", sourceScheduleId, newName },
      { request },
    ],
  ),
  where: async (frames) => {
    // For duplication, the authorization check is performed against the `sourceScheduleId`.
    const { errorFrames } = await checkAuthorization(
      frames,
      request,
      sourceScheduleId, // Use sourceScheduleId for the query
      userSessionId,
      schedule,
    );
    return errorFrames;
  },
  then: actions(
    [Requesting.respond, { request, ...UNAUTHORIZED_RESPONSE }],
  ),
});

/**
 * Synchronization for handling authorized attempts to duplicate a schedule.
 */
export const DuplicateScheduleAuthSuccess: Sync = (
  { request, sourceScheduleId, newName, userSessionId, schedule },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/CourseScheduling/duplicateSchedule", sourceScheduleId, newName },
      { request },
    ],
  ),
  where: async (frames) => {
    const { authorizedFrames } = await checkAuthorization(
      frames,
      request,
      sourceScheduleId, // Use sourceScheduleId for the query
      userSessionId,
      schedule,
    );
    return authorizedFrames;
  },
  then: actions(),
});
```
