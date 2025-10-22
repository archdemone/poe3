# Visual Test Checklist for Particle System

## Quick Start Testing

### 1. Start the Game
```bash
npm run dev
```
Open http://localhost:5173 in your browser

### 2. Navigate to Hideout
1. Click "New Game" or "Continue"
2. Create/select a character
3. You should now be in the gothic hideout

### 3. What to Look For

#### Torch Flames (4 locations around hideout)
- [ ] **Location**: Near corners and decorative torches
- [ ] **Appearance**: Yellow-orange-red flame particles rising upward
- [ ] **Motion**: Flickering, dancing flame movement
- [ ] **Glow**: Additive glow effect around flames
- [ ] **Performance**: No FPS drop

#### Ambient Dust
- [ ] **Location**: Throughout the hideout airspace
- [ ] **Appearance**: Very subtle beige/white motes
- [ ] **Motion**: Slow upward drift, very gentle
- [ ] **Quantity**: Sparse (only ~8 particles emitting per second)
- [ ] **Note**: These are VERY subtle - look carefully

#### Map Device Magical Aura
- [ ] **Location**: On the crystal atop the map device pedestal
- [ ] **Appearance**: Cyan-blue magical glow
- [ ] **Motion**: Swirling upward around the crystal
- [ ] **Glow**: Bright additive effect
- [ ] **Continuous**: Should always be active

### 4. Test Portal Particles
1. Press `Escape` or click dev chest to get maps
2. Open map device (walk near it)
3. Drag a map into the device
4. Click "Activate"
5. **Portal particles should appear!**
   - [ ] **Location**: At each portal (usually 2 portals)
   - [ ] **Appearance**: Purple-blue swirling particles
   - [ ] **Motion**: Swirling, upward pull
   - [ ] **Glow**: Bright magical effect

### 5. Test Dungeon Particles
1. Enter a portal (click on it)
2. You're now in a dungeon corridor
3. **Look for wall torches**:
   - [ ] **Location**: Along corridor walls
   - [ ] **Appearance**: Orange-red flame particles
   - [ ] **Motion**: Upward flickering
   - [ ] **Lighting**: Should cast orange light

## Performance Checks

### FPS Monitoring
1. Open browser DevTools (F12)
2. Go to Console tab
3. Type: `(window as any).engine.getFps()`
4. **Expected**: 50-60 FPS

OR use this snippet to monitor continuously:
```javascript
setInterval(() => {
  console.log('FPS:', Math.round((window as any).engine.getFps()));
}, 1000);
```

### Expected Performance
- **Hideout (no portals)**: 55-60 FPS
- **Hideout (with portals)**: 50-60 FPS
- **Dungeon**: 55-60 FPS
- **Acceptable minimum**: 30 FPS

## Troubleshooting

### If particles aren't visible:

1. **Check console for particle logs**:
```javascript
// In browser console
console.log((window as any).scene.particleSystems);
```
Expected output: Array with multiple particle systems

2. **Check if GPU particles are supported**:
```javascript
// In browser console
console.log('GPU Particles:', BABYLON.GPUParticleSystem.IsSupported);
```

3. **Manually start particles** (if needed):
```javascript
// In browser console
(window as any).scene.particleSystems.forEach(ps => {
  if (!ps.isStarted()) {
    ps.start();
    console.log('Started:', ps.name);
  }
});
```

4. **Check particle count**:
```javascript
// In browser console
(window as any).scene.particleSystems.forEach(ps => {
  console.log(ps.name, '- Active:', ps.getActiveCount ? ps.getActiveCount() : 'N/A');
});
```

### If FPS is low:

1. **Check particle count**:
```javascript
const totalParticles = (window as any).scene.particleSystems.reduce(
  (sum, ps) => sum + (ps.getCapacity ? ps.getCapacity() : 0), 
  0
);
console.log('Total particle capacity:', totalParticles);
```

2. **Disable specific effects to isolate issue**:
```javascript
// Stop all particles
(window as any).scene.particleSystems.forEach(ps => ps.stop());

// Start one at a time
(window as any).scene.particleSystems[0].start();
// Check FPS, then continue with others
```

## Expected Console Logs

When everything is working, you should see:

```
Asset management system initialized
State transition: BOOT → MAIN_MENU
...
[Entering hideout]
...
[Particles] Using GPU particles for torchFlame0
[Particles] Using GPU particles for torchFlame1
[Particles] Using GPU particles for torchFlame2
[Particles] Using GPU particles for torchFlame3
[Particles] Started hideout torch flames
[Particles] Using CPU particles for hideoutDust
[Particles] Started ambient dust in hideout
[Particles] Using GPU particles for mapDeviceAura
[Particles] Started map device magical aura
[HIDEOUT] Gothic hideout setup complete with NEW 3D assets!
...
[When activating map device]
[Particles] Using GPU particles for portalEffect_0
[Particles] Started portal effect 0
[Particles] Using GPU particles for portalEffect_1
[Particles] Started portal effect 1
```

## Screenshots to Take

For verification, please take screenshots of:
1. Hideout overview showing torch flames
2. Close-up of map device with magical aura
3. Portal particles after activating a map
4. Dungeon corridor with wall torch flames
5. FPS counter showing performance

## Issues to Report

If you encounter any of these, please report with screenshots:
- [ ] Particles not visible at all
- [ ] FPS below 30
- [ ] Console errors related to particles
- [ ] Particles appearing in wrong locations
- [ ] Particles too bright/dim
- [ ] Particles wrong colors
- [ ] Glitches or visual artifacts

## Success Criteria

✅ All torch flames visible and animated  
✅ Magical aura on map device clearly visible  
✅ Portal particles appear when map is activated  
✅ Dungeon torch flames working  
✅ FPS maintains 50+ consistently  
✅ No console errors  
✅ Visual quality meets expectations  

---

**Note**: The ambient dust is intentionally very subtle. If you can't see it immediately, that's expected - it's meant to add subtle atmosphere without being distracting.

