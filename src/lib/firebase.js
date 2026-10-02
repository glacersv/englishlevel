// ============================================================
// CONEXIÓN A FIREBASE
// 1. Ve a https://console.firebase.google.com y crea un proyecto
// 2. Registra una app Web (</>) y copia el objeto firebaseConfig
//    que te muestra la consola y pégalo abajo reemplazando los valores.
// 3. En Firestore crea la base de datos (modo producción con reglas).
// 4. Para las grabaciones de audio del alumno, activa Storage.
// ============================================================
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY || "TU_API_KEY",
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN || "tu-proyecto.firebaseapp.com",
  projectId: import.meta.env.VITE_FB_PROJECT_ID || "tu-proyecto",
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET || "tu-proyecto.appspot.com",
  messagingSenderId: import.meta.env.VITE_FB_SENDER_ID || "000000000000",
  appId: import.meta.env.VITE_FB_APP_ID || "1:000000000000:web:xxxx",
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const googleProvider = new GoogleAuthProvider()

// ¿Está configurado Firebase con credenciales reales?
export const isFirebaseConfigured = () =>
  !firebaseConfig.apiKey.includes("TU_API_KEY")
