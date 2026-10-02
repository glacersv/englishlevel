# PROMPT MAESTRO — Plataforma de Nivelación de Inglés (Firebase + Hosting)

Pega este prompt en Gemini Studio (AI Studio / Code Assist / Build) junto con el código del repositorio https://github.com/glacersv/englishlevel

---

## 1. RESUMEN DEL PROYECTO

Construir una web app (React + Vite + Firebase) para **exámenes de nivelación de inglés** en una institución educativa:

- **3 roles**: `admin` (coordinador de inglés), `teacher` (docente), `student` (alumno).
- Los alumnos están organizados por **grado y sección**.
- El docente crea exámenes de ubicación eligiendo **tipos de evaluación interactivos** (un catálogo de "módulos/paquetes" tipo wizard): opción múltiple, ordenar oraciones arrastrando palabras, completar párrafos con huecos, escuchar audio y responder, grabar voz respondiendo a una pregunta, escribir manualmente lo escuchado (dictado).
- Cada pregunta define respuestas correctas e incorrectas; la autocorrección es automática.
- **Regla de avance**: si el alumno alcanza el mínimo de aciertos configurado por nivel, se desbloquea el siguiente nivel; si no, se detiene ahí.
- **Clasificación final**: según el último nivel completado, se asigna el nivel (Básico / Intermedio / Avanzado) al que recibirá clases el próximo año. El resultado se guarda en Firestore.
- Experiencia estilo **Duolingo**: barra de progreso, feedback inmediato, XP, mapa de niveles con candados.

## 2. STACK Y CONEXIÓN FIREBASE (obligatorio)

- Frontend: React 18 + Vite, TailwindCSS opcional.
- Firebase: **Authentication** (login de admin/teachers; alumnos pueden entrar con código o login), **Firestore** (datos), **Storage** (audios subidos por docentes), **Hosting** (despliegue).
- Credenciales en variables de entorno `.env` (`VITE_FIREBASE_*`). Ver `src/lib/firebase.js`.
- Custom claims o campo `role` en documento `users/{uid}` para autorizar rutas y reglas de seguridad.

## 3. ESTRUCTURA ACTUAL DEL REPOSITORIO

```
english-level-app/
├── firebase.json              # config hosting
├── firestore.rules            # reglas por rol
├── firestore.indexes.json
├── storage.rules
├── PLAN_DESARROLLO.md         # plan por fases (leerlo primero)
├── .env.example
└── src/
    ├── lib/firebase.js        # init Auth/Firestore/Storage + fallback localStorage
    ├── modules/registry.js    # CATÁLOGO DE MÓDULOS INTERACTIVOS (paquetes)
    │                          # cada módulo: id, nombre, icono, makeEmpty() -> editor,
    │                          # checkAnswer(userAnswer) -> correcto/incorrecto
    ├── pages/ExamBuilder.jsx  # wizard docente: 1) datos examen (grado/nivel) 2) armar preguntas 3) publicar
    ├── pages/StudentExam.jsx  # reproductor estilo Duolingo + regla de avance + clasificación
    └── ...
```

## 4. MODELO DE DATOS FIRESTORE

```
users/{uid}            { role: 'admin'|'teacher'|'student', name, email, grade?, section? }
grades/{gradeId}       { name, sections: ['A','B',...] }
exams/{examId}         { title, level: 'basico'|'intermedio'|'avanzado', grade, section,
                         minCorrect, timeLimit?, published, questions: [ { moduleId, ...config } ] }
results/{resultId}     { studentUid, examId, score, correctCount, passed, assignedLevel, date }
settings/config        { thresholds: { basico, intermedio, avanzado }, schoolName }
```

## 5. FASES DEL PLAN DE DESARROLLO (ver PLAN_DESARROLLO.md)

- **Fase 1 ✅**: núcleo Firebase, catálogo de módulos, wizard docente, examen alumno, regla de avance.
- **Fase 2 🔜 PRIORIDAD**: Autenticación con Firebase Auth + router protegido por roles (admin/teacher/student).
- **Fase 3**: Panel Admin — CRUD de docentes y alumnos por grado/sección, importación CSV de estudiantes, edición de umbrales mínimos de aciertos, reporte general.
- **Fase 4**: Módulo Docente — asignar exámenes a grado+sección específicos, banco de preguntas por tema (los temas institucionales se cargarán como seed), subir audios propios a Storage.
- **Fase 5**: Experiencia Alumno — mapa de niveles estilo Duolingo con candados, historial personal, intents restantes.
- **Fase 6**: Reportes y exportables (CSV/PDF), vista del admin por sección.
- **Fase 7**: Deploy a Firebase Hosting + dominios, índices Firestore, optimización.

## 6. INSTRUCCIÓN PARA GEMINI

> Trabaja sobre este repositorio implementando la **Fase 2 (Auth + roles)** y luego la **Fase 3 (Panel Admin)** siguiendo fielmente `PLAN_DESARROLLO.md`. Respeta:
> 1. La arquitectura de módulos en `src/modules/registry.js`: NO hardcodear tipos de pregunta fuera del registry; nuevas interactividades se agregan como entradas del registry con su editor (`makeEmpty`) y su autocorrector (`checkAnswer`).
> 2. Reglas de seguridad coherentes con los roles (solo admin crea/edita usuarios y umbrales; solo teacher publica exámenes; student solo lee exámenes publicados de SU grado/sección y escribe su propio resultado).
> 3. UI gamificada estilo Duolingo (colores vivos, animaciones simples, feedback inmediato).
> 4. Mantener el fallback a localStorage para desarrollo sin credenciales.
> Entrega cada fase con: archivos creados/modificados, migraciones de datos necesarias y pasos de prueba.

## 7. DATOS PENDIENTES QUE APORTA EL COLEGIO

- Listado de **temas evaluados por nivel** (se convertirán en bancos de preguntas seed).
- Umbrales oficiales de aciertos por nivel.
- Grados y secciones reales.
