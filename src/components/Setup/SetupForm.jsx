import { useState, useEffect } from 'react'
import { fetchEmplacements } from '../../lib/supabase'
import { cacheEmplacements, getCachedEmplacements } from '../../lib/db'

export default function SetupForm({ onComplete }) {
  const [emplacements, setEmplacements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedEmplacement, setSelectedEmplacement] = useState('')
  const [operatrice, setOperatrice] = useState('')
  const [formError, setFormError] = useState('')

  // Load emplacements
  useEffect(() => {
    async function loadEmplacements() {
      try {
        setLoading(true)
        setError(null)

        // Try to fetch from server first
        if (navigator.onLine) {
          try {
            const data = await fetchEmplacements()
            setEmplacements(data)
            await cacheEmplacements(data)
          } catch (e) {
            console.error('Failed to fetch emplacements:', e)
            // Fall back to cache
            const cached = await getCachedEmplacements()
            if (cached.length > 0) {
              setEmplacements(cached)
            } else {
              throw new Error('Impossible de charger les emplacements')
            }
          }
        } else {
          // Offline - use cache
          const cached = await getCachedEmplacements()
          if (cached.length > 0) {
            setEmplacements(cached)
          } else {
            throw new Error('Pas de connexion et aucun cache disponible')
          }
        }
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    loadEmplacements()
  }, [])

  // Group emplacements by city
  const groupedEmplacements = emplacements.reduce((acc, emp) => {
    if (!acc[emp.ville]) {
      acc[emp.ville] = []
    }
    acc[emp.ville].push(emp)
    return acc
  }, {})

  const handleSubmit = (e) => {
    e.preventDefault()
    setFormError('')

    if (!selectedEmplacement) {
      setFormError('Veuillez sélectionner un emplacement')
      return
    }

    if (!operatrice.trim() || operatrice.trim().length < 2) {
      setFormError('Veuillez entrer votre nom (minimum 2 caractères)')
      return
    }

    const emplacement = emplacements.find(e => e.id === selectedEmplacement)

    const config = {
      emplacementId: selectedEmplacement,
      emplacementNom: emplacement?.nom || '',
      operatrice: operatrice.trim()
    }

    // Save to localStorage
    localStorage.setItem('tombola_operator_config', JSON.stringify(config))

    onComplete(config)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-smart-red border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des emplacements...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <p className="text-gray-800 font-medium mb-2">Erreur de chargement</p>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto pt-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-smart-red rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-3xl">ST</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">TOMBOLA CAN 2025</h1>
          <p className="text-gray-500 mt-1">Configuration opératrice</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          <div>
            <label className="label-text">Emplacement / Showroom</label>
            <select
              value={selectedEmplacement}
              onChange={(e) => setSelectedEmplacement(e.target.value)}
              className="input-field"
            >
              <option value="">Sélectionnez un emplacement</option>
              {Object.entries(groupedEmplacements).sort().map(([ville, emps]) => (
                <optgroup key={ville} label={ville}>
                  {emps.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nom}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="label-text">Nom de l'opératrice</label>
            <input
              type="text"
              value={operatrice}
              onChange={(e) => setOperatrice(e.target.value)}
              placeholder="Entrez votre nom"
              className="input-field"
              autoComplete="name"
            />
          </div>

          {formError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {formError}
            </div>
          )}

          <button type="submit" className="btn-primary">
            Commencer
          </button>
        </form>

        <p className="text-center text-gray-400 text-xs mt-6">
          Smart Technology Côte d'Ivoire
        </p>
      </div>
    </div>
  )
}
