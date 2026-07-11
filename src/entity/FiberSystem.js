/**
 * SPECIMEN — FiberSystem
 *
 * An illusion-first approach to digital anatomy.
 * Not a rigid body constraint solver. Uses simple interpolated quadratic beziers
 * to create the overwhelming visual feeling of a living nervous system.
 */

import { COLORS } from '../constants.js';
import { randomFloat, lerp, expDecay } from '../utils/MathUtils.js';
import { EventBus } from '../utils/EventBus.js';

export class FiberSystem {
  constructor(coords, memory) {
    this._coords = coords;
    this._memory = memory;
    this._fibers = [];
    this._numFibers = 250;
    
    // The global state of the unraveling [0 to 1]
    this._unravelProgress = 0;
    
    // Brain tracking (The Notice effect)
    this._brainX = coords.center.x;
    this._brainY = coords.center.y;
    this._cursorX = coords.center.x;
    this._cursorY = coords.center.y;
    
    // Delayed cursor for synapse glow (Eye reacts first, then network)
    this._glowCursorX = coords.center.x;
    this._glowCursorY = coords.center.y;
    
    // Signal Propagation
    this._signals = [];
    
    this._generateFibers();
  }

  rebuildCache() {
    // Re-generate anchor points based on new screen size
    this._generateFibers();
  }

  _generateFibers() {
    this._fibers = [];
    const w = this._coords.cssWidth;
    const h = this._coords.cssHeight;
    const cx = this._coords.center.x;
    const cy = this._coords.center.y;
    
    // We reduce the number of fibers to clean up noise and emphasize anatomy
    this._numFibers = 120; 

    for (let i = 0; i < this._numFibers; i++) {
      // Visual Hierarchy: 4 distinct anatomical classes
      // 1. Primary (Emergent Heroes) - Longest, thickest, very few (the main limbs)
      // 2. Secondary - Medium length, supporting structure
      // 3. Tertiary - Short, dense, fills out the core
      // 4. Background tissue - Tiny, faint, immediate brain surroundings

      const hierarchyRoll = Math.random();
      let hierarchyLevel;
      let radiusMod;
      let baseOpacity;
      let lineWidth;
      
      if (hierarchyRoll < 0.08) {
        hierarchyLevel = 'primary';
        radiusMod = 1.3;
        baseOpacity = randomFloat(0.1, 0.2);
        lineWidth = randomFloat(0.8, 1.2);
      } else if (hierarchyRoll < 0.3) {
        hierarchyLevel = 'secondary';
        radiusMod = 0.8;
        baseOpacity = randomFloat(0.05, 0.1);
        lineWidth = randomFloat(0.4, 0.6);
      } else if (hierarchyRoll < 0.8) {
        hierarchyLevel = 'tertiary';
        radiusMod = 0.4;
        baseOpacity = randomFloat(0.02, 0.05);
        lineWidth = randomFloat(0.2, 0.3);
      } else {
        hierarchyLevel = 'tissue';
        radiusMod = 0.15;
        baseOpacity = randomFloat(0.01, 0.02);
        lineWidth = randomFloat(0.1, 0.2);
      }
      
      const isEmergentHero = hierarchyLevel === 'primary';

      // Organic radial distribution (bias horizontally to feel like an eye/brain rather than a perfect circle)
      const angle = randomFloat(0, Math.PI * 2);
      
      // Asymmetry: Add natural variation to the reach
      const reachVariance = randomFloat(0.7, 1.3);
      const spreadX = Math.cos(angle) * (w * 0.35 * radiusMod * reachVariance);
      const spreadY = Math.sin(angle) * (h * 0.25 * radiusMod * reachVariance);
      
      // Every fiber originates exactly at the Brain (with a microscopic offset for organic roots)
      const startX = cx + Math.cos(angle) * 3;
      const startY = cy + Math.sin(angle) * 3;
      
      // Fibers reach outward to the periphery
      const endX = cx + spreadX;
      const endY = cy + spreadY;
      
      // The control point gives the curve its biological sweep. 
      // It bows outwards from the straight line between start and end.
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      const normalX = -Math.sin(angle);
      const normalY = Math.cos(angle);
      
      // Primary branches bow less (more direct), tissue bows wildly (more tangled)
      const bowMultiplier = hierarchyLevel === 'primary' ? 0.3 : 0.8;
      const bowMagnitude = randomFloat(-w * 0.1, w * 0.1) * radiusMod * bowMultiplier;
      
      const absoluteCpX = midX + normalX * bowMagnitude;
      const absoluteCpY = midY + normalY * bowMagnitude;

      this._fibers.push({
        tStartX: startX,
        tStartY: startY,
        tEndX: endX,
        tEndY: endY,
        
        isEmergentHero,
        hierarchyLevel,
        lineWidth,
        baseOpacity,
        
        // We store the offset relative to cx, cy for the update physics engine
        cpOffsetX: absoluteCpX - cx,
        cpOffsetY: absoluteCpY - cy,
        
        phase: randomFloat(0, Math.PI * 2),
        speed: randomFloat(0.5, 2.0),
        
        // Current animated values
        currStartX: cx,
        currStartY: cy,
        currEndX: cx,
        currEndY: cy,
        currCpX: cx,
        currCpY: cy,
        
        synapticGlow: 0,
        lastSignalTime: 0,
        
        // Environmental echo state
        phantomTwitchTimer: 0,
        phantomTwitchX: 0
      });
    }
  }

  /**
   * Organic Metabolic Breathing Cycle
   * Breaks predictability. Replaces sine waves with a biological respiration cycle:
   * hold -> tiny inhale -> exhale -> pause -> deep inhale -> tension/shake -> long exhale
   */
  _calculateMetabolicBreath(time, speed, phase) {
      const cycleLength = 12.0 / speed;
      const t = (time + phase) % cycleLength;
      const progress = t / cycleLength; // 0 to 1

      if (progress < 0.2) return 0; // Hold
      if (progress < 0.3) { // Tiny inhale
         const p = (progress - 0.2) / 0.1;
         return Math.sin(p * Math.PI / 2) * 0.2; 
      }
      if (progress < 0.4) { // Tiny exhale
         const p = (progress - 0.3) / 0.1;
         return 0.2 * Math.cos(p * Math.PI / 2);
      }
      if (progress < 0.6) return 0; // Pause
      if (progress < 0.75) { // Deep inhale
         const p = (progress - 0.6) / 0.15;
         return Math.sin(p * Math.PI / 2) * 1.0;
      }
      if (progress < 0.8) { // Tension / micro shake
         return 1.0 + (Math.random() - 0.5) * 0.05;
      }
      // Long exhale
      const p = (progress - 0.8) / 0.2;
      return Math.cos(p * Math.PI / 2);
  }

  /**
   * Update fiber physics
   */
  update(deltaSeconds, isUnraveled, targetCpX, targetCpY, behaviorState, isCursorStill, isReturningVisitor, pluckPhase, introState, temperament = 0.0) {
    // Track cursor for render
    this._cursorX = targetCpX;
    this._cursorY = targetCpY;
    
    // Delayed cursor for network reaction (Eye reacts instantly, network lags ~100ms)
    this._glowCursorX = expDecay(this._glowCursorX, targetCpX, 10.0, deltaSeconds);
    this._glowCursorY = expDecay(this._glowCursorY, targetCpY, 10.0, deltaSeconds);
    
    // Determine target progress
    let targetProgress = isUnraveled ? 1.0 : 0.0;
    
    // Spring speed config
    let globalSpringSpeed = 5.0; // Slow retraction by default
    
    // Calculate exact time since unraveled for the recoil illusion
    if (!this._lastUnravelState && isUnraveled) {
      this._unravelStartTime = performance.now();
    }
    this._lastUnravelState = isUnraveled;
    
    const timeSinceUnravel = isUnraveled ? (performance.now() - (this._unravelStartTime || 0)) : Infinity;
    
    // Math-based Overshoot logic (Shock Phase)
    this._recoilOvershoot = 0;
    if (isUnraveled && timeSinceUnravel < 200) {
      // Film Cut: Compress Pluck recoil to 200ms for punchiness
      const t = timeSinceUnravel / 200; // 0 to 1
      this._recoilOvershoot = Math.sin(t * Math.PI) * (1 - t) * 1.5; 
      globalSpringSpeed = 40.0; // Inevitable, massive velocity
    } else if (isUnraveled) {
      globalSpringSpeed = 10.0; // Settling velocity
    }

    if (pluckPhase === 'tension' || pluckPhase === 'freeze') {
      targetProgress = 0.0; // Do not unravel yet!
      globalSpringSpeed = 30.0;
    }

    this._unravelProgress = expDecay(this._unravelProgress, targetProgress, globalSpringSpeed, deltaSeconds);
    
    const h = this._coords.cssHeight;
    const cx = this._coords.center.x;
    const cy = this._coords.center.y;
    
    // Brain tracking (Notice Effect)
    // The core leans slightly towards the cursor to acknowledge it.
    let targetBrainX = cx;
    let targetBrainY = cy;
    
    if (isUnraveled) {
      const dxC = targetCpX - cx;
      const dyC = targetCpY - cy;
      const distC = Math.sqrt(dxC * dxC + dyC * dyC);
      if (distC > 0) {
         // Very subtle body lean (max 5px) instead of heavy sliding
         const leanMag = Math.min(5, distC * 0.02); 
         targetBrainX = cx + (dxC / distC) * leanMag;
         targetBrainY = cy + (dyC / distC) * leanMag;
      }
    }
    
    this._brainX = expDecay(this._brainX, targetBrainX, 10.0, deltaSeconds);
    this._brainY = expDecay(this._brainY, targetBrainY, 10.0, deltaSeconds);

    const baseStartY = cy - (h * 0.4);
    const baseEndY = cy + (h * 0.4);

    // Curiosity Phase: The occasional twitch removed. 
    // Editor's Cut: 95% barely perceptible change. Metabolic breath drives idle life.
    // Tension Phase: The Taut Wire Vibrates
    let globalVibrationX = 0;
    if (pluckPhase === 'tension') {
      globalVibrationX = (Math.random() - 0.5) * 12.0; // Harsh, erratic vibration
    }
    
    for (let i = 0; i < this._numFibers; i++) {
      const f = this._fibers[i];
      
      // ─── Environmental Echoes (The Phantom Twitch) ───
      // If the fiber's control point is resting in an area of high historical tension, it might twitch.
      if (this._memory && this._unravelProgress === 1.0) {
         if (f.phantomTwitchTimer > 0) {
            f.phantomTwitchTimer -= deltaSeconds;
         } else {
            // Read tension at this fiber's current control point
            const pnx = f.currCpX / this._coords.cssWidth;
            const pny = f.currCpY / this._coords.cssHeight;
            const tension = this._memory.getHistoricalTension(pnx, pny);
            
            if (tension > 0.05) {
               // Rare probability per fiber
               if (Math.random() < 0.00005 * tension) {
                  f.phantomTwitchTimer = randomFloat(0.3, 0.8);
                  f.phantomTwitchX = (Math.random() - 0.5) * 60.0; // Sudden violent jerk
                  
                  if (Math.random() < 0.02) {
                     EventBus.emit('WORLD_ECHO_SURFACED', { type: 'fiber' });
                  }
               }
            }
         }
      }
      
      // Behavior overrides
      let finalTargetCpX = targetCpX;
      let finalTargetCpY = targetCpY;
      let breathMod = 1.0;
      let tensionMod = 1.0;
      let hierarchyMod = f.isEmergentHero ? 1.5 : 0.9; 

      if (behaviorState === 'defensive') {
        // Pull tightly into a knot, but don't shrink to nothing.
        // It must maintain at least 50% screen presence.
        finalTargetCpX = cx;
        finalTargetCpY = cy;
        breathMod = 0.1; // Rigid
        tensionMod = 0.4; // Dense knot
      } else if (behaviorState === 'trusting' || behaviorState === 'curious') {
        // Cursor feels dangerous / powerful. Fibers reach deeply.
        breathMod = 1.8;
        tensionMod = 1.5 * hierarchyMod; // Arterial fibers reach closer to cursor
      }

      // Temperament directly limits how relaxed the organism can be.
      // If temperament is negative (guarded), it stays tense even when supposedly calm.
      // If positive (playful), it reaches out even further.
      if (temperament < 0) {
        tensionMod *= (1.0 + (temperament * 0.4)); // e.g., -1.0 means tension drops by 40% (tighter knot)
        // Control point is pulled back towards center (reluctant to reach for cursor)
        finalTargetCpX = lerp(finalTargetCpX, cx, Math.abs(temperament) * 0.6);
        finalTargetCpY = lerp(finalTargetCpY, cy, Math.abs(temperament) * 0.6);
      } else {
        tensionMod *= (1.0 + (temperament * 0.3)); // Reaches out 30% further
      }

      // Target anchor points based on unravel progress and tension
      const targetStartX = lerp(cx, lerp(this._brainX, f.tStartX, tensionMod), this._unravelProgress);
      const targetStartY = lerp(baseStartY, lerp(this._brainY, f.tStartY, tensionMod), this._unravelProgress);
      const targetEndX = lerp(cx, lerp(cx, f.tEndX, tensionMod), this._unravelProgress);
      const targetEndY = lerp(baseEndY, lerp(cy, f.tEndY, tensionMod), this._unravelProgress);
      
      f.currStartX = targetStartX + (this._unravelProgress === 0 ? globalVibrationX : 0);
      f.currStartY = targetStartY;
      f.currEndX = targetEndX + (this._unravelProgress === 0 ? globalVibrationX : 0);
      f.currEndY = targetEndY;
      
      // Synaptic Glow (Notice Effect) - Using delayed cursor so Eye moves first
      let targetGlow = 0;
      if (isUnraveled && !isCursorStill) {
         const dxSyn = f.currEndX - this._glowCursorX;
         const dySyn = f.currEndY - this._glowCursorY;
         const distSyn = Math.sqrt(dxSyn * dxSyn + dySyn * dySyn);
         const glowRadius = 350; // Increased radius for confident perception
         if (distSyn < glowRadius) {
            targetGlow = Math.pow(1 - (distSyn / glowRadius), 1.5); // More aggressive curve
         }
      }
      
      // Lingering recovery: Fast to light up (attention), slow to fade (linger)
      const decaySpeed = (targetGlow > f.synapticGlow) ? 25.0 : 2.0; // 2.0 creates a ~0.5s linger
      f.synapticGlow = expDecay(f.synapticGlow, targetGlow, decaySpeed, deltaSeconds);
      
      // Signal Propagation: Sensation travels from noticed synapse TO brain
      const time = performance.now() * 0.001;
      if (f.synapticGlow > 0.5 && f.isEmergentHero && isUnraveled) {
         if (time - f.lastSignalTime > 2.0) { // Max one signal every 2s per fiber
            f.lastSignalTime = time;
            this._signals.push({
               fiberIndex: i,
               progress: 1.0, // Start at synapse
               direction: -1, // Travel towards brain
               speed: randomFloat(0.4, 0.7), // Calm, purposeful pace
               intensity: 1.0
            });
         }
      }
      
      // Idle Thoughts: Brain occasionally sends signals outward to keep network alive
      if (isUnraveled && Math.random() < 0.05 * deltaSeconds) {
          this._signals.push({
             fiberIndex: i,
             progress: 0.0, // Start at brain
             direction: 1,  // Travel outwards
             speed: randomFloat(0.3, 0.5), // Slower idle pace
             intensity: 0.5
          });
      }
      
      // Intrusive Cursor: The user is trespassing. Fibers bend OUT OF THE WAY to accommodate the intrusion.
      // We calculate distance from the unraveled control point to the cursor.
      let unraveledCpX = this._brainX + (f.cpOffsetX * tensionMod) + (f.cpOffsetX * this._recoilOvershoot);
      let unraveledCpY = this._brainY + (f.cpOffsetY * tensionMod) + (f.cpOffsetY * this._recoilOvershoot);
      
      if (isUnraveled && pluckPhase !== 'freeze') {
        const dx = unraveledCpX - finalTargetCpX;
        const dy = unraveledCpY - finalTargetCpY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // If cursor gets too close, the fiber forcefully pushes away (Intrusion reaction)
        const threshold = f.isEmergentHero ? 250 : 150;
        if (dist < threshold && dist > 1) {
          const pushForce = Math.pow(1 - (dist / threshold), 2) * 200; // Exponential push
          unraveledCpX += (dx / dist) * pushForce;
          unraveledCpY += (dy / dist) * pushForce;
        }
      }
      
      // If returning visitor, topology is permanently slightly twisted (Memory)
      if (isReturningVisitor) {
        const twistAngle = (i / this._numFibers) * Math.PI;
        unraveledCpX += Math.cos(twistAngle) * 40;
        unraveledCpY += Math.sin(twistAngle) * 40;
      }
      
      // Editor's Cut: Organic metabolic breathing with asymmetric shifting center of gravity.
      const time = performance.now() * 0.001;
      let breath = this._calculateMetabolicBreath(time, f.speed, f.phase) * 8 * this._unravelProgress;
      
      // Calculate a drifting Center of Gravity for this fiber's breath
      // Different fibers have slightly different sensitivities to the drift to create mass asymmetry
      const cgDriftX = Math.sin(time * 0.3 + f.phase) * 80;
      const cgDriftY = Math.cos(time * 0.4 + f.phase) * 80;
      const cgX = cx + cgDriftX;
      const cgY = cy + cgDriftY;
      
      // Vector from the shifting CG to the fiber's control point
      const dxCg = unraveledCpX - cgX;
      const dyCg = unraveledCpY - cgY;
      const distCg = Math.sqrt(dxCg * dxCg + dyCg * dyCg) || 1;
      
      // Apply breath along that vector, not just diagonally
      const breathDirX = (dxCg / distCg) * breath;
      const breathDirY = (dyCg / distCg) * breath;
      
      if (pluckPhase === 'freeze') {
        breath = 0; // Absolute stillness
        unraveledCpX = cx; // Snapped to center for 1 frame freeze
        unraveledCpY = cy;
      }
      
      const targetCurrentCpX = lerp(cx, unraveledCpX + breathDirX, this._unravelProgress) + (this._unravelProgress === 0 ? globalVibrationX * 2 : 0) + (f.phantomTwitchTimer > 0 ? f.phantomTwitchX : 0);
      const targetCurrentCpY = lerp(cy, unraveledCpY + breathDirY, this._unravelProgress);
      
      // Defensive state snaps quickly, calm state flows slowly
      let responseSpeed = behaviorState === 'defensive' ? 12.0 : (4.0 * hierarchyMod);
      if (pluckPhase === 'tension') responseSpeed = 40.0;
      if (this._recoilOvershoot > 0) responseSpeed = 50.0; // Exploding outward
      if (pluckPhase === 'freeze') responseSpeed = 100.0; // Instant lock
      
      f.currCpX = expDecay(f.currCpX, targetCurrentCpX, responseSpeed, deltaSeconds);
      f.currCpY = expDecay(f.currCpY, targetCurrentCpY, responseSpeed, deltaSeconds);
    }
    
    // Update Signals
    for (let i = this._signals.length - 1; i >= 0; i--) {
      const s = this._signals[i];
      s.progress += s.speed * s.direction * deltaSeconds;
      
      // Remove if arrived at destination
      if (s.progress < 0 || s.progress > 1) {
         this._signals.splice(i, 1);
      }
    }
  }

  /**
   * Instantly reset the unravel progress (used for the climax reset)
   */
  resetUnravel() {
    this._unravelProgress = 0;
  }

  /**
   * Render the fibers
   */
  render(ctx, masterOpacity, cx, cy, introState, temperament = 0.0, standoffIntensity = 0, standoffContext = null) {
    if (masterOpacity <= 0.001) return;

    if (introState === 'hiding') {
      ctx.save();
      ctx.globalAlpha = 0.05 * masterOpacity; // Slightly more visible
      ctx.fillStyle = COLORS.WARM_WHITE;
      
      const shimmerT = performance.now() * 0.002;
      for (let i = 0; i < 3; i++) {
         const nx = cx + (Math.sin(shimmerT * (i + 1) * 1.3) * 10);
         const ny = cy + (Math.cos(shimmerT * (i + 2) * 1.7) * 10);
         
         ctx.beginPath();
         ctx.arc(nx, ny, 1.5, 0, Math.PI * 2);
         ctx.fill();
      }
      ctx.restore();
      return; 
    }

    ctx.save();
    
    // PREMIUM FIBER RENDERING
    // Remove screen blending for crispness, use normal alpha blending with high contrast
    ctx.globalCompositeOperation = 'source-over'; 
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // When not unraveled (The single resting line)
    if (this._unravelProgress === 0) {
      const base = this._fibers[0];
      ctx.globalAlpha = masterOpacity;
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 1.0)';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
      ctx.shadowBlur = 12;
      
      ctx.beginPath();
      ctx.moveTo(base.currStartX, base.currStartY);
      ctx.quadraticCurveTo(base.currCpX, base.currCpY, base.currEndX, base.currEndY);
      ctx.stroke();
      
      // Central focal point
      ctx.beginPath();
      ctx.fillStyle = '#ffffff';
      ctx.arc(base.currCpX, base.currCpY, 3, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
      return;
    }

    // UNRAVELED NEURAL ORGANISM (Readability Polish)
    ctx.shadowBlur = 0; // Disable shadow for extreme sharpness
    
    // Draw Fibers
    for (let i = 0; i < this._numFibers; i++) {
      const f = this._fibers[i];
      // Reduce baseline opacity to create negative space, but make heroes extremely sharp
      let opacity = f.baseOpacity * masterOpacity * (0.05 + this._unravelProgress * 0.95);
      let lineWidthMod = 1.0;
        
      if (f.isEmergentHero) {
         opacity = 0.8 * masterOpacity; // Sharp contrast
         lineWidthMod = 2.0; 
      }
      
      // Add Synaptic Glow
      opacity = Math.min(1.0, opacity + (f.synapticGlow * 0.8 * masterOpacity));
      if (f.synapticGlow > 0.1) {
         lineWidthMod += f.synapticGlow * 1.5;
      }

      ctx.globalAlpha = opacity;
      ctx.lineWidth = f.lineWidth * lineWidthMod;
      ctx.strokeStyle = f.isEmergentHero || f.synapticGlow > 0.3 ? 'rgba(255, 255, 255, 0.9)' : 'rgba(200, 200, 200, 0.4)';
      
      ctx.beginPath();
      ctx.moveTo(f.currStartX, f.currStartY);
      ctx.quadraticCurveTo(f.currCpX, f.currCpY, f.currEndX, f.currEndY);
      ctx.stroke();
    }
    
    // Draw Nodes (Visual Hierarchy & Silhouette)
    // Build a clear anatomical hierarchy outward from the brain
    ctx.globalAlpha = masterOpacity;
    for (let i = 0; i < this._numFibers; i++) {
      const f = this._fibers[i];
      
      // Node position is at the end of the fiber (the peripheral synapse)
      const nx = f.currEndX;
      const ny = f.currEndY;
      
      if (f.hierarchyLevel === 'primary') {
        // Major structural node (Synapse)
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
        ctx.arc(nx, ny, 2.5 + (f.synapticGlow * 3.5), 0, Math.PI * 2);
        ctx.fill();
        
        // Confident glowing halo around major nodes
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.15 + f.synapticGlow * 0.7) + ')';
        ctx.arc(nx, ny, 8 + (f.synapticGlow * 20), 0, Math.PI * 2);
        ctx.fill();
      } else if (f.hierarchyLevel === 'secondary') {
        // Medium node
        ctx.globalAlpha = masterOpacity * Math.min(1.0, 0.7 + f.synapticGlow);
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.arc(nx, ny, 1.2 + (f.synapticGlow * 1.5), 0, Math.PI * 2);
        ctx.fill();
      } else if (f.hierarchyLevel === 'tertiary') {
        // Tiny dust node
        ctx.globalAlpha = masterOpacity * 0.4;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.arc(nx, ny, 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Render Signal Propagation (Thoughts/Information)
    for (let i = 0; i < this._signals.length; i++) {
        const s = this._signals[i];
        const f = this._fibers[s.fiberIndex];
        if (!f) continue;
        
        // Draw a soft, multi-segment pulse (like fluid moving through a vein)
        for (let k = 0; k < 6; k++) {
            // Trail behind the current progress
            const offset = (k * 0.02) * -s.direction; 
            const t = Math.max(0, Math.min(1, s.progress + offset));
            
            const omt = 1 - t;
            const px = omt * omt * f.currStartX + 2 * omt * t * f.currCpX + t * t * f.currEndX;
            const py = omt * omt * f.currStartY + 2 * omt * t * f.currCpX + t * t * f.currEndY;
            
            const alpha = s.intensity * masterOpacity * (1 - k / 6);
            ctx.beginPath();
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            
            // Only the head of the pulse glows
            if (k === 0) {
               ctx.shadowBlur = 8;
               ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            } else {
               ctx.shadowBlur = 0;
            }
            
            const baseSize = f.isEmergentHero ? 1.5 : 1.0;
            ctx.arc(px, py, baseSize * (2.0 - k * 0.2), 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // The Core Focal Point (The Brain / Eye)
    ctx.globalAlpha = masterOpacity;
    
    // Outer Sclera
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 15;
    ctx.arc(this._brainX, this._brainY, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Render an inner "pupil" that clearly orients towards the cursor
    if (this._unravelProgress > 0) {
       const bdx = this._cursorX - this._brainX;
       const bdy = this._cursorY - this._brainY;
       const bDist = Math.sqrt(bdx * bdx + bdy * bdy);
       const maxPupilShift = 3.5; // Extends to the edge of the sclera
       const px = bDist > 0 ? (bdx / bDist) * maxPupilShift : 0;
       const py = bDist > 0 ? (bdy / bDist) * maxPupilShift : 0;
       
       // Dark Iris
       ctx.beginPath();
       ctx.fillStyle = 'rgba(15, 15, 15, 1.0)';
       ctx.shadowBlur = 0;
       ctx.arc(this._brainX + px, this._brainY + py, 3.5, 0, Math.PI * 2);
       ctx.fill();
       
       // Center Pupil Light (Reflection)
       ctx.beginPath();
       ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
       ctx.arc(this._brainX + px + (px * 0.15), this._brainY + py + (py * 0.15), 1.2, 0, Math.PI * 2);
       ctx.fill();
    }
    
    ctx.restore();
  }
}
