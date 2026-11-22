import { test as base } from '@playwright/test';

export const simular_mqtt = () => {
  const sockets = new Set();
  const retained = new Map();

  window._publishedMessages = [];

  const corresponde_topico = (topic, filter) => {
    const topicParts = topic.split('/');
    const filterParts = filter.split('/');

    for (let index = 0; index < filterParts.length; index++) {
      if (filterParts[index] === '#') return true;
      if (filterParts[index] === '+') continue;
      if (filterParts[index] !== topicParts[index]) return false;
    }

    return topicParts.length === filterParts.length;
  };

  const makeBuffer = (value) => {
    if (typeof value === 'string') return new TextEncoder().encode(value);
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) {
      return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }
    if (Array.isArray(value)) return new Uint8Array(value);
    return new Uint8Array(value || []);
  };

  const decodeRemainingLength = (bytes, start) => {
    let value = 0;
    let multiplier = 1;
    let index = start;

    for (let count = 0; count < 4; count++) {
      const digit = bytes[index++];
      value += (digit & 0x7f) * multiplier;
      if ((digit & 0x80) === 0) return { value, index };
      multiplier *= 128;
    }

    throw new Error('Invalid MQTT remaining length');
  };

  const encodeRemainingLength = (length) => {
    const encoded = [];
    do {
      let digit = length % 128;
      length = Math.floor(length / 128);
      if (length > 0) digit |= 0x80;
      encoded.push(digit);
    } while (length > 0);
    return encoded;
  };

  const readUInt16 = (bytes, index) =>
    ((bytes[index] << 8) | bytes[index + 1]);

  const decodeUtf8 = (bytes) => new TextDecoder().decode(bytes);

  const dispatchMessage = (socket, bytes) => {
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    );
    socket._dispatch('message', { data: buffer });
  };

  const generateConnack = () => new Uint8Array([0x20, 0x02, 0x00, 0x00]);
  const generatePingresp = () => new Uint8Array([0xd0, 0x00]);

  const generatePubPacket = (packet) => {
    const topic = new TextEncoder().encode(packet.topic);
    const payload = makeBuffer(packet.payload);
    let variableLength = 2 + topic.length + payload.length;
    if ((packet.qos || 0) > 0) variableLength += 2;

    const fixedHeader = [
      0x30 | ((packet.qos || 0) << 1) | (packet.retain ? 0x01 : 0),
      ...encodeRemainingLength(variableLength),
    ];
    const packetBytes = new Uint8Array(
      fixedHeader.length + variableLength,
    );
    packetBytes.set(fixedHeader, 0);

    let offset = fixedHeader.length;
    packetBytes[offset++] = (topic.length >> 8) & 0xff;
    packetBytes[offset++] = topic.length & 0xff;
    packetBytes.set(topic, offset);
    offset += topic.length;

    if ((packet.qos || 0) > 0) {
      packetBytes[offset++] = (packet.messageId || 1) >> 8;
      packetBytes[offset++] = (packet.messageId || 1) & 0xff;
    }

    packetBytes.set(payload, offset);
    return packetBytes;
  };

  const generatePuback = (command, messageId) => new Uint8Array([
    command,
    0x02,
    messageId >> 8,
    messageId & 0xff,
  ]);

  const parsePayload = (payload) => {
    const text = decodeUtf8(payload);
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };

  const routePublish = (packet, notifyTest = true) => {
    const payload = makeBuffer(packet.payload);

    if (packet.retain) {
      if (payload.length > 0) retained.set(packet.topic, {
        topic: packet.topic,
        payload: Array.from(payload),
        qos: packet.qos || 0,
        dup: packet.dup || false,
        retain: true,
      });
      else retained.delete(packet.topic);
    }

    for (const socket of sockets) {
      if (Array.from(socket._subscriptions).some((filter) =>
        corresponde_topico(packet.topic, filter)
      )) {
        dispatchMessage(socket, generatePubPacket({
          ...packet,
          payload,
        }));
      }
    }

    if (notifyTest) {
      window._publishedMessages.push({
        topic: packet.topic,
        message: parsePayload(payload),
      });
      window.__mqttTestPublish?.({
        topic: packet.topic,
        payload: Array.from(payload),
        qos: packet.qos || 0,
        dup: packet.dup || false,
        retain: packet.retain || false,
      });
    }
  };

  class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    constructor(url, protocols) {
      this.url = url;
      this.protocol = Array.isArray(protocols) ? protocols[0] || '' : protocols || '';
      this.readyState = MockWebSocket.CONNECTING;
      this.binaryType = 'arraybuffer';
      this.bufferedAmount = 0;
      this.extensions = '';
      this._listeners = new Map();
      this._subscriptions = new Set();

      sockets.add(this);
      setTimeout(() => {
        if (this.readyState !== MockWebSocket.CONNECTING) return;
        this.readyState = MockWebSocket.OPEN;
        this._dispatch('open', {});
      }, 0);
    }

    addEventListener(type, listener) {
      if (!this._listeners.has(type)) this._listeners.set(type, new Set());
      this._listeners.get(type).add(listener);
    }

    removeEventListener(type, listener) {
      this._listeners.get(type)?.delete(listener);
    }

    _dispatch(type, properties) {
      const event = { type, target: this, currentTarget: this, ...properties };
      this[`on${type}`]?.(event);
      for (const listener of this._listeners.get(type) || []) listener(event);
    }

    send(data) {
      const bytes = makeBuffer(data);
      let offset = 0;

      while (offset < bytes.length) {
        const command = bytes[offset];
        const packetType = command >> 4;
        const flags = command & 0x0f;
        const remaining = decodeRemainingLength(bytes, offset + 1);
        const bodyStart = remaining.index;
        const bodyEnd = bodyStart + remaining.value;

        if (packetType === 1) {
          dispatchMessage(this, generateConnack());
        } else if (packetType === 12) {
          dispatchMessage(this, generatePingresp());
        } else if (packetType === 8) {
          const messageId = readUInt16(bytes, bodyStart);
          const subscriptions = [];
          let subscriptionStart = bodyStart + 2;

          while (subscriptionStart < bodyEnd) {
            const topicLength = readUInt16(bytes, subscriptionStart);
            subscriptionStart += 2;
            const topic = decodeUtf8(
              bytes.slice(subscriptionStart, subscriptionStart + topicLength),
            );
            subscriptionStart += topicLength;
            const qos = bytes[subscriptionStart++];
            subscriptions.push({ topic, qos });
            this._subscriptions.add(topic);
            window.__mqttTestSubscribe?.(topic);
          }

          dispatchMessage(this, new Uint8Array([
            0x90,
            2 + subscriptions.length,
            messageId >> 8,
            messageId & 0xff,
            ...subscriptions.map((subscription) => subscription.qos),
          ]));

          for (const retainedPacket of retained.values()) {
            if (subscriptions.some((subscription) =>
              corresponde_topico(retainedPacket.topic, subscription.topic)
            )) {
              dispatchMessage(this, generatePubPacket(retainedPacket));
            }
          }
        } else if (packetType === 10) {
          const messageId = readUInt16(bytes, bodyStart);
          let unsubscribeStart = bodyStart + 2;

          while (unsubscribeStart < bodyEnd) {
            const topicLength = readUInt16(bytes, unsubscribeStart);
            unsubscribeStart += 2;
            const topic = decodeUtf8(
              bytes.slice(unsubscribeStart, unsubscribeStart + topicLength),
            );
            unsubscribeStart += topicLength;
            this._subscriptions.delete(topic);
            window.__mqttTestUnsubscribe?.(topic);
          }

          dispatchMessage(this, new Uint8Array([
            0xb0,
            0x02,
            messageId >> 8,
            messageId & 0xff,
          ]));
        } else if (packetType === 3) {
          const topicLength = readUInt16(bytes, bodyStart);
          const topic = decodeUtf8(
            bytes.slice(bodyStart + 2, bodyStart + 2 + topicLength),
          );
          const qos = (flags >> 1) & 0x03;
          let payloadStart = bodyStart + 2 + topicLength;
          let messageId = 1;

          if (qos > 0) {
            messageId = readUInt16(bytes, payloadStart);
            payloadStart += 2;
          }

          const packet = {
            topic,
            payload: bytes.slice(payloadStart, bodyEnd),
            qos,
            dup: (flags & 0x08) !== 0,
            retain: (flags & 0x01) !== 0,
            messageId,
          };

          routePublish(packet);

          if (qos === 1) dispatchMessage(this, generatePuback(0x40, messageId));
          if (qos === 2) dispatchMessage(this, generatePuback(0x50, messageId));
        } else if (packetType === 6) {
          const messageId = readUInt16(bytes, bodyStart);
          dispatchMessage(this, generatePuback(0x70, messageId));
        } else if (packetType === 14) {
          this.close();
        }

        offset = bodyEnd;
      }
    }

    close() {
      if (this.readyState === MockWebSocket.CLOSED) return;
      this.readyState = MockWebSocket.CLOSING;
      sockets.delete(this);
      setTimeout(() => {
        this.readyState = MockWebSocket.CLOSED;
        this._dispatch('close', {
          code: 1000,
          reason: '',
          wasClean: true,
        });
      }, 0);
    }
  }

  MockWebSocket.CONNECTING = 0;
  MockWebSocket.OPEN = 1;
  MockWebSocket.CLOSING = 2;
  MockWebSocket.CLOSED = 3;

  window.WebSocket = MockWebSocket;
  Object.defineProperty(window, '_mqttClient', {
    configurable: true,
    get: () => window.cliente_mqtt,
  });
  window.__mqttTestSubscriptions = () => Array.from(new Set(
    Array.from(sockets).flatMap((socket) => Array.from(socket._subscriptions)),
  ));
  window.__mqttTestDeliverPublish = (packet) => {
    routePublish({
      ...packet,
      payload: makeBuffer(packet.payload),
    }, false);
  };
};

const corresponde_topico = (topic, filter) => {
  const topicParts = topic.split('/');
  const filterParts = filter.split('/');

  for (let index = 0; index < filterParts.length; index++) {
    if (filterParts[index] === '#') return true;
    if (filterParts[index] === '+') continue;
    if (filterParts[index] !== topicParts[index]) return false;
  }

  return topicParts.length === filterParts.length;
};

export const test = base.extend({
  mqttMock: [async ({ page }, use) => {
    await page.addInitScript(simular_mqtt);
    const bridges = new Set();
    const mqttMock = {
      criar_bridge: async (...paginas) => {
        const paginas_planas = paginas.length === 1 && Array.isArray(paginas[0])
          ? paginas[0]
          : paginas;
        const subscriptions = new Map(paginas_planas.map((pagina) => [pagina, new Set()]));
        const retained = new Map();
        let ativa = true;

        await Promise.all(paginas_planas.map((pagina) =>
          Promise.all([
            pagina.exposeBinding('__mqttTestPublish', async (source, packet) => {
              if (!ativa) return;
              if (packet.retain) {
                if (packet.payload?.length) retained.set(packet.topic, {
                  packet,
                  origin: source.page,
                });
                else retained.delete(packet.topic);
              }

              await Promise.all(paginas_planas.map(async (destino) => {
                if (destino !== source.page &&
                  [...subscriptions.get(destino)].some((filter) =>
                    corresponde_topico(packet.topic, filter)
                  )
                ) {
                  await destino.evaluate((message) =>
                    window.__mqttTestDeliverPublish(message),
                    packet,
                  );
                }
              }));
            }),
            pagina.exposeBinding('__mqttTestSubscribe', async (source, topic) => {
              const subscriptionsOfPage = subscriptions.get(source.page);
              subscriptionsOfPage?.add(topic);

              for (const retainedEntry of retained.values()) {
                if (retainedEntry.origin === source.page) continue;
                if (corresponde_topico(retainedEntry.packet.topic, topic)) {
                  await source.page.evaluate((message) =>
                    window.__mqttTestDeliverPublish(message),
                    retainedEntry.packet,
                  );
                }
              }
            }),
            pagina.exposeBinding('__mqttTestUnsubscribe', (source, topic) => {
              subscriptions.get(source.page)?.delete(topic);
            }),
          ])
        ));

        await Promise.all(paginas_planas.map(async (pagina) => {
          const topics = await pagina.evaluate(() =>
            window.__mqttTestSubscriptions?.() || []
          );
          subscriptions.set(pagina, new Set(topics));
        }));

        const bridge = {
          stop: () => {
            ativa = false;
          },
        };
        bridges.add(bridge);
        return bridge;
      },
    };

    await use(mqttMock);
    for (const bridge of bridges) bridge.stop();
  }, { auto: true }],
});
