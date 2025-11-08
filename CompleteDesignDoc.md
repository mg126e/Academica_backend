# Final Design Summary


## 1. Structure
- **Course → Course + Section model**  
  - A2 stored every schedule detail inside a single `Course` record.  
  - Final model separates immutable course metadata (code, title, description) from Section instances (meeting pattern, instructor, capacity).
- **Why it changed**  
  - Mirrored real catalog behavior where a course offers multiple sections.  
  - Reduced duplication when sections share metadata but diverge in logistics.
- **Outcomes**  
  - Simplified CRUD: sections can be created, cloned, or archived without touching course facts.  
  - Prepared the dataset for expansion (e.g., cross-listed sections, professor histories).  
  - Normalized data, enabling lighter payloads and clearer audit logs.

## 2. Syncs
- **From local mock state to authenticated API**  
  - A2 prototype had session ownership implied.  
  - Final build routes mutations through authenticated endpoints (e.g., `/api/CourseScheduling/addSection`, `removeSection`, `duplicateSchedule`, `deleteSchedule`).
- **Session validation**  
  - Middleware now confirms an active session and schedule ownership before writes.  
  - Prevents unauthorized edits when multiple devices/browsers stay logged in.


## 3. Design
- **Static mockups → Interactive components**  
  - Prototype had no color pallette and I had not yet envisioned any animations.  
  - Final build has hover states, loading spinners, and other animations to enhance UX and guide users to features they can interact with.
- **Typography & color system**  
  - Adopted Caladea display headings paired with a neutral sans-serif body; codified a shared theme.  
  - Balenced pastel color pallette with ensuring all sections are still readable with high contrast.
- **Section detail panel**  
  - Clicking a section expands a side panel fetching Rate My Professor details and course speicifc information.
  - Integrates asynchronous error states (retry, fallback copy) absent from A4b mockups.

## 4. Navigation
- **Hierarchical pages → Task-centric dashboard**  
  - A2 split “Courses,” “Schedules,” and “Settings”; final product centralizes actions in a dashboard that keeps current schedule context visible.  
  - Quick actions (add, duplicate, archive) appear inline with each schedule, minimizing navigation hops.
- **Conflict awareness**  
  - Real-time clash warnings surface directly on conflicting sections, whereas earlier versions did not address these navigation issues.  
  - Notifications now summarize results of destructive actions (e.g., section removal, schedule deletion) to reassure users.
- **Schedule experimentation**  
  - Added duplication workflow so students can branch scenarios before registration windows open.  
