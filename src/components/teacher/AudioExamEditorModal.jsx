import React, { useState } from 'react'

/**
 * AudioExamEditorModal:
 * Permite a los docentes:
 * 1. Probar audios con reproductor integrado tantas veces como sea necesario.
 * 2. Visualizar y editar la transcripción oficial del audio.
 * 3. Editar el enunciado de la pregunta.
 * 4. Editar las opciones de respuesta y designar la clave correcta.
 */
export default function AudioExamEditorModal({ exam, onClose, onSave }) {
  const [questions, setQuestions] = useState(exam?.questions || [])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [saving, setSaving] = useState(false)

  const currentQ = questions[selectedIdx] || questions[0]

  const updateCurrentQuestion = (field, value) => {
    setQuestions(prev => {
      const next = [...prev]
      next[selectedIdx] = {
        ...next[selectedIdx],
        [field]: value
      }
      return next
    })
  }

  const updateOptionText = (optIdx, text) => {
    setQuestions(prev => {
      const next = [...prev]
      const currentOptions = [...(next[selectedIdx].options || [])]
      currentOptions[optIdx] = text
      next[selectedIdx] = {
        ...next[selectedIdx],
        options: currentOptions
      }
      return next
    })
  }

  const addOption = () => {
    setQuestions(prev => {
      const next = [...prev]
      const currentOptions = [...(next[selectedIdx].options || []), `Option ${(next[selectedIdx].options || []).length + 1}`]
      next[selectedIdx] = {
        ...next[selectedIdx],
        options: currentOptions
      }
      return next
    })
  }

  const removeOption = (optIdx) => {
    if ((currentQ.options || []).length <= 2) {
      alert('Cada pregunta debe tener al menos 2 opciones de respuesta.')
      return
    }
    setQuestions(prev => {
      const next = [...prev]
      const currentOptions = next[selectedIdx].options.filter((_, idx) => idx !== optIdx)
      let newCorrect = next[selectedIdx].correctIndex
      if (newCorrect >= currentOptions.length) newCorrect = currentOptions.length - 1
      next[selectedIdx] = {
        ...next[selectedIdx],
        options: currentOptions,
        correctIndex: newCorrect
      }
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-fadeIn text-left">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-gray-200 shadow-2xl flex flex-col justify-between">
        {/* Encabezado */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[24px]">headphones</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-extrabold text-base text-gray-900">
                  Calibrador de Audios & Transcripciones
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800">
                  Panel Docente
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {exam.title} · {questions.length} preguntas en el examen
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Cuerpo principal con selector de preguntas */}
        <div className="p-6 space-y-6">
          {/* Selector de número de pregunta */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-gray-700">
              <span>Seleccionar Pregunta a Calibrar:</span>
              <span className="text-indigo-600 font-mono">Pregunta {selectedIdx + 1} de {questions.length}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {questions.map((q, idx) => {
                const isCur = idx === selectedIdx
                const hasAudio = Boolean(q.audioUrl || q.audioText)
                return (
                  <button
                    key={q.id || idx}
                    type="button"
                    onClick={() => setSelectedIdx(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      isCur
                        ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-200'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>#{idx + 1}</span>
                    {hasAudio && (
                      <span className="material-symbols-outlined text-[13px] opacity-80">volume_up</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Panel de Audio y Transcripción */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/60 border border-indigo-200/80 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 text-[20px]">graphic_eq</span>
                <h4 className="font-heading font-extrabold text-sm text-indigo-950">
                  Reproductor de Audio (Pista Oficial)
                </h4>
              </div>
              {currentQ?.audioUrl && (
                <span className="text-[10px] font-mono text-indigo-600 bg-white px-2 py-0.5 rounded-md border border-indigo-200 truncate max-w-xs">
                  {currentQ.audioUrl}
                </span>
              )}
            </div>

            {/* Reproductor de Audio HTML directo para que los docentes lo escuchen tantas veces como quieran sin límite */}
            {currentQ?.audioUrl ? (
              <div className="space-y-2">
                <audio controls key={currentQ.audioUrl} src={currentQ.audioUrl} className="w-full h-10 shadow-xs rounded-xl">
                  Tu navegador no soporta reproducción de audio.
                </audio>
                <p className="text-[11px] text-indigo-800 font-medium">
                  🎧 Como docente, puedes reproducir y pausar esta pista sin límite de escuchas para comprobar que coincide con las preguntas.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium">
                ℹ️ Esta pregunta utiliza síntesis de voz en vivo o no tiene URL de audio MP3 asignada.
              </div>
            )}

            {/* TRANSCRIPCIÓN DEL AUDIO */}
            <div className="space-y-1.5 pt-2 border-t border-indigo-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-purple-600">transcribe</span>
                  <span>Transcripción Oficial del Audio (Lo que se escucha):</span>
                </label>
                <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md">Editable por docentes</span>
              </div>
              <textarea
                rows={3}
                value={currentQ?.audioText || ''}
                onChange={(e) => updateCurrentQuestion('audioText', e.target.value)}
                placeholder="Escribe o revisa aquí la transcripción exacta de lo que dice el audio..."
                className="w-full p-3 rounded-xl border border-indigo-200 bg-white text-xs text-slate-800 font-medium leading-relaxed focus:ring-2 focus:ring-purple-400 focus:outline-none"
              />
              <p className="text-[10px] text-slate-500">
                * Puedes ajustar o corregir la transcripción para que coincida exactamente con la pista de audio.
              </p>
            </div>
          </div>

          {/* EDICIÓN DE PREGUNTA / ENUNCIADO */}
          <div className="space-y-3 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <h4 className="font-heading font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-[20px]">edit_note</span>
              <span>Pregunta y Opciones de Respuesta</span>
            </h4>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Enunciado de la Pregunta (Lo que lee el alumno):
              </label>
              <input
                type="text"
                value={currentQ?.question || currentQ?.prompt || ''}
                onChange={(e) => {
                  updateCurrentQuestion('question', e.target.value)
                  updateCurrentQuestion('prompt', e.target.value)
                }}
                placeholder="Ej: What class are Tania and Jing assigned to?"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>

            {/* LISTA DE OPCIONES DE RESPUESTA Y SELECCIÓN DE CLAVE CORRECTA */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Opciones de Respuesta (Marca el círculo verde en la opción correcta):
                </label>
                <button
                  type="button"
                  onClick={addOption}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                  <span>Añadir opción</span>
                </button>
              </div>

              <div className="space-y-2">
                {(currentQ?.options || []).map((opt, optIdx) => {
                  const isCorrect = (currentQ?.correctIndex ?? 0) === optIdx
                  return (
                    <div
                      key={optIdx}
                      className={`p-2.5 rounded-xl border flex items-center gap-3 transition-all ${
                        isCorrect
                          ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-300'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {/* Botón Radio para fijar la respuesta correcta */}
                      <button
                        type="button"
                        onClick={() => updateCurrentQuestion('correctIndex', optIdx)}
                        className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                          isCorrect
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                            : 'border-slate-300 bg-white hover:border-emerald-500'
                        }`}
                        title={isCorrect ? 'Respuesta Correcta Actual' : 'Clic para marcar como respuesta correcta'}
                      >
                        {isCorrect && <span className="material-symbols-outlined text-[14px]">check</span>}
                      </button>

                      {/* Letra A, B, C, D */}
                      <span className="text-xs font-black text-slate-500 w-4">
                        {String.fromCharCode(65 + optIdx)}.
                      </span>

                      {/* Input de texto de la opción */}
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOptionText(optIdx, e.target.value)}
                        placeholder={`Opción ${String.fromCharCode(65 + optIdx)}`}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />

                      {isCorrect && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 shrink-0">
                          CORRECTA
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => removeOption(optIdx)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Eliminar esta opción"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Explicación / Justificación */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Explicación / Justificación de la Clave (Opcional):
              </label>
              <input
                type="text"
                value={currentQ?.explanation || ''}
                onChange={(e) => updateCurrentQuestion('explanation', e.target.value)}
                placeholder="Ej: Tania explicitly confirms they are in Class 1B."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>
          </div>
        </div>

        {/* Footer de Acciones */}
        <div className="p-5 border-t border-gray-100 bg-slate-50/70 flex items-center justify-between gap-3 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cerrar sin guardar
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true)
              try {
                await onSave(questions)
              } finally {
                setSaving(false)
              }
            }}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-black text-xs shadow-md shadow-purple-600/25 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            <span>{saving ? 'Guardando en Firebase...' : 'Guardar Todos los Cambios'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
