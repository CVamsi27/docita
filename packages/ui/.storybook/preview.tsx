import type { Preview, StoryContext } from "@storybook/react";
import type React from "react";

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    docs: {
      theme: undefined,
    },
    theme: {
      brandTitle: "Docita Design System",
      brandUrl: "https://docita.io",
      brandImage: "/logo.png",
    },
  },
  globalTypes: {
    theme: {
      name: "Theme",
      description: "Global theme for all stories",
      defaultValue: "light",
      toolbar: {
        icon: "circlehollow",
        items: [
          { value: "light", icon: "circlehollow", title: "Light" },
          { value: "dark", icon: "circle", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story: React.ComponentType, context: StoryContext) => {
      const theme = context.globals.theme;

      return (
        <div className={theme === "dark" ? "dark" : "light"}>
          <div className="min-h-screen bg-background text-foreground p-8">
            <Story />
          </div>
        </div>
      );
    },
  ],
};

export default preview;
