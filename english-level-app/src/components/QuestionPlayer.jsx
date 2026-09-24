import React, { useState } from 'react'

// ---------- Utilidad TTS (voz del navegador para listening/writing) ----------
export function speak(text) {
  if (!text || !('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = 0.9
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

// ============================================================
// RENDERIZADOR DE CADA MÓDULO INTERACTIVO
// Recibe la pregunta y devuelve si la respuesta es correcta.
// ============================================================
export default function QuestionPlayer({ question, onResult }) {
  const [answer, setAnswer] = useState(null)
  const [checked, setChecked] = useState(false)
  const [correct, setCorrect] = useState(false)

  const check = () => {
    const ok = QUESTION_CHECKERS[question.type](question, answer)
    setCorrect(ok)
    setChecked(true)
    onResult(ok)
  }

  return (
    <div className="qp-card">
      <div className="qp-tag">{MODULE_LABEL[question.type]}</div>
      <p className="qp-prompt">{question.prompt}</p>

      {QUESTION_VIEWS[question.type](question, answer, setAnswer)}

      {!checked ? (
        <button className="btn-green w-full" onClick={check} disabled={answer == null}>
          Verificar
        </button>
      ) : (
        <div className={`qp-feedback ${correct ? 'ok' : 'bad'}`}>
          {correct ? '🎉 ¡Correcto! +10 XP' : `❌ Incorrecto. ${explain(question)}`}
        </div>
      )}
    </div>
  )
}

const MODULE_LABEL = {
  multipleChoice: '🔘 Opción múltiple',
  orderSentence: '🧩 Ordena la oración',
  fillParagraph: '📝 Completa el párrafo',
  listening: '🎧 Escucha y responde',
  speaking: '🎤 Habla',
  writing: '✍️ Escribe',
}

const explain = q => {
  if (q.type === 'multipleChoice') return `Respuesta: ${q.options[q.correctIndex]}`
  if (q.type === 'orderSentence') return `Oración: ${q.words.join(' ')}`
  if (q.type === 'fillParagraph') return `Respuestas: ${q.blanks.map(b => b.answer).join(', ')}`
  if (q.type === 'listening') return `Respuesta: ${q.options[q.correctIndex]}`
  if (q.type === 'speaking') return `Debías decir: "${q.targetText}"`
  if (q.type === 'writing') return `Respuesta: ${q.acceptedAnswers[0]}`
  return ''
}

const QUESTION_CHECKERS = {
  multipleChoice: (q, a) => a === q.correctIndex,
  orderSentence: (q, a) => Array.isArray(a) && a.length === q.words.length &&
    a.every((idx, pos) => q.words[idx] === q.words[pos]),
  fillParagraph: (q, a) => Array.isArray(a) && q.blanks.every((b, i) => a[i] === b.answer),
  listening: (q, a) => a === q.correctIndex,
  speaking: (q, a) => {
    if (!a) return false
    const norm = s => s.toLowerCase().replace(/[^a-zñ\s']/g, '').split(/\s+/).filter(Boolean)
    const t = norm(q.targetText), said = norm(a)
    const hits = t.filter(w => said.includes(w)).length
    return hits / t.length >= (q.tolerance ?? 0.7)
  },
  writing: (q, a) => {
    if (!a) return false
    const norm = s => s.toLowerCase().replace(/[^a-zñ\s']/g, '').replace(/\s+/g, ' ').trim()
    return q.acceptedAnswers.some(x => norm(x) === norm(a))
  },
}

// ---------------- VISTAS POR TIPO ----------------
const QUESTION_VIEWS = {
  // Opción múltiple / listening → botones grandes
  multipleChoice: (q, answer, setAnswer) => (
    <div className="stack">
      {q.options.map((opt, i) => (
        <button key={i}
          className={`option-btn ${answer === i ? 'selected' : ''}`}
          onClick={() => setAnswer(i)}>
          {opt}
        </button>
      ))}
    </div>
  ),

  listening: (q, answer, setAnswer) => (
    <>
      <div className="audio-row">
        <button className="btn-play"
          onClick={() => q.audioUrl
            ? new Audio(q.audioUrl).play()
            : speak(q.ttsText)}>
          ▶️ Reproducir audio
        </button>
      </div>
      <p className="muted">{q.question}</p>
      <div className="stack">
        {q.options.map((opt, i) => (
          <button key={i}
            className={`option-btn ${answer === i ? 'selected' : ''}`}
            onClick={() => setAnswer(i)}>
            {opt}
          </button>
        ))}
      </div>
    </>
  ),

  // Ordenar oración: toca palabras en orden (funciona en móvil y PC)
  orderSentence: (q, answer = [], setAnswer) => {
    const pool = q.words.map((w, i) => ({ w, i }))
    const used = new Set(answer)
    const add = idx => !answer.includes(idx) && setAnswer([...answer, idx])
    const remove = idx => setAnswer(answer.filter(x => x !== idx))
    return (
      <>
        <div className="answer-line min-h">
          {answer.map(idx => (
            <button key={idx} className="word-chip placed" onClick={() => remove(idx)}>
              {q.words[idx]}
            </button>
          ))}
          {answer.length === 0 && <span className="muted">Toca las palabras en orden…</span>}
        </div>
        <hr className="sep" />
        <div className="answer-line">
          {pool.filter(p => !used.has(p.i)).map(({ w, i }) => (
            <button key={i} className="word-chip" onClick={() => add(i)}>{w}</button>
          ))}
        </div>
        {q.translation && <p className="muted small">Pista: “{q.translation}”</p>}
      </>
    )
  },

  // Completar párrafo con select por hueco
  fillParagraph: (q, answer = q.blanks.map(() => ''), setAnswer) => {
    const parts = q.text.split(/___(\d+)___/)
    const nodes = []
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) nodes.push(<span key={i}>{parts[i]}</span>)
      else {
        const bi = parseInt(parts[i], 10)
        nodes.push(
          <select key={i} className={`blank-select ${answer[bi] ? 'filled' : ''}`}
            value={answer[bi]}
            onChange={e => {
              const next = [...answer]
              next[bi] = e.target.value
              setAnswer(next)
            }}>
            <option value="">______</option>
            {q.blanks[bi].options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )
      }
    }
    return <p className="paragraph">{nodes}</p>
  },

  // Speaking: grabación con MediaRecorder + Web Speech API
  speaking: (q, answer, setAnswer) => <SpeakingView q={q} answer={answer} setAnswer={setAnswer} />,

  // Writing: reproducir audio + campo de texto
  writing: (q, answer = '', setAnswer) => (
    <>
      <button className="btn-play"
        onClick={() => q.audioUrl ? new Audio(q.audioUrl).play() : speak(q.ttsText)}>
        ▶️ Escuchar
      </button>
      <textarea className="writing-box" rows={2} placeholder="Escribe la oración en inglés…"
        value={answer} onChange={e => setAnswer(e.target.value)} />
    </>
  ),
}

// ---------- Vista de grabación de voz ----------
function SpeakingView({ q, answer, setAnswer }) {
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState('')

  const start = async () => {
    setError('')
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setError('Tu navegador no soporta reconocimiento de voz (usa Chrome).'); return }
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.onresult = e => setAnswer(e.results[0][0].transcript)
    rec.onerror = () => { setError('No se pudo capturar el audio. Intenta de nuevo.'); setRecording(false) }
    rec.onend = () => setRecording(false)
    setRecording(true)
    rec.start()
  }

  return (
    <div className="center">
      <p className="target-phrase">“{q.targetText}”</p>
      <button className={`mic-btn ${recording ? 'rec' : ''}`} onClick={start}>
        {recording ? '🔴 Escuchando… suelta para terminar' : '🎤 Mantén presionado o toca para grabar'}
      </button>
      {answer && <p className="transcript">Escuché: “{answer}”</p>}
      {error && <p className="err">{error}</p>}
    </div>
  )
}
