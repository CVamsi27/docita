import { config } from "@workspace/eslint-config/react-internal";

export default [
  ...config,
  {
    rules: {
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },
];
