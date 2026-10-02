# 🦉 English Level — Examen de Nivelación de Inglés (Firebase + Hosting)

App estilo Duolingo para **docentes admin de inglés** que crean exámenes de ubicación por grado, y **alumnos** que los presentan y reciben su nivel asignado (Básico → Intermedio → Avanzado).

## Estructura
```
src/
  lib/firebase.js        ← conexión a Firebase (Auth, Firestore, Storage)
  lib/dataService.js     ← guardar/leer exámenes y resultados + regla de clasificación
  modules/registry.js    ← CATÁLOGO de módulos interactivos (paquetes tipo wizard)
  components/ExamBuilder.jsx    ← wizard del docente (3 pasos)
  components/QuestionPlayer.jsx ← reproductor interactivo de cada módulo
  components/StudentExam.jsx    ← ruta del examen del alumno con desbloqueo por niveles
```

## Módulos interactivos incluidos
🔘 Opción múltiple · 🧩 Ordenar oración (tocar/arrastrar palabras) · 📝 Completar párrafo (huecos con banco de palabras) · 🎧 Escuchar audio y responder (voz TTS o archivo subido) · 🎤 Hablar (graba y transcribe con Web Speech API) · ✍️ Escritura manual de la oración escuchada.

Para **agregar un nuevo tipo de interactividad** solo se crea una entrada en `modules/registry.js` con `makeEmpty()` (editor automático) y `checkAnswer()` (autocorrección). El catálogo del wizard la muestra sola.

## Regla de nivelación
Cada nivel exige un mínimo de aciertos (`minCorrect` en registry.js). Si el alumno lo alcanza, se **desbloquea el siguiente nivel**; si no, se detiene y queda clasificado en el último nivel aprobado (o "Básico reforzado"). El resultado se guarda en Firestore (`results/{id}`) para determinar las clases del próximo año.

## Configuración de Firebase (5 minutos)
1. Crea un proyecto en https://console.firebase.google.com
2. Agrega una app **Web** y copia el `firebaseConfig`.
3. Pega los valores en `.env` (usa `.env.example` como plantilla) — NO toques `firebase.js`.
4. En la consola activa: **Firestore** (crea la BD), **Storage** (audios) y **Authentication** (proveedor Google, opcional).
5. Despliega reglas: `firebase deploy --only firestore:rules,storage`

## Correr / Desplegar
```bash
npm install
npm run dev      # desarrollo local
npm run build    # genera dist/
npx firebase-tools login
npx firebase-tools use <tu-project-id>
npm run deploy   # build + hosting → https://<proyecto>.web.app
```

> Sin configurar Firebase, la app funciona con `localStorage` para que puedas probar todo el flujo docente→alumno antes de conectar la nube.
