import React, { useEffect, useState } from 'react'
import { LEVELS } from '../../modules/registry'
import { getExams, saveResult, classify } from '../../lib/dataService'
import QuestionPlayer from './QuestionPlayer'

export default function StudentGamifiedExam({ student, onLogout }) {
  const [levelIdx, setLevelIdx] = useState(0)
  const [exam, setExam] = useState(null)
  const [qIdx, setQIdx] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [attempts, setAttempts] = useState([])
  const [phase, setPhase] = useState('loading') // 'loading' | 'quiz' | 'levelDone' | 'finished' | 'empty'
  const [xp, setXp] = useState(450)
  const [streakDays] = useState(4)

  const currentLevel = LEVELS[levelIdx]

  useEffect(() => {
    loadExam()
  }, [levelIdx])

  async function loadExam() {
    setPhase('loading')
    const exams = await getExams(currentLevel.id, student.grade)
    if (!exams.length) {
      setExam(null)
      setPhase('empty')
      return
    }
    setExam(exams[0])
    setQIdx(0)
    setCorrect(0)
    setPhase('quiz')
  }

  const onResult = (ok) => {
    if (ok) {
      setCorrect((c) => c + 1)
      setXp((x) => x + 10)
    }
  }

  const handleNextQuestion = () => {
    if (qIdx + 1 < exam.questions.length) {
      setQIdx(qIdx + 1)
    } else {
      finishCurrentLevel()
    }
  }

  const finishCurrentLevel = async () => {
    const passed = correct >= currentLevel.minCorrect
    const newAttempts = [
      ...attempts,
      { level: currentLevel.id, correct, total: exam.questions.length, passed }
    ]
    setAttempts(newAttempts)
    setPhase('levelDone')

    if (!passed || levelIdx === LEVELS.length - 1) {
      const id = `${student.name}_${student.grade}`.replace(/\s+/g, '_').toLowerCase()
      await saveResult({
        id,
        studentName: student.name,
        grade: student.grade,
        section: student.section,
        attempts: newAttempts,
        assignedLevel: classify(newAttempts),
        date: new Date().toISOString()
      })
    }
  }

  const handleContinueAfterLevel = () => {
    const lastAttempt = attempts[attempts.length - 1]
    if (lastAttempt?.passed && levelIdx + 1 < LEVELS.length) {
      setLevelIdx(levelIdx + 1)
    } else {
      setPhase('finished')
    }
  }

  const finalLevel = classify(attempts)

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans">
      {/* Top Gamified Bar */}
      <header className="bg-surface-container-lowest border-b border-outline-variant/30 sticky top-0 z-30 px-4 lg:px-8 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-white shadow-md font-bold">
            {student.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="font-heading font-bold text-base md:text-lg text-on-surface leading-tight">
              ¡Hola, {student.name}!
            </h2>
            <span className="text-xs text-on-surface-variant font-medium">
              {student.grade} de Secundaria · Sec. {student.section || 'A'}
            </span>
          </div>
        </div>

        {/* Gamification Pills (Streak & XP) */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-tertiary shadow-sm">
            <span className="material-symbols-outlined text-[18px] text-tertiary fill">
              local_fire_department
            </span>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant leading-none font-bold">
                Racha
              </span>
              <span className="text-xs font-extrabold text-on-surface leading-tight">
                {streakDays} días
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-primary shadow-sm">
            <span className="material-symbols-outlined text-[18px] text-primary fill">
              stars
            </span>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant leading-none font-bold">
                Puntaje
              </span>
              <span className="text-xs font-extrabold text-on-surface leading-tight">
                {xp} XP
              </span>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Salir"
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all ml-1"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 md:p-8 flex flex-col justify-center">
        {/* Fase: Cargando */}
        {phase === 'loading' && (
          <div className="text-center py-16 space-y-3">
            <span className="inline-block w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></span>
            <p className="text-sm font-semibold text-on-surface-variant">Cargando instrumento de nivelación...</p>
          </div>
        )}

        {/* Fase: Sin exámenes disponibles */}
        {phase === 'empty' && (
          <div className="bg-surface-container-lowest rounded-2xl p-8 text-center border border-outline-variant/30 shadow-sm space-y-4">
            <span className="material-symbols-outlined text-5xl text-outline">assignment_late</span>
            <h3 className="font-heading font-bold text-xl text-on-surface">No hay exámenes activos para tu grado</h3>
            <p className="text-sm text-on-surface-variant max-w-md mx-auto">
              Tu docente de inglés aún no ha publicado el examen para {student.grade} de Secundaria. Por favor consulta con tu profesor.
            </p>
          </div>
        )}

        {/* Fase: Quiz Activo */}
        {phase === 'quiz' && exam && (
          <div className="space-y-4">
            {/* Barra de progreso interactiva */}
            <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-sm flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between items-center text-xs font-bold text-on-surface-variant mb-1.5">
                  <span className="text-primary font-heading uppercase tracking-wider">
                    {currentLevel.name}
                  </span>
                  <span>
                    Pregunta {qIdx + 1} de {exam.questions.length}
                  </span>
                </div>
                <div className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${((qIdx + 1) / exam.questions.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Componente del Ejercicio */}
            <QuestionPlayer
              key={`${levelIdx}_${qIdx}`}
              question={exam.questions[qIdx]}
              onResult={onResult}
            />

            {/* Botón Siguiente */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleNextQuestion}
                className="py-3 px-6 rounded-xl bg-primary text-white font-heading font-bold text-sm tracking-wide shadow-md hover:bg-primary-container flex items-center gap-1.5 transition-all"
              >
                <span>{qIdx + 1 === exam.questions.length ? 'Finalizar Nivel' : 'Siguiente Ejercicio'}</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* Fase: Nivel Completado */}
        {phase === 'levelDone' && (
          <div className="bg-surface-container-lowest rounded-2xl p-8 text-center border border-outline-variant/30 shadow-xl space-y-5 animate-fadeIn">
            {attempts[attempts.length - 1]?.passed ? (
              <>
                <div className="w-16 h-16 rounded-full bg-secondary-container/40 text-secondary mx-auto flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl fill">military_tech</span>
                </div>
                <h2 className="font-heading font-extrabold text-2xl text-on-surface">
                  ¡Nivel {currentLevel.name} Aprobado!
                </h2>
                <p className="text-sm text-on-surface-variant">
                  Obtuviste <strong className="text-secondary font-bold">{correct} de {exam.questions.length}</strong> aciertos mínimos requeridos ({currentLevel.minCorrect}).
                </p>
                <button
                  type="button"
                  onClick={handleContinueAfterLevel}
                  className="py-3 px-8 rounded-xl bg-secondary text-white font-heading font-bold text-sm shadow-md hover:bg-secondary/90 transition-all inline-flex items-center gap-2"
                >
                  <span>Continuar al Siguiente Nivel</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-tertiary-fixed text-tertiary mx-auto flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl">flag</span>
                </div>
                <h2 className="font-heading font-extrabold text-2xl text-on-surface">
                  Completaste tu diagnóstico
                </h2>
                <p className="text-sm text-on-surface-variant">
                  Obtuviste {correct} de {exam.questions.length} aciertos. Se ha registrado tu nivelación.
                </p>
                <button
                  type="button"
                  onClick={handleContinueAfterLevel}
                  className="py-3 px-8 rounded-xl bg-primary text-white font-heading font-bold text-sm shadow-md hover:bg-primary-container transition-all"
                >
                  Ver Resultado Final
                </button>
              </>
            )}
          </div>
        )}

        {/* Fase: Resultado Final Asignado */}
        {phase === 'finished' && (
          <div className="bg-surface-container-lowest rounded-2xl p-8 text-center border border-outline-variant/30 shadow-xl space-y-6">
            <span className="material-symbols-outlined text-6xl text-primary fill">workspace_premium</span>
            <div className="space-y-1">
              <h2 className="font-heading font-extrabold text-2xl text-on-surface">
                ¡Evaluación de Ubicación Concluida!
              </h2>
              <p className="text-xs text-on-surface-variant">
                Tu nivel asignado para el ciclo escolar 2026 es:
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-surface-container-high/60 max-w-sm mx-auto border border-outline-variant/40">
              <span className="text-xs uppercase font-bold text-primary tracking-wider">Nivel Oficial</span>
              <h3 className="font-heading font-extrabold text-3xl text-on-surface mt-1 capitalize">
                {finalLevel.replace('_', ' ')}
              </h3>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onLogout}
                className="py-2.5 px-6 rounded-xl border border-outline-variant/60 text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
