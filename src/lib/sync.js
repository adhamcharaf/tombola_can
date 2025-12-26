import { db, SYNC_STATUS, getPendingParticipations, updateParticipationStatus } from './db'
import { insertParticipation, uploadPhoto } from './supabase'

let isSyncing = false
let syncListeners = []

// Add listener for sync status changes
export function addSyncListener(listener) {
  syncListeners.push(listener)
  return () => {
    syncListeners = syncListeners.filter(l => l !== listener)
  }
}

// Notify all listeners
function notifyListeners() {
  syncListeners.forEach(listener => listener())
}

// Sync a single participation
async function syncSingleParticipation(participation) {
  try {
    // Update status to syncing
    await updateParticipationStatus(participation.localId, SYNC_STATUS.SYNCING)
    notifyListeners()

    // Insert participation to Supabase
    const serverData = await insertParticipation(participation)

    // Upload photo if exists
    if (participation.photoBase64) {
      console.log('📸 Photo found, uploading...', {
        size: participation.photoBase64.length,
        emplacementId: participation.emplacementId,
        localId: participation.localId
      })
      try {
        const photoPath = await uploadPhoto(
          participation.emplacementId,
          participation.localId,
          participation.photoBase64
        )
        console.log('✅ Photo uploaded successfully:', photoPath)
      } catch (photoError) {
        console.error('❌ Photo upload failed:', photoError.message, photoError)
        // Don't fail the whole sync for photo issues
      }
    } else {
      console.log('⚠️ No photo in participation')
    }

    // Mark as synced
    await updateParticipationStatus(participation.localId, SYNC_STATUS.SYNCED, {
      serverId: serverData.id
    })

    // Clear photo data to save space
    await db.participations
      .where('localId')
      .equals(participation.localId)
      .modify({ photoBase64: null })

    notifyListeners()
    return { success: true }

  } catch (error) {
    console.error('Sync error for', participation.localId, error)

    if (error.message === 'DUPLICATE_INVOICE') {
      await updateParticipationStatus(participation.localId, SYNC_STATUS.CONFLICT, {
        syncError: 'Cette facture existe déjà dans le système'
      })
    } else {
      await updateParticipationStatus(participation.localId, SYNC_STATUS.ERROR, {
        syncError: error.message || 'Erreur de synchronisation'
      })
    }

    notifyListeners()
    return { success: false, error: error.message }
  }
}

// Sync all pending participations
export async function syncPendingParticipations() {
  if (isSyncing) return { synced: 0, failed: 0 }
  if (!navigator.onLine) return { synced: 0, failed: 0 }

  isSyncing = true
  let synced = 0
  let failed = 0

  try {
    const pending = await getPendingParticipations()

    for (const participation of pending) {
      const result = await syncSingleParticipation(participation)
      if (result.success) {
        synced++
      } else {
        failed++
      }
      // Small delay between syncs to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 300))
    }

  } finally {
    isSyncing = false
  }

  return { synced, failed }
}

// Auto-sync when online
let syncInterval = null

export function startAutoSync(intervalMs = 30000) {
  // Sync immediately if online
  if (navigator.onLine) {
    syncPendingParticipations()
  }

  // Listen for online event
  window.addEventListener('online', () => {
    console.log('Back online, syncing...')
    syncPendingParticipations()
  })

  // Periodic sync
  syncInterval = setInterval(() => {
    if (navigator.onLine) {
      syncPendingParticipations()
    }
  }, intervalMs)
}

export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}
