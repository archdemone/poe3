# Pre-Commit Checklist - MUST DO BEFORE SAYING "DONE"

## Automated Checks (RUN THESE)

### 1. Linter Check
```bash
npm run lint
```
❌ **If this fails, FIX IT before continuing**

### 2. Smoke Test (Catches Critical Bugs)
```bash
npx playwright test tests/e2e/smoke-test.spec.ts
```
✅ This test actually loads the hideout and catches:
- Console errors (like `centerY undefined`)
- Missing meshes
- Invisible meshes
- Particle system failures

❌ **If this fails, the game is BROKEN**

### 3. Full E2E Tests
```bash
npx playwright test
```
✅ Run all tests to catch regressions

---

## Manual Verification (BEFORE BROWSER TOOLS)

If browser tools aren't working, do these FIRST:

### 1. Check Dev Server is Running
```bash
# Look for "Local: http://localhost:5173"
# If not running: npm run dev
```

### 2. Load the Game in Browser
- Open http://localhost:5173
- Open DevTools (F12)
- Check Console tab for errors
- Look for red error messages

### 3. Navigate to Hideout
- Click "New Game"
- Create character
- **LOOK FOR ALERT POPUPS** (I added these for debugging)
- **CHECK CONSOLE FOR ERRORS**

---

## Browser Tools Troubleshooting

### If Browser Tools Don't Work:

1. **Restart Browser Tools Server Cleanly**
```powershell
# Use the cleanup script (kills old processes first)
.\scripts\restart-browser-tools.ps1
```
Look for: "Browser Tools Server Started" on port 3025

**Why this matters**: Sometimes old server processes don't die cleanly, causing port conflicts. The script kills all old processes before starting fresh.

2. **Manual restart (if script doesn't work)**
```powershell
# Kill processes on browser tools ports
netstat -ano | findstr "3025 3026" 
# Note the process IDs, then:
Stop-Process -Id <PID> -Force

# Start server
cd browser-tools-mcp-extension/browser-tools-server
npm start
```

2. **Check Chrome Extension**
- Open Chrome
- Go to chrome://extensions
- Verify "Browser Tools" extension is enabled
- Click "Details" → "Inspect views: service worker" to check for errors

3. **Verify Connection**
- Open game in Chrome
- Open DevTools (F12)
- Go to "Browser Tools" panel (should be a new tab)
- Check if it shows "Connected"

4. **If Still Not Working, Use Manual Console**
- Just open F12 and look at Console tab
- Red = errors
- Take screenshot if needed

---

## What Went Wrong This Time (Learning)

### Bug: `centerY is not defined`
- **Where**: `src/systems/particleTextures.ts` line 79
- **Why**: Typo - defined `centerX`, `baseY`, `tipY` but forgot `centerY`
- **How to catch**: Smoke test that actually loads hideout

### Bug: Import in wrong place
- **Where**: `src/main.ts` line 126
- **Why**: Put `import` statement in middle of code (must be at top)
- **How to catch**: Linter would catch this (if I ran it)

### Why Tests Didn't Catch It:
- E2E tests only ran at main menu
- Particle textures only created when entering hideout
- Tests needed to actually navigate to hideout

---

## NEW WORKFLOW (Follow This)

### When Making Changes:

1. ✅ Make code changes
2. ✅ Run linter: `npm run lint`
3. ✅ Run smoke test: `npx playwright test tests/e2e/smoke-test.spec.ts`
4. ✅ If tests pass, manually verify in browser
5. ✅ Check browser console for errors
6. ✅ Use browser tools if available
7. ✅ Only then say "done"

### Red Flags to Watch For:

- ❌ Linter errors → FIX IMMEDIATELY
- ❌ Console errors → FIX BEFORE CONTINUING
- ❌ Alert popups saying "ERROR" → READ AND FIX
- ❌ Tests failing → INVESTIGATE, DON'T IGNORE
- ❌ Browser tools not working → FIX CONNECTION FIRST

---

## Quick Validation Commands

```bash
# One-liner to run all checks
npm run lint && npx playwright test tests/e2e/smoke-test.spec.ts

# If that passes, game is probably working
```

---

## Why This Matters

**User had to:**
1. Tell me there was no hideout (I should have seen console error)
2. Tell me about popup messages (browser tools should have caught)
3. Wait while I debugged step-by-step (tests should have caught)

**Better approach:**
1. Run smoke test BEFORE saying done
2. Test would fail with "centerY is not defined"
3. Fix it immediately
4. User gets working code first time

---

## Summary

**DON'T:**
- ❌ Run tests that don't actually test the feature
- ❌ Assume tests passing means it works
- ❌ Say "done" without manual verification
- ❌ Ignore browser tools connection issues

**DO:**
- ✅ Run smoke tests that load the actual game
- ✅ Check browser console manually if tools fail
- ✅ Fix linter errors immediately
- ✅ Verify alerts and popups show correct info
- ✅ Test the actual user path (main menu → hideout)

**GOLDEN RULE:**
If I can't see it working in the console/browser tools, I haven't tested it properly.

