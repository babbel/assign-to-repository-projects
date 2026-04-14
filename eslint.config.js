import js from "@eslint/js";
import globals from "globals";
import importX from "eslint-plugin-import-x";

export default [
    { ignores: ["dist/"] },
    {
        ...js.configs.recommended,
        plugins: {
            "import-x": importX,
            "import": importX,        // ← alias so old eslint-disable comments don't error
        },
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
        rules: {
            "no-restricted-syntax": "off",
        },
    },
];
