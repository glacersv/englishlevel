import React, { useState, useEffect } from 'react'
import AuthPortal from './auth/AuthPortal'
import AdminDashboard from './admin/AdminDashboard'
import TeacherWorkspace from './teacher/TeacherWorkspace'
import StudentGamifiedExam from './student/StudentGamifiedExam'
import { logoutMicrosoft } from '../lib/authAzure'
import { getUserProfile } from '../lib/dataService'

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('el_session_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  // 'admin' | 'teacher' | 'student' | null
  const [activeRoleView, setActiveRoleView] = useState(() => {
    try {
      const saved = localStorage.getItem('el_session_user')
      return saved ? JSON.parse(saved)?.role : null
    } catch {
      return null
    }
  })
  // Alumno seleccionado específicamente para simular o ver en el portal
  const [simulatedStudent, setSimulatedStudent] = useState(null)

  // Sincronizar y refrescar perfil fresco desde Firestore al iniciar o recargar la app
  useEffect(() => {
    async function syncProfile() {
      if (currentUser?.email) {
        try {
          const fresh = await getUserProfile(currentUser.email)
          if (fresh) {
            setCurrentUser(prev => ({ ...prev, ...fresh }))
            try {
              localStorage.setItem('el_session_user', JSON.stringify({ ...currentUser, ...fresh }))
            } catch (err) {
              console.warn(err)
            }
          }
        } catch (e) {
          console.warn('Error sincronizando perfil fresco en App:', e)
        }
      }
    }
    syncProfile()
  }, [currentUser?.email])

  const handleLoginSuccess = (user) => {
    try {
      localStorage.setItem('el_session_user', JSON.stringify(user))
    } catch (e) {
      console.warn('Error guardando sesión:', e)
    }
    setCurrentUser(user)
    setActiveRoleView(user.role)
  }

  const handleLogout = async () => {
    try {
      localStorage.removeItem('el_session_user')
      sessionStorage.clear()
    } catch (e) {
      console.warn('Error limpiando sesión local:', e)
    }
    setCurrentUser(null)
    setActiveRoleView(null)
    setSimulatedStudent(null)

    // Si había una cuenta MSAL de Azure activa, cerrar sesión también
    try {
      await logoutMicrosoft()
    } catch (e) {
      console.warn('Error cerrando sesión Microsoft:', e)
    }
  }

  // 1. Pantalla de Acceso Inicial
  if (!currentUser) {
    return <AuthPortal onLoginSuccess={handleLoginSuccess} />
  }

  // Rol efectivo a renderizar
  const currentView = activeRoleView || currentUser.role

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
        <StudentGamifiedExam
          student={studentToRender}
          onLogout={handleLogout}
        />
      </div>
    )
  }

  // 3. Panel de Coordinación / Admin
  if (currentView === 'admin' || currentView === 'coordination') {
    return (
      <div className="min-h-screen bg-surface flex flex-col">
        <div className="flex-1">
          <AdminDashboard
            user={currentUser}
            onLogout={handleLogout}
            onSwitchToStudentView={(student) => {
              if (student && student.email) setSimulatedStudent(student)
              setActiveRoleView('student')
            }}
            onSwitchToTeacherView={async () => {
              setActiveRoleView('teacher')
              if (currentUser?.email) {
                try {
                  const fresh = await getUserProfile(currentUser.email)
                  if (fresh) {
                    setCurrentUser(prev => ({ ...prev, ...fresh }))
                  }
                } catch (e) {
                  console.warn(e)
                }
              }
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
        <div className="flex-1">
          <TeacherWorkspace
            user={teacherUser}
            onLogout={handleLogout}
            onUpdateCurrentUser={(updated) => {
              setCurrentUser(updated)
              try {
                localStorage.setItem('el_session_user', JSON.stringify(updated))
              } catch (e) {
                console.warn(e)
              }
            }}
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
      onLogout={handleLogout}
    />
  )
}
