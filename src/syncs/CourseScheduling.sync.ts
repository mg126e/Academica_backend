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
  distribution,
  updates,
  course,
  section,
  schedules,
  courseCode,
  success,
  message,
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
  console.log("[validateSession] start", { frameCount: frames.length });
  const result = new Frames();

  for (const frame of frames) {
    const reqId = (frame as Record<symbol, unknown>)[reqSymbol] as ID;
    const sess = (frame as Record<symbol, unknown>)[sessionSymbol] as ID;

    console.log("[validateSession] processing frame", {
      request: reqId,
      session: sess,
    });

    if (!sess) {
      console.log("[validateSession] no session, responding with error");
      await Requesting.respond({
        request: reqId,
        error: "Unauthorized: valid session required.",
      });
      console.log("[validateSession] error response sent");
      continue;
    }

    // Validate session
    console.log("[validateSession] before useSession call");
    const sessionCheck = await Session.useSession({ s: sess });
    console.log("[validateSession] after useSession call", {
      error: sessionCheck?.error,
    });
    if (sessionCheck?.error) {
      console.log("[validateSession] session invalid, responding with error");
      await Requesting.respond({
        request: reqId,
        error: "Unauthorized: valid session required.",
      });
      console.log("[validateSession] error response sent");
      continue;
    }

    // Get userID from session
    console.log("[validateSession] before _getSession call");
    const sessionDoc = await Session._getSession({ s: sess });
    console.log("[validateSession] after _getSession call", {
      hasDoc: !!sessionDoc,
      hasUserId: !!sessionDoc?.userID,
    });
    if (!sessionDoc || !sessionDoc.userID) {
      console.log(
        "[validateSession] no session doc or userId, responding with error",
      );
      await Requesting.respond({
        request: reqId,
        error: "Unauthorized: valid session required.",
      });
      console.log("[validateSession] error response sent");
      continue;
    }

    const uid = sessionDoc.userID;
    console.log("[validateSession] validation passed, userId:", uid);

    // Authorization passed - add userId to frame and continue
    const newFrame: Frame = { ...frame, [userIdSymbol]: uid };
    result.push(newFrame);
  }

  console.log("[validateSession] end", { resultCount: result.length });
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
  console.log("[validateScheduleOwnership] start", {
    frameCount: frames.length,
  });
  const result = new Frames();

  for (const frame of frames) {
    const reqId = (frame as Record<symbol, unknown>)[reqSymbol] as ID;
    const schedId =
      (frame as Record<symbol, unknown>)[scheduleIdSymbol] as string;
    const sess = (frame as Record<symbol, unknown>)[sessionSymbol] as ID;

    console.log("[validateScheduleOwnership] processing frame", {
      request: reqId,
      scheduleId: schedId,
      session: sess,
    });

    if (!sess) {
      console.log(
        "[validateScheduleOwnership] no session, responding with error",
      );
      await Requesting.respond({
        request: reqId,
        error: "Unauthorized: user not permitted to modify this schedule.",
      });
      console.log("[validateScheduleOwnership] error response sent");
      continue;
    }

    // Validate session
    console.log("[validateScheduleOwnership] before useSession call");
    const sessionCheck = await Session.useSession({ s: sess });
    console.log("[validateScheduleOwnership] after useSession call", {
      error: sessionCheck?.error,
    });
    if (sessionCheck?.error) {
      console.log(
        "[validateScheduleOwnership] session invalid, responding with error",
      );
      await Requesting.respond({
        request: reqId,
        error: "Unauthorized: user not permitted to modify this schedule.",
      });
      console.log("[validateScheduleOwnership] error response sent");
      continue;
    }

    // Get userID from session
    console.log("[validateScheduleOwnership] before _getSession call");
    const sessionDoc = await Session._getSession({ s: sess });
    console.log("[validateScheduleOwnership] after _getSession call", {
      hasDoc: !!sessionDoc,
      hasUserId: !!sessionDoc?.userID,
    });
    if (!sessionDoc || !sessionDoc.userID) {
      console.log(
        "[validateScheduleOwnership] no session doc or userId, responding with error",
      );
      await Requesting.respond({
        request: reqId,
        error: "Unauthorized: user not permitted to modify this schedule.",
      });
      console.log("[validateScheduleOwnership] error response sent");
      continue;
    }

    const uid = sessionDoc.userID;
    console.log("[validateScheduleOwnership] userId retrieved:", uid);

    // Check schedule ownership - OPTIMIZED: use findOne instead of getAllSchedules
    console.log("[validateScheduleOwnership] before schedule findOne call", {
      scheduleId: schedId,
    });
    const schedule = await (CourseScheduling as any).getSchedule({
      scheduleId: schedId,
    });
    console.log("[validateScheduleOwnership] after schedule findOne call", {
      found: !!schedule,
      owner: schedule?.[0]?.owner,
    });

    if (!schedule || !schedule[0] || schedule[0].owner !== uid) {
      console.log(
        "[validateScheduleOwnership] schedule not found or wrong owner, responding with error",
      );
      await Requesting.respond({
        request: reqId,
        error: "Unauthorized: user not permitted to modify this schedule.",
      });
      console.log("[validateScheduleOwnership] error response sent");
      continue;
    }

    console.log(
      "[validateScheduleOwnership] ownership validated, userId:",
      uid,
    );

    // Authorization passed - add userId to frame and continue
    const newFrame: Frame = { ...frame, [userIdSymbol]: uid };
    result.push(newFrame);
  }

  console.log("[validateScheduleOwnership] end", {
    resultCount: result.length,
  });
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
 * The schedule object contains all fields: id, name, sectionIds, owner
 */
export const DuplicateScheduleResponse: Sync = ({ request, schedule }) => ({
  when: actions(
    [Requesting.request, { path: "/CourseScheduling/duplicateSchedule" }, {
      request,
    }],
    [CourseScheduling.duplicateSchedule, {}, { s: schedule }],
  ),
  then: actions([Requesting.respond, { request, s: schedule }]),
});

/**
 * CreateScheduleRequest: Handles creating a new schedule for a user
 * Requires authentication via session - sets the user as the schedule owner
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
    console.log("[CreateScheduleRequest] where clause start", {
      frameCount: frames.length,
    });
    const result = await validateSession(frames, request, session, userId);
    console.log("[CreateScheduleRequest] where clause end", {
      resultCount: result.length,
    });
    return result;
  },
  then: actions(
    [CourseScheduling.createSchedule, { userId, name }],
  ),
});

/**
 * CreateScheduleResponse: Responds with the created schedule
 * The schedule object contains all fields: id, name, sectionIds, owner
 */
export const CreateScheduleResponse: Sync = ({ request, schedule }) => ({
  when: actions(
    [Requesting.request, { path: "/CourseScheduling/createSchedule" }, {
      request,
    }],
    [CourseScheduling.createSchedule, {}, { s: schedule }],
  ),
  then: actions([Requesting.respond, { request, s: schedule }]),
});

/**
 * CreateSectionRequest: Handles creating a new section for a course (without distribution)
 * Requires authentication via session - allows authenticated users to create sections
 */
export const CreateSectionRequest: Sync = ({
  request,
  courseId,
  sectionNumber,
  instructor,
  capacity,
  timeSlots,
  session,
}) => ({
  when: actions(
    [Requesting.request, {
      path: "/CourseScheduling/createSection",
      courseId,
      sectionNumber,
      capacity,
      timeSlots,
      session,
    }, { request }],
  ),
  where: async (frames) => {
    console.log("[CreateSectionRequest] where clause start", {
      frameCount: frames.length,
    });
    // Filter out frames that have distribution (handled by CreateSectionRequestWithDistribution)
    // Check the Requesting.request action input directly to see if distribution is present
    const filtered = new Frames();
    for (const frame of frames) {
      // Check if distribution exists in the original request by looking at the action record
      // Since we can't easily check here, we'll let both syncs handle it and the one that matches will process
      filtered.push(frame);
    }
    const result = await validateSession(filtered, request, session, userId);
    console.log("[CreateSectionRequest] where clause end", {
      resultCount: result.length,
    });
    return result;
  },
  then: actions([
    CourseScheduling.createSection,
    {
      courseId,
      sectionNumber,
      capacity,
      timeSlots,
      ...(instructor !== undefined && { instructor }),
    },
  ]),
});

/**
 * CreateSectionRequestWithDistribution: Handles creating a new section with distribution
 * Requires authentication via session - allows authenticated users to create sections
 */
export const CreateSectionRequestWithDistribution: Sync = ({
  request,
  courseId,
  sectionNumber,
  instructor,
  capacity,
  timeSlots,
  distribution,
  session,
}) => ({
  when: actions(
    [Requesting.request, {
      path: "/CourseScheduling/createSection",
      courseId,
      sectionNumber,
      capacity,
      timeSlots,
      distribution,
      session,
    }, { request }],
  ),
  where: async (frames) => {
    console.log("[CreateSectionRequestWithDistribution] where clause start", {
      frameCount: frames.length,
    });
    const result = await validateSession(frames, request, session, userId);
    console.log("[CreateSectionRequestWithDistribution] where clause end", {
      resultCount: result.length,
    });
    return result;
  },
  then: actions([
    CourseScheduling.createSection,
    {
      courseId,
      sectionNumber,
      capacity,
      timeSlots,
      distribution,
      ...(instructor !== undefined && { instructor }),
    },
  ]),
});

/**
 * CreateSectionResponse: Responds with the created section
 * The section object contains all fields: id, courseId, sectionNumber, capacity, timeSlots, and optionally instructor and distribution
 */
export const CreateSectionResponse: Sync = ({ request, section }) => ({
  when: actions(
    [Requesting.request, { path: "/CourseScheduling/createSection" }, {
      request,
    }],
    [CourseScheduling.createSection, {}, { s: section }],
  ),
  then: actions([Requesting.respond, { request, s: section }]),
});

/**
 * GetAllSchedulesRequest: Handles getting all schedules for the authenticated user
 * Requires authentication, fetches schedules directly from database filtered by owner
 * Everything is handled in the where clause since getSchedulesByOwner returns an array
 */
export const GetAllSchedulesRequest: Sync = ({ request, session }) => ({
  when: actions(
    [Requesting.request, {
      path: "/CourseScheduling/getAllSchedules",
      session,
    }, { request }],
  ),
  where: async (frames: Frames) => {
    console.log("[GetAllSchedulesRequest] where clause start", {
      frameCount: frames.length,
    });
    const result = new Frames();

    for (const frame of frames) {
      const reqId = (frame as Record<symbol, unknown>)[request] as ID;
      const sess = (frame as Record<symbol, unknown>)[session] as ID;

      console.log("[GetAllSchedulesRequest] processing frame", {
        request: reqId,
        session: sess,
      });

      if (!sess) {
        console.log(
          "[GetAllSchedulesRequest] no session, responding with error",
        );
        await Requesting.respond({
          request: reqId,
          error: "Unauthorized: valid session required.",
        });
        console.log("[GetAllSchedulesRequest] error response sent");
        continue;
      }

      // Validate session
      console.log("[GetAllSchedulesRequest] before useSession call");
      const sessionCheck = await Session.useSession({ s: sess });
      console.log("[GetAllSchedulesRequest] after useSession call", {
        error: sessionCheck?.error,
      });
      if (sessionCheck?.error) {
        console.log(
          "[GetAllSchedulesRequest] session invalid, responding with error",
        );
        await Requesting.respond({
          request: reqId,
          error: "Unauthorized: valid session required.",
        });
        console.log("[GetAllSchedulesRequest] error response sent");
        continue;
      }

      // Get userID from session
      console.log("[GetAllSchedulesRequest] before _getSession call");
      const sessionDoc = await Session._getSession({ s: sess });
      console.log("[GetAllSchedulesRequest] after _getSession call", {
        hasDoc: !!sessionDoc,
        hasUserId: !!sessionDoc?.userID,
      });
      if (!sessionDoc || !sessionDoc.userID) {
        console.log(
          "[GetAllSchedulesRequest] no session doc or userId, responding with error",
        );
        await Requesting.respond({
          request: reqId,
          error: "Unauthorized: valid session required.",
        });
        console.log("[GetAllSchedulesRequest] error response sent");
        continue;
      }

      const uid = sessionDoc.userID;
      console.log("[GetAllSchedulesRequest] userId retrieved:", uid);

      // Get schedules for this user directly from the database (optimized query)
      console.log("[GetAllSchedulesRequest] before getSchedulesByOwner call");
      const userSchedules = await (CourseScheduling as any).getSchedulesByOwner(
        {
          userId: uid,
        },
      );
      console.log("[GetAllSchedulesRequest] after getSchedulesByOwner call", {
        userScheduleCount: userSchedules.length,
      });

      // Return the user's schedules
      console.log("[GetAllSchedulesRequest] before respond call");
      await Requesting.respond({
        request: reqId,
        schedules: userSchedules,
      });
      console.log("[GetAllSchedulesRequest] respond sent");
    }

    console.log("[GetAllSchedulesRequest] where clause end", {
      resultCount: result.length,
    });
    return result;
  },
  then: actions(
    // Response already sent in where clause, but then clause required by type system
    // This won't execute since where clause returns empty frames
    [Requesting.respond, { request, schedules: [] }],
  ),
});

/**
 * CreateCourseRequest: Handles creating a new course
 * Requires authentication via session - allows authenticated users to create courses
 */
export const CreateCourseRequest: Sync = (
  { request, id, title, department, session },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/CourseScheduling/createCourse",
      id,
      title,
      department,
      session,
    }, { request }],
  ),
  where: async (frames) => {
    console.log("[CreateCourseRequest] where clause start", {
      frameCount: frames.length,
    });
    const result = await validateSession(frames, request, session, userId);
    console.log("[CreateCourseRequest] where clause end", {
      resultCount: result.length,
    });
    return result;
  },
  then: actions([
    CourseScheduling.createCourse,
    { id, title, department },
  ]),
});

/**
 * CreateCourseResponse: Responds with the created course
 * The course object contains all fields: id, title, department
 */
export const CreateCourseResponse: Sync = ({ request, course }) => ({
  when: actions(
    [Requesting.request, { path: "/CourseScheduling/createCourse" }, {
      request,
    }],
    [CourseScheduling.createCourse, {}, { c: course }],
  ),
  then: actions([Requesting.respond, { request, c: course }]),
});

/**
 * GetScheduleRequest: Handles getting a single schedule by ID
 * Requires authentication and verifies ownership - users can only get their own schedules
 */
export const GetScheduleRequest: Sync = ({ request, scheduleId, session }) => ({
  when: actions(
    [Requesting.request, {
      path: "/CourseScheduling/getSchedule",
      scheduleId,
      session,
    }, { request }],
  ),
  where: async (frames) => {
    console.log("[GetScheduleRequest] where clause start", {
      frameCount: frames.length,
    });
    const result = await validateSession(frames, request, session, userId);

    // Additional ownership validation
    const validatedFrames = new Frames();
    for (const frame of result) {
      const reqId = (frame as Record<symbol, unknown>)[request] as ID;
      const schedId = (frame as Record<symbol, unknown>)[scheduleId] as ID;
      const uid = (frame as Record<symbol, unknown>)[userId] as ID;

      // Get the schedule to verify ownership
      const scheduleResult = await (CourseScheduling as any).getSchedule({
        scheduleId: schedId,
      });

      if (!scheduleResult || !scheduleResult[0]) {
        await Requesting.respond({
          request: reqId,
          error: "Schedule not found",
        });
        continue;
      }

      const schedule = scheduleResult[0];
      if (schedule.owner !== uid) {
        await Requesting.respond({
          request: reqId,
          error: "Unauthorized: you can only access your own schedules",
        });
        continue;
      }

      validatedFrames.push(frame);
    }

    console.log("[GetScheduleRequest] where clause end", {
      resultCount: validatedFrames.length,
    });
    return validatedFrames;
  },
  then: actions([
    CourseScheduling.getSchedule,
    { scheduleId },
  ]),
});

/**
 * GetScheduleResponse: Responds with the requested schedule
 * Note: getSchedule returns Schedule[] | null, so we handle the array response
 */
export const GetScheduleResponse: Sync = ({ request, schedules }) => ({
  when: actions(
    [Requesting.request, { path: "/CourseScheduling/getSchedule" }, {
      request,
    }],
    [CourseScheduling.getSchedule, {}, { schedules }],
  ),
  then: actions([Requesting.respond, { request, schedules }]),
});

/**
 * GetSchedulesByOwnerRequest: Handles getting all schedules for a specific user
 * Requires authentication and verifies that userId matches the authenticated user
 */
export const GetSchedulesByOwnerRequest: Sync = ({
  request,
  userId: requestedUserId,
  session,
}) => ({
  when: actions(
    [Requesting.request, {
      path: "/CourseScheduling/getSchedulesByOwner",
      userId: requestedUserId,
      session,
    }, { request }],
  ),
  where: async (frames) => {
    console.log("[GetSchedulesByOwnerRequest] where clause start", {
      frameCount: frames.length,
    });
    const result = await validateSession(frames, request, session, userId);

    // Validate that requested userId matches authenticated user
    const validatedFrames = new Frames();
    for (const frame of result) {
      const reqId = (frame as Record<symbol, unknown>)[request] as ID;
      const reqUserId =
        (frame as Record<symbol, unknown>)[requestedUserId] as ID;
      const authenticatedUserId =
        (frame as Record<symbol, unknown>)[userId] as ID;

      if (reqUserId !== authenticatedUserId) {
        await Requesting.respond({
          request: reqId,
          error: "Unauthorized: you can only access your own schedules",
        });
        continue;
      }

      validatedFrames.push(frame);
    }

    console.log("[GetSchedulesByOwnerRequest] where clause end", {
      resultCount: validatedFrames.length,
    });
    return validatedFrames;
  },
  then: actions([
    CourseScheduling.getSchedulesByOwner,
    { userId: requestedUserId },
  ]),
});

/**
 * GetSchedulesByOwnerResponse: Responds with the user's schedules
 * Returns the schedules array directly (similar to getAllSchedules)
 */
export const GetSchedulesByOwnerResponse: Sync = ({ request, schedules }) => ({
  when: actions(
    [Requesting.request, { path: "/CourseScheduling/getSchedulesByOwner" }, {
      request,
    }],
    [CourseScheduling.getSchedulesByOwner, {}, { schedules }],
  ),
  then: actions([Requesting.respond, { request, schedules }]),
});

/**
 * AddSectionByCourseCodeRequest: Handles adding a section to a schedule by course code and section number
 * Validates session and ensures user owns the schedule
 * Used for adding AI-suggested courses to schedules
 */
export const AddSectionByCourseCodeRequest: Sync = ({
  request,
  scheduleId,
  courseCode,
  sectionNumber,
  session,
}) => ({
  when: actions(
    [Requesting.request, {
      path: "/CourseScheduling/addSectionByCourseCode",
      scheduleId,
      courseCode,
      sectionNumber,
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
  then: actions([
    (CourseScheduling as any).addSectionByCourseCode,
    { userId, scheduleId, courseCode, sectionNumber },
  ]),
});

/**
 * AddSectionByCourseCodeResponse: Responds after successful section addition
 */
export const AddSectionByCourseCodeResponse: Sync = ({
  request,
  success,
  sectionId,
  message,
}) => ({
  when: actions(
    [Requesting.request, { path: "/CourseScheduling/addSectionByCourseCode" }, {
      request,
    }],
    [(CourseScheduling as any).addSectionByCourseCode, {}, {
      success,
      sectionId,
      message,
    }],
  ),
  then: actions([Requesting.respond, { request, success, sectionId, message }]),
});

/**
 * Synchronization to block admin/system-only CourseScheduling routes.
 * These routes should never be triggered by clients/public requests.
 * Note: createCourse and createSection are now handled by their respective Request/Response syncs
 */
export const CourseScheduling_AdminRoutes: Sync = ({ request }) => ({
  when: actions(
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
