import React, { useState } from 'react'
import AuthPortal from './auth/AuthPortal'
import AdminDashboard from './admin/AdminDashboard'
import TeacherWorkspace from './teacher/TeacherWorkspace'
import StudentGamifiedExam from './student/StudentGamifiedExam'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  // 'admin' | 'teacher' | 'student' | null
  const [activeRoleView, setActiveRoleView] = useState(null)
  // Alumno seleccionado específicamente para simular o ver en el portal
  const [simulatedStudent, setSimulatedStudent] = useState(null)

  // 1. Pantalla de Acceso Inicial
  if (!currentUser) {
    return <AuthPortal onLoginSuccess={(user) => {
      setCurrentUser(user)
      setActiveRoleView(user.role)
    }} />
  }

  // Rol efectivo a renderizar (por defecto el rol asignado, pero switchable por admin/teacher)
  const currentView = activeRoleView || currentUser.role
  const isSuperAdminOrTeacher = currentUser.role === 'admin' || currentUser.role === 'coordination' || currentUser.role === 'teacher'

  // Barra Flotante de Conmutador de Rol (Rol Switcher)
  const renderRoleSwitcherBanner = () => {
    if (!isSuperAdminOrTeacher) return null

    return (
      <div className="bg-[#10132b] text-white text-xs py-2 px-4 sm:px-6 flex flex-wrap items-center justify-between gap-2 border-b border-indigo-900 sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="font-bold text-slate-200">
            Conmutador de Vistas:
          </span>
          <span className="text-[11px] text-indigo-300 font-mono hidden sm:inline">
            ({currentUser.name} · {currentUser.email})
          </span>
        </div>

        {/* Botones Ovalados para Cambiar de Vista al Instante */}
        <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-full border border-white/10">
          <button
            type="button"
            onClick={() => {
              setActiveRoleView('admin')
              setSimulatedStudent(null)
            }}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              currentView === 'admin'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
            <span>Vista Admin</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveRoleView('teacher')
              setSimulatedStudent(null)
            }}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              currentView === 'teacher'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">school</span>
            <span>Vista Docente</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveRoleView('student')
            }}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              currentView === 'student'
                ? 'bg-[#2528b7] text-white shadow-sm ring-1 ring-white/40'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">psychology</span>
            <span>Vista Alumno</span>
          </button>
        </div>
      </div>
    )
  }

  // 2. Previsualización del Alumno (simulado o alumno real seleccionado)
  if (currentView === 'student') {
    const studentToRender = simulatedStudent || {
      name: `${currentUser.name} (Modo Alumno)`,
      email: currentUser.email,
      carnet: '2026-TEST',
      grade: '7° Grado',
      section: 'A',
      selfReportedLevel: currentUser.selfReportedLevel || ''
    }

    return (
      <div className="relative min-h-screen bg-surface">
        {renderRoleSwitcherBanner()}
        <StudentGamifiedExam
          student={studentToRender}
          onLogout={() => {
            if (isSuperAdminOrTeacher) {
              setActiveRoleView(currentUser.role)
              setSimulatedStudent(null)
            } else {
              setCurrentUser(null)
            }
          }}
        />
      </div>
    )
  }

  // 3. Panel de Coordinación / Admin
  if (currentView === 'admin' || currentView === 'coordination') {
    return (
      <div className="min-h-screen bg-surface flex flex-col">
        {renderRoleSwitcherBanner()}
        <div className="flex-1">
          <AdminDashboard
            user={currentUser}
            onLogout={() => setCurrentUser(null)}
            onSwitchToStudentView={(student) => {
              if (student && student.email) setSimulatedStudent(student)
              setActiveRoleView('student')
            }}
            onSwitchToTeacherView={() => {
              setActiveRoleView('teacher')
            }}
          />
        </div>
      </div>
    )
  }

  // 4. Workspace del Docente de Inglés
  if (currentView === 'teacher') {
    // Si el usuario es admin pero entra a vista docente, aseguramos rol teacher en prop
    const teacherUser = {
      ...currentUser,
      role: 'teacher'
    }

    return (
      <div className="min-h-screen bg-surface flex flex-col">
        {renderRoleSwitcherBanner()}
        <div className="flex-1">
          <TeacherWorkspace
            user={teacherUser}
            onLogout={() => setCurrentUser(null)}
            onSwitchToStudentView={(student) => {
              if (student && student.email) setSimulatedStudent(student)
              setActiveRoleView('student')
            }}
          />
        </div>
      </div>
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
