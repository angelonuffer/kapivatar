export const mockMqtt = async (page) => {
  // Add MQTT Mock to the page
  await page.addInitScript(() => {
    window._publishedMessages = [];
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
                console.log("Mock MQTT subscribed to", topic);
              },
              publish: (topic, message) => {
                console.log("Mock MQTT publish:", topic, message);
                window._publishedMessages.push({ topic, message: JSON.parse(message) });
              },
              _simulateIncoming: (topic, data) => {
                if (listeners['message']) {
                  listeners['message'](topic, JSON.stringify(data));
                }
              }
            };
            window._mqttClient = client;
            return client;
          }
        };
      },
      set: (val) => {
        // Ignore overwrite
      },
      configurable: true
    });
  });
};
