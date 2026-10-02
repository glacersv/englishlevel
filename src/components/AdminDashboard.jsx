import React, { useState } from 'react'

export default function AdminDashboard({ user, onLogout, onSwitchToStudentView }) {
  const [evalPeriodOpen, setEvalPeriodOpen] = useState(true)
  const [thresholds, setThresholds] = useState({ basico: 3, intermedio: 4, avanzado: 5 })
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  // Datos simulados fieles a la maqueta de coordinación
  const stats = [
    { title: 'Total Evaluados', value: '412', delta: '+18% vs 2024', icon: 'groups', color: 'text-primary', bg: 'bg-primary-fixed' },
    { title: 'Clasificados B1/B2', value: '58.4%', delta: 'Supera meta 50%', icon: 'military_tech', color: 'text-secondary', bg: 'bg-secondary-fixed' },
    { title: 'Requieren Refuerzo', value: '46', delta: '11.1% del total', icon: 'warning', color: 'text-tertiary', bg: 'bg-tertiary-fixed' },
    { title: 'Exámenes Activos', value: '8', delta: '5 grados cubiertos', icon: 'assignment', color: 'text-primary', bg: 'bg-surface-container-high' },
  ]

  const cohortData = [
    { grade: '1° Sec', total: 85, a1: 22, a2: 45, b1: 18, b2: 0, status: 'Finalizado' },
    { grade: '2° Sec', total: 82, a1: 15, a2: 42, b1: 20, b2: 5, status: 'Finalizado' },
    { grade: '3° Sec', total: 88, a1: 10, a2: 30, b1: 36, b2: 12, status: 'En curso' },
    { grade: '4° Sec', total: 79, a1: 6, a2: 25, b1: 34, b2: 14, status: 'En curso' },
    { grade: '5° Sec', total: 78, a1: 2, a2: 18, b1: 38, b2: 20, status: 'Pendiente' },
  ]

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
            <span className="text-xs text-on-surface-variant font-medium">Panel de Coordinación Académica</span>
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
            <div className="w-9 h-9 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-xs">
              CA
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-on-surface leading-none">{user.name}</span>
              <span className="text-[11px] text-on-surface-variant leading-tight">{user.email}</span>
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

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
        {/* Academic Command Bar */}
        <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-6 shadow-sm border border-outline-variant/30">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
                <span className="h-2 w-2 rounded-full bg-secondary"></span>
                <span>Gestión Estratégica Institucional</span>
              </div>
              <h1 className="font-heading font-extrabold text-2xl md:text-3xl text-on-surface">
                Panel de Coordinación Académica
              </h1>
              <p className="text-sm text-on-surface-variant mt-1 max-w-2xl">
                Supervisión de cohortes diagnósticas, estandarización de umbrales MCER e importación centralizada para el ciclo lectivo.
              </p>
            </div>

            {/* Acciones Rápidas */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Toggle Periodo */}
              <div className="flex items-center gap-3 bg-surface-container-low px-3.5 py-2 rounded-xl border border-outline-variant/30">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant">Estado del Período</span>
                  <span className={`text-xs font-bold ${evalPeriodOpen ? 'text-secondary' : 'text-error'}`}>
                    {evalPeriodOpen ? 'Evaluaciones Abiertas' : 'Período Cerrado'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEvalPeriodOpen(!evalPeriodOpen)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    evalPeriodOpen ? 'bg-secondary' : 'bg-outline-variant'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      evalPeriodOpen ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <button
                onClick={() => setShowConfigModal(true)}
                className="flex items-center gap-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs md:text-sm font-semibold px-3.5 py-2.5 rounded-xl transition-all border border-outline-variant/30 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">tune</span>
                Umbrales MCER
              </button>

              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-1.5 bg-primary text-white hover:bg-primary-container text-xs md:text-sm font-semibold px-3.5 py-2.5 rounded-xl transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                Importar CSV
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div
              key={i}
              className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{s.title}</span>
                  <h3 className="font-heading font-extrabold text-2xl text-on-surface mt-1">{s.value}</h3>
                </div>
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <span className={`material-symbols-outlined ${s.color} text-[22px]`}>{s.icon}</span>
                </div>
              </div>
              <span className="text-xs font-medium text-secondary mt-3 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                {s.delta}
              </span>
            </div>
          ))}
        </div>

        {/* Cohortes y Resultados por Grado */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="font-heading font-bold text-lg text-on-surface">Distribución por Grados y Niveles (MCER)</h2>
              <p className="text-xs text-on-surface-variant">Resultados consolidados de alumnos por cohorte para asignación 2026</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-on-surface-variant bg-surface-container px-3 py-1.5 rounded-lg">
                Filtro: Todos los Grados (1° - 5°)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead>
                <tr className="border-b border-outline-variant/30 text-on-surface-variant uppercase tracking-wider text-[11px] font-bold">
                  <th className="pb-3 px-3">Grado</th>
                  <th className="pb-3 px-3">Alumnos</th>
                  <th className="pb-3 px-3">A1 (Básico)</th>
                  <th className="pb-3 px-3">A2 (Pre-Intermedio)</th>
                  <th className="pb-3 px-3">B1 (Intermedio)</th>
                  <th className="pb-3 px-3">B2 (Avanzado)</th>
                  <th className="pb-3 px-3">Progreso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {cohortData.map((row, i) => (
                  <tr key={i} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-3 px-3 font-bold text-on-surface">{row.grade}</td>
                    <td className="py-3 px-3 font-semibold text-on-surface">{row.total}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-tertiary-fixed text-on-tertiary-fixed font-semibold">
                        {row.a1}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface font-semibold">
                        {row.a2}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-secondary-fixed text-on-secondary-fixed font-semibold">
                        {row.b1}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-primary-fixed text-on-primary-fixed font-semibold">
                        {row.b2}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          row.status === 'Finalizado'
                            ? 'bg-secondary-container/40 text-on-secondary-container'
                            : row.status === 'En curso'
                            ? 'bg-primary-fixed/50 text-primary'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal de Configuración de Umbrales */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant/40">
            <h3 className="font-heading font-bold text-lg text-on-surface mb-2">Configurar Umbrales de Aprobación</h3>
            <p className="text-xs text-on-surface-variant mb-4">
              Define el mínimo de aciertos requeridos por nivel para desbloquear la siguiente fase y clasificar al alumno.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-on-surface-variant block mb-1">
                  Nivel Básico (A1 → A2)
                </label>
                <input
                  type="number"
                  value={thresholds.basico}
                  onChange={(e) => setThresholds({ ...thresholds, basico: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-on-surface-variant block mb-1">
                  Nivel Intermedio (A2 → B1)
                </label>
                <input
                  type="number"
                  value={thresholds.intermedio}
                  onChange={(e) => setThresholds({ ...thresholds, intermedio: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-on-surface-variant block mb-1">
                  Nivel Avanzado (B1 → B2)
                </label>
                <input
                  type="number"
                  value={thresholds.avanzado}
                  onChange={(e) => setThresholds({ ...thresholds, avanzado: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
              >
                Cancelar
              </button>
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-container"
              >
                Guardar Umbrales
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importación CSV */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant/40">
            <h3 className="font-heading font-bold text-lg text-on-surface mb-2">Importar Nómina de Alumnos (CSV)</h3>
            <p className="text-xs text-on-surface-variant mb-4">
              Carga alumnos con columnas: <code>codigo, nombre, grado, seccion</code>
            </p>
            <div className="border-2 border-dashed border-outline-variant/80 rounded-2xl p-6 text-center bg-surface-container-low cursor-pointer hover:border-primary transition-all">
              <span className="material-symbols-outlined text-4xl text-primary mb-2">cloud_upload</span>
              <p className="text-xs font-semibold text-on-surface">Haz clic para seleccionar archivo .csv</p>
              <p className="text-[11px] text-on-surface-variant mt-1">o arrastra el archivo hasta aquí</p>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
