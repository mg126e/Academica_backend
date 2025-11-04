import { actions, Frames, Sync } from "@engine";
import {
  CourseScheduling,
  GoogleCalendar,
  Requesting,
  Session,
} from "@concepts";
import { $vars } from "../engine/vars.ts";
import type { Frame } from "../engine/types.ts";
import type { ID } from "../utils/types.ts";

const {
  request,
  session,
  userId,
  scheduleId,
  accessToken,
  calendarName,
  semesterStart,
  semesterEnd,
  timeZone,
  state,
  code,
  authUrl,
  calendarId,
  eventCount,
} = $vars;

/**
 * Helper function to validate session only (for OAuth routes)
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
 * (for exportScheduleToCalendar)
 */
async function validateScheduleOwnershipForExport(
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
        error: "Unauthorized: user not permitted to export this schedule.",
      });
      continue;
    }

    // Validate session
    const sessionCheck = await Session.useSession({ s: sess });
    if (sessionCheck?.error) {
      await Requesting.respond({
        request: reqId,
        error: "Unauthorized: user not permitted to export this schedule.",
      });
      continue;
    }

    // Get userID from session
    const sessionDoc = await Session._getSession({ s: sess });
    if (!sessionDoc || !sessionDoc.userID) {
      await Requesting.respond({
        request: reqId,
        error: "Unauthorized: user not permitted to export this schedule.",
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
        error: "Unauthorized: user not permitted to export this schedule.",
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
 * GetAuthorizationUrlRequest: Handles getting Google OAuth authorization URL
 * Validates session to track which user is initiating OAuth
 */
export const GetAuthorizationUrlRequest: Sync = (
  { request, state, session },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/GoogleCalendar/getAuthorizationUrl",
      state,
      session,
    }, { request }],
  ),
  where: async (frames) => {
    return await validateSession(frames, request, session, userId);
  },
  then: actions(
    [GoogleCalendar.getAuthorizationUrl, { state }],
  ),
});

/**
 * GetAuthorizationUrlResponse: Responds with the authorization URL
 */
export const GetAuthorizationUrlResponse: Sync = ({ request, authUrl }) => ({
  when: actions(
    [Requesting.request, { path: "/GoogleCalendar/getAuthorizationUrl" }, {
      request,
    }],
    [GoogleCalendar.getAuthorizationUrl, {}, { authUrl }],
  ),
  then: actions([Requesting.respond, { request, authUrl }]),
});

/**
 * ExchangeCodeForTokenRequest: Handles exchanging OAuth code for access token
 * Validates session to associate token with user
 */
export const ExchangeCodeForTokenRequest: Sync = (
  { request, code, session },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/GoogleCalendar/exchangeCodeForToken",
      code,
      session,
    }, { request }],
  ),
  where: async (frames) => {
    return await validateSession(frames, request, session, userId);
  },
  then: actions(
    [GoogleCalendar.exchangeCodeForToken, { code }],
  ),
});

/**
 * ExchangeCodeForTokenResponse: Responds with the token response
 */
export const ExchangeCodeForTokenResponse: Sync = ({
  request,
  access_token,
  expires_in,
  refresh_token,
  scope,
  token_type,
}) => ({
  when: actions(
    [Requesting.request, { path: "/GoogleCalendar/exchangeCodeForToken" }, {
      request,
    }],
    [GoogleCalendar.exchangeCodeForToken, {}, {
      access_token,
      expires_in,
      refresh_token,
      scope,
      token_type,
    }],
  ),
  then: actions([Requesting.respond, {
    request,
    access_token,
    expires_in,
    refresh_token,
    scope,
    token_type,
  }]),
});

/**
 * ExportScheduleToCalendarRequest: Handles exporting schedule to Google Calendar
 * CRITICAL: Validates session and ensures user owns the schedule
 */
export const ExportScheduleToCalendarRequest: Sync = ({
  request,
  accessToken,
  scheduleId,
  calendarName,
  semesterStart,
  semesterEnd,
  timeZone,
  session,
}) => ({
  when: actions(
    [Requesting.request, {
      path: "/GoogleCalendar/exportScheduleToCalendar",
      accessToken,
      scheduleId,
      calendarName,
      semesterStart,
      semesterEnd,
      timeZone,
      session,
    }, { request }],
  ),
  where: async (frames) => {
    return await validateScheduleOwnershipForExport(
      frames,
      request,
      scheduleId,
      session,
      userId,
    );
  },
  then: actions(
    [GoogleCalendar.exportScheduleToCalendar, {
      accessToken,
      scheduleId,
      calendarName,
      semesterStart,
      semesterEnd,
      timeZone,
    }],
  ),
});

/**
 * ExportScheduleToCalendarResponse: Responds with the export result
 */
export const ExportScheduleToCalendarResponse: Sync = ({
  request,
  calendarId,
  eventCount,
}) => ({
  when: actions(
    [Requesting.request, { path: "/GoogleCalendar/exportScheduleToCalendar" }, {
      request,
    }],
    [GoogleCalendar.exportScheduleToCalendar, {}, { calendarId, eventCount }],
  ),
  then: actions([Requesting.respond, { request, calendarId, eventCount }]),
});

/**
 * CreateCalendarRequest: Handles creating a Google Calendar
 * Validates session (though this is typically called internally)
 */
export const CreateCalendarRequest: Sync = ({
  request,
  accessToken,
  calendarName,
  session,
}) => ({
  when: actions(
    [Requesting.request, {
      path: "/GoogleCalendar/createCalendar",
      accessToken,
      calendarName,
      session,
    }, { request }],
  ),
  where: async (frames) => {
    return await validateSession(frames, request, session, userId);
  },
  then: actions(
    [GoogleCalendar.createCalendar, { accessToken, calendarName }],
  ),
});

/**
 * CreateCalendarResponse: Responds with the created calendar ID
 * Note: createCalendar should return { calendarId: string } according to spec
 */
export const CreateCalendarResponse: Sync = ({ request, calendarId }) => ({
  when: actions(
    [Requesting.request, { path: "/GoogleCalendar/createCalendar" }, {
      request,
    }],
    [GoogleCalendar.createCalendar, {}, { calendarId }],
  ),
  then: actions([Requesting.respond, { request, calendarId }]),
});
