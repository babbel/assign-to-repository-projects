import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // node globals
        process: "readonly",
        console: "readonly",
        __dirname: "readonly",
        // jest globals
        describe: "readonly",
        test: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        jest: "readonly",
      },
    },
    rules: {
      "no-restricted-syntax": "off",
    },
    ignores: ["dist/*.js"],
  },
];
