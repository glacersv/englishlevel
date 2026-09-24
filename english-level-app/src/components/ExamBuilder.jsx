import React, { useState } from 'react'
import { MODULES, moduleCatalog, LEVELS } from '../modules/registry'
import { saveExam } from '../lib/dataService'

// ============================================================
// WIZARD DEL DOCENTE (3 pasos)
// Paso 1: datos del examen (grado, nivel, título)
// Paso 2: elegir módulo del catálogo → formulario dinámico
// Paso 3: revisar y publicar (guarda en Firestore)
// ============================================================
export default function ExamBuilder({ onPublished }) {
  const [step, setStep] = useState(1)
  const [meta, setMeta] = useState({ title: '', grade: '', level: 'basico' })
  const [questions, setQuestions] = useState([])
  const [saving, setSaving] = useState(false)

  const addQuestion = q => { setQuestions([...questions, q]); setStep(2.5) }
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
    alert('✅ Examen publicado en Firebase')
    onPublished?.()
  }

  return (
    <div className="builder">
      {/* Progreso del wizard */}
      <div className="wizard-steps">
        {['Datos', 'Preguntas', 'Publicar'].map((s, i) => (
          <div key={i} className={`wstep ${step > i ? 'active' : ''}`}>
            <span className="dot">{i + 1}</span> {s}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="panel">
          <h3>📋 Datos del examen</h3>
          <label>Título
            <input value={meta.title} placeholder="Ej: Nivelación Grado 7 - Semestre 1"
              onChange={e => setMeta({ ...meta, title: e.target.value })} />
          </label>
          <label>Grado
            <input value={meta.grade} placeholder="Ej: 7° / 8° / 9°"
              onChange={e => setMeta({ ...meta, grade: e.target.value })} />
          </label>
          <label>Nivel a evaluar
            <select value={meta.level} onChange={e => setMeta({ ...meta, level: e.target.value })}>
              {LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
          <button className="btn-green w-full" disabled={!meta.title || !meta.grade}
            onClick={() => setStep(2)}>Continuar →</button>
        </div>
      )}

      {(step === 2 || step === 2.5) && (
        <div className="panel">
          <h3>🧱 Agregar preguntas desde el catálogo</h3>
          <p className="muted small">Elige un tipo de interactividad; se abre su editor con ejemplo listo.</p>
          <div className="catalog-grid">
            {moduleCatalog().map(m => (
              <ModulePicker key={m.id} mod={m} onAdd={q => { addQuestion(q); }} />
            ))}
          </div>

          <h4>Agregadas ({questions.length})</h4>
          <ul className="q-list">
            {questions.map((q, i) => (
              <li key={i}>
                <span>{MODULES[q.type].icon} {q.prompt.slice(0, 60)}</span>
                <button className="link-bad" onClick={() => removeQuestion(i)}>✕</button>
              </li>
            ))}
          </ul>
          <div className="row">
            <button className="btn-ghost" onClick={() => setStep(1)}>← Atrás</button>
            <button className="btn-green" disabled={questions.length === 0}
              onClick={() => setStep(3)}>Publicar →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="panel center">
          <h3>🚀 Publicar examen</h3>
          <p><b>{meta.title}</b> — Grado {meta.grade} — Nivel {meta.level}</p>
          <p>{questions.length} preguntas. Mínimo de aciertos requerido:{' '}
            <b>{LEVELS.find(l => l.id === meta.level).minCorrect}</b></p>
          <div className="row">
            <button className="btn-ghost" onClick={() => setStep(2)}>← Editar</button>
            <button className="btn-green" disabled={saving} onClick={publish}>
              {saving ? 'Guardando…' : '✅ Publicar en Firebase'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- Selector + editor dinámico por módulo ----------
function ModulePicker({ mod, onAdd }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(mod.makeEmpty())

  if (!open) {
    return (
      <button className="catalog-card" onClick={() => setOpen(true)}>
        <span className="big">{mod.icon}</span>
        <b>{mod.name}</b>
        <small>{mod.desc}</small>
      </button>
    )
  }

  const set = patch => setDraft({ ...draft, ...patch })

  return (
    <div className="editor-card">
      <h4>{mod.icon} {mod.name}</h4>
      <Field label="Enunciado" value={draft.prompt} onChange={v => set({ prompt: v })} />

      {draft.type === 'multipleChoice' && (
        <>
          <OptionsEditor options={draft.options}
            correctIndex={draft.correctIndex}
            onChange={(options, correctIndex) => set({ options, correctIndex })} />
        </>
      )}

      {draft.type === 'orderSentence' && (
        <>
          <Field label="Palabras en orden correcto (separadas por espacio)"
            value={draft.words.join(' ')}
            onChange={v => set({ words: v.trim().split(/\s+/) })} />
          <Field label="Pista en español (opcional)" value={draft.translation ?? ''}
            onChange={v => set({ translation: v })} />
        </>
      )}

      {draft.type === 'fillParagraph' && (
        <>
          <Field label="Texto (marca huecos como ___0___ , ___1___ …)"
            value={draft.text} onChange={v => set({ text: v })} />
          <label className="field">Huecos (respuesta | opciones separadas por coma)
            <textarea rows={draft.blanks.length + 1}
              defaultValue={draft.blanks.map(b => `${b.answer} | ${b.options.join(', ')}`).join('\n')}
              onBlur={e => set({
                blanks: e.target.value.split('\n').filter(Boolean).map(line => {
                  const [ans, opts] = line.split('|')
                  return { answer: ans.trim(), options: opts.split(',').map(s => s.trim()) }
                })
              })} />
          </label>
        </>
      )}

      {draft.type === 'listening' && (
        <>
          <Field label="Texto que dirá la voz (o sube audio aparte)"
            value={draft.ttsText} onChange={v => set({ ttsText: v })} />
          <Field label="URL de audio (opcional, Firebase Storage)"
            value={draft.audioUrl} onChange={v => set({ audioUrl: v })} />
          <Field label="Pregunta" value={draft.question} onChange={v => set({ question: v })} />
          <OptionsEditor options={draft.options} correctIndex={draft.correctIndex}
            onChange={(options, correctIndex) => set({ options, correctIndex })} />
        </>
      )}

      {draft.type === 'speaking' && (
        <>
          <Field label="Frase objetivo (lo que debe decir el alumno)"
            value={draft.targetText} onChange={v => set({ targetText: v })} />
          <Field label="Tolerancia 0-1 (ej. 0.7 = 70% palabras)"
            value={String(draft.tolerance)} onChange={v => set({ tolerance: parseFloat(v) || 0.7 })} />
        </>
      )}

      {draft.type === 'writing' && (
        <>
          <Field label="Audio/texto a dictar" value={draft.ttsText} onChange={v => set({ ttsText: v })} />
          <Field label="Respuestas aceptadas (una por línea)"
            value={draft.acceptedAnswers.join('\n')}
            onChange={v => set({ acceptedAnswers: v.split('\n').filter(Boolean) })} />
        </>
      )}

      <div className="row">
        <button className="btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
        <button className="btn-green" onClick={() => { onAdd(JSON.parse(JSON.stringify(draft))); setOpen(false) }}>
          ➕ Agregar
        </button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange }) {
  return (
    <label className="field">{label}
      <input value={value} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

function OptionsEditor({ options, correctIndex, onChange }) {
  const upd = (i, v) => { const o = [...options]; o[i] = v; onChange(o, correctIndex) }
  const mark = i => onChange(options, i)
  return (
    <div className="field">
      Opciones (marca ✓ la correcta)
      {options.map((o, i) => (
        <div key={i} className="opt-row">
          <button className={correctIndex === i ? 'check ok' : 'check'} onClick={() => mark(i)}>✓</button>
          <input value={o} onChange={e => upd(i, e.target.value)} />
          <button className="link-bad" onClick={() =>
            options.length > 2 && onChange(options.filter((_, x) => x !== i), 0)}>✕</button>
        </div>
      ))}
      <button className="btn-ghost small" onClick={() => onChange([...options, ''] )}>+ opción</button>
    </div>
  )
}
