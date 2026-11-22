import { test as base } from '@playwright/test';

export const simular_mqtt = () => {
  window._publishedMessages = [];
  const subscriptions = new Set();
  const senderId = crypto.randomUUID();
  const channel = new BroadcastChannel('kapivatar-e2e-mqtt');

  const topico_corresponde = (topico, assinatura) => {
    const partes_topico = topico.split('/');
    const partes_assinatura = assinatura.split('/');

    for (let indice = 0; indice < partes_assinatura.length; indice++) {
      if (partes_assinatura[indice] === '#') return true;
      if (partes_assinatura[indice] === '+') continue;
      if (partes_assinatura[indice] !== partes_topico[indice]) return false;
    }

    return partes_topico.length === partes_assinatura.length;
  };

  const inscrito_no_topico = (topico) =>
    Array.from(subscriptions).some((assinatura) =>
      topico_corresponde(topico, assinatura),
    );

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
              if (!inscrito_no_topico(topic) || !listeners['message']) return;
              listeners['message'](topic, typeof data === 'string'
                ? data
                : JSON.stringify(data));
            }
          };
          window._mqttClient = client;
          channel.onmessage = (event) => {
            const received = event.data;
            if (received.senderId === senderId || !inscrito_no_topico(received.topic)) return;
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

export const criar_bridge_mqtt = (paginas) => {
  let ativa = true;
  const offsets = paginas.map(() => paginas.map(() => 0));

  const executar = (async () => {
    while (ativa) {
      const publicacoes = await Promise.all(paginas.map((pagina) =>
        pagina.evaluate(() => window._publishedMessages ?? []),
      ));

      for (let origem = 0; origem < paginas.length; origem++) {
        for (let destino = 0; destino < paginas.length; destino++) {
          if (origem === destino) continue;

          if (offsets[origem][destino] > publicacoes[origem].length) {
            offsets[origem][destino] = 0;
          }

          for (
            let indice = offsets[origem][destino];
            indice < publicacoes[origem].length;
            indice++
          ) {
            const publicacao = publicacoes[origem][indice];
            await paginas[destino].evaluate(({ topic, message }) =>
              window._mqttClient._simulateIncoming(topic, message),
            publicacao);
          }

          offsets[origem][destino] = publicacoes[origem].length;
        }
      }

      await new Promise((resolver) => setTimeout(resolver, 25));
    }
  })();

  return {
    stop: async () => {
      ativa = false;
      await executar;
    },
  };
};

export const test = base.extend({
  mqttMock: [async ({ page }, use) => {
    await page.addInitScript(simular_mqtt);
    const bridges = new Set();
    const mqttMock = {
      criar_bridge: (...paginas) => {
        const paginas_planas = paginas.length === 1 && Array.isArray(paginas[0])
          ? paginas[0]
          : paginas;
        const bridge = criar_bridge_mqtt(paginas_planas);
        bridges.add(bridge);
        return {
          stop: async () => {
            await bridge.stop();
            bridges.delete(bridge);
          },
        };
      },
    };

    await use(mqttMock);
    await Promise.all(Array.from(bridges, (bridge) => bridge.stop()));
  }, { auto: true }],
});
