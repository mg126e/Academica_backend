# Render Deployment Fix

## Problem
The frontend was getting "Unexpected end of JSON input" errors when calling `/api/UserAuth/authenticate`. This happened because:

1. Database queries could fail or hang without proper error handling
2. When database operations failed, the sync chain broke and `Requesting.respond()` was never called
3. The request would timeout, leaving an empty response

## Fixes Applied

### 1. Added Error Handling to UserAuth Methods
- Wrapped `authenticate()` and `register()` database operations in try/catch
- Ensures errors are always returned as `{ error: string }` instead of throwing
- This allows the sync chain to complete and send a response

### 2. Added Database Connection Health Check
- Added `db.admin().ping()` check at startup in `main.ts`
- Fails fast if database is unreachable
- Provides clear error messages

## Required Render Configuration

### Environment Variables (Set in Render Dashboard)
- **`MONGODB_URL`**: Your MongoDB connection string (must be accessible from Render, not localhost)
- **`DB_NAME`**: Your database name
- **`PORT`**: (Optional, defaults to 8000)
- **`REQUESTING_BASE_URL`**: (Optional, defaults to `/api`)

### Pre-Deploy Command (CRITICAL)
If not using Docker, set this in Render dashboard:
```
deno run -A src/utils/generate_imports.ts
```

This generates the `@concepts` import files that `main.ts` requires.

### Build Command
```
deno install && deno cache src/main.ts
```

### Start Command
```
deno task start
```

## Verification

After deployment, check Render logs for:
1. "✓ Database connection verified" - confirms DB is accessible ✅
2. "✓ Database indexes created successfully" - confirms DB setup is complete ✅
3. Any "[UserAuth.authenticate] Database error" messages - indicates DB issues
4. Server should start without errors

### Note on bson Warning
If you see a deprecation warning about `bson@6.9.0`, this is harmless. The actual runtime uses `mongodb@6.20.0` which depends on `bson@6.10.4` (the correct version). The warning comes from an old cached dependency entry in the lock file but doesn't affect functionality.

## Testing the Endpoint

### Find Your Render App URL
1. Go to your Render Dashboard: https://dashboard.render.com
2. Click on your web service
3. Look for the "Service Details" section
4. Your URL will be something like: `https://academica-backend-xxxx.onrender.com`

### Test in Terminal/PowerShell

**On Windows (PowerShell):**
```powershell
curl.exe -X POST  -H "Content-Type: application/json" -d '{\"username\":\"test\",\"password\":\"test\"}'
```

Or use Invoke-WebRequest (more PowerShell-friendly):
```powershell
Invoke-WebRequest -Uri "https://YOUR-APP-URL.onrender.com/api/UserAuth/authenticate" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"username":"test","password":"test"}'
```

**On Mac/Linux (bash):**
```bash
curl -X POST https://YOUR-APP-URL.onrender.com/api/UserAuth/authenticate \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```

**Note:** Replace `YOUR-APP-URL.onrender.com` with your actual Render service URL.

### Expected Responses

**Success (user exists and password matches):**
```json
{"session":"some-session-id-here"}
```

**Failure (user doesn't exist or wrong password):**
```json
{"error":"Invalid username or password."}
```

**Database Error (if DB is unreachable):**
```json
{"error":"Authentication service unavailable. Please try again later."}
```

**Important:** You should NEVER get an empty response or "Unexpected end of JSON input" error anymore.

### Alternative Testing Methods

1. **Browser DevTools Console:**
   ```javascript
   fetch('https://YOUR-APP-URL.onrender.com/api/UserAuth/authenticate', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ username: 'test', password: 'test' })
   })
   .then(r => r.json())
   .then(console.log)
   .catch(console.error);
   ```

2. **Postman/Insomnia:** Create a POST request to the endpoint with JSON body

3. **Check Render Logs:** After making a request, check your Render service logs to see the request processing

