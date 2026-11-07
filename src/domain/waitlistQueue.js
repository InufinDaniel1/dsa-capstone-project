/**
 * A first-in-first-out queue implemented as a singly linked list.
 *
 * All operations – enqueue, dequeue, peek, size – run in O(1) time.
 * Internal fields are truly private (# syntax), so nothing outside the
 * class can break the invariants.
 */

/** @template T */
export class Queue {
  /** @type {{ value: T, next: { value: T, next: any } | null } | null} */
  #head = null;

  /** @type {{ value: T, next: { value: T, next: any } | null } | null} */
  #tail = null;

  /** @type {number} */
  #size = 0;

  /**
   * Number of items currently in the queue.  O(1).
   * @returns {number}
   */
  get size() {
    return this.#size;
  }

  /**
   * Add a value to the back of the queue.  O(1).
   * @param {T} value
   */
  enqueue(value) {
    const node = { value, next: null };
    if (this.#tail !== null) {
      this.#tail.next = node;
    } else {
      // Queue was empty – head and tail point to the same node.
      this.#head = node;
    }
    this.#tail = node;
    this.#size += 1;
  }

  /**
   * Remove and return the value at the front of the queue.  O(1).
   * @returns {T | undefined}  The front value, or undefined if the queue is empty.
   */
  dequeue() {
    if (this.#head === null) return undefined;

    const value = this.#head.value;
    this.#head = this.#head.next;
    if (this.#head === null) {
      this.#tail = null;
    }
    this.#size -= 1;
    return value;
  }

  /**
   * Return the value at the front without removing it.  O(1).
   * @returns {T | undefined}
   */
  peek() {
    return this.#head === null ? undefined : this.#head.value;
  }
}
