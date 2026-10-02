import React, { useState, useEffect } from 'react'
import Sidebar from '../shared/Sidebar'
import {
  getAllUsers,
  updateUserStatus,
  registerOrUpdateUser,
  deleteUser,
  batchSyncStudents,
  getAcademicStructure,
  saveAcademicStructure,
  getOralEvaluations
} from '../../lib/dataService'
import bundledStudents from '../../data/studentsFromSchool.json'

export default function AdminDashboard({ user, onLogout, onSwitchToStudentView }) {
  const [currentSection, setCurrentSection] = useState('overview')
  const [collapsed, setCollapsed] = useState(false)
  const [evalPeriodOpen, setEvalPeriodOpen] = useState(true)

  const [allUsersList, setAllUsersList] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)

  // Botones Ovalados de Grado (6 a 12) y Sección (A, B, C)
  const [gradePill, setGradePill] = useState('all') // 'all' | '6' | '7' | '8' | '9' | '10' | '11' | '12'
  const [sectionPill, setSectionPill] = useState('all') // 'all' | 'A' | 'B' | 'C'
  const [statusPill, setStatusPill] = useState('all') // 'all' | 'active' | 'pending'

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 12

  // Modal CRUD para Crear / Editar Alumno o Docente
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    carnet: '',
    grade: '7° Grado',
    section: 'A',
    role: 'student',
    status: 'active'
  })

  // Estructura Dinámica de Grados y Secciones (Firestore)
  const [academic, setAcademic] = useState({
    grades: [
      { id: '6', label: '6° Grado' },
      { id: '7', label: '7° Grado' },
      { id: '8', label: '8° Grado' },
      { id: '9', label: '9° Grado' },
      { id: '10', label: '1° Bachillerato (10°)' },
      { id: '11', label: '2° Bachillerato (11°)' },
      { id: '12', label: '3° Bachillerato Técnico (12°)' }
    ],
    sections: ['A', 'B', 'C', 'D'],
    levels: [
      { id: 'A1', name: 'A1 - Principiante / Acceso', color: '#10b981' },
      { id: 'A2', name: 'A2 - Básico / Plataforma', color: '#06b6d4' },
      { id: 'B1', name: 'B1 - Pre-Intermedio / Umbral', color: '#3b82f6' },
      { id: 'B2', name: 'B2 - Intermedio Alto / Avanzado', color: '#8b5cf6' },
      { id: 'C1', name: 'C1 - Dominio Operativo Eficaz', color: '#ec4899' }
    ]
  })
  const [evaluations, setEvaluations] = useState([])

  // Nuevos campos para crear Grado / Sección dinámica
  const [newGradeId, setNewGradeId] = useState('')
  const [newGradeLabel, setNewGradeLabel] = useState('')
  const [newSectionName, setNewSectionName] = useState('')
  const [isSavingAcademic, setIsSavingAcademic] = useState(false)

  // Cargar usuarios, evaluaciones y estructura académica desde Firestore
  const loadData = async () => {
    setLoadingUsers(true)
    try {
      const [usersData, evalsData, struct] = await Promise.all([
        getAllUsers(),
        getOralEvaluations(),
        getAcademicStructure()
      ])
      setAllUsersList(usersData || [])
      setEvaluations(evalsData || [])
      if (struct && struct.grades && struct.grades.length > 0) {
        setAcademic(struct)
      }
    } catch (e) {
      console.error('Error cargando datos de admin:', e)
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Guardar nueva estructura académica en Firestore
  const handleAddGrade = async (e) => {
    e.preventDefault()
    if (!newGradeId.trim() || !newGradeLabel.trim()) return
    const updated = {
      ...academic,
      grades: [...academic.grades, { id: newGradeId.trim(), label: newGradeLabel.trim() }]
    }
    setIsSavingAcademic(true)
    await saveAcademicStructure(updated)
    setAcademic(updated)
    setNewGradeId('')
    setNewGradeLabel('')
    setIsSavingAcademic(false)
  }

  const handleRemoveGrade = async (gradeId) => {
    if (!confirm(`¿Eliminar el grado "${gradeId}" de la configuración?`)) return
    const updated = {
      ...academic,
      grades: academic.grades.filter(g => g.id !== gradeId)
    }
    setIsSavingAcademic(true)
    await saveAcademicStructure(updated)
    setAcademic(updated)
    setIsSavingAcademic(false)
  }

  const handleAddSection = async (e) => {
    e.preventDefault()
    const sec = newSectionName.trim().toUpperCase()
    if (!sec || academic.sections.includes(sec)) return
    const updated = {
      ...academic,
      sections: [...academic.sections, sec].sort()
    }
    setIsSavingAcademic(true)
    await saveAcademicStructure(updated)
    setAcademic(updated)
    setNewSectionName('')
    setIsSavingAcademic(false)
  }

  const handleRemoveSection = async (sec) => {
    if (!confirm(`¿Eliminar la sección "${sec}" de la configuración?`)) return
    const updated = {
      ...academic,
      sections: academic.sections.filter(s => s !== sec)
    }
    setIsSavingAcademic(true)
    await saveAcademicStructure(updated)
    setAcademic(updated)
    setIsSavingAcademic(false)
  }

  // Modificar estado de un usuario (Switch Rápido)
  const handleToggleStatus = async (targetEmail, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'pending' : 'active'
    await updateUserStatus(targetEmail, newStatus, user.email)
    await loadUsers()
  }

  // Abrir modal para Crear
  const handleOpenCreateModal = () => {
    setEditingUser(null)
    setFormData({
      name: '',
      email: '',
      carnet: '',
      grade: '7° Grado',
      section: 'A',
      role: 'student',
      status: 'active'
    })
    setIsModalOpen(true)
  }

  // Abrir modal para Editar
  const handleOpenEditModal = (u) => {
    setEditingUser(u)
    setFormData({
      name: u.name || '',
      email: u.email || '',
      carnet: u.carnet || '',
      grade: u.grade || '7° Grado',
      section: u.section || 'A',
      role: u.role || 'student',
      status: u.status || 'active'
    })
    setIsModalOpen(true)
  }

  // Guardar (Crear o Actualizar)
  const handleSaveUser = async (e) => {
    e.preventDefault()
    if (!formData.email.trim() || !formData.name.trim()) {
      alert('Nombre y correo son obligatorios.')
      return
    }

    await registerOrUpdateUser({
      ...formData,
      validatedBy: user.email
    })
    setIsModalOpen(false)
    await loadUsers()
  }

  // Eliminar Usuario
  const handleDeleteUser = async (targetEmail, targetName) => {
    if (confirm(`¿Estás seguro de eliminar a "${targetName}" (${targetEmail}) de la plataforma?`)) {
      await deleteUser(targetEmail)
      await loadUsers()
    }
  }

  // Carga manual desde archivo CSV
  const handleCSVUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const text = evt.target.result
        const lines = text.split(/\r?\n/).filter(Boolean)
        const parsed = []

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
          if (cols.length >= 2) {
            parsed.push({
              carnet: cols[0] || `EST-${Date.now()}-${i}`,
              name: cols[1] || 'Sin Nombre',
              email: cols[2] || `${cols[0]}@salesianosanjose.edu.sv`,
              grade: cols[3] || 'Sin Grado',
              section: cols[4] || 'A',
              role: 'student',
              status: 'pending'
            })
          }
        }

        if (parsed.length > 0) {
          setIsSyncing(true)
          await batchSyncStudents(parsed, user.email)
          await loadUsers()
          setIsSyncing(false)
          alert(`✅ Se importaron y guardaron ${parsed.length} alumnos en Firebase con éxito.`)
        } else {
          alert('No se detectaron registros válidos en el archivo CSV.')
        }
      } catch (err) {
        setIsSyncing(false)
        console.error('Error importando CSV:', err)
        alert('Error al leer el archivo CSV: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  // Sincronización oficial CSSJ hacia Firestore
  const handleSyncFromCSSJ = async () => {
    if (!confirm(`¿Deseas sincronizar los ${bundledStudents.length} alumnos oficiales de 6° a 12° grado en Firestore?`)) return
    setIsSyncing(true)
    try {
      await batchSyncStudents(bundledStudents, user.email)
      await loadUsers()
      alert(`✅ Sincronización Exitosa: ${bundledStudents.length} alumnos actualizados en Firestore de englishlevel.`)
    } catch (e) {
      console.error(e)
      alert('Error en la sincronización: ' + e.message)
    } finally {
      setIsSyncing(false)
    }
  }

  const studentsList = allUsersList.filter(u => u.role === 'student')
  const teachersList = allUsersList.filter(u => u.role === 'teacher')
  const pendingCount = allUsersList.filter(u => u.status === 'pending').length

  // Lista de Botones Ovalados de Grado Dinámicos
  const gradeButtonsList = [
    { id: 'all', label: 'Todos los Grados' },
    ...(academic.grades && academic.grades.length > 0
      ? academic.grades.map(g => ({ id: g.id, label: g.label.length > 12 ? g.id + '°' : g.label }))
      : [
          { id: '6', label: '6°' },
          { id: '7', label: '7°' },
          { id: '8', label: '8°' },
          { id: '9', label: '9°' },
          { id: '10', label: '10°' },
          { id: '11', label: '11°' },
          { id: '12', label: '12°' }
        ])
  ]

  // Secciones Dinámicas
  const sectionButtonsList = [
    { id: 'all', label: 'Todas las Secciones' },
    ...(academic.sections && academic.sections.length > 0
      ? academic.sections.map(s => ({ id: s, label: `Secc. ${s}` }))
      : [
          { id: 'A', label: 'Secc. A' },
          { id: 'B', label: 'Secc. B' },
          { id: 'C', label: 'Secc. C' },
          { id: 'D', label: 'Secc. D' }
        ])
  ]

  // Filtrado de alumnos por Grado Ovalado, Sección, Estado y Búsqueda
  const filteredStudents = studentsList.filter(s => {
    // Coincidencia de Grado
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

    // Coincidencia de Sección
    const matchSection = sectionPill === 'all' || s.section === sectionPill

    // Coincidencia de Estado
    const matchStatus = statusPill === 'all' || s.status === statusPill

    // Búsqueda
    const matchSearch = !searchTerm ||
      (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.carnet && s.carnet.includes(searchTerm)) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchGrade && matchSection && matchStatus && matchSearch
  })

  // Paginación computada
  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const menuItems = [
    { key: 'overview', label: 'Supervisión General', icon: 'dashboard' },
    { key: 'analytics', label: 'Dashboard Analítico', icon: 'analytics', badge: `${studentsList.filter(s => Boolean(s.assignedLevel)).length} eval.` },
    { key: 'students_manager', label: 'Gestión de Alumnos', icon: 'groups', badge: `${studentsList.length}` },
    { key: 'academic_structure', label: 'Grados y Secciones', icon: 'category', badge: `${academic.grades.length}G / ${academic.sections.length}S` },
    { key: 'teachers', label: 'Gestión de Docentes', icon: 'school', badge: `${teachersList.length}` },
    { key: 'thresholds', label: 'Umbrales MCER', icon: 'tune' },
    { key: 'reports', label: 'Reportes y Cierre', icon: 'assessment' },
  ]

  return (
    <div className="flex h-screen bg-surface font-sans overflow-hidden">
      <Sidebar
        title="Admin Inglés"
        subtitle="Colegio Salesiano San José"
        icon="admin_panel_settings"
        menuItems={menuItems}
        activeKey={currentSection}
        onSelect={setCurrentSection}
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

        <main className="p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* SECCIÓN 1: SUPERVISIÓN GENERAL */}
          {currentSection === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-semibold text-on-surface-variant uppercase">Alumnos en Firebase</span>
                      <h3 className="font-heading font-extrabold text-2xl text-on-surface mt-1">{studentsList.length}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[22px]">groups</span>
                    </div>
                  </div>
                  <span className="text-xs text-secondary font-medium mt-3 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    {studentsList.filter(s => s.status === 'active').length} Habilitados
                  </span>
                </div>

                <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-semibold text-on-surface-variant uppercase">Pendientes</span>
                      <h3 className="font-heading font-extrabold text-2xl text-amber-600 mt-1">{pendingCount}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                      <span className="material-symbols-outlined text-[22px]">lock_clock</span>
                    </div>
                  </div>
                  <span className="text-xs text-on-surface-variant font-medium mt-3">Por validar con Switch</span>
                </div>

                <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-semibold text-on-surface-variant uppercase">Equipo Docente</span>
                      <h3 className="font-heading font-extrabold text-2xl text-on-surface mt-1">{teachersList.length}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[22px]">school</span>
                    </div>
                  </div>
                  <span className="text-xs text-on-surface-variant font-medium mt-3">Docentes de Inglés</span>
                </div>

                <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-semibold text-on-surface-variant uppercase">Administrador Activo</span>
                      <h3 className="font-heading font-bold text-sm text-secondary mt-1 truncate">{user.name}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-secondary-container/40 flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-[22px]">shield_person</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-on-surface-variant font-mono truncate block mt-3">{user.email}</span>
                </div>
              </div>

              {/* Acceso Rápido a Gestión de Alumnos */}
              <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-[#10132b] text-white rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Panel de Administración
                  </span>
                  <h3 className="text-xl font-bold mt-2">Nómina Escolar con Botones de Presión Ovalados</h3>
                  <p className="text-xs text-indigo-200 mt-1 max-w-xl">
                    Filtra con rapidez por grados (6° a 12°), secciones y controla el acceso con interruptores directos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentSection('students_manager')}
                  className="px-5 py-2.5 rounded-xl bg-white text-indigo-950 font-bold text-xs hover:bg-slate-100 shadow-md transition-all whitespace-nowrap cursor-pointer"
                >
                  Abrir Gestión de Alumnos →
                </button>
              </div>
            </div>
          )}

          {/* ================= SECCIÓN 2: GESTIÓN DE ALUMNOS (BOTONES OVALADOS + CRUD + SWITCH) ================= */}
          {currentSection === 'students_manager' && (
            <div className="space-y-5">
              
              {/* Barra Superior con Botones de Acción */}
              <div className="bg-surface-container-lowest rounded-3xl p-5 border border-outline-variant/30 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h2 className="font-heading font-extrabold text-xl text-gray-900">
                      Gestión de Alumnos y Accesos
                    </h2>
                    <p className="text-xs text-gray-500">
                      Datos guardados en tu Firebase de englishlevel con control en vivo.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenCreateModal}
                      className="px-3.5 py-2 rounded-full bg-[#2528b7] text-white text-xs font-bold hover:brightness-110 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">person_add</span>
                      <span>+ Nuevo Alumno</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={handleSyncFromCSSJ}
                      className="px-3.5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Sincronizar nómina oficial de Firestore"
                    >
                      <span className="material-symbols-outlined text-[16px]">sync</span>
                      <span>{isSyncing ? 'Sincronizando...' : 'Recargar 467 CSSJ'}</span>
                    </button>

                    <label className="px-3.5 py-2 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">upload_file</span>
                      <span>Importar CSV</span>
                      <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* FILA 1: BOTONES OVALADOS DE PRESIÓN POR GRADO DINÁMICOS */}
                <div className="pt-3 border-t border-gray-100 space-y-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mr-1">
                      Grado:
                    </span>
                    {gradeButtonsList.map(g => {
                      const isSelected = gradePill === g.id
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            setGradePill(g.id)
                            setCurrentPage(1)
                          }}
                          className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer shadow-xs active:scale-95 ${
                            isSelected
                              ? 'bg-[#2528b7] text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-200'
                              : 'bg-slate-100 text-gray-700 hover:bg-slate-200 hover:text-gray-900 border border-gray-200/60'
                          }`}
                        >
                          {g.label}
                        </button>
                      )
                    })}
                  </div>

                  {/* FILA 2: BOTONES OVALADOS DE SECCIÓN DINÁMICOS Y ESTADO */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mr-1">
                        Sección:
                      </span>
                      {sectionButtonsList.map(sec => {
                        const isSelected = sectionPill === sec.id
                        return (
                          <button
                            key={sec.id}
                            type="button"
                            onClick={() => {
                              setSectionPill(sec.id)
                              setCurrentPage(1)
                            }}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                              isSelected
                                ? 'bg-indigo-900 text-white shadow-sm ring-2 ring-indigo-200'
                                : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
                            }`}
                          >
                            {sec.label}
                          </button>
                        )
                      })}

                      <span className="text-gray-300 mx-1 hidden sm:inline">|</span>

                      {/* Estado */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setStatusPill('all')
                            setCurrentPage(1)
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            statusPill === 'all'
                              ? 'bg-gray-900 text-white'
                              : 'text-gray-500 hover:text-gray-900 bg-gray-100'
                          }`}
                        >
                          Todos
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStatusPill('active')
                            setCurrentPage(1)
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            statusPill === 'active'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-gray-500 hover:text-emerald-700 bg-gray-100'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>Habilitados</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStatusPill('pending')
                            setCurrentPage(1)
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            statusPill === 'pending'
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'text-gray-500 hover:text-amber-700 bg-gray-100'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          <span>Pendientes</span>
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
                        placeholder="Carnet o nombre..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-full border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#2528b7]/30"
                      />
                      <span className="material-symbols-outlined text-[16px] text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2">
                        search
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* TABLA PRINCIPAL CON INTERRUPTORES SWITCH Y ACCIONES CRUD */}
              <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                  <span className="text-xs font-bold text-gray-800">
                    Mostrando {paginatedStudents.length} de {filteredStudents.length} alumnos
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Interruptores de estado en tiempo real sincronizados con Firestore.
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs md:text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-[11px] font-bold uppercase text-gray-500 bg-white">
                        <th className="py-3 px-4">Carnet</th>
                        <th className="py-3 px-4">Estudiante</th>
                        <th className="py-3 px-4">Grado / Secc</th>
                        <th className="py-3 px-4">Nivel Oficial</th>
                        <th className="py-3 px-4 text-center">Estado de Acceso</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedStudents.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-12 text-center text-gray-400 text-xs italic">
                            No se encontraron alumnos con los criterios seleccionados.
                          </td>
                        </tr>
                      ) : (
                        paginatedStudents.map((s) => {
                          const isActive = s.status === 'active'
                          return (
                            <tr key={s.carnet || s.email} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-4 font-mono font-bold text-indigo-900">{s.carnet || 'N/A'}</td>
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
                                <span className="px-3 py-1 rounded-full bg-slate-100 font-bold text-xs text-gray-700">
                                  {s.grade} - {s.section}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                {s.assignedLevel ? (
                                  <span className="px-3 py-1 rounded-full font-bold text-xs bg-indigo-100 text-[#2528b7]">
                                    Nivel {s.assignedLevel}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-xs">Sin evaluar</span>
                                )}
                              </td>

                              {/* INTERRUPTOR SWITCH DE ACCESO */}
                              <td className="py-3.5 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(s.email, s.status)}
                                  className="inline-flex items-center gap-2 cursor-pointer group"
                                  title={isActive ? 'Clic para pausar acceso' : 'Clic para habilitar'}
                                >
                                  <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-all duration-200 ${
                                    isActive ? 'bg-emerald-500 justify-end' : 'bg-gray-300 justify-start'
                                  }`}>
                                    <div className="bg-white w-4 h-4 rounded-full shadow-md transition-all"></div>
                                  </div>
                                  <span className={`text-[11px] font-bold ${
                                    isActive ? 'text-emerald-700' : 'text-gray-400'
                                  }`}>
                                    {isActive ? 'Activo' : 'Pausado'}
                                  </span>
                                </button>
                              </td>

                              {/* ACCIONES CRUD: EDITAR / ELIMINAR */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => onSwitchToStudentView?.(s)}
                                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                                    title={`Abrir portal como ${s.name}`}
                                  >
                                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(s)}
                                    className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                    title="Editar datos"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(s.email, s.name)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="Eliminar alumno"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
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

                {/* BARRA DE PAGINACIÓN */}
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
                      title="Primera página"
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
                            className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
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
                      title="Última página"
                    >
                      »
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ================= SECCIÓN 2.5: DASHBOARD ANALÍTICO (GRADOS, SECCIONES Y NIVELES) ================= */}
          {currentSection === 'analytics' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Resumen Superior */}
              <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
                    <span className="text-[11px] font-bold tracking-wider uppercase text-primary">
                      Diagnóstico Institucional de Inglés
                    </span>
                  </div>
                  <h2 className="font-heading font-extrabold text-2xl text-gray-900 mt-1">
                    Dashboard Analítico de Niveles (MCER)
                  </h2>
                  <p className="text-xs text-gray-500">
                    Desglose de avance por grados, secciones y distribución de niveles evaluados por los docentes.
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                  <div className="text-center px-2">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Alumnos</span>
                    <span className="font-heading font-black text-xl text-gray-900">{studentsList.length}</span>
                  </div>
                  <div className="w-px h-8 bg-gray-200"></div>
                  <div className="text-center px-2">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 block">Evaluados</span>
                    <span className="font-heading font-black text-xl text-emerald-600">
                      {studentsList.filter(s => Boolean(s.assignedLevel)).length}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-gray-200"></div>
                  <div className="text-center px-2">
                    <span className="text-[10px] uppercase font-bold text-amber-600 block">Pendientes</span>
                    <span className="font-heading font-black text-xl text-amber-600">
                      {studentsList.filter(s => !s.assignedLevel).length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Distribución Global por Nivel Oficial MCER */}
              <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-sm space-y-4">
                <h3 className="font-heading font-extrabold text-base text-gray-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">donut_large</span>
                  Distribución General por Nivel MCER (Evaluados por Docentes)
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { id: 'A1', name: 'A1 - Principiante', color: 'bg-emerald-500', bgLight: 'bg-emerald-50', textCol: 'text-emerald-700', border: 'border-emerald-200' },
                    { id: 'A2', name: 'A2 - Básico', color: 'bg-cyan-500', bgLight: 'bg-cyan-50', textCol: 'text-cyan-700', border: 'border-cyan-200' },
                    { id: 'B1', name: 'B1 - Pre-Intermedio', color: 'bg-blue-600', bgLight: 'bg-blue-50', textCol: 'text-blue-700', border: 'border-blue-200' },
                    { id: 'B2', name: 'B2 - Intermedio Alto', color: 'bg-purple-600', bgLight: 'bg-purple-50', textCol: 'text-purple-700', border: 'border-purple-200' },
                    { id: 'C1', name: 'C1 - Avanzado', color: 'bg-pink-600', bgLight: 'bg-pink-50', textCol: 'text-pink-700', border: 'border-pink-200' },
                  ].map((lvl) => {
                    const count = studentsList.filter(s => s.assignedLevel === lvl.id).length
                    const evaluatedTotal = studentsList.filter(s => Boolean(s.assignedLevel)).length
                    const pct = evaluatedTotal > 0 ? Math.round((count / evaluatedTotal) * 100) : 0
                    return (
                      <div key={lvl.id} className={`p-4 rounded-2xl border ${lvl.border} ${lvl.bgLight} space-y-2`}>
                        <div className="flex justify-between items-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${lvl.color} text-white`}>
                            {lvl.id}
                          </span>
                          <span className="text-xs font-bold text-gray-500">{pct}%</span>
                        </div>
                        <div>
                          <div className={`font-heading font-black text-2xl ${lvl.textCol}`}>
                            {count}
                          </div>
                          <span className="text-[11px] text-gray-600 font-medium block leading-tight">
                            {lvl.name}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Matriz Analítica: Grados y Secciones */}
              <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <h3 className="font-heading font-extrabold text-base text-gray-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">table_chart</span>
                      Desglose Analítico por Grados y Secciones
                    </h3>
                    <p className="text-xs text-gray-500">
                      Visualiza cuántos alumnos han sido evaluados y su nivel predominante en cada sección.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs md:text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-[11px] font-bold uppercase text-gray-500 bg-slate-50/50">
                        <th className="py-3 px-4">Grado Escolar</th>
                        <th className="py-3 px-4">Sección</th>
                        <th className="py-3 px-4">Total Alumnos</th>
                        <th className="py-3 px-4">Evaluados</th>
                        <th className="py-3 px-4">Progreso</th>
                        <th className="py-3 px-4">Desglose de Niveles (A1 / A2 / B1 / B2 / C1)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {academic.grades.flatMap(g => {
                        return academic.sections.map(sec => {
                          // Filtrar alumnos de este grado y sección
                          const inGroup = studentsList.filter(s => {
                            const gStr = (s.grade || '') + ' ' + (s.codigoGrado || '')
                            let matchG = false
                            if (g.id === '6') matchG = gStr.includes('6°') || s.codigoGrado === '06'
                            else if (g.id === '7') matchG = gStr.includes('7°') || s.codigoGrado === '07'
                            else if (g.id === '8') matchG = gStr.includes('8°') || s.codigoGrado === '08'
                            else if (g.id === '9') matchG = gStr.includes('9°') || s.codigoGrado === '09'
                            else if (g.id === '10') matchG = gStr.includes('10°') || gStr.includes('1° Bachillerato') || s.codigoGrado === '10'
                            else if (g.id === '11') matchG = gStr.includes('11°') || gStr.includes('2° Bachillerato') || s.codigoGrado === '11'
                            else if (g.id === '12') matchG = gStr.includes('12°') || gStr.includes('3° Bachillerato') || s.codigoGrado === '32'
                            else matchG = gStr.includes(g.id)

                            return matchG && s.section === sec
                          })

                          if (inGroup.length === 0) return null

                          const evaluated = inGroup.filter(s => Boolean(s.assignedLevel)).length
                          const pct = inGroup.length > 0 ? Math.round((evaluated / inGroup.length) * 100) : 0
                          const a1 = inGroup.filter(s => s.assignedLevel === 'A1').length
                          const a2 = inGroup.filter(s => s.assignedLevel === 'A2').length
                          const b1 = inGroup.filter(s => s.assignedLevel === 'B1').length
                          const b2 = inGroup.filter(s => s.assignedLevel === 'B2').length
                          const c1 = inGroup.filter(s => s.assignedLevel === 'C1').length

                          return (
                            <tr key={`${g.id}-${sec}`} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-4 font-bold text-gray-900">{g.label}</td>
                              <td className="py-3 px-4">
                                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 font-extrabold text-xs">
                                  Secc. {sec}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-gray-700">{inGroup.length}</td>
                              <td className="py-3 px-4 font-semibold text-emerald-700">
                                {evaluated} / {inGroup.length}
                              </td>
                              <td className="py-3 px-4 w-40">
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[10px] font-bold text-gray-500">
                                    <span>{pct}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                    <div
                                      className="bg-[#2528b7] h-full rounded-full transition-all"
                                      style={{ width: `${pct}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {a1 > 0 && <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black">A1: {a1}</span>}
                                  {a2 > 0 && <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 text-[10px] font-black">A2: {a2}</span>}
                                  {b1 > 0 && <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-black">B1: {b1}</span>}
                                  {b2 > 0 && <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-black">B2: {b2}</span>}
                                  {c1 > 0 && <span className="px-2 py-0.5 rounded-md bg-pink-100 text-pink-800 text-[10px] font-black">C1: {c1}</span>}
                                  {evaluated === 0 && (
                                    <span className="text-[11px] text-gray-400 italic">Pendiente de evaluación</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      }).filter(Boolean)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= SECCIÓN 2.6: CONFIGURACIÓN DINÁMICA DE GRADOS Y SECCIONES ================= */}
          {currentSection === 'academic_structure' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-sm">
                <h2 className="font-heading font-extrabold text-xl text-gray-900">
                  Configuración Dinámica de Grados y Secciones
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Define las entidades escolares oficiales en Firestore. No están fijas en el código; puedes agregar o remover grados y secciones según la matrícula del año.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Panel 1: Grados Escolares */}
                <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-heading font-bold text-base text-gray-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#2528b7] text-[20px]">school</span>
                        Grados Escolares ({academic.grades.length})
                      </h3>
                      <span className="text-[11px] text-gray-500">Generan los botones ovalados de filtrado</span>
                    </div>
                  </div>

                  {/* Formulario Agregar Grado */}
                  <form onSubmit={handleAddGrade} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <span className="text-xs font-extrabold text-gray-700 block">Agregar Nuevo Grado</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 block mb-1">ID (Número)</label>
                        <input
                          type="text"
                          required
                          value={newGradeId}
                          onChange={(e) => setNewGradeId(e.target.value)}
                          placeholder="Ej: 5"
                          className="w-full px-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-gray-500 block mb-1">Etiqueta Completa</label>
                        <input
                          type="text"
                          required
                          value={newGradeLabel}
                          onChange={(e) => setNewGradeLabel(e.target.value)}
                          placeholder="Ej: 5° Grado"
                          className="w-full px-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSavingAcademic}
                      className="w-full py-2 rounded-xl bg-[#2528b7] hover:brightness-110 text-white font-bold text-xs shadow-xs cursor-pointer"
                    >
                      {isSavingAcademic ? 'Guardando...' : '+ Crear Grado en Firestore'}
                    </button>
                  </form>

                  {/* Lista de Grados Existentes */}
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {academic.grades.map(g => (
                      <div key={g.id} className="p-3 rounded-2xl border border-gray-200 flex items-center justify-between hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-indigo-50 text-[#2528b7] flex items-center justify-center font-black text-xs">
                            {g.id}
                          </span>
                          <div>
                            <span className="font-bold text-xs text-gray-900 block">{g.label}</span>
                            <span className="text-[10px] text-gray-400 font-mono">ID: {g.id}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveGrade(g.id)}
                          className="text-gray-400 hover:text-red-600 p-1 rounded-lg"
                          title="Eliminar grado"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Panel 2: Secciones Escolares */}
                <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-sm space-y-4">
                  <div>
                    <h3 className="font-heading font-bold text-base text-gray-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#2528b7] text-[20px]">grid_view</span>
                      Secciones Escolares ({academic.sections.length})
                    </h3>
                    <span className="text-[11px] text-gray-500">Entidades de sección (A, B, C, etc.)</span>
                  </div>

                  {/* Formulario Agregar Sección */}
                  <form onSubmit={handleAddSection} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <span className="text-xs font-extrabold text-gray-700 block">Agregar Nueva Sección</span>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 block mb-1">Letra o Código de Sección</label>
                      <input
                        type="text"
                        required
                        maxLength={3}
                        value={newSectionName}
                        onChange={(e) => setNewSectionName(e.target.value.toUpperCase())}
                        placeholder="Ej: E"
                        className="w-full px-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none uppercase font-bold"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSavingAcademic}
                      className="w-full py-2 rounded-xl bg-indigo-900 hover:brightness-110 text-white font-bold text-xs shadow-xs cursor-pointer"
                    >
                      {isSavingAcademic ? 'Guardando...' : '+ Crear Sección en Firestore'}
                    </button>
                  </form>

                  {/* Lista de Secciones Existentes */}
                  <div className="grid grid-cols-2 gap-2">
                    {academic.sections.map(sec => (
                      <div key={sec} className="p-3 rounded-2xl border border-gray-200 flex items-center justify-between hover:bg-slate-50">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-full bg-slate-100 text-gray-900 flex items-center justify-center font-black text-sm">
                            {sec}
                          </span>
                          <span className="font-bold text-xs text-gray-800">Sección {sec}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSection(sec)}
                          className="text-gray-400 hover:text-red-600 p-1 rounded-lg"
                          title="Eliminar sección"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN 3: GESTIÓN DE DOCENTES */}
          {currentSection === 'teachers' && (
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="font-heading font-bold text-lg text-on-surface">Docentes de Inglés Autorizados</h2>
                  <p className="text-xs text-on-surface-variant">
                    Docentes que aplican la entrevista oral y califican la rúbrica institucional.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="px-3 py-1.5 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-container"
                >
                  + Agregar Docente
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/30 text-[11px] font-bold uppercase text-on-surface-variant">
                      <th className="pb-3 px-3">Docente</th>
                      <th className="pb-3 px-3">Correo</th>
                      <th className="pb-3 px-3">Estado</th>
                      <th className="pb-3 px-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {teachersList.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-6 text-center text-gray-400 text-xs italic">
                          No hay docentes registrados todavía.
                        </td>
                      </tr>
                    ) : (
                      teachersList.map((t) => (
                        <tr key={t.email} className="hover:bg-surface-container-low transition-colors">
                          <td className="py-3 px-3 font-semibold text-on-surface">{t.name}</td>
                          <td className="py-3 px-3 text-on-surface-variant font-mono">{t.email}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.status === 'active' ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {t.status === 'active' ? 'Activo' : 'Pausado'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleToggleStatus(t.email, t.status)}
                              className="text-xs font-bold text-primary hover:underline"
                            >
                              {t.status === 'active' ? 'Pausar' : 'Activar'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECCIÓN 4: UMBRALES MCER */}
          {currentSection === 'thresholds' && (
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm max-w-2xl space-y-4">
              <h2 className="font-heading font-bold text-lg text-on-surface">Criterios de Avance de Nivel (MCER)</h2>
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
                      <span className="font-heading font-extrabold text-base text-primary">{th.min} / {th.total}</span>
                      <span className="block text-[10px] text-on-surface-variant">Aciertos Mínimos</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECCIÓN 5: REPORTES */}
          {currentSection === 'reports' && (
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm space-y-4">
              <h2 className="font-heading font-bold text-lg text-on-surface">Cierre y Reportes de Nivelación</h2>
              <p className="text-xs text-on-surface-variant">Generación de sábanas de notas y actas de ubicación de los estudiantes.</p>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => alert('Generando reporte Excel/PDF...')}
                  className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container shadow-sm flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Descargar Reporte General
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ================= MODAL CRUD: CREAR / EDITAR ALUMNO O DOCENTE ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-gray-100 space-y-5">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-heading font-bold text-lg text-gray-900">
                {editingUser ? 'Editar Registro' : 'Registrar Nuevo Usuario'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: JUAN CARLOS PEREZ GOMEZ"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-indigo-500/30 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Carnet / Código</label>
                  <input
                    type="text"
                    value={formData.carnet}
                    onChange={(e) => setFormData({ ...formData, carnet: e.target.value })}
                    placeholder="20260101"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-indigo-500/30 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Rol</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none"
                  >
                    <option value="student">Alumno</option>
                    <option value="teacher">Docente de Inglés</option>
                    <option value="coordination">Coordinación</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Correo Institucional</label>
                <input
                  type="email"
                  required
                  disabled={Boolean(editingUser)}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ejemplo@salesianosanjose.edu.sv"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-indigo-500/30 focus:outline-none disabled:bg-gray-100"
                />
              </div>

              {formData.role === 'student' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Grado</label>
                    <input
                      type="text"
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      placeholder="7° Grado"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Sección</label>
                    <input
                      type="text"
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      placeholder="A"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#2528b7] text-white text-xs font-bold hover:brightness-110 shadow-sm"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
