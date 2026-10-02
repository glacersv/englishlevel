# 📘 Plan de Desarrollo — Plataforma de Nivelación de Inglés

Stack: **React + Vite · Firebase Auth · Firestore · Firebase Hosting**

---

## 1. Roles y usuarios

| Rol | Quién es | Qué puede hacer |
|---|---|---|
| **admin** | Coordinador de inglés | Gestionar usuarios (crear/desactivar teachers y alumnos), configurar grados y secciones, definir umbrales de aprobación por nivel, ver reportes globales, publicar exámenes |
| **teacher** | Docente de inglés | Crear exámenes con el wizard (módulos interactivos), asignarlos a grado+sección, ver resultados de sus secciones |
| **student** | Alumno | Render su examen de nivelación por grado/sección, avanzar de nivel si alcanza los aciertos mínimos, ver su nivel asignado |

Los roles se guardan como **custom claims** en Firebase Auth (`role: admin | teacher | student`) → las reglas de Firestore ya los respetan. El alumno además lleva `grade` y `section` en su perfil (`users/{uid}`).

## 2. Modelo de datos (Firestore)

```
users/{uid}            -> { name, email, role, grade?, section?, active }
grades/{gradeId}       -> { name: "1°..5°", sections: ["A","B","C"] }
exams/{examId}         -> { level, title, grade, section, createdBy, questions[], minCorrect, active }
results/{resultId}     -> { studentUid, studentName, grade, section, attempts[], assignedLevel, date }
settings/config        -> { thresholds: {basico, intermedio, avanzado}, openExams: bool }
```

## 3. Fases del plan

### ✅ Fase 1 — Núcleo (terminada)
- [x] Proyecto React + Vite + conexión Firebase con fallback local
- [x] Catálogo de módulos interactivos tipo "paquete/wizard" (registry): opción múltiple, ordenar oraciones, completar párrafo, escuchar audio, hablar (voz→texto), escritura manual
- [x] Wizard docente para crear exámenes (3 pasos)
- [x] Reproductor del examen estilo Duolingo (progreso, XP, feedback inmediato)
- [x] Regla de avance entre niveles y clasificación final

### 🔜 Fase 2 — Autenticación y roles (PRÓXIMA)
- [ ] Pantallas de Login / Registro
- [ ] Seed de admin inicial (primer usuario creado manualmente o por script)
- [ ] Custom claims vía Cloud Function o Console (`setCustomUserClaims`)
- [ ] Router protegido por rol (admin / teacher / student ven pantallas distintas)
- [ ] Endurecer firestore.rules y storage.rules según roles

### 🔜 Fase 3 — Panel Admin: gestión de usuarios y estructura
- [ ] CRUD de docentes (crear cuenta, asignar grado/secciones a su cargo)
- [ ] CRUD de alumnos **por grado y sección** (importación masiva desde CSV/Excel)
- [ ] Configuración de grados y secciones del colegio
- [ ] Configuración de umbrales mínimos de aciertos por nivel

### 🔜 Fase 4 — Módulo docente mejorado
- [ ] Asignar examen a grado + sección específicos
- [ ] Banco de preguntas reutilizable por tema (cuando entregues los temas de evaluación, se cargan como seed)
- [ ] Duplicar/editar exámenes de años anteriores
- [ ] Subir audios propios a Firebase Storage (además del TTS)

### 🔜 Fase 5 — Experiencia del alumno
- [ ] El alumno inicia sesión y ve SOLO el examen de su grado/sección
- [ ] Pantalla de mapa de niveles estilo Duolingo (Básico → Intermedio → Avanzado bloqueados/desbloqueados)
- [ ] Guardado de intento parcial (que no pierda progreso si cierra la app)
- [ ] Resultado final: nivel asignado para las clases del próximo año

### 🔜 Fase 6 — Reportes y cierre
- [ ] Dashboard admin: distribución de niveles por grado/sección
- [ ] Reporte docente: tabla de alumnos, aciertos, nivel alcanzado, exportable a CSV
- [ ] Historial de intentos por alumno
- [ ] Cierre de período de evaluaciones (flag en settings)

### 🔜 Fase 7 — Despliegue y calidad
- [ ] Índices de Firestore (`firestore.indexes.json`)
- [ ] Hosting: dominio, cache, SPA fallback (ya configurado en firebase.json)
- [ ] Pruebas del flujo completo con datos reales
- [ ] Revisión de costos/reglas antes de producción

## 4. Regla de negocio central
Orden de niveles: **básico → intermedio → avanzado**.
El alumno rinde el nivel N; si `aciertos ≥ minCorrect(N)` se desbloquea N+1. Su **nivel asignado** es el último que aprobó; ese determina las clases que recibirá el próximo año. Si reprueba básico → "sin_nivel" (básico reforzado).

## 5. Prioridad inmediata
**Fase 2 (Auth + roles)** porque todo lo demás (panel admin, alumnos por grado/sección) depende de saber quién inicia sesión.
