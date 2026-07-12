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
    this._isGrappling = false;
    this._evolutionLevel = 1;
    this._brainArrivalPulse = 0;
    this._globalSignalDim = 0;
    this._recoilOvershoot = 0;
    this._unravelStartTime = 0;
    
    // Level 3 Web Weaving
    this._webs = [];
    this._webTimer = 0;

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
      
      // Keep _unravelProgress at 1.0 - organism stays visible during mutation
      // _generateFibers() will rebuild the anatomy for the new level
      this._generateFibers();
  }

  rebuildCache() {
    // Re-generate anchor points based on new screen size
    this._generateFibers();
  }

  _generateFibers() {
    this._fibers = [];
    
    const cx = this._coords.center.x;
    const cy = this._coords.center.y;
    
    // helper for pushing fiber data
    const pushFiber = (startX, startY, endX, endY, absCpX, absCpY, angle, isHero, hierarchy, radiusMod, baseW) => {
        let lineWidth = hierarchy === 'primary' ? randomFloat(1.5, 2.5) : (hierarchy === 'secondary' ? randomFloat(0.4, 0.8) : randomFloat(0.1, 0.3));
        let baseOpacity = hierarchy === 'primary' ? randomFloat(0.3, 0.5) : (hierarchy === 'secondary' ? randomFloat(0.1, 0.2) : randomFloat(0.02, 0.05));
        
        this._fibers.push({
            tStartX: startX,
            tStartY: startY,
            tEndX: endX,
            tEndY: endY,
            angle: Math.atan2(endY - cy, endX - cx),
            isEmergentHero: isHero,
            hierarchyLevel: hierarchy,
            lineWidth,
            baseOpacity,
            z: randomFloat(-1.0, 1.0),
            isDeepRed: randomFloat(0, 1) < (this._evolutionLevel === 3 ? 0.35 : 0.08),
            cpOffsetX: absCpX - cx,
            cpOffsetY: absCpY - cy,
            phase: randomFloat(0, Math.PI * 2),
            speed: randomFloat(0.5, 2.0),
            currStartX: cx, currStartY: cy, currEndX: cx, currEndY: cy, currCpX: cx, currCpY: cy,
            memoryTrace: 0, synapticGlow: 0, phantomTwitchTimer: 0, phantomTwitchX: 0,
            lastSignalTime: 0
        });
    };

    // LEVEL 3: THE APEX PREDATOR (GIANT SPIDER MORPHOLOGY)
    if (this._evolutionLevel === 3) {
        // ═══ LEVEL 3: MECHA-SPIDER APEX PREDATOR ═══
        // Inspired by mechanical spider concept art:
        //   - 8 long articulated legs with sharp knee joints
        //   - Central body mass with abdomen
        //   - Circuit-like internal webbing
        //   - The legs SPAN the screen
        
        const legReach = Math.min(this._coords.cssWidth, this._coords.cssHeight) * 0.42;
        
        // 8 Symmetrical spider legs (4 per side, evenly spaced)
        const legAngles = [
            -Math.PI * 0.15, -Math.PI * 0.35, -Math.PI * 0.55, -Math.PI * 0.75, // Right side (angled down-right to up-right)
             Math.PI * 0.15,  Math.PI * 0.35,  Math.PI * 0.55,  Math.PI * 0.75  // Left side (mirrored)
        ];
        
        // Each leg is TWO segments: shoulder→knee, knee→foot
        // We use bundles of parallel lines (hatching) for a dense, illustrative look.
        for (let i = 0; i < 8; i++) {
            const angle = legAngles[i];
            const isRight = i < 4;
            
            // Shoulder (near body)
            const shoulderX = cx + Math.cos(angle) * 15;
            const shoulderY = cy + Math.sin(angle) * 15;
            
            // Knee
            const kneeReach = legReach * 0.45;
            const kneeX = cx + Math.cos(angle) * kneeReach;
            const kneeY = cy + Math.sin(angle) * kneeReach;
            
            // Foot
            const footX = cx + Math.cos(angle) * legReach;
            const footY = cy + Math.sin(angle) * legReach;
            
            const perpX = -Math.sin(angle);
            const perpY = Math.cos(angle);
            
            // Generate 4 parallel hatched lines for each leg segment
            for (let hatch = -1.5; hatch <= 1.5; hatch += 1.0) {
                const hatchOffset = hatch * 4.0; // Distance between parallel lines
                
                // Upper leg
                const upperMidX = (shoulderX + kneeX) / 2;
                const upperMidY = (shoulderY + kneeY) / 2;
                const upperBow = (isRight ? -1 : 1) * legReach * 0.12;
                
                pushFiber(
                    shoulderX + perpX * hatchOffset * 0.3, shoulderY + perpY * hatchOffset * 0.3,
                    kneeX + perpX * hatchOffset, kneeY + perpY * hatchOffset,
                    upperMidX + perpX * (upperBow + hatchOffset), upperMidY + perpY * (upperBow + hatchOffset),
                    angle, true, 'primary', 1.0, legReach
                );
                
                // Lower leg
                const lowerMidX = (kneeX + footX) / 2;
                const lowerMidY = (kneeY + footY) / 2;
                const lowerBow = (isRight ? 1 : -1) * legReach * 0.18;
                
                pushFiber(
                    kneeX + perpX * hatchOffset, kneeY + perpY * hatchOffset,
                    footX + perpX * hatchOffset * 0.1, footY + perpY * hatchOffset * 0.1, // Taper at the foot
                    lowerMidX + perpX * (lowerBow + hatchOffset), lowerMidY + perpY * (lowerBow + hatchOffset),
                    angle, true, 'primary', 1.0, legReach
                );
            }
        }
        
        // Central body mass — dense radial fibers forming the "thorax"
        const bodyRadius = legReach * 0.15;
        for (let i = 0; i < 40; i++) {
            const angle = (Math.PI * 2 / 40) * i;
            const startX = cx;
            const startY = cy;
            const endX = cx + Math.cos(angle) * bodyRadius;
            const endY = cy + Math.sin(angle) * bodyRadius;
            const cpX = (startX + endX) / 2 + randomFloat(-15, 15);
            const cpY = (startY + endY) / 2 + randomFloat(-15, 15);
            pushFiber(startX, startY, endX, endY, cpX, cpY, angle, false, 'secondary', 1.0, bodyRadius);
        }
        
        // Circuit-board webbing between legs (connecting adjacent leg joints)
        for (let i = 0; i < 8; i++) {
            const a1 = legAngles[i];
            const a2 = legAngles[(i + 1) % 8];
            for (let j = 0; j < 3; j++) {
                const r1 = legReach * randomFloat(0.2, 0.7);
                const r2 = legReach * randomFloat(0.2, 0.7);
                const x1 = cx + Math.cos(a1) * r1;
                const y1 = cy + Math.sin(a1) * r1;
                const x2 = cx + Math.cos(a2) * r2;
                const y2 = cy + Math.sin(a2) * r2;
                pushFiber(x1, y1, x2, y2, cx, cy, (a1 + a2) / 2, false, 'tertiary', 0.3, legReach);
            }
        }
        
        // Ambient nerve strands radiating from body (much higher quantity)
        for (let i = 0; i < 40; i++) {
            const angle = randomFloat(0, Math.PI * 2);
            const reach = randomFloat(0.15, 0.45);
            const endX = cx + Math.cos(angle) * (legReach * reach);
            const endY = cy + Math.sin(angle) * (legReach * reach);
            pushFiber(cx, cy, endX, endY, endX + randomFloat(-25, 25), endY + randomFloat(-25, 25), angle, false, 'tertiary', 0.2, legReach);
        }
        
        this._numFibers = this._fibers.length;
        return;
    }
    
    // LEVEL 2: STRETCHING WILD BRANCHES
    if (this._evolutionLevel === 2) {
        this._numFibers = 12 + 20; // 12 reaching, 20 ambient
        const baseW = this._coords.cssWidth * 0.25; // Stretches far
        const baseH = this._coords.cssHeight * 0.25;
        
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i + randomFloat(-0.2, 0.2);
            const startX = cx + Math.cos(angle) * 10;
            const startY = cy + Math.sin(angle) * 10;
            // Stretch wildly and asymmetrically
            const endX = cx + Math.cos(angle) * baseW * randomFloat(0.8, 1.6);
            const endY = cy + Math.sin(angle) * baseH * randomFloat(0.8, 1.6);
            
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            const normalX = -Math.sin(angle);
            const normalY = Math.cos(angle);
            const bendMag = baseW * 0.4 * randomFloat(-1, 1); // chaotic curves
            
            const cpX = midX + normalX * bendMag;
            const cpY = midY + normalY * bendMag;
            
            pushFiber(startX, startY, endX, endY, cpX, cpY, angle, true, 'primary', 1.0, baseW);
        }
        for (let i = 0; i < 20; i++) {
            const angle = randomFloat(0, Math.PI * 2);
            const reach = randomFloat(0.3, 0.9);
            const endX = cx + Math.cos(angle) * baseW * reach;
            const endY = cy + Math.sin(angle) * baseH * reach;
            const cpX = (cx + endX) / 2 + randomFloat(-20, 20);
            const cpY = (cy + endY) / 2 + randomFloat(-20, 20);
            pushFiber(cx, cy, endX, endY, cpX, cpY, angle, false, 'secondary', 0.8, baseW);
        }
        return;
    }
    
    // LEVEL 1: TINY GLOWING SEED/NODE
    this._numFibers = 5 + 15; // 5 primary, 15 ambient
    const baseW = this._coords.cssWidth * 0.05; // Extremely small core
    const baseH = this._coords.cssHeight * 0.05;
    
    for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 / 5) * i;
        const startX = cx; const startY = cy;
        const endX = cx + Math.cos(angle) * baseW;
        const endY = cy + Math.sin(angle) * baseH;
        const cpX = (startX + endX) / 2 + randomFloat(-10, 10);
        const cpY = (startY + endY) / 2 + randomFloat(-10, 10);
        pushFiber(startX, startY, endX, endY, cpX, cpY, angle, true, 'primary', 1.0, baseW);
    }
    for (let i = 0; i < 15; i++) {
        const angle = randomFloat(0, Math.PI * 2);
        const reach = randomFloat(0.2, 1.2); // some short hairs
        const endX = cx + Math.cos(angle) * baseW * reach;
        const endY = cy + Math.sin(angle) * baseH * reach;
        pushFiber(cx, cy, endX, endY, cx, cy, angle, false, 'tertiary', 0.5, baseW);
    }
    
    // Sort fibers by angle for Level 1 so rendering doesn't flicker oddly
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
    // FORCE: Always fully unraveled - bypass intro animation
    this._unravelProgress = 1.0;
    isUnraveled = true;
    
    // Track cursor for render. Fallback to center to prevent NaN if undefined.
    this._cursorX = targetCpX !== undefined ? targetCpX : this._coords.center.x;
    this._cursorY = targetCpY !== undefined ? targetCpY : this._coords.center.y;
    
    // Delayed cursor for network reaction (Eye reacts instantly, network lags ~100ms)
    this._glowCursorX = expDecay(this._glowCursorX, this._cursorX, 10.0, deltaSeconds);
    this._glowCursorY = expDecay(this._glowCursorY, this._cursorY, 10.0, deltaSeconds);
    
    // Determine target progress
    let targetProgress = 1.0; // Always fully unraveled
    
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

    // DISABLED: pluckPhase was resetting unravelProgress to 0, making the organism collapse
    // if (pluckPhase === 'tension' || pluckPhase === 'freeze') {
    //   targetProgress = 0.0;
    //   globalSpringSpeed = 30.0;
    // }

    // DISABLED: expDecay was fighting the forced 1.0 and pushing it back to 0
    // this._unravelProgress = expDecay(this._unravelProgress, targetProgress, globalSpringSpeed, deltaSeconds);
    
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
            // getHistoricalTension doesn't exist yet, so we default to 0 to prevent crashes
            const tension = 0;
            
            if (tension > 0.05) {
               // High tension memory - twitch
               if (Math.random() < 0.0005 * tension) {
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
      const targetEndX = lerp(cx, lerp(this._brainX, f.tEndX, tensionMod), this._unravelProgress) + parallaxX;
      const targetEndY = lerp(baseEndY, lerp(this._brainY, f.tEndY, tensionMod), this._unravelProgress) + parallaxY;
      
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
      const nowSec = performance.now() * 0.001;
      if (f.synapticGlow > 0.5 && f.isEmergentHero && isUnraveled) {
         if (nowSec - f.lastSignalTime > 2.0) { // Max one signal every 2s per fiber
            f.lastSignalTime = nowSec;
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
      // Use the actual target start point so complex multi-joint structures (like the spider) hold together.
      let unraveledCpX = targetStartX + (f.cpOffsetX * tensionMod) + (f.cpOffsetX * this._recoilOvershoot);
      let unraveledCpY = targetStartY + (f.cpOffsetY * tensionMod) + (f.cpOffsetY * this._recoilOvershoot);
      
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
      let breath = this._calculateMetabolicBreath(nowSec, f.speed, f.phase) * 8 * this._unravelProgress;
      
      // Calculate a drifting Center of Gravity for this fiber's breath
      // Different fibers have slightly different sensitivities to the drift to create mass asymmetry
      const cgDriftX = Math.sin(nowSec * 0.3 + f.phase) * 80;
      const cgDriftY = Math.cos(nowSec * 0.4 + f.phase) * 80;
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
      let wriggleX = Math.cos(nowSec * f.speed * 2.0 + f.phase) * (f.hierarchyLevel === 'tissue' ? 30 : 12);
      let wriggleY = Math.sin(nowSec * f.speed * 2.5 + f.phase) * (f.hierarchyLevel === 'tissue' ? 30 : 12);
      
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

    // Level 3 Webbing Mechanics
    if (this._evolutionLevel === 3) {
        this._webTimer -= deltaSeconds;
        if (this._webTimer <= 0 && this._webs.length < 15) {
            this._webTimer = randomFloat(1.5, 3.5);
            this._shootWeb();
        }
        for (let i = this._webs.length - 1; i >= 0; i--) {
            this._webs[i].progress += 0.016 * 0.5; // Simulate life progress
            if (this._webs[i].progress >= 1.0) this._webs.splice(i, 1);
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
   * Level 3 ability: Shoots a web to anchor to the screen bounds
   */
  _shootWeb() {
      // Pick a random edge (0: top, 1: right, 2: bottom, 3: left)
      const edge = Math.floor(Math.random() * 4);
      let targetX, targetY;
      
      const w = this._coords.cssWidth;
      const h = this._coords.cssHeight;
      
      if (edge === 0) { targetX = randomFloat(0, w); targetY = 0; }
      else if (edge === 1) { targetX = w; targetY = randomFloat(0, h); }
      else if (edge === 2) { targetX = randomFloat(0, w); targetY = h; }
      else { targetX = 0; targetY = randomFloat(0, h); }
      
      this._webs.push({
          x: targetX,
          y: targetY,
          progress: 0,
          speed: randomFloat(2.0, 5.0)
      });
  }

  /**
   * Render the fibers
   */
  render(ctx, masterOpacity, cx, cy, introState, temperament = 0.0, standoffIntensity = 0, standoffContext = null) {
    if (masterOpacity <= 0.001) return;

    // FORCE: Always fully unraveled - bypass all intro animation guards
    this._unravelProgress = 1.0;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over'; 
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // UNRAVELED NEURAL ORGANISM (Readability Polish)
    ctx.shadowBlur = 0; // Disable shadow for extreme sharpness
    
    // Dim the entire organism slightly when a thought travels to guide the eye
    const contrastMasterOpacity = masterOpacity * (1.0 - (this._globalSignalDim || 0));

    // Draw Fibers
    for (let i = 0; i < this._numFibers; i++) {
      const f = this._fibers[i];
      
      let r = 255, g = 255, b = 255;
      let opacity = 0.6;
      let lineWidth = 0.8; // Thin elegant default
      
      if (f.isEmergentHero) {
         lineWidth = 1.2; // Primary fibers slightly thicker
         opacity = 0.9;
      }
      
      if (this._evolutionLevel === 2) {
         r = 255; g = 180; b = 0; // Gold
         lineWidth *= 1.3;
      } else if (this._evolutionLevel === 3) {
         // Mecha-spider: thin sharp crimson lines with glow
         if (f.hierarchyLevel === 'primary') {
            r = 220; g = 20; b = 40;
            lineWidth = 1.5; // Thin but visible legs
            opacity = 1.0;
         } else if (f.hierarchyLevel === 'secondary') {
            r = 180; g = 0; b = 20; // Darker body mass
            lineWidth = 0.8;
            opacity = 0.7;
         } else {
            r = 100; g = 0; b = 15; // Very faint circuit webbing
            lineWidth = 0.3;
            opacity = 0.4;
         }
      }
      
      // Synapse glow override
      if (f.synapticGlow > 0.1) {
         opacity = Math.min(1.0, opacity + f.synapticGlow * 0.5);
         lineWidth += f.synapticGlow * 1.0;
      }
      
      // Failsafe NaN guard
      const safeX = (val) => isNaN(val) ? cx : val;
      const safeY = (val) => isNaN(val) ? cy : val;
      
      const sx = safeX(f.currStartX);
      const sy = safeY(f.currStartY);
      const cpx = safeX(f.currCpX);
      const cpy = safeY(f.currCpY);
      const ex = safeX(f.currEndX);
      const ey = safeY(f.currEndY);

      if (this._evolutionLevel === 3) {
         // ANAGLYPH 3D OFFSET RENDERING
         // Render Red Channel (Right Shift)
         ctx.globalCompositeOperation = 'screen';
         ctx.globalAlpha = opacity * masterOpacity * 0.9;
         ctx.lineWidth = lineWidth * 0.8;
         ctx.strokeStyle = `rgba(255, 20, 40, ${opacity})`;
         
         const shiftX = (this._cursorX - cx) * 0.005 + 2; // Dynamic 3D offset
         
         ctx.beginPath();
         ctx.moveTo(sx + shiftX, sy);
         ctx.quadraticCurveTo(cpx + shiftX, cpy, ex + shiftX, ey);
         ctx.stroke();
         
         // Render Cyan/Blue Channel (Left Shift)
         ctx.strokeStyle = `rgba(20, 200, 255, ${opacity * 0.8})`;
         ctx.beginPath();
         ctx.moveTo(sx - shiftX, sy);
         ctx.quadraticCurveTo(cpx - shiftX, cpy, ex - shiftX, ey);
         ctx.stroke();
         
         ctx.globalCompositeOperation = 'source-over';
      } else {
         // STANDARD RENDERING (Levels 1 & 2)
         ctx.globalAlpha = opacity * masterOpacity;
         ctx.lineWidth = lineWidth;
         ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
         
         ctx.beginPath();
         ctx.moveTo(sx, sy);
         ctx.quadraticCurveTo(cpx, cpy, ex, ey);
         ctx.stroke();
      }
    }
    
    // Level 3: Central body mass (Anaglyph geometric core instead of soft orb)
    if (this._evolutionLevel === 3) {
      const bodyR = Math.min(this._coords.cssWidth, this._coords.cssHeight) * 0.04;
      const shiftX = (this._cursorX - cx) * 0.005 + 3;
      
      ctx.globalCompositeOperation = 'screen';
      
      // Red Core
      ctx.globalAlpha = masterOpacity * 0.8;
      ctx.fillStyle = 'rgba(255, 0, 30, 0.7)';
      ctx.beginPath();
      ctx.moveTo(cx + shiftX, cy - bodyR);
      ctx.lineTo(cx + shiftX + bodyR, cy);
      ctx.lineTo(cx + shiftX, cy + bodyR);
      ctx.lineTo(cx + shiftX - bodyR, cy);
      ctx.fill();
      
      // Cyan Core
      ctx.fillStyle = 'rgba(0, 200, 255, 0.6)';
      ctx.beginPath();
      ctx.moveTo(cx - shiftX, cy - bodyR);
      ctx.lineTo(cx - shiftX + bodyR, cy);
      ctx.lineTo(cx - shiftX, cy + bodyR);
      ctx.lineTo(cx - shiftX - bodyR, cy);
      ctx.fill();
      
      ctx.globalCompositeOperation = 'source-over';
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
          if (this._evolutionLevel === 3) {
             // Anaglyph geometric crosshatch for apex joints instead of orbs
             const shiftX = (this._cursorX - cx) * 0.005 + 1.5;
             ctx.globalCompositeOperation = 'screen';
             
             // Red joint
             ctx.strokeStyle = 'rgba(255, 40, 60, 0.9)';
             ctx.lineWidth = 1.0;
             ctx.beginPath();
             ctx.moveTo(nx + shiftX - 4, ny - 4); ctx.lineTo(nx + shiftX + 4, ny + 4);
             ctx.moveTo(nx + shiftX + 4, ny - 4); ctx.lineTo(nx + shiftX - 4, ny + 4);
             ctx.stroke();
             
             // Cyan joint
             ctx.strokeStyle = 'rgba(0, 200, 255, 0.7)';
             ctx.beginPath();
             ctx.moveTo(nx - shiftX - 4, ny - 4); ctx.lineTo(nx - shiftX + 4, ny + 4);
             ctx.moveTo(nx - shiftX + 4, ny - 4); ctx.lineTo(nx - shiftX - 4, ny + 4);
             ctx.stroke();
             
             ctx.globalCompositeOperation = 'source-over';
          } else {
             ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
             const memBoost = f.memoryTrace * 1.5;
             ctx.arc(nx, ny, 2.5 + (f.synapticGlow * 3.5) + memBoost, 0, Math.PI * 2);
             ctx.fill();
             
             // Glowing halo
             ctx.beginPath();
             ctx.fillStyle = `rgba(0, 255, 255, ${0.15 + f.synapticGlow * 0.6 + f.memoryTrace * 0.1})`;
             ctx.arc(nx, ny, 8 + (f.synapticGlow * 20) + (memBoost * 2), 0, Math.PI * 2);
             ctx.fill();
          }
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

    // Draw Level 3 Web Anchors
    if (this._evolutionLevel === 3 && this._webs.length > 0) {
        ctx.globalCompositeOperation = 'screen';
        const shiftX = (this._cursorX - cx) * 0.005 + 1.5;
        
        for (let w of this._webs) {
            const startX = cx; // From the core
            const startY = cy;
            const endX = lerp(startX, w.x, w.progress);
            const endY = lerp(startY, w.y, w.progress);
            
            ctx.lineWidth = 0.5;
            ctx.globalAlpha = w.progress * 0.6 * masterOpacity;
            
            // Red web thread
            ctx.strokeStyle = `rgba(255, 20, 40, ${ctx.globalAlpha})`;
            ctx.beginPath();
            ctx.moveTo(startX + shiftX, startY);
            ctx.lineTo(endX + shiftX, endY);
            ctx.stroke();
            
            // Cyan web thread
            ctx.strokeStyle = `rgba(20, 200, 255, ${ctx.globalAlpha * 0.8})`;
            ctx.beginPath();
            ctx.moveTo(startX - shiftX, startY);
            ctx.lineTo(endX - shiftX, endY);
            ctx.stroke();
        }
    }
    
    ctx.restore();
  }
}
