import { config } from "@workspace/eslint-config/react-internal";

export default [
	...config,
	{
		files: ["tailwind.config.ts"],
		rules: {
			"@typescript-eslint/no-require-imports": "off",
		},
	},
];
