/** Worker package reuses API modules; specs may live under `src/`. */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.spec\\.(t|j)s$",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/../api/src/$1",
    "^uuid$": "<rootDir>/../api/test/uuid-mock.ts",
    "^otplib$": "<rootDir>/../api/test/mocks/otplib.mock.ts",
    "^@scure/base$": "<rootDir>/../api/test/mocks/scure-base.ts",
    "^@otplib/plugin-crypto-noble$":
      "<rootDir>/../api/test/mocks/otplib-crypto.ts",
  },
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }],
  },
  testEnvironment: "node",
  passWithNoTests: true,
};
