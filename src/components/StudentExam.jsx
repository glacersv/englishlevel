import React, { useEffect, useState } from 'react'
import { LEVELS } from '../modules/registry'
import { getExams, saveResult, classify } from '../lib/dataService'
import QuestionPlayer from './QuestionPlayer'

// ============================================================
// RUTA DEL EXAMEN (vista del alumno) estilo Duolingo:
// 1 progreso = 1 pregunta; barra de avance; corazones/XP.
// Aprueba el nivel si aciertos >= minCorrect → desbloquea el siguiente.
// Al final se muestra la CLASIFICACIÓN para las clases del próximo año.
// ============================================================
export default function StudentExam({ studentName, grade }) {
  const [levelIdx, setLevelIdx] = useState(0)
  const [exam, setExam] = useState(null)
  const [qIdx, setQIdx] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [attempts, setAttempts] = useState([]) // resultados por nivel
  const [phase, setPhase] = useState('loading') // loading | quiz | levelDone | finished | empty
  const [xp, setXp] = useState(0)

  const level = LEVELS[levelIdx]

  useEffect(() => { loadExam() }, [levelIdx])

  async function loadExam() {
    setPhase('loading')
    const exams = await getExams(level.id, grade)
    if (!exams.length) { setExam(null); setPhase('empty'); return }
    setExam(exams[0])
    setQIdx(0); setCorrect(0)
    setPhase('quiz')
  }

  const onResult = ok => {
    if (ok) { setCorrect(c => c + 1); setXp(x => x + 10) }
  }

  const next = () => {
    if (qIdx + 1 < exam.questions.length) setQIdx(qIdx + 1)
    else finishLevel()
  }

  const finishLevel = async () => {
    const passed = correct >= level.minCorrect
    const newAttempts = [...attempts, { level: level.id, correct, total: exam.questions.length, passed }]
    setAttempts(newAttempts)
    setPhase('levelDone')
    if (!passed || levelIdx === LEVELS.length - 1) {
      // Fin del examen: guardar clasificación
      const id = `${studentName}_${grade}`.replace(/\s+/g, '_').toLowerCase()
      await saveResult({
        id, studentName, grade, attempts: newAttempts,
        assignedLevel: classify(newAttempts),
        date: new Date().toISOString(),
      })
    }
  }

  const continueAfterLevel = () => {
    const last = attempts[attempts.length - 1]
    if (last.passed && levelIdx < LEVELS.length - 1) {
      setLevelIdx(levelIdx + 1) // ¡desbloquea el siguiente nivel!
    } else {
      setPhase('finished')
    }
  }

  // ---------- PANTALLA VACÍA ----------
  if (phase === 'empty') return (
    <div className="panel center">
      <h2>🔒 Nivel {level.name}</h2>
      <p>Aún no hay examen publicado para este nivel{grade ? ` y grado ${grade}` : ''}.</p>
      <p className="muted small">El docente de inglés debe crearlo desde el panel Admin.</p>
    </div>
  )

  // ---------- RESULTADO FINAL / CLASIFICACIÓN ----------
  if (phase === 'finished') {
    const assigned = classify(attempts)
    const info = LEVELS.find(l => l.id === assigned)
    return (
      <div className="panel center result-card">
        <div className="big-emoji">{info ? '🏆' : '📘'}</div>
        <h2>{studentName}, tu nivel asignado es:</h2>
        <h1 style={{ color: info?.color ?? '#ff9600' }}>
          {info ? info.name : 'Básico reforzado'}
        </h1>
        <p>El próximo año recibirás clases de nivel{' '}
          <b>{info ? info.name : 'Básico (con refuerzo)'}</b>.</p>
        <table className="results-table">
          <thead><tr><th>Nivel</th><th>Aciertos</th><th>Estado</th></tr></thead>
          <tbody>
            {attempts.map(a => {
              const l = LEVELS.find(x => x.id === a.level)
              return (
                <tr key={a.level}>
                  <td>{l.name}</td>
                  <td>{a.correct}/{a.total} (mín. {l.minCorrect})</td>
                  <td>{a.passed ? '✅ Aprobado' : '❌ No alcanzó'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  if (phase === 'loading') return <div className="panel center">Cargando examen… ⏳</div>

  // ---------- FIN DE NIVEL (antes de desbloquear) ----------
  if (phase === 'levelDone') {
    const last = attempts[attempts.length - 1]
    return (
      <div className="panel center">
        <div className="big-emoji">{last.passed ? '🎉' : '😕'}</div>
        <h2>Nivel {level.name}: {last.correct}/{last.total} aciertos</h2>
        {last.passed
          ? <p>¡Excelente! Desbloqueaste el nivel <b>{LEVELS[levelIdx + 1]?.name}</b> 🔓</p>
          : <p>Necesitabas <b>{level.minCorrect}</b> aciertos para avanzar. Te quedas en este nivel.</p>}
        <button className="btn-green w-full" onClick={continueAfterLevel}>
          {last.passed && levelIdx < LEVELS.length - 1 ? 'Continuar al siguiente nivel →' : 'Ver mi resultado final'}
        </button>
      </div>
    )
  }

  // ---------- QUIZ ACTIVO ----------
  const q = exam.questions[qIdx]
  const progress = ((qIdx) / exam.questions.length) * 100
  return (
    <div>
      <div className="hud">
        <div className="progress-bar"><div style={{ width: `${progress}%` }} /></div>
        <span className="xp">⚡ {xp} XP</span>
        <span className="lvl-badge" style={{ background: level.color }}>{level.name}</span>
      </div>
      <p className="muted small">Pregunta {qIdx + 1} de {exam.questions.length} · Necesitas {level.minCorrect} aciertos para aprobar</p>
      <QuestionPlayer key={`${exam.id}_${qIdx}`} question={q} onResult={onResult} />
      <button className="btn-green w-full" style={{ marginTop: 12 }} onClick={next}>
        Continuar →
      </button>
    </div>
  )
}
