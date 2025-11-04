import { actions, Frames, Sync } from "@engine";
import { CourseFiltering, Requesting, Session } from "@concepts";
import { $vars } from "../engine/vars.ts";
import type { Frame } from "../engine/types.ts";
import type { ID } from "../utils/types.ts";

const { request, session, userId } = $vars;

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
 * Synchronization to block internal-only CourseFiltering routes.
 * These routes should never be triggered by clients/public requests.
 */
export const CourseFiltering_DisabledRoutes: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/CourseFiltering/getGeminiLLM" }, {
      request,
    }],
    [Requesting.request, { path: "/CourseFiltering/autoTagCourses" }, {
      request,
    }],
    [Requesting.request, { path: "/CourseFiltering/generateSuggestions" }, {
      request,
    }],
  ),
  then: actions(
    [
      Requesting.respond,
      {
        request,
        error: "Route disabled: internal-only maintenance route.",
      },
    ],
  ),
});

/**
 * SuggestAlternativesRequest: Handles AI-powered course recommendations
 * Requires authentication to prevent API abuse and rate limiting
 */
export const SuggestAlternativesRequest: Sync = ({
  request,
  course,
  variant,
  session,
}) => ({
  when: actions(
    [Requesting.request, {
      path: "/CourseFiltering/suggestAlternatives",
      course,
      variant,
      session,
    }, { request }],
  ),
  where: async (frames) => {
    return await validateSession(frames, request, session, userId);
  },
  then: actions(
    [CourseFiltering.suggestAlternatives, { course, variant }],
  ),
});

/**
 * SuggestAlternativesResponse: Responds with AI-generated course suggestions
 * Note: suggestAlternatives returns FilteredCourse[] directly, handled inline
 */
