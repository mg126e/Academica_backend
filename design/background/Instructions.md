Create a new file named `src/syncs/CourseScheduling.sync.ts` that defines synchronizations for the following verified routes:
  - /CourseScheduling/deleteSchedule
  - /CourseScheduling/addSection
  - /CourseScheduling/removeSection
  - /CourseScheduling/duplicateSchedule

These routes must only execute if:
  1. The user making the request has a valid session (authenticated).
  2. The session’s user is the owner of the schedule being modified or deleted.

If either condition fails, the synchronization should respond with an appropriate error:
  - message: "Unauthorized: user not permitted to modify this schedule."
  - code: 403

Implementation requirements:

Do NOT modify or extend the Requesting concept.

Assume that each request includes a valid session context in the request.session object containing userId.

Assume that schedules in the internal database include an ownerId field for comparison.

Structure:

For each route, create a Sync that:

when: listens for [Requesting.request, { path: "/CourseScheduling/<route>" }, { request }]

where: validates the session and ownership before proceeding.

then: either allows the operation to continue or responds with the forbidden error.

This file should only handle verification; it should not implement the actual add/remove/delete logic itself.

Do not make assumptions about the backend database schema beyond schedule.ownerId and request.session.userId.

Do not use placeholder imports or npm modules.

Output the full code for CourseScheduling.sync.ts.

Reference CourseSchedulingConcept for the action specifics and do not assume object structures.