import React, { useState, useEffect } from 'react'
import Sidebar from '../shared/Sidebar'
import ExamBuilder from './ExamBuilder'
import OralInterviewExam from './OralInterviewExam'
import teacherAvatar from '../../assets/avatar_teacher.png'
import { getAllUsers, updateUserStatus, getOralEvaluations, getAcademicStructure } from '../../lib/dataService'

export default function TeacherWorkspace({ user, onLogout, onSwitchToStudentView }) {
  const [currentSection, setCurrentSection] = useState('interview')
  const [collapsed, setCollapsed] = useState(false)

  // Segmentos / Toggles de Grados y Secciones dinámicos
  const [gradePill, setGradePill] = useState('all')
  const [sectionPill, setSectionPill] = useState('all')
  const [statusToggle, setStatusToggle] = useState('all') // 'all' | 'pending' | 'completed'
  const [searchTerm, setSearchTerm] = useState('')

  // Estructura dinámica de grados y secciones desde Firestore
  const [academic, setAcademic] = useState({ grades: [], sections: [], levels: [] })

  // Paginación para fluidez con 467 alumnos
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 12

  const [students, setStudents] = useState([])
  const [evaluations, setEvaluations] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)

  // Alumno activo que está siendo evaluado en la consola oral
  const [activeInterviewStudent, setActiveInterviewStudent] = useState(null)

  // Cargar lista de alumnos, evaluaciones y estructura académica
  const loadData = async () => {
    setLoadingStudents(true)
    try {
      const [all, evals, struct] = await Promise.all([
        getAllUsers(),
        getOralEvaluations(),
        getAcademicStructure()
      ])
      setStudents((all || []).filter(u => u.role === 'student'))
      setEvaluations(evals || [])
      if (struct) setAcademic(struct)
    } catch (e) {
      console.error('Error cargando alumnos en vista docente:', e)
    } finally {
      setLoadingStudents(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Iniciar la entrevista oral llamando al alumno
  const handleStartInterview = (student) => {
    setActiveInterviewStudent(student)
  }

  // Filtrado reactivo con Botones Ovalados
  const filteredStudents = students.filter(s => {
    const isCompleted = Boolean(s.assignedLevel)
    const matchStatus = statusToggle === 'all' ||
      (statusToggle === 'completed' && isCompleted) ||
      (statusToggle === 'pending' && !isCompleted)

    // Filtro de grado
    let matchGrade = true
    if (gradePill !== 'all') {
      const gStr = (s.grade || '') + ' ' + (s.codigoGrado || '')
      if (gradePill === '6') matchGrade = gStr.includes('6°') || s.codigoGrado === '06'
      else if (gradePill === '7') matchGrade = gStr.includes('7°') || s.codigoGrado === '07'
      else if (gradePill === '8') matchGrade = gStr.includes('8°') || s.codigoGrado === '08'
      else if (gradePill === '9') matchGrade = gStr.includes('9°') || s.codigoGrado === '09'
      else if (gradePill === '10') matchGrade = gStr.includes('10°') || gStr.includes('1° Bachillerato') || s.codigoGrado === '10'
      else if (gradePill === '11') matchGrade = gStr.includes('11°') || gStr.includes('2° Bachillerato') || s.codigoGrado === '11'
      else if (gradePill === '12') matchGrade = gStr.includes('12°') || gStr.includes('3° Bachillerato') || s.codigoGrado === '32'
      else matchGrade = gStr.includes(gradePill)
    }

    const matchSection = sectionPill === 'all' || s.section === sectionPill

    const matchSearch = !searchTerm ||
      (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.carnet && s.carnet.includes(searchTerm)) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchStatus && matchGrade && matchSection && matchSearch
  })

  // Paginación
  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const menuItems = [
    { key: 'interview', label: 'Entrevista Oral (A1-C1)', icon: 'record_voice_over', badge: `${students.length}` },
    { key: 'results', label: 'Resultados y Niveles', icon: 'military_tech', badge: `${evaluations.length}` },
    { key: 'builder', label: 'Constructor de Examen', icon: 'quiz' },
  ]

  return (
    <div className="flex h-screen bg-surface font-sans overflow-hidden">
      <Sidebar
        title="Docente Inglés"
        subtitle="Colegio Salesiano San José"
        icon="school"
        menuItems={menuItems}
        activeKey={currentSection}
        onSelect={(k) => {
          setActiveInterviewStudent(null)
          setCurrentSection(k)
        }}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        user={user}
        onLogout={onLogout}
      />

      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <header className="h-16 px-6 bg-surface-container-lowest border-b border-outline-variant/30 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h1 className="font-heading font-extrabold text-lg text-on-surface">
              {menuItems.find(m => m.key === currentSection)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onSwitchToStudentView}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-all"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">visibility</span>
              Vista de Alumno
            </button>
          </div>
        </header>

        <main className="p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* ================= SI HAY UN ALUMNO EN EVALUACIÓN ORAL ================= */}
          {activeInterviewStudent ? (
            <OralInterviewExam
              student={activeInterviewStudent}
              teacher={user}
              onFinished={(res) => {
                setActiveInterviewStudent(null)
                loadData()
              }}
              onCancel={() => setActiveInterviewStudent(null)}
            />
          ) : (
            <>
              {/* SECCIÓN 1: ENTREVISTA ORAL CON TOGGLES Y PAGINACIÓN */}
              {currentSection === 'interview' && (
                <div className="space-y-6">
                  {/* Tarjeta de bienvenida del docente */}
                  <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={teacherAvatar}
                        alt={user.name}
                        className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/30"
                      />
                      <div>
                        <h2 className="font-heading font-extrabold text-xl text-on-surface">{user.name}</h2>
                        <p className="text-xs text-on-surface-variant font-mono">
                          {user.email} · Consola de Entrevista Diagnóstica Oral (A1 - C1)
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Estudiantes Sincronizados</span>
                      <span className="font-heading font-extrabold text-2xl text-[#2528b7]">{students.length} alumnos</span>
                    </div>
                  </div>

                  {/* BARRA DE BOTONES OVALADOS PARA GRADOS, SECCIONES Y ESTADO */}
                  <div className="bg-surface-container-lowest rounded-3xl p-5 border border-outline-variant/30 shadow-sm space-y-3">
                    {/* Fila 1: Botones Ovalados de Grado */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mr-1">
                        Grado:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setGradePill('all')
                          setCurrentPage(1)
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                          gradePill === 'all'
                            ? 'bg-[#2528b7] text-white shadow-sm'
                            : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                        }`}
                      >
                        Todos
                      </button>
                      {(academic.grades && academic.grades.length > 0 ? academic.grades : [
                        { id: '6', label: '6°' },
                        { id: '7', label: '7°' },
                        { id: '8', label: '8°' },
                        { id: '9', label: '9°' },
                        { id: '10', label: '10°' },
                        { id: '11', label: '11°' },
                        { id: '12', label: '12°' }
                      ]).map(g => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            setGradePill(g.id)
                            setCurrentPage(1)
                          }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                            gradePill === g.id
                              ? 'bg-[#2528b7] text-white shadow-sm ring-2 ring-indigo-200'
                              : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                          }`}
                        >
                          {g.label.length > 10 ? g.id + '°' : g.label}
                        </button>
                      ))}
                    </div>

                    {/* Fila 2: Botones Ovalados de Sección, Estado y Búsqueda */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-gray-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mr-1">
                          Sección:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSectionPill('all')
                            setCurrentPage(1)
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            sectionPill === 'all'
                              ? 'bg-indigo-900 text-white shadow-sm'
                              : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
                          }`}
                        >
                          Todas
                        </button>
                        {(academic.sections && academic.sections.length > 0 ? academic.sections : ['A', 'B', 'C', 'D']).map(sec => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => {
                              setSectionPill(sec)
                              setCurrentPage(1)
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              sectionPill === sec
                                ? 'bg-indigo-900 text-white shadow-sm ring-2 ring-indigo-200'
                                : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
                            }`}
                          >
                            Secc. {sec}
                          </button>
                        ))}

                        <span className="text-gray-300 mx-1 hidden sm:inline">|</span>

                        {/* Estado de Evaluación */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setStatusToggle('all')
                              setCurrentPage(1)
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              statusToggle === 'all' ? 'bg-gray-900 text-white' : 'text-gray-600 bg-gray-100'
                            }`}
                          >
                            Todos
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStatusToggle('pending')
                              setCurrentPage(1)
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              statusToggle === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-600 bg-gray-100'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            <span>Por Evaluar ({students.filter(s => !s.assignedLevel).length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStatusToggle('completed')
                              setCurrentPage(1)
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              statusToggle === 'completed' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 bg-gray-100'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>Completados ({students.filter(s => Boolean(s.assignedLevel)).length})</span>
                          </button>
                        </div>
                      </div>

                      {/* Buscador Rápido */}
                      <div className="relative w-full sm:w-60">
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value)
                            setCurrentPage(1)
                          }}
                          placeholder="Nombre o carnet..."
                          className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#2528b7]/30"
                        />
                        <span className="material-symbols-outlined text-[16px] text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2">
                          search
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tabla de Alumnos Paginada */}
                  <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                      <h3 className="font-heading font-bold text-sm text-gray-900">
                        Alumnos en Lista ({filteredStudents.length})
                      </h3>
                      <span className="text-[11px] text-gray-500">
                        Pulsa <strong>"Llamar / Evaluar"</strong> para abrir las 3 preguntas orales del nivel.
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs md:text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-[11px] font-bold uppercase text-gray-500 bg-white">
                            <th className="py-3 px-4">Carnet</th>
                            <th className="py-3 px-4">Estudiante</th>
                            <th className="py-3 px-4">Grado & Secc.</th>
                            <th className="py-3 px-4">Nivel Obtenido</th>
                            <th className="py-3 px-4 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {paginatedStudents.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="py-12 text-center text-gray-400 text-xs italic">
                                No se encontraron alumnos con los criterios seleccionados.
                              </td>
                            </tr>
                          ) : (
                            paginatedStudents.map((s) => {
                              const hasLevel = Boolean(s.assignedLevel)
                              return (
                                <tr key={s.carnet || s.email} className="hover:bg-indigo-50/30 transition-colors">
                                  <td className="py-3.5 px-4 font-mono font-bold text-gray-700">{s.carnet || 'N/A'}</td>
                                  <td className="py-3.5 px-4 font-semibold text-gray-900">
                                    <div className="flex items-center gap-2">
                                      <span>{s.name}</span>
                                      {s.selfReportedLevel && (
                                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold" title="Nivel auto-percibido por el alumno">
                                          Auto: {s.selfReportedLevel}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-gray-400 font-mono font-normal truncate max-w-xs">{s.email}</div>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className="px-2.5 py-0.5 rounded-lg bg-gray-100 font-bold text-xs text-gray-700">
                                      {s.grade} - {s.section}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    {hasLevel ? (
                                      <span className="px-3 py-1 rounded-full font-extrabold text-xs bg-emerald-100 text-emerald-800">
                                        Nivel {s.assignedLevel}
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        Sin Evaluar
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => onSwitchToStudentView?.(s)}
                                        className="p-2 rounded-xl text-gray-500 hover:text-[#2528b7] hover:bg-indigo-50 transition-colors"
                                        title={`Ver portal como ${s.name}`}
                                      >
                                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleStartInterview(s)}
                                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#2528b7] to-[#4f46e5] hover:brightness-110 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">record_voice_over</span>
                                        <span>{hasLevel ? 'Reevaluar' : 'Llamar'}</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* PAGINACIÓN */}
                    <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
                      <span className="text-xs text-gray-500">
                        Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({filteredStudents.length} total)
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={currentPage <= 1}
                          onClick={() => setCurrentPage(1)}
                          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
                        >
                          «
                        </button>
                        <button
                          type="button"
                          disabled={currentPage <= 1}
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
                        >
                          Anterior
                        </button>

                        <div className="flex items-center gap-1 mx-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum = currentPage
                            if (totalPages <= 5) pageNum = i + 1
                            else if (currentPage <= 3) pageNum = i + 1
                            else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                            else pageNum = currentPage - 2 + i

                            return (
                              <button
                                key={pageNum}
                                type="button"
                                onClick={() => setCurrentPage(pageNum)}
                                className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                                  currentPage === pageNum
                                    ? 'bg-[#2528b7] text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                              >
                                {pageNum}
                              </button>
                            )
                          })}
                        </div>

                        <button
                          type="button"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
                        >
                          Siguiente
                        </button>
                        <button
                          type="button"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage(totalPages)}
                          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
                        >
                          »
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* SECCIÓN 2: RESULTADOS Y HISTORIAL */}
              {currentSection === 'results' && (
                <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="font-heading font-bold text-lg text-on-surface">Actas de Entrevistas Orales</h2>
                      <p className="text-xs text-on-surface-variant">Historial de evaluaciones orales completadas con rúbrica y tiempo registrado.</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200">
                      {evaluations.length} evaluados
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs md:text-sm">
                      <thead>
                        <tr className="border-b border-outline-variant/30 text-[11px] font-bold uppercase text-on-surface-variant">
                          <th className="pb-3 px-3">Estudiante</th>
                          <th className="pb-3 px-3">Grado</th>
                          <th className="pb-3 px-3">Nivel Final</th>
                          <th className="pb-3 px-3">Duración</th>
                          <th className="pb-3 px-3">Docente Evaluador</th>
                          <th className="pb-3 px-3">Fecha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/20">
                        {evaluations.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-gray-400 text-xs italic">
                              Aún no se han completado entrevistas orales.
                            </td>
                          </tr>
                        ) : (
                          evaluations.map((ev, i) => (
                            <tr key={i} className="hover:bg-surface-container-low transition-colors">
                              <td className="py-3 px-3 font-semibold text-gray-900">{ev.studentName}</td>
                              <td className="py-3 px-3">{ev.grade} - {ev.section}</td>
                              <td className="py-3 px-3">
                                <span className="px-3 py-0.5 rounded-full font-bold text-xs bg-indigo-100 text-[#2528b7]">
                                  {ev.finalLevel}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-mono text-gray-600">{ev.durationFormatted || `${ev.totalDurationSeconds}s`}</td>
                              <td className="py-3 px-3 text-gray-600">{ev.teacherName || ev.teacherEmail}</td>
                              <td className="py-3 px-3 text-[11px] text-gray-400">
                                {ev.completedAt ? new Date(ev.completedAt).toLocaleString() : 'Hoy'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECCIÓN 3: CONSTRUCTOR WIZARD */}
              {currentSection === 'builder' && (
                <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm">
                  <ExamBuilder onPublished={() => setCurrentSection('interview')} />
                </div>
              )}
            </>
          )}

        </main>
      </div>
    </div>
  )
}
