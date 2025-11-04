import { actions, Sync } from "@engine";
import { Requesting, Session, UserAuth } from "@concepts";
import { $vars } from "../engine/vars.ts";

const { request, username, password, user, session, error } = $vars;

/**
 * AuthenticateRequest: Handles user authentication
 * This sync:
 * 1. Takes username/password from the request (safely, without logging)
 * 2. Calls UserAuth.authenticate internally
 * 3. If successful, creates a session via Session.startSession
 * 4. Returns only the session ID (never credentials)
 */
export const AuthenticateRequest: Sync = ({
  request,
  username,
  password,
}) => ({
  when: actions(
    [Requesting.request, {
      path: "/UserAuth/authenticate",
      username,
      password,
    }, { request }],
  ),
  then: actions(
    [UserAuth.authenticate, { username, password }],
  ),
});

/**
 * AuthenticateResponseSuccess: Handles successful authentication
 * Triggers session creation - session will be returned by AuthenticateSessionResponse
 */
export const AuthenticateResponseSuccess: Sync = ({
  request,
  user,
}) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuth/authenticate" }, { request }],
    [UserAuth.authenticate, {}, { user }],
  ),
  then: actions(
    [Session.startSession, { u: user }],
  ),
});

/**
 * AuthenticateSessionResponse: Responds with session ID after session creation
 * Never returns credentials or sensitive data
 */
export const AuthenticateSessionResponse: Sync = ({
  request,
  session,
}) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuth/authenticate" }, { request }],
    [Session.startSession, {}, { session }],
  ),
  then: actions(
    [Requesting.respond, { request, session }],
  ),
});

/**
 * AuthenticateResponseError: Handles authentication failure
 * Returns a generic error message (never reveals specific failure reasons)
 */
export const AuthenticateResponseError: Sync = ({
  request,
  error,
}) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuth/authenticate" }, { request }],
    [UserAuth.authenticate, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error: "Invalid username or password." },
  ]),
});

/**
 * RegisterRequest: Handles user registration
 * This sync safely handles registration without logging credentials.
 */
export const RegisterRequest: Sync = ({
  request,
  username,
  password,
}) => ({
  when: actions(
    [Requesting.request, {
      path: "/UserAuth/register",
      username,
      password,
    }, { request }],
  ),
  then: actions(
    [UserAuth.register, { username, password }],
  ),
});

/**
 * RegisterResponseSuccess: Handles successful registration
 * Triggers session creation - session will be returned by RegisterSessionResponse
 */
export const RegisterResponseSuccess: Sync = ({
  request,
  user,
}) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuth/register" }, { request }],
    [UserAuth.register, {}, { user }],
  ),
  then: actions(
    [Session.startSession, { u: user }],
  ),
});

/**
 * RegisterSessionResponse: Responds with session ID after session creation
 * Never returns credentials or sensitive data
 */
export const RegisterSessionResponse: Sync = ({
  request,
  session,
}) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuth/register" }, { request }],
    [Session.startSession, {}, { session }],
  ),
  then: actions(
    [Requesting.respond, { request, session }],
  ),
});

/**
 * RegisterResponseError: Handles registration failure
 * Returns the error message from registration
 */
export const RegisterResponseError: Sync = ({
  request,
  error,
}) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuth/register" }, { request }],
    [UserAuth.register, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * Synchronization to block internal UserAuth routes.
 * These routes should never be triggered by clients/public requests.
 */
export const UserAuth_InternalRoutes: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuth/_getUserByUsername" }, {
      request,
    }],
    [Requesting.request, { path: "/UserAuth/_getUserById" }, { request }],
  ),
  then: actions(
    [
      Requesting.respond,
      {
        request,
        error: "Route disabled: UserAuth internal routes are not accessible.",
      },
    ],
  ),
});
