/**
 * IndexedDB-based offline cache for POS
 * Stores products, customers, and pending quotes for offline use
 */

const DB_NAME = 'vision-pos-cache'
const DB_VERSION = 1

interface CacheStore {
  products: IDBObjectStore
  customers: IDBObjectStore
  pendingQuotes: IDBObjectStore
  settings: IDBObjectStore
}

type StoreNames = keyof CacheStore

let dbPromise: Promise<IDBDatabase> | null = null

/**
 * Initialize the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Products store - cached product catalog
      if (!db.objectStoreNames.contains('products')) {
        const productsStore = db.createObjectStore('products', { keyPath: 'id' })
        productsStore.createIndex('category', 'category', { unique: false })
        productsStore.createIndex('updatedAt', 'updatedAt', { unique: false })
      }

      // Customers store - recently accessed customers
      if (!db.objectStoreNames.contains('customers')) {
        const customersStore = db.createObjectStore('customers', { keyPath: 'id' })
        customersStore.createIndex('lastName', 'lastName', { unique: false })
        customersStore.createIndex('accessedAt', 'accessedAt', { unique: false })
      }

      // Pending quotes store - quotes created offline
      if (!db.objectStoreNames.contains('pendingQuotes')) {
        const quotesStore = db.createObjectStore('pendingQuotes', {
          keyPath: 'localId',
          autoIncrement: true,
        })
        quotesStore.createIndex('status', 'status', { unique: false })
        quotesStore.createIndex('createdAt', 'createdAt', { unique: false })
      }

      // Settings store - app settings
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
    }
  })

  return dbPromise
}

/**
 * Get all items from a store
 */
export async function getAll<T>(storeName: StoreNames): Promise<T[]> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

/**
 * Get a single item by key
 */
export async function get<T>(storeName: StoreNames, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.get(key)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

/**
 * Put an item (add or update)
 */
export async function put<T>(storeName: StoreNames, item: T): Promise<IDBValidKey> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.put(item)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

/**
 * Put multiple items
 */
export async function putAll<T>(storeName: StoreNames, items: T[]): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)

    transaction.onerror = () => reject(transaction.error)
    transaction.oncomplete = () => resolve()

    for (const item of items) {
      store.put(item)
    }
  })
}

/**
 * Delete an item by key
 */
export async function remove(storeName: StoreNames, key: IDBValidKey): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.delete(key)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Clear all items in a store
 */
export async function clear(storeName: StoreNames): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.clear()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Get items by index
 */
export async function getByIndex<T>(
  storeName: StoreNames,
  indexName: string,
  value: IDBValidKey
): Promise<T[]> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const index = store.index(indexName)
    const request = index.getAll(value)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

// Convenience functions for specific stores

export const productsCache = {
  getAll: () => getAll<Product>('products'),
  get: (id: string) => get<Product>('products', id),
  put: (product: Product) => put('products', product),
  putAll: (products: Product[]) => putAll('products', products),
  getByCategory: (category: string) =>
    getByIndex<Product>('products', 'category', category),
  clear: () => clear('products'),
}

export const customersCache = {
  getAll: () => getAll<Customer>('customers'),
  get: (id: string) => get<Customer>('customers', id),
  put: (customer: Customer) =>
    put('customers', { ...customer, accessedAt: new Date().toISOString() }),
  search: async (query: string) => {
    const customers = await getAll<Customer>('customers')
    const lowerQuery = query.toLowerCase()
    return customers.filter(
      (c) =>
        c.firstName?.toLowerCase().includes(lowerQuery) ||
        c.lastName?.toLowerCase().includes(lowerQuery)
    )
  },
  clear: () => clear('customers'),
}

export const pendingQuotesCache = {
  getAll: () => getAll<PendingQuote>('pendingQuotes'),
  add: (quote: Omit<PendingQuote, 'localId'>) =>
    put('pendingQuotes', { ...quote, createdAt: new Date().toISOString() }),
  remove: (localId: number) => remove('pendingQuotes', localId),
  clear: () => clear('pendingQuotes'),
}

// Types
interface Product {
  id: string
  category: string
  name: string
  price: number
  updatedAt?: string
  [key: string]: unknown
}

interface Customer {
  id: string
  firstName: string
  lastName: string
  email?: string
  accessedAt?: string
  [key: string]: unknown
}

interface PendingQuote {
  localId?: number
  customerId?: string
  items: unknown[]
  totals: unknown
  createdAt?: string
  status: 'pending' | 'synced' | 'failed'
  [key: string]: unknown
}
