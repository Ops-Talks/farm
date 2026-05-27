/**
 * Jest global setup file.
 *
 * Runs before every unit-test file (configured via "setupFiles" in the Jest
 * config inside package.json).  Must use plain CommonJS-compatible assignments
 * only — no imports, no top-level await.
 *
 * BCRYPT_ROUNDS=4 reduces bcrypt cost from 12 to 4 so that any tests that
 * call the real bcrypt library (rather than a mock) finish in milliseconds.
 */
process.env.BCRYPT_ROUNDS = "4";
