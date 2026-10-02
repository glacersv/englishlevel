import React, { useState } from 'react'
import Sidebar from '../shared/Sidebar'
import ExamBuilder from './ExamBuilder'
import teacherAvatar from '../../assets/avatar_teacher.png'

export default function TeacherWorkspace({ user, onLogout, onSwitchToStudentView }) {
  const [currentSection, setCurrentSection] = useState('exams')
  const [collapsed, setCollapsed] = useState(false)
  const [selectedGrade, setSelectedGrade] = useState('all')

  const examsList = [
    {
      id: 'ex-01',
      title: 'Diagnóstico Integral 3° de Secundaria 2025',
      grade: '3° Sec',
      sections: ['A', 'B'],
      questionsCount: 15,
      active: true,
      completedStudents: 42,
      totalStudents: 56,
      levels: ['A1', 'A2', 'B1']
    },
    {
      id: 'ex-02',
      title: 'Nivelación Inicial 4° de Secundaria',
      grade: '4° Sec',
      sections: ['A'],
      questionsCount: 18,
      active: true,
      completedStudents: 28,
      totalStudents: 30,
      levels: ['A2', 'B1', 'B2']
    },
    {
      id: 'ex-03',
      title: 'Placement Test Básico 1° de Secundaria',
      grade: '1° Sec',
      sections: ['A', 'B', 'C'],
      questionsCount: 12,
      active: false,
      completedStudents: 0,
      totalStudents: 75,
      levels: ['A1']
    }
  ]

  const menuItems = [
    { key: 'exams', label: 'Mis Exámenes', icon: 'format_list_bulleted', badge: `${examsList.length}` },
    { key: 'builder', label: 'Crear con Wizard', icon: 'add_circle' },
    { key: 'bank', label: 'Banco de Reactivos', icon: 'inventory_2' },
    { key: 'grades', label: 'Secciones Asignadas', icon: 'school' },
  ]

  const filteredExams = selectedGrade === 'all' 
    ? examsList 
    : examsList.filter(e => e.grade.includes(selectedGrade))

  return (
    <div className="flex h-screen bg-surface font-sans overflow-hidden">
      {/* Sidebar Colapsable del Docente */}
      <Sidebar
        title="Workspace Docente"
        subtitle="Lenguas Extranjeras"
        icon="school"
        menuItems={menuItems}
        activeKey={currentSection}
        onSelect={setCurrentSection}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        user={user}
        onLogout={onLogout}
      />

      {/* Área Central */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        {/* Top Navbar */}
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

        {/* Contenido Principal */}
        <main className="p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* SECCIÓN 1: MIS EXÁMENES */}
          {currentSection === 'exams' && (
            <div className="space-y-6">
              {/* Tarjeta de Bienvenida del Docente */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={teacherAvatar}
                    alt={user.name}
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/30"
                  />
                  <div>
                    <h2 className="font-heading font-extrabold text-xl text-on-surface">{user.name}</h2>
                    <p className="text-xs text-on-surface-variant">
                      ID: {user.id || 'DOC-4821'} · Secciones a cargo: 3° A, 3° B y 4° A
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentSection('builder')}
                  className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:bg-primary-container flex items-center gap-1.5 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  Nuevo Examen con Wizard
                </button>
              </div>

              {/* Filtro y Lista */}
              <div className="flex justify-between items-center">
                <h3 className="font-heading font-bold text-base text-on-surface">Exámenes Asignados</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-on-surface-variant">Filtrar:</span>
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-xs font-semibold"
                  >
                    <option value="all">Todos los grados</option>
                    <option value="1°">1° de Secundaria</option>
                    <option value="3°">3° de Secundaria</option>
                    <option value="4°">4° de Secundaria</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredExams.map((ex) => (
                  <div
                    key={ex.id}
                    className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-sm flex flex-col justify-between hover:border-primary/40 transition-all"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-primary-fixed text-on-primary-fixed text-[11px] font-bold">
                          {ex.grade} · Secc. {ex.sections.join(', ')}
                        </span>
                        <span className={`text-[11px] font-bold ${ex.active ? 'text-secondary' : 'text-outline'}`}>
                          {ex.active ? '● Activo' : '○ Borrador'}
                        </span>
                      </div>
                      <h4 className="font-heading font-bold text-base text-on-surface mb-2">{ex.title}</h4>
                    </div>

                    <div className="pt-4 border-t border-outline-variant/20 space-y-2">
                      <div className="flex justify-between text-xs text-on-surface-variant">
                        <span>{ex.questionsCount} ejercicios</span>
                        <span className="font-bold text-on-surface">{ex.completedStudents}/{ex.totalStudents} rindiendo</span>
                      </div>
                      <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-secondary h-full rounded-full"
                          style={{ width: `${(ex.completedStudents / ex.totalStudents) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECCIÓN 2: WIZARD DE EXÁMENES */}
          {currentSection === 'builder' && (
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm">
              <div className="flex justify-between items-center pb-4 mb-6 border-b border-outline-variant/20">
                <div>
                  <h2 className="font-heading font-bold text-xl text-on-surface">Constructor Wizard de Exámenes</h2>
                  <p className="text-xs text-on-surface-variant">
                    Configura preguntas interactivas paso a paso para el diagnóstico de tus alumnos
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentSection('exams')}
                  className="px-3 py-1.5 rounded-lg bg-surface-container text-xs font-bold text-on-surface hover:bg-surface-container-high"
                >
                  Volver a mis exámenes
                </button>
              </div>

              <ExamBuilder onPublished={() => setCurrentSection('exams')} />
            </div>
          )}

          {/* SECCIÓN 3: BANCO DE REACTIVOS */}
          {currentSection === 'bank' && (
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm space-y-4">
              <h2 className="font-heading font-bold text-lg text-on-surface">Banco de Preguntas Reutilizables</h2>
              <p className="text-xs text-on-surface-variant">
                Repositorio clasificado por temas: Tiempos verbales, Vocabulario cotidiano, Audios de conversación.
              </p>
              <div className="p-8 text-center text-outline text-xs italic bg-surface-container-low rounded-xl">
                El banco de reactivos se sincronizará automáticamente al crear preguntas en el Wizard.
              </div>
            </div>
          )}

          {/* SECCIÓN 4: SECCIONES ASIGNADAS */}
          {currentSection === 'grades' && (
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm space-y-4">
              <h2 className="font-heading font-bold text-lg text-on-surface">Tus Salones y Secciones</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {['3° Secundaria - Sección A', '3° Secundaria - Sección B', '4° Secundaria - Sección A'].map((s, i) => (
                  <div key={i} className="p-4 rounded-xl border border-outline-variant/40 bg-surface-container-low">
                    <h4 className="font-bold text-sm text-on-surface">{s}</h4>
                    <p className="text-xs text-on-surface-variant mt-1">28 alumnos matriculados</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
