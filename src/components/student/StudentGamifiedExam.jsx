import React, { useState, useEffect } from 'react'
import { db, isFirebaseConfigured } from '../../lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import { getUserProfile, sanitizeDocId } from '../../lib/dataService'
import Sidebar from '../shared/Sidebar'
import nextPlusLogo from '../../assets/logo_next_plus.png'

export default function StudentGamifiedExam({ student: initialStudent, onLogout }) {
  const [currentStudent, setCurrentStudent] = useState(initialStudent)
  const [currentSection, setCurrentSection] = useState('interview')
  const [collapsed, setCollapsed] = useState(false)

  // Escuchar en tiempo real en Firestore
  useEffect(() => {
    if (!initialStudent?.email) return
    const docId = sanitizeDocId(initialStudent.email)

    if (isFirebaseConfigured()) {
      const unsub = onSnapshot(doc(db, 'users', docId), (docSnap) => {
        if (docSnap.exists()) {
          setCurrentStudent(prev => ({ ...prev, ...docSnap.data() }))
        }
      }, (err) => {
        console.warn('Error en listener tiempo real Firestore:', err)
      })
      return () => unsub()
    } else {
      // Fallback local: refrescar desde datos
      getUserProfile(initialStudent.email).then(data => {
        if (data) setCurrentStudent(prev => ({ ...prev, ...data }))
      })
    }
  }, [initialStudent?.email])

  const student = currentStudent
  const hasAssignedLevel = Boolean(student.assignedLevel)

  const studentMenuItems = [
    { key: 'interview', label: 'Entrevista Oral (Hoy)', icon: 'hearing', badge: 'En Curso' },
    { key: 'listening', label: 'Pruebas de Listening', icon: 'lock', badge: 'Bloqueado' },
    { key: 'reading', label: 'Comprensión Lectora', icon: 'lock', badge: 'Bloqueado' },
    { key: 'scramble', label: 'Construcción Sintáctica', icon: 'lock', badge: 'Bloqueado' },
    { key: 'results', label: 'Mi Nivel Asignado', icon: 'military_tech', badge: hasAssignedLevel ? 'Listo' : 'Pendiente' },
  ]

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans overflow-hidden">
      {/* Menú Lateral Institucional del Estudiante */}
      <Sidebar
        title="Estudiante Salesiano"
        subtitle="Colegio Salesiano San José"
        icon="school"
        menuItems={studentMenuItems}
        activeKey={currentSection}
        onSelect={(k) => {
          if (k !== 'interview' && k !== 'results') {
            alert('🔒 Esta sección se encuentra temporalmente bloqueada. Durante esta jornada solo debes atender la entrevista oral individual con tu docente.')
            return
          }
          setCurrentSection(k)
        }}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        user={{
          name: student.name,
          email: student.email || `${student.carnet}@salesiano.edu.sv`,
          role: 'student'
        }}
        onLogout={onLogout}
      />

      {/* Área Principal con Header y Contenido Centrado */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <header className="h-16 px-6 bg-white border-b border-gray-200 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <h1 className="font-heading font-extrabold text-base md:text-lg text-gray-900">
              {studentMenuItems.find(m => m.key === currentSection)?.label || 'Entrevista Oral'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
              Jornada Diagnóstica 2026
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <span className="text-xs font-bold text-gray-800 block leading-tight">{student.name}</span>
              <span className="text-[10px] text-gray-500 font-mono">Carnet: {student.carnet || 'N/A'}</span>
            </div>
            <button
              onClick={onLogout}
              className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-all flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Salir</span>
            </button>
          </div>
        </header>

        {/* Contenido Central: Ficha Centrada en el Dashboard */}
        <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
          <div className="max-w-2xl w-full mx-auto my-auto text-center">
            {hasAssignedLevel ? (
              /* Caso 1: El docente ya completó la entrevista y asignó el nivel */
              <div className="bg-white rounded-[32px] p-8 md:p-12 border border-gray-200 shadow-xl space-y-6 animate-fadeIn text-center">
                <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                  <span className="material-symbols-outlined text-5xl">verified</span>
                </div>
                
                <div className="space-y-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold tracking-wider uppercase">
                    Diagnóstico Concluido
                  </span>
                  <h2 className="font-heading font-extrabold text-2xl md:text-3xl text-gray-900">
                    ¡Tu Nivel de Inglés ha sido Asignado!
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
                    Tu entrevista de ubicación oral ha sido registrada exitosamente por tu docente evaluador.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50 max-w-sm mx-auto border border-indigo-100 shadow-inner">
                  <span className="text-[11px] uppercase font-bold text-gray-400 tracking-wider">
                    Nivel Obtenido (MCER)
                  </span>
                  <h3 className="font-heading font-black text-4xl md:text-5xl text-[#2528b7] mt-1">
                    {student.assignedLevel}
                  </h3>
                  <span className="text-xs text-indigo-700 font-semibold mt-2 block">
                    {student.grade} - Sección {student.section}
                  </span>
                </div>

                <p className="text-xs text-gray-400">
                  Pronto tu docente te indicará el salón y material de nivelación correspondiente.
                </p>
              </div>
            ) : (
              /* Caso 2: El alumno está en espera de ser llamado por el profesor para la entrevista oral */
              <div className="bg-white rounded-[32px] p-8 md:p-12 border border-gray-200 shadow-xl space-y-6 animate-fadeIn text-center">
                <div className="w-20 h-20 rounded-full bg-indigo-50 text-[#2528b7] mx-auto flex items-center justify-center relative shadow-inner">
                  <span className="material-symbols-outlined text-4xl animate-pulse">hearing</span>
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white absolute top-1 right-1"></span>
                </div>

                <div className="space-y-2">
                  <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 text-xs font-bold tracking-wider uppercase border border-indigo-100">
                    Jornada de Diagnóstico Oral 2026
                  </span>
                  <h2 className="font-heading font-extrabold text-2xl md:text-3xl text-gray-900">
                    Turno de Entrevista con Docente
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                    Hola <strong className="text-gray-900">{student.name}</strong>. En esta etapa únicamente se realizará tu <span className="font-bold text-indigo-900">entrevista oral individual</span>. Las pruebas digitales se encuentran bloqueadas y se habilitarán posteriormente.
                  </p>
                </div>

                {/* Ficha Informativa del Alumno: Grado, Sección, Docente y Nivel Actual */}
                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 text-left space-y-4 max-w-md mx-auto shadow-xs">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                    <span className="material-symbols-outlined text-blue-700 text-[22px]">badge</span>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Datos de Matrícula y Asignación
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200/70">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Grado y Sección
                      </span>
                      <span className="text-sm font-extrabold text-slate-800 mt-1 block">
                        {student.grade || '7° Grado'} {student.section ? `• Secc. ${student.section}` : ''}
                      </span>
                    </div>

                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200/70">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Nivel Actual Registrado
                      </span>
                      <span className="text-sm font-extrabold text-blue-700 mt-1 block">
                        {student.currentLevel || 'L1-B'}
                      </span>
                    </div>
                  </div>

                  {/* Fila del docente y estado */}
                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200/70 space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px]">school</span>
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Docente Evaluador (Get Involved)
                        </span>
                        <span className="text-xs sm:text-sm font-extrabold text-slate-800 truncate block">
                          {student.assignedTeacher || 'Silvia Herrera'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Estado del diagnóstico:</span>
                      <span className="font-extrabold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        Esperando ser llamado
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-left text-xs text-amber-900 space-y-1.5 max-w-md mx-auto">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <span className="material-symbols-outlined text-[16px]">info</span>
                    Instrucciones para la entrevista:
                  </div>
                  <ul className="list-disc list-inside text-amber-700 space-y-1 pl-1">
                    <li>Permanece atento a que tu docente te llame por tu nombre o carnet.</li>
                    <li>Presta atención a cada pregunta verbal que formule el docente.</li>
                    <li>Responde en inglés con claridad y naturalidad.</li>
                    <li>Al finalizar tu entrevista, tu nivel oficial aparecerá inmediatamente aquí.</li>
                  </ul>
                </div>

                <div className="pt-2 flex items-center justify-center gap-2 text-xs text-gray-500 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Esperando que el docente inicie tu llamada/evaluación...</span>
                </div>
              </div>
            )}
          </div>
        </main>

        <footer className="py-3 text-center text-[11px] text-gray-400 border-t border-gray-100 bg-white">
          © 2026 Colegio Salesiano San José · Sistema de Diagnóstico y Nivelación de Inglés
        </footer>
      </div>
    </div>
  )
}
