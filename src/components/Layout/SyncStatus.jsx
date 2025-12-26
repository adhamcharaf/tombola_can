import { useSync } from '../../hooks/useSync'

export default function SyncStatus() {
  const { stats, isOnline, isSyncing, triggerSync, pendingCount, hasErrors } = useSync()

  // Determine status
  let statusClass = 'bg-gray-100 text-gray-600'
  let statusIcon = '✓'
  let statusText = 'Tout est synchronisé'

  if (!isOnline) {
    statusClass = 'bg-yellow-100 text-yellow-800'
    statusIcon = '📴'
    statusText = 'Hors ligne - Données sauvegardées'
  } else if (isSyncing) {
    statusClass = 'bg-blue-100 text-blue-800'
    statusIcon = '⏳'
    statusText = 'Synchronisation en cours...'
  } else if (hasErrors) {
    statusClass = 'bg-red-100 text-red-800'
    statusIcon = '⚠️'
    statusText = `${stats.error + stats.conflict} erreur(s) de sync`
  } else if (pendingCount > 0) {
    statusClass = 'bg-orange-100 text-orange-800'
    statusIcon = '🔄'
    statusText = `${pendingCount} en attente de sync`
  } else {
    statusClass = 'bg-green-100 text-green-800'
    statusIcon = '✅'
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40">
      <button
        onClick={triggerSync}
        disabled={!isOnline || isSyncing || pendingCount === 0}
        className={`w-full py-3 px-4 ${statusClass} flex items-center justify-center gap-2 text-sm font-medium transition-colors`}
      >
        <span>{statusIcon}</span>
        <span>{statusText}</span>
        {isOnline && pendingCount > 0 && !isSyncing && (
          <span className="text-xs opacity-70">(appuyer pour sync)</span>
        )}
      </button>
    </footer>
  )
}
