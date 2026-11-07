import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  fileSystemAccessApi: [async ({ page }, use) => {
    await page.addInitScript(() => {
      const files = new Map();
      window._files = files;
      window._databasePickerCalls = 0;
      window._databasePickerOptions = null;
      window._databasePickerType = null;
      const databaseStorageKey = '_kapivatarDatabase';
      const databaseBytes = () => {
        const encoded = sessionStorage.getItem(databaseStorageKey);
        if (!encoded) return undefined;
        const binary = atob(encoded);
        return Uint8Array.from(binary, char => char.charCodeAt(0));
      };
      const persistDatabase = (bytes) => {
        const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
        sessionStorage.setItem(databaseStorageKey, btoa(binary));
        files.set('kapivatar.sqlite', bytes);
      };
      const existingDatabase = databaseBytes();
      if (existingDatabase) files.set('kapivatar.sqlite', existingDatabase);

      window.MockFileHandle = class MockFileHandle {
        constructor(name = 'kapivatar.sqlite') {
          this.kind = 'file';
          this.name = name;
          this.__mockFileHandle = true;
        }
        async queryPermission(descriptor) {
          return sessionStorage.getItem('_permissionState') || 'granted';
        }
        async requestPermission(descriptor) {
          sessionStorage.setItem('_permissionState', 'granted');
          return 'granted';
        }
        async getFile() {
          return new Blob([databaseBytes() || new Uint8Array()]);
        }
        async createWritable() {
          return new window.MockWritableStream();
        }
      };

      window.MockWritableStream = class MockWritableStream {
        async write(content) {
          persistDatabase(new Uint8Array(content));
        }
        async close() {}
      };

      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function(value, key) {
        if (value?.__mockFileHandle) {
          value = { __mockFileHandle: true, name: value.name };
        }
        return put.call(this, value, key);
      };

      const get = IDBObjectStore.prototype.get;
      IDBObjectStore.prototype.get = function(...args) {
        const request = get.apply(this, args);
        request.addEventListener('success', () => {
          const value = request.result;
          if (value?.__mockFileHandle) {
            Object.defineProperty(request, 'result', {
              configurable: true,
              value: new window.MockFileHandle(value.name),
            });
          }
        });
        return request;
      };

      window.showSaveFilePicker = async (options) => {
        window._databasePickerCalls++;
        window._databasePickerOptions = options;
        window._databasePickerType = 'save';
        return new window.MockFileHandle(options.suggestedName);
      };

      window.showOpenFilePicker = async (options) => {
        window._databasePickerCalls++;
        window._databasePickerOptions = options;
        window._databasePickerType = 'open';
        return [new window.MockFileHandle(options.suggestedName)];
      };
    });
    await use();
  }, { auto: true }],
});

export { expect };
