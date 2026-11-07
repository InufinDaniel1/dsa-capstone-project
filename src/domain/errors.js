/**
 * Domain error with a machine-readable code.
 *
 * Codes used across the system:
 *   VALIDATION  – an input did not meet a rule
 *   NOT_FOUND   – the requested thing does not exist
 *   SOLD_OUT    – not enough seats left in the tier
 *   CONFLICT    – an operation was attempted that contradicts current state
 */
export class DomainError extends Error {
  /**
   * @param {string} code  Machine-readable error code.
   * @param {string} message  Human-readable explanation.
   */
  constructor(code, message) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}
