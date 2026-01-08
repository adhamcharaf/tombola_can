import { useState } from 'react'

export default function Header({ operatorConfig, onEditConfig }) {
  const [showEdit, setShowEdit] = useState(false)

  return (
    <header className="bg-smart-red text-white sticky top-0 z-50">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo-smart-technology.svg"
              alt="Smart Technology"
              className="h-10"
            />
            <div>
              <h1 className="font-bold text-lg leading-tight">TOMBOLA CAN 2025</h1>
              <p className="text-xs text-red-200">LE MEILLEUR SINON RIEN</p>
            </div>
          </div>

          {operatorConfig && (
            <button
              onClick={() => onEditConfig?.()}
              className="text-xs text-red-200 underline"
            >
              Modifier
            </button>
          )}
        </div>

        {operatorConfig && (
          <div className="mt-2 pt-2 border-t border-red-400/30 text-sm">
            <div className="flex justify-between text-red-100">
              <span>{operatorConfig.emplacementNom}</span>
              <span>{operatorConfig.operatrice}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
