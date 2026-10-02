import React, { useState } from 'react'
import ExamBuilder from './ExamBuilder'
import teacherAvatar from '../assets/avatar_teacher.png'

export default function TeacherWorkspace({ user, onLogout, onSwitchToStudentView }) {
  const [activeTab, setActiveTab] = useState('exams') // 'exams' | 'builder' | 'bank'
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

  const filteredExams = selectedGrade === 'all' 
    ? examsList 
    : examsList.filter(e => e.grade.includes(selectedGrade))

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-surface-container-lowest border-b border-outline-variant/30 sticky top-0 z-30 px-4 lg:px-8 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-md">
            <span className="material-symbols-outlined text-[24px]">school</span>
          </div>
          <div>
            <h2 className="font-heading font-bold text-base md:text-lg text-on-surface leading-tight">
              English Level Placement
            </h2>
            <span className="text-xs text-on-surface-variant font-medium">Workspace del Docente</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onSwitchToStudentView}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary">visibility</span>
            Vista de Alumno
          </button>

          <div className="flex items-center gap-2 pl-3 border-l border-outline-variant/30">
            <img
              src={teacherAvatar}
              alt="Prof. Mariana Silva"
              className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/20"
            />
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-on-surface leading-none">{user.name}</span>
              <span className="text-[11px] text-on-surface-variant leading-tight">ID: {user.id || 'DOC-4821'}</span>
            </div>
            <button
              onClick={onLogout}
              title="Cerrar sesión"
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
        {/* Dynamic Teacher Identity Bar */}
        <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-6 shadow-sm border border-outline-variant/30">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <img
                  src={teacherAvatar}
                  alt={user.name}
                  className="w-14 h-14 rounded-full object-cover shadow-sm ring-2 ring-primary/30"
                />
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-secondary ring-2 ring-white" title="En línea"></span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-heading font-extrabold text-2xl text-on-surface">{user.name}</h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface text-xs font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    ID: {user.id || 'DOC-4821'}
                  </span>
                </div>
                <span className="text-xs text-on-surface-variant">Área de Lenguas Extranjeras · Ciclo Diagnóstico & Nivelación</span>
              </div>
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex items-center gap-2 flex-wrap xl:justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('exams')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                  activeTab === 'exams'
                    ? 'bg-surface-container text-primary font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
                Mis Exámenes
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('builder')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold shadow-sm transition-all ${
                  activeTab === 'builder'
                    ? 'bg-primary text-white font-bold'
                    : 'bg-primary-container text-white hover:opacity-90'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                + Crear Examen con Wizard
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content: Exámenes Activos */}
        {activeTab === 'exams' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-heading font-bold text-lg text-on-surface">Exámenes Creados por Grado y Sección</h2>
                <p className="text-xs text-on-surface-variant">Instrumentos asignados para nivelación y avance de niveles</p>
              </div>

              {/* Filtro por grado */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-on-surface-variant">Filtrar:</span>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-xs font-semibold text-on-surface focus:outline-none"
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
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-primary-fixed text-on-primary-fixed text-[11px] font-bold">
                        {ex.grade} · Secc. {ex.sections.join(', ')}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                          ex.active ? 'text-secondary' : 'text-outline'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${ex.active ? 'bg-secondary' : 'bg-outline'}`}></span>
                        {ex.active ? 'Activo' : 'Borrador'}
                      </span>
                    </div>

                    <h3 className="font-heading font-bold text-base text-on-surface mb-2">{ex.title}</h3>

                    <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                      {ex.levels.map((lvl, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-surface-container text-on-surface text-[10px] font-bold">
                          Nivel {lvl}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-outline-variant/20">
                    <div className="flex items-center justify-between text-xs text-on-surface-variant mb-2">
                      <span>{ex.questionsCount} ejercicios interactivos</span>
                      <span className="font-bold text-on-surface">
                        {ex.completedStudents}/{ex.totalStudents} evaluados
                      </span>
                    </div>

                    {/* Progress */}
                    <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-secondary h-full rounded-full transition-all"
                        style={{ width: `${(ex.completedStudents / ex.totalStudents) * 100}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-4">
                      <button
                        onClick={onSwitchToStudentView}
                        className="flex items-center gap-1 text-xs text-primary font-bold hover:underline"
                      >
                        <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                        Probar examen
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content: Wizard de Creación de Examen */}
        {activeTab === 'builder' && (
          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant/20">
              <div>
                <h2 className="font-heading font-bold text-xl text-on-surface">Constructor de Examen con Módulos</h2>
                <p className="text-xs text-on-surface-variant">
                  Diseña evaluaciones con paquetes de preguntas interactivas (audio, voz, completar, selección).
                </p>
              </div>
              <button
                onClick={() => setActiveTab('exams')}
                className="flex items-center gap-1 text-xs font-bold text-on-surface-variant hover:text-on-surface bg-surface-container px-3 py-1.5 rounded-lg"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
                Volver a la lista
              </button>
            </div>

            <ExamBuilder onPublished={() => setActiveTab('exams')} />
          </div>
        )}
      </main>
    </div>
  )
}
