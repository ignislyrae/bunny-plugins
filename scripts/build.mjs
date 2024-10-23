// @ts-check

import { readFile, writeFile, readdir, mkdir } from "fs/promises";
import { rollup } from "rollup";
import swc from "rollup-plugin-swc3";
import { minify } from 'rollup-plugin-esbuild-minify'
import { existsSync } from "fs";

const REPO_META = {
    name: "yourusername's repo"
};

const isProduction = !process.argv.includes("--dev");

const TimeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
});

/** @type function(string): import('rollup').Plugin */
const buildLogger = (name) => ({
    name: "buildLogger",
    buildEnd: error => {
        const ansi = {
            gray: "\x1b[90m",
            red: "\x1b[31m",
            green: "\x1b[32m",
            reset: "\x1b[0m"
        };

        /** @type function(string, string): void */
        const log = (text, color) => {
            const time = TimeFormatter.format(Date.now());
            console.log(`${ansi.gray}[${time}]${ansi.reset} ${color}${text}${ansi.reset}`);
        };

        // error = red, no error = green
        if (error) {
            log(`Failed to build plugin "${name}"!`, ansi.red);
            console.error(error);
        } else {
            log(`Successfully built plugin "${name}"!`, ansi.green);
        }
    }
});

/** @type function(any): import('rollup').Plugin */
const manifestWriter = (manifest) => ({
    name: "manifestWriter",
    buildEnd: async () => {
        const repo = JSON.parse(existsSync("./dist/repo.json") ? (await readFile("./dist/repo.json")).toString() : "{}");

        manifest.main = "index.js";
        if (!isProduction) manifest.version += "-dev";

        repo.$meta = REPO_META;
        repo[manifest.id] = {
            version: manifest.version,
            alwaysFetch: !isProduction
        };

        await mkdir(`./dist/builds/${manifest.id}`, { recursive: true });
        await writeFile(`./dist/builds/${manifest.id}/manifest.json`, JSON.stringify(manifest));
        await writeFile("./dist/repo.json", JSON.stringify(repo));
    }
});

for (const plug of await readdir("./plugins")) {
    const manifest = JSON.parse((await readFile(`./plugins/${plug}/manifest.json`)).toString());
    const outPath = `./dist/builds/${manifest.id}/index.js`;

    const globalMap = {
        "react": "React",
        "react/jsx-runtime": "bunny._jsx",
    };

    try {
        const bundle = await rollup({
            input: `./plugins/${plug}/${manifest.main}`,
            external: [/^@bunny+/, ...Object.keys(globalMap)],
            plugins: [
                swc({
                    jsc: {
                        target: undefined,
                        transform: {
                            react: {
                                runtime: "automatic",
                            }
                        },
                    },
                    // https://github.com/facebook/hermes/blob/3815fec63d1a6667ca3195160d6e12fee6a0d8d5/doc/Features.md
                    // https://github.com/facebook/hermes/issues/696#issuecomment-1396235791
                    env: {
                        targets: "fully supports es6",
                        include: [
                            "transform-block-scoping",
                            "transform-classes",
                            "transform-async-to-generator",
                            "transform-async-generator-functions"
                        ],
                        exclude: [
                            "transform-parameters",
                            "transform-template-literals",
                            "transform-exponentiation-operator",
                            "transform-named-capturing-groups-regex",
                            "transform-nullish-coalescing-operator",
                            "transform-object-rest-spread",
                            "transform-optional-chaining",
                            "transform-logical-assignment-operators"
                        ]
                    },
                }),
                minify(),
                buildLogger(manifest.id),
                manifestWriter(manifest)
            ]
        });

        await bundle.write({
            file: outPath,
            globals(id) {
                if (id.startsWith("@bunny")) {
                    return id.substring(1).replace(/\//g, ".");
                }

                return globalMap[id] || null;
            },
            format: "iife",
            compact: true,
            exports: "default",
            name: "plugin"
        });

        await bundle.close();
    } catch (error) {
        if (error instanceof Error && error.name !== "RollupError") {
            console.error(error);
        }

        process.exit(1);
    }
}
