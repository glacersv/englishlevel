import React, { useState, useEffect } from 'react'
import { loginWithMicrosoft, handleRedirectAuth } from '../../lib/authAzure'
import { getUserProfile, registerOrUpdateUser } from '../../lib/dataService'

export default function AuthPortal({ onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [pendingValidationUser, setPendingValidationUser] = useState(null)

  // Correo de superadministrador principal
  const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || 'jose.marquez@salesianosanjose.edu.sv').toLowerCase()

  // Determinar rol y atributos según correo y verificar si está validado en Firestore
  const processUserAccount = async (userEmail, displayName = '') => {
    const cleanEmail = (userEmail || '').trim().toLowerCase()
    if (!cleanEmail) return null

    // 1. Si es el Admin José Márquez -> Acceso directo y automático siempre
    if (cleanEmail === ADMIN_EMAIL || cleanEmail.startsWith('jose.marquez@')) {
      const adminData = {
        email: cleanEmail,
        name: displayName || 'José Márquez',
        role: 'admin',
        status: 'active',
        validatedBy: 'system',
        id: 'ADMIN-CSSJ-01',
        area: 'Coordinación / Dirección General'
      }
      await registerOrUpdateUser(adminData)
      return adminData
    }

    // 2. Consultar perfil existente en base de datos
    const existing = await getUserProfile(cleanEmail)

    if (existing) {
      // Si ya está registrado, verificar estado
      if (existing.status === 'blocked') {
        throw new Error('Esta cuenta ha sido inhabilitada temporalmente por la administración.')
      }
      if (existing.status === 'pending') {
        // En espera de validación
        setPendingValidationUser(existing)
        return null
      }
      return existing
    }

    // 3. Primer ingreso (nuevo usuario):
    // Definir rol por defecto según dominio / prefijo
    let defaultRole = 'student'
    let defaultStatus = 'pending' // Por defecto requiere validación

    if (cleanEmail.includes('coord') || cleanEmail.includes('director')) {
      defaultRole = 'coordination'
    } else if (cleanEmail.includes('prof') || cleanEmail.includes('docente') || cleanEmail.includes('teacher') || cleanEmail.includes('ingles')) {
      defaultRole = 'teacher'
    } else {
      defaultRole = 'student'
    }

    const namePart = displayName || cleanEmail.split('@')[0].replace('.', ' ')
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1)

    const newProfile = {
      email: cleanEmail,
      name: formattedName,
      role: defaultRole,
      status: defaultStatus, // 'pending' hasta que el Admin / Docente lo active
      createdAt: new Date().toISOString(),
      grade: defaultRole === 'student' ? '3°' : null,
      section: defaultRole === 'student' ? 'A' : null,
      code: `${defaultRole.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`
    }

    await registerOrUpdateUser(newProfile)

    // Mostrar aviso de pendiente de validación
    setPendingValidationUser(newProfile)
    return null
  }

  // Al montar, revisar si volvemos de la redirección de Microsoft
  useEffect(() => {
    async function checkRedirect() {
      try {
        const account = await handleRedirectAuth()
        if (account) {
          setIsLoading(true)
          const userObj = await processUserAccount(account.username || account.idTokenClaims?.email, account.name)
          setIsLoading(false)
          if (userObj) {
            onLoginSuccess(userObj)
          }
        }
      } catch (err) {
        setIsLoading(false)
        console.error('Error al procesar retorno de Microsoft:', err)
        setErrorMsg(err.message || 'Error en la autenticación')
      }
    }
    checkRedirect()
  }, [])

  // 1. Login vía Microsoft 365 / Azure AD
  const handleMicrosoftLogin = async () => {
    setErrorMsg('')
    setPendingValidationUser(null)
    setIsLoading(true)
    try {
      await loginWithMicrosoft()
    } catch (err) {
      console.error('Error en autenticación Microsoft:', err)
      setErrorMsg(err.message || 'No se pudo iniciar sesión con Microsoft 365.')
      setIsLoading(false)
    }
  }

  // 2. Login con Credenciales Institucionales
  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setPendingValidationUser(null)

    if (!email.trim()) {
      setErrorMsg('Por favor ingresa tu correo institucional.')
      return
    }

    setIsLoading(true)
    try {
      const userObj = await processUserAccount(email)
      setIsLoading(false)
      if (userObj) {
        onLoginSuccess(userObj)
      }
    } catch (err) {
      setIsLoading(false)
      setErrorMsg(err.message || 'Credenciales no autorizadas.')
    }
  }

  // Acceso Rápido como Administrador José
  const quickLoginAsAdmin = async () => {
    setIsLoading(true)
    const userObj = await processUserAccount(ADMIN_EMAIL, 'José Márquez')
    setIsLoading(false)
    if (userObj) onLoginSuccess(userObj)
  }

  return (
    <div className="min-h-screen bg-[#e8ecf4] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-5xl bg-white rounded-[36px] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px] border border-gray-100">
        
        {/* ================= COLUMNA IZQUIERDA: Arte / Radar Futurista ================= */}
        <div className="hidden lg:flex lg:col-span-6 relative bg-gradient-to-br from-[#161a33] via-[#10132b] to-[#0c0e1e] overflow-hidden flex-col justify-between p-10">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[460px] h-[460px] rounded-full border border-white/[0.05]"></div>
            <div className="absolute w-[340px] h-[340px] rounded-full border border-dashed border-white/[0.08]"></div>
            <div className="absolute w-[200px] h-[200px] rounded-full border border-white/[0.06]"></div>
            <div className="absolute w-[280px] h-[280px] rounded-full bg-gradient-to-tr from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl"></div>
          </div>
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10"></div>
          <div className="relative z-10 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_10px_#10b981]"></span>
            <span className="text-[11px] font-medium tracking-wider text-slate-400 uppercase">
              Sistema Operativo
            </span>
          </div>
        </div>

        {/* ================= COLUMNA DERECHA: Formulario / Notificación de Validación ================= */}
        <div className="col-span-1 lg:col-span-6 p-8 sm:p-12 lg:p-14 flex flex-col justify-between bg-white">
          
          {/* Encabezado: Logo Next+ CSSJ & Ayuda Técnica */}
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2528b7] text-white flex items-center justify-center font-extrabold text-sm shadow-md shadow-indigo-600/20">
                N+
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-900 text-sm tracking-tight">Next+</span>
                  <span className="font-extrabold text-[#2528b7] text-sm tracking-tight">CSSJ</span>
                </div>
                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                  SISTEMA DE UBICACIÓN DE INGLÉS — COLEGIO SALESIANO SAN JOSÉ
                </span>
              </div>
            </div>

            <a
              href="mailto:soporte@salesianosanjose.edu.sv"
              title="Contacto con Soporte Técnico"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] text-slate-500">help</span>
              <span className="hidden sm:inline">Ayuda Técnica</span>
            </a>
          </div>

          {/* Si la cuenta está pendiente de validación */}
          {pendingValidationUser ? (
            <div className="my-auto py-6 bg-amber-50/80 rounded-2xl p-6 border border-amber-200/80 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-[28px]">lock_clock</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Cuenta en Proceso de Activación</h3>
                <p className="text-xs text-gray-600 mt-1.5 max-w-sm mx-auto">
                  Hola <strong className="text-gray-900">{pendingValidationUser.name}</strong> ({pendingValidationUser.email}). Tu cuenta ha sido registrada con rol <span className="font-semibold uppercase text-amber-800">[{pendingValidationUser.role}]</span> pero aún no ha sido validada.
                </p>
              </div>
              <div className="p-3 bg-white rounded-xl text-[11px] text-left text-gray-600 border border-amber-100 space-y-1">
                <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-blue-600">info</span>
                  ¿Quién puede validar tu acceso?
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-gray-500 pl-1">
                  {pendingValidationUser.role === 'student' ? (
                    <>
                      <li>Docentes del Área de Inglés</li>
                      <li>Coordinación Académica</li>
                      <li>Administrador General (José Márquez)</li>
                    </>
                  ) : (
                    <>
                      <li>Coordinación Académica / Administrador General</li>
                    </>
                  )}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => setPendingValidationUser(null)}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all"
              >
                Volver al Inicio de Sesión
              </button>
            </div>
          ) : (
            /* Bloque Formulario Principal */
            <div className="my-auto py-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                Iniciar Sesión
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 mb-6">
                Ingresa tus credenciales autorizadas del Colegio Salesiano San José.
              </p>

              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Correo Institucional o Usuario
                  </label>
                  <input
                    type="text"
                    required
                    value={email}
                    placeholder="usuario@salesianosanjose.edu.sv"
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2528b7]/30 focus:border-[#2528b7] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      placeholder="••••••••••••"
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2528b7]/30 focus:border-[#2528b7] transition-all pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                      title={showPassword ? 'Ocultar' : 'Mostrar'}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-gray-600 font-medium">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-[#2528b7] border-gray-300 focus:ring-[#2528b7]"
                    />
                    Recordar sesión
                  </label>
                  <a
                    href="https://passwordreset.microsoftonline.com"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-[#2528b7] hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3.5 px-4 rounded-xl font-bold text-sm text-white shadow-lg shadow-pink-500/25 bg-gradient-to-r from-[#ff4757] via-[#ff5252] to-[#ff3881] hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  <span>{isLoading ? 'Verificando...' : 'Ingresar al Portal'}</span>
                  {!isLoading && (
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleMicrosoftLogin}
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-gray-800 bg-[#f0f3fa] hover:bg-[#e4e9f5] border border-gray-200/80 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
                >
                  <svg className="w-4 h-4" viewBox="0 0 21 21">
                    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                  </svg>
                  <span>Iniciar sesión con Microsoft 365</span>
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={quickLoginAsAdmin}
                    className="text-[11px] font-semibold text-gray-400 hover:text-[#2528b7] transition-colors"
                  >
                    ⚡ Acceso directo como Admin ({ADMIN_EMAIL})
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Pie de página */}
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-gray-400">
            <span>
              © 2025-2026 Next+ | CSSJ English Placement — Colegio Salesiano San José.
            </span>
            <div className="flex items-center gap-1 cursor-pointer hover:text-gray-600 transition-colors">
              <span className="material-symbols-outlined text-[14px]">language</span>
              <span>Español (Latinoamérica)</span>
              <span className="material-symbols-outlined text-[14px]">expand_more</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
