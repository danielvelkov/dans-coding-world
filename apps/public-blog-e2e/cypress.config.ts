import { nxE2EPreset } from '@nx/cypress/plugins/cypress-preset';
import { defineConfig } from 'cypress';
import axios from 'axios';
// The issue is that when Nx tries to load cypress.config.ts during "nx sync" or project graph generation,
// it's running in a Node.js context that doesn't have TypeScript path mappings resolved,
// and the library hasn't been built yet.

// eslint-disable-next-line @nx/enforce-module-boundaries
import { API_ENDPOINTS } from '../../libs/shared/data-access/api/src/lib/routes';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ?? '3000';
axios.defaults.baseURL = `http://${host}:${port}`;

const nxConfig = nxE2EPreset(__filename, {
  cypressDir: 'src',
  bundler: 'vite',
  webServerCommands: {
    default: 'npx nx run public-blog:dev',
    production: 'npx nx run public-blog:preview',
  },
  ciWebServerCommand: 'npx nx run public-blog:preview',
  ciBaseUrl: 'http://localhost:4200',
});

export default defineConfig({
  e2e: {
    ...nxConfig,
    baseUrl: 'http://localhost:4200',
    async setupNodeEvents(on, config) {
      // IMPORTANT: Execute the Nx preset's node events first
      if (nxConfig.setupNodeEvents) {
        await nxConfig.setupNodeEvents(on, config);
      }

      on('task', {
        async 'db:seed-users'(args = {}) {
          const { users, options } = args;
          const {
            data: { data },
          } = await axios.post(`${API_ENDPOINTS.TEST_DATA.USERS}`, users, {
            params: options,
          });
          return data;
        },
        async 'db:seed-posts'(args = {}) {
          const { posts, options } = args;
          const {
            data: { data },
          } = await axios.post(`${API_ENDPOINTS.TEST_DATA.POSTS}`, posts, {
            params: options,
          });
          return data;
        },
        async 'db:seed-tags'(args = {}) {
          const { tags, options } = args;
          const {
            data: { data },
          } = await axios.post(`${API_ENDPOINTS.TEST_DATA.TAGS}`, tags, {
            params: options,
          });
          return data;
        },
        async 'db:attach-tags'(args = {}) {
          const { data } = args;
          const requests = [];
          for (const { postId, tagIds } of data) {
            if (tagIds && postId)
              requests.push(
                axios.patch(
                  `${API_ENDPOINTS.TEST_DATA.POSTS}/${postId}/tags`,
                  tagIds
                )
              );
          }
          const results = await Promise.all(requests);
          return results.map((r) => r.data);
        },
      });

      return config;
    },
  },
});
