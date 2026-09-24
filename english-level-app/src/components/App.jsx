import React, { useState } from 'react'
import ExamBuilder from './ExamBuilder'
import StudentExam from './StudentExam'

// ============================================================
// APP PRINCIPAL — dos roles:
//  👨‍🏫 Admin de inglés (docente): wizard para crear exámenes por grado/nivel
//  🎒 Alumno: toma el examen estilo Duolingo y recibe su clasificación
// (La autenticación con Firebase Auth se puede enchufar aquí después)
// ============================================================
export default function App() {
  const [role, setRole] = useState(null) // 'teacher' | 'student'
  const [tab, setTab] = useState('builder')
  const [student, setStudent] = useState({ name: '', grade: '' })

  if (!role) return (
    <div className="home">
      <h1>🦉 English Level</h1>
      <p className="muted">Examen de nivelación de inglés — Básico · Intermedio · Avanzado</p>
      <div className="home-cards">
        <button className="role-card" onClick={() => setRole('teacher')}>
          <span className="big">👨‍🏫</span>
          <b>Soy docente de inglés</b>
          <small>Crear exámenes de ubicación por grado</small>
        </button>
        <button className="role-card" onClick={() => setRole('student')}>
          <span className="big">🎒</span>
          <b>Soy alumno</b>
          <small>Presentar el examen y conocer mi nivel</small>
        </button>
      </div>
    </div>
  )

  return (
    <div className="app">
      <header>
        <button className="logo" onClick={() => setRole(null)}>🦉 English Level</button>
        {role === 'teacher' && (
          <nav>
            <button className={tab === 'builder' ? 'on' : ''} onClick={() => setTab('builder')}>➕ Crear examen</button>
            <button className={tab === 'demo' ? 'on' : ''} onClick={() => setTab('demo')}>👁 Vista alumno</button>
          </nav>
        )}
        {role === 'student' && (
          <nav className="who">
            <span>{student.name} · Grado {student.grade}</span>
          </nav>
        )}
      </header>

      <main>
        {role === 'teacher' && tab === 'builder' && <ExamBuilder />}
        {role === 'teacher' && tab === 'demo' && (
          <StudentExam studentName="Vista previa" grade="" />
        )}
        {role === 'student' && !student.name && (
          <div className="panel center">
            <h2>¡Hola! 👋 Antes de empezar:</h2>
            <label>Tu nombre
              <input value={student.name} onChange={e => setStudent({ ...student, name: e.target.value })} />
            </label>
            <label>Grado actual
              <input value={student.grade} placeholder="Ej: 7°"
                onChange={e => setStudent({ ...student, grade: e.target.value })} />
            </label>
            <button className="btn-green w-full" disabled={!student.name || !student.grade}
              onClick={() => setStudent({ ...student })}>
              Empezar el examen 🚀
            </button>
          </div>
        )}
        {role === 'student' && student.name && student.grade && (
          <StudentExam studentName={student.name} grade={student.grade.replace(/[^0-9]/g, '') ? student.grade : student.grade} />
        )}
      </main>
    </div>
  )
}
