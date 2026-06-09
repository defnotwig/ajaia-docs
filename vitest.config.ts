import { defineConfig } from 'vitest/config';
import path from 'path';

// Tests run in the Node environment and exercise the real lib/* functions
// against an isolated SQLite database (see tests/helpers/setup.ts), which is
// created before the test modules import lib/db.ts.
export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        setupFiles: ['./tests/helpers/setup.ts'],
        include: ['tests/**/*.test.ts'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        },
    },
});
