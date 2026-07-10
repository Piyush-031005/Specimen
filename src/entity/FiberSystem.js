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
    
    // The resting line occupies exactly 80% of the screen height, feeling present but contained
    const baseStartY = cy - (h * 0.4);
    const baseEndY = cy + (h * 0.4);

    for (let i = 0; i < this._numFibers; i++) {
      let startX, startY, endX, endY;

      // The organism is larger than the screen. Anchors originate off-screen.
      // 80% of fibers anchor far beyond top/bottom poles. 20% anchor far beyond the sides.
      if (Math.random() < 0.8) {
        // Vertical-ish fibers
        startX = randomFloat(cx - w * 0.4, cx + w * 0.4);
        startY = baseStartY - randomFloat(h * 0.5, h * 1.5);
        endX = randomFloat(cx - w * 0.4, cx + w * 0.4);
        endY = baseEndY + randomFloat(h * 0.5, h * 1.5);
      } else {
        // Horizontal-ish fibers (creates width in the body)
        startX = cx - randomFloat(w * 0.8, w * 1.5);
        startY = randomFloat(baseStartY, baseEndY);
        endX = cx + randomFloat(w * 0.8, w * 1.5);
        endY = randomFloat(baseStartY, baseEndY);
      }
      
      // Visual Hierarchy: No permanent hero. 2% are 'Emergent Heroes' that only appear during tension.
      const isEmergentHero = Math.random() < 0.02;
      const lineWidth = randomFloat(0.2, 0.4); // Barely perceptible normally
      const baseOpacity = randomFloat(0.01, 0.03); // Barely perceptible normally

      this._fibers.push({
        tStartX: startX,
        tStartY: startY,
        tEndX: endX,
        tEndY: endY,
        
        isEmergentHero,
        lineWidth,
        baseOpacity,
        
        // Control point offset target (the "knot" in the center)
        cpOffsetX: randomFloat(-w * 0.4, w * 0.4),
        cpOffsetY: randomFloat(-h * 0.4, h * 0.4),
        
        phase: randomFloat(0, Math.PI * 2),
        speed: randomFloat(0.5, 2.0),
        
        // Current animated values
        currStartX: cx,
        currStartY: -50,
        currEndX: cx,
        currEndY: h + 50,
        currCpX: cx,
        currCpY: cy,
        
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
      const targetStartX = lerp(cx, lerp(cx, f.tStartX, tensionMod), this._unravelProgress);
      const targetStartY = lerp(baseStartY, lerp(cy, f.tStartY, tensionMod), this._unravelProgress);
      const targetEndX = lerp(cx, lerp(cx, f.tEndX, tensionMod), this._unravelProgress);
      const targetEndY = lerp(baseEndY, lerp(cy, f.tEndY, tensionMod), this._unravelProgress);
      
      f.currStartX = targetStartX + (this._unravelProgress === 0 ? globalVibrationX : 0);
      f.currStartY = targetStartY;
      f.currEndX = targetEndX + (this._unravelProgress === 0 ? globalVibrationX : 0);
      f.currEndY = targetEndY;
      
      // Intrusive Cursor: The user is trespassing. Fibers bend OUT OF THE WAY to accommodate the intrusion.
      // We calculate distance from the unraveled control point to the cursor.
      let unraveledCpX = cx + (f.cpOffsetX * tensionMod) + (f.cpOffsetX * this._recoilOvershoot);
      let unraveledCpY = cy + (f.cpOffsetY * tensionMod) + (f.cpOffsetY * this._recoilOvershoot);
      
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
      ctx.globalAlpha = 0.02 * masterOpacity; // Extremely faint presence
      ctx.fillStyle = COLORS.WARM_WHITE;
      
      // A subtle shimmer composed of a few tiny dots near the center that twitch organically
      const shimmerT = performance.now() * 0.002;
      for (let i = 0; i < 5; i++) {
         const nx = cx + (Math.sin(shimmerT * (i + 1) * 1.3) * 25);
         const ny = cy + (Math.cos(shimmerT * (i + 2) * 1.7) * 25);
         
         ctx.beginPath();
         ctx.arc(nx, ny, 1.0, 0, Math.PI * 2);
         ctx.fill();
      }
      ctx.restore();
      return; // Do not render the core line or fibers yet
    }

    ctx.save();
    ctx.globalAlpha = masterOpacity * 0.4; // Soften fibers so they blend
    ctx.strokeStyle = COLORS.WARM_WHITE;
    ctx.globalCompositeOperation = 'screen';
    
    // When not unraveled, we draw a thicker central core to feel physically present
    if (this._unravelProgress === 0) {
      // Find the first fiber to use as the base for the line
      const base = this._fibers[0];
      ctx.globalAlpha = masterOpacity;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(245, 240, 232, 0.9)';
      ctx.shadowColor = 'rgba(245, 240, 232, 0.5)';
      ctx.shadowBlur = 10;
      
      ctx.beginPath();
      ctx.moveTo(base.currStartX, base.currStartY);
      // Optional: slight bezier curve even in base line to make tension visible
      ctx.quadraticCurveTo(base.currCpX, base.currCpY, base.currEndX, base.currEndY);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Unraveled rendering
    ctx.shadowBlur = 0; // Disable shadow for performance and crispness
    ctx.beginPath();
    

    for (let i = 0; i < this._numFibers; i++) {
      const f = this._fibers[i];
      // Modulate opacity by unravel progress, and CRITICALLY by standoff/recoil if it's an emergent hero.
      let opacity = f.baseOpacity * masterOpacity * (0.1 + this._unravelProgress * 0.9);
      let lineWidthMod = temperament < 0 
        ? 1.0 + (Math.abs(temperament) * 0.5) 
        : 1.0 - (temperament * 0.2);
        
      // Emergent Hero Logic: Only lights up when the environment demands it
      if (f.isEmergentHero) {
         const tensionSpike = Math.max(standoffIntensity, (this._recoilOvershoot && this._recoilOvershoot > 0) ? 1.0 : 0);
         if (tensionSpike > 0) {
            opacity += tensionSpike * 0.8; // Spikes to 80% opacity
            lineWidthMod += tensionSpike * 5.0; // Spikes to 2.0+ width
         }
      }

      // Mutual Hesitation Standoff Effects
      let jitterX = 0;
      let jitterY = 0;
      if (standoffIntensity > 0) {
         if (standoffContext === 'suspicion') {
            // Trembling standoff
            jitterX = (Math.random() - 0.5) * standoffIntensity * 4.0;
            lineWidthMod *= (1.0 + standoffIntensity * 0.3); // Thicker with tension
         } else if (standoffContext === 'curiosity') {
            // Reaching out slowly
            lineWidthMod *= (1.0 - standoffIntensity * 0.2); // Thinner, more delicate
         }
      }

      ctx.globalAlpha = opacity;
      ctx.lineWidth = f.lineWidth * lineWidthMod;
      ctx.strokeStyle = 'rgba(245, 240, 232, 1)';
      
      ctx.beginPath();
      ctx.moveTo(f.currStartX, f.currStartY);
      
      // Editor's Cut: Fracture the line during extreme tension so it doesn't look like a bezier curve
      const isExtremeTension = (f.isEmergentHero && Math.max(standoffIntensity, (this._recoilOvershoot && this._recoilOvershoot > 0) ? 1.0 : 0) > 0.5);
      
      if (isExtremeTension) {
         // Draw a fractured line with a sharp, jittery vertex
         ctx.lineTo(f.currCpX + jitterX + (Math.random() - 0.5) * 20, f.currCpY + jitterY + (Math.random() - 0.5) * 20);
         ctx.lineTo(f.currEndX, f.currEndY);
      } else {
         // Smooth curve for calm state
         ctx.quadraticCurveTo(f.currCpX + jitterX, f.currCpY + jitterY, f.currEndX, f.currEndY);
      }
      
      ctx.stroke();
    }
    
    ctx.restore();
  }
}
