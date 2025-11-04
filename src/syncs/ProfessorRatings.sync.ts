import { actions, Frames, Sync } from "@engine";
import { ProfessorRatings, Requesting, Session } from "@concepts";
import { $vars } from "../engine/vars.ts";
import type { Frame } from "../engine/types.ts";
import type { ID } from "../utils/types.ts";

const {
  request,
  session,
  userId,
  instructorName,
  success,
  deletedCount,
  data,
  message,
  ratings,
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
 * ClearCacheRequest: Handles clearing all cached ratings
 * ADMIN OPERATION: Requires authentication to prevent accidental deletion
 */
export const ClearCacheRequest: Sync = ({ request, session }) => ({
  when: actions(
    [Requesting.request, {
      path: "/ProfessorRatings/clearCache",
      session,
    }, { request }],
  ),
  where: async (frames) => {
    return await validateSession(frames, request, session, userId);
  },
  then: actions(
    [ProfessorRatings.clearCache, {}],
  ),
});

/**
 * ClearCacheResponse: Responds after clearing cache
 */
export const ClearCacheResponse: Sync = (
  { request, success, deletedCount },
) => ({
  when: actions(
    [Requesting.request, { path: "/ProfessorRatings/clearCache" }, {
      request,
    }],
    [ProfessorRatings.clearCache, {}, { success, deletedCount }],
  ),
  then: actions([Requesting.respond, { request, success, deletedCount }]),
});

/**
 * GetAllCachedRatingsRequest: Handles getting all cached ratings
 * ADMIN/DEBUG: Requires authentication to prevent exposing internal cache data
 * Note: Since getAllCachedRatings returns an array directly, we handle response inline
 */
export const GetAllCachedRatingsRequest: Sync = ({ request, session }) => ({
  when: actions(
    [Requesting.request, {
      path: "/ProfessorRatings/getAllCachedRatings",
      session,
    }, { request }],
  ),
  where: async (frames) => {
    return await validateSession(frames, request, session, userId);
  },
  then: actions(
    [ProfessorRatings.getAllCachedRatings, {}],
  ),
});

/**
 * RefreshRatingRequest: Handles manually refreshing a professor's rating
 * Requires authentication to prevent API abuse and rate limiting issues
 */
export const RefreshRatingRequest: Sync = ({
  request,
  instructorName,
  session,
}) => ({
  when: actions(
    [Requesting.request, {
      path: "/ProfessorRatings/refreshRating",
      instructorName,
      session,
    }, { request }],
  ),
  where: async (frames) => {
    return await validateSession(frames, request, session, userId);
  },
  then: actions(
    [ProfessorRatings.refreshRating, { instructorName }],
  ),
});

/**
 * RefreshRatingResponse: Responds with refreshed rating data
 */
export const RefreshRatingResponse: Sync = ({
  request,
  success,
  data,
  message,
}) => ({
  when: actions(
    [Requesting.request, { path: "/ProfessorRatings/refreshRating" }, {
      request,
    }],
    [ProfessorRatings.refreshRating, {}, { success, data, message }],
  ),
  then: actions([Requesting.respond, { request, success, data, message }]),
});
