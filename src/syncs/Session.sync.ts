import { actions, Sync } from "@engine";
import { Requesting, Session } from "@concepts";
import { $vars } from "../engine/vars.ts";

const { request, session } = $vars;

/**
 * EndSessionRequest: Handles ending a user session (logout)
 * Validates the session exists before ending it
 */
export const EndSessionRequest: Sync = ({ request, session }) => ({
  when: actions(
    [Requesting.request, {
      path: "/Session/endSession",
      session,
    }, { request }],
  ),
  then: actions(
    [Session.endSession, { s: session }],
  ),
});

/**
 * EndSessionResponse: Responds after ending a session
 */
export const EndSessionResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Session/endSession" }, { request }],
    [Session.endSession, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * EndSessionResponseSuccess: Responds with success after ending a session
 */
export const EndSessionResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Session/endSession" }, { request }],
    [Session.endSession, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request, success: true }],
  ),
});

/**
 * Synchronization to block internal-only Session routes.
 * These routes should never be triggered by clients/public requests.
 */
export const Session_DisabledRoutes: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Session/startSession" }, { request }],
    [Requesting.request, { path: "/Session/useSession" }, { request }],
    [Requesting.request, { path: "/Session/extendSession" }, { request }],
    [Requesting.request, { path: "/Session/_expireSessions" }, { request }],
    [Requesting.request, { path: "/Session/_getUserSessions" }, { request }],
    [Requesting.request, { path: "/Session/_getSession" }, { request }],
  ),
  then: actions(
    [
      Requesting.respond,
      {
        request,
        error: "Route disabled: Session management routes are internal-only.",
      },
    ],
  ),
});
