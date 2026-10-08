# PLAN DE IMPLEMENTACIÓN: PANEL DE CONTROL Y DESPACHO POR GRADOS (PLATAFORMA Y ENTREVISTAS)

## 1. Resumen del Requerimiento
Crear un panel dentro del portal docente (**TeacherWorkspace**) donde:
- Todos los grados (7°, 8°, 9°, 1° Bach, 2° Bach) inicien por defecto **pausados/bloqueados**.
- Cada grado tenga dos controles maestros independientes:
  1. **🖥️ Examen de Plataforma:** Iniciar (Play), Pausar (congela el cronómetro en vivo al alumno) y Finalizar.
  2. **🎙️ Entrevista Oral:** Iniciar (Play), Pausar y Cerrar/Finalizar.
- Al hacer clic o desplegar un grado (acordeón):
  - Se muestra la nómina de todos sus alumnos.
  - Filtros instantáneos por: **Sección** (A, B, C, etc.), **Nivel Institucional** (L1-A, L2, etc.), **Docente Asignado** (Teacher Ronald, Silvia, Nelsi) y **Búsqueda por Nombre / NIE**.
  - Control individual por alumno:
    - **Plataforma individual:** Botón de Play/Pausa solo para ese alumno (para casos de alumnos que llegaron tarde o excepciones mientras el grado está pausado).
    - **Entrevista individual:** Botón directo para pasar a ese alumno a la entrevista oral inmediatamente (abre la rúbrica oficial de evaluación oral con sus preguntas pre-cargadas).

---

## 2. Arquitectura de Datos (`dataService.js`)

### Estructura en Firestore (`systemSettings/examDispatch`)
```javascript
{
  // Estado maestro por grado
  gradesControl: {
    "7": {
      platformStatus: "paused",   // 'active' | 'paused' | 'finished'
      interviewStatus: "paused",  // 'active' | 'paused' | 'finished'
      pausedAt: "2026-10-08T12:00:00Z",
      updatedAt: "2026-10-08T12:00:00Z"
    },
    "8": { platformStatus: "paused", interviewStatus: "paused" },
    "9": { platformStatus: "paused", interviewStatus: "paused" },
    "1": { platformStatus: "paused", interviewStatus: "paused" },
    "2": { platformStatus: "paused", interviewStatus: "paused" }
  },

  // Excepciones / Overrides individuales por alumno (identificado por email)
  studentOverrides: {
    "alumno@ejemplo.com": {
      platformAllowed: true,     // Puede seguir aunque su grado esté en pausa
      platformStatus: "active",  // 'active' | 'paused' | 'finished'
      interviewAllowed: true,    // Habilitado directamente para entrevista
      updatedAt: "2026-10-08T12:05:00Z"
    }
  }
}
```

### Funciones a implementar en `dataService.js`:
- `setGradeExamStatus(grade, examType, status)`: Cambia el estado del grado ('platform' o 'interview') a 'active', 'paused' o 'finished'.
- `setStudentExamStatus(studentEmail, examType, status)`: Establece una excepción individual para un alumno.
- `resetGradeExamOverrides(grade)`: Limpia las excepciones individuales de un grado cuando se reinicia.
- `subscribeExamDispatch(callback)`: Mantiene la sincronización en vivo (`onSnapshot` de Firestore + eventos locales).

---

## 3. Componente de Interfaz (`GradeDispatchHub.jsx` / `TeacherWorkspace.jsx`)

### Vistas y Controles:
1. **Cabecera de cada Tarjeta de Grado:**
   - Nombre del grado con badge de estado actual (🟢 En vivo | 🟡 Pausado | 🔴 Finalizado).
   - Botonera dual:
     - **Plataforma:** ▶️ Iniciar | ⏸️ Pausar | ⏹️ Finalizar.
     - **Entrevista:** 🎙️ Iniciar | ⏸️ Pausar | ⏹️ Finalizar.
   - Resumen rápido: Alumnos activos, completados, pendientes.
   - Botón de alternar / desplegar lista (Accordion).

2. **Panel Desplegado del Grado:**
   - Barra de filtros:
     - Píldoras de Sección (A, B, C...).
     - Píldoras de Nivel de Inglés (L1-A, L2-A, L3, etc.).
     - Filtro de Docente Evaluador Asignado.
     - Buscador por texto (nombre, apellido, NIE).
   - Ficha de Alumno con:
     - Nombre completo, NIE, sección y nivel.
     - Estado en plataforma: progreso (ej. 14/30 preguntas), tiempo consumido.
     - Control individual de plataforma: Botón Play individual (permite saltarse la pausa general del grado).
     - Control individual de entrevista: Botón "Llamar a Entrevista" (abre directamente la consola con rúbrica oral).

---

## 4. Experiencia del Alumno en Vivo (`StudentGamifiedExam.jsx`)

1. **Detección de Pausa:**
   - Si `gradesControl[grade].platformStatus === 'paused'` y el alumno NO tiene override activo:
     - El temporizador se detiene (se congela el tiempo restante exacto).
     - Se muestra un overlay modal no descartable:
       > ⏸️ **Evaluación en Pausa por el Docente**
       > Tu tiempo ha sido congelado. Espera la indicación de tu profesor para continuar.
     - Las preguntas y opciones quedan deshabilitadas.
2. **Reanudación (Play):**
   - El overlay desaparece con animación fluida.
   - El temporizador continúa restando tiempo desde el segundo exacto donde se detuvo.
3. **Finalización Forzada (Stop):**
   - El examen se cierra y guarda automáticamente las respuestas contestadas hasta ese momento.

---

## 5. Pasos de Ejecución al llegar al Trabajo
1. Abrir terminal en la carpeta del proyecto.
2. Ejecutar `git pull` para descargar este plan y los archivos.
3. Decir al asistente: *"Ejecuta e implementa el plan de PLAN_DESPACHO_GRADOS.md"*.
