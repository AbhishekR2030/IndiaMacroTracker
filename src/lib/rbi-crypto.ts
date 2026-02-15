/**
 * RBI DBIE CIMS Gateway - AES-256-CBC Encryption Utility
 *
 * Server-side only. Uses Node.js built-in `crypto` module.
 * Constants extracted from the RBI DBIE Angular bundle.
 *
 * Many CIMS Gateway endpoints require request parameters to be
 * AES-encrypted, and return AES-encrypted response bodies.
 */

import crypto from "crypto";

// Constants from the RBI DBIE Angular bundle (main.*.js)
const PBKDF2_TOKEN =
  "48d6b976d7135745b47b407cd8e659a45d8ebaca4ee95f87d5d939604f472268";
const SALT_HEX = "577bd45a17977269694908d80905c32a";
const IV_HEX = "dc0da04af8fee58593442bf834b30739";
const KEY_SIZE = 32; // 256 bits
const ITERATIONS = 1000;

// Derive key once at module load (inputs are static constants)
const salt = Buffer.from(SALT_HEX, "hex");
const iv = Buffer.from(IV_HEX, "hex");
const derivedKey = crypto.pbkdf2Sync(
  PBKDF2_TOKEN,
  salt,
  ITERATIONS,
  KEY_SIZE,
  "sha1"
);

/**
 * Encrypt a plaintext string for CIMS Gateway encrypted endpoints.
 * Returns base64-encoded ciphertext.
 */
export function encryptPayload(plaintext: string): string {
  const cipher = crypto.createCipheriv("aes-256-cbc", derivedKey, iv);
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}

/**
 * Decrypt a base64-encoded ciphertext from CIMS Gateway responses.
 * Returns the plaintext string.
 */
export function decryptPayload(ciphertext: string): string {
  const decipher = crypto.createDecipheriv("aes-256-cbc", derivedKey, iv);
  let decrypted = decipher.update(ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
