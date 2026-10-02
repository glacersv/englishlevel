import React, { useState } from 'react'
import { MODULES, moduleCatalog, LEVELS } from '../../modules/registry'
import { saveExam } from '../../lib/dataService'

export default function ExamBuilder({ onPublished }) {
  const [step, setStep] = useState(1)
  const [meta, setMeta] = useState({ title: '', grade: '3°', level: 'basico' })
  const [questions, setQuestions] = useState([])
  const [saving, setSaving] = useState(false)

  const addQuestion = q => { 
    setQuestions([...questions, q])
  }
  const removeQuestion = i => setQuestions(questions.filter((_, x) => x !== i))

  const publish = async () => {
    setSaving(true)
    await saveExam({
      id: `exam_${Date.now()}`,
      ...meta,
      questions,
      active: true,
      createdAt: new Date().toISOString(),
    })
    setSaving(false)
    alert('✅ Examen publicado y sincronizado con éxito')
    onPublished?.()
  }

  return (
    <div className="space-y-6">
      {/* Wizard Step Indicator */}
      <div className="flex items-center justify-between max-w-xl mx-auto mb-6">
        {[
          { num: 1, label: 'Parámetros' },
          { num: 2, label: 'Módulos & Reactivos' },
          { num: 3, label: 'Confirmación' }
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= s.num
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              {s.num}
            </div>
            <span className={`text-xs font-semibold ${step >= s.num ? 'text-on-surface' : 'text-outline'}`}>
              {s.label}
            </span>
            {i < 2 && <div className="w-12 h-0.5 bg-outline-variant/40 hidden sm:block mx-2"></div>}
          </div>
        ))}
      </div>

      {/* Paso 1: Configuración General */}
      {step === 1 && (
        <div className="max-w-xl mx-auto space-y-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Título del Examen
            </label>
            <input
              type="text"
              value={meta.title}
              placeholder="Ej: Evaluación de Nivelación - 3° Secundaria Ciclo 2025"
              onChange={e => setMeta({ ...meta, title: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Grado Asignado
              </label>
              <select
                value={meta.grade}
                onChange={e => setMeta({ ...meta, grade: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="1°">1° de Secundaria</option>
                <option value="2°">2° de Secundaria</option>
                <option value="3°">3° de Secundaria</option>
                <option value="4°">4° de Secundaria</option>
                <option value="5°">5° de Secundaria</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Nivel Inicial
              </label>
              <select
                value={meta.level}
                onChange={e => setMeta({ ...meta, level: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {LEVELS.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              disabled={!meta.title}
              onClick={() => setStep(2)}
              className="py-2.5 px-6 rounded-xl bg-primary text-white font-bold text-xs tracking-wide shadow-sm hover:bg-primary-container disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              <span>Continuar al Catálogo</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* Paso 2: Catálogo de Módulos */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 flex items-center justify-between">
            <div>
              <h4 className="font-heading font-bold text-sm text-on-surface">Catálogo de Reactivos Interactivos</h4>
              <p className="text-xs text-on-surface-variant">Selecciona un tipo de pregunta para configurar sus opciones y agregarla.</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-bold">
              {questions.length} preguntas en este examen
            </span>
          </div>

          {/* Grid de módulos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {moduleCatalog().map(m => (
              <ModulePicker key={m.id} mod={m} onAdd={q => addQuestion(q)} />
            ))}
          </div>

          {/* Lista de preguntas agregadas */}
          {questions.length > 0 && (
            <div className="space-y-2 pt-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Preguntas creadas:</h5>
              <div className="divide-y divide-outline-variant/20 rounded-xl border border-outline-variant/40 bg-surface-container-lowest overflow-hidden">
                {questions.map((q, i) => (
                  <div key={i} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">#{i + 1}</span>
                      <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-semibold">
                        {MODULES[q.type]?.name || q.type}
                      </span>
                      <span className="text-on-surface font-medium truncate max-w-md">{q.prompt}</span>
                    </div>
                    <button
                      onClick={() => removeQuestion(i)}
                      className="p-1 rounded text-error hover:bg-error-container/30 transition-all"
                      title="Eliminar"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t border-outline-variant/20">
            <button
              onClick={() => setStep(1)}
              className="py-2.5 px-4 rounded-xl border border-outline-variant/60 text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
            >
              ← Modificar Parámetros
            </button>
            <button
              disabled={questions.length === 0}
              onClick={() => setStep(3)}
              className="py-2.5 px-6 rounded-xl bg-primary text-white font-bold text-xs shadow-sm hover:bg-primary-container disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              <span>Revisar y Publicar</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* Paso 3: Resumen y Publicación */}
      {step === 3 && (
        <div className="max-w-xl mx-auto bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/40 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-secondary-fixed text-on-secondary-fixed mx-auto flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">check_circle</span>
          </div>
          <h3 className="font-heading font-bold text-xl text-on-surface">Resumen de la Evaluación</h3>
          <div className="p-4 rounded-xl bg-surface-container-low text-xs text-left space-y-2 border border-outline-variant/30">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Título:</span>
              <span className="font-bold text-on-surface">{meta.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Grado:</span>
              <span className="font-bold text-on-surface">{meta.grade} de Secundaria</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Nivel inicial:</span>
              <span className="font-bold text-primary uppercase">{meta.level}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Total reactivos:</span>
              <span className="font-bold text-on-surface">{questions.length} ejercicios</span>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => setStep(2)}
              className="py-2.5 px-4 rounded-xl border border-outline-variant/60 text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
            >
              Añadir más reactivos
            </button>
            <button
              disabled={saving}
              onClick={publish}
              className="py-2.5 px-6 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:bg-primary-container disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              {saving ? 'Publicando...' : 'Confirmar y Publicar Examen'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ModulePicker({ mod, onAdd }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(mod.makeEmpty())

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest hover:border-primary/60 hover:bg-surface-container-low transition-all text-left flex flex-col justify-between h-28 shadow-sm group"
      >
        <span className="text-2xl group-hover:scale-110 transition-transform">{mod.icon}</span>
        <div>
          <b className="block text-xs text-on-surface font-bold leading-tight">{mod.name}</b>
          <span className="text-[10px] text-on-surface-variant line-clamp-1">{mod.desc}</span>
        </div>
      </button>
    )
  }

  const handleSaveDraft = () => {
    onAdd(draft)
    setOpen(false)
    setDraft(mod.makeEmpty())
  }

  return (
    <div className="col-span-full bg-surface-container-lowest rounded-2xl p-5 border-2 border-primary/40 shadow-lg space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{mod.icon}</span>
          <h4 className="font-heading font-bold text-sm text-on-surface">Configurar: {mod.name}</h4>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="p-1 rounded text-on-surface-variant hover:bg-surface-container"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <div>
        <label className="block text-xs font-semibold text-on-surface-variant mb-1">Instrucción / Enunciado</label>
        <input
          type="text"
          value={draft.prompt}
          onChange={e => setDraft({ ...draft, prompt: e.target.value })}
          className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
        >
          Cancelar
        </button>
        <button
          onClick={handleSaveDraft}
          className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-container shadow-sm"
        >
          Guardar Pregunta
        </button>
      </div>
    </div>
  )
}
