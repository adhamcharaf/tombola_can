import Dexie from 'dexie'

// Create database instance
export const db = new Dexie('TombolaCAN2025')

// Define schema
db.version(1).stores({
  emplacements: 'id, nom, ville',
  participations: '++id, localId, numFacture, syncStatus, createdAt, emplacementId',
  config: 'key'
})

// Participation sync statuses
export const SYNC_STATUS = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  ERROR: 'error',
  CONFLICT: 'conflict'
}

// Generate unique local ID
export function generateLocalId() {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Save participation locally (offline-first)
export async function saveParticipationLocally(participation) {
  const localId = generateLocalId()

  const record = {
    localId,
    nom: participation.nom,
    prenom: participation.prenom,
    telephone: participation.telephone,
    numFacture: participation.numFacture,
    montant: participation.montant,
    emplacementId: participation.emplacementId,
    operatrice: participation.operatrice,
    photoBase64: participation.photoBase64 || null,
    syncStatus: SYNC_STATUS.PENDING,
    syncError: null,
    serverId: null,
    createdAt: new Date().toISOString(),
    syncedAt: null
  }

  await db.participations.add(record)
  return record
}

// Check if invoice exists locally
export async function checkInvoiceExistsLocally(numFacture) {
  const existing = await db.participations
    .where('numFacture')
    .equals(numFacture)
    .first()
  return !!existing
}

// Get all pending participations
export async function getPendingParticipations() {
  return db.participations
    .where('syncStatus')
    .anyOf([SYNC_STATUS.PENDING, SYNC_STATUS.ERROR])
    .toArray()
}

// Update participation sync status
export async function updateParticipationStatus(localId, status, extra = {}) {
  await db.participations
    .where('localId')
    .equals(localId)
    .modify({
      syncStatus: status,
      ...extra,
      ...(status === SYNC_STATUS.SYNCED ? { syncedAt: new Date().toISOString() } : {})
    })
}

// Get sync stats
export async function getSyncStats() {
  const all = await db.participations.toArray()

  return {
    total: all.length,
    pending: all.filter(p => p.syncStatus === SYNC_STATUS.PENDING).length,
    syncing: all.filter(p => p.syncStatus === SYNC_STATUS.SYNCING).length,
    synced: all.filter(p => p.syncStatus === SYNC_STATUS.SYNCED).length,
    error: all.filter(p => p.syncStatus === SYNC_STATUS.ERROR).length,
    conflict: all.filter(p => p.syncStatus === SYNC_STATUS.CONFLICT).length
  }
}

// Cache emplacements locally
export async function cacheEmplacements(emplacements) {
  await db.emplacements.clear()
  await db.emplacements.bulkAdd(emplacements)
}

// Get cached emplacements
export async function getCachedEmplacements() {
  return db.emplacements.toArray()
}

// Get operator config
export async function getConfig(key) {
  const config = await db.config.get(key)
  return config?.value
}

// Set operator config
export async function setConfig(key, value) {
  await db.config.put({ key, value })
}
