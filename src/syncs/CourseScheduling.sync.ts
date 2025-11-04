import { actions, Frames, Sync } from "@engine";
import { CourseScheduling, Requesting, Session } from "@concepts";
import { $vars } from "../engine/vars.ts";
import type { Frame } from "../engine/types.ts";
import type { ID } from "../utils/types.ts";

const {
  request,
  session,
  userId,
  scheduleId,
  sectionId,
  sourceScheduleId,
  newName,
  schedule,
  name,
  courseId,
  id,
  title,
  department,
  sectionNumber,
  instructor,
  capacity,
  timeSlots,
  updates,
  course,
  section,
  schedules,
} = $vars;

/**
 * Helper function to validate session only (for authenticated routes)
 */
async function validateSession(
  frames: Frames,
  reqSymbol: symbol,
  sessionSymbol: symbol,
  userIdSymbol: symbol,
): Promise<Frames> {
  const result = new Frames();

  for (const frame of frames) {
    const reqId = (frame as Record<symbol, unknown>)[reqSymbol] as ID;
    const sess = (frame as Record<symbol, unknown>)[sessionSymbol] as ID;

    if (!sess) {
      await Requesting.respond({
        request: reqId,
        error: "Unauthorized: valid session required.",
      });
      continue;
    }

    // Validate session
    const sessionCheck = await Session.useSession({ s: sess });
    if (sessionCheck?.error) {
      await Requesting.respond({
        request: reqId,
        error: "Unauthorized: valid session required.",
      });
      continue;
    }

    // Get userID from session
    const sessionDoc = await Session._getSession({ s: sess });
    if (!sessionDoc || !sessionDoc.userID) {
      await Requesting.respond({
        request: reqId,
        error: "Unauthorized: valid session required.",
      });
      continue;
    }

    const uid = sessionDoc.userID;

    // Authorization passed - add userId to frame and continue
    const newFrame: Frame = { ...frame, [userIdSymbol]: uid };
    result.push(newFrame);
  }

  return result;
}

/**
 * Helper function to validate session and check schedule ownership
 */
async function validateScheduleOwnership(
  frames: Frames,
  reqSymbol: symbol,
  scheduleIdSymbol: symbol,
  sessionSymbol: symbol,
  userIdSymbol: symbol,
): Promise<Frames> {
  const result = new Frames();

  for (const frame of frames) {
    const reqId = (frame as Record<symbol, unknown>)[reqSymbol] as ID;
    const schedId =
      (frame as Record<symbol, unknown>)[scheduleIdSymbol] as string;
    const sess = (frame as Record<symbol, unknown>)[sessionSymbol] as ID;

    if (!sess) {
      await Requesting.respond({
        request: reqId,
        error: "Unauthorized: user not permitted to modify this schedule.",
      });
      continue;
    }

    // Validate session
    const sessionCheck = await Session.useSession({ s: sess });
    if (sessionCheck?.error) {
      await Requesting.respond({
        request: reqId,
        error: "Unauthorized: user not permitted to modify this schedule.",
      });
      continue;
    }

    // Get userID from session
    const sessionDoc = await Session._getSession({ s: sess });
    if (!sessionDoc || !sessionDoc.userID) {
      await Requesting.respond({
        request: reqId,
        error: "Unauthorized: user not permitted to modify this schedule.",
      });
      continue;
    }

    const uid = sessionDoc.userID;

    // Check schedule ownership
    const allSchedules = await CourseScheduling.getAllSchedules({});
    const schedule = allSchedules.find((s: { id: string; owner: string }) =>
      s.id === schedId
    );

    if (!schedule || schedule.owner !== uid) {
      await Requesting.respond({
        request: reqId,
        error: "Unauthorized: user not permitted to modify this schedule.",
      });
      continue;
    }

    // Authorization passed - add userId to frame and continue
    const newFrame: Frame = { ...frame, [userIdSymbol]: uid };
    result.push(newFrame);
  }

  return result;
}

/**
 * DeleteScheduleRequest: Handles deletion of a schedule
 * Validates session and ensures user owns the schedule
 */
export const DeleteScheduleRequest: Sync = (
  { request, scheduleId, session },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/CourseScheduling/deleteSchedule",
      scheduleId,
      session,
    }, { request }],
  ),
  where: async (frames) => {
    return await validateScheduleOwnership(
      frames,
      request,
      scheduleId,
      session,
      userId,
    );
  },
  then: actions(
    [CourseScheduling.deleteSchedule, { userId, scheduleId }],
  ),
});

/**
 * DeleteScheduleResponse: Responds after successful deletion
 */
export const DeleteScheduleResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/CourseScheduling/deleteSchedule" }, {
      request,
    }],
    [CourseScheduling.deleteSchedule, {}, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

/**
 * AddSectionRequest: Handles adding a section to a schedule
 * Validates session and ensures user owns the schedule
 */
export const AddSectionRequest: Sync = (
  { request, scheduleId, sectionId, session },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/CourseScheduling/addSection",
      scheduleId,
      sectionId,
      session,
    }, { request }],
  ),
  where: async (frames) => {
    return await validateScheduleOwnership(
      frames,
      request,
      scheduleId,
      session,
      userId,
    );
  },
  then: actions(
    [CourseScheduling.addSection, { userId, scheduleId, sectionId }],
  ),
});

/**
 * AddSectionResponse: Responds after successful section addition
 */
export const AddSectionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/CourseScheduling/addSection" }, { request }],
    [CourseScheduling.addSection, {}, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

/**
 * RemoveSectionRequest: Handles removing a section from a schedule
 * Validates session and ensures user owns the schedule
 */
export const RemoveSectionRequest: Sync = (
  { request, scheduleId, sectionId, session },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/CourseScheduling/removeSection",
      scheduleId,
      sectionId,
      session,
    }, { request }],
  ),
  where: async (frames) => {
    return await validateScheduleOwnership(
      frames,
      request,
      scheduleId,
      session,
      userId,
    );
  },
  then: actions(
    [CourseScheduling.removeSection, { userId, scheduleId, sectionId }],
  ),
});

/**
 * RemoveSectionResponse: Responds after successful section removal
 */
export const RemoveSectionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/CourseScheduling/removeSection" }, {
      request,
    }],
    [CourseScheduling.removeSection, {}, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

/**
 * DuplicateScheduleRequest: Handles duplicating a schedule
 * Validates session and ensures user owns the source schedule
 */
export const DuplicateScheduleRequest: Sync = (
  { request, sourceScheduleId, newName, session },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/CourseScheduling/duplicateSchedule",
      sourceScheduleId,
      newName,
      session,
    }, { request }],
  ),
  where: async (frames) => {
    return await validateScheduleOwnership(
      frames,
      request,
      sourceScheduleId,
      session,
      userId,
    );
  },
  then: actions(
    [CourseScheduling.duplicateSchedule, { userId, sourceScheduleId, newName }],
  ),
});

/**
 * DuplicateScheduleResponse: Responds with the duplicated schedule
 */
export const DuplicateScheduleResponse: Sync = ({ request, schedule }) => ({
  when: actions(
    [Requesting.request, { path: "/CourseScheduling/duplicateSchedule" }, {
      request,
    }],
    [CourseScheduling.duplicateSchedule, {}, { s: schedule }],
  ),
  then: actions([Requesting.respond, { request, schedule }]),
});

/**
 * CreateScheduleRequest: Handles creating a new schedule for a user
 * Requires authentication - sets the user as the schedule owner
 */
export const CreateScheduleRequest: Sync = ({ request, name, session }) => ({
  when: actions(
    [Requesting.request, {
      path: "/CourseScheduling/createSchedule",
      name,
      session,
    }, { request }],
  ),
  where: async (frames) => {
    return await validateSession(frames, request, session, userId);
  },
  then: actions(
    [CourseScheduling.createSchedule, { userId, name }],
  ),
});

/**
 * CreateScheduleResponse: Responds with the created schedule
 */
export const CreateScheduleResponse: Sync = ({ request, schedule }) => ({
  when: actions(
    [Requesting.request, { path: "/CourseScheduling/createSchedule" }, {
      request,
    }],
    [CourseScheduling.createSchedule, {}, { s: schedule }],
  ),
  then: actions([Requesting.respond, { request, schedule }]),
});

/**
 * GetAllSchedulesRequest: Handles getting all schedules for the authenticated user
 * Requires authentication and filters to only return the user's own schedules
 */
export const GetAllSchedulesRequest: Sync = ({ request, session }) => ({
  when: actions(
    [Requesting.request, {
      path: "/CourseScheduling/getAllSchedules",
      session,
    }, { request }],
  ),
  where: async (frames) => {
    return await validateSession(frames, request, session, userId);
  },
  then: actions(
    [CourseScheduling.getAllSchedules, {}],
  ),
});

/**
 * GetAllSchedulesResponse: Filters schedules to only return the user's schedules
 * Since getAllSchedules returns an array directly, we need to handle it specially.
 * We'll match on the request and the action completion, then filter and respond.
 */
export const GetAllSchedulesResponse: Sync = ({
  request,
  userId,
}) => ({
  when: actions(
    [Requesting.request, { path: "/CourseScheduling/getAllSchedules" }, {
      request,
    }],
    [CourseScheduling.getAllSchedules, {}, {}],
  ),
  then: async (frames: Frames) => {
    const result = new Frames();
    for (const frame of frames) {
      const reqId = (frame as Record<symbol, unknown>)[request] as ID;
      const uid = (frame as Record<symbol, unknown>)[userId] as ID;

      // Get all schedules and filter to only the user's schedules
      const allSchedules = await CourseScheduling.getAllSchedules({});
      const userSchedules = allSchedules.filter(
        (s: { owner: string }) => s.owner === uid,
      );

      // Return only the user's schedules
      await Requesting.respond({
        request: reqId,
        schedules: userSchedules,
      });
    }
    return result;
  },
});

/**
 * Synchronization to block admin/system-only CourseScheduling routes.
 * These routes should never be triggered by clients/public requests.
 */
export const CourseScheduling_AdminRoutes: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/CourseScheduling/createCourse" }, {
      request,
    }],
    [Requesting.request, { path: "/CourseScheduling/createSection" }, {
      request,
    }],
    [Requesting.request, { path: "/CourseScheduling/editSection" }, {
      request,
    }],
  ),
  then: actions(
    [
      Requesting.respond,
      {
        request,
        error: "Route disabled: admin/system-only route.",
      },
    ],
  ),
});
