import {defineConfig} from "vitest/config";

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        include: [
            'resources/js/**/*.test.ts',
            'resources/js/**/*.test.tsx',
        ],
        setupFiles: [
            'resources/js/test/setup.ts',
        ],
    },
});
