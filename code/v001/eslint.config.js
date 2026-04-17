import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/dist-types/**",
      "**/.vite/**",
      "**/node_modules/**",
      "**/.tsbuildinfo",
      "**/.tsbuildinfo.*",
    ],
  },
  {
    files: ["packages/cli/bin/**/*.js"],
    ...js.configs.recommended,
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
  {
    files: ["packages/**/*.ts", "packages/**/*.tsx"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: [
          "./packages/cli/tsconfig.eslint.json",
          "./packages/server/tsconfig.eslint.json",
          "./packages/shared/tsconfig.eslint.json",
          "./packages/web/tsconfig.eslint.json",
        ],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        console: "readonly",
        document: "readonly",
        HTMLCanvasElement: "readonly",
        HTMLElement: "readonly",
        HTMLInputElement: "readonly",
        Image: "readonly",
        ImageData: "readonly",
        KeyboardEvent: "readonly",
        MessageEvent: "readonly",
        MouseEvent: "readonly",
        Path2D: "readonly",
        URL: "readonly",
        WheelEvent: "readonly",
        Worker: "readonly",
        Window: "readonly",
        performance: "readonly",
        preact: "readonly",
        self: "readonly",
        window: "readonly",
      },
    },
  },
);
