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
5. **Firestore Database**: crea la base en modo de prueba o con reglas personalizadas; copia el contenido de `firestore.rules` (en la raíz del repo) en **Firestore → Rules → Publicar**.
6. Si la consola pide **índices compuestos** al usar la bandeja o mensajes, abre el enlace del error y créalos con un clic.

### Misma cuenta en otro dispositivo

En **Perfil** la web permite **enlazar** la sesión anónima con Google o con correo y contraseña (Firebase fusiona la cuenta y **mantiene el mismo `uid`**, así no se pierden mensajes ni datos). En el segundo dispositivo no hace falta enlazar de nuevo: usa **Entrar con Google** o **Entrar con correo** con las mismas credenciales.

Las claves de Firebase en cliente son públicas por naturaleza; restringe la **API key** por dominio HTTP en Google Cloud Console si lo deseas.

## Archivos principales

- `docs/index.html` — estructura y textos legales.
- `docs/css/styles.css` — estética (Arirang `#E41A3E` + degradado oscuro).
- `docs/js/app.js` — rutas, Firebase, foro y mensajes.
- `docs/js/sections-data.js` — sectores de referencia.
- `firestore.rules` — reglas de seguridad para Firestore.

## Crédito

Proyecto comunitario **Egolatrada** para ARMY; no dirigido a revendedores.
