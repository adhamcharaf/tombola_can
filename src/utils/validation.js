import { MIN_AMOUNT, MESSAGES } from '../constants'

// Validate phone number (CI format)
export function validatePhone(phone) {
  // Remove spaces and dashes
  const cleaned = phone.replace(/[\s-]/g, '')

  // CI format: starts with 01, 05, or 07, followed by 8 digits
  const regex = /^(07|05|01)\d{8}$/
  return regex.test(cleaned)
}

// Format phone for display
export function formatPhone(phone) {
  const cleaned = phone.replace(/[\s-]/g, '')
  if (cleaned.length !== 10) return phone

  return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)}`
}

// Validate name (letters, spaces, hyphens, accents)
export function validateName(name) {
  if (!name || name.trim().length < 2) return false
  // Allow letters (including accents), spaces, hyphens
  const regex = /^[a-zA-ZÀ-ÿ\s\-']+$/
  return regex.test(name.trim())
}

// Validate amount
export function validateAmount(amount) {
  const num = parseInt(amount)
  return !isNaN(num) && num >= MIN_AMOUNT
}

// Validate invoice number (not empty)
export function validateInvoice(invoice) {
  return invoice && invoice.trim().length > 0
}

// Full form validation
export function validateParticipationForm(data) {
  const errors = {}

  if (!validateName(data.nom)) {
    errors.nom = data.nom?.trim().length < 2
      ? 'Minimum 2 caractères'
      : 'Caractères invalides'
  }

  if (!validateName(data.prenom)) {
    errors.prenom = data.prenom?.trim().length < 2
      ? 'Minimum 2 caractères'
      : 'Caractères invalides'
  }

  if (!data.telephone?.trim()) {
    errors.telephone = MESSAGES.FIELD_REQUIRED
  } else if (!validatePhone(data.telephone)) {
    errors.telephone = MESSAGES.PHONE_INVALID
  }

  if (!validateInvoice(data.numFacture)) {
    errors.numFacture = MESSAGES.FIELD_REQUIRED
  }

  if (!data.montant) {
    errors.montant = MESSAGES.FIELD_REQUIRED
  } else if (!validateAmount(data.montant)) {
    errors.montant = MESSAGES.AMOUNT_TOO_LOW
  }

  if (!data.photoBase64) {
    errors.photo = MESSAGES.PHOTO_REQUIRED
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}
