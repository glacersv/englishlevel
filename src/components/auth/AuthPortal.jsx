import React, { useState } from 'react'

export default function AuthPortal({ onLoginSuccess }) {
  const [activeRole, setActiveRole] = useState('teacher') // 'admin' | 'teacher' | 'student'
  const [email, setEmail] = useState('prof.silva@colegio.edu.pe')
  const [password, setPassword] = useState('••••••••••••')
  const [studentCode, setStudentCode] = useState('EST-2025-0842')
  const [studentGrade, setStudentGrade] = useState('3°')
  const [studentSection, setStudentSection] = useState('B')
  const [studentName, setStudentName] = useState('Mateo Quispe')
  const [isLoading, setIsLoading] = useState(false)

  // Cambiar credenciales automáticas según rol demo
  const selectRole = (role) => {
    setActiveRole(role)
    if (role === 'admin') {
      setEmail('coordinacion.ingles@colegio.edu.pe')
    } else if (role === 'teacher') {
      setEmail('prof.silva@colegio.edu.pe')
    }
  }

  const handleLogin = (e) => {
    e?.preventDefault()
    setIsLoading(true)

    setTimeout(() => {
      setIsLoading(false)
      if (activeRole === 'student') {
        onLoginSuccess({
          role: 'student',
          name: studentName || 'Estudiante',
          grade: studentGrade,
          section: studentSection,
          code: studentCode,
          email: `${studentCode.toLowerCase()}@colegio.edu.pe`
        })
      } else if (activeRole === 'teacher') {
        onLoginSuccess({
          role: 'teacher',
          name: 'Prof. Mariana Silva',
          email: email,
          id: 'DOC-4821',
          area: 'Área de Lenguas Extranjeras'
        })
      } else {
        onLoginSuccess({
          role: 'admin',
          name: 'Coordinación Académica',
          email: email,
          id: 'ADM-1002',
          area: 'Jefatura de Inglés'
        })
      }
    }, 400)
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center p-4 md:p-8 relative overflow-hidden">
      {/* Resplandor ambiental de fondo */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute top-48 right-12 w-72 h-72 bg-secondary-container/20 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute bottom-10 left-8 w-64 h-64 bg-surface-variant/40 rounded-full blur-2xl pointer-events-none -z-10"></div>

      {/* Badge arquitectónico superior */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-high/80 shadow-sm backdrop-blur-md mb-6 border border-outline-variant/30">
        <span className="flex h-2.5 w-2.5 rounded-full bg-secondary animate-pulse"></span>
        <span className="text-[12px] font-bold text-on-surface-variant tracking-wider uppercase">
          Plataforma Institucional de Nivelación
        </span>
        <span className="material-symbols-outlined text-[16px] text-primary fill">verified_user</span>
      </div>

      {/* Encabezado Principal */}
      <div className="text-center max-w-2xl mb-8">
        <h1 className="font-heading font-extrabold text-3xl md:text-5xl text-on-surface tracking-tight leading-tight">
          Evaluación y Nivelación de Inglés
        </h1>
        <p className="text-base md:text-lg text-on-surface-variant mt-3 max-w-xl mx-auto">
          Acceso centralizado para supervisión pedagógica, diseño de instrumentos y diagnóstico de estudiantes.
        </p>
      </div>

      {/* Contenedor Principal: Card de Login & Selector de Roles */}
      <div className="w-full max-w-xl">
        <div className="bg-surface-container-lowest/95 backdrop-blur-xl rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-outline-variant/40">
          {/* Acento superior de gradiente */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-primary-container to-secondary-container"></div>

          {/* Selector de Rol */}
          <div className="flex flex-col gap-2 mb-6">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Selecciona tu tipo de perfil
            </label>
            <div className="grid grid-cols-3 gap-2 bg-surface-container-low p-1.5 rounded-xl border border-outline-variant/30">
              <button
                type="button"
                onClick={() => selectRole('admin')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                  activeRole === 'admin'
                    ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                Admin
              </button>

              <button
                type="button"
                onClick={() => selectRole('teacher')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                  activeRole === 'teacher'
                    ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">school</span>
                Docente
              </button>

              <button
                type="button"
                onClick={() => selectRole('student')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                  activeRole === 'student'
                    ? 'bg-surface-container-lowest text-secondary shadow-sm font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">face</span>
                Alumno
              </button>
            </div>
          </div>

          {/* Formulario Dinámico */}
          <form onSubmit={handleLogin} className="space-y-4">
            {activeRole !== 'student' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Correo Institucional
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                      mail
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                      placeholder="nombre@colegio.edu.pe"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-on-surface-variant">
                      Contraseña
                    </label>
                    <span className="text-xs text-primary hover:underline cursor-pointer">
                      ¿Olvidaste tu clave?
                    </span>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                      lock
                    </span>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Nombre Completo del Alumno
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                      person
                    </span>
                    <input
                      type="text"
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition-all"
                      placeholder="Ej: Mateo Quispe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                      Grado
                    </label>
                    <select
                      value={studentGrade}
                      onChange={(e) => setStudentGrade(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition-all"
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
                      Sección
                    </label>
                    <select
                      value={studentSection}
                      onChange={(e) => setStudentSection(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition-all"
                    >
                      <option value="A">Sección A</option>
                      <option value="B">Sección B</option>
                      <option value="C">Sección C</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Código de Estudiante
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                      badge
                    </span>
                    <input
                      type="text"
                      required
                      value={studentCode}
                      onChange={(e) => setStudentCode(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition-all font-mono"
                      placeholder="EST-2025-XXXX"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Botón de Ingreso */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full mt-2 py-3 px-4 rounded-xl text-white font-heading font-bold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2 ${
                activeRole === 'student'
                  ? 'bg-secondary hover:bg-secondary/90 active:scale-[0.99]'
                  : 'bg-primary hover:bg-primary-container active:scale-[0.99]'
              }`}
            >
              {isLoading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <>
                  <span>Ingresar como {activeRole === 'admin' ? 'Coordinador' : activeRole === 'teacher' ? 'Docente' : 'Estudiante'}</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Acceso Rápido Demo Badge */}
          <div className="mt-6 pt-4 border-t border-outline-variant/30 flex items-center justify-between text-xs text-on-surface-variant">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-primary">bolt</span>
              Acceso Demo Activo
            </span>
            <span>v2.5 · Firebase Hosting Ready</span>
          </div>
        </div>
      </div>
    </div>
  )
}
