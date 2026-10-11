import React from 'react'

/**
 * Modal universal reutilizable para alertas, confirmaciones e información.
 * Reemplaza windows.alert(), window.confirm() y popups nativos del navegador.
 *
 * @param {boolean} isOpen
 * @param {string} type - 'success' | 'info' | 'warning' | 'danger'
 * @param {string} title - Título de la acción
 * @param {string} message - Descripción o detalle
 * @param {string} confirmText - Texto del botón de confirmación (ej: "Aceptar", "Eliminar", "Continuar")
 * @param {string} cancelText - Texto del botón de cancelar (si es null, actúa como un alert de un solo botón)
 * @param {Function} onConfirm - Callback al confirmar
 * @param {Function} onCancel - Callback al cancelar o cerrar
 * @param {boolean} isLoading - Muestra spinner de carga si la acción es asíncrona
 */
export default function ActionModal({
  isOpen,
  type = 'info',
  title = '',
  message = '',
  confirmText = 'Entendido',
  cancelText = null,
  onConfirm,
  onCancel,
  isLoading = false
}) {
  if (!isOpen) return null

  const typeConfig = {
    success: {
      icon: 'check_circle',
      iconBg: 'bg-emerald-50 text-emerald-600',
      btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
    },
    danger: {
      icon: 'warning',
      iconBg: 'bg-rose-50 text-rose-600',
      btnBg: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
    },
    warning: {
      icon: 'report_problem',
      iconBg: 'bg-amber-50 text-amber-600',
      btnBg: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
    },
    info: {
      icon: 'info',
      iconBg: 'bg-[#e9e3ff] text-[#8a70d6]',
      btnBg: 'bg-[#8a70d6] hover:bg-[#7a60c7] text-white shadow-[#8a70d6]/20'
    }
  }

  const current = typeConfig[type] || typeConfig.info

  return (
    <div className="fixed inset-0 bg-[#2d2c38]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl md:rounded-4xl p-6 md:p-7 max-w-md w-full shadow-2xl border border-[#eceaf6] space-y-5 animate-scaleIn">
        <div className="flex items-start gap-3.5">
          <div className={`w-12 h-12 rounded-2xl ${current.iconBg} flex items-center justify-center shrink-0 shadow-xs`}>
            <span className="material-symbols-outlined text-[26px]">{current.icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-black text-base md:text-lg text-[#2d2c38] leading-snug">
              {title}
            </h3>
            {message && (
              <p className="text-xs text-[#8e8a9f] mt-1 leading-relaxed whitespace-pre-line">
                {message}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#f4f3fa]">
          {cancelText && (
            <button
              type="button"
              disabled={isLoading}
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl text-xs font-black text-[#585567] hover:bg-[#f8f7fc] transition-colors cursor-pointer disabled:opacity-50"
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${current.btnBg}`}
          >
            {isLoading && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
