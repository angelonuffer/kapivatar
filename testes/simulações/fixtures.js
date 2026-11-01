import { mergeTests, expect } from '@playwright/test';
import { test as externalRequests } from './rede.js';
import { test as mqtt } from './mqtt.js';

export const test = mergeTests(externalRequests, mqtt);
export { expect };
