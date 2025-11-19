import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      TEST_ADMIN_EMAIL: process.env.TEST_ADMIN_EMAIL,
      TEST_ADMIN_PASSWORD: process.env.TEST_ADMIN_PASSWORD,
      TEST_MEMBER_EMAIL: process.env.TEST_MEMBER_EMAIL,
      TEST_MEMBER_PASSWORD: process.env.TEST_MEMBER_PASSWORD,
      TEST_VIEWER_EMAIL: process.env.TEST_VIEWER_EMAIL,
      TEST_VIEWER_PASSWORD: process.env.TEST_VIEWER_PASSWORD,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
