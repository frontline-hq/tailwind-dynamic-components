const config = {
    compilationOptions: {
        /**
         * Path to the tsconfig file that will be used for the compilation.
         * Must be set if entries count more than 1.
         */
        preferredConfigPath: "./tsconfig.json",
    },
    entries: [
        {
            filePath: "./src/index.ts",
            outFile: `./dist/index.d.ts`,
            noCheck: false,
        },
        {
            filePath: "./src/plugin.ts",
            outFile: `./dist/plugin.d.ts`,
            noCheck: false,
        },
        {
            filePath: "./src/tailwind.ts",
            outFile: `./dist/tailwind.d.ts`,
            noCheck: false,
        },
    ],
};

module.exports = config;
