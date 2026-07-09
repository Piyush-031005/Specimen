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

      // 80% of fibers anchor near the top/bottom poles. 20% anchor along the sides.
      if (Math.random() < 0.8) {
        // Vertical-ish fibers
        startX = randomFloat(cx - w * 0.2, cx + w * 0.2);
        startY = baseStartY + randomFloat(-20, 20);
        endX = randomFloat(cx - w * 0.2, cx + w * 0.2);
        endY = baseEndY + randomFloat(-20, 20);
      } else {
        // Horizontal-ish fibers (creates width in the body)
        startX = cx + randomFloat(-w * 0.3, w * 0.3);
        startY = randomFloat(baseStartY, baseEndY);
        endX = cx + randomFloat(-w * 0.3, w * 0.3);
        endY = randomFloat(baseStartY, baseEndY);
      }
      
      // Visual Hierarchy: 15% are Arterial (thick, strong), 85% are Capillary (thin, faint)
      const isArterial = Math.random() < 0.15;
      const lineWidth = isArterial ? randomFloat(1.2, 1.8) : randomFloat(0.2, 0.5);
      const baseOpacity = isArterial ? randomFloat(0.7, 1.0) : randomFloat(0.1, 0.3);

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
    
    if (pluckPhase === 'exploded') {
      globalSpringSpeed = 40.0; // Enormous kinetic release
    } else if (pluckPhase === 'tension' || pluckPhase === 'freeze') {
      targetProgress = 0.0; // Do not unravel yet!
      globalSpringSpeed = 30.0;
    }

    this._unravelProgress = expDecay(this._unravelProgress, targetProgress, globalSpringSpeed, deltaSeconds);
    
    const h = this._coords.cssHeight;
    const cx = this._coords.center.x;
    const cy = this._coords.center.y;
    const baseStartY = cy - (h * 0.4);
    const baseEndY = cy + (h * 0.4);

    // Global vibrations during tension phase
    let globalVibrationX = 0;
    if (pluckPhase === 'tension') {
      globalVibrationX = Math.sin(performance.now() * 0.05) * 8.0; // Violent shaking
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
      
      // Control point logic
      let unraveledCpX = finalTargetCpX + (f.cpOffsetX * tensionMod);
      let unraveledCpY = finalTargetCpY + (f.cpOffsetY * tensionMod);
      
      if (isCursorStill) {
        // Swirl around the cursor (impossible intention)
        const angle = (i / this._numFibers) * Math.PI * 2 + (performance.now() * 0.0005 * f.speed);
        const radius = 80 * tensionMod;
        unraveledCpX = finalTargetCpX + Math.cos(angle) * radius;
        unraveledCpY = finalTargetCpY + Math.sin(angle) * radius;
        breathMod *= 0.3; // Calm the breathing down while swirling
      }
      
      // If returning visitor, topology is permanently slightly twisted
      if (isReturningVisitor) {
        breathMod *= 1.4; // More erratic breathing
        const twistAngle = (i / this._numFibers) * Math.PI;
        unraveledCpX += Math.cos(twistAngle) * 40;
        unraveledCpY += Math.sin(twistAngle) * 40;
      }
      
      // Add breathing noise
      let breath = Math.sin(performance.now() * 0.001 * f.speed + f.phase) * 20 * this._unravelProgress * breathMod;
      
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
      if (pluckPhase === 'exploded') responseSpeed = 25.0 * hierarchyMod; // Enormous kinetic energy
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
