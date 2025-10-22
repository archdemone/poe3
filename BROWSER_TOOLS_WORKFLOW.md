# Browser Tools - Standardized Workflow

## When User Asks to Check Logs

**ALWAYS follow this sequence:**

### Step 1: Check if server is already running
```powershell
netstat -ano | findstr "3025 3026 3027"
```

### Step 2: If ANY processes found, kill them ALL
```powershell
# Get all process IDs on ports 3025-3027
# Kill them forcefully
Stop-Process -Id <PID1>, <PID2>, ... -Force
```

### Step 3: Wait for ports to be released
```powershell
Start-Sleep -Seconds 2
```

### Step 4: Start fresh on port 3025
```powershell
cd browser-tools-mcp-extension/browser-tools-server
npm start
# Run in BACKGROUND with is_background: true
```

### Step 5: Wait for server to initialize
```powershell
Start-Sleep -Seconds 3
```

### Step 6: Test connection
```javascript
mcp_browser-tools_getConsoleLogs()
```

If returns empty `[]`:
- Wait 2 more seconds
- Try again
- If still empty, tell user to reload game page

## Checklist (For AI Assistant)

Before calling `mcp_browser-tools_getConsoleLogs()`:

- [ ] Check for existing processes on ports 3025-3027
- [ ] Kill ALL existing processes if found
- [ ] Wait 2 seconds for ports to release
- [ ] Start server fresh (background)
- [ ] Wait 3 seconds for initialization
- [ ] Test connection
- [ ] If empty logs, wait and retry once

**NEVER:**
- ❌ Start server without checking if one exists
- ❌ Assume server is running on correct port
- ❌ Start multiple servers
- ❌ Skip the cleanup step

## Quick Reference Commands

### Check if running:
```powershell
netstat -ano | findstr "3025"
```

### Kill all on browser tools ports:
```powershell
$pids = (netstat -ano | findstr "3025 3026 3027" | Select-String "LISTENING" | ForEach-Object { ($_ -split '\s+')[-1] }) | Select-Object -Unique
if ($pids) { Stop-Process -Id $pids -Force -ErrorAction SilentlyContinue }
```

### Start fresh:
```powershell
cd browser-tools-mcp-extension/browser-tools-server; npm start
```

## Why This Matters

**Problem:** Multiple servers on different ports causes sync issues
**Solution:** Always ensure only ONE server on port 3025

**Evidence:**
- Extension connects to port 3025 by default
- If server is on 3026, logs won't flow
- MCP calls return empty arrays
- User has to manually check console (defeats purpose)

**Prevention:**
- Clean slate every time
- No accumulation of zombie processes
- Predictable, reliable connection
- Logs always work

## Example Workflow in Practice

```
User: "Check the console logs"

AI Response:
1. Run: netstat -ano | findstr "3025 3026 3027"
   → Found process 7936 on port 3025
   
2. Run: Stop-Process -Id 7936 -Force
   → Killed existing server
   
3. Run: Start-Sleep -Seconds 2
   → Waited for port release
   
4. Run: cd browser-tools-mcp-extension/browser-tools-server; npm start (background)
   → Started fresh server on port 3025
   
5. Run: Start-Sleep -Seconds 3
   → Waited for initialization
   
6. Run: mcp_browser-tools_getConsoleLogs()
   → Returns actual logs ✅

User: Sees the logs, issue diagnosed quickly
```

**vs. BAD workflow (what NOT to do):**

```
User: "Check the console logs"

AI Response:
1. Run: mcp_browser-tools_getConsoleLogs()
   → Returns [] (empty)
   → Server is on port 3026, extension on 3025
   
2. "Can you reload the page?"
   → User wastes time
   
3. Still returns []
   → More debugging needed
   
4. Multiple attempts, confusion
   → User frustrated ❌
```

## Commitment

**I WILL:**
- ✅ Always check for existing servers first
- ✅ Kill all servers on ports 3025-3027 before starting
- ✅ Only start ONE server on port 3025
- ✅ Wait appropriate time for initialization
- ✅ Never assume server is running correctly

**I WILL NOT:**
- ❌ Start server without cleanup
- ❌ Let multiple servers accumulate
- ❌ Ask user to manually check if I can use tools
- ❌ Skip verification steps

This ensures browser tools work reliably every single time.
