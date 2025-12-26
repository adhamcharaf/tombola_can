import { useState, useEffect } from 'react'
import { saveParticipationLocally, checkInvoiceExistsLocally } from '../../lib/db'
import { checkInvoiceExists } from '../../lib/supabase'
import { validateParticipationForm, validatePhone, formatPhone } from '../../utils/validation'
import { MESSAGES, MIN_AMOUNT } from '../../constants'
import CategoryBadge from './CategoryBadge'
import CameraCapture from './CameraCapture'

export default function ParticipationForm({ operatorConfig, onSuccess }) {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    numFacture: '',
    montant: '',
    photoBase64: null
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [invoiceChecking, setInvoiceChecking] = useState(false)
  const [invoiceError, setInvoiceError] = useState(null)

  // Format phone as user types
  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '').slice(0, 10)
    setFormData(prev => ({ ...prev, telephone: value }))
  }

  // Format montant as number only
  const handleMontantChange = (e) => {
    let value = e.target.value.replace(/\D/g, '')
    setFormData(prev => ({ ...prev, montant: value }))
  }

  // Check invoice uniqueness when field loses focus
  const handleInvoiceBlur = async () => {
    const invoice = formData.numFacture.trim()
    if (!invoice) return

    setInvoiceChecking(true)
    setInvoiceError(null)

    try {
      // Check local first
      const existsLocal = await checkInvoiceExistsLocally(invoice)
      if (existsLocal) {
        setInvoiceError(MESSAGES.INVOICE_DUPLICATE)
        return
      }

      // Check server if online
      if (navigator.onLine) {
        const existsServer = await checkInvoiceExists(invoice)
        if (existsServer) {
          setInvoiceError(MESSAGES.INVOICE_EXISTS_SERVER)
        }
      }
    } catch (e) {
      console.error('Invoice check error:', e)
    } finally {
      setInvoiceChecking(false)
    }
  }

  const handlePhotoCapture = (photoBase64) => {
    setFormData(prev => ({ ...prev, photoBase64 }))
    setShowCamera(false)
    // Clear photo error if it exists
    if (errors.photo) {
      setErrors(prev => ({ ...prev, photo: null }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})

    // Validate form
    const validation = validateParticipationForm(formData)
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    // Check invoice one more time
    const existsLocal = await checkInvoiceExistsLocally(formData.numFacture.trim())
    if (existsLocal) {
      setErrors({ numFacture: MESSAGES.INVOICE_DUPLICATE })
      return
    }

    setIsSubmitting(true)

    try {
      // Save locally first (offline-first)
      const participation = await saveParticipationLocally({
        ...formData,
        montant: parseInt(formData.montant),
        numFacture: formData.numFacture.trim(),
        emplacementId: operatorConfig.emplacementId,
        operatrice: operatorConfig.operatrice
      })

      // Success callback
      onSuccess({
        ...formData,
        montant: parseInt(formData.montant),
        localId: participation.localId
      })

    } catch (error) {
      console.error('Save error:', error)
      setErrors({ submit: 'Erreur lors de l\'enregistrement. Veuillez réessayer.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handlePhotoCapture}
        onCancel={() => setShowCamera(false)}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 pb-24 space-y-4">
      {/* Category badge at top */}
      <CategoryBadge montant={formData.montant} />

      {/* Nom */}
      <div>
        <label className="label-text">Nom</label>
        <input
          type="text"
          value={formData.nom}
          onChange={(e) => updateField('nom', e.target.value)}
          placeholder="NOM du participant"
          className={`input-field uppercase ${errors.nom ? 'input-error' : ''}`}
          autoComplete="off"
        />
        {errors.nom && <p className="error-text">{errors.nom}</p>}
      </div>

      {/* Prénom */}
      <div>
        <label className="label-text">Prénom</label>
        <input
          type="text"
          value={formData.prenom}
          onChange={(e) => updateField('prenom', e.target.value)}
          placeholder="Prénom du participant"
          className={`input-field capitalize ${errors.prenom ? 'input-error' : ''}`}
          autoComplete="off"
        />
        {errors.prenom && <p className="error-text">{errors.prenom}</p>}
      </div>

      {/* Téléphone */}
      <div>
        <label className="label-text">Téléphone</label>
        <input
          type="tel"
          inputMode="numeric"
          value={formData.telephone}
          onChange={handlePhoneChange}
          placeholder="07 XX XX XX XX"
          className={`input-field ${errors.telephone ? 'input-error' : ''}`}
          autoComplete="tel"
        />
        {errors.telephone && <p className="error-text">{errors.telephone}</p>}
        {formData.telephone && validatePhone(formData.telephone) && (
          <p className="text-green-600 text-sm mt-1">
            {formatPhone(formData.telephone)}
          </p>
        )}
      </div>

      {/* N° Facture */}
      <div>
        <label className="label-text">N° Facture</label>
        <div className="relative">
          <input
            type="text"
            value={formData.numFacture}
            onChange={(e) => {
              updateField('numFacture', e.target.value)
              setInvoiceError(null)
            }}
            onBlur={handleInvoiceBlur}
            placeholder="Numéro de la facture"
            className={`input-field ${errors.numFacture || invoiceError ? 'input-error' : ''}`}
            autoComplete="off"
          />
          {invoiceChecking && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="animate-spin inline-block w-5 h-5 border-2 border-gray-300 border-t-smart-red rounded-full"></span>
            </span>
          )}
        </div>
        {(errors.numFacture || invoiceError) && (
          <p className="error-text">{errors.numFacture || invoiceError}</p>
        )}
      </div>

      {/* Montant */}
      <div>
        <label className="label-text">Montant (FCFA)</label>
        <input
          type="text"
          inputMode="numeric"
          value={formData.montant}
          onChange={handleMontantChange}
          placeholder={`Minimum ${MIN_AMOUNT.toLocaleString()} FCFA`}
          className={`input-field ${errors.montant ? 'input-error' : ''}`}
          autoComplete="off"
        />
        {errors.montant && <p className="error-text">{errors.montant}</p>}
        {formData.montant && (
          <p className="text-gray-500 text-sm mt-1">
            {parseInt(formData.montant).toLocaleString()} FCFA
          </p>
        )}
      </div>

      {/* Photo facture */}
      <div>
        <label className="label-text">Photo de la facture</label>
        {formData.photoBase64 ? (
          <div className="relative">
            <img
              src={formData.photoBase64}
              alt="Facture"
              className="w-full h-48 object-cover rounded-xl"
            />
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              className="absolute bottom-2 right-2 bg-white/90 text-gray-800 px-3 py-1 rounded-lg text-sm font-medium"
            >
              Reprendre
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCamera(true)}
            className={`w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 ${
              errors.photo ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50'
            }`}
          >
            <span className="text-3xl">📷</span>
            <span className="text-gray-600 font-medium">Prendre une photo</span>
          </button>
        )}
        {errors.photo && <p className="error-text">{errors.photo}</p>}
      </div>

      {/* Submit error */}
      {errors.submit && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {errors.submit}
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting || invoiceError}
        className="btn-primary mt-6"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>
            Enregistrement...
          </span>
        ) : (
          'ENREGISTRER LA PARTICIPATION'
        )}
      </button>
    </form>
  )
}
