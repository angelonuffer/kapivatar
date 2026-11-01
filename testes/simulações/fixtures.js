import { mergeTests, expect } from '@playwright/test';
import { test as externalRequests } from './rede.js';
import { test as mqtt } from './mqtt.js';
import { test as fileSystemAccessApi } from './file-system-access-api.js';

export const test = mergeTests(externalRequests, mqtt, fileSystemAccessApi);
export { expect };
