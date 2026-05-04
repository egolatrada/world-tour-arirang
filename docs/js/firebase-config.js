/**
 * Configuración desde Firebase Console → engranaje → Configuración del proyecto → Tus apps.
 * Solo exportamos datos (sin import "firebase/…"): GitHub Pages sirve JS al navegador sin bundler,
 * y los imports tipo "firebase/app" fallan en consola salvo que uses URL completas (CDN en app.js).
 */
export const firebaseConfig = {
  apiKey: "AIzaSyD2YVJCui6MycwktJf4yu8iC8UeIL1ml70",
  authDomain: "world-tour-arirang.firebaseapp.com",
  projectId: "world-tour-arirang",
  storageBucket: "world-tour-arirang.firebasestorage.app",
  messagingSenderId: "336157639280",
  appId: "1:336157639280:web:ff679fcd54d096db822ab5",
  measurementId: "G-JGW4YXJHL1",
};

export function isFirebaseConfigured() {
  const k = firebaseConfig.apiKey || "";
  return k.length > 12 && !k.startsWith("REEMPLAZA");
}
