import React, { useState, useEffect } from 'react'
import { db, isFirebaseConfigured } from '../../lib/firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { getUserProfile, sanitizeDocId, getExams, subscribeExamDispatch, saveResult } from '../../lib/dataService'
import Sidebar from '../shared/Sidebar'
import QuestionPlayer, { QUESTION_CHECKERS } from './QuestionPlayer'
import AudioGroupPlayer from './AudioGroupPlayer'
import { OFFICIAL_DIAGNOSTIC_EXAMS } from '../../data/officialExamsData'

export default function StudentGamifiedExam({ student: propStudent, onLogout }) {
  const [currentStudent, setCurrentStudent] = useState(propStudent || {})
  const [currentSection, setCurrentSection] = useState('interview')
  const [collapsed, setCollapsed] = useState(false)

  // Datos consolidados del alumno en sesión
  const student = currentStudent?.email ? currentStudent : (propStudent || {})
  const storageKey = `el_completed_exams_${student.email || student.carnet || 'student'}`
  const [completedExams, setCompletedExams] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  // Estado de la batería de pruebas y reactivos
  const [examsList, setExamsList] = useState(OFFICIAL_DIAGNOSTIC_EXAMS)
  const [loadingExams, setLoadingExams] = useState(false)
  const [activeExam, setActiveExam] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [examTimeLeft, setExamTimeLeft] = useState(0)

  // Respuestas persistidas para que no se pierdan al pausar, salir a receso o recargar
  const answersStorageKey = `el_draft_answers_${student.email || student.carnet || 'student'}`
  const [studentAnswers, setStudentAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem(answersStorageKey)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  // Configuración de Habilitación por Grado/Sección y Pausa General de los Docentes
  const [dispatchConfig, setDispatchConfig] = useState({
    enabledGrades: ['all'],
    enabledSections: ['all'],
    isPaused: false,
    pausedAt: null,
    pauseReason: 'receso',
    globalTimeLimitMinutes: 90,
    gradesControl: {},
    studentOverrides: {}
  })

  // Escuchar configuración de habilitación y pausa en tiempo real
  useEffect(() => {
    const unsub = subscribeExamDispatch((cfg) => {
      if (cfg) setDispatchConfig(cfg)
    })
    return () => unsub()
  }, [])

  // Detectar clave de grado normalizada del alumno ('7', '8', '9', '10', '11', '12')
  const studentGradeKey = (() => {
    const gStr = (student.grade || '') + ' ' + (student.codigoGrado || '')
    if (gStr.includes('7°') || student.codigoGrado === '07') return '7'
    if (gStr.includes('8°') || student.codigoGrado === '08') return '8'
    if (gStr.includes('9°') || student.codigoGrado === '09') return '9'
    if (gStr.includes('10°') || gStr.includes('1° Bach') || student.codigoGrado === '10') return '10'
    if (gStr.includes('11°') || gStr.includes('2° Bach') || student.codigoGrado === '11') return '11'
    if (gStr.includes('12°') || gStr.includes('3° Bach') || student.codigoGrado === '32') return '12'
    if (gStr.includes('6°') || student.codigoGrado === '06') return '6'
    return '7'
  })()

  // Comprobar override individual de este alumno
  const studentOverride = (() => {
    const clean = sanitizeDocId(student.email)
    const overrides = dispatchConfig.studentOverrides || {}
    return overrides[clean] || overrides[(student.email || '').toLowerCase()] || null
  })()

  // Estado del grado en controles maestros
  const gradeControl = dispatchConfig.gradesControl?.[studentGradeKey] || {
    platformStatus: 'paused',
    interviewStatus: 'paused'
  }

  // ¿Está la plataforma activa, pausada o finalizada para este alumno?
  const isPlatformFinishedForStudent = studentOverride?.platformStatus === 'finished' || gradeControl.platformStatus === 'finished'

  const isPlatformActiveForStudent = (() => {
    // 1. Si hay override individual activo, tiene prioridad directa
    if (studentOverride && studentOverride.platformStatus) {
      return studentOverride.platformStatus === 'active'
    }
    // 2. Si el grado está finalizado
    if (gradeControl.platformStatus === 'finished') return false
    // 3. Si el grado está en pausa
    if (gradeControl.platformStatus === 'paused') return false
    // 4. Si hay pausa global
    if (dispatchConfig.isPaused) return false
    // 5. Si está activo en el grado
    return gradeControl.platformStatus === 'active'
  })()

  // Pausa efectiva para congelar temporizador y mostrar modal
  const isPlatformPausedForStudent = !isPlatformActiveForStudent && !isPlatformFinishedForStudent

  // Estado de entrevista oral habilitada para este alumno
  const isInterviewActiveForStudent = (() => {
    if (studentOverride && studentOverride.interviewStatus) {
      return studentOverride.interviewStatus === 'active'
    }
    return gradeControl.interviewStatus === 'active'
  })()

  const [tabSwitchWarnings, setTabSwitchWarnings] = useState(0)
  const [examIncidents, setExamIncidents] = useState([])
  const [securityModalVisible, setSecurityModalVisible] = useState(false)
  const [securityNotice, setSecurityNotice] = useState('')

  // 1. Escuchar perfil del alumno en tiempo real
  useEffect(() => {
    if (!student?.email) return
    const docId = sanitizeDocId(student.email)

    if (isFirebaseConfigured()) {
      const unsub = onSnapshot(doc(db, 'users', docId), (docSnap) => {
        if (docSnap.exists()) {
          const freshData = docSnap.data()
          setCurrentStudent(prev => ({ ...prev, ...freshData }))
          if (freshData.completedExams) {
            setCompletedExams(prev => ({ ...prev, ...freshData.completedExams }))
          }
        }
      }, (err) => {
        console.warn('Error en listener tiempo real Firestore:', err)
      })
      return () => unsub()
    } else {
      getUserProfile(student.email).then(data => {
        if (data) {
          setCurrentStudent(prev => ({ ...prev, ...data }))
          if (data.completedExams) {
            setCompletedExams(prev => ({ ...prev, ...data.completedExams }))
          }
        }
      })
    }
  }, [student?.email])

  // 2. Cargar la batería oficial de exámenes configurada por los docentes
  useEffect(() => {
    loadBatteryExams()
  }, [])

  const loadBatteryExams = async () => {
    setLoadingExams(true)
    try {
      const all = await getExams()
      const list = (all && all.length > 0) ? all : OFFICIAL_DIAGNOSTIC_EXAMS
      setExamsList(list)
    } catch (e) {
      console.warn('Error cargando batería de exámenes para alumno:', e)
      setExamsList(OFFICIAL_DIAGNOSTIC_EXAMS)
    } finally {
      setLoadingExams(false)
    }
  }

  // 3. Temporizador regresivo sincronizado para el test activo (Se congela si el docente pausa la evaluación o el grado está pausado)
  useEffect(() => {
    if (!activeExam || examTimeLeft <= 0 || isPlatformPausedForStudent || isPlatformFinishedForStudent) return
    const timer = setInterval(() => {
      setExamTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleFinishActiveExam(activeExam.id, true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [activeExam, examTimeLeft > 0, isPlatformPausedForStudent, isPlatformFinishedForStudent])

  // 4. DETECCIÓN DE CAMBIO DE PESTAÑA / VENTANA (Anti-trampa)
  useEffect(() => {
    if (!activeExam) return

    const logIncident = (type, description) => {
      const incident = {
        type,
        description,
        timestamp: new Date().toISOString(),
        examId: activeExam.id,
        examTitle: activeExam.title || activeExam.id,
        questionIndex: currentQuestionIndex + 1
      }
      setExamIncidents(prev => [...prev, incident])
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logIncident('tab_switch', 'Cambió de pestaña o minimizó el navegador')
        setTabSwitchWarnings(prev => {
          const newCount = prev + 1
          setSecurityNotice(
            `⚠️ ALERTA DE SEGURIDAD #${newCount}: Has cambiado de pestaña o minimizado la ventana del examen. Esta incidencia queda registrada en tu bitácora de evaluación para revisión docente.`
          )
          setSecurityModalVisible(true)
          return newCount
        })
      }
    }

    const handleWindowBlur = () => {
      if (document.hidden) return // ya cubierto por visibilitychange
      logIncident('window_blur', 'Perdió el foco de la pantalla del examen (abrió otra app o ventana)')
      setTabSwitchWarnings(prev => {
        const newCount = prev + 1
        setSecurityNotice(
          `⚠️ ALERTA DE SEGURIDAD #${newCount}: Saliste del foco del examen hacia otra ventana o aplicación. Por favor permanece dentro de la prueba.`
        )
        setSecurityModalVisible(true)
        return newCount
      })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleWindowBlur)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [activeExam, currentQuestionIndex])

  // 5. PROTECCIÓN CONTRA ATAJOS DE TECLADO (Copiar, Cortar, Captura de pantalla, Inspeccionar)
  useEffect(() => {
    if (!activeExam) return

    const handleKeyDown = (e) => {
      // Bloquear teclas de captura de pantalla: PrintScreen
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault()
        setSecurityNotice('🔒 Acción denegada: Las capturas de pantalla están estrictamente bloqueadas durante la evaluación.')
        setSecurityModalVisible(true)
        if (navigator.clipboard) {
          navigator.clipboard.writeText('').catch(() => {})
        }
        return false
      }

      // Bloquear Ctrl+C (Copiar), Ctrl+X (Cortar), Ctrl+U (Ver código fuente), Ctrl+Shift+I / F12 (Inspeccionar)
      if (
        (e.ctrlKey || e.metaKey) &&
        ['c', 'C', 'x', 'X', 'u', 'U', 's', 'S', 'p', 'P'].includes(e.key)
      ) {
        e.preventDefault()
        setSecurityNotice(`🔒 Acción restringida: La combinación Ctrl+${e.key.toUpperCase()} está inhabilitada por protocolo de seguridad.`)
        setSecurityModalVisible(true)
        return false
      }

      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key))) {
        e.preventDefault()
        setSecurityNotice('🔒 El acceso a herramientas de inspección técnica se encuentra bloqueado.')
        setSecurityModalVisible(true)
        return false
      }
    }

    const handleContextMenu = (e) => {
      e.preventDefault()
      return false
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('contextmenu', handleContextMenu)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [activeExam])

  // Iniciar un examen de la batería (solo si no ha sido completado)
  const handleStartExam = (exam) => {
    if (completedExams[exam.id]) {
      alert('🔒 Ya has enviado y completado este test previamente. Por directriz académica, cada instrumento de la prueba solo puede presentarse una vez.')
      return
    }
    setActiveExam(exam)
    setCurrentQuestionIndex(0)
    const minutes = exam.timeLimitMinutes || 15
    setExamTimeLeft(minutes * 60)
  }

  // Guardar respuesta del alumno en silencio y persistir en localStorage para proteger ante recarga/pausa
  const handleAnswerChange = (examId, qId, answerValue) => {
    setStudentAnswers(prev => {
      const updated = {
        ...prev,
        [examId]: {
          ...(prev[examId] || {}),
          [qId]: answerValue
        }
      }
      try {
        localStorage.setItem(answersStorageKey, JSON.stringify(updated))
      } catch (e) {
        console.warn('Error guardando borrador de respuesta:', e)
      }
      return updated
    })
  }

  // Finalizar y enviar examen de manera definitiva
  // Finalizar y enviar examen de manera definitiva, guardando todas las respuestas de cada pregunta
  const handleFinishActiveExam = async (examId, byTimeout = false) => {
    const currentExam = examsList.find(e => e.id === examId) || activeExam || {}
    const examQuestions = currentExam.questions || []
    const rawAnswers = studentAnswers[examId] || {}

    // Desglosar cada pregunta con la respuesta seleccionada por el estudiante y su corrección
    const detailedResponses = examQuestions.map((q, idx) => {
      const studentAns = rawAnswers[q.id]
      const checker = QUESTION_CHECKERS[q.type]
      const isCorrect = checker ? checker(q, studentAns) : false

      let expectedDisplay = ''
      if (q.type === 'multipleChoice' || q.type === 'listening') {
        expectedDisplay = q.options?.[q.correctIndex] ?? q.correctIndex
      } else if (q.type === 'trueFalse') {
        const expBool = q.isTrue !== undefined ? q.isTrue : q.correct
        expectedDisplay = expBool ? 'True' : 'False'
      } else if (q.type === 'orderSentence') {
        expectedDisplay = q.correctSentence || (q.words || []).join(' ')
      } else if (q.type === 'fillParagraph') {
        expectedDisplay = (q.blanks || []).map(b => b.answer).join(', ')
      } else if (q.type === 'writing') {
        expectedDisplay = q.acceptedAnswers?.[0] || ''
      } else if (q.type === 'speaking') {
        expectedDisplay = q.targetText || ''
      }

      let studentDisplay = studentAns
      if (studentAns != null) {
        if (q.type === 'orderSentence' && Array.isArray(studentAns)) {
          studentDisplay = studentAns.map(i => q.words?.[i] ?? i).join(' ')
        } else if ((q.type === 'multipleChoice' || q.type === 'listening') && typeof studentAns === 'number') {
          studentDisplay = q.options?.[studentAns] ?? studentAns
        } else if (q.type === 'trueFalse' && typeof studentAns === 'boolean') {
          studentDisplay = studentAns ? 'True' : 'False'
        }
      }

      return {
        questionId: q.id || `q_${idx}`,
        questionIndex: idx + 1,
        prompt: q.prompt || q.question || '',
        statement: q.statement || '',
        type: q.type || 'multipleChoice',
        level: q.level || currentExam.level || 'A1-C1',
        studentAnswer: studentDisplay != null ? studentDisplay : null,
        expectedAnswer: expectedDisplay,
        isCorrect: Boolean(isCorrect)
      }
    })

    const correctCount = detailedResponses.filter(r => r.isCorrect).length
    const totalQuestions = detailedResponses.length
    const scorePct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0

    const examSummary = {
      completedAt: new Date().toISOString(),
      byTimeout: Boolean(byTimeout),
      warningsCount: tabSwitchWarnings,
      incidents: examIncidents,
      examTitle: currentExam.title || examId,
      level: currentExam.level || 'A1-C1',
      weight: currentExam.weight || 15,
      correctCount,
      totalQuestions,
      score: scorePct,
      answers: rawAnswers,
      questionResponses: detailedResponses
    }

    const updatedCompleted = {
      ...completedExams,
      [examId]: examSummary
    }

    setCompletedExams(updatedCompleted)
    setActiveExam(null)
    setExamIncidents([])

    // Persistir localmente de inmediato para que no pueda volver a presentarlo al recargar
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedCompleted))
    } catch (e) {
      console.warn('Error guardando examen completado en localStorage:', e)
    }

    // Persistir en Firestore en el perfil del alumno y en la colección results
    if (student.email) {
      try {
        const docId = sanitizeDocId(student.email)
        if (isFirebaseConfigured()) {
          // 1. Guardar en users/{studentId}
          await setDoc(doc(db, 'users', docId), { completedExams: updatedCompleted }, { merge: true })

          // 2. Guardar en results/{resId} para historial y reportes
          const resultPayload = {
            id: `res_${docId}_${examId}`,
            studentEmail: student.email,
            studentName: student.name || '',
            studentCarnet: student.carnet || '',
            studentGrade: student.grade || student.codigoGrado || '',
            studentSection: student.section || '',
            examId,
            examTitle: currentExam.title || examId,
            level: currentExam.level || 'A1-C1',
            score: scorePct,
            correctCount,
            totalQuestions,
            warningsCount: tabSwitchWarnings,
            incidents: examIncidents,
            answers: rawAnswers,
            questionResponses: detailedResponses,
            completedAt: examSummary.completedAt
          }
          await saveResult(resultPayload)
        }
      } catch (err) {
        console.warn('Error guardando finalización en Firestore:', err)
      }
    }
  }

  // Formatear segundos a mm:ss
  const formatSeconds = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Cálculo de tiempo total acumulado de toda la batería asignada por los docentes
  const totalBatteryMinutes = examsList.reduce((acc, ex) => acc + (ex.timeLimitMinutes || 15), 0)
  const totalBatteryQuestions = examsList.reduce((acc, ex) => acc + (ex.questions?.length || 0), 0)
  const totalCompletedCount = Object.keys(completedExams).length

  const allTestsCompleted = examsList.length > 0 && totalCompletedCount >= examsList.length
  // El nivel oficial solo se publica al alumno si el docente ya lo asignó Y el alumno terminó todos sus tests
  const isPlacementFullyConcluded = Boolean(student.assignedLevel) && allTestsCompleted

  // Verificar si el grado y sección de este alumno están autorizados por las teachers y activos
  const isStudentAuthorizedForExam = (() => {
    // Si la plataforma está finalizada o en pausa específica para el grado/estudiante
    if (isPlatformFinishedForStudent) return false
    if (isPlatformPausedForStudent) return false

    const enabledGrades = dispatchConfig.enabledGrades || ['all']
    const enabledSections = dispatchConfig.enabledSections || ['all']

    let matchGrade = enabledGrades.includes('all')
    if (!matchGrade) {
      const gStr = (student.grade || '') + ' ' + (student.codigoGrado || '')
      matchGrade = enabledGrades.some(g => {
        if (g === '6') return gStr.includes('6°') || student.codigoGrado === '06'
        if (g === '7') return gStr.includes('7°') || student.codigoGrado === '07'
        if (g === '8') return gStr.includes('8°') || student.codigoGrado === '08'
        if (g === '9') return gStr.includes('9°') || student.codigoGrado === '09'
        if (g === '10') return gStr.includes('10°') || gStr.includes('1° Bach') || student.codigoGrado === '10'
        if (g === '11') return gStr.includes('11°') || gStr.includes('2° Bach') || student.codigoGrado === '11'
        if (g === '12') return gStr.includes('12°') || gStr.includes('3° Bach') || student.codigoGrado === '32'
        return gStr.includes(g)
      })
    }

    let matchSection = enabledSections.includes('all')
    if (!matchSection) {
      const sec = (student.section || '').trim().toUpperCase()
      matchSection = enabledSections.some(s => s.toUpperCase() === sec)
    }

    return matchGrade && matchSection
  })()

  // Menú dinámico del alumno
  const studentMenuItems = [
    {
      key: 'interview',
      label: 'Entrevista Oral (Docente)',
      icon: 'record_voice_over',
      badge: isInterviewActiveForStudent ? '🎙️ En Turno' : 'Presencial'
    },
    {
      key: 'battery',
      label: 'Batería de Tests Digitales',
      icon: 'quiz',
      badge: isPlatformPausedForStudent ? '⏸️ En Pausa' : isPlatformFinishedForStudent ? '⏹️ Cerrado' : `${totalCompletedCount}/${examsList.length} Listos`
    },
    {
      key: 'results',
      label: 'Estado de Colocación',
      icon: 'military_tech',
      badge: isPlacementFullyConcluded ? 'Listo' : 'En Proceso'
    },
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
          setActiveExam(null)
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

      {/* Área Principal con Header y Contenido */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <header className="h-16 px-6 bg-white border-b border-gray-200 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <h1 className="font-heading font-extrabold text-base md:text-lg text-gray-900">
              {activeExam ? activeExam.title : (studentMenuItems.find(m => m.key === currentSection)?.label || 'Batería Diagnóstica')}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800">
              Colocación 2027
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Si hay un examen activo con temporizador */}
            {activeExam && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white font-mono text-xs font-bold shadow-xs">
                <span className="material-symbols-outlined text-[16px] text-amber-400 animate-pulse">timer</span>
                <span>{formatSeconds(examTimeLeft)}</span>
              </div>
            )}

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

        {/* Contenido Central */}
        <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
          <div className="max-w-3xl w-full mx-auto my-auto">

            {/* Modal de Advertencia de Seguridad / Cambio de Pestaña / Captura */}
            {securityModalVisible && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
                <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-2 border-rose-500 text-center space-y-5 animate-scaleUp">
                  <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
                    <span className="material-symbols-outlined text-[36px]">security_update_warning</span>
                  </div>

                  <div className="space-y-2">
                    <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-100 text-rose-800">
                      Advertencia de Seguridad Académica
                    </span>
                    <h3 className="text-lg font-heading font-black text-slate-900 leading-snug">
                      Incidencia Registrada en la Prueba
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {securityNotice}
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-left flex items-start gap-2.5 text-[11px] text-amber-900 leading-tight">
                    <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0 mt-0.5">warning</span>
                    <span>
                      Por directriz de evaluación, no está permitido abandonar la pestaña, copiar reactivos ni realizar capturas. Cada evento queda registrado en tu bitácora de examen.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSecurityModalVisible(false)}
                    className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Entendido, regresar a mi prueba</span>
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </button>
                </div>
              </div>
            )}

            {/* ================= PANTALLA DE PAUSA GENERAL O POR GRADO (ACTIVADA POR LAS TEACHERS) ================= */}
            {isPlatformPausedForStudent && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
                <div className="bg-white rounded-[32px] p-8 sm:p-10 max-w-lg w-full shadow-2xl border-2 border-amber-400 text-center space-y-6 animate-scaleUp">
                  <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                    <span className="material-symbols-outlined text-[42px] animate-pulse">pause_circle</span>
                  </div>

                  <div className="space-y-2">
                    <span className="inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900">
                      Evaluación en Pausa • Espera Docente
                    </span>
                    <h3 className="text-xl sm:text-2xl font-heading font-black text-slate-900 leading-snug">
                      {gradeControl.platformStatus === 'paused'
                        ? `La plataforma de ${studentGradeKey}° Grado está pausada`
                        : 'El examen se encuentra pausado por el docente'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                      Tu tiempo ha sido congelado. Espera la indicación de tu profesor para continuar.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified_user</span>
                      <span>Tu progreso no se perderá:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500 pl-1">
                      <li>El tiempo restante de tu prueba se reanudará exactamente donde quedó.</li>
                      <li>La prueba se reanudará en tu pantalla en el momento en que las teachers inicien el grado o habiliten tu usuario.</li>
                      <li>Tus respuestas previas están guardadas de manera segura.</li>
                    </ul>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400">
                    Sincronización en tiempo real activa • Esperando reanudación...
                  </div>
                </div>
              </div>
            )}

            {/* ================= PANTALLA DE GRADO FINALIZADO ================= */}
            {isPlatformFinishedForStudent && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
                <div className="bg-white rounded-[32px] p-8 sm:p-10 max-w-lg w-full shadow-2xl border-2 border-rose-500 text-center space-y-6 animate-scaleUp">
                  <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
                    <span className="material-symbols-outlined text-[42px]">stop_circle</span>
                  </div>

                  <div className="space-y-2">
                    <span className="inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-100 text-rose-900">
                      Evaluación Concluida por Docente
                    </span>
                    <h3 className="text-xl sm:text-2xl font-heading font-black text-slate-900 leading-snug">
                      La prueba de plataforma para tu grado ha sido cerrada
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                      El periodo de evaluación en plataforma ha finalizado oficialmente. Las respuestas enviadas hasta este momento fueron registradas satisfactoriamente.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (activeExam) {
                          handleFinishActiveExam(activeExam.id, true)
                        }
                        setCurrentSection('results')
                      }}
                      className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-lg transition-all cursor-pointer"
                    >
                      Aceptar y ver estado
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ================= VISTA A: EXAMEN ACTIVO EN EJECUCIÓN ================= */}
            {activeExam ? (() => {
              const currentExamAnswers = studentAnswers[activeExam.id] || {}
              const isListeningExam = activeExam.toolType === 'listening' || activeExam.questions.some(q => q.type === 'listening' && q.audioUrl)

              // Si es examen de audio/listening, agrupamos preguntas contiguas que comparten el mismo audio
              if (isListeningExam) {
                const audioGroups = []
                let currentGrp = null

                activeExam.questions.forEach((q, idx) => {
                  const qWithIndex = { ...q, displayNumber: idx + 1 }
                  const key = q.audioUrl || q.audioText || `audio_group_${idx}`
                  if (!currentGrp || currentGrp.key !== key) {
                    currentGrp = {
                      key,
                      audioUrl: q.audioUrl,
                      audioText: q.audioText,
                      level: q.level,
                      questions: [qWithIndex]
                    }
                    audioGroups.push(currentGrp)
                  } else {
                    currentGrp.questions.push(qWithIndex)
                  }
                })

                // El currentQuestionIndex funciona como groupIndex para la navegación entre audios
                const currentGroupIndex = Math.min(currentQuestionIndex, audioGroups.length - 1)
                const currentGroup = audioGroups[currentGroupIndex] || audioGroups[0]
                const isLastGroup = currentGroupIndex === audioGroups.length - 1

                const totalExamQuestions = activeExam.questions.length
                const totalAnsweredQuestions = activeExam.questions.filter(q => currentExamAnswers[q.id] != null).length
                const groupAnsweredQuestions = currentGroup?.questions.filter(q => currentExamAnswers[q.id] != null).length || 0

                return (
                  <div className="space-y-5 animate-fadeIn text-left exam-secure-mode select-none">
                    {/* Barra de progreso superior del examen de audio */}
                    <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span>
                            Audio {currentGroupIndex + 1} de {audioGroups.length} • {currentGroup?.questions.length} preguntas en esta pantalla
                          </span>
                          <span className="text-indigo-700 font-mono">
                            Total respondidas: {totalAnsweredQuestions} de {totalExamQuestions}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 transition-all duration-300"
                            style={{ width: `${(totalAnsweredQuestions / Math.max(1, totalExamQuestions)) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Indicador de Examen en Curso */}
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-[11px] font-black border border-indigo-200 shrink-0 self-start sm:self-auto">
                        <span className="material-symbols-outlined text-[15px] animate-spin">sync</span>
                        <span>Evaluación de Audio</span>
                      </div>
                    </div>

                    {/* Componente del grupo de audio: 1 Reproductor + TODAS las preguntas en la misma ventana */}
                    {currentGroup && (
                      <div className="exam-secure-mode select-none">
                        <AudioGroupPlayer
                          key={currentGroup.key || currentGroupIndex}
                          group={currentGroup}
                          examAnswers={currentExamAnswers}
                          onAnswerChange={(qId, ans) => handleAnswerChange(activeExam.id, qId, ans)}
                        />
                      </div>
                    )}

                    {/* Botones de navegación entre audios */}
                    <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        disabled={currentGroupIndex === 0}
                        onClick={() => {
                          setCurrentQuestionIndex(i => Math.max(0, i - 1))
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                        <span>Audio Anterior</span>
                      </button>

                      <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                        {groupAnsweredQuestions === currentGroup?.questions.length
                          ? '✓ Todas respondidas en esta pantalla'
                          : `${groupAnsweredQuestions} de ${currentGroup?.questions.length} respondidas en este audio`}
                      </span>

                      {isLastGroup ? (
                        <button
                          type="button"
                          onClick={() => handleFinishActiveExam(activeExam.id)}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          <span>Completar Test</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentQuestionIndex(i => Math.min(audioGroups.length - 1, i + 1))
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Siguiente Audio / Preguntas</span>
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              }

              // Si es otro tipo de examen (Sentence Scramble, Cloze, etc.), se mantiene navegación individual estándar
              const currentQ = activeExam.questions[currentQuestionIndex]
              const isAnswered = currentExamAnswers[currentQ?.id] != null
              const isLast = currentQuestionIndex === activeExam.questions.length - 1

              return (
                <div className="space-y-4 animate-fadeIn text-left exam-secure-mode select-none">
                  {/* Barra de progreso superior del examen */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span>Pregunta {currentQuestionIndex + 1} de {activeExam.questions.length}</span>
                        <span className="text-blue-700 font-mono">Nivel Reactivo: {currentQ?.level || 'A1-C1'}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all duration-300"
                          style={{ width: `${((currentQuestionIndex + 1) / activeExam.questions.length) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Indicador de Examen en Curso */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-[11px] font-black border border-blue-200 shrink-0">
                      <span className="material-symbols-outlined text-[15px] animate-spin">sync</span>
                      <span>Evaluación en Curso</span>
                    </div>
                  </div>

                  {/* Reproductor de la pregunta individual */}
                  {currentQ && (
                    <div className="exam-secure-mode select-none">
                      <QuestionPlayer
                        key={currentQ.id || currentQuestionIndex}
                        question={currentQ}
                        initialAnswer={currentExamAnswers[currentQ?.id]}
                        showFeedback={false}
                        onAnswerChange={(ans) => handleAnswerChange(activeExam.id, currentQ.id, ans)}
                      />
                    </div>
                  )}

                  {/* Botones de navegación del alumno: Anterior, Siguiente o Finalizar Test */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
                    <button
                      type="button"
                      disabled={currentQuestionIndex === 0}
                      onClick={() => setCurrentQuestionIndex(i => Math.max(0, i - 1))}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                      <span>Pregunta Anterior</span>
                    </button>

                    <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                      {isAnswered ? '✓ Respondida' : '○ Pendiente'}
                    </span>

                    {isLast ? (
                      <button
                        type="button"
                        onClick={() => handleFinishActiveExam(activeExam.id)}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>Completar Test</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCurrentQuestionIndex(i => Math.min(activeExam.questions.length - 1, i + 1))}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Siguiente Pregunta</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })() : currentSection === 'battery' ? (
              /* ================= VISTA B: LISTADO COMPLETO DE LOS 6 TESTS OFICIALES ================= */
              <div className="space-y-6 animate-fadeIn text-left">
                {/* Resumen del conjunto de tests */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="font-heading font-extrabold text-xl text-slate-900">
                        Batería Oficial de Tests Diagnósticos
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Instrumentos estandarizados configurados por los docentes (A1 a C1).
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tiempo Total</span>
                        <span className="text-sm font-extrabold text-slate-800 font-mono">{totalBatteryMinutes} min</span>
                      </div>
                      <div className="px-3.5 py-2 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Total Reactivos</span>
                        <span className="text-sm font-extrabold text-blue-900 font-mono">{totalBatteryQuestions} preg.</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Puedes resolver cada test en el orden que prefieras. Cada prueba cuenta con su propio temporizador individual asignado por el docente evaluador.
                  </p>
                </div>

                {/* Si el grado o sección no está habilitado actualmente por las teachers */}
                {!isStudentAuthorizedForExam ? (
                  <div className="bg-amber-50 rounded-3xl p-8 border border-amber-200 text-center space-y-4 animate-fadeIn">
                    <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
                      <span className="material-symbols-outlined text-4xl">lock_clock</span>
                    </div>
                    <div className="space-y-1">
                      <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase bg-amber-200 text-amber-900">
                        Acceso Restringido por Horario Docente
                      </span>
                      <h3 className="font-heading font-black text-base text-slate-900 mt-2">
                        La batería de exámenes no está habilitada para tu Grado o Sección en este momento
                      </h3>
                      <p className="text-xs text-slate-600 max-w-md mx-auto">
                        Las teachers habilitan las evaluaciones por secciones específicas de forma escalonada (ej. 7° Grado A/B). Por favor espera las indicaciones de tu docente.
                      </p>
                    </div>
                  </div>
                ) : (
                /* Lista de las pruebas con sus porcentajes y tiempos dinámicos */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {examsList.map((exam, idx) => {
                    const isDone = Boolean(completedExams[exam.id])
                    const answersCount = Object.keys(studentAnswers[exam.id] || {}).length

                    return (
                      <div
                        key={exam.id}
                        className={`bg-white rounded-2xl p-5 border transition-all space-y-3 flex flex-col justify-between ${
                          isDone
                            ? 'border-emerald-200 bg-emerald-50/20'
                            : 'border-slate-200 hover:border-blue-400 hover:shadow-sm'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                              Test {idx + 1} • {exam.level || 'A1-C1'}
                            </span>
                            <span className="text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                              Ponderación: {exam.weight || 15}%
                            </span>
                          </div>

                          <h3 className="font-heading font-extrabold text-sm text-slate-900 leading-snug">
                            {exam.title}
                          </h3>

                          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium pt-1">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[15px]">timer</span>
                              {exam.timeLimitMinutes || 15} min
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[15px]">help</span>
                              {exam.questions?.length || 0} preguntas
                            </span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-400 font-medium">
                            {isDone ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                Completado
                              </span>
                            ) : answersCount > 0 ? (
                              <span className="text-blue-600 font-bold">
                                {answersCount}/{exam.questions?.length || 0} respondidas
                              </span>
                            ) : (
                              'No iniciado'
                            )}
                          </span>

                          <button
                            type="button"
                            disabled={isDone}
                            onClick={() => handleStartExam(exam)}
                            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                              isDone
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                : 'bg-[#2528b7] hover:brightness-110 text-white shadow-xs cursor-pointer'
                            }`}
                          >
                            <span>{isDone ? 'Test Enviado' : 'Comenzar Test'}</span>
                            <span className="material-symbols-outlined text-[14px]">
                              {isDone ? 'lock' : 'play_arrow'}
                            </span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                )}
              </div>
            ) : (Boolean(student.placementReleased) && Boolean(student.assignedLevel) && currentSection === 'results') ? (
              /* ================= VISTA C: RESULTADO OFICIAL ASIGNADO POR DOCENTES ================= */
              <div className="bg-white rounded-[32px] p-8 md:p-12 border border-gray-200 shadow-xl space-y-6 animate-fadeIn text-center">
                <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                  <span className="material-symbols-outlined text-5xl">verified</span>
                </div>
                
                <div className="space-y-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold tracking-wider uppercase">
                    Colocación Concluida
                  </span>
                  <h2 className="font-heading font-extrabold text-2xl md:text-3xl text-gray-900">
                    Nivel y Grupo Asignado para el Ciclo 2027
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
                    El equipo docente de inglés ha finalizado tu evaluación y definido tu grupo oficial para el próximo ciclo escolar.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50 max-w-sm mx-auto border border-indigo-100 shadow-inner">
                  <span className="text-[11px] uppercase font-bold text-gray-400 tracking-wider">
                    Grupo / Nivel Interno (Get Involved)
                  </span>
                  <h3 className="font-heading font-black text-4xl md:text-5xl text-[#2528b7] mt-1">
                    {student.assignedLevel}
                  </h3>
                  <span className="text-xs text-indigo-700 font-semibold mt-2 block">
                    {student.grade || '7° Grado'} {student.section ? `- Sección ${student.section}` : ''}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 max-w-sm mx-auto text-left text-xs text-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Docente asignado al nivel:</span>
                    <strong className="text-slate-900">{student.assignedTeacher || 'Equipo Docente de Inglés'}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Plan Curricular:</span>
                    <span className="font-semibold text-slate-800">Get Involved (Macmillan)</span>
                  </div>
                </div>

                <p className="text-xs text-gray-400">
                  Pronto se te brindarán los detalles de tu salón y textos correspondientes al ciclo 2027.
                </p>
              </div>
            ) : currentSection === 'results' ? (
              /* ================= VISTA C.2: EN ESPERA DE RESOLUCIÓN DEL TEACHER ================= */
              <div className="bg-white rounded-[32px] p-8 md:p-12 border border-gray-200 shadow-xl space-y-6 animate-fadeIn text-center">
                <div className="w-20 h-20 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center relative shadow-inner">
                  <span className="material-symbols-outlined text-4xl animate-pulse">hourglass_top</span>
                </div>

                <div className="space-y-2">
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold tracking-wider uppercase border border-amber-200/60">
                    En Proceso de Colocación
                  </span>
                  <h2 className="font-heading font-extrabold text-2xl md:text-3xl text-gray-900">
                    Evaluación en Revisión Docente (Ciclo 2027)
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                    Tu proceso de diagnóstico y nivelación para el ciclo 2027 se encuentra en curso. Ningún nivel es definitivo ni visible hasta que el equipo docente cierre oficialmente la jornada de evaluación.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 max-w-sm mx-auto text-center text-xs text-slate-600">
                  <span className="font-semibold text-slate-800 block">Docente Evaluador Asignado:</span>
                  <span className="text-blue-700 font-extrabold text-sm mt-0.5 block">{student.assignedTeacher || 'Silvia Herrera'}</span>
                  <span className="text-[11px] text-slate-400 mt-1 block">Estado: En Proceso de Colocación</span>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentSection('battery')}
                    className="px-6 py-2.5 rounded-2xl bg-slate-900 text-white font-extrabold text-xs hover:bg-slate-800 transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>Ir a Batería de Tests</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ================= VISTA D: EN ESPERA / RESUMEN GENERAL DEL ALUMNO ================= */
              <div className="bg-white rounded-[32px] p-8 md:p-12 border border-gray-200 shadow-xl space-y-6 animate-fadeIn text-center">
                <div className="w-20 h-20 rounded-full bg-blue-50 text-blue-700 mx-auto flex items-center justify-center relative shadow-inner">
                  <span className="material-symbols-outlined text-4xl animate-pulse">hourglass_top</span>
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-white absolute top-1 right-1"></span>
                </div>

                <div className="space-y-2">
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-900 text-xs font-bold tracking-wider uppercase border border-amber-200/60">
                    En Proceso de Colocación
                  </span>
                  <h2 className="font-heading font-extrabold text-2xl md:text-3xl text-gray-900">
                    Evaluación Diagnóstica Institucional
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                    Hola <strong className="text-gray-900">{student.name}</strong>. Puedes ingresar a la pestaña <span className="font-bold text-blue-700">"Batería de Tests Digitales"</span> en el menú izquierdo para responder las pruebas con su tiempo asignado.
                  </p>
                </div>

                {/* Banner de Entrevista Oral en Turno Activo */}
                {isInterviewActiveForStudent && (
                  <div className="p-5 rounded-3xl bg-indigo-50 border-2 border-indigo-500 max-w-md mx-auto text-center space-y-2 animate-pulse">
                    <div className="flex items-center justify-center gap-2 text-indigo-900 font-extrabold text-sm uppercase">
                      <span className="material-symbols-outlined text-[24px] text-indigo-600">record_voice_over</span>
                      <span>¡Es tu turno para la Entrevista Oral!</span>
                    </div>
                    <p className="text-xs text-indigo-700 font-medium">
                      Tu docente te ha llamado para la evaluación oral en vivo. Acércate con tu docente evaluador para iniciar las preguntas.
                    </p>
                  </div>
                )}

                {/* Ficha Informativa del Alumno */}
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
                        Estado de Nivel
                      </span>
                      <span className="text-xs font-extrabold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60 inline-flex items-center gap-1 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        <span>En Proceso</span>
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200/70 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                        <span className="material-symbols-outlined text-[18px]">school</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Docente Evaluador Actual
                        </span>
                        <span className="text-xs font-extrabold text-slate-800">
                          {student.assignedTeacher || 'Silvia Herrera'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-extrabold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
                      En Proceso
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentSection('battery')}
                    className="px-6 py-3 rounded-2xl bg-[#2528b7] hover:brightness-110 text-white font-heading font-extrabold text-xs shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
                  >
                    <span>Ir a la Batería de Tests Digitales</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
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
