import React, { useState, useEffect } from 'react'
import { loginWithMicrosoft, handleRedirectAuth } from '../../lib/authAzure'
import { getUserProfile, registerOrUpdateUser } from '../../lib/dataService'
import defaultSchoolStudents from '../../data/studentsFromSchool.json'
import nextPlusLogo from '../../assets/logo_next_plus.png'
import escudoCssj from '../../assets/escudo_cssj.png'
import iconNextApp from '../../assets/icon_next_app.png'

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

    // 1. Cuentas de Acceso Rápido Directo para Pruebas / Administradores
    if (cleanEmail === ADMIN_EMAIL || cleanEmail.startsWith('jose.marquez@')) {
      const existingAdmin = await getUserProfile(cleanEmail)
      const adminData = {
        ...(existingAdmin || {}),
        email: cleanEmail,
        name: existingAdmin?.name || displayName || 'José Márquez',
        role: 'admin',
        status: 'active',
        validatedBy: 'system',
        id: existingAdmin?.id || 'ADMIN-CSSJ-01',
        area: existingAdmin?.area || 'Coordinación / Dirección General',
        photoUrl: existingAdmin?.photoUrl || '',
        phone: existingAdmin?.phone || '',
        specialty: existingAdmin?.specialty || 'Coordinación / Docencia de Inglés',
        bio: existingAdmin?.bio || ''
      }
      await registerOrUpdateUser(adminData)
      return adminData
    }

    // Cuenta Oficial de Coordinación Académica
    if (cleanEmail === 'coordinacion.academica@salesianosanjose.edu.sv' || cleanEmail.startsWith('coordinacion.')) {
      const existingCoord = await getUserProfile(cleanEmail)
      const coordData = {
        ...(existingCoord || {}),
        email: cleanEmail,
        name: existingCoord?.name || displayName || 'Coordinación Académica',
        role: 'coordination',
        status: 'active',
        validatedBy: 'system',
        id: existingCoord?.id || 'COO-CSSJ-01',
        area: existingCoord?.area || 'Coordinación Académica / Dirección',
        photoUrl: existingCoord?.photoUrl || '',
        phone: existingCoord?.phone || '',
        specialty: existingCoord?.specialty || 'Coordinación Académica',
        bio: existingCoord?.bio || '',
        updatedAt: new Date().toISOString()
      }
      await registerOrUpdateUser(coordData)
      return coordData
    }

    const isKnownTeacher =
      cleanEmail === 'teacher@salesianosanjose.edu.sv' ||
      cleanEmail === 'docente@salesianosanjose.edu.sv' ||
      cleanEmail === 'ronald.cardona@salesianosanjose.edu.sv' ||
      cleanEmail === 'silvia.herrera@salesianosanjose.edu.sv' ||
      cleanEmail === 'nelsi.ramos@salesianosanjose.edu.sv' ||
      cleanEmail.includes('prof') ||
      cleanEmail.includes('docente') ||
      cleanEmail.includes('teacher') ||
      cleanEmail.includes('ingles')

    if (isKnownTeacher) {
      let tName = displayName || 'Docente de Inglés'
      let tId = 'DOC-CSSJ-99'
      if (cleanEmail.includes('ronald')) { tName = 'Ronald Cardona'; tId = 'DOC-CSSJ-01'; }
      else if (cleanEmail.includes('silvia')) { tName = 'Silvia Herrera'; tId = 'DOC-CSSJ-02'; }
      else if (cleanEmail.includes('nelsi')) { tName = 'Nelsi Ramos'; tId = 'DOC-CSSJ-03'; }

      const existingTeacher = await getUserProfile(cleanEmail)

      const teacherData = {
        ...(existingTeacher || {}),
        email: cleanEmail,
        name: existingTeacher?.name || tName,
        photoUrl: existingTeacher?.photoUrl || '',
        phone: existingTeacher?.phone || '',
        specialty: existingTeacher?.specialty || 'Departamento de Idiomas (Get Involved)',
        bio: existingTeacher?.bio || '',
        role: 'teacher',
        status: 'active',
        validatedBy: 'system',
        id: existingTeacher?.id || tId,
        area: 'Departamento de Idiomas (Get Involved)'
      }
      await registerOrUpdateUser(teacherData)
      return teacherData
    }

    if (cleanEmail === 'alumno@salesianosanjose.edu.sv') {
      const studentData = {
        email: cleanEmail,
        name: displayName || 'Estudiante Demo (Test)',
        role: 'student',
        status: 'active',
        validatedBy: 'system',
        carnet: '2026-TEST01',
        grade: '7° Grado',
        section: 'A',
        selfReportedLevel: 'A2'
      }
      await registerOrUpdateUser(studentData)
      return studentData
    }

    // 2. Consultar perfil existente en base de datos
    const existing = await getUserProfile(cleanEmail)

    // Buscar en el padrón institucional oficial de alumnos
    const matchSchoolStudent = defaultSchoolStudents.find(
      s => (s.email || '').toLowerCase() === cleanEmail
    )

    if (existing) {
      if (existing.status === 'blocked') {
        throw new Error('Esta cuenta ha sido inhabilitada temporalmente por la administración.')
      }

      // Si ya está registrado como docente o directivo, preservar sus datos completos sin tratar como alumno
      if (existing.role === 'teacher' || existing.role === 'admin' || existing.role === 'coordination') {
        const staffData = {
          ...existing,
          email: cleanEmail,
          name: existing.name || displayName || 'Docente de Inglés',
          photoUrl: existing.photoUrl || '',
          phone: existing.phone || '',
          specialty: existing.specialty || 'Departamento de Idiomas (Get Involved)',
          bio: existing.bio || '',
          status: 'active',
          updatedAt: new Date().toISOString()
        }
        await registerOrUpdateUser(staffData)
        return staffData
      }

      // Si existe pero está en el padrón del colegio y le faltan datos de docente o nivel actual
      const enrichedStudent = {
        ...existing,
        name: existing.name || matchSchoolStudent?.name,
        carnet: existing.carnet || matchSchoolStudent?.carnet,
        grade: existing.grade || matchSchoolStudent?.grade,
        section: existing.section || matchSchoolStudent?.section,
        currentLevel: existing.currentLevel || matchSchoolStudent?.currentLevel || 'L1-B',
        assignedTeacher: existing.assignedTeacher || matchSchoolStudent?.assignedTeacher || 'Silvia Herrera',
        assignedTeacherEmail: existing.assignedTeacherEmail || matchSchoolStudent?.assignedTeacherEmail || 'silvia.herrera@salesianosanjose.edu.sv',
        status: matchSchoolStudent ? 'active' : existing.status
      }

      if (matchSchoolStudent && existing.status === 'pending') {
        await registerOrUpdateUser(enrichedStudent)
        return enrichedStudent
      }

      if (enrichedStudent.status === 'pending') {
        setPendingValidationUser(enrichedStudent)
        return null
      }

      await registerOrUpdateUser(enrichedStudent)
      return enrichedStudent
    }

    // 3. Primer ingreso (nuevo usuario):
    let defaultRole = 'student'
    let defaultStatus = matchSchoolStudent ? 'active' : 'pending' // Si es alumno del colegio, entra directo activo

    if (cleanEmail.includes('coord') || cleanEmail.includes('director')) {
      defaultRole = 'coordination'
      defaultStatus = 'active'
    } else if (cleanEmail.includes('prof') || cleanEmail.includes('docente') || cleanEmail.includes('teacher') || cleanEmail.includes('ingles')) {
      defaultRole = 'teacher'
      defaultStatus = 'active'
    } else {
      defaultRole = 'student'
    }

    const namePart = displayName || cleanEmail.split('@')[0].replace('.', ' ')
    const formattedName = matchSchoolStudent?.name || (namePart.charAt(0).toUpperCase() + namePart.slice(1))

    const newProfile = {
      email: cleanEmail,
      name: formattedName,
      role: defaultRole,
      status: defaultStatus,
      createdAt: new Date().toISOString(),
      carnet: matchSchoolStudent?.carnet || null,
      grade: matchSchoolStudent?.grade || (defaultRole === 'student' ? '7° Grado' : null),
      section: matchSchoolStudent?.section || (defaultRole === 'student' ? 'A' : null),
      currentLevel: matchSchoolStudent?.currentLevel || null,
      assignedTeacher: matchSchoolStudent?.assignedTeacher || 'Ronald Cardona',
      assignedTeacherEmail: matchSchoolStudent?.assignedTeacherEmail || 'ronald.cardona@salesianosanjose.edu.sv',
      code: `${defaultRole.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`
    }

    await registerOrUpdateUser(newProfile)

    if (defaultStatus === 'pending') {
      setPendingValidationUser(newProfile)
      return null
    }

    return newProfile
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

  // Acceso Rápido para Pruebas (Admin, Docente, Alumno)
  const quickLoginAsAdmin = async () => {
    setIsLoading(true)
    const userObj = await processUserAccount(ADMIN_EMAIL, 'José Márquez')
    setIsLoading(false)
    if (userObj) onLoginSuccess(userObj)
  }

  const quickLoginAsTeacher = async (teacherEmail = 'ronald.cardona@salesianosanjose.edu.sv') => {
    setIsLoading(true)
    let tName = 'Docente de Inglés'
    if (teacherEmail.includes('ronald')) tName = 'Ronald Cardona'
    else if (teacherEmail.includes('silvia')) tName = 'Silvia Herrera'
    else if (teacherEmail.includes('nelsi')) tName = 'Nelsi Ramos'
    const userObj = await processUserAccount(teacherEmail, tName)
    setIsLoading(false)
    if (userObj) onLoginSuccess(userObj)
  }

  const quickLoginAsStudent = async () => {
    setIsLoading(true)
    const userObj = await processUserAccount('alumno@salesianosanjose.edu.sv', 'Alumno de Prueba')
    setIsLoading(false)
    if (userObj) onLoginSuccess(userObj)
  }

  return (
    <div className="min-h-screen bg-slate-100/90 flex items-center justify-center p-3 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-[1060px] bg-white rounded-3xl md:rounded-[28px] shadow-[0_20px_50px_-10px_rgba(15,23,42,0.18)] overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px] border border-slate-200/80">
        
        {/* ================= COLUMNA IZQUIERDA: Fondo blanco institucional con Escudo del Colegio ================= */}
        <section className="hidden md:flex md:col-span-5 bg-white border-r border-slate-100 p-8 lg:p-10 flex-col justify-between items-center text-center relative">
          
          <div className="w-full flex justify-start">
            <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200/80 px-3.5 py-1.5 rounded-full text-[11px] font-bold text-blue-900 tracking-wider uppercase">
              Colegio Salesiano San José
            </span>
          </div>

          {/* Tarjeta interior para darle marco al escudo */}
          <div className="my-auto w-full flex flex-col items-center">
            <div className="w-full max-w-[310px] bg-white border border-slate-200/70 rounded-3xl p-6 pb-4 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.06),0_0_0_1px_rgba(226,232,240,0.6)] flex flex-col items-center">
              
              {/* Contenedor del Escudo */}
              <div className="w-36 h-44 flex items-center justify-center mb-3">
                <img
                  src={escudoCssj}
                  alt="Escudo Colegio Salesiano San José"
                  className="max-w-full max-h-full object-contain drop-shadow-sm"
                />
              </div>

              {/* Logotipo NEXT+ */}
              <div className="w-full max-w-[190px] pt-1 border-t border-slate-100">
                <img
                  src={nextPlusLogo}
                  alt="NEXT+"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>

            <p className="text-slate-500 text-xs sm:text-[13px] leading-relaxed max-w-[310px] mt-4 font-normal">
              Plataforma para la evaluación, diagnóstico y colocación de niveles en el idioma inglés.
            </p>
          </div>
        </section>

        {/* ================= COLUMNA DERECHA: Autenticación SSO Microsoft 365 (Sin formulario manual) ================= */}
        <section className="col-span-1 md:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between bg-white">
          
          <div>
            {/* Cabecera del Formulario con Ícono NEXT+ Arriba y Ayuda */}
            <header className="flex items-center justify-between pb-6 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                <img
                  src={iconNextApp}
                  alt="Ícono NEXT+"
                  className="w-12 h-12 object-contain shrink-0"
                />
                <div className="w-[1px] h-8 bg-slate-300"></div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-tight leading-tight">
                    Sistema de Ubicación de Inglés
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">
                    Colegio Salesiano San José
                  </span>
                </div>
              </div>

              <a
                href="mailto:soporte@salesianosanjose.edu.sv"
                className="hidden sm:inline-flex items-center gap-1.5 text-slate-500 hover:text-blue-900 text-xs font-semibold transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">help</span>
                <span>Ayuda Técnica</span>
              </a>
            </header>

            {/* Aviso de cuenta pendiente */}
            {pendingValidationUser ? (
              <div className="my-6 py-6 bg-amber-50/80 rounded-2xl p-6 border border-amber-200/80 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shadow-inner">
                  <span className="material-symbols-outlined text-[28px]">lock_clock</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Cuenta en Proceso de Activación</h3>
                  <p className="text-xs text-gray-600 mt-1.5 max-w-sm mx-auto">
                    La cuenta (<span className="text-gray-900 font-semibold">{pendingValidationUser.email}</span>) ha sido registrada pero aún no ha sido validada en el sistema.
                  </p>
                </div>
                <div className="p-3 bg-white rounded-xl text-[11px] text-left text-gray-600 border border-amber-100 space-y-1">
                  <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-blue-600">info</span>
                    ¿Quién puede validar tu acceso?
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-gray-600 pl-1 font-medium">
                    <li>Docentes del Área de Inglés</li>
                    <li>Coordinación Académica</li>
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
              /* Bloque Principal de Iniciar Sesión Directo (Sin Formulario Manual) */
              <div className="py-4 my-auto">
                <div className="mb-6">
                  <h2 className="text-2xl sm:text-[32px] font-extrabold text-slate-900 tracking-tight leading-snug">
                    Iniciar Sesión
                  </h2>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    El ingreso se realiza mediante la cuenta institucional de Microsoft Teams / Office 365 para acceder a las evaluaciones de ubicación de nivel de inglés del Colegio Salesiano San José.
                  </p>
                </div>

                {/* Cuadro informativo SSO */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 mb-8 flex items-start gap-3.5 shadow-xs">
                  <div className="text-blue-600 mt-0.5 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                  <div className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                    Ingresa únicamente con tu cuenta <strong className="text-slate-900">@salesianosanjose.edu.sv</strong>. No requieres ingresar ni registrar contraseñas manuales en esta pantalla.
                  </div>
                </div>

                {errorMsg && (
                  <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Botón Principal Microsoft 365 / Teams */}
                <button
                  type="button"
                  onClick={handleMicrosoftLogin}
                  disabled={isLoading}
                  className="w-full h-14 rounded-2xl font-bold text-sm sm:text-base text-white bg-[#0f172a] hover:bg-[#1e293b] active:scale-[0.99] shadow-lg shadow-slate-900/15 hover:shadow-xl hover:shadow-slate-900/25 transition-all flex items-center justify-center gap-3.5 cursor-pointer disabled:opacity-60"
                >
                  <div className="grid grid-cols-2 gap-0.5 w-4 h-4 shrink-0">
                    <span className="w-2 h-2 bg-[#f25022]"></span>
                    <span className="w-2 h-2 bg-[#7fba00]"></span>
                    <span className="w-2 h-2 bg-[#00a4ef]"></span>
                    <span className="w-2 h-2 bg-[#ffb900]"></span>
                  </div>
                  <span>{isLoading ? 'Conectando con Microsoft...' : 'Iniciar sesión con Microsoft 365 / Teams'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Pie de página */}
          <footer className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>
              &copy; 2025–2026 Next+ | CSSJ English Placement &bull; Colegio Salesiano San José.
            </span>
            <span>Español (Latinoamérica)</span>
          </footer>
        </section>

      </div>
    </div>
  )
}
