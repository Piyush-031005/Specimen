/**
 * SPECIMEN — EventBus
 *
 * The nervous system. All inter-module communication passes through here.
 * No module should import another module directly. Use events.
 *
 * Pattern: publish/subscribe with typed channels.
 */

/**
 * @typedef {Object} EventBusSubscription
 * @property {function(): void} unsubscribe — Call to remove this listener.
 */

class EventBusClass {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * Subscribe to an event channel.
   *
   * @param {string} event — The event channel name (use EVENTS constants).
   * @param {Function} handler — Callback invoked with the event payload.
   * @returns {EventBusSubscription}
   */
  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);

    return {
      unsubscribe: () => this.off(event, handler),
    };
  }

  /**
   * Subscribe to an event channel exactly once.
   *
   * @param {string} event
   * @param {Function} handler
   * @returns {EventBusSubscription}
   */
  once(event, handler) {
    const wrapper = (payload) => {
      handler(payload);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  /**
   * Unsubscribe from an event channel.
   *
   * @param {string} event
   * @param {Function} handler
   */
  off(event, handler) {
    const handlers = this._listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this._listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event to all subscribers of a channel.
   *
   * @param {string} event
   * @param {*} [payload]
   */
  emit(event, payload) {
    const handlers = this._listeners.get(event);
    if (!handlers || handlers.size === 0) return;

    // Snapshot to allow safe unsubscription during iteration
    for (const handler of [...handlers]) {
      try {
        handler(payload);
      } catch (err) {
        // Production: fail silently
      }
    }
  }

  /**
   * Remove all listeners. Use only for cleanup/teardown.
   */
  clear() {
    this._listeners.clear();
  }
}

// Singleton — one bus for the entire engine
export const EventBus = new EventBusClass();
