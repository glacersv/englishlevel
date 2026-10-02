import React, { useState } from 'react'
import Sidebar from '../shared/Sidebar'

export default function AdminDashboard({ user, onLogout, onSwitchToStudentView }) {
  const [currentSection, setCurrentSection] = useState('overview')
  const [collapsed, setCollapsed] = useState(false)
  const [evalPeriodOpen, setEvalPeriodOpen] = useState(true)

  // Muestra de Docentes para gestión
  const [teachers, setTeachers] = useState([
    { id: 'DOC-4821', name: 'Prof. Mariana Silva', email: 'prof.silva@colegio.edu.pe', grades: ['3°', '4°'], status: 'Activo' },
    { id: 'DOC-3119', name: 'Prof. Carlos Mendoza', email: 'carlos.mendoza@colegio.edu.pe', grades: ['1°', '2°'], status: 'Activo' },
    { id: 'DOC-5092', name: 'Prof. Andrea Rivas', email: 'andrea.rivas@colegio.edu.pe', grades: ['5°'], status: 'Inactivo' },
  ])

  // Muestra de Alumnos y validación de acceso
  const [students, setStudents] = useState([
    { code: 'EST-2025-0842', name: 'Mateo Quispe', grade: '3°', section: 'B', validated: true, level: 'B1' },
    { code: 'EST-2025-0843', name: 'Luciana Morales', grade: '3°', section: 'B', validated: true, level: 'A2' },
    { code: 'EST-2025-0912', name: 'Diego Salazar', grade: '4°', section: 'A', validated: false, level: 'Pendiente' },
    { code: 'EST-2025-0750', name: 'Camila Flores', grade: '1°', section: 'C', validated: true, level: 'A1' },
    { code: 'EST-2025-0631', name: 'Gabriel Torres', grade: '5°', section: 'A', validated: true, level: 'B2' },
  ])

  const menuItems = [
    { key: 'overview', label: 'Supervisión General', icon: 'dashboard' },
    { key: 'teachers', label: 'Gestión de Docentes', icon: 'school', badge: `${teachers.length}` },
    { key: 'students', label: 'Padrón de Alumnos', icon: 'groups', badge: `${students.length}` },
    { key: 'thresholds', label: 'Umbrales MCER', icon: 'tune' },
    { key: 'reports', label: 'Reportes y Cierre', icon: 'assessment' },
  ]

  const toggleStudentValidation = (code) => {
    setStudents(students.map(s => s.code === code ? { ...s, validated: !s.validated } : s))
  }

  return (
    <div className="flex h-screen bg-surface font-sans overflow-hidden">
      {/* Sidebar Colapsable */}
      <Sidebar
        title="Admin Inglés"
        subtitle="Coordinación Académica"
        icon="admin_panel_settings"
        menuItems={menuItems}
        activeKey={currentSection}
        onSelect={setCurrentSection}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        user={user}
        onLogout={onLogout}
      />

      {/* Área Central de Contenido */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        {/* Top Navbar */}
        <header className="h-16 px-6 bg-surface-container-lowest border-b border-outline-variant/30 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h1 className="font-heading font-extrabold text-lg text-on-surface">
              {menuItems.find(m => m.key === currentSection)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle de Periodo Rápido */}
            <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-xl border border-outline-variant/30 text-xs">
              <span className="font-semibold text-on-surface-variant">Período:</span>
              <button
                type="button"
                onClick={() => setEvalPeriodOpen(!evalPeriodOpen)}
                className={`font-bold px-2 py-0.5 rounded-md ${
                  evalPeriodOpen ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-error-container text-on-error-container'
                }`}
              >
                {evalPeriodOpen ? 'Abierto' : 'Cerrado'}
              </button>
            </div>

            <button
              onClick={onSwitchToStudentView}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-all"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">visibility</span>
              Vista de Alumno
            </button>
          </div>
        </header>

        {/* Vistas dinámicas según la sección seleccionada */}
        <main className="p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* SECCIÓN 1: SUPERVISIÓN GENERAL (DASHBOARD) */}
          {currentSection === 'overview' && (
            <div className="space-y-6">
              {/* Cards de Métricas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-semibold text-on-surface-variant uppercase">Total Alumnos</span>
                      <h3 className="font-heading font-extrabold text-2xl text-on-surface mt-1">412</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[22px]">groups</span>
                    </div>
                  </div>
                  <span className="text-xs text-secondary font-medium mt-3 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    94% con matrícula regular
                  </span>
                </div>

                <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-semibold text-on-surface-variant uppercase">Clasificados B1/B2</span>
                      <h3 className="font-heading font-extrabold text-2xl text-on-surface mt-1">58.4%</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-secondary-fixed flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-[22px]">military_tech</span>
                    </div>
                  </div>
                  <span className="text-xs text-secondary font-medium mt-3 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">trending_up</span>
                    Supera meta institucional
                  </span>
                </div>

                <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-semibold text-on-surface-variant uppercase">Docentes a Cargo</span>
                      <h3 className="font-heading font-extrabold text-2xl text-on-surface mt-1">{teachers.length}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[22px]">school</span>
                    </div>
                  </div>
                  <span className="text-xs text-on-surface-variant font-medium mt-3">Todas las secciones cubiertas</span>
                </div>

                <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-semibold text-on-surface-variant uppercase">Estado Exámenes</span>
                      <h3 className="font-heading font-extrabold text-2xl text-secondary mt-1">Abierto</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-secondary-container/40 flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-[22px]">task_alt</span>
                    </div>
                  </div>
                  <span className="text-xs text-on-surface-variant font-medium mt-3">Ciclo de Ubicación 2025</span>
                </div>
              </div>

              {/* Distribución por Grados */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm">
                <h2 className="font-heading font-bold text-base text-on-surface mb-4">
                  Resumen de Avance por Cohorte de Secundaria
                </h2>
                <div className="space-y-4">
                  {[
                    { grade: '1° Secundaria', val: 78, color: 'bg-primary' },
                    { grade: '2° Secundaria', val: 82, color: 'bg-primary' },
                    { grade: '3° Secundaria', val: 92, color: 'bg-secondary' },
                    { grade: '4° Secundaria', val: 65, color: 'bg-tertiary' },
                    { grade: '5° Secundaria', val: 88, color: 'bg-primary' },
                  ].map((g, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-on-surface">{g.grade}</span>
                        <span className="text-on-surface-variant">{g.val}% evaluados</span>
                      </div>
                      <div className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden">
                        <div className={`${g.color} h-full rounded-full`} style={{ width: `${g.val}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN 2: GESTIÓN DE DOCENTES */}
          {currentSection === 'teachers' && (
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <h2 className="font-heading font-bold text-lg text-on-surface">Docentes de Inglés Registrados</h2>
                  <p className="text-xs text-on-surface-variant">Crea cuentas, asigna grados y coordina permisos docentes</p>
                </div>
                <button
                  type="button"
                  onClick={() => alert('Modal para crear nuevo docente en desarrollo')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:bg-primary-container transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">person_add</span>
                  + Nuevo Docente
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/30 text-[11px] font-bold uppercase text-on-surface-variant">
                      <th className="pb-3 px-3">Código</th>
                      <th className="pb-3 px-3">Nombre</th>
                      <th className="pb-3 px-3">Correo</th>
                      <th className="pb-3 px-3">Grados Asignados</th>
                      <th className="pb-3 px-3">Estado</th>
                      <th className="pb-3 px-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {teachers.map((t) => (
                      <tr key={t.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-primary">{t.id}</td>
                        <td className="py-3 px-3 font-semibold text-on-surface">{t.name}</td>
                        <td className="py-3 px-3 text-on-surface-variant">{t.email}</td>
                        <td className="py-3 px-3">
                          <div className="flex gap-1">
                            {t.grades.map((g, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-surface-container text-[11px] font-bold">
                                {g}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === 'Activo' ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-surface-container-high text-outline'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button className="text-xs font-bold text-primary hover:underline">
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECCIÓN 3: PADRÓN DE ALUMNOS (ACTIVACIÓN Y VALIDACIÓN) */}
          {currentSection === 'students' && (
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <h2 className="font-heading font-bold text-lg text-on-surface">Padrón de Alumnos y Habilitación</h2>
                  <p className="text-xs text-on-surface-variant">
                    Valida a los estudiantes para que puedan acceder al examen institucional
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => alert('Función de carga masiva CSV')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">upload_file</span>
                  Importar Nómina CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/30 text-[11px] font-bold uppercase text-on-surface-variant">
                      <th className="pb-3 px-3">Código</th>
                      <th className="pb-3 px-3">Estudiante</th>
                      <th className="pb-3 px-3">Grado / Secc</th>
                      <th className="pb-3 px-3">Nivel Diagnosticado</th>
                      <th className="pb-3 px-3">Estado de Acceso</th>
                      <th className="pb-3 px-3 text-right">Habilitar / Pausar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {students.map((s) => (
                      <tr key={s.code} className="hover:bg-surface-container-low transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-on-surface">{s.code}</td>
                        <td className="py-3 px-3 font-semibold text-on-surface">{s.name}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-surface-container text-xs font-bold">
                            {s.grade} - {s.section}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                            s.level === 'Pendiente' ? 'text-outline bg-surface-container-high' : 'text-primary bg-primary-fixed'
                          }`}>
                            {s.level}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            s.validated ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-error-container text-on-error-container'
                          }`}>
                            {s.validated ? 'Autorizado' : 'Sin Validar'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => toggleStudentValidation(s.code)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              s.validated
                                ? 'bg-surface-container text-error hover:bg-error-container/40'
                                : 'bg-secondary text-white hover:bg-secondary/90'
                            }`}
                          >
                            {s.validated ? 'Inhabilitar' : 'Validar Alumno'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECCIÓN 4: UMBRALES MCER */}
          {currentSection === 'thresholds' && (
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm max-w-2xl space-y-4">
              <h2 className="font-heading font-bold text-lg text-on-surface">Criterios de Avance de Nivel (MCER)</h2>
              <p className="text-xs text-on-surface-variant">
                Define el número de aciertos mínimos requeridos en cada fase para permitir al alumno subir de nivel.
              </p>

              <div className="space-y-4 pt-2">
                {[
                  { level: 'Básico (A1 → A2)', min: 3, total: 5, desc: 'Vocabulario cotidiano, pronombres y frases directas' },
                  { level: 'Intermedio (A2 → B1)', min: 4, total: 6, desc: 'Gramática de tiempos verbales, listening y redacción' },
                  { level: 'Avanzado (B1 → B2)', min: 5, total: 6, desc: 'Fluidez oral (speaking), conectores y comprensión analítica' },
                ].map((th, i) => (
                  <div key={i} className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex justify-between items-center">
                    <div>
                      <h4 className="font-heading font-bold text-sm text-on-surface">{th.level}</h4>
                      <p className="text-xs text-on-surface-variant mt-0.5">{th.desc}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm text-primary">{th.min} / {th.total}</span>
                      <span className="block text-[10px] text-on-surface-variant">Aciertos mín.</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECCIÓN 5: REPORTES Y EXPORTACIÓN */}
          {currentSection === 'reports' && (
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm space-y-4">
              <h2 className="font-heading font-bold text-lg text-on-surface">Descarga de Reportes Oficiales</h2>
              <p className="text-xs text-on-surface-variant">
                Genera las nóminas clasificadas por grado para la asignación de aulas del ciclo 2026.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-5 rounded-xl border border-outline-variant/30 bg-surface-container-low flex items-center justify-between">
                  <div>
                    <h4 className="font-heading font-bold text-sm text-on-surface">Nómina General de Clasificación</h4>
                    <p className="text-xs text-on-surface-variant">Formato compatible con Excel y SIAGIE</p>
                  </div>
                  <button className="px-3 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-container">
                    Exportar CSV
                  </button>
                </div>

                <div className="p-5 rounded-xl border border-outline-variant/30 bg-surface-container-low flex items-center justify-between">
                  <div>
                    <h4 className="font-heading font-bold text-sm text-on-surface">Alumnos para Plan de Refuerzo</h4>
                    <p className="text-xs text-on-surface-variant">Estudiantes con nivel básico reforzado</p>
                  </div>
                  <button className="px-3 py-2 bg-secondary text-white rounded-lg text-xs font-bold hover:bg-secondary/90">
                    Descargar Lista
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
