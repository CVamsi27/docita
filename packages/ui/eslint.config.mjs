import { config } from "@workspace/eslint-config/react-internal";

export default [
	{
		ignores: ["src/next-cloudflare/**"],
	},
	...config,
	{
		files: ["tailwind.config.ts"],
		rules: {
			"@typescript-eslint/no-require-imports": "off",
		},
	},
	{
		files: ["**/*.{ts,tsx,js,jsx}"],
		rules: {
			"no-restricted-syntax": [
				"warn",
				{
					selector: "Literal[value=/bg-(red|green|blue|yellow|amber|purple|pink|gray|slate|zinc|neutral|stone|orange|lime|emerald|teal|cyan|sky|indigo|violet|fuchsia|rose)-(50|100|200|300|400|500|600|700|800|900|950)/]",
					message: "Avoid hardcoded Tailwind background colors. Use semantic design tokens instead (e.g., bg-success, bg-destructive, bg-info).",
				},
				{
					selector: "Literal[value=/text-(red|green|blue|yellow|amber|purple|pink|gray|slate|zinc|neutral|stone|orange|lime|emerald|teal|cyan|sky|indigo|violet|fuchsia|rose)-(50|100|200|300|400|500|600|700|800|900|950)/]",
					message: "Avoid hardcoded Tailwind text colors. Use semantic design tokens instead (e.g., text-success, text-destructive, text-info).",
				},
				{
					selector: "Literal[value=/border-(red|green|blue|yellow|amber|purple|pink|gray|slate|zinc|neutral|stone|orange|lime|emerald|teal|cyan|sky|indigo|violet|fuchsia|rose)-(50|100|200|300|400|500|600|700|800|900|950)/]",
					message: "Avoid hardcoded Tailwind border colors. Use semantic design tokens instead (e.g., border-success, border-destructive, border-info).",
				},
				{
					selector: "JSXAttribute[name.name='animation'] > Literal[value='wave']",
					message: "Skeleton animation=\"wave\" is banned by docs/ui/UI_UX_STANDARD_2026.md \u00a75. Drop the prop; Skeleton is now static.",
				},
				{
					selector: "Literal[value=/\\banimate-pulse\\b/]",
					message: "animate-pulse is banned by docs/ui/UI_UX_STANDARD_2026.md \u00a75. Use static styling for emphasis instead.",
				},
				{
					selector: "TemplateElement[value.cooked=/\\banimate-pulse\\b/]",
					message: "animate-pulse is banned by docs/ui/UI_UX_STANDARD_2026.md \u00a75. Use static styling for emphasis instead.",
				},
			],
		},
	},
];
