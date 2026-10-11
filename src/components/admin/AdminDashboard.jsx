import React, { useState, useEffect } from 'react'
import Sidebar from '../shared/Sidebar'
import {
  getAllUsers,
  updateUserStatus,
  updateUsersStatusBatch,
  registerOrUpdateUser,
  deleteUser,
  deleteUsersBatch,
  batchSyncStudents,
  getAcademicStructure,
  saveAcademicStructure,
  getOralEvaluations,
  resetStudentEvaluation,
  resetAllEvaluations,
  getCoordinationModulesConfig,
  saveCoordinationModulesConfig,
  getExamDispatchConfig,
  subscribeExamDispatch
} from '../../lib/dataService'
import bundledStudents from '../../data/studentsFromSchool.json'
import DiagnosticConfigManager from '../shared/DiagnosticConfigManager'
import AnalyticsDashboard from '../shared/AnalyticsDashboard'
import ActionModal from '../shared/ActionModal'

export default function AdminDashboard({ user, onLogout, onSwitchToStudentView, onSwitchToTeacherView }) {
  const [currentSection, setCurrentSection] = useState('overview')
  const [collapsed, setCollapsed] = useState(false)
  const [evalPeriodOpen, setEvalPeriodOpen] = useState(true)

  // Estado del modal universal de aviso/confirmación (reemplaza alert y confirm de window)
  const [modalNotice, setModalNotice] = useState(null)
  // { isOpen: true, type: 'info'|'warning'|'danger'|'success', title, message, confirmText, cancelText, onConfirm }

  const [allUsersList, setAllUsersList] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)

  // Botones Ovalados de Grado (6 a 12), Sección (A, B, C) y Especialidad de Bachillerato (General / Técnico)
  const [gradePill, setGradePill] = useState('all') // 'all' | '6' | '7' | '8' | '9' | '10' | '11' | '12'
  const [sectionPill, setSectionPill] = useState('all') // 'all' | 'A' | 'B' | 'C'
  const [modalityPill, setModalityPill] = useState('all') // 'all' | 'General' | 'Técnico'
  const [statusPill, setStatusPill] = useState('all') // 'all' | 'active' | 'pending'

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 12

  // Selección múltiple y eliminación por lote (toda la sección / seleccionados)
  const [selectedEmails, setSelectedEmails] = useState([])
  const [batchDeleteTarget, setBatchDeleteTarget] = useState(null) // { title, count, emails } para modal de confirmación en lote
  const [userToDelete, setUserToDelete] = useState(null) // { email, name } para modal de confirmación individual
  const [isDeleting, setIsDeleting] = useState(false)
  const [expandedSection, setExpandedSection] = useState(null) // Clave '7-C', etc. para desplegar alumnos en el analytics
  const [selectedDetailStudent, setSelectedDetailStudent] = useState(null) // Alumno seleccionado para ver su expediente completo al hacer clic
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    carnet: '',
    grade: '7° Grado',
    section: 'A',
    especialidad: 'General',
    role: 'student',
    status: 'active'
  })

  // Estructura Dinámica de Grados y Secciones (Firestore)
  const [academic, setAcademic] = useState({
    grades: [
      { id: '6', label: '6°' },
      { id: '7', label: '7°' },
      { id: '8', label: '8°' },
      { id: '9', label: '9°' },
      { id: '10', label: '10°' },
      { id: '11', label: '11°' },
      { id: '12', label: '12°' }
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

  const [coordinationModules, setCoordinationModules] = useState({})
  const [dispatchConfig, setDispatchConfig] = useState({ closureLogs: [] })
  const [isSavingModules, setIsSavingModules] = useState(false)

  // Cargar usuarios, evaluaciones, estructura académica y permisos de módulos desde Firestore
  const loadData = async () => {
    setLoadingUsers(true)
    try {
      const [usersData, evalsData, struct, modulesCfg, dispatchCfg] = await Promise.all([
        getAllUsers(),
        getOralEvaluations(),
        getAcademicStructure(),
        getCoordinationModulesConfig(),
        getExamDispatchConfig()
      ])
      setAllUsersList(usersData || [])
      setEvaluations(evalsData || [])
      if (struct && struct.grades && struct.grades.length > 0) {
        setAcademic(struct)
      }
      if (modulesCfg) {
        setCoordinationModules(modulesCfg)
      }
      if (dispatchCfg) {
        setDispatchConfig(dispatchCfg)
      }
    } catch (e) {
      console.error('Error cargando datos de admin:', e)
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    loadData()
    const unsub = subscribeExamDispatch((cfg) => {
      if (cfg) setDispatchConfig(cfg)
    })
    return () => unsub()
  }, [])

  // Estados para Edición inline de Grados y Secciones (CRUD completo)
  const [editingGradeId, setEditingGradeId] = useState(null)
  const [editGradeLabel, setEditGradeLabel] = useState('')
  const [editingSection, setEditingSection] = useState(null)
  const [editSectionName, setEditSectionName] = useState('')

  // CRUD de Grados y Secciones en Firestore
  const handleAddGrade = async (e) => {
    e.preventDefault()
    const gid = newGradeId.trim().replace(/[^0-9]/g, '')
    if (!gid) {
      setModalNotice({
        isOpen: true,
        type: 'warning',
        title: 'Número de Grado Requerido',
        message: 'Por favor ingresa el número del grado escolar (ej. 6, 7, 10, etc.).',
        confirmText: 'Entendido',
        onConfirm: () => setModalNotice(null)
      })
      return
    }
    const glabel = newGradeLabel.trim() || `${gid}°`
    const canonicalLabel = glabel.includes('°') ? glabel : `${glabel}°`
    
    if (academic.grades.some(g => g.id === gid)) {
      setModalNotice({
        isOpen: true,
        type: 'warning',
        title: 'Grado Duplicado',
        message: `El Grado "${gid}°" ya existe en la configuración oficial.`,
        confirmText: 'Entendido',
        onConfirm: () => setModalNotice(null)
      })
      return
    }
    const updated = {
      ...academic,
      grades: [...academic.grades, { id: gid, label: canonicalLabel }]
    }
    setIsSavingAcademic(true)
    await saveAcademicStructure(updated)
    setAcademic(updated)
    setNewGradeId('')
    setNewGradeLabel('')
    setIsSavingAcademic(false)
  }

  const handleStartEditGrade = (grade) => {
    setEditingGradeId(grade.id)
    setEditGradeLabel(grade.label)
  }

  const handleSaveEditGrade = async (gradeId) => {
    if (!editGradeLabel.trim()) return
    const updated = {
      ...academic,
      grades: academic.grades.map(g => g.id === gradeId ? { ...g, label: editGradeLabel.trim() } : g)
    }
    setIsSavingAcademic(true)
    await saveAcademicStructure(updated)
    setAcademic(updated)
    setEditingGradeId(null)
    setEditGradeLabel('')
    setIsSavingAcademic(false)
  }

  const handleCancelEditGrade = () => {
    setEditingGradeId(null)
    setEditGradeLabel('')
  }

  const handleRemoveGrade = (gradeId) => {
    setModalNotice({
      isOpen: true,
      type: 'danger',
      title: '¿Eliminar Grado Escolar?',
      message: `¿Estás seguro de que deseas eliminar el grado "${gradeId}°" de la configuración escolar de Firestore?`,
      confirmText: 'Sí, Eliminar Grado',
      cancelText: 'Cancelar',
      onCancel: () => setModalNotice(null),
      onConfirm: async () => {
        setModalNotice(null)
        const updated = {
          ...academic,
          grades: academic.grades.filter(g => g.id !== gradeId)
        }
        setIsSavingAcademic(true)
        await saveAcademicStructure(updated)
        setAcademic(updated)
        setIsSavingAcademic(false)
      }
    })
  }

  const handleAddSection = async (e) => {
    e.preventDefault()
    const sec = newSectionName.trim().toUpperCase()
    if (!sec) return
    if (academic.sections.includes(sec)) {
      setModalNotice({
        isOpen: true,
        type: 'warning',
        title: 'Sección Duplicada',
        message: `La sección "${sec}" ya se encuentra registrada en la configuración.`,
        confirmText: 'Entendido',
        onConfirm: () => setModalNotice(null)
      })
      return
    }
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

  const handleStartEditSection = (sec) => {
    setEditingSection(sec)
    setEditSectionName(sec)
  }

  const handleSaveEditSection = async (oldSec) => {
    const newSec = editSectionName.trim().toUpperCase()
    if (!newSec) return
    if (newSec !== oldSec && academic.sections.includes(newSec)) {
      setModalNotice({
        isOpen: true,
        type: 'warning',
        title: 'Sección Existente',
        message: `La sección "${newSec}" ya existe en la lista de secciones.`,
        confirmText: 'Entendido',
        onConfirm: () => setModalNotice(null)
      })
      return
    }
    const updated = {
      ...academic,
      sections: academic.sections.map(s => s === oldSec ? newSec : s).sort()
    }
    setIsSavingAcademic(true)
    await saveAcademicStructure(updated)
    setAcademic(updated)
    setEditingSection(null)
    setEditSectionName('')
    setIsSavingAcademic(false)
  }

  const handleCancelEditSection = () => {
    setEditingSection(null)
    setEditSectionName('')
  }

  const handleRemoveSection = (sec) => {
    setModalNotice({
      isOpen: true,
      type: 'danger',
      title: '¿Eliminar Sección?',
      message: `¿Deseas remover la sección "${sec}" de la configuración escolar de Firestore?`,
      confirmText: 'Sí, Eliminar Sección',
      cancelText: 'Cancelar',
      onCancel: () => setModalNotice(null),
      onConfirm: async () => {
        setModalNotice(null)
        const updated = {
          ...academic,
          sections: academic.sections.filter(s => s !== sec)
        }
        setIsSavingAcademic(true)
        await saveAcademicStructure(updated)
        setAcademic(updated)
        setIsSavingAcademic(false)
      }
    })
  }

  // Activar o desactivar módulos disponibles para el perfil de Coordinación
  const handleToggleModulePermission = async (moduleId) => {
    const current = coordinationModules[moduleId]
    if (!current) return
    const updated = {
      ...coordinationModules,
      [moduleId]: {
        ...current,
        enabled: !current.enabled
      }
    }
    setCoordinationModules(updated)
    try {
      setIsSavingModules(true)
      await saveCoordinationModulesConfig(updated)
    } catch (e) {
      console.error('Error guardando permiso de módulo:', e)
    } finally {
      setIsSavingModules(false)
    }
  }

  const handleBatchToggleModules = async (enableAll = true) => {
    const updated = {}
    Object.keys(coordinationModules).forEach(k => {
      updated[k] = { ...coordinationModules[k], enabled: enableAll }
    })
    setCoordinationModules(updated)
    try {
      setIsSavingModules(true)
      await saveCoordinationModulesConfig(updated)
    } catch (e) {
      console.error('Error guardando permisos en lote:', e)
    } finally {
      setIsSavingModules(false)
    }
  }

  // Resetear la evaluación de un alumno individual
  const handleResetStudent = (student) => {
    setModalNotice({
      isOpen: true,
      type: 'warning',
      title: '¿Resetear Evaluación?',
      message: `¿Deseas resetear el Nivel Oficial y los resultados de ${student.name}? El estudiante volverá a quedar como "Sin Evaluar".`,
      confirmText: 'Sí, Resetear',
      cancelText: 'Cancelar',
      onCancel: () => setModalNotice(null),
      onConfirm: async () => {
        setModalNotice(null)
        try {
          await resetStudentEvaluation(student.email)
          await loadData()
        } catch (e) {
          console.error('Error al resetear alumno en admin:', e)
        }
      }
    })
  }

  // Resetear TODAS las evaluaciones de los alumnos
  const handleResetAll = () => {
    setModalNotice({
      isOpen: true,
      type: 'danger',
      title: '⚠️ ¿Resetear TODAS las Evaluaciones?',
      message: 'Esta acción reiniciará los Niveles Oficiales de TODOS los alumnos registrados en el sistema. Quedarán todos con estado "Sin Evaluar".',
      confirmText: 'Sí, Resetear Todo',
      cancelText: 'Cancelar',
      onCancel: () => setModalNotice(null),
      onConfirm: async () => {
        setModalNotice(null)
        try {
          await resetAllEvaluations()
          await loadData()
        } catch (e) {
          console.error('Error al resetear todas las evaluaciones en admin:', e)
        }
      }
    })
  }

  // Modificar estado de un usuario (Switch Rápido)
  const handleToggleStatus = async (targetEmail, currentStatus) => {
    if (!targetEmail) return
    const clean = targetEmail.trim().toLowerCase()
    const newStatus = currentStatus === 'active' ? 'pending' : 'active'
    
    // Actualización visual inmediata en el estado local
    setAllUsersList(prev => prev.map(u => (u.email || '').trim().toLowerCase() === clean ? { ...u, status: newStatus } : u))
    
    try {
      await updateUserStatus(clean, newStatus, user.email)
      await loadData()
    } catch (e) {
      console.error('Error al actualizar estado:', e)
      await loadData()
    }
  }

  // Activar o desactivar en lote (Todos los filtrados o seleccionados)
  const [isBatchUpdatingStatus, setIsBatchUpdatingStatus] = useState(false)
  const handleBatchUpdateStatus = async (targetStatus, scope = 'filtered') => {
    const emailsToUpdate = scope === 'selected' && selectedEmails.length > 0
      ? selectedEmails
      : filteredStudents.map(s => s.email).filter(Boolean)

    if (emailsToUpdate.length === 0) {
      setModalNotice({
        isOpen: true,
        type: 'warning',
        title: 'Sin Alumnos',
        message: 'No hay alumnos disponibles para actualizar en la vista actual.',
        confirmText: 'Entendido',
        onConfirm: () => setModalNotice(null)
      })
      return
    }

    const actionText = targetStatus === 'active' ? 'habilitar' : 'pausar'
    const confirmMsg = `¿Estás seguro de que deseas ${actionText} el acceso para los ${emailsToUpdate.length} alumnos ${scope === 'selected' ? 'seleccionados' : 'de la sección/filtro actual'}?`
    
    setModalNotice({
      isOpen: true,
      type: targetStatus === 'active' ? 'info' : 'warning',
      title: `${targetStatus === 'active' ? 'Habilitar' : 'Pausar'} Accesos en Lote`,
      message: confirmMsg,
      confirmText: `Sí, ${targetStatus === 'active' ? 'Habilitar' : 'Pausar'} (${emailsToUpdate.length})`,
      cancelText: 'Cancelar',
      onCancel: () => setModalNotice(null),
      onConfirm: async () => {
        setModalNotice(null)
        setIsBatchUpdatingStatus(true)
        const cleanEmails = emailsToUpdate.map(e => e.trim().toLowerCase())
        
        // Actualización visual reactiva inmediata
        setAllUsersList(prev => prev.map(u => {
          const email = (u.email || '').trim().toLowerCase()
          if (cleanEmails.includes(email)) {
            return { ...u, status: targetStatus }
          }
          return u
        }))

        try {
          await updateUsersStatusBatch(cleanEmails, targetStatus, user.email)
          await loadData()
        } catch (e) {
          console.error('Error al actualizar estados en lote:', e)
          await loadData()
        } finally {
          setIsBatchUpdatingStatus(false)
        }
      }
    })
  }

  // Abrir modal para Crear
  const handleOpenCreateModal = () => {
    setEditingUser(null)
    setFormData({
      name: '',
      email: '',
      carnet: '',
      grade: '7°',
      section: 'A',
      especialidad: null,
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
      grade: u.grade || '7°',
      section: u.section || 'A',
      especialidad: u.especialidad || null,
      role: u.role || 'student',
      status: u.status || 'active'
    })
    setIsModalOpen(true)
  }

  // Guardar (Crear o Actualizar)
  const handleSaveUser = async (e) => {
    e.preventDefault()
    if (!formData.email.trim() || !formData.name.trim()) {
      setModalNotice({
        isOpen: true,
        type: 'warning',
        title: 'Campos Incompletos',
        message: 'El nombre completo y el correo electrónico institucional son obligatorios.',
        confirmText: 'Entendido',
        onConfirm: () => setModalNotice(null)
      })
      return
    }

    await registerOrUpdateUser({
      ...formData,
      validatedBy: user.email
    })
    setIsModalOpen(false)
    await loadData()
    setModalNotice({
      isOpen: true,
      type: 'success',
      title: 'Usuario Guardado',
      message: `Los datos de "${formData.name}" han sido guardados correctamente en Firestore.`,
      confirmText: 'Aceptar',
      onConfirm: () => setModalNotice(null)
    })
  }

  // Abrir Modal de Confirmación para Eliminar Usuario individual
  const handleDeleteUser = (targetEmail, targetName) => {
    setUserToDelete({ email: targetEmail, name: targetName })
  }

  // Ejecutar eliminación confirmada individual
  const handleConfirmDelete = async () => {
    if (!userToDelete) return
    setIsDeleting(true)
    try {
      await deleteUser(userToDelete.email)
      setSelectedEmails(prev => prev.filter(e => e !== userToDelete.email))
      await loadData()
      setUserToDelete(null)
    } catch (e) {
      console.error('Error eliminando usuario:', e)
    } finally {
      setIsDeleting(false)
    }
  }

  // Abrir Modal de Confirmación para Eliminar TODA la Sección o los Seleccionados
  const handleTriggerDeleteSectionOrSelected = (type = 'filtered') => {
    if (type === 'selected' && selectedEmails.length > 0) {
      setBatchDeleteTarget({
        title: `Eliminar ${selectedEmails.length} alumnos seleccionados`,
        description: `Se eliminarán permanentemente los ${selectedEmails.length} alumnos seleccionados de la plataforma y de Firebase.`,
        emails: selectedEmails
      })
    } else {
      // Eliminar toda la sección actualmente filtrada
      const emailsToDelete = filteredStudents.map(s => s.email).filter(Boolean)
      if (emailsToDelete.length === 0) {
        setModalNotice({
          isOpen: true,
          type: 'warning',
          title: 'Sección Vacía',
          message: 'No hay alumnos registrados en la sección actual para eliminar.',
          confirmText: 'Entendido',
          onConfirm: () => setModalNotice(null)
        })
        return
      }
      const gradeLabel = gradePill !== 'all' ? `${gradePill}°` : 'Todos los grados'
      const secLabel = sectionPill !== 'all' ? `Sección ${sectionPill}` : 'Todas las secciones'
      setBatchDeleteTarget({
        title: `Eliminar toda la ${secLabel} (${gradeLabel})`,
        description: `¿Estás seguro de eliminar a los ${emailsToDelete.length} alumnos de esta sección? Serán removidos permanentemente de la plataforma y de Firebase.`,
        emails: emailsToDelete
      })
    }
  }

  // Ejecutar eliminación masiva confirmada desde el modal
  const handleConfirmBatchDelete = async () => {
    if (!batchDeleteTarget || !batchDeleteTarget.emails.length) return
    setIsDeleting(true)
    try {
      await deleteUsersBatch(batchDeleteTarget.emails)
      setSelectedEmails([])
      await loadData()
      setBatchDeleteTarget(null)
    } catch (e) {
      console.error('Error en eliminación masiva:', e)
    } finally {
      setIsDeleting(false)
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
          await loadData()
          setIsSyncing(false)
          setModalNotice({
            isOpen: true,
            type: 'success',
            title: 'Importación Completada',
            message: `Se importaron y guardaron ${parsed.length} alumnos en Firebase con éxito.`,
            confirmText: 'Excelente',
            onConfirm: () => setModalNotice(null)
          })
        } else {
          setModalNotice({
            isOpen: true,
            type: 'warning',
            title: 'Sin Registros Válidos',
            message: 'No se detectaron registros válidos en el archivo CSV subido.',
            confirmText: 'Entendido',
            onConfirm: () => setModalNotice(null)
          })
        }
      } catch (err) {
        setIsSyncing(false)
        console.error('Error importando CSV:', err)
        setModalNotice({
          isOpen: true,
          type: 'danger',
          title: 'Error al Leer CSV',
          message: 'Ocurrió un error al procesar el archivo CSV: ' + err.message,
          confirmText: 'Cerrar',
          onConfirm: () => setModalNotice(null)
        })
      }
    }
    reader.readAsText(file)
  }

  // Sincronización oficial CSSJ hacia Firestore
  const handleSyncFromCSSJ = () => {
    setModalNotice({
      isOpen: true,
      type: 'info',
      title: '¿Sincronizar Nómina Oficial CSSJ?',
      message: `¿Deseas sincronizar los ${bundledStudents.length} alumnos oficiales de 6° a 12° grado en Firestore?`,
      confirmText: `Sí, Sincronizar (${bundledStudents.length})`,
      cancelText: 'Cancelar',
      onCancel: () => setModalNotice(null),
      onConfirm: async () => {
        setIsSyncing(true)
        setModalNotice(null)
        try {
          await batchSyncStudents(bundledStudents, user.email)
          await loadData()
          setModalNotice({
            isOpen: true,
            type: 'success',
            title: 'Sincronización Exitosa',
            message: `Se sincronizaron ${bundledStudents.length} alumnos en Firestore de englishlevel.`,
            confirmText: 'Aceptar',
            onConfirm: () => setModalNotice(null)
          })
        } catch (e) {
          console.error(e)
          setModalNotice({
            isOpen: true,
            type: 'danger',
            title: 'Error de Sincronización',
            message: 'Error en la sincronización con Firebase: ' + e.message,
            confirmText: 'Cerrar',
            onConfirm: () => setModalNotice(null)
          })
        } finally {
          setIsSyncing(false)
        }
      }
    })
  }

  const studentsList = allUsersList.filter(u => u.role === 'student')
  const teachersList = allUsersList.filter(u => u.role === 'teacher' || u.role === 'coordination' || u.role === 'admin')
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

  // Secciones Dinámicas (Solo la letra de la sección: A, B, C...)
  const sectionButtonsList = [
    { id: 'all', label: 'Todas' },
    ...(academic.sections && academic.sections.length > 0
      ? academic.sections.map(s => ({ id: s, label: s }))
      : [
          { id: 'A', label: 'A' },
          { id: 'B', label: 'B' },
          { id: 'C', label: 'C' },
          { id: 'D', label: 'D' }
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

    // Coincidencia de Especialidad Bachillerato (General vs Técnico)
    const matchModality = modalityPill === 'all' || s.especialidad === modalityPill

    // Coincidencia de Estado
    const matchStatus = statusPill === 'all' || s.status === statusPill

    // Búsqueda
    const matchSearch = !searchTerm ||
      (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.carnet && s.carnet.includes(searchTerm)) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.especialidad && s.especialidad.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchGrade && matchSection && matchModality && matchStatus && matchSearch
  })

  // Paginación computada
  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const rawMenuItems = [
    { key: 'overview', label: 'Supervisión General', icon: 'dashboard' },
    { key: 'analytics', label: 'Dashboard Analítico', icon: 'analytics', badge: `${studentsList.filter(s => Boolean(s.assignedLevel)).length} eval.` },
    { key: 'students_manager', label: 'Gestión de Alumnos', icon: 'groups', badge: `${studentsList.length}` },
    { key: 'academic_structure', label: 'Grados y Secciones', icon: 'category', badge: `${academic.grades.length}G / ${academic.sections.length}S` },
    { key: 'teachers', label: 'Docentes y Coordinación', icon: 'school', badge: `${teachersList.length}` },
    { key: 'coordination_modules', label: 'Módulos de Coordinación', icon: 'admin_panel_settings', badge: `${Object.values(coordinationModules).filter(m => m.enabled).length}/${Object.keys(coordinationModules).length || 10}`, adminOnly: true },
    { key: 'thresholds', label: 'Ponderaciones y Cortes 2026', icon: 'tune' },
    { key: 'reports', label: 'Reportes y Cierre', icon: 'assessment' },
  ]

  // Si el usuario es de rol 'coordination', aplicar filtro de módulos activos configurados
  const menuItems = rawMenuItems.filter(item => {
    if (user?.role === 'admin' || user?.email?.includes('jose.marquez')) {
      return true
    }
    if (item.adminOnly) return false
    // Si es coordinación, comprobar si el módulo está habilitado en coordinationModules
    if (user?.role === 'coordination' && coordinationModules && Object.keys(coordinationModules).length > 0) {
      const cfg = coordinationModules[item.key]
      if (cfg && cfg.enabled === false) return false
    }
    return true
  })

  return (
    <div className="flex h-screen bg-surface font-sans overflow-hidden">
      <Sidebar
        title={user?.role === 'coordination' ? 'Coordinación' : 'Admin Inglés'}
        subtitle="Colegio Salesiano San José"
        icon={user?.role === 'coordination' ? 'manage_accounts' : 'admin_panel_settings'}
        menuItems={menuItems}
        activeKey={currentSection}
        onSelect={setCurrentSection}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        user={user}
        onLogout={onLogout}
      />

      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <header className="h-20 px-8 bg-white border-b border-[#eceaf6] flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="font-heading font-black text-2xl text-[#2d2c38] tracking-tight">
                {menuItems.find(m => m.key === currentSection)?.label}
              </h1>
              <span className="text-xs text-[#8e8a9f] font-semibold">
                Gestión Académica & Diagnóstico 2026
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#f4f1fd] px-3.5 py-2 rounded-2xl border border-[#e2e0ed] text-xs">
              <span className="font-bold text-[#585567]">Período:</span>
              <button
                type="button"
                onClick={() => setEvalPeriodOpen(!evalPeriodOpen)}
                className={`font-black px-3 py-1 rounded-full text-xs shadow-xs transition-all cursor-pointer ${
                  evalPeriodOpen ? 'bg-[#8a70d6] text-white shadow-[#8a70d6]/30' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {evalPeriodOpen ? '● Abierto' : '● Cerrado'}
              </button>
            </div>

            {onSwitchToTeacherView && (
              <button
                onClick={onSwitchToTeacherView}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#e9e3ff] hover:bg-[#ded5ff] text-xs font-black text-[#5446a8] transition-all cursor-pointer shadow-xs"
                title="Abrir la consola de entrevista oral y rúbrica como Docente / Evaluador"
              >
                <span className="material-symbols-outlined text-[17px] text-[#8a70d6]">record_voice_over</span>
                <span className="hidden sm:inline">Consola Docente</span>
              </button>
            )}

            <button
              onClick={onSwitchToStudentView}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#f8f7fc] hover:bg-[#ede9f7] text-xs font-black text-[#2d2c38] border border-[#e2e0ed] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px] text-[#8a70d6]">visibility</span>
              Vista de Alumno
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black transition-all border border-rose-200 cursor-pointer"
              title="Cerrar sesión"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>

        <main className="p-6 md:p-8 space-y-7 max-w-[96rem] w-full mx-auto">
          {/* SECCIÓN 1: SUPERVISIÓN GENERAL */}
          {currentSection === 'overview' && (
            <div className="space-y-7">
              {/* Saludo Banner tipo Card 3D */}
              <div className="bg-gradient-to-r from-[#e9e3ff] via-[#f4f1fd] to-[#fbfbfb] rounded-4xl p-7 border border-[#e2e0ed] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="space-y-1.5 relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-[#8a70d6] text-xs font-black shadow-xs">
                    <span>✨</span>
                    <span>Panel de Control General</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-[#2d2c38] tracking-tight">
                    ¡Bienvenido, {user?.name?.split(' ')?.[0] || 'Administrador'}!
                  </h2>
                  <p className="text-xs md:text-sm text-[#585567] max-w-xl">
                    Supervisa el estado de la batería diagnóstica, la activación de los alumnos de 6° a 12° grado y los reportes de nivelación oficial.
                  </p>
                </div>

                <div className="flex items-center gap-3 relative z-10">
                  <button
                    type="button"
                    onClick={() => setCurrentSection('students_manager')}
                    className="px-5 py-3 rounded-2xl bg-[#8a70d6] text-white font-black text-xs hover:bg-[#7a60c7] shadow-lg shadow-[#8a70d6]/25 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">groups</span>
                    <span>Gestionar Alumnos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentSection('analytics')}
                    className="px-5 py-3 rounded-2xl bg-white text-[#5446a8] border border-[#e2e0ed] font-black text-xs hover:bg-[#f8f7fc] shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#8a70d6]">bar_chart</span>
                    <span>Ver Analítica</span>
                  </button>
                </div>
              </div>

              {/* Tarjetas Estadísticas con sombras suaves y esquinas redondeadas 3xl */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="card-academy p-6 hover:-translate-y-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] font-black text-[#8e8a9f] uppercase tracking-wider">Alumnos Totales</span>
                      <h3 className="font-heading font-black text-3xl text-[#2d2c38] mt-2">{studentsList.length}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#e9e3ff] flex items-center justify-center text-[#8a70d6] shadow-sm">
                      <span className="material-symbols-outlined text-[24px]">groups</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#f4f3fa] flex items-center justify-between text-xs font-bold">
                    <span className="text-emerald-600 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {studentsList.filter(s => s.status === 'active').length} Habilitados
                    </span>
                    <span className="text-[#8e8a9f]">En Firebase</span>
                  </div>
                </div>

                <div className="card-academy p-6 hover:-translate-y-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] font-black text-[#8e8a9f] uppercase tracking-wider">Accesos Pausados</span>
                      <h3 className="font-heading font-black text-3xl text-amber-600 mt-2">{pendingCount}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-sm">
                      <span className="material-symbols-outlined text-[24px]">pause_circle</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#f4f3fa] flex items-center justify-between text-xs font-bold text-[#8e8a9f]">
                    <span>Control con Switch</span>
                    <span className="text-amber-600 font-extrabold">{pendingCount > 0 ? 'Requieren activar' : 'Todo al día'}</span>
                  </div>
                </div>

                <div className="card-academy p-6 hover:-translate-y-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] font-black text-[#8e8a9f] uppercase tracking-wider">Docentes & Coord.</span>
                      <h3 className="font-heading font-black text-3xl text-[#2d2c38] mt-2">{teachersList.length}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#f4f1fd] flex items-center justify-center text-[#8a70d6] shadow-sm">
                      <span className="material-symbols-outlined text-[24px]">school</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#f4f3fa] flex items-center justify-between text-xs font-bold text-[#8e8a9f]">
                    <span>Equipo evaluador</span>
                    <span className="text-[#5446a8] font-black">Activos</span>
                  </div>
                </div>

                <div className="card-academy p-6 hover:-translate-y-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] font-black text-[#8e8a9f] uppercase tracking-wider">Evaluados</span>
                      <h3 className="font-heading font-black text-3xl text-[#8a70d6] mt-2">
                        {studentsList.filter(s => Boolean(s.assignedLevel)).length}
                      </h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#e9e3ff] flex items-center justify-center text-[#8a70d6] shadow-sm">
                      <span className="material-symbols-outlined text-[24px]">verified</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#f4f3fa] flex items-center justify-between text-xs font-bold text-[#8e8a9f]">
                    <span>Nivel oficial</span>
                    <span className="text-[#8a70d6] font-extrabold">
                      {Math.round(((studentsList.filter(s => Boolean(s.assignedLevel)).length) / (studentsList.length || 1)) * 100)}% avance
                    </span>
                  </div>
                </div>
              </div>

              {/* Tarjetas estilo Cursos Nuevos / Accesos del diseño */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-black text-lg text-[#2d2c38]">
                    Módulos Rápidos de Administración
                  </h3>
                  <span className="text-xs font-bold text-[#8a70d6] hover:underline cursor-pointer" onClick={() => setCurrentSection('analytics')}>
                    Ver detalles →
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div 
                    onClick={() => setCurrentSection('students_manager')}
                    className="card-academy p-6 hover:-translate-y-1.5 cursor-pointer group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform shadow-xs">
                      👥
                    </div>
                    <h4 className="font-heading font-black text-base text-[#2d2c38]">Nómina de Alumnos</h4>
                    <p className="text-xs text-[#8e8a9f] mt-1">467 alumnos con filtros por Grado y Sección A, B, C.</p>
                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#f8f7fc]">
                      <span className="text-xs font-bold text-[#8a70d6]">{studentsList.length} registrados</span>
                      <div className="w-8 h-8 rounded-xl bg-[#f4f1fd] text-[#8a70d6] flex items-center justify-center group-hover:bg-[#8a70d6] group-hover:text-white transition-colors shadow-xs">
                        →
                      </div>
                    </div>
                  </div>

                  <div 
                    onClick={() => setCurrentSection('academic_structure')}
                    className="card-academy p-6 hover:-translate-y-1.5 cursor-pointer group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-[#e9e3ff] text-[#8a70d6] flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform shadow-xs">
                      📚
                    </div>
                    <h4 className="font-heading font-black text-base text-[#2d2c38]">Grados y Secciones</h4>
                    <p className="text-xs text-[#8e8a9f] mt-1">Administra la estructura escolar oficial en tiempo real.</p>
                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#f8f7fc]">
                      <span className="text-xs font-bold text-[#8a70d6]">{academic.grades.length} Grados activos</span>
                      <div className="w-8 h-8 rounded-xl bg-[#f4f1fd] text-[#8a70d6] flex items-center justify-center group-hover:bg-[#8a70d6] group-hover:text-white transition-colors shadow-xs">
                        →
                      </div>
                    </div>
                  </div>

                  <div 
                    onClick={() => setCurrentSection('thresholds')}
                    className="card-academy p-6 hover:-translate-y-1.5 cursor-pointer group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform shadow-xs">
                      🎯
                    </div>
                    <h4 className="font-heading font-black text-base text-[#2d2c38]">Ponderaciones y Cortes</h4>
                    <p className="text-xs text-[#8e8a9f] mt-1">Configura las metas y porcentajes por grado escolar.</p>
                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#f8f7fc]">
                      <span className="text-xs font-bold text-[#8a70d6]">Algoritmo MCER 2026</span>
                      <div className="w-8 h-8 rounded-xl bg-[#f4f1fd] text-[#8a70d6] flex items-center justify-center group-hover:bg-[#8a70d6] group-hover:text-white transition-colors shadow-xs">
                        →
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= SECCIÓN 2: GESTIÓN DE ALUMNOS (BOTONES OVALADOS + CRUD + SWITCH) ================= */}
          {currentSection === 'students_manager' && (
            <div className="space-y-6">
              
              {/* Barra Superior con Botones de Acción */}
              <div className="card-academy p-6 space-y-5">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <h2 className="font-heading font-black text-xl text-[#2d2c38] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#8a70d6] text-[24px]">groups</span>
                      <span>Gestión de Alumnos y Accesos</span>
                    </h2>
                    <p className="text-xs text-[#8e8a9f]">
                      Datos guardados en tiempo real en Firebase con interruptores activos por sección.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleOpenCreateModal}
                      className="px-4 py-2.5 rounded-2xl bg-[#8a70d6] text-white text-xs font-black hover:bg-[#7a60c7] shadow-md shadow-[#8a70d6]/25 flex items-center gap-2 transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <span className="material-symbols-outlined text-[17px]">person_add</span>
                      <span>+ Nuevo Alumno</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={handleSyncFromCSSJ}
                      className="px-4 py-2.5 rounded-2xl bg-[#f4f1fd] hover:bg-[#e9e3ff] text-[#5446a8] text-xs font-black flex items-center gap-2 transition-all cursor-pointer border border-[#e2e0ed] hover:-translate-y-0.5 active:translate-y-0"
                      title="Sincronizar nómina oficial de Firestore"
                    >
                      <span className="material-symbols-outlined text-[17px]">sync</span>
                      <span>{isSyncing ? 'Sincronizando...' : 'Recargar 467 CSSJ'}</span>
                    </button>

                    <label className="px-4 py-2.5 rounded-2xl border border-[#e2e0ed] hover:bg-[#f8f7fc] text-[#585567] text-xs font-black flex items-center gap-2 transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0">
                      <span className="material-symbols-outlined text-[17px] text-emerald-600">upload_file</span>
                      <span>Importar CSV</span>
                      <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* FILA 1: BOTONES OVALADOS DE PRESIÓN POR GRADO DINÁMICOS */}
                <div className="pt-4 border-t border-[#f4f3fa] space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-black text-[#8e8a9f] uppercase tracking-wider mr-1">
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
                          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer active:scale-95 ${
                            isSelected
                              ? 'bg-[#8a70d6] text-white shadow-md shadow-[#8a70d6]/30 ring-2 ring-[#e9e3ff]'
                              : 'bg-[#f8f7fc] text-[#585567] hover:bg-[#f4f1fd] hover:text-[#2d2c38] border border-[#e2e0ed]'
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
                      <span className="text-[11px] font-black text-[#8e8a9f] uppercase tracking-wider mr-1">
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
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 ${
                              isSelected
                                ? 'bg-[#5446a8] text-white shadow-xs'
                                : 'bg-[#f8f7fc] text-[#585567] hover:bg-[#f4f1fd] border border-[#e2e0ed]'
                            }`}
                          >
                            {sec.label}
                          </button>
                        )
                      })}

                      <span className="text-gray-300 mx-1 hidden sm:inline">|</span>

                      {/* Especialidad Bachillerato */}
                      <span className="text-[11px] font-black text-[#8e8a9f] uppercase tracking-wider mr-1">
                        Bachillerato:
                      </span>
                      {[
                        { id: 'all', label: 'Todos' },
                        { id: 'General', label: 'General' },
                        { id: 'Técnico', label: 'Técnico' }
                      ].map(mod => {
                        const isSelected = modalityPill === mod.id
                        return (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() => {
                              setModalityPill(mod.id)
                              setCurrentPage(1)
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 ${
                              isSelected
                                ? mod.id === 'Técnico'
                                  ? 'bg-[#8a70d6] text-white shadow-xs'
                                  : mod.id === 'General'
                                  ? 'bg-[#5446a8] text-white shadow-xs'
                                  : 'bg-[#2d2c38] text-white shadow-xs'
                                : 'bg-[#f8f7fc] text-[#585567] hover:bg-[#f4f1fd] border border-[#e2e0ed]'
                            }`}
                          >
                            {mod.label}
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
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            statusPill === 'all'
                              ? 'bg-[#2d2c38] text-white'
                              : 'text-[#8e8a9f] hover:text-[#2d2c38] bg-[#f8f7fc]'
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
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                            statusPill === 'active'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-[#585567] hover:text-emerald-700 bg-[#f8f7fc] border border-[#e2e0ed]'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          <span>Habilitados</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStatusPill('pending')
                            setCurrentPage(1)
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                            statusPill === 'pending'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'text-[#585567] hover:text-amber-700 bg-[#f8f7fc] border border-[#e2e0ed]'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                          <span>Pausados</span>
                        </button>
                      </div>
                    </div>

                    {/* Buscador Rápido y Reset Global */}
                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-60">
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value)
                            setCurrentPage(1)
                          }}
                          placeholder="Buscar carnet o nombre..."
                          className="w-full pl-9 pr-4 py-2 rounded-2xl bg-[#f8f7fc] border border-[#e2e0ed] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#8a70d6]/30 text-[#2d2c38]"
                        />
                        <span className="material-symbols-outlined text-[18px] text-[#8e8a9f] absolute left-3 top-1/2 -translate-y-1/2">
                          search
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleResetAll}
                        className="px-3.5 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                        title="Resetear todos los niveles oficiales (modo pruebas)"
                      >
                        <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                        <span className="hidden md:inline">Reset</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* TABLA PRINCIPAL CON INTERRUPTORES SWITCH Y ACCIONES CRUD */}
              <div className="card-academy overflow-hidden">
                <div className="p-4 px-6 border-b border-[#eceaf6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-white via-[#fbfbfb] to-[#f4f1fd]/50">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-[#2d2c38]">
                      Mostrando {paginatedStudents.length} de {filteredStudents.length} alumnos
                    </span>
                    {selectedEmails.length > 0 && (
                      <span className="px-3 py-1 rounded-full bg-[#e9e3ff] text-[#5446a8] font-black text-xs shadow-xs animate-scaleIn">
                        {selectedEmails.length} seleccionados
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Botón único maestro: Alternar Activo / Pausado de toda la sección o filtro */}
                    {filteredStudents.length > 0 && (() => {
                      const scopeEmails = selectedEmails.length > 0
                        ? selectedEmails
                        : filteredStudents.map(s => s.email).filter(Boolean)
                      const targetStudents = filteredStudents.filter(s => scopeEmails.includes(s.email))
                      const allActive = targetStudents.length > 0 && targetStudents.every(s => s.status === 'active')
                      const nextStatus = allActive ? 'pending' : 'active'
                      const count = targetStudents.length

                      return (
                        <button
                          type="button"
                          disabled={isBatchUpdatingStatus || count === 0}
                          onClick={() => handleBatchUpdateStatus(nextStatus, selectedEmails.length > 0 ? 'selected' : 'filtered')}
                          className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl border text-xs font-black shadow-xs transition-all cursor-pointer disabled:opacity-50 ${
                            allActive
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/20'
                              : 'bg-[#f4f1fd] hover:bg-[#e9e3ff] text-[#5446a8] border-[#e2e0ed]'
                          }`}
                          title={`Clic para ${allActive ? 'Pausar' : 'Activar'} todos los ${count} alumnos`}
                        >
                          <div className={`w-8 h-4.5 flex items-center rounded-full p-0.5 transition-all duration-200 pointer-events-none ${
                            allActive ? 'bg-white justify-end' : 'bg-[#8e8a9f] justify-start'
                          }`}>
                            <div className={`w-3.5 h-3.5 rounded-full shadow-xs ${
                              allActive ? 'bg-emerald-600' : 'bg-white'
                            }`}></div>
                          </div>
                          <span>
                            {isBatchUpdatingStatus
                              ? 'Actualizando...'
                              : allActive
                                ? `Todos Activos (${count})`
                                : `Pausados (${count}) - Clic para Activar`}
                          </span>
                        </button>
                      )
                    })()}

                    <span className="text-gray-300 hidden sm:inline">|</span>

                    {/* Botón para eliminar alumnos seleccionados */}
                    {selectedEmails.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleTriggerDeleteSectionOrSelected('selected')}
                        className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Eliminar los alumnos marcados con casilla"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                        <span>Eliminar ({selectedEmails.length})</span>
                      </button>
                    )}

                    {/* Botón para eliminar TODA la sección o filtro actual */}
                    {filteredStudents.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleTriggerDeleteSectionOrSelected('filtered')}
                        className="px-4 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        title={`Eliminar de una vez todos los ${filteredStudents.length} alumnos de esta sección`}
                      >
                        <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                        <span>Vaciar Sección ({filteredStudents.length})</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs md:text-sm">
                    <thead>
                      <tr className="border-b border-[#eceaf6] text-[11px] font-black uppercase text-[#8e8a9f] bg-[#fbfbfb]">
                        <th className="py-4 px-4 text-center w-10">
                          <input
                            type="checkbox"
                            checked={paginatedStudents.length > 0 && paginatedStudents.every(s => selectedEmails.includes(s.email))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const newEmails = Array.from(new Set([...selectedEmails, ...paginatedStudents.map(s => s.email)]))
                                setSelectedEmails(newEmails)
                              } else {
                                const pageEmails = new Set(paginatedStudents.map(s => s.email))
                                setSelectedEmails(selectedEmails.filter(em => !pageEmails.has(em)))
                              }
                            }}
                            className="rounded border-gray-300 text-[#8a70d6] focus:ring-[#8a70d6] cursor-pointer"
                            title="Seleccionar todos los de esta página"
                          />
                        </th>
                        <th className="py-4 px-4 font-black">Carnet</th>
                        <th className="py-4 px-4 font-black">Estudiante</th>
                        <th className="py-4 px-4 text-center font-black">Grado</th>
                        <th className="py-4 px-4 text-center font-black">Secc.</th>
                        <th className="py-4 px-4 text-center font-black">Especialidad</th>
                        <th className="py-4 px-4 font-black">Docente</th>
                        <th className="py-4 px-4 text-center font-black">Nivel Actual</th>
                        <th className="py-4 px-4 text-center font-black">Nivel Oficial</th>
                        <th className="py-4 px-4 text-center font-black">Estado</th>
                        <th className="py-4 px-4 text-right font-black">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eceaf6]/60">
                      {paginatedStudents.length === 0 ? (
                        <tr>
                          <td colSpan="11" className="py-14 text-center text-[#8e8a9f] text-xs italic">
                            No se encontraron alumnos con los criterios seleccionados.
                          </td>
                        </tr>
                      ) : (
                        paginatedStudents.map((s) => {
                          const isActive = s.status === 'active'
                          const isSelected = selectedEmails.includes(s.email)
                          const displayGrade = s.codigoGrado ? `${parseInt(s.codigoGrado, 10)}°` : (s.grade || '').match(/\d+/)?.[0] ? `${(s.grade || '').match(/\d+/)[0]}°` : s.grade

                          return (
                            <tr key={s.carnet || s.email} className={`table-academy-row ${isSelected ? 'bg-[#f4f1fd]' : ''}`}>
                              {/* Casilla de selección individual */}
                              <td className="py-3.5 px-4 text-center w-10">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedEmails(prev => [...prev, s.email])
                                    } else {
                                      setSelectedEmails(prev => prev.filter(em => em !== s.email))
                                    }
                                  }}
                                  className="rounded border-gray-300 text-[#8a70d6] focus:ring-[#8a70d6] cursor-pointer"
                                />
                              </td>
                              <td className="py-3.5 px-4 font-mono font-black text-[#5446a8]">{s.carnet || 'N/A'}</td>
                              <td className="py-3.5 px-4 font-bold text-[#2d2c38]">
                                <div className="flex items-center gap-2">
                                  <span>{s.name}</span>
                                  {s.selfReportedLevel && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black" title="Auto-reportado">
                                      Auto: {s.selfReportedLevel}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-[#8e8a9f] font-mono font-normal truncate max-w-xs">{s.email}</div>
                              </td>

                              {/* Columna: Grado (6°, 7°, 8°, 9°, 10°, 11°) */}
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <span className="inline-block px-3 py-1 rounded-xl bg-[#f4f1fd] font-black text-xs text-[#5446a8] border border-[#e2e0ed]">
                                  {displayGrade}
                                </span>
                              </td>

                              {/* Columna: Sección (A, B, C...) */}
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-[#e9e3ff] font-black text-xs text-[#5446a8]">
                                  {s.section || 'A'}
                                </span>
                              </td>

                              {/* Columna: Especialidad (General / Técnico / -) */}
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                {s.especialidad ? (
                                  <span className={`inline-block px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-wider border ${
                                    s.especialidad === 'Técnico'
                                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                                      : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  }`}>
                                    {s.especialidad}
                                  </span>
                                ) : (
                                  <span className="text-[#8e8a9f] text-xs font-semibold">-</span>
                                )}
                              </td>

                              {/* Columna: Docente */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {s.assignedTeacher ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2d2c38] bg-[#f8f7fc] px-2.5 py-1 rounded-xl border border-[#eceaf6]">
                                    <span>👩‍🏫</span>
                                    <span>{s.assignedTeacher}</span>
                                  </span>
                                ) : (
                                  <span className="text-[#8e8a9f] text-xs italic">Sin asignar</span>
                                )}
                              </td>

                              {/* Columna: Nivel Actual (Inicial) */}
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                {s.currentLevel && s.currentLevel !== 'Sin Nivel' ? (
                                  <span className="inline-block px-3 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    {s.currentLevel}
                                  </span>
                                ) : (
                                  <span className="text-[#8e8a9f] text-xs">-</span>
                                )}
                              </td>

                              {/* Columna: Nivel Oficial */}
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                {s.assignedLevel ? (
                                  <div className="inline-flex items-center gap-1.5">
                                    <span className="px-3 py-1 rounded-xl font-black text-xs bg-[#8a70d6] text-white shadow-xs">
                                      {s.assignedLevel}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleResetStudent(s)}
                                      className="p-1 rounded-lg text-[#8e8a9f] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                      title={`Resetear nivel de ${s.name} a Sin Evaluar`}
                                    >
                                      <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[#8e8a9f] text-xs">Sin evaluar</span>
                                )}
                              </td>

                              {/* INTERRUPTOR SWITCH DE ACCESO */}
                              <td className="py-3.5 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleToggleStatus(s.email, s.status)
                                  }}
                                  className={`inline-flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 rounded-2xl border transition-all ${
                                    isActive ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200'
                                  }`}
                                  title={isActive ? 'Clic para pausar acceso' : 'Clic para habilitar acceso'}
                                >
                                  <div className={`w-8 h-4.5 flex items-center rounded-full p-0.5 transition-all duration-200 pointer-events-none ${
                                    isActive ? 'bg-emerald-500 justify-end' : 'bg-gray-300 justify-start'
                                  }`}>
                                    <div className="bg-white w-3.5 h-3.5 rounded-full shadow-sm"></div>
                                  </div>
                                  <span className={`text-[11px] font-black pointer-events-none ${
                                    isActive ? 'text-emerald-700' : 'text-[#8e8a9f]'
                                  }`}>
                                    {isActive ? 'Activo' : 'Pausado'}
                                  </span>
                                </button>
                              </td>

                              {/* ACCIONES CRUD: EDITAR / ELIMINAR */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => onSwitchToStudentView?.(s)}
                                    className="p-1.5 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                                    title={`Abrir portal como ${s.name}`}
                                  >
                                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(s)}
                                    className="p-1.5 rounded-xl text-[#585567] hover:text-[#8a70d6] hover:bg-[#f4f1fd] transition-colors cursor-pointer"
                                    title="Editar datos"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(s.email, s.name)}
                                    className="p-1.5 rounded-xl text-[#8e8a9f] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
                <div className="p-4 px-6 border-t border-[#f4f3fa] flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
                  <span className="text-xs font-bold text-[#8e8a9f]">
                    Página <strong className="text-[#2d2c38]">{currentPage}</strong> de <strong className="text-[#2d2c38]">{totalPages}</strong> ({filteredStudents.length} total)
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(1)}
                      className="px-3 py-1.5 rounded-xl border border-[#e2e0ed] text-xs font-black text-[#585567] hover:bg-[#f8f7fc] disabled:opacity-30 cursor-pointer"
                      title="Primera página"
                    >
                      «
                    </button>
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="px-3.5 py-1.5 rounded-xl border border-[#e2e0ed] text-xs font-black text-[#585567] hover:bg-[#f8f7fc] disabled:opacity-30 cursor-pointer"
                    >
                      Anterior
                    </button>

                    <div className="flex items-center gap-1 mx-1.5">
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
                            className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center transition-all cursor-pointer ${
                              currentPage === pageNum
                                ? 'bg-[#8a70d6] text-white shadow-xs'
                                : 'text-[#585567] hover:bg-[#f8f7fc]'
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
                      className="px-3.5 py-1.5 rounded-xl border border-[#e2e0ed] text-xs font-black text-[#585567] hover:bg-[#f8f7fc] disabled:opacity-30 cursor-pointer"
                    >
                      Siguiente
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                      className="px-3 py-1.5 rounded-xl border border-[#e2e0ed] text-xs font-black text-[#585567] hover:bg-[#f8f7fc] disabled:opacity-30 cursor-pointer"
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
            <AnalyticsDashboard
              students={studentsList}
              evaluations={evaluations}
              academic={academic}
              onResetStudent={handleResetStudent}
            />
          )}

          {/* ================= SECCIÓN 2.6: CONFIGURACIÓN DINÁMICA DE GRADOS Y SECCIONES ================= */}
          {currentSection === 'academic_structure' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="card-academy p-6">
                <h2 className="font-heading font-black text-xl text-[#2d2c38]">
                  Configuración Dinámica de Grados y Secciones
                </h2>
                <p className="text-xs text-[#8e8a9f] mt-1">
                  Define las entidades escolares oficiales en Firestore. No están fijas en el código; puedes agregar o remover grados y secciones según la matrícula del año.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Panel 1: Grados Escolares */}
                <div className="card-academy p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-heading font-black text-base text-[#2d2c38] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#8a70d6] text-[20px]">school</span>
                        Grados Escolares ({academic.grades.length})
                      </h3>
                      <span className="text-[11px] text-[#8e8a9f]">Generan los botones ovalados de filtrado</span>
                    </div>
                  </div>

                  {/* Formulario Agregar Grado */}
                  <form onSubmit={handleAddGrade} className="p-4 rounded-2xl bg-[#f8f7fc] border border-[#e2e0ed] space-y-3">
                    <span className="text-xs font-black text-[#2d2c38] block">Agregar Nuevo Grado</span>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-[#8e8a9f] block mb-1">ID (Número)</label>
                        <input
                          type="text"
                          required
                          value={newGradeId}
                          onChange={(e) => setNewGradeId(e.target.value)}
                          placeholder="Ej: 5"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#e2e0ed] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#8a70d6]/30 text-[#2d2c38]"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-[#8e8a9f] block mb-1">Etiqueta Completa</label>
                        <input
                          type="text"
                          required
                          value={newGradeLabel}
                          onChange={(e) => setNewGradeLabel(e.target.value)}
                          placeholder="Ej: 5° Grado"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#e2e0ed] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#8a70d6]/30 text-[#2d2c38]"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSavingAcademic}
                      className="w-full py-2.5 rounded-xl bg-[#8a70d6] hover:bg-[#7a60c7] text-white font-black text-xs shadow-md shadow-[#8a70d6]/20 cursor-pointer transition-all"
                    >
                      {isSavingAcademic ? 'Guardando...' : '+ Crear Grado en Firestore'}
                    </button>
                  </form>

                  {/* Lista de Grados Existentes */}
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {academic.grades.map(g => (
                      <div key={g.id} className="p-3.5 rounded-2xl border border-[#eceaf6] flex items-center justify-between hover:bg-[#f8f7fc] transition-colors">
                        <div className="flex items-center gap-3 flex-1 mr-2">
                          <span className="w-8 h-8 rounded-xl bg-[#e9e3ff] text-[#5446a8] flex items-center justify-center font-black text-xs shrink-0">
                            {g.id}
                          </span>
                          {editingGradeId === g.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={editGradeLabel}
                                onChange={(e) => setEditGradeLabel(e.target.value)}
                                className="w-full px-3 py-1 text-xs rounded-xl border border-[#8a70d6] focus:outline-none font-bold text-[#2d2c38]"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div>
                              <span className="font-bold text-xs text-[#2d2c38] block">{g.label}</span>
                              <span className="text-[10px] text-[#8e8a9f] font-mono">ID: {g.id}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {editingGradeId === g.id ? (
                            <>
                              <button
                                type="button"
                                disabled={isSavingAcademic}
                                onClick={() => handleSaveEditGrade(g.id)}
                                className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-xl cursor-pointer"
                                title="Guardar cambios"
                              >
                                <span className="material-symbols-outlined text-[18px]">check</span>
                              </button>
                              <button
                                type="button"
                                disabled={isSavingAcademic}
                                onClick={handleCancelEditGrade}
                                className="text-[#8e8a9f] hover:bg-gray-100 p-1.5 rounded-xl cursor-pointer"
                                title="Cancelar"
                              >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEditGrade(g)}
                                className="text-[#8e8a9f] hover:text-[#8a70d6] hover:bg-[#f4f1fd] p-1.5 rounded-xl cursor-pointer"
                                title="Editar nombre de grado"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveGrade(g.id)}
                                className="text-[#8e8a9f] hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-xl cursor-pointer"
                                title="Eliminar grado"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Panel 2: Secciones Escolares */}
                <div className="card-academy p-6 space-y-4">
                  <div>
                    <h3 className="font-heading font-black text-base text-[#2d2c38] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#8a70d6] text-[20px]">grid_view</span>
                      Secciones Escolares ({academic.sections.length})
                    </h3>
                    <span className="text-[11px] text-[#8e8a9f]">Entidades de sección (A, B, C, etc.)</span>
                  </div>

                  {/* Formulario Agregar Sección */}
                  <form onSubmit={handleAddSection} className="p-4 rounded-2xl bg-[#f8f7fc] border border-[#e2e0ed] space-y-3">
                    <span className="text-xs font-black text-[#2d2c38] block">Agregar Nueva Sección</span>
                    <div>
                      <label className="text-[10px] font-bold text-[#8e8a9f] block mb-1">Letra o Código de Sección</label>
                      <input
                        type="text"
                        required
                        maxLength={3}
                        value={newSectionName}
                        onChange={(e) => setNewSectionName(e.target.value.toUpperCase())}
                        placeholder="Ej: E"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#e2e0ed] text-xs uppercase font-bold focus:outline-none focus:ring-2 focus:ring-[#8a70d6]/30 text-[#2d2c38]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSavingAcademic}
                      className="w-full py-2.5 rounded-xl bg-[#5446a8] hover:bg-[#413689] text-white font-black text-xs shadow-md shadow-[#5446a8]/20 cursor-pointer transition-all"
                    >
                      {isSavingAcademic ? 'Guardando...' : '+ Crear Sección en Firestore'}
                    </button>
                  </form>

                  {/* Lista de Secciones Existentes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
                    {academic.sections.map(sec => (
                      <div key={sec} className="p-3.5 rounded-2xl border border-[#eceaf6] flex items-center justify-between hover:bg-[#f8f7fc] transition-colors">
                        <div className="flex items-center gap-2.5 flex-1 mr-2">
                          <span className="w-8 h-8 rounded-xl bg-[#e9e3ff] text-[#5446a8] flex items-center justify-center font-black text-sm shrink-0">
                            {sec}
                          </span>
                          {editingSection === sec ? (
                            <input
                              type="text"
                              maxLength={3}
                              value={editSectionName}
                              onChange={(e) => setEditSectionName(e.target.value.toUpperCase())}
                              className="w-16 px-2 py-1 text-xs rounded-xl border border-[#8a70d6] font-bold uppercase focus:outline-none text-[#2d2c38]"
                              autoFocus
                            />
                          ) : (
                            <span className="font-bold text-xs text-[#2d2c38]">Sección {sec}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {editingSection === sec ? (
                            <>
                              <button
                                type="button"
                                disabled={isSavingAcademic}
                                onClick={() => handleSaveEditSection(sec)}
                                className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-xl cursor-pointer"
                                title="Guardar cambios"
                              >
                                <span className="material-symbols-outlined text-[18px]">check</span>
                              </button>
                              <button
                                type="button"
                                disabled={isSavingAcademic}
                                onClick={handleCancelEditSection}
                                className="text-[#8e8a9f] hover:bg-gray-100 p-1.5 rounded-xl cursor-pointer"
                                title="Cancelar"
                              >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEditSection(sec)}
                                className="text-[#8e8a9f] hover:text-[#8a70d6] hover:bg-[#f4f1fd] p-1.5 rounded-xl cursor-pointer"
                                title="Editar sección"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveSection(sec)}
                                className="text-[#8e8a9f] hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-xl cursor-pointer"
                                title="Eliminar sección"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN 3: GESTIÓN DE DOCENTES Y COORDINACIÓN */}
          {currentSection === 'teachers' && (
            <div className="card-academy p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="font-heading font-black text-xl text-[#2d2c38]">Equipo de Coordinación y Docentes</h2>
                  <p className="text-xs text-[#8e8a9f]">
                    Coordinadores y docentes con acceso autorizado para supervisar y aplicar entrevistas diagnósticas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2.5 rounded-2xl bg-[#8a70d6] text-white text-xs font-black hover:bg-[#7a60c7] shadow-md shadow-[#8a70d6]/25 flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <span className="material-symbols-outlined text-[16px]">person_add</span>
                  <span>+ Agregar Docente / Coordinador</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-[#eceaf6] text-[11px] font-black uppercase text-[#8e8a9f]">
                      <th className="pb-3.5 px-4 font-black">Usuario / Nombre</th>
                      <th className="pb-3.5 px-4 font-black">Correo Institucional</th>
                      <th className="pb-3.5 px-4 text-center font-black">Rol Asignado</th>
                      <th className="pb-3.5 px-4 text-center font-black">Estado</th>
                      <th className="pb-3.5 px-4 text-right font-black">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eceaf6]/60">
                    {teachersList.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-12 text-center text-[#8e8a9f] text-xs italic">
                          No hay docentes ni coordinadores registrados todavía.
                        </td>
                      </tr>
                    ) : (
                      teachersList.map((t) => (
                        <tr key={t.email} className="table-academy-row">
                          <td className="py-3.5 px-4 font-bold text-[#2d2c38]">
                            <div className="flex items-center gap-2.5">
                              {t.photoUrl ? (
                                <img
                                  src={t.photoUrl}
                                  alt={t.name}
                                  className="w-9 h-9 rounded-xl object-cover ring-2 ring-[#8a70d6]/20 shrink-0"
                                />
                              ) : (
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                  t.role === 'coordination'
                                    ? 'bg-[#e9e3ff] text-[#5446a8]'
                                    : t.role === 'admin'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-[#f4f1fd] text-[#8a70d6]'
                                }`}>
                                  {t.name ? t.name.substring(0, 2).toUpperCase() : 'TC'}
                                </div>
                              )}
                              <div>
                                <span className="block font-bold text-[#2d2c38]">{t.name}</span>
                                <span className="text-[10px] text-[#8e8a9f] font-normal">{t.specialty || t.area || 'Departamento de Idiomas'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-[#8e8a9f] font-mono text-xs">{t.email}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-black ${
                              t.role === 'coordination'
                                ? 'bg-amber-100 text-amber-800'
                                : t.role === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-[#e9e3ff] text-[#5446a8]'
                            }`}>
                              {t.role === 'admin' ? 'Super Admin' : t.role === 'coordination' ? 'Coordinación' : 'Docente'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-[11px] font-black ${
                              t.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {t.status === 'active' ? 'Activo' : 'Pausado'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(t.email, t.status)}
                                className={`px-2.5 py-1 rounded-xl text-xs font-black transition-colors cursor-pointer ${
                                  t.status === 'active'
                                    ? 'text-amber-700 hover:bg-amber-50'
                                    : 'text-emerald-700 hover:bg-emerald-50'
                                }`}
                                title={t.status === 'active' ? 'Pausar acceso' : 'Habilitar acceso'}
                              >
                                {t.status === 'active' ? 'Pausar' : 'Activar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(t)}
                                className="p-1.5 rounded-xl text-[#585567] hover:text-[#8a70d6] hover:bg-[#f4f1fd] transition-colors cursor-pointer"
                                title="Editar datos o rol"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              {t.email !== user?.email && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(t.email, t.name)}
                                  className="p-1.5 rounded-xl text-[#8e8a9f] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Eliminar usuario"
                                >
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECCIÓN: MÓDULOS ACTIVOS PARA COORDINACIONES */}
          {currentSection === 'coordination_modules' && (
            <div className="space-y-6">
              <div className="card-academy p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[24px] text-[#8a70d6]">admin_panel_settings</span>
                    <h2 className="font-heading font-black text-xl text-[#2d2c38]">
                      Activación de Módulos para Coordinaciones
                    </h2>
                  </div>
                  <p className="text-xs text-[#8e8a9f] mt-1 max-w-2xl leading-relaxed">
                    Controla qué vistas, herramientas y permisos institucionales están habilitados para los usuarios con rol de <strong>Coordinación Académica</strong> (<span className="font-mono text-[#5446a8] font-bold">coordinacion.academica@salesianosanjose.edu.sv</span>).
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleBatchToggleModules(true)}
                    disabled={isSavingModules}
                    className="px-4 py-2.5 rounded-2xl bg-[#8a70d6] hover:bg-[#7a60c7] text-white text-xs font-black transition-all shadow-md shadow-[#8a70d6]/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Habilitar Todos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBatchToggleModules(false)}
                    disabled={isSavingModules}
                    className="px-4 py-2.5 rounded-2xl bg-[#f8f7fc] hover:bg-[#f4f1fd] text-[#585567] text-xs font-black transition-all border border-[#e2e0ed] flex items-center gap-2 cursor-pointer disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">block</span>
                    <span>Pausar Todos</span>
                  </button>
                </div>
              </div>

              {/* Grid de Tarjetas de Módulos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(coordinationModules).map((mod) => {
                  const isEnabled = mod.enabled !== false
                  return (
                    <div
                      key={mod.id}
                      className={`card-academy p-5 flex items-start justify-between gap-4 hover:-translate-y-1 ${
                        isEnabled
                          ? 'border-[#eceaf6]'
                          : 'bg-[#fbfbfb] border-[#e2e0ed] opacity-80'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 flex-1">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                          isEnabled
                            ? 'bg-[#e9e3ff] text-[#5446a8]'
                            : 'bg-slate-100 text-[#8e8a9f]'
                        }`}>
                          <span className="material-symbols-outlined text-[24px]">
                            {mod.icon || 'view_module'}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-heading font-black text-sm text-[#2d2c38]">
                              {mod.label}
                            </h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isEnabled
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}>
                              {isEnabled ? 'Habilitado' : 'Desactivado'}
                            </span>
                          </div>
                          <p className="text-xs text-[#8e8a9f] mt-1 leading-relaxed">
                            {mod.desc}
                          </p>
                          <div className="mt-2.5 flex items-center gap-2">
                            <span className="text-[10px] font-mono text-[#8e8a9f] bg-[#f8f7fc] px-2 py-0.5 rounded-md">
                              Módulo ID: {mod.id}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Switch Toggle */}
                      <button
                        type="button"
                        disabled={isSavingModules}
                        onClick={() => handleToggleModulePermission(mod.id)}
                        className={`cursor-pointer select-none p-1 rounded-full transition-all shrink-0 ${
                          isEnabled ? 'bg-[#8a70d6]' : 'bg-gray-300'
                        }`}
                        title={isEnabled ? 'Clic para desactivar módulo' : 'Clic para activar módulo'}
                      >
                        <div className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-all duration-200 ${
                          isEnabled ? 'justify-end' : 'justify-start'
                        }`}>
                          <div className="bg-white w-5 h-5 rounded-full shadow-md"></div>
                        </div>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* SECCIÓN 4: PONDERACIONES Y CORTES DIAGNÓSTICO 2026 */}
          {currentSection === 'thresholds' && (
            <DiagnosticConfigManager canEdit={true} />
          )}

          {/* SECCIÓN 5: REPORTES Y AUDITORÍA DE CIERRES */}
          {currentSection === 'reports' && (
            <div className="space-y-6">
              <div className="card-academy p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="font-heading font-black text-xl text-[#2d2c38] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#8a70d6] text-[24px]">assessment</span>
                      <span>Cierre y Reportes de Nivelación</span>
                    </h2>
                    <p className="text-xs text-[#8e8a9f] mt-0.5">
                      Generación de sábanas de notas y actas de ubicación oficial de los estudiantes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalNotice({
                      isOpen: true,
                      type: 'info',
                      title: 'Generación de Reporte',
                      message: 'El reporte consolidado de nivelación oficial 2026 se está preparando con los datos actualizados de Firestore.',
                      confirmText: 'Entendido',
                      onConfirm: () => setModalNotice(null)
                    })}
                    className="px-5 py-2.5 rounded-2xl bg-[#8a70d6] text-white text-xs font-black hover:bg-[#7a60c7] shadow-md shadow-[#8a70d6]/20 flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    <span>Descargar Reporte General</span>
                  </button>
                </div>
              </div>

              {/* BITÁCORA Y REGISTRO AUDITOR DE CIERRES DE GRADO POR DOCENTES */}
              <div className="bg-white rounded-3xl p-6 border border-[#eceaf6] shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[#f4f3fa]">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#e9e3ff] text-[#5446a8] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[24px]">history_edu</span>
                    </div>
                    <div>
                      <h3 className="font-heading font-black text-base text-[#2d2c38] flex items-center gap-2">
                        <span>Historial y Bitácora de Cierres de Grado</span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#f4f1fd] text-[#5446a8]">
                          {(dispatchConfig?.closureLogs || []).length} registros
                        </span>
                      </h3>
                      <p className="text-xs text-[#8e8a9f]">
                        Auditoría en tiempo real de cuándo y qué docente finalizó la evaluación (Plataforma / Oral) para cada grado.
                      </p>
                    </div>
                  </div>
                </div>

                {(!dispatchConfig?.closureLogs || dispatchConfig.closureLogs.length === 0) ? (
                  <div className="py-12 text-center text-[#8e8a9f] space-y-2">
                    <span className="material-symbols-outlined text-4xl text-[#8e8a9f]/50">lock_clock</span>
                    <p className="text-xs font-bold">No hay registros de cierre todavía. Cuando un docente finalice una prueba por grado, aparecerá aquí.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-[#eceaf6]">
                    <table className="w-full text-left text-xs text-[#2d2c38]">
                      <thead className="bg-[#fbfbfb] text-[11px] font-black uppercase text-[#8e8a9f] border-b border-[#eceaf6]">
                        <tr>
                          <th className="py-3.5 px-4">Fecha y Hora</th>
                          <th className="py-3.5 px-4">Grado Cerrado</th>
                          <th className="py-3.5 px-4">Instrumento / Tipo</th>
                          <th className="py-3.5 px-4">Docente Responsable</th>
                          <th className="py-3.5 px-4">Correo</th>
                          <th className="py-3.5 px-4 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f4f3fa] font-medium">
                        {dispatchConfig.closureLogs.map((log) => {
                          const dateObj = log.closedAt ? new Date(log.closedAt) : null;
                          const formattedDate = dateObj
                            ? dateObj.toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + dateObj.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })
                            : 'Fecha no registrada';

                          return (
                            <tr key={log.id} className="hover:bg-[#fbfbfb] transition-colors">
                              <td className="py-3.5 px-4 font-mono text-[11px] text-[#8e8a9f]">
                                {formattedDate}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="px-2.5 py-1 rounded-xl font-black text-xs bg-[#f4f1fd] text-[#5446a8] border border-[#e2e0ed]">
                                  {log.gradeLabel || (log.grade + '° Grado')}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black " + (
                                  log.rawType === 'platform'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-[#e9e3ff] text-[#5446a8]'
                                )}>
                                  <span className="material-symbols-outlined text-[14px]">
                                    {log.rawType === 'platform' ? 'desktop_windows' : 'record_voice_over'}
                                  </span>
                                  <span>{log.examType}</span>
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-bold text-[#2d2c38]">
                                {log.closedBy || 'Docente'}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-[11px] text-[#8e8a9f]">
                                {log.closedByEmail || '—'}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700">
                                  Finalizado
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
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
                  <label className="block text-xs font-bold text-[#585567] mb-1.5">Rol de Usuario</label>
                  <div className="flex items-center gap-1.5 p-1 bg-[#f8f7fc] rounded-2xl border border-[#e2e0ed]">
                    {[
                      { id: 'student', label: 'Alumno', icon: 'school' },
                      { id: 'teacher', label: 'Docente', icon: 'person' },
                      { id: 'coordination', label: 'Coordinación', icon: 'manage_accounts' }
                    ].map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, role: r.id })}
                        className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          formData.role === r.id
                            ? 'bg-[#8a70d6] text-white shadow-xs'
                            : 'text-[#585567] hover:text-[#2d2c38] hover:bg-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">{r.icon}</span>
                        <span>{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#585567] mb-1">Correo Institucional</label>
                <input
                  type="email"
                  required
                  disabled={Boolean(editingUser)}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ejemplo@salesianosanjose.edu.sv"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#f8f7fc] border border-[#e2e0ed] text-xs font-medium focus:ring-2 focus:ring-[#8a70d6]/30 focus:outline-none disabled:bg-gray-100 text-[#2d2c38]"
                />
              </div>

              {formData.role === 'student' && (
                <div className="space-y-4 pt-2 border-t border-[#f4f3fa]">
                  {/* Selector de Grado con Toggles Ovalados */}
                  <div>
                    <label className="block text-xs font-bold text-[#585567] mb-1.5">
                      Grado Académico ({formData.grade})
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(academic.grades && academic.grades.length > 0 ? academic.grades : [
                        { id: '6', label: '6°' },
                        { id: '7', label: '7°' },
                        { id: '8', label: '8°' },
                        { id: '9', label: '9°' },
                        { id: '10', label: '10°' },
                        { id: '11', label: '11°' },
                        { id: '12', label: '12°' }
                      ]).map(g => {
                        const gradeVal = `${parseInt(g.id, 10)}°`
                        const isSelected = formData.grade === gradeVal || (formData.grade || '').includes(g.id)
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              const num = String(parseInt(g.id, 10))
                              const isBachi = ['10', '11', '12'].includes(num)
                              setFormData({
                                ...formData,
                                grade: `${num}°`,
                                especialidad: isBachi ? (formData.especialidad || 'General') : null
                              })
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#8a70d6] text-white shadow-xs'
                                : 'bg-[#f8f7fc] text-[#585567] hover:bg-[#f4f1fd] border border-[#e2e0ed]'
                            }`}
                          >
                            {parseInt(g.id, 10)}°
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Selector de Sección con Toggles Circulares */}
                  <div>
                    <label className="block text-xs font-bold text-[#585567] mb-1.5">
                      Sección ({formData.section || 'A'})
                    </label>
                    <div className="flex items-center gap-2">
                      {(academic.sections && academic.sections.length > 0 ? academic.sections : ['A', 'B', 'C', 'D']).map(sec => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setFormData({ ...formData, section: sec })}
                          className={`w-9 h-9 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                            formData.section === sec
                              ? 'bg-[#5446a8] text-white shadow-xs'
                              : 'bg-[#f8f7fc] text-[#585567] hover:bg-[#f4f1fd] border border-[#e2e0ed]'
                          }`}
                        >
                          {sec}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Especialidad de Bachillerato con Toggles */}
                  {['10', '11', '12'].some(id => (formData.grade || '').includes(id)) && (
                    <div className="p-3.5 bg-[#f4f1fd] rounded-2xl border border-[#e2e0ed] space-y-2">
                      <label className="block text-xs font-black text-[#5446a8]">
                        Especialidad de Bachillerato
                      </label>
                      <div className="flex items-center gap-2">
                        {['General', 'Técnico'].map(esp => (
                          <button
                            key={esp}
                            type="button"
                            onClick={() => setFormData({ ...formData, especialidad: esp })}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                              formData.especialidad === esp
                                ? 'bg-[#8a70d6] text-white shadow-xs'
                                : 'bg-white text-[#585567] border border-[#e2e0ed] hover:bg-[#f8f7fc]'
                            }`}
                          >
                            {esp}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl text-xs font-black text-[#585567] hover:bg-[#f8f7fc] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-[#8a70d6] hover:bg-[#7a60c7] text-white text-xs font-black shadow-md shadow-[#8a70d6]/25 transition-all cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL DE CONFIRMACIÓN: ELIMINAR USUARIO ================= */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-4xl p-7 max-w-md w-full shadow-2xl border border-[#eceaf6] space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[26px]">delete_forever</span>
              </div>
              <div>
                <h3 className="font-heading font-black text-base text-[#2d2c38]">
                  ¿Eliminar este usuario?
                </h3>
                <p className="text-xs text-[#8e8a9f]">
                  Esta acción removerá al alumno de la nómina y de la base de datos de Firebase.
                </p>
              </div>
            </div>

            <div className="p-4 bg-[#f8f7fc] rounded-2xl border border-[#e2e0ed] text-xs space-y-1">
              <div className="font-bold text-[#2d2c38]">{userToDelete.name}</div>
              <div className="font-mono text-[#8e8a9f] text-[11px] truncate">{userToDelete.email}</div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#f4f3fa]">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-black text-[#585567] hover:bg-[#f8f7fc] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isDeleting ? 'progress_activity' : 'delete'}
                </span>
                <span>{isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DE CONFIRMACIÓN: ELIMINACIÓN MASIVA O SECCIÓN ================= */}
      {batchDeleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-4xl p-7 max-w-md w-full shadow-2xl border border-[#eceaf6] space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[26px]">folder_delete</span>
              </div>
              <div>
                <h3 className="font-heading font-black text-base text-[#2d2c38]">
                  {batchDeleteTarget.title}
                </h3>
                <p className="text-xs text-[#8e8a9f]">
                  {batchDeleteTarget.description}
                </p>
              </div>
            </div>

            <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-100 text-xs space-y-2">
              <div className="flex items-center justify-between text-rose-800 font-bold">
                <span>Total de estudiantes a eliminar:</span>
                <span className="text-sm px-2.5 py-0.5 bg-rose-200 text-rose-900 rounded-xl font-black">
                  {batchDeleteTarget.emails.length}
                </span>
              </div>
              <p className="text-[11px] text-rose-600 font-medium">
                ⚠️ Esta acción es irreversible. Se eliminarán de Firebase y de los listados activos de evaluación.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#f4f3fa]">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setBatchDeleteTarget(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-black text-[#585567] hover:bg-[#f8f7fc] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmBatchDelete}
                className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isDeleting ? 'progress_activity' : 'delete_sweep'}
                </span>
                <span>{isDeleting ? 'Eliminando en lote...' : 'Sí, Eliminar Todos'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL UNIVERSAL PARA AVISOS Y CONFIRMACIONES */}
      {modalNotice && (
        <ActionModal
          isOpen={modalNotice.isOpen}
          type={modalNotice.type}
          title={modalNotice.title}
          message={modalNotice.message}
          confirmText={modalNotice.confirmText}
          cancelText={modalNotice.cancelText}
          onConfirm={modalNotice.onConfirm}
          onCancel={modalNotice.onCancel || (() => setModalNotice(null))}
          isLoading={modalNotice.isLoading}
        />
      )}
    </div>
  )
}
