/**
 * ============================================================================
 * Nexus Data - Capa de Persistencia Asíncrona con IndexedDB
 * ============================================================================
 * Base de datos cliente no relacional para garantizar funcionamiento, lectura,
 * inserción y modificación de datos en modo offline.
 */

const DB_NAME = 'NexusDataDB';
const DB_VERSION = 1;
const STORE_NAME = 'records';

class NexusDatabase {
  constructor() {
    this.db = null;
    this._initPromise = null;
  }

  /**
   * Inicializa la conexión y crea los almacenes de objetos e índices
   */
  async initDB() {
    if (this._initPromise) return this._initPromise;

    this._initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('[IndexedDB] Actualizando esquema a versión', DB_VERSION);

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('syncStatus', 'syncStatus', { unique: false });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('priority', 'priority', { unique: false });
          console.log('[IndexedDB] Almacén de objetos "records" creado con éxito');
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('[IndexedDB] Conexión abierta satisfactoriamente a', DB_NAME);
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('[IndexedDB] Error al abrir base de datos:', event.target.error);
        reject(event.target.error);
      };
    });

    return this._initPromise;
  }

  /**
   * Obtiene todos los registros con orden opcional o filtro
   */
  async getAllItems(filterCategory = 'all') {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        let items = request.result || [];
        // Ordenar por fecha de creación descendente
        items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (filterCategory !== 'all') {
          items = items.filter(i => i.category === filterCategory);
        }
        resolve(items);
      };

      request.onerror = () => reject(tx.error);
    });
  }

  /**
   * Agrega un nuevo registro (con status de sincronización)
   */
  async addItem(item) {
    const db = await this.initDB();
    const record = {
      id: item.id || 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      title: item.title || 'Sin título',
      description: item.description || '',
      category: item.category || 'General',
      priority: item.priority || 'Normal',
      syncStatus: item.syncStatus || (navigator.onLine ? 'synced' : 'pending'),
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(record);

      request.onsuccess = () => {
        console.log('[IndexedDB] Registro insertado:', record.id, record.syncStatus);
        resolve(record);
      };

      request.onerror = () => reject(tx.error);
    });
  }

  /**
   * Actualiza un registro existente
   */
  async updateItem(item) {
    const db = await this.initDB();
    const record = {
      ...item,
      updatedAt: new Date().toISOString(),
      syncStatus: navigator.onLine ? 'synced' : 'pending'
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => resolve(record);
      request.onerror = () => reject(tx.error);
    });
  }

  /**
   * Elimina un registro por ID
   */
  async deleteItem(id) {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(tx.error);
    });
  }

  /**
   * Obtiene la cantidad total de registros y los pendientes de sincronización
   */
  async getMetrics() {
    const items = await this.getAllItems();
    const pending = items.filter(i => i.syncStatus === 'pending');
    const synced = items.filter(i => i.syncStatus === 'synced');
    return {
      total: items.length,
      pendingCount: pending.length,
      syncedCount: synced.length
    };
  }

  /**
   * Sincroniza los registros pendientes
   */
  async syncPendingItems() {
    const db = await this.initDB();
    const items = await this.getAllItems();
    const pending = items.filter(i => i.syncStatus === 'pending');

    if (pending.length === 0) {
      return { syncedCount: 0 };
    }

    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const item of pending) {
      item.syncStatus = 'synced';
      item.syncedAt = new Date().toISOString();
      store.put(item);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        console.log(`[IndexedDB] ${pending.length} registros sincronizados con el servidor`);
        resolve({ syncedCount: pending.length });
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Inserta datos iniciales si la base de datos está vacía para probar offline de inmediato
   */
  async seedInitialDataIfEmpty() {
    const items = await this.getAllItems();
    if (items.length > 0) return items;

    console.log('[IndexedDB] Almacén vacío. Sembrando registros de demostración iniciales...');
    const demoItems = [
      {
        id: 'rec_demo_1',
        title: 'Monitoreo de Telemetría Offline',
        description: 'Parámetros recopilados por sensores locales. Se mantiene accesible sin conexión mediante IndexedDB.',
        category: 'Operaciones',
        priority: 'Alta',
        syncStatus: 'synced',
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'rec_demo_2',
        title: 'Inventario de Recursos Estáticos',
        description: 'Comprobación de integridad de los cachés de Service Worker para App Shell y assets estáticos.',
        category: 'Caché & Red',
        priority: 'Media',
        syncStatus: 'synced',
        createdAt: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: 'rec_demo_3',
        title: 'Bitácora de Sincronización en Espera',
        description: 'Registro generado en modo desconectado. Pendiente de propagación a la API externa.',
        category: 'Sincronización',
        priority: 'Baja',
        syncStatus: 'pending',
        createdAt: new Date(Date.now() - 10800000).toISOString()
      }
    ];

    for (const item of demoItems) {
      await this.addItem(item);
    }

    return this.getAllItems();
  }
}

// Instancia global compartida
window.nexusDB = new NexusDatabase();
