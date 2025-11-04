import { actions, Sync } from "@engine";
import { Requesting } from "@concepts";

/**
 * Synchronization to block all Session routes.
 * These routes should never be triggered by clients/public requests.
 * Session management should be handled internally through UserAuth or other concepts.
 */
export const Session_DisabledRoutes: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Session/startSession" }, { request }],
    [Requesting.request, { path: "/Session/endSession" }, { request }],
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
