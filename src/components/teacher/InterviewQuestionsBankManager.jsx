import React, { useState, useEffect } from 'react'
import {
  getInterviewQuestions,
  saveInterviewQuestions,
  resetInterviewQuestionsToDefault
} from '../../lib/dataService'
import { generateOralInterviewQuestionWithAI } from '../../lib/aiQuestionGenerator'

const CEFR_LEVELS = [
  { id: 'all', label: 'Todos los Niveles' },
  { id: 'A1', label: 'A1 - Principiante', color: 'border-emerald-500 text-emerald-800 bg-emerald-50' },
  { id: 'A2', label: 'A2 - Básico', color: 'border-cyan-500 text-cyan-800 bg-cyan-50' },
  { id: 'B1', label: 'B1 - Pre-Intermedio', color: 'border-blue-500 text-blue-800 bg-blue-50' },
  { id: 'B2', label: 'B2 - Intermedio Alto', color: 'border-purple-500 text-purple-800 bg-purple-50' },
  { id: 'C1', label: 'C1 - Avanzado / Eficaz', color: 'border-pink-500 text-pink-800 bg-pink-50' }
]

export default function InterviewQuestionsBankManager({ onQuestionsUpdated }) {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeLevelFilter, setActiveLevelFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Estado para el Modal de Edición / Creación
  const [editingModalOpen, setEditingModalOpen] = useState(false)
  const [currentEditQ, setCurrentEditQ] = useState(null)

  // Estado para Generador de IA
  const [generatingAI, setGeneratingAI] = useState(false)
  const [aiLevel, setAiLevel] = useState('A1')
  const [aiCustomTopic, setAiCustomTopic] = useState('')

  useEffect(() => {
    loadQuestions()
  }, [])

  const loadQuestions = async () => {
    setLoading(true)
    try {
      const bank = await getInterviewQuestions()
      setQuestions(bank || [])
    } catch (e) {
      console.error('Error cargando banco de preguntas:', e)
    } finally {
      setLoading(false)
    }
  }

  // Filtrado de preguntas
  const filteredQuestions = questions.filter(q => {
    if (activeLevelFilter !== 'all' && (q.level || '').toUpperCase() !== activeLevelFilter.toUpperCase()) {
      return false
    }
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      const matchQ = (q.question || '').toLowerCase().includes(s)
      const matchTopic = (q.topic || '').toLowerCase().includes(s)
      const matchVisual = (q.visualPrompt || '').toLowerCase().includes(s)
      if (!matchQ && !matchTopic && !matchVisual) return false
    }
    return true
  })

  // Conteo por nivel
  const countByLevel = questions.reduce((acc, q) => {
    const lvl = (q.level || 'Otros').toUpperCase()
    acc[lvl] = (acc[lvl] || 0) + 1
    return acc
  }, {})

  // Abrir modal para crear nueva
  const handleAddNew = (level = 'A1') => {
    setCurrentEditQ({
      id: `q_custom_${Date.now()}`,
      level: level === 'all' ? 'A1' : level,
      topic: 'General Conversation',
      question: '',
      visualPrompt: '',
      imageUrl: '',
      isCustom: true
    })
    setEditingModalOpen(true)
  }

  // Abrir modal para editar
  const handleEdit = (q) => {
    setCurrentEditQ({ ...q })
    setEditingModalOpen(true)
  }

  // Guardar cambio en una pregunta
  const handleSaveQuestion = async (e) => {
    e.preventDefault()
    if (!currentEditQ.question.trim()) {
      alert('Por favor redacta la pregunta en inglés.')
      return
    }

    setSaving(true)
    try {
      let updatedList = []
      const exists = questions.some(q => q.id === currentEditQ.id)
      if (exists) {
        updatedList = questions.map(q => q.id === currentEditQ.id ? { ...currentEditQ, isCustom: true } : q)
      } else {
        updatedList = [currentEditQ, ...questions]
      }

      await saveInterviewQuestions(updatedList)
      setQuestions(updatedList)
      onQuestionsUpdated?.(updatedList)
      setEditingModalOpen(false)
      setCurrentEditQ(null)
    } catch (err) {
      console.error('Error guardando pregunta:', err)
      alert('Error guardando en Firebase: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Eliminar pregunta
  const handleDelete = async (qId) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta pregunta del banco oficial?')) return

    setSaving(true)
    try {
      const updatedList = questions.filter(q => q.id !== qId)
      await saveInterviewQuestions(updatedList)
      setQuestions(updatedList)
      onQuestionsUpdated?.(updatedList)
    } catch (err) {
      console.error('Error eliminando pregunta:', err)
      alert('Error al eliminar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Generar con IA
  const handleGenerateWithAI = async () => {
    setGeneratingAI(true)
    try {
      const generated = generateOralInterviewQuestionWithAI(aiLevel, aiCustomTopic)
      const updatedList = [generated, ...questions]
      await saveInterviewQuestions(updatedList)
      setQuestions(updatedList)
      onQuestionsUpdated?.(updatedList)
      alert(`✨ Pregunta para nivel ${aiLevel} generada y añadida exitosamente al banco oficial:\n\n"${generated.question}"`)
    } catch (err) {
      console.error('Error generando con IA:', err)
      alert('Error al generar pregunta: ' + err.message)
    } finally {
      setGeneratingAI(false)
    }
  }

  // Restaurar preguntas iniciales
  const handleResetToDefault = async () => {
    if (!confirm('⚠️ ¿Estás seguro de restaurar el banco oficial original de preguntas de Get Involved? Los cambios personalizados se sobreescribirán.')) return

    setSaving(true)
    try {
      const reset = await resetInterviewQuestionsToDefault()
      setQuestions(reset)
      onQuestionsUpdated?.(reset)
      alert('✅ Banco de preguntas restablecido con éxito.')
    } catch (err) {
      console.error('Error restableciendo banco:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* CABECERA Y RESUMEN */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2528b7] animate-pulse"></span>
            <span className="text-[11px] font-extrabold tracking-wider uppercase text-[#2528b7]">
              Banco Curricular Oficial de Preguntas Orales
            </span>
          </div>
          <h2 className="font-heading font-black text-2xl text-gray-900 mt-1">
            Gestor de Reactivos de Entrevista (A1 - C1)
          </h2>
          <p className="text-xs text-gray-500 max-w-2xl mt-1">
            Revisa, modifica enunciados, asocia apoyos visuales o genera nuevas preguntas orales asistidas por IA. Todos los docentes sincronizan este mismo banco desde Firebase Firestore en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Botón Nueva Pregunta Manual */}
          <button
            type="button"
            onClick={() => handleAddNew(activeLevelFilter)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2528b7] to-[#4f46e5] text-white font-bold text-xs shadow-md shadow-indigo-600/20 hover:brightness-110 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Nueva Pregunta</span>
          </button>

          {/* Botón Restaurar */}
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300/80 flex items-center gap-1.5 cursor-pointer transition-all"
            title="Restaurar banco original del libro Get Involved"
          >
            <span className="material-symbols-outlined text-[17px] text-gray-500">restart_alt</span>
            <span>Restaurar Iniciales</span>
          </button>
        </div>
      </div>

      {/* SECCIÓN GENERADOR IA Y CONTEO POR NIVELES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Generador Rápido con IA */}
        <div className="bg-gradient-to-br from-indigo-950 via-[#1e1b4b] to-[#161a33] text-white rounded-3xl p-5 border border-indigo-900 shadow-md flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-300 text-[20px]">auto_awesome</span>
              <span className="text-xs font-black uppercase text-amber-300 tracking-wider">
                Generador de Preguntas con IA
              </span>
            </div>
            <p className="text-[11px] text-indigo-200 leading-relaxed">
              Crea preguntas calibradas pedagógicamente para el nivel deseado, incluyendo guías de apoyo visual.
            </p>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-1">Nivel MCER:</label>
                <select
                  value={aiLevel}
                  onChange={(e) => setAiLevel(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-300 font-bold"
                >
                  <option value="A1" className="text-gray-900">Nivel A1</option>
                  <option value="A2" className="text-gray-900">Nivel A2</option>
                  <option value="B1" className="text-gray-900">Nivel B1</option>
                  <option value="B2" className="text-gray-900">Nivel B2</option>
                  <option value="C1" className="text-gray-900">Nivel C1</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-1">Tema Opcional:</label>
                <input
                  type="text"
                  value={aiCustomTopic}
                  onChange={(e) => setAiCustomTopic(e.target.value)}
                  placeholder="Ej: school, travel..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-indigo-300/60 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={generatingAI}
              onClick={handleGenerateWithAI}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">psychology</span>
              <span>{generatingAI ? 'Generando con IA...' : `Generar Pregunta para ${aiLevel}`}</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de distribución de preguntas por Nivel (A1 a C1) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 border border-gray-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Distribución en Banco ({questions.length} preguntas activas)
              </span>
              <span className="text-[11px] font-bold text-[#2528b7] bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/60">
                Escala A1 - C1
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-3">
              {['A1', 'A2', 'B1', 'B2', 'C1'].map((lvl) => {
                const count = countByLevel[lvl] || 0
                const colors = {
                  A1: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                  A2: 'bg-cyan-50 text-cyan-800 border-cyan-200',
                  B1: 'bg-blue-50 text-blue-800 border-blue-200',
                  B2: 'bg-purple-50 text-purple-800 border-purple-200',
                  C1: 'bg-pink-50 text-pink-800 border-pink-200'
                }

                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setActiveLevelFilter(lvl)}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${colors[lvl]} ${
                      activeLevelFilter === lvl ? 'ring-2 ring-indigo-500 shadow-sm scale-102 font-black' : 'hover:opacity-90'
                    }`}
                  >
                    <span className="text-[11px] font-black uppercase block tracking-wider">{lvl}</span>
                    <span className="font-heading font-black text-xl block mt-0.5">{count}</span>
                    <span className="text-[10px] opacity-80 block">reactivos</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 text-[11px] text-gray-400 border-t border-gray-100 mt-3">
            <span>En cada entrevista el sistema extrae automáticamente <strong>3 preguntas aleatorias</strong> de este banco.</span>
            <button
              type="button"
              onClick={() => setActiveLevelFilter('all')}
              className="text-[#2528b7] font-bold hover:underline cursor-pointer"
            >
              Ver Todas ({questions.length})
            </button>
          </div>
        </div>
      </div>

      {/* FILTROS Y LISTADO DE PREGUNTAS */}
      <div className="bg-white rounded-3xl p-5 border border-gray-200/90 shadow-sm space-y-4">
        {/* Barra de Filtros */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">Filtrar Nivel:</span>
            {CEFR_LEVELS.map((item) => {
              const count = item.id === 'all' ? questions.length : (countByLevel[item.id] || 0)
              const isSelected = activeLevelFilter === item.id

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveLevelFilter(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#2528b7] text-white shadow-xs'
                      : 'bg-slate-50 text-gray-600 hover:bg-slate-100 border border-gray-200/80'
                  }`}
                >
                  <span>{item.id === 'all' ? 'Todos' : item.id}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-200/70 text-gray-700'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Buscador */}
          <div className="relative w-full md:w-72">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por pregunta o tema..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#2528b7]/30 bg-slate-50/50"
            />
            <span className="material-symbols-outlined text-[18px] text-gray-400 absolute left-3 top-1/2 -translate-y-1/2">
              search
            </span>
          </div>
        </div>

        {/* LISTADO DE TARJETAS DE PREGUNTAS */}
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-xs italic">
            Cargando banco de preguntas...
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-xs italic bg-slate-50 rounded-2xl border border-dashed border-gray-200">
            No se encontraron preguntas que coincidan con los filtros seleccionados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {filteredQuestions.map((q, idx) => {
              const badgeColors = {
                A1: 'bg-emerald-50 text-emerald-800 border-emerald-300',
                A2: 'bg-cyan-50 text-cyan-800 border-cyan-300',
                B1: 'bg-blue-50 text-blue-800 border-blue-300',
                B2: 'bg-purple-50 text-purple-800 border-purple-300',
                C1: 'bg-pink-50 text-pink-800 border-pink-300'
              }
              const colorClass = badgeColors[q.level] || 'bg-gray-50 text-gray-800 border-gray-300'

              return (
                <div
                  key={q.id || idx}
                  className="bg-white rounded-2xl p-4.5 border border-gray-200/90 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2.5 py-0.5 rounded-full font-black text-[11px] border ${colorClass}`}>
                          Nivel {q.level}
                        </span>
                        <span className="text-[11px] font-bold text-gray-500 italic truncate max-w-[180px]">
                          {q.topic || 'General'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {q.isCustom && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[9px] font-bold border border-purple-200">
                            Editada
                          </span>
                        )}
                        {q.generatedByAI && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[9px] font-bold border border-amber-200">
                            IA ✨
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="font-heading font-bold text-sm text-gray-900 leading-snug">
                      "{q.question}"
                    </p>

                    {/* Apoyo visual si está configurado */}
                    {q.visualPrompt && (
                      <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-amber-700 shrink-0 mt-0.5">image</span>
                        <div>
                          <strong className="font-bold text-amber-800">Apoyo Visual / Consigna: </strong>
                          <span>{q.visualPrompt}</span>
                        </div>
                      </div>
                    )}

                    {q.imageUrl && (
                      <div className="pt-1">
                        <img
                          src={q.imageUrl}
                          alt="Apoyo visual"
                          className="h-28 w-full object-cover rounded-xl border border-gray-200 bg-slate-50"
                        />
                      </div>
                    )}
                  </div>

                  {/* Acciones de la pregunta */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                    <span className="text-[10px] text-gray-400 font-mono">
                      ID: {q.id ? String(q.id).slice(-8) : `#${idx + 1}`}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleEdit(q)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[#2528b7] font-bold text-xs border border-indigo-200 flex items-center gap-1 cursor-pointer transition-all"
                        title="Editar enunciado, nivel o apoyo visual"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(q.id)}
                        className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Eliminar del banco"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ================= MODAL DE EDICIÓN / CREACIÓN DE PREGUNTA ================= */}
      {editingModalOpen && currentEditQ && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-gray-200 animate-scaleUp">
            <div className="bg-gradient-to-r from-[#161a33] to-[#2528b7] p-5 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300 block">
                  Banco de Entrevista Oral CSSJ
                </span>
                <h3 className="font-heading font-black text-xl text-white mt-0.5">
                  {questions.some(q => q.id === currentEditQ.id) ? 'Editar Pregunta Oral' : 'Nueva Pregunta Oral'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nivel Oficial MCER:
                  </label>
                  <select
                    value={currentEditQ.level}
                    onChange={(e) => setCurrentEditQ({ ...currentEditQ, level: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="A1">A1 - Principiante</option>
                    <option value="A2">A2 - Básico</option>
                    <option value="B1">B1 - Pre-Intermedio</option>
                    <option value="B2">B2 - Intermedio Alto</option>
                    <option value="C1">C1 - Avanzado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Tema Curricular:
                  </label>
                  <input
                    type="text"
                    value={currentEditQ.topic || ''}
                    onChange={(e) => setCurrentEditQ({ ...currentEditQ, topic: e.target.value })}
                    placeholder="Ej: Simple Present, Daily Routine..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Enunciado de la Pregunta en Inglés (*):
                </label>
                <textarea
                  rows="3"
                  value={currentEditQ.question}
                  onChange={(e) => setCurrentEditQ({ ...currentEditQ, question: e.target.value })}
                  placeholder="Ej: What do you usually do on Saturday mornings?"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  required
                ></textarea>
                <span className="text-[10px] text-gray-400 block mt-0.5">
                  Esta es la pregunta que el docente le formulará verbalmente al estudiante durante la llamada.
                </span>
              </div>

              {/* Apoyo Visual / Consigna Didáctica */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-gray-200/90 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-indigo-700">image</span>
                  <label className="text-xs font-bold text-gray-800">
                    Apoyo Visual o Consigna Didáctica (Opcional):
                  </label>
                </div>
                <textarea
                  rows="2"
                  value={currentEditQ.visualPrompt || ''}
                  onChange={(e) => setCurrentEditQ({ ...currentEditQ, visualPrompt: e.target.value })}
                  placeholder="Ej: Muestra la imagen de una ciudad / Pide al alumno describir la mochila escolar..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                ></textarea>
                <span className="text-[10px] text-gray-500 block">
                  Si la pregunta hace referencia a algo visual (un póster, mapa, etc.), detalla aquí la instrucción para el docente.
                </span>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    URL de Imagen o Ilustración (Opcional):
                  </label>
                  <input
                    type="text"
                    value={currentEditQ.imageUrl || ''}
                    onChange={(e) => setCurrentEditQ({ ...currentEditQ, imageUrl: e.target.value })}
                    placeholder="https://ejemplo.com/imagen.jpg o /assets/..."
                    className="w-full px-3 py-1.5 rounded-xl border border-gray-300 text-xs text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-mono"
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2528b7] to-[#4f46e5] text-white font-bold text-xs shadow-md shadow-indigo-600/20 hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>{saving ? 'Guardando en Firebase...' : 'Guardar Pregunta'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
