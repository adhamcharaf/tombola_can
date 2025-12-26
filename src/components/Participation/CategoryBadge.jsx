import { getCategoryFromAmount, MIN_AMOUNT, formatMontant } from '../../constants'

export default function CategoryBadge({ montant }) {
  const amount = parseInt(montant) || 0

  if (amount === 0) {
    return null
  }

  if (amount < MIN_AMOUNT) {
    return (
      <div className="bg-gray-100 rounded-xl p-4 text-center">
        <p className="text-gray-500 text-sm">
          Montant minimum : {formatMontant(MIN_AMOUNT)}
        </p>
        <p className="text-gray-400 text-xs mt-1">
          Il manque {formatMontant(MIN_AMOUNT - amount)}
        </p>
      </div>
    )
  }

  const category = getCategoryFromAmount(amount)

  if (!category) return null

  return (
    <div className={`${category.color} rounded-xl p-4 text-center text-white`}>
      <div className="text-3xl mb-1">{category.emoji}</div>
      <div className="font-bold text-lg">{category.label}</div>
      <div className="text-sm opacity-90">{category.description}</div>
    </div>
  )
}
