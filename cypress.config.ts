import { defineConfig } from 'cypress';
import { registerBotTasks } from './cypress/support/simulatedPlayer';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    // The lobby/board flows involve real socket round-trips against the dev server.
    defaultCommandTimeout: 8000,
    // Recorded in CI only — the run is uploaded as an artifact so a failure can be
    // watched back, which is the whole point of these specs. Locally you already
    // have `npm run e2e` for a live view, and encoding just slows the loop down.
    video: !!process.env.CI,
    setupNodeEvents(on) {
      registerBotTasks(on);
    },
  },
});
