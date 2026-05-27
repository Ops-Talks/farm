/**
 * Cost factor used for bcrypt hashing operations throughout the application.
 *
 * Override at runtime by setting the BCRYPT_ROUNDS environment variable.
 * Default: 12 (OWASP recommendation for new deployments as of 2024).
 *
 * Unit-test override: jest.setup.ts sets BCRYPT_ROUNDS=4 so that tests
 * involving real bcrypt calls complete in milliseconds instead of seconds.
 */
export const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? "12", 10);
