// Montant minimum pour participer
export const MIN_AMOUNT = parseInt(import.meta.env.VITE_MIN_AMOUNT || '50000')

// Seuils des catégories
export const CATEGORY_THRESHOLDS = {
  SALON_MAX: parseInt(import.meta.env.VITE_SALON_MAX || '149999'),
  CUISINE_MAX: parseInt(import.meta.env.VITE_CUISINE_MAX || '299999')
}

// Catégories
export const CATEGORIES = {
  SALON: {
    id: 'salon',
    label: 'SALON',
    description: 'Équipement salon complet',
    emoji: '🛋️',
    color: 'bg-blue-500'
  },
  CUISINE: {
    id: 'cuisine',
    label: 'CUISINE',
    description: 'Cuisine complète',
    emoji: '🍳',
    color: 'bg-orange-500'
  },
  MAISON: {
    id: 'maison',
    label: 'MAISON',
    description: 'Électroménager maison complète',
    emoji: '🏠',
    color: 'bg-green-500'
  }
}

// Get category from amount
export function getCategoryFromAmount(montant) {
  if (montant < MIN_AMOUNT) return null

  if (montant >= CATEGORY_THRESHOLDS.CUISINE_MAX + 1) {
    return CATEGORIES.MAISON
  }
  if (montant >= CATEGORY_THRESHOLDS.SALON_MAX + 1) {
    return CATEGORIES.CUISINE
  }
  return CATEGORIES.SALON
}

// Format montant in FCFA
export function formatMontant(montant) {
  return new Intl.NumberFormat('fr-FR').format(montant) + ' FCFA'
}

// Messages
export const MESSAGES = {
  FIELD_REQUIRED: 'Ce champ est obligatoire',
  PHONE_INVALID: 'Numéro invalide (format: 07/05/01 + 8 chiffres)',
  AMOUNT_TOO_LOW: `Le montant minimum est de ${formatMontant(MIN_AMOUNT)}`,
  INVOICE_DUPLICATE: 'Cette facture a déjà été enregistrée',
  INVOICE_EXISTS_SERVER: 'Cette facture existe déjà dans le système',
  PHOTO_REQUIRED: 'La photo de la facture est obligatoire',
  SUCCESS: 'Participation enregistrée avec succès !',
  OFFLINE_SAVED: 'Enregistré hors ligne, synchronisation automatique',
  SYNC_PENDING: 'participations en attente de sync',
  SYNC_ERROR: 'Erreur de synchronisation',
  ALL_SYNCED: 'Tout est synchronisé'
}
