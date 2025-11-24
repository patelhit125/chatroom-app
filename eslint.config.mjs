import nextPlugin from "eslint-config-next";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "node_modules/**",
      "next-env.d.ts",
      "server.js",
      "db/migrate.js",
      "db/seed.js",
    ],
  },
];

export default eslintConfig;
