export function mockIndexedDB(page) {
  return page.addInitScript(() => {
    const STORAGE_KEY = '_mockIndexedDB_data';

    function replacer(key, value) {
      if (value instanceof ArrayBuffer) {
        return {
          __type: 'ArrayBuffer',
          data: Array.from(new Uint8Array(value))
        };
      }
      if (value instanceof Uint8Array) {
        return {
          __type: 'Uint8Array',
          data: Array.from(value)
        };
      }
      return value;
    }

    function reviver(key, value) {
      if (value && typeof value === 'object' && value.__type === 'ArrayBuffer') {
        return new Uint8Array(value.data).buffer;
      }
      if (value && typeof value === 'object' && value.__type === 'Uint8Array') {
        return new Uint8Array(value.data);
      }
      return value;
    }

    // Helper to load database state from sessionStorage
    function loadDBs() {
      try {
        const data = sessionStorage.getItem(STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data, reviver);
          const dbsMap = new Map();
          for (const [dbName, dbData] of Object.entries(parsed)) {
            const dbObj = { name: dbName, stores: new Map() };
            for (const [storeName, storeData] of Object.entries(dbData.stores || {})) {
              dbObj.stores.set(storeName, new Map(Object.entries(storeData)));
            }
            dbsMap.set(dbName, dbObj);
          }
          return dbsMap;
        }
      } catch (e) {
        console.error("Error loading mock IDB from sessionStorage:", e);
      }
      return new Map();
    }

    // Helper to save database state to sessionStorage
    function saveDBs(dbsMap) {
      try {
        const obj = {};
        for (const [dbName, dbObj] of dbsMap.entries()) {
          const storesObj = {};
          for (const [storeName, storeMap] of dbObj.stores.entries()) {
            storesObj[storeName] = Object.fromEntries(storeMap.entries());
          }
          obj[dbName] = { name: dbName, stores: storesObj };
        }
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj, replacer));
      } catch (e) {
        console.error("Error saving mock IDB to sessionStorage:", e);
      }
    }

    class MockIDBRequest {
      constructor() {
        this.onsuccess = null;
        this.onerror = null;
        this.onupgradeneeded = null;
        this.result = null;
        this.error = null;
      }
    }

    class MockIDBDatabase {
      constructor(name) {
        this.name = name;
        this.stores = new Map();
      }

      createObjectStore(name) {
        if (!this.stores.has(name)) {
          this.stores.set(name, new Map());
        }
        return this.stores.get(name);
      }

      transaction(storeNames, mode) {
        const names = Array.isArray(storeNames) ? storeNames : [storeNames];
        return new MockIDBTransaction(this, names, mode);
      }
    }

    class MockIDBTransaction {
      constructor(db, storeNames, mode) {
        this.db = db;
        this.storeNames = storeNames;
        this.mode = mode;
      }

      objectStore(name) {
        const dbsMap = loadDBs();
        let dbObj = dbsMap.get(this.db.name);
        if (!dbObj) {
          dbObj = { name: this.db.name, stores: new Map() };
          dbsMap.set(this.db.name, dbObj);
        }
        let storeMap = dbObj.stores.get(name);
        if (!storeMap) {
          storeMap = new Map();
          dbObj.stores.set(name, storeMap);
          saveDBs(dbsMap);
        }
        return new MockIDBObjectStore(this.db.name, name, storeMap);
      }
    }

    class MockIDBObjectStore {
      constructor(dbName, storeName, storeMap) {
        this.dbName = dbName;
        this.storeName = storeName;
        this.map = storeMap;
      }

      get(key) {
        const req = new MockIDBRequest();
        setTimeout(() => {
          const dbsMap = loadDBs();
          const storeMap = dbsMap.get(this.dbName)?.stores?.get(this.storeName) || new Map();
          req.result = storeMap.get(key);
          if (req.onsuccess) {
            req.onsuccess({ target: req });
          }
        }, 0);
        return req;
      }

      put(value, key) {
        const req = new MockIDBRequest();
        setTimeout(() => {
          const dbsMap = loadDBs();
          let dbObj = dbsMap.get(this.dbName);
          if (!dbObj) {
            dbObj = { name: this.dbName, stores: new Map() };
            dbsMap.set(this.dbName, dbObj);
          }
          let storeMap = dbObj.stores.get(this.storeName);
          if (!storeMap) {
            storeMap = new Map();
            dbObj.stores.set(this.storeName, storeMap);
          }
          storeMap.set(key, value);
          saveDBs(dbsMap);

          req.result = key;
          if (req.onsuccess) {
            req.onsuccess({ target: req });
          }
        }, 0);
        return req;
      }

      delete(key) {
        const req = new MockIDBRequest();
        setTimeout(() => {
          const dbsMap = loadDBs();
          const dbObj = dbsMap.get(this.dbName);
          if (dbObj) {
            const storeMap = dbObj.stores.get(this.storeName);
            if (storeMap) {
              storeMap.delete(key);
              saveDBs(dbsMap);
            }
          }
          req.result = undefined;
          if (req.onsuccess) {
            req.onsuccess({ target: req });
          }
        }, 0);
        return req;
      }

      getKey(key) {
        const req = new MockIDBRequest();
        setTimeout(() => {
          const dbsMap = loadDBs();
          const storeMap = dbsMap.get(this.dbName)?.stores?.get(this.storeName) || new Map();
          req.result = storeMap.has(key) ? key : undefined;
          if (req.onsuccess) {
            req.onsuccess({ target: req });
          }
        }, 0);
        return req;
      }
    }

    const mockIDBFactory = {
      open(name, version) {
        const req = new MockIDBRequest();
        setTimeout(() => {
          const dbsMap = loadDBs();
          let dbObj = dbsMap.get(name);
          let upgradeNeeded = false;
          if (!dbObj) {
            dbObj = { name: name, stores: new Map() };
            dbsMap.set(name, dbObj);
            saveDBs(dbsMap);
            upgradeNeeded = true;
          }
          const db = new MockIDBDatabase(name);
          db.stores = dbObj.stores;
          req.result = db;

          if (upgradeNeeded && req.onupgradeneeded) {
            req.onupgradeneeded({ target: req });
          }
          if (req.onsuccess) {
            req.onsuccess({ target: req });
          }
        }, 0);
        return req;
      }
    };

    Object.defineProperty(window, 'indexedDB', {
      value: mockIDBFactory,
      writable: true,
      configurable: true
    });
  });
}
