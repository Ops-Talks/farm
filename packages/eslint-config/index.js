// Base ESLint config - common rules shared across all Farm packages
/** @type {import("eslint").Linter.Config} */
module.exports = {
  rules: {
    "no-console": "warn",
    "no-debugger": "error",
    "prefer-const": "error",
    "no-var": "error",
  },
};
