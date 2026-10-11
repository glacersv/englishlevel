import React, { useState, useEffect } from 'react'
import { db, isFirebaseConfigured } from '../../lib/firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { getUserProfile, sanitizeDocId, subscribeExams, subscribeExamDispatch, saveResult } from '../../lib/dataService'
import QuestionPlayer, { QUESTION_CHECKERS } from './QuestionPlayer'
import AudioGroupPlayer from './AudioGroupPlayer'
import { OFFICIAL_DIAGNOSTIC_EXAMS } from '../../data/officialExamsData'
import studentHeroImg from '../../assets/student_hero.jpg'

export default function StudentGamifiedExam({ student: propStudent, onLogout }) {
  const [currentStudent, setCurrentStudent] = useState(propStudent || {})
  const [currentSection, setCurrentSection] = useState('home') // 'home' | 'battery' | 'interview' | 'results'
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
  const [, setLoadingExams] = useState(false)
  const [activeExam, setActiveExam] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [examTimeLeft, setExamTimeLeft] = useState(0)

  // Respuestas persistidas para que no se pierdan al pausar o recargar
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

  // Clave de grado normalizada
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

  // Override individual
  const studentOverride = (() => {
    const clean = sanitizeDocId(student.email)
    const overrides = dispatchConfig.studentOverrides || {}
    return overrides[clean] || overrides[(student.email || '').toLowerCase()] || null
  })()

  const gradeControl = dispatchConfig.gradesControl?.[studentGradeKey] || {
    platformStatus: 'paused',
    interviewStatus: 'paused'
  }

  const isPlatformFinishedForStudent = studentOverride?.platformStatus === 'finished' || gradeControl.platformStatus === 'finished'

  const isPlatformActiveForStudent = (() => {
    if (studentOverride && studentOverride.platformStatus) {
      return studentOverride.platformStatus === 'active'
    }
    if (gradeControl.platformStatus === 'finished') return false
    if (gradeControl.platformStatus === 'paused') return false
    if (dispatchConfig.isPaused) return false
    return gradeControl.platformStatus === 'active'
  })()

  const isPlatformPausedForStudent = !isPlatformActiveForStudent && !isPlatformFinishedForStudent

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

  // 2. Suscribirse a la batería de exámenes
  useEffect(() => {
    setLoadingExams(true)
    const unsub = subscribeExams((exams) => {
      if (exams && exams.length > 0) {
        setExamsList(exams)
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

  // 3. Temporizador regresivo
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

  // 4. Detección anti-trampa (cambio de ventana)
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
            `⚠️ SECURITY ALERT #${newCount}: Has cambiado de pestaña o minimizado la ventana de evaluación. Este incidente ha sido registrado para revisión docente.`
          )
          setSecurityModalVisible(true)
          return newCount
        })
      }
    }

    const handleWindowBlur = () => {
      if (document.hidden) return
      logIncident('window_blur', 'Lost focus from assessment window')
      setTabSwitchWarnings(prev => {
        const newCount = prev + 1
        setSecurityNotice(
          `⚠️ SECURITY ALERT #${newCount}: Has salido de la ventana de evaluación. Mantén el foco en la pantalla.`
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

  // 5. Restricción de atajos de teclado y clic derecho
  useEffect(() => {
    if (!activeExam) return

    const handleKeyDown = (e) => {
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault()
        setSecurityNotice('🔒 Captura bloqueada: Las capturas de pantalla están deshabilitadas durante la prueba.')
        setSecurityModalVisible(true)
        if (navigator.clipboard) {
          navigator.clipboard.writeText('').catch(() => {})
        }
        return false
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        ['c', 'C', 'x', 'X', 'u', 'U', 's', 'S', 'p', 'P'].includes(e.key)
      ) {
        e.preventDefault()
        setSecurityNotice(`🔒 Acción restringida: El atajo Ctrl+${e.key.toUpperCase()} está bloqueado por protocolo.`)
        setSecurityModalVisible(true)
        return false
      }

      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key))) {
        e.preventDefault()
        setSecurityNotice('🔒 Acceso a herramientas de inspección bloqueado.')
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

  // Iniciar examen
  const handleStartExam = (exam) => {
    if (completedExams[exam.id]) {
      alert('🔒 Ya completaste esta prueba. Por normativa académica solo se puede presentar una vez.')
      return
    }
    setActiveExam(exam)
    setCurrentQuestionIndex(0)
    const minutes = exam.timeLimitMinutes || 15
    setExamTimeLeft(minutes * 60)
  }

  // Guardar respuestas
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
        console.warn('Error guardando borrador:', e)
      }
      return updated
    })
  }

  // Finalizar examen
  const handleFinishActiveExam = async (examId, byTimeout = false) => {
    const currentExam = examsList.find(e => e.id === examId) || activeExam || {}
    const examQuestions = currentExam.questions || []
    const rawAnswers = studentAnswers[examId] || {}

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

    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedCompleted))
    } catch (e) {
      console.warn('Error en localStorage:', e)
    }

    if (student.email) {
      try {
        const docId = sanitizeDocId(student.email)
        if (isFirebaseConfigured()) {
          await setDoc(doc(db, 'users', docId), { completedExams: updatedCompleted }, { merge: true })
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
        console.warn('Error guardando en Firestore:', err)
      }
    }
  }

  const formatSeconds = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Cálculos de progreso
  const totalBatteryMinutes = examsList.reduce((acc, ex) => acc + (ex.timeLimitMinutes || 15), 0)
  const totalCompletedCount = Object.keys(completedExams).length
  const progressPercent = examsList.length > 0 ? Math.round((totalCompletedCount / examsList.length) * 100) : 0
  const allTestsCompleted = examsList.length > 0 && totalCompletedCount >= examsList.length
  const isPlacementFullyConcluded = Boolean(student.assignedLevel) && allTestsCompleted

  const isStudentAuthorizedForExam = (() => {
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

  // Primer examen pendiente para el botón de acción rápida
  const nextPendingExam = examsList.find(e => !completedExams[e.id]) || examsList[0]

  // Formato de fecha estética actual
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).format(new Date())

  // Primer nombre para saludo
  const studentFirstName = (student.name || 'Student').split(' ')[0]

  // Configuración de items del sidebar moderno
  const navItems = [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'battery', label: 'My learning', icon: 'play_circle', badge: `${totalCompletedCount}/${examsList.length}` },
    { key: 'interview', label: 'Oral Interview', icon: 'record_voice_over', badge: isInterviewActiveForStudent ? 'Turno' : null },
    { key: 'results', label: 'Progress & Level', icon: 'donut_large', badge: isPlacementFullyConcluded ? 'Listo' : null }
  ]

  // Iconos y colores temáticos suaves para los módulos de la ruta de aprendizaje
  const getModuleMeta = (index, toolType) => {
    const metas = [
      { tag: 'Reading & Grammar', bg: 'bg-[#ffebf0]', text: 'text-[#e64980]', icon: 'menu_book' },
      { tag: 'Listening Lab', bg: 'bg-[#fff4e6]', text: 'text-[#f76707]', icon: 'headphones' },
      { tag: 'Vocabulary & Use', bg: 'bg-[#e7f5ff]', text: 'text-[#1c7ed6]', icon: 'palette' },
      { tag: 'Sentence Structure', bg: 'bg-[#f3f0ff]', text: 'text-[#7950f2]', icon: 'tune' },
      { tag: 'Speaking Skills', bg: 'bg-[#ebfbee]', text: 'text-[#2b8a3e]', icon: 'mic' },
      { tag: 'Diagnostic Mastery', bg: 'bg-[#fff9db]', text: 'text-[#f59f00]', icon: 'star' }
    ]
    return metas[index % metas.length]
  }

  return (
    <div className="w-full h-screen bg-[#faf9fe] font-sans flex flex-col md:flex-row overflow-hidden select-none">
      {/* ================= BARRA LATERAL (SIDEBAR IZQUIERDO ESTILO PILL) ================= */}
      <aside className={`${collapsed ? 'md:w-20' : 'md:w-64'} w-full bg-white border-b md:border-b-0 md:border-r border-[#f1eef8] p-4 sm:p-5 flex flex-col justify-between shrink-0 transition-all duration-300 z-30 shadow-xs`}>
          <div>
            {/* Logo Nestly / Next Plus estilo amigable */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#e9e3ff] flex items-center justify-center text-[#5446a8] shadow-xs">
                  <span className="material-symbols-outlined text-[24px]">school</span>
                </div>
                {!collapsed && (
                  <div>
                    <h2 className="font-heading font-black text-base text-[#2d2c38] tracking-tight leading-none">
                      English Level
                    </h2>
                    <span className="text-[10px] font-bold text-[#8a70d6] uppercase tracking-wider block mt-0.5">
                      San José Learn
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                className="hidden md:flex p-1.5 rounded-xl text-[#8e8a9f] hover:bg-[#f4f1fd] hover:text-[#5446a8] transition-colors cursor-pointer"
                title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {collapsed ? 'menu_open' : 'menu'}
                </span>
              </button>
            </div>

            {/* Menú de navegación redondeado y suave */}
            <nav className="space-y-2">
              {navItems.map((item) => {
                const isActive = currentSection === item.key && !activeExam
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setActiveExam(null)
                      setCurrentSection(item.key)
                    }}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-bold text-xs transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-[#e9e3ff] text-[#413689] shadow-xs ring-1 ring-[#8a70d6]/20'
                        : 'text-[#6b677e] hover:bg-[#faf9fe] hover:text-[#2d2c38]'
                    } ${collapsed ? 'justify-center px-0' : 'justify-start'}`}
                  >
                    <span className={`material-symbols-outlined text-[22px] ${isActive ? 'text-[#5446a8]' : 'text-[#9c97b0]'}`}>
                      {item.icon}
                    </span>
                    {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isActive ? 'bg-[#5446a8] text-white' : 'bg-[#f4f1fd] text-[#5446a8]'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Tarjeta inferior "Keep wondering!" estilo amigable / Salir */}
          <div className="pt-6 space-y-3">
            {!collapsed && (
              <div className="p-4 rounded-3xl bg-[#fff9db] border border-[#ffec99]/60 relative overflow-hidden text-left">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-600 flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-[20px]">star</span>
                </div>
                <h4 className="text-xs font-black text-amber-950 leading-tight">
                  ¡Sigue adelante!
                </h4>
                <p className="text-[11px] text-amber-800/80 mt-1 leading-relaxed font-medium">
                  {examsList.length - totalCompletedCount === 0
                    ? '¡Completaste toda tu batería de inglés!'
                    : `Estás a ${examsList.length - totalCompletedCount} actividades de tu meta.`}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={onLogout}
              className={`w-full flex items-center gap-2 p-3 rounded-2xl text-xs font-bold text-[#8e8a9f] hover:text-rose-600 hover:bg-rose-50/60 transition-all cursor-pointer ${
                collapsed ? 'justify-center' : 'justify-start'
              }`}
              title="Cerrar sesión"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              {!collapsed && <span>Cerrar sesión</span>}
            </button>
          </div>
        </aside>

        {/* ================= CUERPO PRINCIPAL DEL DASHBOARD ================= */}
        <div className="flex-1 flex flex-col bg-[#faf9fe] overflow-y-auto min-h-0">

          {/* Barra Superior Header */}
          <header className="px-6 sm:px-8 py-5 flex items-center justify-between border-b border-[#f1eef8] bg-white/70 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                className="md:hidden p-2 rounded-xl bg-[#f4f1fd] text-[#5446a8]"
              >
                <span className="material-symbols-outlined text-[20px]">menu</span>
              </button>

              <div className="text-left">
                <span className="text-[11px] font-bold text-[#8e8a9f] uppercase tracking-wider block">
                  {todayFormatted}
                </span>
                <h1 className="font-heading font-black text-lg sm:text-xl text-[#2d2c38] leading-tight">
                  ¡Hola de nuevo, {studentFirstName}!
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Temporizador si hay examen activo */}
              {activeExam && (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-[#5446a8] text-white text-xs font-mono font-bold shadow-xs">
                  <span className="material-symbols-outlined text-[16px] text-amber-300 animate-pulse">timer</span>
                  <span>{formatSeconds(examTimeLeft)}</span>
                </div>
              )}

              {/* Badges de Grado y Alumno */}
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-extrabold text-[#2d2c38]">{student.name}</span>
                <span className="text-[10px] font-mono text-[#8a70d6]">
                  {student.grade || '7° Grado'} {student.section ? `• Sec. ${student.section}` : ''}
                </span>
              </div>

              {/* Avatar circular con badge morado */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#8a70d6] to-[#b8a5f2] p-0.5 shadow-xs shrink-0 flex items-center justify-center text-white font-black text-xs">
                {student.photoUrl ? (
                  <img
                    src={student.photoUrl}
                    alt={student.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  studentFirstName.substring(0, 2).toUpperCase()
                )}
              </div>
            </div>
          </header>

          {/* Área de Contenido Principal - Full Width & Fluid */}
          <main className="flex-1 px-4 sm:px-8 md:px-10 lg:px-12 py-6 md:py-8 space-y-8 w-full max-w-[1700px] mx-auto">

            {/* Modal de Alerta de Seguridad (Anti-trampa) */}
            {securityModalVisible && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
                <div className="bg-white rounded-[32px] p-6 sm:p-8 max-w-md w-full shadow-2xl border-2 border-rose-500 text-center space-y-5 animate-scaleUp">
                  <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
                    <span className="material-symbols-outlined text-[36px]">security_update_warning</span>
                  </div>
                  <div className="space-y-2">
                    <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-100 text-rose-800">
                      Aviso de Seguridad Académica
                    </span>
                    <h3 className="text-lg font-heading font-black text-slate-900 leading-snug">
                      Incidente Registrado
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {securityNotice}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSecurityModalVisible(false)}
                    className="w-full py-3 rounded-2xl bg-[#5446a8] hover:bg-[#413689] text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                  >
                    Entendido, regresar a la prueba
                  </button>
                </div>
              </div>
            )}

            {/* Pantalla de Pausa Docente */}
            {isPlatformPausedForStudent && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
                <div className="bg-white rounded-[36px] p-8 sm:p-10 max-w-lg w-full shadow-2xl border-2 border-amber-400 text-center space-y-6 animate-scaleUp">
                  <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                    <span className="material-symbols-outlined text-[42px] animate-pulse">pause_circle</span>
                  </div>
                  <div className="space-y-2">
                    <span className="inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900">
                      Evaluación en Pausa • Esperando Docente
                    </span>
                    <h3 className="text-xl sm:text-2xl font-heading font-black text-slate-900 leading-snug">
                      {gradeControl.platformStatus === 'paused'
                        ? `La plataforma de ${studentGradeKey}° grado está en pausa`
                        : 'La prueba está temporalmente pausada por tu docente'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                      El tiempo ha quedado congelado. Espera las indicaciones de tu profesor para continuar.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Pantalla de Conclusión de Evaluación */}
            {isPlatformFinishedForStudent && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
                <div className="bg-white rounded-[36px] p-8 sm:p-10 max-w-lg w-full shadow-2xl border-2 border-rose-500 text-center space-y-6 animate-scaleUp">
                  <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
                    <span className="material-symbols-outlined text-[42px]">stop_circle</span>
                  </div>
                  <div className="space-y-2">
                    <span className="inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-100 text-rose-900">
                      Sesión de Evaluación Finalizada
                    </span>
                    <h3 className="text-xl sm:text-2xl font-heading font-black text-slate-900 leading-snug">
                      El período oficial de pruebas ha concluido
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                      Tus respuestas enviadas han quedado registradas exitosamente en el sistema.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeExam) handleFinishActiveExam(activeExam.id, true)
                      setCurrentSection('results')
                    }}
                    className="px-6 py-3 rounded-2xl bg-[#5446a8] text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                  >
                    Ver estado de colocación
                  </button>
                </div>
              </div>
            )}

            {/* ================= CASO 1: EXAMEN ACTIVO EN EJECUCIÓN ================= */}
            {activeExam ? (() => {
              const currentExamAnswers = studentAnswers[activeExam.id] || {}
              const isListeningExam = activeExam.toolType === 'listening' || activeExam.questions.some(q => q.type === 'listening' && q.audioUrl)

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

                const currentGroupIndex = Math.min(currentQuestionIndex, audioGroups.length - 1)
                const currentGroup = audioGroups[currentGroupIndex] || audioGroups[0]
                const isLastGroup = currentGroupIndex === audioGroups.length - 1
                const totalExamQuestions = activeExam.questions.length
                const totalAnsweredQuestions = activeExam.questions.filter(q => currentExamAnswers[q.id] != null).length

                return (
                  <div className="space-y-5 animate-fadeIn text-left select-none">
                    <div className="p-4 bg-white rounded-3xl border border-[#eceaf6] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between text-xs font-bold text-[#2d2c38]">
                          <span>Audio {currentGroupIndex + 1} de {audioGroups.length}</span>
                          <span className="text-[#5446a8] font-mono">
                            Respondidas: {totalAnsweredQuestions} / {totalExamQuestions}
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-[#f4f1fd] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#8a70d6] to-[#5446a8] transition-all duration-300 rounded-full"
                            style={{ width: `${(totalAnsweredQuestions / Math.max(1, totalExamQuestions)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <AudioGroupPlayer
                      key={currentGroup?.key || currentGroupIndex}
                      group={currentGroup}
                      examAnswers={currentExamAnswers}
                      onAnswerChange={(qId, ans) => handleAnswerChange(activeExam.id, qId, ans)}
                    />

                    <div className="p-4 bg-white rounded-3xl border border-[#eceaf6] flex items-center justify-between">
                      <button
                        type="button"
                        disabled={currentGroupIndex === 0}
                        onClick={() => setCurrentQuestionIndex(i => Math.max(0, i - 1))}
                        className="px-4 py-2.5 rounded-2xl border border-[#eceaf6] text-xs font-bold text-[#585567] hover:bg-[#f8f7fc] disabled:opacity-30 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                        <span>Audio anterior</span>
                      </button>

                      {isLastGroup ? (
                        <button
                          type="button"
                          onClick={() => handleFinishActiveExam(activeExam.id)}
                          className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          <span>Finalizar y entregar prueba</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCurrentQuestionIndex(i => Math.min(audioGroups.length - 1, i + 1))}
                          className="px-6 py-2.5 rounded-2xl bg-[#5446a8] hover:bg-[#413689] text-white text-xs font-black shadow-md shadow-[#5446a8]/25 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Siguiente audio</span>
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              }

              // Examen normal pregunta a pregunta
              const currentQ = activeExam.questions[currentQuestionIndex]
              const isLast = currentQuestionIndex === activeExam.questions.length - 1
              const isAnswered = currentExamAnswers[currentQ?.id] != null

              return (
                <div className="space-y-5 animate-fadeIn text-left select-none">
                  <div className="p-4 bg-white rounded-3xl border border-[#eceaf6] shadow-xs flex items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between text-xs font-bold text-[#2d2c38]">
                        <span>Pregunta {currentQuestionIndex + 1} de {activeExam.questions.length}</span>
                        <span className="text-[#5446a8] font-mono">
                          {Math.round(((currentQuestionIndex + 1) / activeExam.questions.length) * 100)}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-[#f4f1fd] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#8a70d6] to-[#5446a8] transition-all duration-300 rounded-full"
                          style={{ width: `${((currentQuestionIndex + 1) / activeExam.questions.length) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-[#e9e3ff] text-[#5446a8] text-[11px] font-black shrink-0">
                      <span className="material-symbols-outlined text-[16px]">timer</span>
                      <span>{formatSeconds(examTimeLeft)}</span>
                    </div>
                  </div>

                  {currentQ && (
                    <div className="select-none">
                      <QuestionPlayer
                        key={currentQ.id || currentQuestionIndex}
                        question={currentQ}
                        initialAnswer={currentExamAnswers[currentQ?.id]}
                        showFeedback={false}
                        onAnswerChange={(ans) => handleAnswerChange(activeExam.id, currentQ.id, ans)}
                      />
                    </div>
                  )}

                  <div className="p-4 bg-white rounded-3xl border border-[#eceaf6] flex items-center justify-between">
                    <button
                      type="button"
                      disabled={currentQuestionIndex === 0}
                      onClick={() => setCurrentQuestionIndex(i => Math.max(0, i - 1))}
                      className="px-4 py-2.5 rounded-2xl border border-[#eceaf6] text-xs font-bold text-[#585567] hover:bg-[#f8f7fc] disabled:opacity-30 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                      <span>Anterior</span>
                    </button>

                    <span className="text-xs text-[#8e8a9f] font-medium hidden sm:inline">
                      {isAnswered ? '✓ Respondida' : '○ Pendiente'}
                    </span>

                    {isLast ? (
                      <button
                        type="button"
                        onClick={() => handleFinishActiveExam(activeExam.id)}
                        className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>Entregar prueba</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCurrentQuestionIndex(i => Math.min(activeExam.questions.length - 1, i + 1))}
                        className="px-6 py-2.5 rounded-2xl bg-[#5446a8] hover:bg-[#413689] text-white text-xs font-black shadow-md shadow-[#5446a8]/25 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Siguiente</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })() : currentSection === 'home' ? (
              /* ================= CASO 2: VISTA HOME ESTILO "NESTLY LEARN" ================= */
              <div className="space-y-6 animate-fadeIn text-left">
                {/* Grid Superior: Hero Card Izquierda + Widgets de Racha y Progreso a la Derecha */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* HERO BANNER AMARILLO PASTEL CON ILUSTRACIÓN Y BOTÓN MORADO */}
                  <div className="lg:col-span-8 bg-[#fff9db] rounded-[36px] p-6 sm:p-8 md:p-10 border border-[#ffec99]/60 relative overflow-hidden flex flex-col justify-between min-h-[300px] shadow-xs">
                    <div className="max-w-[340px] sm:max-w-[380px] z-10 space-y-3">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 backdrop-blur-xs text-[#5446a8] text-[11px] font-black uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[16px] text-amber-500">star</span>
                        <span>Misión de Hoy</span>
                      </div>

                      <h2 className="font-heading font-black text-2xl sm:text-3xl md:text-4xl text-[#2d2c38] leading-tight">
                        ¿Listo para demostrar tu nivel de inglés?
                      </h2>

                      <p className="text-xs sm:text-sm text-[#585567] font-medium leading-relaxed">
                        Tus actividades y evaluaciones diagnósticas están preparadas por tus docentes de San José.
                      </p>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (nextPendingExam) handleStartExam(nextPendingExam)
                            else setCurrentSection('battery')
                          }}
                          className="px-6 py-3.5 rounded-2xl bg-[#5446a8] hover:bg-[#413689] text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-[#5446a8]/25 transition-all inline-flex items-center gap-2 cursor-pointer transform hover:-translate-y-0.5"
                        >
                          <span>{allTestsCompleted ? 'Revisar mi ruta' : 'Iniciar mi ruta de hoy'}</span>
                          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </button>
                      </div>
                    </div>

                    {/* Ilustración 3D circular integrada en el diseño */}
                    <div className="hidden sm:block absolute -right-6 -bottom-6 w-56 h-56 md:w-64 md:h-64 rounded-full overflow-hidden border-8 border-white/80 shadow-xl bg-gradient-to-tr from-[#e9e3ff] to-[#fff4e6] pointer-events-none">
                      <img
                        src={studentHeroImg}
                        alt="Estudiante aprendiendo"
                        className="w-full h-full object-cover object-center scale-105"
                      />
                    </div>
                  </div>

                  {/* COLUMNA DERECHA: WIDGET DE RACHA + ANILLO DE PROGRESO */}
                  <div className="lg:col-span-4 space-y-5">
                    
                    {/* Widget Racha de Días */}
                    <div className="bg-white rounded-[32px] p-5 sm:p-6 border border-[#f1eef8] shadow-xs space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#fff4e6] text-[#f76707] flex items-center justify-center">
                          <span className="material-symbols-outlined text-[24px]">local_fire_department</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold text-[#8e8a9f] uppercase tracking-wider block">
                            Racha de Diagnóstico
                          </span>
                          <h4 className="text-sm font-black text-[#2d2c38]">
                            ¡{totalCompletedCount} de {examsList.length} pruebas listas!
                          </h4>
                        </div>
                      </div>

                      {/* Días / Tests Checkmarks en fila */}
                      <div className="flex items-center justify-between gap-1.5 pt-1">
                        {examsList.slice(0, 5).map((ex, i) => {
                          const isDone = Boolean(completedExams[ex.id])
                          return (
                            <div
                              key={ex.id || i}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                                isDone
                                  ? 'bg-[#d7fbe8] text-[#00714d]'
                                  : 'bg-[#f4f3fa] text-[#8e8a9f]'
                              }`}
                              title={ex.title}
                            >
                              {isDone ? (
                                <span className="material-symbols-outlined text-[16px]">check</span>
                              ) : (
                                `T${i + 1}`
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Widget Porcentaje Circular y Estatus */}
                    <div className="bg-white rounded-[32px] p-6 border border-[#f1eef8] shadow-xs text-center space-y-3">
                      <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-[#f1eef8]"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className="text-[#5446a8] transition-all duration-700 ease-out"
                            strokeDasharray={`${progressPercent}, 100`}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="font-heading font-black text-xl text-[#2d2c38]">
                            {progressPercent}%
                          </span>
                          <span className="text-[9px] font-bold text-[#8e8a9f] uppercase">
                            avance
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-heading font-black text-sm text-[#2d2c38]">
                          {allTestsCompleted ? '¡Batería Completada!' : '¡Excelente ritmo!'}
                        </h4>
                        <p className="text-[11px] text-[#6b677e] leading-snug">
                          {allTestsCompleted
                            ? 'Tus profesores ya tienen todas tus evaluaciones.'
                            : `Te faltan ${examsList.length - totalCompletedCount} actividades para completar tu meta.`}
                        </p>
                      </div>
                    </div>

                    {/* Tarjeta Nota del Docente */}
                    <div className="bg-white rounded-[32px] p-5 border border-[#f1eef8] shadow-xs flex items-start gap-3 text-left">
                      <div className="w-9 h-9 rounded-2xl bg-[#f4f1fd] text-[#5446a8] flex items-center justify-center font-black text-xs shrink-0">
                        SJ
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-[#2d2c38]">Mensaje Docente</span>
                          <span className="material-symbols-outlined text-rose-400 text-[16px]">favorite</span>
                        </div>
                        <p className="text-[11px] text-[#6b677e] leading-relaxed italic">
                          "Haz tu mejor esfuerzo y responde con confianza cada sección."
                        </p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* SECCIÓN INFERIOR: "Your learning path" (Ruta de Aprendizaje con Tarjetas Píldora) */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-[#8a70d6] uppercase tracking-wider block">
                        Preparado para hoy
                      </span>
                      <h3 className="font-heading font-black text-lg text-[#2d2c38]">
                        Tu ruta de evaluación (Learning Path)
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentSection('battery')}
                      className="text-xs font-bold text-[#5446a8] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ver todas ({examsList.length})</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>

                  {/* Lista de Actividades en formato Píldoras horizontales con botón verde/morado */}
                  <div className="space-y-3">
                    {examsList.map((exam, idx) => {
                      const isDone = Boolean(completedExams[exam.id])
                      const meta = getModuleMeta(idx, exam.toolType)
                      const answersCount = Object.keys(studentAnswers[exam.id] || {}).length

                      return (
                        <div
                          key={exam.id}
                          className={`bg-white rounded-[26px] p-4 sm:p-5 border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs ${
                            isDone ? 'border-emerald-200 bg-emerald-50/20' : 'border-[#f1eef8] hover:border-[#8a70d6]/50 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            {/* Icono temático pastel */}
                            <div className={`w-12 h-12 rounded-2xl ${meta.bg} ${meta.text} flex items-center justify-center shrink-0`}>
                              <span className="material-symbols-outlined text-[24px]">{meta.icon}</span>
                            </div>

                            <div className="space-y-0.5 text-left">
                              <span className="text-[10px] font-bold text-[#8e8a9f] uppercase tracking-wider block">
                                {meta.tag} • Nivel {exam.level || 'A1-C1'}
                              </span>
                              <h4 className="font-heading font-black text-sm sm:text-base text-[#2d2c38]">
                                {exam.title}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-5">
                            <div className="flex items-center gap-3 text-xs text-[#8e8a9f] font-medium">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">schedule</span>
                                <span>{exam.timeLimitMinutes || 15} min</span>
                              </span>
                              <span>•</span>
                              <span>{exam.questions?.length || 0} preguntas</span>
                            </div>

                            {/* Botón de acción play redondeado */}
                            <button
                              type="button"
                              disabled={isDone}
                              onClick={() => handleStartExam(exam)}
                              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                                isDone
                                  ? 'bg-[#d7fbe8] text-[#00714d]'
                                  : answersCount > 0
                                  ? 'bg-[#e9e3ff] text-[#5446a8] hover:bg-[#5446a8] hover:text-white'
                                  : 'bg-[#d7fbe8] text-[#00714d] hover:bg-[#00714d] hover:text-white shadow-xs'
                              }`}
                              title={isDone ? 'Completado' : 'Comenzar actividad'}
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                {isDone ? 'check' : 'play_arrow'}
                              </span>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : currentSection === 'battery' ? (
              /* ================= CASO 3: VISTA BATERÍA COMPLETA ================= */
              <div className="space-y-6 animate-fadeIn text-left">
                <div className="bg-white rounded-[32px] p-6 border border-[#f1eef8] shadow-xs space-y-2">
                  <span className="text-[10px] font-bold text-[#8a70d6] uppercase tracking-wider block">
                    Batería Diagnóstica Oficial
                  </span>
                  <h2 className="font-heading font-black text-xl text-[#2d2c38]">
                    Pruebas e Instrumentos de Nivelación
                  </h2>
                  <p className="text-xs text-[#585567]">
                    Completa cada módulo a tu propio ritmo dentro del tiempo establecido.
                  </p>
                </div>

                {!isStudentAuthorizedForExam ? (
                  <div className="bg-[#fff9db] rounded-[32px] p-8 border border-[#ffec99] text-center space-y-3">
                    <span className="material-symbols-outlined text-4xl text-amber-600">lock_clock</span>
                    <h3 className="font-black text-base text-amber-950">
                      Acceso en espera por horario docente
                    </h3>
                    <p className="text-xs text-amber-800 max-w-md mx-auto">
                      Las pruebas se activan por grupos y secciones guiadas por tu profesor de inglés.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {examsList.map((exam, idx) => {
                      const isDone = Boolean(completedExams[exam.id])
                      const meta = getModuleMeta(idx, exam.toolType)
                      return (
                        <div
                          key={exam.id}
                          className={`bg-white rounded-[28px] p-6 border space-y-4 flex flex-col justify-between transition-all ${
                            isDone ? 'border-emerald-200 bg-emerald-50/20' : 'border-[#f1eef8] hover:border-[#8a70d6]'
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${meta.bg} ${meta.text}`}>
                                Test {idx + 1} • {exam.level || 'A1-C1'}
                              </span>
                              <span className="text-xs font-black text-[#5446a8] bg-[#e9e3ff] px-2.5 py-0.5 rounded-full">
                                {exam.weight || 15}% peso
                              </span>
                            </div>

                            <h3 className="font-heading font-black text-base text-[#2d2c38]">
                              {exam.title}
                            </h3>

                            <div className="flex items-center gap-3 text-xs text-[#8e8a9f]">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[15px]">timer</span>
                                {exam.timeLimitMinutes || 15} min
                              </span>
                              <span>•</span>
                              <span>{exam.questions?.length || 0} preguntas</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isDone}
                            onClick={() => handleStartExam(exam)}
                            className={`w-full py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                              isDone
                                ? 'bg-[#d7fbe8] text-[#00714d] cursor-default'
                                : 'bg-[#5446a8] hover:bg-[#413689] text-white shadow-md cursor-pointer'
                            }`}
                          >
                            <span>{isDone ? 'Completado' : 'Comenzar prueba'}</span>
                            <span className="material-symbols-outlined text-[16px]">
                              {isDone ? 'check' : 'arrow_forward'}
                            </span>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : currentSection === 'interview' ? (
              /* ================= CASO 4: VISTA ENTREVISTA ORAL ================= */
              <div className="bg-white rounded-[36px] p-8 md:p-12 border border-[#f1eef8] shadow-xs space-y-6 animate-fadeIn text-center max-w-2xl mx-auto">
                <div className="w-20 h-20 rounded-3xl bg-[#e9e3ff] text-[#5446a8] mx-auto flex items-center justify-center shadow-inner">
                  <span className="material-symbols-outlined text-4xl">record_voice_over</span>
                </div>

                <div className="space-y-2">
                  <span className="px-3.5 py-1 rounded-full bg-[#f4f1fd] text-[#5446a8] text-xs font-black uppercase tracking-wider">
                    Entrevista Oral Docente
                  </span>
                  <h2 className="font-heading font-black text-2xl text-[#2d2c38]">
                    Evaluación de Speaking en Vivo
                  </h2>
                  <p className="text-xs sm:text-sm text-[#585567] max-w-md mx-auto">
                    La entrevista oral se realiza presencialmente con tu profesor de inglés para evaluar fluidez y pronunciación.
                  </p>
                </div>

                {isInterviewActiveForStudent ? (
                  <div className="p-5 rounded-3xl bg-[#e9e3ff] border-2 border-[#8a70d6] text-center space-y-2 animate-pulse">
                    <span className="text-xs font-black uppercase text-[#413689] tracking-wider block">
                      🎙️ ¡Es tu turno de pasar con el docente!
                    </span>
                    <p className="text-xs text-[#5446a8] font-medium">
                      Por favor acércate a la mesa de evaluación para tu entrevista oral.
                    </p>
                  </div>
                ) : (
                  <div className="p-5 rounded-3xl bg-[#faf9fe] border border-[#eceaf6] text-center space-y-1">
                    <span className="text-xs font-bold text-[#2d2c38] block">Estado de turno:</span>
                    <span className="text-xs text-[#8e8a9f]">En espera de asignación de turno por tu profesor.</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentSection('home')}
                    className="px-6 py-3 rounded-2xl bg-[#5446a8] text-white font-black text-xs hover:bg-[#413689] transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>Volver a Inicio</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ================= CASO 5: VISTA RESULTADOS Y NIVEL ASIGNADO ================= */
              <div className="bg-white rounded-[36px] p-8 md:p-12 border border-[#f1eef8] shadow-xs space-y-6 animate-fadeIn text-center max-w-2xl mx-auto">
                <div className="w-20 h-20 rounded-3xl bg-[#d7fbe8] text-[#00714d] mx-auto flex items-center justify-center shadow-inner">
                  <span className="material-symbols-outlined text-4xl">military_tech</span>
                </div>

                <div className="space-y-2">
                  <span className="px-3.5 py-1 rounded-full bg-[#e9e3ff] text-[#5446a8] text-xs font-black uppercase tracking-wider">
                    Estatus de Colocación
                  </span>
                  <h2 className="font-heading font-black text-2xl text-[#2d2c38]">
                    {isPlacementFullyConcluded ? 'Nivel Asignado para el Ciclo 2027' : 'Evaluación en Proceso de Revisión'}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#585567] max-w-md mx-auto">
                    {isPlacementFullyConcluded
                      ? 'Tus profesores han completado la revisión diagnóstica.'
                      : 'Tus resultados están siendo consolidados por el equipo docente de inglés.'}
                  </p>
                </div>

                {isPlacementFullyConcluded && student.assignedLevel && (
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-[#f4f1fd] to-[#e9e3ff] border border-[#8a70d6]/30 max-w-sm mx-auto space-y-2">
                    <span className="text-[10px] uppercase font-bold text-[#5446a8] tracking-wider block">
                      Nivel Oficial Asignado
                    </span>
                    <h3 className="font-heading font-black text-4xl text-[#413689]">
                      {student.assignedLevel}
                    </h3>
                    <span className="text-xs font-bold text-[#8a70d6] block">
                      Serie: Get Involved (Macmillan)
                    </span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentSection('home')}
                    className="px-6 py-3 rounded-2xl bg-[#5446a8] text-white font-black text-xs hover:bg-[#413689] transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>Volver a Inicio</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            )}

          </main>
        </div>
    </div>
  )
}
