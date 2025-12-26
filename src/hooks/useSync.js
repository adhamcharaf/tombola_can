import { useState, useEffect, useCallback } from 'react'
import { getSyncStats } from '../lib/db'
import { addSyncListener, syncPendingParticipations } from '../lib/sync'

export function useSync() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    syncing: 0,
    synced: 0,
    error: 0,
    conflict: 0
  })
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isSyncing, setIsSyncing] = useState(false)

  // Refresh stats
  const refreshStats = useCallback(async () => {
    const newStats = await getSyncStats()
    setStats(newStats)
  }, [])

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return

    setIsSyncing(true)
    try {
      await syncPendingParticipations()
      await refreshStats()
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, refreshStats])

  useEffect(() => {
    // Initial stats
    refreshStats()

    // Listen for sync status changes
    const unsubscribe = addSyncListener(refreshStats)

    // Listen for online/offline
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      unsubscribe()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [refreshStats])

  return {
    stats,
    isOnline,
    isSyncing,
    triggerSync,
    refreshStats,
    pendingCount: stats.pending + stats.error,
    hasErrors: stats.error > 0 || stats.conflict > 0
  }
}
