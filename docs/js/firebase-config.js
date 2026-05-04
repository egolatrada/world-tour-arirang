/**
 * Copia este archivo y reemplaza con tu proyecto Firebase
 * (Proyecto → Configuración → Tus apps → SDK).
 * Para GitHub Pages: puedes dejar valores públicos aquí y restringir
 * el dominio en la consola de Google Cloud (clave API).
 */
export const firebaseConfig = {
  apiKey: "REEMPLAZA_API_KEY",
  authDomain: "REEMPLAZA.firebaseapp.com",
  projectId: "REEMPLAZA_PROJECT_ID",
  storageBucket: "REEMPLAZA.appspot.com",
  messagingSenderId: "REEMPLAZA",
  appId: "REEMPLAZA_APP_ID",
};

export function isFirebaseConfigured() {
  const k = firebaseConfig.apiKey || "";
  return k.length > 12 && !k.startsWith("REEMPLAZA");
}
