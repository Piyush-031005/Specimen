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
    this._isGrappling = false;
    this._evolutionLevel = 1;

    // We build the fibers around a generic center first
    // They will be translated during rendering to follow the brain
    this._generateFibers();
  }

  /**
   * Triggers a violent mutation, regenerating the fibers to make the organism larger.
   * @param {number} level 
   */
  triggerMutation(level) {
      this._evolutionLevel = level;
      
      // Explosion effect - instantly reset unravel
      this._unravelProgress = 0;
      this._recoilOvershoot = 1.0;
      
      // Regenerate the anatomy
      this._generateFibers();
  }

  rebuildCache() {
    // Re-generate anchor points based on new screen size
    this._generateFibers();
  }

  _generateFibers() {
    this._fibers = [];
    
    // Scale fiber count based on evolution
    let primaryCount = 4;
    let secondaryCount = 8;
    let ambientCount = 10;
    
    if (this._evolutionLevel === 2) {
        primaryCount = 8;
        secondaryCount = 16;
        ambientCount = 20;
    } else if (this._evolutionLevel === 3) {
        primaryCount = 12;
        secondaryCount = 30;
        ambientCount = 40;
    }
    
    this._numFibers = primaryCount + secondaryCount + ambientCount;

    const cx = this._coords.center.x;
    const cy = this._coords.center.y;
    // Core scales massively at Level 3
    const baseW = this._coords.cssWidth * (this._evolutionLevel === 3 ? 0.6 : (this._evolutionLevel === 2 ? 0.4 : 0.25));
    const baseH = this._coords.cssHeight * (this._evolutionLevel === 3 ? 0.6 : (this._evolutionLevel === 2 ? 0.4 : 0.25));
    
    // Helper to add a fiber
    const addFiber = (isEmergentHero, hierarchyLevel) => {
      let radiusMod;
      let baseOpacity;
      let lineWidth;
      
      if (hierarchyLevel === 'primary') {
        radiusMod = 1.3;
        baseOpacity = randomFloat(0.1, 0.2);
        lineWidth = randomFloat(0.8, 1.2);
      } else if (hierarchyLevel === 'secondary') {
        radiusMod = 0.8;
        baseOpacity = randomFloat(0.05, 0.1);
        lineWidth = randomFloat(0.4, 0.6);
      } else {
        radiusMod = 0.4;
        baseOpacity = randomFloat(0.02, 0.05);
        lineWidth = randomFloat(0.2, 0.3);
      }
      
      // Organic radial distribution (bias horizontally to feel like an eye/brain rather than a perfect circle)
      const angle = randomFloat(0, Math.PI * 2);
      
      // Reach radius scales with evolution
      const reachMod = this._evolutionLevel === 3 ? 2.5 : (this._evolutionLevel === 2 ? 1.5 : 1.0);
      const reach = isEmergentHero ? 1.2 : randomFloat(0.4, 1.0);
      
      const startX = cx + Math.cos(angle) * 3;
      const startY = cy + Math.sin(angle) * 3;
      
      // Fibers reach outward to the periphery
      const endX = cx + Math.cos(angle) * (baseW * reach * reachMod);
      const endY = cy + Math.sin(angle) * (baseH * reach * reachMod);
      
      // The control point gives the curve its biological sweep. 
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      const normalX = -Math.sin(angle);
      const normalY = Math.cos(angle);
      
      // Primary branches bow less (more direct), tissue bows wildly (more tangled)
      const bowMultiplier = hierarchyLevel === 'primary' ? 0.3 : 0.8;
      const bowMagnitude = randomFloat(-baseW * 0.1, baseW * 0.1) * radiusMod * bowMultiplier;
      
      // We store the offset relative to cx, cy for the update physics engine
      const absoluteCpX = midX + normalX * bowMagnitude;
      const absoluteCpY = midY + normalY * bowMagnitude;
      
      // Calculate angular sorting for membrane generation
      const renderAngle = Math.atan2(endY - cy, endX - cx);

      this._fibers.push({
        tStartX: startX,
        tStartY: startY,
        tEndX: endX,
        tEndY: endY,
        angle: renderAngle,
        
        isEmergentHero,
        hierarchyLevel,
        lineWidth,
        baseOpacity,
        z: randomFloat(-1.0, 1.0), // Z-depth for parallax
        isDeepRed: randomFloat(0, 1) < (this._evolutionLevel === 3 ? 0.25 : 0.08), // More deep red veins in Level 3
        
        // We store the offset relative to cx, cy for the update physics engine
        cpOffsetX: absoluteCpX - cx,
        cpOffsetY: absoluteCpY - cy,
        
        phase: randomFloat(0, Math.PI * 2),
        speed: randomFloat(0.5, 2.0),
        
        // Dynamic state
        currStartX: cx,
        currStartY: cy,
        currEndX: cx,
        currEndY: cy,
        currCpX: cx,
        currCpY: cy,
        
        memoryTrace: 0,
        synapticGlow: 0,
        phantomTwitchTimer: 0,
        phantomTwitchX: 0
      });
    }
    
    // Sort fibers by angle so membrane webbing connects adjacent limbs smoothly, not across the whole organism
    this._fibers.sort((a, b) => a.angle - b.angle);
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
  update(deltaSeconds, isUnraveled, targetCpX, targetCpY, behaviorState, isCursorStill, isReturningVisitor, pluckPhase, introState, temperament = 0.0, isGrappling = false) {
    this._isGrappling = isGrappling;
    // Track cursor for render. Fallback to center to prevent NaN if undefined.
    this._cursorX = targetCpX !== undefined ? targetCpX : this._coords.center.x;
    this._cursorY = targetCpY !== undefined ? targetCpY : this._coords.center.y;
    
    // Delayed cursor for network reaction (Eye reacts instantly, network lags ~100ms)
    this._glowCursorX = expDecay(this._glowCursorX, this._cursorX, 10.0, deltaSeconds);
    this._glowCursorY = expDecay(this._glowCursorY, this._cursorY, 10.0, deltaSeconds);
    
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
      if (this._isGrappling) {
        tensionMod *= 2.5; // Aggressive reach
        breathMod = 3.0; // Heavy, erratic breathing
      } else if (temperament < 0) {
        tensionMod *= (1.0 + (temperament * 0.4)); // e.g., -1.0 means tension drops by 40% (tighter knot)
        // Control point is pulled back towards center (reluctant to reach for cursor)
        finalTargetCpX = lerp(finalTargetCpX, cx, Math.abs(temperament) * 0.6);
        finalTargetCpY = lerp(finalTargetCpY, cy, Math.abs(temperament) * 0.6);
      } else {
        tensionMod *= (1.0 + (temperament * 0.3)); // Reaches out 30% further
      }
      
      // Fix: Use this._coords.cssWidth/cssHeight directly instead of undefined 'w'/'h'
      const pxC = (this._cursorX - cx) / this._coords.cssWidth;
      const pyC = (this._cursorY - cy) / this._coords.cssHeight;
      const parallaxX = pxC * f.z * 15.0 * this._unravelProgress;
      const parallaxY = pyC * f.z * 15.0 * this._unravelProgress;

      // Target anchor points based on unravel progress and tension
      const targetStartX = lerp(cx, lerp(this._brainX, f.tStartX, tensionMod), this._unravelProgress) + parallaxX;
      const targetStartY = lerp(baseStartY, lerp(this._brainY, f.tStartY, tensionMod), this._unravelProgress) + parallaxY;
      const targetEndX = lerp(cx, lerp(cx, f.tEndX, tensionMod), this._unravelProgress) + parallaxX;
      const targetEndY = lerp(baseEndY, lerp(cy, f.tEndY, tensionMod), this._unravelProgress) + parallaxY;
      
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
      } else if (this._isGrappling) {
        // Grapple mode: Organism lunges and completely wraps around the cursor
        unraveledCpX = lerp(unraveledCpX, finalTargetCpX, 0.85);
        unraveledCpY = lerp(unraveledCpY, finalTargetCpY, 0.85);
      }
      
      // THE BIG JUMP: Tentacle Wriggle (Aquatic, alien writhing)
      let wriggleX = Math.cos(time * f.speed * 2.0 + f.phase) * (f.hierarchyLevel === 'tissue' ? 30 : 12);
      let wriggleY = Math.sin(time * f.speed * 2.5 + f.phase) * (f.hierarchyLevel === 'tissue' ? 30 : 12);
      
      if (this._isGrappling) {
          wriggleX *= 3.0; // Violent thrashing
          wriggleY *= 3.0;
      }
      
      const targetCurrentCpX = lerp(cx, unraveledCpX + breathDirX, this._unravelProgress) + (this._unravelProgress === 0 ? globalVibrationX * 2 : 0) + (f.phantomTwitchTimer > 0 ? f.phantomTwitchX : 0) + parallaxX + wriggleX;
      const targetCurrentCpY = lerp(cy, unraveledCpY + breathDirY, this._unravelProgress) + parallaxY + wriggleY;
      
      // Defensive state snaps quickly, calm state flows slowly
      let responseSpeed = behaviorState === 'defensive' ? 12.0 : (4.0 * hierarchyMod);
      if (this._isGrappling) responseSpeed = 60.0; // Instant snap to cursor
      if (pluckPhase === 'tension') responseSpeed = 40.0;
      if (this._recoilOvershoot > 0) responseSpeed = 50.0; // Exploding outward
      if (pluckPhase === 'freeze') responseSpeed = 100.0; // Instant lock
      
      f.currCpX = expDecay(f.currCpX, targetCurrentCpX, responseSpeed, deltaSeconds);
      f.currCpY = expDecay(f.currCpY, targetCurrentCpY, responseSpeed, deltaSeconds);
    }
    
    // Update Signals
    let hasSensationSignal = false;
    for (let i = this._signals.length - 1; i >= 0; i--) {
      const s = this._signals[i];
      
      if (s.direction === -1) hasSensationSignal = true; // A thought is returning to the brain
      
      // Speed variation: Slower at the bend (middle of the curve), faster at the ends
      const speedBend = 1.0 - (Math.sin(s.progress * Math.PI) * 0.5);
      s.progress += s.speed * speedBend * s.direction * deltaSeconds;
      
      // Remove if arrived at destination
      if (s.progress <= 0 || s.progress >= 1) {
         if (s.progress <= 0 && s.direction === -1) {
            // ARRIVAL AT BRAIN
            this._brainArrivalPulse = 1.0;
            // FORM MEMORY
            const f = this._fibers[s.fiberIndex];
            if (f) {
               f.memoryTrace = Math.min(1.0, f.memoryTrace + 0.25); // Max out after 4 touches
            }
         }
         this._signals.splice(i, 1);
      }
    }
    
    // Brain arrival pulse decays extremely fast (80ms flash)
    this._brainArrivalPulse = expDecay(this._brainArrivalPulse, 0, 15.0, deltaSeconds);
    
    // Global signal dimming: When a thought travels, the rest of the organism quiets down to increase contrast
    this._globalSignalDim = expDecay(this._globalSignalDim || 0, hasSensationSignal ? 0.25 : 0, 5.0, deltaSeconds);
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
    
    // Dim the entire organism slightly when a thought travels to guide the eye
    const contrastMasterOpacity = masterOpacity * (1.0 - (this._globalSignalDim || 0));
    
    // Draw Fibers
    for (let i = 0; i < this._numFibers; i++) {
      const f = this._fibers[i];
      // Reduce baseline opacity to create negative space, but make heroes extremely sharp
      let opacity = f.baseOpacity * contrastMasterOpacity * (0.05 + this._unravelProgress * 0.95);
      let lineWidthMod = 1.0;
        
      if (f.isEmergentHero) {
         opacity = 0.8 * contrastMasterOpacity; // Sharp contrast
         lineWidthMod = 2.0; 
      }
      
      // Memory Trace: Permanently strengthen paths that have been interacted with
      if (f.memoryTrace > 0.01) {
         opacity = Math.min(1.0, opacity + (f.memoryTrace * 0.4 * contrastMasterOpacity));
         lineWidthMod += f.memoryTrace * 0.8;
      }
      
      // Add Synaptic Glow (Bioluminescent Cyan/Blue when active)
      opacity = Math.min(1.0, opacity + (f.synapticGlow * 0.8 * contrastMasterOpacity));
      if (f.synapticGlow > 0.1) {
         lineWidthMod += f.synapticGlow * 1.5;
      }

      ctx.globalAlpha = opacity;
      ctx.lineWidth = f.lineWidth * lineWidthMod;
      
      // Bioluminescence, Deep Red Background, and Evolution/Grappling Warning
      let r = 255, g = 255, b = 255;
      
      if (this._evolutionLevel === 3) {
         // Level 3 Apex Predator: Deep Crimson & Black
         r = 200; g = 0; b = 30;
         if (f.synapticGlow > 0.1) {
            r = 255; g = 50; b = 50; // Hot red glow
         }
      } else if (this._evolutionLevel === 2) {
         // Level 2: Gold/Orange
         r = 255; g = 180; b = 50;
         if (f.synapticGlow > 0.1) {
            r = 255; g = 220; b = 100; // Hot gold glow
         }
      } else {
         // Level 1: Cyan
         if (f.synapticGlow > 0.1) {
            r = Math.floor(255 - (f.synapticGlow * 200));
            g = 255;
            b = 255;
         }
      }
      
      // Grappling overrides color to pure aggression
      if (this._isGrappling) {
         r = 255; g = 40; b = 0; // Aggressive Blood Orange / Red warning color
         ctx.globalAlpha = Math.min(1.0, opacity * 1.5);
      } else if (f.isDeepRed) {
         r = 150; g = 10; b = 10; // Deep fleshy red for the background
         ctx.globalAlpha = opacity * 0.7; // Push it further back
      } else if (f.memoryTrace > 0.01 && this._evolutionLevel === 1) {
         b = Math.floor(255 - (f.memoryTrace * 50)); // Gold for memory
      }
      
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.9)`;
      
      ctx.beginPath();
      ctx.moveTo(f.currStartX, f.currStartY);
      ctx.quadraticCurveTo(f.currCpX, f.currCpY, f.currEndX, f.currEndY);
      ctx.stroke();
    }
    
    // Draw Nodes (Visual Hierarchy & Silhouette)
    // Build a clear anatomical hierarchy outward from the brain
    ctx.globalAlpha = contrastMasterOpacity;
    for (let i = 0; i < this._numFibers; i++) {
      const f = this._fibers[i];
      
      // Node position is at the end of the fiber (the peripheral synapse)
      const nx = f.currEndX;
      const ny = f.currEndY;
      
      if (f.hierarchyLevel === 'primary') {
        // Major structural node (Synapse)
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
        // Memory trace permanently enlarges the synapse slightly
        const memBoost = f.memoryTrace * 1.5;
        ctx.arc(nx, ny, 2.5 + (f.synapticGlow * 3.5) + memBoost, 0, Math.PI * 2);
        ctx.fill();
        
        // Confident glowing halo around major nodes
        ctx.beginPath();
        ctx.fillStyle = `rgba(0, 255, 255, ${0.15 + f.synapticGlow * 0.6 + f.memoryTrace * 0.1})`;
        ctx.arc(nx, ny, 8 + (f.synapticGlow * 20) + (memBoost * 2), 0, Math.PI * 2);
        ctx.fill();
      } else if (f.hierarchyLevel === 'secondary') {
        // Medium node
        ctx.globalAlpha = contrastMasterOpacity * Math.min(1.0, 0.7 + f.synapticGlow + f.memoryTrace);
        ctx.beginPath();
        ctx.fillStyle = 'rgba(200, 255, 255, 0.8)';
        ctx.arc(nx, ny, 1.2 + (f.synapticGlow * 1.5) + (f.memoryTrace * 0.8), 0, Math.PI * 2);
        ctx.fill();
      } else if (f.hierarchyLevel === 'tertiary') {
        // Tiny dust node
        ctx.globalAlpha = contrastMasterOpacity * 0.4;
        ctx.beginPath();
        ctx.fillStyle = f.isDeepRed ? 'rgba(150, 10, 10, 0.5)' : 'rgba(255, 255, 255, 0.5)';
        ctx.arc(nx, ny, 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // DRAW ORGANIC MEMBRANE WEBBING (Phase D: The Anomaly)
    // Connects primary/secondary fibers organically to look like wet tissue
    if (this._unravelProgress > 0) {
       ctx.globalAlpha = contrastMasterOpacity * 0.02; // EXTREMELY subtle, doesn't ruin readability
       ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
       for (let i = 0; i < this._numFibers - 1; i++) {
           const f1 = this._fibers[i];
           const f2 = this._fibers[i+1];
           
           if ((f1.hierarchyLevel === 'primary' || f1.hierarchyLevel === 'secondary') && 
               (f2.hierarchyLevel === 'primary' || f2.hierarchyLevel === 'secondary')) {
               
               ctx.beginPath();
               ctx.moveTo(f1.currStartX, f1.currStartY);
               ctx.quadraticCurveTo(f1.currCpX, f1.currCpY, f1.currEndX, f1.currEndY);
               ctx.lineTo(f2.currEndX, f2.currEndY);
               ctx.quadraticCurveTo(f2.currCpX, f2.currCpY, f2.currStartX, f2.currStartY);
               ctx.closePath();
               ctx.fill();
           }
       }
    }
    
    // Render Signal Propagation (Thoughts/Information)
    for (let i = 0; i < this._signals.length; i++) {
        const s = this._signals[i];
        const f = this._fibers[s.fiberIndex];
        if (!f) continue;
        
        // Decisive Head, fading tail
        // 4 segments instead of 6 to make it sharper and cleaner
        for (let k = 0; k < 4; k++) {
            // Trail behind the current progress
            const offset = (k * 0.02) * -s.direction; 
            const t = Math.max(0, Math.min(1, s.progress + offset));
            
            const omt = 1 - t;
            const px = omt * omt * f.currStartX + 2 * omt * t * f.currCpX + t * t * f.currEndX;
            const py = omt * omt * f.currStartY + 2 * omt * t * f.currCpX + t * t * f.currEndY;
            
            // Steep drop off in opacity for tail
            const alpha = s.intensity * masterOpacity * Math.pow(1 - k / 4, 2);
            ctx.beginPath();
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            
            // Decisive Head
            if (k === 0) {
               ctx.shadowBlur = 10;
               ctx.shadowColor = 'rgba(255, 255, 255, 1.0)';
            } else {
               ctx.shadowBlur = 0;
            }
            
            // Tail shrinks drastically
            const baseSize = f.isEmergentHero ? 1.8 : 1.2;
            const size = k === 0 ? baseSize * 2.0 : baseSize * (1.0 - k * 0.25);
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // THE BIG JUMP: The Alien Fleshy Sac (Core Anatomy)
    ctx.globalAlpha = masterOpacity;
    
    // Arrival Pulse: Core slightly brightens and expands when information is received
    const arrivalBright = this._brainArrivalPulse * 0.5;
    
    // Organic metabolic breath for the core size
    const renderTime = performance.now() * 0.001;
    const coreBreath = Math.sin(renderTime * 2.0) * 2.5 + Math.cos(renderTime * 1.3) * 1.5;
    const coreRadius = 32 + coreBreath + (this._brainArrivalPulse * 12.0); // Much larger body
    
    // 1. The Outer Translucent Membrane (Fleshy Sac)
    ctx.beginPath();
    
    // Shift sac color based on Evolution and Grappling
    if (this._isGrappling) {
       ctx.fillStyle = `rgba(40, 10, 0, ${0.7 + arrivalBright})`;
       ctx.strokeStyle = `rgba(255, 80, 0, ${0.8 + arrivalBright})`;
       ctx.shadowColor = 'rgba(255, 100, 0, 0.8)';
    } else if (this._evolutionLevel === 3) {
       ctx.fillStyle = `rgba(40, 0, 10, ${0.8 + arrivalBright})`; // Deep crimson sac
       ctx.strokeStyle = `rgba(200, 0, 50, ${0.5 + arrivalBright})`;
       ctx.shadowColor = 'rgba(200, 0, 50, 0.6)';
    } else if (this._evolutionLevel === 2) {
       ctx.fillStyle = `rgba(35, 25, 0, ${0.7 + arrivalBright})`; // Gold sac
       ctx.strokeStyle = `rgba(255, 180, 0, ${0.5 + arrivalBright})`;
       ctx.shadowColor = 'rgba(255, 180, 0, 0.6)';
    } else {
       ctx.fillStyle = `rgba(10, 25, 35, ${0.7 + arrivalBright})`;
       ctx.strokeStyle = `rgba(0, 200, 255, ${0.4 + arrivalBright})`;
       ctx.shadowColor = 'rgba(0, 200, 255, 0.6)';
    }
    
    ctx.lineWidth = 2.0;
    ctx.shadowBlur = 30 + (this._brainArrivalPulse * 20);
    
    // Draw an imperfect, undulating circular membrane
    for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.2) {
       const noise = Math.sin(a * 4 + renderTime * 3) * 4.0 + Math.cos(a * 7 - renderTime * 2) * 2.0;
       const rx = this._brainX + Math.cos(a) * (coreRadius + noise);
       const ry = this._brainY + Math.sin(a) * (coreRadius + noise);
       if (a === 0) ctx.moveTo(rx, ry);
       else ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // 2. The Inner Embryo / Yolk (Tracks Cursor heavily)
    const bdx = this._cursorX - this._brainX;
    const bdy = this._cursorY - this._brainY;
    const bDist = Math.sqrt(bdx * bdx + bdy * bdy);
    const maxEmbryoShift = coreRadius * 0.45; // Moves around inside the sac
    const px = bDist > 0 ? (bdx / bDist) * maxEmbryoShift : 0;
    const py = bDist > 0 ? (bdy / bDist) * maxEmbryoShift : 0;
    
    ctx.beginPath();
    // Shift embryo color based on evolution & grapple
    if (this._isGrappling) {
       ctx.fillStyle = `rgba(255, 150, 0, ${0.9 + arrivalBright})`;
       ctx.shadowColor = `rgba(255, 100, 0, 1.0)`;
    } else if (this._evolutionLevel === 3) {
       ctx.fillStyle = `rgba(255, 50, 50, ${0.9 + arrivalBright})`;
       ctx.shadowColor = `rgba(255, 0, 0, 1.0)`;
    } else if (this._evolutionLevel === 2) {
       ctx.fillStyle = `rgba(255, 200, 100, ${0.9 + arrivalBright})`;
       ctx.shadowColor = `rgba(255, 180, 0, 1.0)`;
    } else {
       ctx.fillStyle = `rgba(0, 255, 255, ${0.9 + arrivalBright})`;
       ctx.shadowColor = 'rgba(0, 200, 255, 1.0)';
    }
    
    ctx.shadowBlur = 20;
    ctx.arc(this._brainX + px, this._brainY + py, 10 + (this._brainArrivalPulse * 5.0) + (this._evolutionLevel * 2), 0, Math.PI * 2);
    ctx.fill();
    
    // 3. Dense Inner Capillary Network (Veins connecting embryo to sac walls)
    ctx.beginPath();
    ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
    ctx.lineWidth = 1.0;
    ctx.shadowBlur = 0;
    for (let a = 0; a < Math.PI * 2; a += 0.6) {
       const startVeinX = this._brainX + px + Math.cos(a) * 10;
       const startVeinY = this._brainY + py + Math.sin(a) * 10;
       const endVeinX = this._brainX + Math.cos(a + 0.4) * coreRadius;
       const endVeinY = this._brainY + Math.sin(a + 0.4) * coreRadius;
       
       ctx.moveTo(startVeinX, startVeinY);
       ctx.quadraticCurveTo(
           this._brainX + Math.cos(a - 0.5) * coreRadius * 0.5,
           this._brainY + Math.sin(a - 0.5) * coreRadius * 0.5,
           endVeinX, endVeinY
       );
    }
    ctx.stroke();
    
    ctx.restore();
  }
}
