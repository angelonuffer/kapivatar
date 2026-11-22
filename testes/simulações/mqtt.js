import { test as base } from '@playwright/test';

export const simular_mqtt = () => {
  window._publishedMessages = [];
  const subscriptions = new Set();
  const senderId = crypto.randomUUID();
  const channel = new BroadcastChannel('kapivatar-e2e-mqtt');

  Object.defineProperty(window, 'mqtt', {
    get: () => {
      return {
        connect: () => {
          console.log("Mock MQTT connect called");
          const listeners = {};
          const client = {
            on: (event, cb) => {
              listeners[event] = cb;
              if (event === 'connect') {
                setTimeout(() => cb(), 10);
              }
            },
            subscribe: (topic) => {
              subscriptions.add(topic);
              console.log("Mock MQTT subscribed to", topic);
            },
            unsubscribe: (topic) => {
              subscriptions.delete(topic);
            },
            publish: (topic, message) => {
              console.log("Mock MQTT publish:", topic, message);
              const parsed = JSON.parse(message);
              window._publishedMessages.push({ topic, message: parsed });
              channel.postMessage({ senderId, topic, message });
            },
            _simulateIncoming: (topic, data) => {
              if (listeners['message']) {
                listeners['message'](topic, JSON.stringify(data));
              }
            }
          };
          window._mqttClient = client;
          channel.onmessage = (event) => {
            const received = event.data;
            if (received.senderId === senderId || !subscriptions.has(received.topic)) return;
            if (listeners['message']) {
              listeners['message'](received.topic, received.message);
            }
          };
          return client;
        }
      };
    },
    set: (val) => {
      // Ignore overwrite
    },
    configurable: true
  });
};

export const test = base.extend({
  mqttMock: [async ({ page }, use) => {
    await page.addInitScript(simular_mqtt);
    await use();
  }, { auto: true }],
});
