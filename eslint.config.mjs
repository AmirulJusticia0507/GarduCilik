import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "engine-cpp/build/**",
    "engine-cpp/tests/wasm_smoke_test.cjs",
    "public/wasm/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
