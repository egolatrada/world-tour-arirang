# ARMY Metropolitano (Madrid, junio 2026)

Sitio estático para GitHub Pages (`/docs`): información, listado de sectores del Cívitas Metropolitano, publicaciones de intercambio/acercamiento, foro público y mensajes privados entre usuarios.

## Publicar en GitHub Pages

1. Crea un repositorio y sube esta carpeta.
2. En el repo: **Settings → Pages → Build and deployment → Source**: *Deploy from a branch*.
3. Elige la rama (por ejemplo `main`) y carpeta **`/docs`**, guarda.
4. La web quedará en `https://<usuario>.github.io/<repo>/` (puede tardar un minuto).

## Firebase (necesario para foro, publicaciones y bandeja)

GitHub Pages solo sirve archivos estáticos; el chat en tiempo real usa **Firebase** (plan gratuito suficiente para una comunidad moderada).

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Añade una app Web y copia la configuración SDK en `docs/js/firebase-config.js` (sustituye los valores `REEMPLAZA_*`).
3. **Authentication → Sign-in method** (en el mismo proyecto):
   - Activa **Anónimo** (entrada rápida como invitado).
   - Activa **Google**: elige un correo de asistencia del proyecto y guarda. Si pide configuración adicional, sigue el asistente (OAuth).
   - Activa **Correo electrónico / contraseña** (email/contraseña).
4. **Dominios autorizados** (imprescindible para que Google funcione en tu web): en **Authentication → Settings → Authorized domains**, añade el dominio donde se publica el sitio, por ejemplo `tuusuario.github.io` (GitHub Pages no usa `www`).
5. **Firestore Database**: crea la base; copia **tal cual** el archivo `firestore.rules` de la raíz del repo en **Firestore → Rules → Publicar**. Si las reglas no coinciden con el repo, verás *Missing or insufficient permissions* al abrir la bandeja.
6. **Índices de la bandeja**: la consulta de hilos usa `participants` + `updatedAt`. Opciones:
   - Con [Firebase CLI](https://firebase.google.com/docs/cli): en la carpeta del repo, `firebase deploy --only firestore:indexes` (o despliega todo el bloque Firestore).
   - Sin CLI: abre la web con F12 → pestaña Consola; si aparece un enlace a `console.firebase.google.com` con *create composite index*, ábrelo y pulsa **Crear índice**. El archivo `firestore.indexes.json` describe el mismo índice para referencia.

Los avisos *Cross-Origin-Opener-Policy* al usar **Entrar con Google** suelen ser ruido del navegador con la ventana emergente; no impiden el inicio de sesión.

### Misma cuenta en otro dispositivo

En **Perfil** la web permite **enlazar** la sesión anónima con Google o con correo y contraseña (Firebase fusiona la cuenta y **mantiene el mismo `uid`**, así no se pierden mensajes ni datos). En el segundo dispositivo no hace falta enlazar de nuevo: usa **Entrar con Google** o **Entrar con correo** con las mismas credenciales.

Las claves de Firebase en cliente son públicas por naturaleza; restringe la **API key** por dominio HTTP en Google Cloud Console si lo deseas.

## Archivos principales

- `docs/index.html` — estructura y textos legales.
- `docs/css/styles.css` — estética (Arirang `#E41A3E` + degradado oscuro).
- `docs/js/app.js` — rutas, Firebase, foro y mensajes.
- `docs/js/sections-data.js` — sectores de referencia.
- `firestore.rules` — reglas de seguridad para Firestore.
- `firestore.indexes.json` — índice compuesto para la bandeja (`threads`: participantes + fecha).

## Crédito

Proyecto comunitario **Egolatrada** para ARMY; no dirigido a revendedores.
