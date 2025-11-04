import { actions, Sync } from "@engine";
import { Requesting } from "@concepts";

/**

* Synchronization to block backend-only CSV import routes.
* These routes should never be triggered by clients/public requests.
  */
export const CSVImport_DisabledRoutes: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/CSVImport/parseCSVFile" }, { request }],
    [Requesting.request, { path: "/CSVImport/parseCSVLine" }, { request }],
    [Requesting.request, { path: "/CSVImport/parseMeetingTime" }, { request }],
    [Requesting.request, { path: "/CSVImport/parseDays" }, { request }],
    [Requesting.request, { path: "/CSVImport/convertTo24Hour" }, { request }],
    [Requesting.request, { path: "/CSVImport/importSectionsFromCSV" }, {
      request,
    }],
    [Requesting.request, { path: "/CSVImport/getAllSections" }, { request }],
    [Requesting.request, { path: "/CSVImport/getSectionsByCourse" }, {
      request,
    }],
    [Requesting.request, { path: "/CSVImport/searchSections" }, { request }],
    [Requesting.request, { path: "/CSVImport/getSectionsBySemester" }, {
      request,
    }],
    [Requesting.request, { path: "/CSVImport/clearAllSections" }, { request }],
    [Requesting.request, { path: "/CSVImport/clearSectionsBySemester" }, {
      request,
    }],
    [Requesting.request, { path: "/CSVImport/updateSectionsWithSemester" }, {
      request,
    }],
  ),
  then: actions(
    [
      Requesting.respond,
      { request, error: "Route disabled: backend-only maintenance route." },
    ],
  ),
});
