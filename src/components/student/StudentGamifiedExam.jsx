import React, { useState } from 'react'
import { saveStudentSelfLevel } from '../../lib/dataService'

export default function StudentGamifiedExam({ student, onLogout }) {
  const hasAssignedLevel = Boolean(student.assignedLevel)
  const [selectedSelfLevel, setSelectedSelfLevel] = useState(student.selfReportedLevel || '')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(Boolean(student.selfReportedLevel))

  const handleSelectLevel = async (lvl) => {
    setSelectedSelfLevel(lvl)
    setIsSaving(true)
    try {
      await saveStudentSelfLevel(student.email, lvl)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Error guardando auto-nivel:', err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between font-sans">
      
      {/* Top Navbar Institucional */}
      <header className="h-16 px-6 bg-white border-b border-gray-200 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#2528b7] text-white flex items-center justify-center font-extrabold text-xs shadow-md shadow-indigo-600/20">
            N+
          </div>
          <div>
            <span className="font-heading font-extrabold text-sm text-gray-900 block leading-tight">
              Portal del Estudiante
            </span>
            <span className="text-[10px] text-gray-500 font-semibold uppercase">
              Colegio Salesiano San José
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <span className="text-xs font-bold text-gray-800 block leading-tight">{student.name}</span>
            <span className="text-[10px] text-gray-500 font-mono">Carnet: {student.carnet || 'N/A'}</span>
          </div>
          <button
            onClick={onLogout}
            className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-all flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Contenido Central */}
      <main className="max-w-2xl w-full mx-auto p-6 md:p-10 my-auto text-center">
        {hasAssignedLevel ? (
          /* Caso 1: El docente ya completó la entrevista y asignó el nivel */
          <div className="bg-white rounded-[32px] p-8 md:p-12 border border-gray-200 shadow-xl space-y-6 animate-fadeIn">
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
          /* Caso 2: El alumno está en espera de ser llamado por el profesor */
          <div className="bg-white rounded-[32px] p-8 md:p-12 border border-gray-200 shadow-xl space-y-6 animate-fadeIn">
            <div className="w-20 h-20 rounded-full bg-indigo-50 text-[#2528b7] mx-auto flex items-center justify-center relative shadow-inner">
              <span className="material-symbols-outlined text-4xl animate-pulse">hearing</span>
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white absolute top-1 right-1"></span>
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 text-xs font-bold tracking-wider uppercase border border-indigo-100">
                Entrevista Oral en Curso
              </span>
              <h2 className="font-heading font-extrabold text-2xl md:text-3xl text-gray-900">
                Evaluación con tu Docente
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                Hola <strong className="text-gray-900">{student.name}</strong>. Esta prueba de ubicación es <strong>oral y auditiva</strong>. Tu profesor te hará preguntas verbalmente y registrará tus respuestas en la rúbrica oficial.
              </p>
            </div>

            {/* Campo / Selector Interactivo: Autopercepción de Nivel de Inglés */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3 max-w-md mx-auto">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#2528b7]">psychology</span>
                  ¿Cuál consideras que es tu nivel de inglés actual?
                </label>
                {saved && (
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5 animate-fadeIn">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    Guardado
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 leading-tight">
                Selecciona la opción con la que más te identifiques. Tu profesor verá esta referencia antes de tu entrevista.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {[
                  { id: 'A1', label: 'A1 - Principiante', desc: 'Frases muy básicas' },
                  { id: 'A2', label: 'A2 - Básico', desc: 'Conversaciones simples' },
                  { id: 'B1', label: 'B1 - Intermedio', desc: 'Me desenvuelvo bien' },
                  { id: 'B2', label: 'B2 - Intermedio Alto', desc: 'Fluidez y vocabulario' },
                  { id: 'C1', label: 'C1 - Avanzado', desc: 'Casi bilingüe' },
                  { id: 'Desconocido', label: 'No estoy seguro', desc: 'Prefiero evaluarme' },
                ].map((item) => {
                  const isSelected = selectedSelfLevel === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSelectLevel(item.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#2528b7] bg-indigo-50/80 ring-2 ring-[#2528b7]/30 shadow-xs'
                          : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className={`text-xs font-extrabold ${isSelected ? 'text-[#2528b7]' : 'text-gray-800'}`}>
                        {item.label}
                      </div>
                      <div className="text-[10px] text-gray-500 line-clamp-1">
                        {item.desc}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-left text-xs text-amber-900 space-y-1.5 max-w-md mx-auto">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <span className="material-symbols-outlined text-[16px]">info</span>
                Instrucciones para la entrevista:
              </div>
              <ul className="list-disc list-inside text-amber-700 space-y-1 pl-1">
                <li>Presta atención a cada pregunta verbal que formule tu docente.</li>
                <li>Responde en inglés con claridad, usando oraciones completas.</li>
                <li>Al finalizar la entrevista, tu nivel oficial validado por el docente aparecerá aquí en pantalla.</li>
              </ul>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Esperando que el docente concluya la calificación oficial...</span>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-gray-400 border-t border-gray-100">
        © 2026 Colegio Salesiano San José · Sistema de Diagnóstico y Nivelación de Inglés
      </footer>
    </div>
  )
}
