import "server-only";
import { createHash } from "node:crypto";

// Crockford base32: digits and capitals without the look-alikes I, L, O, U
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * The public order reference shown to customers: 15 characters of letters and digits, e.g. "7K4M2XQ9TB5R3WD".
 * It is derived from Medusa's own unique order id, so every page computes the same value for the same order
 * and nothing extra has to be stored. 15 characters is 75 bits, so two orders will never share one in practice.
 */
export function orderRef(orderId: string): string {
  const bytes = createHash("sha256").update(`cottson-order:${orderId}`).digest();
  let out = "";
  for (let i = 0; i < 15; i++) {
    // The first character is always a letter and the eighth always a digit, so every reference is a mix of both
    if (i === 0) out += ALPHABET[10 + (bytes[i] % 22)];
    else if (i === 7) out += ALPHABET[bytes[i] % 10];
    else out += ALPHABET[bytes[i] % 32];
  }
  return out;
}
