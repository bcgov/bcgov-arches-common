import fs from 'fs';
import path from 'path';
import vue from '@vitejs/plugin-vue';

import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

import type { UserConfig } from 'vitest/config';

function generateConfig(): Promise<UserConfig> {
    return new Promise((resolve, reject) => {
        const filePath = path.dirname(fileURLToPath(import.meta.url));

        const exclude = [
            '**/*.d.ts',
            '**/node_modules/**',
            '**/dist/**',
            '**/install/**',
            '**/cypress/**',
            '**/.{idea,git,cache,output,temp}/**',
            '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
            '**/build/**',
            '**/staticfiles/**',
        ];

        const rawData = fs.readFileSync(
            path.join(
                __dirname,
                'frontend_configuration',
                'webpack-metadata.json',
            ),
            'utf-8',
        );
        const parsedData = JSON.parse(rawData);

        const alias: { [key: string]: string } = {
            '@/arches': path.join(
                parsedData['ROOT_DIR'],
                'app',
                'src',
                'arches',
            ),
            arches: path.join(
                parsedData['ROOT_DIR'],
                'app',
                'media',
                'js',
                'arches.js',
            ),
            // Pin each of these to the local node_modules so that files
            // outside the project root (e.g. sibling packages, Python-installed
            // packages) resolve the same copy that webpack uses.
            shpjsesm: path.join(filePath, 'node_modules', 'shpjs'),
            pinia: path.join(filePath, 'node_modules', 'pinia'),
            primevue: path.join(__dirname, 'node_modules', 'primevue'),
            uuidesm: path.join(__dirname, 'node_modules', 'uuid', 'dist'),
        };

        // Mirror webpack's nodeModulesPaths aliases from arches' package.json.
        const archesNpmPackageJSON = JSON.parse(
            fs.readFileSync(
                path.join(__dirname, 'node_modules', 'arches', 'package.json'),
                'utf-8',
            ),
        );
        for (const [aliasName, subPath] of Object.entries(
            (archesNpmPackageJSON['nodeModulesPaths'] ?? {}) as Record<
                string,
                string
            >,
        )) {
            if (!alias[aliasName]) {
                alias[aliasName] = path.join(__dirname, subPath);
            }
        }

        for (const [
            archesApplicationName,
            archesApplicationPath,
        ] of Object.entries(
            parsedData['ARCHES_APPLICATIONS_PATHS'] as {
                [key: string]: string;
            },
        )) {
            alias[`@/${archesApplicationName}`] = path.join(
                archesApplicationPath,
                'src',
                archesApplicationName,
            );
        }

        resolve({
            plugins: [vue() as any],
            test: {
                alias: alias,
                coverage: {
                    include: [
                        path.join(
                            parsedData['APP_RELATIVE_PATH'],
                            'src',
                            path.sep,
                        ),
                    ],
                    exclude: exclude,
                    reporter: [['clover', { file: 'coverage.xml' }], 'text'],
                    reportsDirectory: path.join(
                        filePath,
                        'coverage',
                        'frontend',
                    ),
                },
                environment: 'jsdom',
                globals: true,
                exclude: exclude,
                passWithNoTests: true,
                setupFiles: ['vitest.setup.mts'],
            },
        });
    });
}

export default (async () => {
    const config = await generateConfig();
    return defineConfig(config);
})();
