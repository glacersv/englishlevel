import React, { useState, useEffect } from 'react'
import { db, isFirebaseConfigured } from '../../lib/firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { getUserProfile, sanitizeDocId, getExams, subscribeExams, subscribeExamDispatch, saveResult } from '../../lib/dataService'
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

  // 2. Suscribirse a la batería oficial de exámenes en tiempo real (para reflejar cambios de preguntas añadidas por docentes)
  useEffect(() => {
    setLoadingExams(true)
    const unsub = subscribeExams((exams) => {
      if (exams && exams.length > 0) {
        setExamsList(exams)
        // Si el examen actualmente activo fue actualizado por el docente, sincronizar sus preguntas en vivo
        setActiveExam(prev => {
          if (!prev) return null
          const updated = exams.find(e => e.id === prev.id)
          return updated ? { ...prev, ...updated } : prev
        })
      }
      setLoadingExams(false)
    })
    return () => unsub?.()
  }, [])

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
        logIncident('tab_switch', 'Switched tab or minimized browser window')
        setTabSwitchWarnings(prev => {
          const newCount = prev + 1
          setSecurityNotice(
            `⚠️ SECURITY ALERT #${newCount}: You switched tabs or minimized the assessment window. This incident is being logged in your assessment record for teacher review.`
          )
          setSecurityModalVisible(true)
          return newCount
        })
      }
    }

    const handleWindowBlur = () => {
      if (document.hidden) return // already covered by visibilitychange
      logIncident('window_blur', 'Lost focus from assessment window (opened another app or window)')
      setTabSwitchWarnings(prev => {
        const newCount = prev + 1
        setSecurityNotice(
          `⚠️ SECURITY ALERT #${newCount}: You left the assessment window focus. Please remain within the test.`
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

  // 5. KEYBOARD SHORTCUT RESTRICTIONS (Copy, Cut, Screenshots, Inspect)
  useEffect(() => {
    if (!activeExam) return

    const handleKeyDown = (e) => {
      // Block screenshot keys: PrintScreen
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault()
        setSecurityNotice('🔒 Action restricted: Screenshots are strictly blocked during the assessment.')
        setSecurityModalVisible(true)
        if (navigator.clipboard) {
          navigator.clipboard.writeText('').catch(() => {})
        }
        return false
      }

      // Block Ctrl+C (Copy), Ctrl+X (Cut), Ctrl+U (View Source), Ctrl+Shift+I / F12 (Inspect)
      if (
        (e.ctrlKey || e.metaKey) &&
        ['c', 'C', 'x', 'X', 'u', 'U', 's', 'S', 'p', 'P'].includes(e.key)
      ) {
        e.preventDefault()
        setSecurityNotice(`🔒 Restricted action: The Ctrl+${e.key.toUpperCase()} shortcut is disabled for security protocol.`)
        setSecurityModalVisible(true)
        return false
      }

      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key))) {
        e.preventDefault()
        setSecurityNotice('🔒 Access to developer / inspection tools is blocked.')
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
      alert('🔒 You have already completed and submitted this test. By academic policy, each test instrument can only be taken once.')
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

  // Dynamic student navigation menu
  const studentMenuItems = [
    {
      key: 'interview',
      label: 'Oral Interview (Teacher)',
      icon: 'record_voice_over',
      badge: isInterviewActiveForStudent ? '🎙️ In Turn' : 'In-person'
    },
    {
      key: 'battery',
      label: 'Digital Test Battery',
      icon: 'quiz',
      badge: isPlatformPausedForStudent ? '⏸️ Paused' : isPlatformFinishedForStudent ? '⏹️ Closed' : `${totalCompletedCount}/${examsList.length} Completed`
    },
    {
      key: 'results',
      label: 'Placement Status',
      icon: 'military_tech',
      badge: isPlacementFullyConcluded ? 'Ready' : 'In Progress'
    },
  ]

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans overflow-hidden">
      {/* Student Institutional Sidebar */}
      <Sidebar
        title="Student Portal"
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
        logoutLabel="Sign Out"
        collapseTooltip="Collapse sidebar"
        expandTooltip="Expand sidebar"
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <header className="h-16 px-6 bg-white border-b border-gray-200 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <h1 className="font-heading font-extrabold text-base md:text-lg text-gray-900">
              {activeExam ? activeExam.title : (studentMenuItems.find(m => m.key === currentSection)?.label || 'Diagnostic Battery')}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800">
              Placement 2027
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Active exam countdown timer */}
            {activeExam && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white font-mono text-xs font-bold shadow-xs">
                <span className="material-symbols-outlined text-[16px] text-amber-400 animate-pulse">timer</span>
                <span>{formatSeconds(examTimeLeft)}</span>
              </div>
            )}

            <div className="hidden sm:block text-right">
              <span className="text-xs font-bold text-gray-800 block leading-tight">{student.name}</span>
              <span className="text-[10px] text-gray-500 font-mono">ID: {student.carnet || 'N/A'}</span>
            </div>
            <button
              onClick={onLogout}
              className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-all flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Contenido Central */}
        <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
          <div className="max-w-3xl w-full mx-auto my-auto">

            {/* Security Warning Modal / Tab Switch / Screenshot */}
            {securityModalVisible && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
                <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-2 border-rose-500 text-center space-y-5 animate-scaleUp">
                  <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
                    <span className="material-symbols-outlined text-[36px]">security_update_warning</span>
                  </div>

                  <div className="space-y-2">
                    <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-100 text-rose-800">
                      Academic Security Warning
                    </span>
                    <h3 className="text-lg font-heading font-black text-slate-900 leading-snug">
                      Security Incident Recorded
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {securityNotice}
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-left flex items-start gap-2.5 text-[11px] text-amber-900 leading-tight">
                    <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0 mt-0.5">warning</span>
                    <span>
                      Under assessment guidelines, switching tabs, copying test items, or capturing screenshots is not permitted. Each event is recorded in your evaluation log.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSecurityModalVisible(false)}
                    className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Understood, return to my test</span>
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </button>
                </div>
              </div>
            )}

            {/* ================= PLATFORM PAUSE SCREEN (TEACHER CONTROLLED) ================= */}
            {isPlatformPausedForStudent && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
                <div className="bg-white rounded-[32px] p-8 sm:p-10 max-w-lg w-full shadow-2xl border-2 border-amber-400 text-center space-y-6 animate-scaleUp">
                  <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                    <span className="material-symbols-outlined text-[42px] animate-pulse">pause_circle</span>
                  </div>

                  <div className="space-y-2">
                    <span className="inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900">
                      Assessment Paused • Awaiting Teacher
                    </span>
                    <h3 className="text-xl sm:text-2xl font-heading font-black text-slate-900 leading-snug">
                      {gradeControl.platformStatus === 'paused'
                        ? `Grade ${studentGradeKey} platform is paused`
                        : 'The test is currently paused by the teacher'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                      Your time has been frozen. Please wait for your teacher's instructions to resume.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified_user</span>
                      <span>Your progress is safe:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500 pl-1">
                      <li>Remaining test time will resume exactly where it was paused.</li>
                      <li>The test will automatically resume on your screen once teachers restart your grade or section.</li>
                      <li>All your previous answers are securely saved.</li>
                    </ul>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400">
                    Real-time synchronization active • Waiting for teacher resume...
                  </div>
                </div>
              </div>
            )}

            {/* ================= ASSESSMENT CONCLUDED SCREEN ================= */}
            {isPlatformFinishedForStudent && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
                <div className="bg-white rounded-[32px] p-8 sm:p-10 max-w-lg w-full shadow-2xl border-2 border-rose-500 text-center space-y-6 animate-scaleUp">
                  <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
                    <span className="material-symbols-outlined text-[42px]">stop_circle</span>
                  </div>

                  <div className="space-y-2">
                    <span className="inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-100 text-rose-900">
                      Assessment Concluded by Teacher
                    </span>
                    <h3 className="text-xl sm:text-2xl font-heading font-black text-slate-900 leading-snug">
                      The assessment session for your grade has closed
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                      The official testing window has ended. Answers submitted up to this moment have been successfully recorded.
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
                      Acknowledge & View Status
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
                    {/* Audio assessment top progress bar */}
                    <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span>
                            Audio {currentGroupIndex + 1} of {audioGroups.length} • {currentGroup?.questions.length} questions on this screen
                          </span>
                          <span className="text-indigo-700 font-mono">
                            Total answered: {totalAnsweredQuestions} of {totalExamQuestions}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 transition-all duration-300"
                            style={{ width: `${(totalAnsweredQuestions / Math.max(1, totalExamQuestions)) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Active Test Status Badge */}
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-[11px] font-black border border-indigo-200 shrink-0 self-start sm:self-auto">
                        <span className="material-symbols-outlined text-[15px] animate-spin">sync</span>
                        <span>Audio Assessment</span>
                      </div>
                    </div>

                    {/* Audio group component */}
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

                    {/* Audio navigation buttons */}
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
                        <span>Previous Audio</span>
                      </button>

                      <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                        {groupAnsweredQuestions === currentGroup?.questions.length
                          ? '✓ All answered on this screen'
                          : `${groupAnsweredQuestions} of ${currentGroup?.questions.length} answered in this audio`}
                      </span>

                      {isLastGroup ? (
                        <button
                          type="button"
                          onClick={() => handleFinishActiveExam(activeExam.id)}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          <span>Submit Test</span>
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
                          <span>Next Audio / Questions</span>
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              }

              // Standard single question navigation (Sentence Scramble, Cloze, etc.)
              const currentQ = activeExam.questions[currentQuestionIndex]
              const isAnswered = currentExamAnswers[currentQ?.id] != null
              const isLast = currentQuestionIndex === activeExam.questions.length - 1

              return (
                <div className="space-y-4 animate-fadeIn text-left exam-secure-mode select-none">
                  {/* Top Progress bar */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span>Question {currentQuestionIndex + 1} of {activeExam.questions.length}</span>
                        <span className="text-blue-700 font-mono">Item Level: {currentQ?.level || 'A1-C1'}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all duration-300"
                          style={{ width: `${((currentQuestionIndex + 1) / activeExam.questions.length) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Progress indicator */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-[11px] font-black border border-blue-200 shrink-0">
                      <span className="material-symbols-outlined text-[15px] animate-spin">sync</span>
                      <span>Test in Progress</span>
                    </div>
                  </div>

                  {/* Individual Question Player */}
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

                  {/* Student Navigation Controls */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
                    <button
                      type="button"
                      disabled={currentQuestionIndex === 0}
                      onClick={() => setCurrentQuestionIndex(i => Math.max(0, i - 1))}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                      <span>Previous Question</span>
                    </button>

                    <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                      {isAnswered ? '✓ Answered' : '○ Pending'}
                    </span>

                    {isLast ? (
                      <button
                        type="button"
                        onClick={() => handleFinishActiveExam(activeExam.id)}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>Submit Test</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCurrentQuestionIndex(i => Math.min(activeExam.questions.length - 1, i + 1))}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Next Question</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })() : currentSection === 'battery' ? (
              /* ================= VISTA B: LISTADO COMPLETO DE LOS 6 TESTS OFICIALES ================= */
              <div className="space-y-6 animate-fadeIn text-left">
                {/* Test battery summary header */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="font-heading font-extrabold text-xl text-slate-900">
                        Official Diagnostic Test Battery
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Standardized instruments configured by your English teachers (A1 to C1).
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Time</span>
                        <span className="text-sm font-extrabold text-slate-800 font-mono">{totalBatteryMinutes} min</span>
                      </div>
                      <div className="px-3.5 py-2 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Total Items</span>
                        <span className="text-sm font-extrabold text-blue-900 font-mono">{totalBatteryQuestions} q's</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    You can take each test in any order you prefer. Each instrument features its own individual timer managed by the evaluating teacher.
                  </p>
                </div>

                {/* If grade/section not authorized by teachers */}
                {!isStudentAuthorizedForExam ? (
                  <div className="bg-amber-50 rounded-3xl p-8 border border-amber-200 text-center space-y-4 animate-fadeIn">
                    <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
                      <span className="material-symbols-outlined text-4xl">lock_clock</span>
                    </div>
                    <div className="space-y-1">
                      <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase bg-amber-200 text-amber-900">
                        Access Restricted by Teacher Schedule
                      </span>
                      <h3 className="font-heading font-black text-base text-slate-900 mt-2">
                        The test battery is not enabled for your Grade or Section at this time
                      </h3>
                      <p className="text-xs text-slate-600 max-w-md mx-auto">
                        Teachers activate testing sessions sequentially by assigned groups (e.g., Grade 7 A/B). Please await directions from your teacher.
                      </p>
                    </div>
                  </div>
                ) : (
                /* Test instruments grid */
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
                              Weight: {exam.weight || 15}%
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
                              {exam.questions?.length || 0} questions
                            </span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-400 font-medium">
                            {isDone ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                Completed
                              </span>
                            ) : answersCount > 0 ? (
                              <span className="text-blue-600 font-bold">
                                {answersCount}/{exam.questions?.length || 0} answered
                              </span>
                            ) : (
                              'Not started'
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
                            <span>{isDone ? 'Submitted' : 'Start Test'}</span>
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
              /* ================= VISTA C: OFFICIAL RESULTS (RELEASED BY TEACHERS) ================= */
              <div className="bg-white rounded-[32px] p-8 md:p-12 border border-gray-200 shadow-xl space-y-6 animate-fadeIn text-center">
                <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                  <span className="material-symbols-outlined text-5xl">verified</span>
                </div>
                
                <div className="space-y-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold tracking-wider uppercase">
                    Placement Finalized
                  </span>
                  <h2 className="font-heading font-extrabold text-2xl md:text-3xl text-gray-900">
                    Official Level & Group Assigned for 2027 Cycle
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
                    The English faculty has concluded your assessment and determined your official placement group.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50 max-w-sm mx-auto border border-indigo-100 shadow-inner">
                  <span className="text-[11px] uppercase font-bold text-gray-400 tracking-wider">
                    Assigned Group / Level (Get Involved)
                  </span>
                  <h3 className="font-heading font-black text-4xl md:text-5xl text-[#2528b7] mt-1">
                    {student.assignedLevel}
                  </h3>
                  <span className="text-xs text-indigo-700 font-semibold mt-2 block">
                    {student.grade || 'Grade 7'} {student.section ? `- Section ${student.section}` : ''}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 max-w-sm mx-auto text-left text-xs text-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Teacher assigned to level:</span>
                    <strong className="text-slate-900">{student.assignedTeacher || 'English Teaching Team'}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Curricular Series:</span>
                    <span className="font-semibold text-slate-800">Get Involved (Macmillan)</span>
                  </div>
                </div>

                <p className="text-xs text-gray-400">
                  Further classroom logistics and textbook details for the 2027 school year will be announced shortly.
                </p>
              </div>
            ) : currentSection === 'results' ? (
              /* ================= VISTA C.2: AWAITING TEACHER RESOLUTION ================= */
              <div className="bg-white rounded-[32px] p-8 md:p-12 border border-gray-200 shadow-xl space-y-6 animate-fadeIn text-center">
                <div className="w-20 h-20 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center relative shadow-inner">
                  <span className="material-symbols-outlined text-4xl animate-pulse">hourglass_top</span>
                </div>

                <div className="space-y-2">
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold tracking-wider uppercase border border-amber-200/60">
                    Placement In Progress
                  </span>
                  <h2 className="font-heading font-extrabold text-2xl md:text-3xl text-gray-900">
                    Assessment Under Faculty Review (2027 Cycle)
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                    Your diagnostic evaluation is currently being reviewed. Placement levels will be released once teachers finalize all oral and digital scores.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 max-w-sm mx-auto text-center text-xs text-slate-600">
                  <span className="font-semibold text-slate-800 block">Assigned Evaluator:</span>
                  <span className="text-blue-700 font-extrabold text-sm mt-0.5 block">{student.assignedTeacher || 'Silvia Herrera'}</span>
                  <span className="text-[11px] text-slate-400 mt-1 block">Status: Processing Diagnostic Data</span>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentSection('battery')}
                    className="px-6 py-2.5 rounded-2xl bg-slate-900 text-white font-extrabold text-xs hover:bg-slate-800 transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>Go to Test Battery</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ================= VISTA D: WELCOME & STUDENT OVERVIEW ================= */
              <div className="bg-white rounded-[32px] p-8 md:p-12 border border-gray-200 shadow-xl space-y-6 animate-fadeIn text-center">
                <div className="w-20 h-20 rounded-full bg-blue-50 text-blue-700 mx-auto flex items-center justify-center relative shadow-inner">
                  <span className="material-symbols-outlined text-4xl animate-pulse">hourglass_top</span>
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-white absolute top-1 right-1"></span>
                </div>

                <div className="space-y-2">
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-900 text-xs font-bold tracking-wider uppercase border border-amber-200/60">
                    Placement In Progress
                  </span>
                  <h2 className="font-heading font-extrabold text-2xl md:text-3xl text-gray-900">
                    Institutional Diagnostic Assessment
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                    Welcome, <strong className="text-gray-900">{student.name}</strong>. Access the <span className="font-bold text-blue-700">"Digital Test Battery"</span> tab on the left menu to complete your timed instruments.
                  </p>
                </div>

                {/* Banner: Oral interview turn notification */}
                {isInterviewActiveForStudent && (
                  <div className="p-5 rounded-3xl bg-indigo-50 border-2 border-indigo-500 max-w-md mx-auto text-center space-y-2 animate-pulse">
                    <div className="flex items-center justify-center gap-2 text-indigo-900 font-extrabold text-sm uppercase">
                      <span className="material-symbols-outlined text-[24px] text-indigo-600">record_voice_over</span>
                      <span>It's your turn for the Oral Interview!</span>
                    </div>
                    <p className="text-xs text-indigo-700 font-medium">
                      Your teacher has called you for the live speaking assessment. Please proceed to the evaluator's desk.
                    </p>
                  </div>
                )}

                {/* Student Registration & Info Card */}
                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 text-left space-y-4 max-w-md mx-auto shadow-xs">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                    <span className="material-symbols-outlined text-blue-700 text-[22px]">badge</span>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Student Enrollment Details
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200/70">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Grade & Section
                      </span>
                      <span className="text-sm font-extrabold text-slate-800 mt-1 block">
                        {student.grade || 'Grade 7'} {student.section ? `• Sec. ${student.section}` : ''}
                      </span>
                    </div>

                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200/70">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Placement Status
                      </span>
                      <span className="text-xs font-extrabold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60 inline-flex items-center gap-1 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        <span>In Progress</span>
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
                          Assigned Evaluator
                        </span>
                        <span className="text-xs font-extrabold text-slate-800">
                          {student.assignedTeacher || 'Silvia Herrera'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-extrabold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
                      Active
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentSection('battery')}
                    className="px-6 py-3 rounded-2xl bg-[#2528b7] hover:brightness-110 text-white font-heading font-extrabold text-xs shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
                  >
                    <span>Go to Digital Test Battery</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        <footer className="py-3 text-center text-[11px] text-gray-400 border-t border-gray-100 bg-white">
          © 2026 Colegio Salesiano San José · English Placement & Diagnostic System
        </footer>
      </div>
    </div>
  )
}
