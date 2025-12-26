import { useState, useEffect } from 'react'
import { startAutoSync } from './lib/sync'
import Header from './components/Layout/Header'
import SyncStatus from './components/Layout/SyncStatus'
import SetupForm from './components/Setup/SetupForm'
import ParticipationForm from './components/Participation/ParticipationForm'
import ConfirmationScreen from './components/Participation/ConfirmationScreen'

// App states
const SCREENS = {
  LOADING: 'loading',
  SETUP: 'setup',
  PARTICIPATION: 'participation',
  CONFIRMATION: 'confirmation'
}

function App() {
  const [screen, setScreen] = useState(SCREENS.LOADING)
  const [operatorConfig, setOperatorConfig] = useState(null)
  const [lastParticipation, setLastParticipation] = useState(null)

  // Check for existing config on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('tombola_operator_config')
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig)
        setOperatorConfig(config)
        setScreen(SCREENS.PARTICIPATION)
      } catch (e) {
        setScreen(SCREENS.SETUP)
      }
    } else {
      setScreen(SCREENS.SETUP)
    }

    // Start auto-sync
    startAutoSync()
  }, [])

  // Handle setup complete
  const handleSetupComplete = (config) => {
    setOperatorConfig(config)
    setScreen(SCREENS.PARTICIPATION)
  }

  // Handle edit config
  const handleEditConfig = () => {
    setScreen(SCREENS.SETUP)
  }

  // Handle participation success
  const handleParticipationSuccess = (participation) => {
    setLastParticipation(participation)
    setScreen(SCREENS.CONFIRMATION)
  }

  // Handle new participation
  const handleNewParticipation = () => {
    setLastParticipation(null)
    setScreen(SCREENS.PARTICIPATION)
  }

  // Loading state
  if (screen === SCREENS.LOADING) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-smart-red rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-2xl">ST</span>
          </div>
          <p className="text-gray-500">Chargement...</p>
        </div>
      </div>
    )
  }

  // Setup screen
  if (screen === SCREENS.SETUP) {
    return <SetupForm onComplete={handleSetupComplete} />
  }

  // Confirmation screen
  if (screen === SCREENS.CONFIRMATION && lastParticipation) {
    return (
      <>
        <Header operatorConfig={operatorConfig} />
        <ConfirmationScreen
          participation={lastParticipation}
          onNewParticipation={handleNewParticipation}
        />
        <SyncStatus />
      </>
    )
  }

  // Main participation screen
  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        operatorConfig={operatorConfig}
        onEditConfig={handleEditConfig}
      />
      <main>
        <ParticipationForm
          operatorConfig={operatorConfig}
          onSuccess={handleParticipationSuccess}
        />
      </main>
      <SyncStatus />
    </div>
  )
}

export default App
