import React, { useState } from 'react'
import AuthPortal from './AuthPortal'
import AdminDashboard from './AdminDashboard'
import TeacherWorkspace from './TeacherWorkspace'
import StudentGamifiedExam from './StudentGamifiedExam'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [overrideStudentView, setOverrideStudentView] = useState(false)

  // Si no ha iniciado sesión, mostrar el portal de autenticación institucional
  if (!currentUser) {
    return <AuthPortal onLoginSuccess={(user) => setCurrentUser(user)} />
  }

  // Si un docente o admin activa la "Vista de Alumno"
  if (overrideStudentView) {
    return (
      <div className="relative">
        {/* Banner flotante de previsualización */}
        <div className="bg-primary text-white text-xs font-bold py-2 px-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">preview</span>
            <span>Modo Previsualización: Vista de Alumno ({currentUser.role.toUpperCase()})</span>
          </div>
          <button
            onClick={() => setOverrideStudentView(false)}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[11px] font-semibold transition-all"
          >
            ← Volver a mi Panel
          </button>
        </div>

        <StudentGamifiedExam
          student={{
            name: 'Mateo Quispe (Demo)',
            grade: '3°',
            section: 'B'
          }}
          onLogout={() => setOverrideStudentView(false)}
        />
      </div>
    )
  }

  // Vista de Coordinación / Administrador
  if (currentUser.role === 'admin') {
    return (
      <AdminDashboard
        user={currentUser}
        onLogout={() => setCurrentUser(null)}
        onSwitchToStudentView={() => setOverrideStudentView(true)}
      />
    )
  }

  // Vista de Docente de Inglés
  if (currentUser.role === 'teacher') {
    return (
      <TeacherWorkspace
        user={currentUser}
        onLogout={() => setCurrentUser(null)}
        onSwitchToStudentView={() => setOverrideStudentView(true)}
      />
    )
  }

  // Vista de Alumno
  return (
    <StudentGamifiedExam
      student={currentUser}
      onLogout={() => setCurrentUser(null)}
    />
  )
}
