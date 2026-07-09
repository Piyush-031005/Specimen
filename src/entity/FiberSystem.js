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

    for (let i = 0; i < this._numFibers; i++) {
      // Determine designated anchor points for when unraveled
      // 60% anchor to top/bottom, 40% anchor to left/right
      let startX, startY, endX, endY;
      
      if (Math.random() < 0.6) {
        // Vertical-ish fibers
        startX = randomFloat(cx - w * 0.3, cx + w * 0.3);
        startY = -50;
        endX = randomFloat(cx - w * 0.3, cx + w * 0.3);
        endY = h + 50;
      } else {
        // Horizontal-ish fibers
        startX = -50;
        startY = randomFloat(cy - h * 0.3, cy + h * 0.3);
        endX = w + 50;
        endY = randomFloat(cy - h * 0.3, cy + h * 0.3);
      }

      this._fibers.push({
        tStartX: startX,
        tStartY: startY,
        tEndX: endX,
        tEndY: endY,
        
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
  update(deltaSeconds, isUnraveled, targetCpX, targetCpY, behaviorState) {
    // Spring toward unraveled state
    const targetProgress = isUnraveled ? 1.0 : 0.0;
    // Violent snap out, slow retraction in
    const springSpeed = isUnraveled ? 12.0 : 2.0; 
    this._unravelProgress = expDecay(this._unravelProgress, targetProgress, springSpeed, deltaSeconds);

    const w = this._coords.cssWidth;
    const h = this._coords.cssHeight;
    const cx = this._coords.center.x;
    const cy = this._coords.center.y;

    for (let i = 0; i < this._numFibers; i++) {
      const f = this._fibers[i];
      
      // Behavior overrides
      let finalTargetCpX = targetCpX;
      let finalTargetCpY = targetCpY;
      let breathMod = 1.0;
      let tensionMod = 1.0;

      if (behaviorState === 'defensive') {
        // Pull tightly into a central knot, ignore cursor
        finalTargetCpX = cx;
        finalTargetCpY = cy;
        breathMod = 0.2; // Rigid, short needles
        tensionMod = 0.5; // Pull anchors closer to center
      } else if (behaviorState === 'trusting' || behaviorState === 'curious') {
        // Soft silk reaching completely out
        breathMod = 1.5;
        tensionMod = 1.2;
      }

      // Target anchor points based on unravel progress and tension
      const targetStartX = lerp(cx, lerp(cx, f.tStartX, tensionMod), this._unravelProgress);
      const targetStartY = lerp(-50, lerp(cy, f.tStartY, tensionMod), this._unravelProgress);
      const targetEndX = lerp(cx, lerp(cx, f.tEndX, tensionMod), this._unravelProgress);
      const targetEndY = lerp(h + 50, lerp(cy, f.tEndY, tensionMod), this._unravelProgress);
      
      f.currStartX = targetStartX;
      f.currStartY = targetStartY;
      f.currEndX = targetEndX;
      f.currEndY = targetEndY;
      
      // Control point logic
      const unraveledCpX = finalTargetCpX + (f.cpOffsetX * tensionMod);
      const unraveledCpY = finalTargetCpY + (f.cpOffsetY * tensionMod);
      
      // Add breathing noise
      const breath = Math.sin(performance.now() * 0.001 * f.speed + f.phase) * 20 * this._unravelProgress * breathMod;
      
      const targetCurrentCpX = lerp(cx, unraveledCpX + breath, this._unravelProgress);
      const targetCurrentCpY = lerp(cy, unraveledCpY + breath, this._unravelProgress);
      
      // Defensive state snaps quickly, calm state flows slowly
      const responseSpeed = behaviorState === 'defensive' ? 15.0 : 5.0;
      f.currCpX = expDecay(f.currCpX, targetCurrentCpX, responseSpeed, deltaSeconds);
      f.currCpY = expDecay(f.currCpY, targetCurrentCpY, responseSpeed, deltaSeconds);
    }
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
    
    // If not unraveled, just draw the 1px line to save rendering 250 overlapping lines
    if (this._unravelProgress < 0.01) {
      ctx.lineWidth = 1.0;
      ctx.globalAlpha = masterOpacity;
      const h = this._coords.cssHeight;
      
      // Subtle breathing/vibration
      const vibration = Math.sin(performance.now() * 0.03) * 10;
      
      ctx.beginPath();
      ctx.moveTo(cx + vibration, -50);
      ctx.lineTo(cx - vibration, h + 50);
      ctx.stroke();
      ctx.restore();
      return;
    }
    
    // Draw all fibers
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    
    for (let i = 0; i < this._numFibers; i++) {
      const f = this._fibers[i];
      ctx.moveTo(f.currStartX, f.currStartY);
      ctx.quadraticCurveTo(f.currCpX, f.currCpY, f.currEndX, f.currEndY);
    }
    
    ctx.stroke();
    ctx.restore();
  }
}
