/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  // Feel free to delete these example inclusions
  "/api/LikertSurvey/_getSurveyQuestions": "this is a public query",
  "/api/LikertSurvey/_getSurveyResponses": "responses are public",
  "/api/LikertSurvey/_getRespondentAnswers": "answers are visible",
  "/api/LikertSurvey/submitResponse": "allow anyone to submit response",
  "/api/LikertSurvey/updateResponse": "allow anyone to update their response",
  "/api/CourseFiltering/getActiveTags":
    "allow anyone to get active tags becuase these are the user chosen tags",
  "/api/CourseFiltering/getAllTaggedCourses":
    "allow anyone to get all tagged courses as all courses are tagged and publicly availbale",
  "/api/CourseFiltering/getFilteredCourses":
    "allow anyone to get filtered courses as the user chooses the filters",
  "/api/CourseFiltering/getTagsByCategory":
    "allow anyone to get tags grouped by category as tags are public data",
  "/api/CourseFiltering/searchCourses":
    "allow anyone to search courses as course data is public",
  "/api/ProfessorRatings/getRatingForSection":
    "allow anyone to get public ratings data from Rate My Professor",
  "/api/CourseScheduling/getCourse": "public course data, read-only query",
  "/api/CourseScheduling/getSection": "public section data, read-only query",
  "/api/CourseScheduling/getAllCourses":
    "public course listing, read-only query",
  "/api/CourseScheduling/getAllSections":
    "public section listing, read-only query",
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  // Feel free to delete these example exclusions
  "/api/LikertSurvey/createSurvey",
  "/api/LikertSurvey/addQuestion",
  // CSVImport
  "/api/CSVImport/parseCSVFile",
  "/api/CSVImport/parseCSVLine",
  "/api/CSVImport/parseMeetingTime",
  "/api/CSVImport/parseDays",
  "/api/CSVImport/convertTo24Hour",
  "/api/CSVImport/importSectionsFromCSV",
  "/api/CSVImport/getAllSections",
  "/api/CSVImport/getSectionsByCourse",
  "/api/CSVImport/searchSections",
  "/api/CSVImport/getSectionsBySemester",
  "/api/CSVImport/clearAllSections",
  "/api/CSVImport/clearSectionsBySemester",
  "/api/CSVImport/updateSectionsWithSemester",
  // CourseFiltering
  "/api/CourseFiltering/getGeminiLLM",
  "/api/CourseFiltering/autoTagCourses",
  "/api/CourseFiltering/generateSuggestions",
  "/api/CourseFiltering/suggestAlternatives",
  // CourseScheduling - admin/system actions
  "/api/CourseScheduling/createCourse",
  "/api/CourseScheduling/createSection",
  "/api/CourseScheduling/editSection",
  // CourseScheduling - requires authentication
  "/api/CourseScheduling/getAllSchedules", // Handled by GetAllSchedulesRequest/Response syncs (filtered to user's schedules)
  "/api/CourseScheduling/createSchedule",
  "/api/CourseScheduling/deleteSchedule",
  "/api/CourseScheduling/addSection",
  "/api/CourseScheduling/removeSection",
  "/api/CourseScheduling/duplicateSchedule",
  // GoogleCalendar
  "/api/GoogleCalendar/getAuthorizationUrl",
  "/api/GoogleCalendar/exchangeCodeForToken",
  "/api/GoogleCalendar/exportScheduleToCalendar",
  "/api/GoogleCalendar/createCalendar",
  "/api/GoogleCalendar/convertSectionToEvents",
  "/api/GoogleCalendar/createEventFromTimeSlot",
  "/api/GoogleCalendar/createEventFromMeetingTime",
  "/api/GoogleCalendar/convertTo24Hour",
  "/api/GoogleCalendar/findFirstOccurrence",
  "/api/GoogleCalendar/getColorForDepartment",
  "/api/GoogleCalendar/createCalendarEvent",
  // ProfessorRatings
  "/api/ProfessorRatings/clearCache",
  "/api/ProfessorRatings/getAllCachedRatings",
  "/api/ProfessorRatings/refreshRating",
  "/api/ProfessorRatings/getOrFetchRating",
  "/api/ProfessorRatings/getCachedRating",
  "/api/ProfessorRatings/isCacheValid",
  "/api/ProfessorRatings/fetchRatingFromRMP",
  "/api/ProfessorRatings/searchProfessorOnRMP",
  "/api/ProfessorRatings/parseInstructorName",
  "/api/ProfessorRatings/updateCache",
  // Session - internal only actions
  "/api/Session/startSession",
  "/api/Session/endSession", // Handled by EndSessionRequest/EndSessionResponse syncs
  "/api/Session/useSession",
  "/api/Session/extendSession",
  "/api/Session/_expireSessions",
  "/api/Session/_getUserSessions",
  "/api/Session/_getSession",
  // UserAuth - handled by syncs (authenticate and register) or internal-only
  "/api/UserAuth/register", // Handled by RegisterRequest/RegisterResponse syncs
  "/api/UserAuth/authenticate", // Handled by AuthenticateRequest/AuthenticateResponse syncs
  "/api/UserAuth/_getUserByUsername", // Internal-only
  "/api/UserAuth/_getUserById", // Internal-only
];
