/**
 * SPECIMEN — FiberSystem
 *
 * An illusion-first approach to digital anatomy.
 * Not a rigid body constraint solver. Uses simple interpolated quadratic beziers
 * to create the overwhelming visual feeling of a living nervous system.
 */

import { COLORS } from '../constants.js';
import { randomFloat, lerp, expDecay } from '../utils/MathUtils.js';

export class FiberSystem {
  constructor(coords) {
    this._coords = coords;
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
      
      // Visual Hierarchy: 15% are Arterial (thick, strong), 85% are Capillary (thin, faint)
      const isArterial = Math.random() < 0.15;
      const lineWidth = isArterial ? randomFloat(1.2, 1.8) : randomFloat(0.2, 0.5);
      const baseOpacity = isArterial ? randomFloat(0.5, 0.8) : randomFloat(0.1, 0.2);

      this._fibers.push({
        tStartX: startX,
        tStartY: startY,
        tEndX: endX,
        tEndY: endY,
        
        isArterial,
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
        currCpY: cy
      });
    }
  }

  /**
   * Update fiber physics
   */
  update(deltaSeconds, isUnraveled, targetCpX, targetCpY, behaviorState, isCursorStill, isReturningVisitor, pluckPhase) {
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
    let recoilOvershoot = 0;
    if (isUnraveled && timeSinceUnravel < 400) {
      // Violent spike to 1.5x scale in the first 150ms, then slams back to 1.0
      const t = timeSinceUnravel / 400; // 0 to 1
      recoilOvershoot = Math.sin(t * Math.PI) * (1 - t) * 1.5; 
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

    // Tension Phase: The Taut Wire Vibrates
    let globalVibrationX = 0;
    if (pluckPhase === 'tension') {
      globalVibrationX = (Math.random() - 0.5) * 12.0; // Harsh, erratic vibration
    }
    
    // Curiosity Phase: The occasional twitch (before pluck)
    if (pluckPhase === 'idle' && this._unravelProgress === 0) {
      if (Math.random() < 0.02) { // 2% chance per frame to twitch
        globalVibrationX = (Math.random() - 0.5) * 4.0;
      }
    }
    
    for (let i = 0; i < this._numFibers; i++) {
      const f = this._fibers[i];
      
      // Behavior overrides
      let finalTargetCpX = targetCpX;
      let finalTargetCpY = targetCpY;
      let breathMod = 1.0;
      let tensionMod = 1.0;
      let hierarchyMod = f.isArterial ? 1.2 : 0.8; // Arterial fibers react stronger

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
      let unraveledCpX = cx + (f.cpOffsetX * tensionMod) + (f.cpOffsetX * recoilOvershoot);
      let unraveledCpY = cy + (f.cpOffsetY * tensionMod) + (f.cpOffsetY * recoilOvershoot);
      
      if (isUnraveled && pluckPhase !== 'freeze') {
        const dx = unraveledCpX - finalTargetCpX;
        const dy = unraveledCpY - finalTargetCpY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // If cursor gets too close, the fiber forcefully pushes away (Intrusion reaction)
        const threshold = f.isArterial ? 250 : 150;
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
      
      // Add subtle breathing noise (mostly static, minimal life)
      let breath = Math.sin(performance.now() * 0.001 * f.speed + f.phase) * 5 * this._unravelProgress;
      
      if (pluckPhase === 'freeze') {
        breath = 0; // Absolute stillness
        unraveledCpX = cx; // Snapped to center for 1 frame freeze
        unraveledCpY = cy;
      }
      
      const targetCurrentCpX = lerp(cx, unraveledCpX + breath, this._unravelProgress) + (this._unravelProgress === 0 ? globalVibrationX * 2 : 0);
      const targetCurrentCpY = lerp(cy, unraveledCpY + breath, this._unravelProgress);
      
      // Defensive state snaps quickly, calm state flows slowly
      let responseSpeed = behaviorState === 'defensive' ? 12.0 : (4.0 * hierarchyMod);
      if (pluckPhase === 'tension') responseSpeed = 40.0;
      if (recoilOvershoot > 0) responseSpeed = 50.0; // Exploding outward
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
  render(ctx, masterOpacity, cx, cy) {
    if (masterOpacity <= 0.001) return;

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
      // Modulate opacity by unravel progress and fiber's base opacity
      const opacity = f.baseOpacity * masterOpacity * (0.1 + this._unravelProgress * 0.9);
      
      ctx.globalAlpha = opacity;
      ctx.lineWidth = f.lineWidth;
      ctx.strokeStyle = 'rgba(245, 240, 232, 1)';
      
      ctx.beginPath();
      ctx.moveTo(f.currStartX, f.currStartY);
      ctx.quadraticCurveTo(f.currCpX, f.currCpY, f.currEndX, f.currEndY);
      ctx.stroke();
    }
    
    ctx.restore();
  }
}
