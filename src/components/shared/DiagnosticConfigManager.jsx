import React, { useState, useEffect } from 'react'
import { getDiagnosticConfig, saveDiagnosticConfig } from '../../lib/dataService'

export default function DiagnosticConfigManager({ canEdit = true, onConfigSaved }) {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const data = await getDiagnosticConfig()
      setConfig(data)
    } catch (e) {
      console.error('Error cargando configuración diagnóstica:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleWeightChange = (key, val) => {
    const num = Math.max(0, Math.min(100, parseInt(val, 10) || 0))
    setConfig(prev => {
      const nextWeights = { ...prev.weights, [key]: num }
      if (key === 'oral') nextWeights.platform = 100 - num
      if (key === 'platform') nextWeights.oral = 100 - num
      return { ...prev, weights: nextWeights }
    })
  }

  const handleCutoffChange = (key, val) => {
    const num = Math.max(0, Math.min(100, parseInt(val, 10) || 0))
    setConfig(prev => ({
      ...prev,
      cutoffs: {
        ...prev.cutoffs,
        [key]: num
      }
    }))
  }

  const handleDestinationChange = (gradeNum, category, field, val) => {
    setConfig(prev => {
      const curGrade = prev.gradeDestinations?.[gradeNum] || {}
      const curCat = curGrade[category] || {}
      return {
        ...prev,
        gradeDestinations: {
          ...prev.gradeDestinations,
          [gradeNum]: {
            ...curGrade,
            [category]: {
              ...curCat,
              [field]: val
            }
          }
        }
      }
    })
  }

  const handleDestinationLabelChange = (gradeNum, val) => {
    setConfig(prev => ({
      ...prev,
      gradeDestinations: {
        ...prev.gradeDestinations,
        [gradeNum]: {
          ...prev.gradeDestinations?.[gradeNum],
          label: val
        }
      }
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!config) return
    setSaving(true)
    try {
      await saveDiagnosticConfig(config)
      setSaveSuccess(true)
      onConfigSaved?.(config)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Error guardando configuración:', err)
      alert('Error guardando en Firestore: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 space-y-2">
        <span className="inline-block w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></span>
        <p className="text-xs font-semibold">Cargando parámetros de evaluación 2026...</p>
      </div>
    )
  }

  if (!config) return null

  const oralW = config.weights?.oral ?? 40
  const platW = config.weights?.platform ?? 60
  const basicMax = config.cutoffs?.basicMax ?? 45
  const interMax = config.cutoffs?.intermediateMax ?? 74

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">
      {/* Encabezado */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-[18px]">tune</span>
            <span>Configuración Oficial de Diagnóstico y Ubicación 2026</span>
          </div>
          <h2 className="font-heading font-extrabold text-2xl md:text-3xl text-white mt-1">
            Ponderaciones y Cortes por Grado
          </h2>
          <p className="text-xs text-indigo-200 mt-1 max-w-xl">
            Ajusta los porcentajes de cada componente de evaluación y los umbrales de aciertos para clasificar a los alumnos en <strong>Básico</strong>, <strong>Intermedio</strong> o <strong>Avanzado</strong>.
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white font-extrabold text-xs md:text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">
              {saveSuccess ? 'check_circle' : 'save'}
            </span>
            <span>{saving ? 'Guardando...' : saveSuccess ? '¡Guardado con Éxito!' : 'Guardar Cambios'}</span>
          </button>
        )}
      </div>

      {/* Grid de 2 Columnas: Ponderaciones y Cortes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Tarjeta 1: Ponderación Global (Oral vs Plataforma) */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <span className="material-symbols-outlined text-indigo-600 text-[24px]">balance</span>
            <div>
              <h3 className="font-heading font-extrabold text-base text-gray-900">
                1. Ponderación Global (Total 100%)
              </h3>
              <p className="text-[11px] text-gray-500">
                Define el peso de la entrevista oral y las pruebas de plataforma.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Peso Oral */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-indigo-600">record_voice_over</span>
                  Entrevista Oral con Docente
                </label>
                <span className="font-heading font-black text-lg text-indigo-700">{oralW}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                disabled={!canEdit}
                value={oralW}
                onChange={(e) => handleWeightChange('oral', e.target.value)}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <p className="text-[10px] text-indigo-700/80">
                Preguntas de pronunciación, gramática y fluidez conducidas por el docente.
              </p>
            </div>

            {/* Peso Plataforma */}
            <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-teal-600">devices</span>
                  Pruebas en Plataforma
                </label>
                <span className="font-heading font-black text-lg text-teal-700">{platW}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                disabled={!canEdit}
                value={platW}
                onChange={(e) => handleWeightChange('platform', e.target.value)}
                className="w-full accent-teal-600 cursor-pointer"
              />
              <p className="text-[10px] text-teal-700/80">
                Listening con audio MP3, Reading True/False, Scramble y Use of English.
              </p>
            </div>

            {/* Barra Visual Sumatoria */}
            <div className="pt-2">
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-gray-100">
                <div style={{ width: `${oralW}%` }} className="bg-indigo-600 h-full transition-all"></div>
                <div style={{ width: `${platW}%` }} className="bg-teal-500 h-full transition-all"></div>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-gray-500 mt-1">
                <span>Oral: {oralW}%</span>
                <span>Plataforma: {platW}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tarjeta 2: Umbrales de Corte Porcentual */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <span className="material-symbols-outlined text-amber-600 text-[24px]">grade</span>
            <div>
              <h3 className="font-heading font-extrabold text-base text-gray-900">
                2. Umbrales de Aciertos para Clasificación
              </h3>
              <p className="text-[11px] text-gray-500">
                Rangos de porcentaje para ubicar en Básico, Intermedio o Avanzado.
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            {/* Nivel Básico */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[10px] font-black uppercase">
                  Básico (Inicial / Refuerzo)
                </span>
                <p className="text-xs font-bold text-gray-800 mt-1">
                  De 0% hasta {basicMax}%
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-500 font-semibold">Tope Máx:</span>
                <input
                  type="number"
                  min="10"
                  max="70"
                  disabled={!canEdit}
                  value={basicMax}
                  onChange={(e) => handleCutoffChange('basicMax', e.target.value)}
                  className="w-16 px-2 py-1 rounded-xl border border-amber-300 text-xs font-black text-center focus:outline-none bg-white"
                />
                <span className="text-xs font-bold text-gray-700">%</span>
              </div>
            </div>

            {/* Nivel Intermedio */}
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 rounded-md bg-blue-200 text-blue-900 text-[10px] font-black uppercase">
                  Intermedio (Estándar / Regular)
                </span>
                <p className="text-xs font-bold text-gray-800 mt-1">
                  De {basicMax + 1}% hasta {interMax}%
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-500 font-semibold">Tope Máx:</span>
                <input
                  type="number"
                  min={basicMax + 5}
                  max="90"
                  disabled={!canEdit}
                  value={interMax}
                  onChange={(e) => handleCutoffChange('intermediateMax', e.target.value)}
                  className="w-16 px-2 py-1 rounded-xl border border-blue-300 text-xs font-black text-center focus:outline-none bg-white"
                />
                <span className="text-xs font-bold text-gray-700">%</span>
              </div>
            </div>

            {/* Nivel Avanzado */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-900 text-[10px] font-black uppercase">
                  Avanzado (Adelantado / C1)
                </span>
                <p className="text-xs font-bold text-gray-800 mt-1">
                  De {interMax + 1}% hasta 100%
                </p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                ≥ {interMax + 1}%
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Tarjeta 3: Matriz de Grupos Destino por Grado (Tabla de Referencia) */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-600 text-[24px]">school</span>
            <div>
              <h3 className="font-heading font-extrabold text-base text-gray-900">
                3. Matriz Oficial de Libros y Grupos por Grado (Marco Institucional Fijo)
              </h3>
              <p className="text-[11px] text-gray-500">
                Estándar curricular del colegio que define los libros y grupos oficiales (L1-A a L5-B) a los que se asigna cada estudiante.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200">
            🔒 Marco Oficial de Asignación
          </span>
        </div>

        {/* Recordatorio de Directriz Institucional */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 flex items-center gap-2.5">
          <span className="material-symbols-outlined text-indigo-700 text-[20px] shrink-0">info</span>
          <p className="leading-snug">
            <strong>Directriz Institucional:</strong> Esta matriz establece los grupos canónicos del colegio por grado. Las ponderaciones (%) y los cortes son configurables, mientras que la estructura de grupos permanece fija como referencia administrativa y de asignación para los docentes.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-[11px] font-bold uppercase text-gray-500 bg-slate-50">
                <th className="py-3 px-4">Grado al que Pasa</th>
                <th className="py-3 px-4">Grupo Básico (0-{basicMax}%)</th>
                <th className="py-3 px-4">Grupo Intermedio ({basicMax + 1}-{interMax}%)</th>
                <th className="py-3 px-4">Grupo Avanzado (≥{interMax + 1}%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(config.gradeDestinations || {}).map(([gradeNum, dest]) => (
                <tr key={gradeNum} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-gray-900 align-top">
                    <div className="flex items-center gap-2">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-black text-xs shrink-0">
                        {gradeNum}°
                      </span>
                      {canEdit ? (
                        <input
                          type="text"
                          value={dest.label || ''}
                          onChange={(e) => handleDestinationLabelChange(gradeNum, e.target.value)}
                          className="w-full text-xs font-bold text-gray-800 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-indigo-400 rounded-lg px-2 py-1 outline-none transition-all"
                        />
                      ) : (
                        <span className="text-xs font-bold text-gray-800">{dest.label}</span>
                      )}
                    </div>
                  </td>

                  {/* Grupo Básico */}
                  <td className="py-3.5 px-4 align-top space-y-1.5">
                    {canEdit ? (
                      <>
                        <input
                          type="text"
                          value={dest.basic?.code || ''}
                          onChange={(e) => handleDestinationChange(gradeNum, 'basic', 'code', e.target.value)}
                          placeholder="Ej: L1-A"
                          className="w-24 px-2 py-1 text-xs font-black uppercase text-amber-900 bg-amber-50 border border-amber-300 rounded-lg outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <input
                          type="text"
                          value={dest.basic?.label || ''}
                          onChange={(e) => handleDestinationChange(gradeNum, 'basic', 'label', e.target.value)}
                          placeholder="Descripción del libro..."
                          className="w-full text-[11px] text-gray-600 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-amber-400 rounded px-1.5 py-0.5 outline-none block"
                        />
                      </>
                    ) : (
                      <>
                        <span className="inline-block px-2.5 py-0.5 rounded-full font-black text-xs bg-amber-50 text-amber-800 border border-amber-200">
                          {dest.basic?.code}
                        </span>
                        <span className="text-[11px] text-gray-500 block">{dest.basic?.label}</span>
                      </>
                    )}
                  </td>

                  {/* Grupo Intermedio */}
                  <td className="py-3.5 px-4 align-top space-y-1.5">
                    {canEdit ? (
                      <>
                        <input
                          type="text"
                          value={dest.intermediate?.code || ''}
                          onChange={(e) => handleDestinationChange(gradeNum, 'intermediate', 'code', e.target.value)}
                          placeholder="Ej: L1-B"
                          className="w-24 px-2 py-1 text-xs font-black uppercase text-blue-900 bg-blue-50 border border-blue-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={dest.intermediate?.label || ''}
                          onChange={(e) => handleDestinationChange(gradeNum, 'intermediate', 'label', e.target.value)}
                          placeholder="Descripción del libro..."
                          className="w-full text-[11px] text-gray-600 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-blue-400 rounded px-1.5 py-0.5 outline-none block"
                        />
                      </>
                    ) : (
                      <>
                        <span className="inline-block px-2.5 py-0.5 rounded-full font-black text-xs bg-blue-50 text-blue-800 border border-blue-200">
                          {dest.intermediate?.code}
                        </span>
                        <span className="text-[11px] text-gray-500 block">{dest.intermediate?.label}</span>
                      </>
                    )}
                  </td>

                  {/* Grupo Avanzado */}
                  <td className="py-3.5 px-4 align-top space-y-1.5">
                    {canEdit ? (
                      <>
                        <input
                          type="text"
                          value={dest.advanced?.code || ''}
                          onChange={(e) => handleDestinationChange(gradeNum, 'advanced', 'code', e.target.value)}
                          placeholder="Ej: L2"
                          className="w-24 px-2 py-1 text-xs font-black uppercase text-emerald-900 bg-emerald-50 border border-emerald-300 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <input
                          type="text"
                          value={dest.advanced?.label || ''}
                          onChange={(e) => handleDestinationChange(gradeNum, 'advanced', 'label', e.target.value)}
                          placeholder="Descripción del libro..."
                          className="w-full text-[11px] text-gray-600 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-emerald-400 rounded px-1.5 py-0.5 outline-none block"
                        />
                      </>
                    ) : (
                      <>
                        <span className="inline-block px-2.5 py-0.5 rounded-full font-black text-xs bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {dest.advanced?.code}
                        </span>
                        <span className="text-[11px] text-gray-500 block">{dest.advanced?.label}</span>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
