Using the document “Implementing Synchronizations” as guidance, update the configuration for the Requesting action server so that the following actions are explicitly **excluded** and not handled by any synchronizations:

- `/api/CSVImport/parseCSVFile`
    
- `/api/CSVImport/parseCSVLine`
    

These two routes should **not** trigger any concept actions directly, and **no syncs** should be written for them. They are backend-only maintenance actions that should only ever be executed by the backend at the start of a new semester.

Your output should:

1. Mark both actions as **excluded** so they no longer generate the “UNVERIFIED ROUTE” warnings.
    
2. Ensure that if a request to either route is made, it simply becomes a `Requesting.request` action that times out (since no syncs exist for it).
    
3. Leave all other routes and included actions unchanged.
    

Make sure the exclusion is done in the same format and style as other concept or Requesting configuration files in this system.