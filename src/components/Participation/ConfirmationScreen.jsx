import { useEffect, useState } from 'react'
import { getCategoryFromAmount, formatMontant } from '../../constants'
import { formatPhone } from '../../utils/validation'

export default function ConfirmationScreen({ participation, onNewParticipation }) {
  const [countdown, setCountdown] = useState(10)
  const category = getCategoryFromAmount(participation.montant)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      <div className="max-w-md mx-auto pt-8">
        {/* Success animation */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <span className="text-5xl">✅</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            PARTICIPATION ENREGISTRÉE
          </h1>
          <p className="text-green-600 text-sm mt-2">
            {navigator.onLine
              ? 'Synchronisé avec le serveur'
              : 'Sauvegardé hors ligne - synchronisation automatique'}
          </p>
        </div>

        {/* Recap card */}
        <div className="card space-y-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">Participant</p>
              <p className="font-semibold text-lg">
                {participation.nom} {participation.prenom}
              </p>
            </div>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Téléphone</p>
            <p className="font-medium">{formatPhone(participation.telephone)}</p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">N° Facture</p>
            <p className="font-medium">{participation.numFacture}</p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Montant</p>
            <p className="font-bold text-lg text-smart-red">
              {formatMontant(participation.montant)}
            </p>
          </div>

          {category && (
            <div className={`${category.color} rounded-xl p-4 text-center text-white`}>
              <div className="text-3xl mb-1">{category.emoji}</div>
              <div className="font-bold">Catégorie {category.label}</div>
              <div className="text-sm opacity-90">{category.description}</div>
            </div>
          )}
        </div>

        {/* SMS notice */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📱</span>
            <div>
              <p className="font-medium text-blue-900">
                SMS de confirmation
              </p>
              <p className="text-blue-700 text-sm">
                Un SMS sera envoyé au participant après vérification de la facture.
              </p>
            </div>
          </div>
        </div>

        {/* New participation button */}
        <button
          onClick={onNewParticipation}
          className="btn-primary"
        >
          NOUVELLE PARTICIPATION
          {countdown > 0 && (
            <span className="ml-2 opacity-70">({countdown}s)</span>
          )}
        </button>
      </div>
    </div>
  )
}
