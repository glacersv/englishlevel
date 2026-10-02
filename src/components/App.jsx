import React, { useState } from 'react'
import AuthPortal from './auth/AuthPortal'
import AdminDashboard from './admin/AdminDashboard'
import TeacherWorkspace from './teacher/TeacherWorkspace'
import StudentGamifiedExam from './student/StudentGamifiedExam'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [overrideStudentView, setOverrideStudentView] = useState(false)

  // 1. Pantalla de Acceso Inicial
  if (!currentUser) {
    return <AuthPortal onLoginSuccess={(user) => setCurrentUser(user)} />
  }

  // 2. Previsualización del Alumno (disponible para Admin y Docente)
  if (overrideStudentView) {
    return (
      <div className="relative min-h-screen bg-surface">
        {/* Banner flotante de retorno */}
        <div className="bg-primary text-white text-xs font-bold py-2.5 px-6 flex items-center justify-between sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">preview</span>
            <span>Modo Simulación: Vista de Alumno ({currentUser.role.toUpperCase()})</span>
          </div>
          <button
            onClick={() => setOverrideStudentView(false)}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            <span>Volver a mi Panel</span>
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

  // 3. Panel de Coordinación / Admin (con Sidebar colapsable)
  if (currentUser.role === 'admin') {
    return (
      <AdminDashboard
        user={currentUser}
        onLogout={() => setCurrentUser(null)}
        onSwitchToStudentView={() => setOverrideStudentView(true)}
      />
    )
  }

  // 4. Workspace del Docente de Inglés (con Sidebar colapsable)
  if (currentUser.role === 'teacher') {
    return (
      <TeacherWorkspace
        user={currentUser}
        onLogout={() => setCurrentUser(null)}
        onSwitchToStudentView={() => setOverrideStudentView(true)}
      />
    )
  }

  // 5. Portal y Examen del Alumno
  return (
    <StudentGamifiedExam
      student={currentUser}
      onLogout={() => setCurrentUser(null)}
    />
  )
}
