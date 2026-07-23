import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'node',

        include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],

        exclude: [
            'node_module',
            'dist',
            '.next',
            'tests/e2e/**'
        ],

        testTimeout: 10000,
        allowOnly: !process.env.CI,

        coverage: {
            enabled: false,
            provider: 'v8',
            reporter: ['text', 'lcov', 'html'],
            reportsDirectory: './coverage',
            thresholds: {
                statements: 80,
                branches: 75,
                functions: 80,
                lines: 80,
            },
            exclude: [
                'node_modules/**',
                'src/app/**',
                'src/components/**',
                'tests/**',
                '**/*.config.ts',
                '**/*.d.ts',
            ],
        },

        globals: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src/')
        },
    },
});
