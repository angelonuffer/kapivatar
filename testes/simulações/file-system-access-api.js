import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    // Mock File System Access API
    await page.addInitScript(() => {
      const files = new Map();
      window._files = files;

      window.MockDirectoryHandle = class MockDirectoryHandle {
        constructor() {
          this.kind = 'directory';
          this.name = 'mock-data';
        }
        async queryPermission(descriptor) {
          return sessionStorage.getItem('_permissionState') || 'granted';
        }
        async requestPermission(descriptor) {
          sessionStorage.setItem('_permissionState', 'granted');
          return 'granted';
        }
        async getFileHandle(name, options = {}) {
          if (!files.has(name) && !options.create) {
            const error = new Error('File not found');
            error.name = 'NotFoundError';
            throw error;
          }
          if (!files.has(name) && options.create) {
            files.set(name, '');
          }
          return new window.MockFileHandle(name);
        }
      };

      window.MockFileHandle = class MockFileHandle {
        constructor(name) {
          this.name = name;
          this.kind = 'file';
        }
        async queryPermission(descriptor) {
          return sessionStorage.getItem('_permissionState') || 'granted';
        }
        async requestPermission(descriptor) {
          sessionStorage.setItem('_permissionState', 'granted');
          return 'granted';
        }
        async getFile() {
          const content = files.get(this.name);
          if (content === undefined) {
            throw new Error('File not found');
          }
          const blob = new Blob([content]);
          blob.text = async () => typeof content === 'string' ? content : new TextDecoder().decode(content);
          return blob;
        }
        async createWritable() {
          return new window.MockWritableStream(this.name);
        }
      };

      window.MockWritableStream = class MockWritableStream {
        constructor(name) {
          this.name = name;
        }
        async write(content) {
          files.set(this.name, content);
        }
        async close() {}
      };

      window.showDirectoryPicker = async () => new window.MockDirectoryHandle();
    });

    await use(page);
  },
});

export { expect };
