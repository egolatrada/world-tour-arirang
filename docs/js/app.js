import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  EmailAuthProvider,
  linkWithCredential,
  linkWithPopup,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  where,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import { SECTION_GROUPS, ALL_SECTIONS, normalizeSectionQuery } from "./sections-data.js";
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

const KIND_LABEL = {
  exchange: "Intercambio / acercar",
  seeking: "Busco entrada",
  giveaway: "Cedo / no iré",
};

const LOCAL_PROFILE_PREFS_KEY = "arirang-concert-prefs";

const VIEWS = [
  "home",
  "sections",
  "publish",
  "forum",
  "inbox",
  "seeking",
  "giveaway",
  "profile",
];

const state = {
  app: null,
  auth: null,
  db: null,
  user: null,
  displayName: "",
  profilePrefs: { concertDay: "", concertSector: "" },
  firebaseReady: false,
  selectedSection: null,
  posts: [],
  forumPosts: [],
  threads: [],
  threadMessages: [],
  unsubPosts: null,
  unsubForum: null,
  unsubThreads: null,
  unsubMessages: null,
  currentThreadId: null,
  currentOtherUid: null,
};

const els = {};

function $(id) {
  return document.getElementById(id);
}

function showBanner(text, variant = "warn") {
  const b = $("firebase-banner");
  if (!b) return;
  b.hidden = false;
  b.textContent = text;
  b.className = `banner banner--${variant}`;
}

function hideBanner() {
  const b = $("firebase-banner");
  if (b) b.hidden = true;
}

function initElements() {
  els.search = $("global-search");
  els.sectionGroupsRoot = $("section-groups-root");
  els.postsBySection = $("posts-by-section");
  els.sectionFilterLabel = $("section-filter-label");
  els.formPost = $("form-post");
  els.formForum = $("form-forum");
  els.forumStream = $("forum-stream");
  els.inboxList = $("inbox-list");
  els.inboxListPanel = $("inbox-list-panel");
  els.inboxThreadPanel = $("inbox-thread-panel");
  els.threadTitle = $("thread-title");
  els.threadMessages = $("thread-messages");
  els.formThread = $("form-thread");
  els.btnBackInbox = $("btn-back-inbox");
  els.postsSeeking = $("posts-seeking");
  els.postsGiveaway = $("posts-giveaway");
  els.modalRoot = $("modal-root");
  els.btnSubmitPost = $("btn-submit-post");
  els.btnForumSend = $("btn-forum-send");
  els.formProfilePrefs = $("form-profile-prefs");
  els.profileDisplayNickname = $("profile-display-nickname");
  els.profileConcertDay = $("profile-concert-day");
  els.profileConcertSector = $("profile-concert-sector");
  els.headerUsername = $("header-username");
}

function parseRoute() {
  const raw = (location.hash || "#/").replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);
  const name = parts[0] || "home";
  const arg = parts[1] || null;
  if (name === "sectores" || name === "sections") return { view: "sections", arg };
  if (name === "publicar" || name === "publish") return { view: "publish", arg };
  if (name === "foro" || name === "forum") return { view: "forum", arg };
  if (name === "bandeja" || name === "inbox") return { view: "inbox", arg };
  if (name === "busco" || name === "seeking") return { view: "seeking", arg };
  if (name === "cedo" || name === "giveaway") return { view: "giveaway", arg };
  if (name === "perfil" || name === "profile") return { view: "profile", arg };
  if (name === "hilo" || name === "thread") return { view: "inbox", arg: parts[1] || null };
  return { view: "home", arg: null };
}

function setActiveNav(view) {
  document.querySelectorAll("[data-nav]").forEach((el) => {
    const key = el.getAttribute("data-nav");
    el.classList.toggle("is-active", key === view);
  });
}

function showView(view) {
  VIEWS.forEach((v) => {
    document.querySelectorAll(`[data-view="${v}"]`).forEach((node) => {
      const visible = v === view;
      node.classList.toggle("is-visible", visible);
      node.hidden = !visible;
    });
  });
  setActiveNav(view);
}

function navigate(view, extra = null) {
  const map = {
    home: "/",
    sections: "/sectores",
    publish: "/publicar",
    forum: "/foro",
    inbox: "/bandeja",
    seeking: "/busco",
    giveaway: "/cedo",
    profile: "/perfil",
  };
  let path = map[view] || "/";
  if (view === "inbox" && extra) path = `/hilo/${extra}`;
  location.hash = `#${path}`;
}

let routeRaf = null;

function onHashChange() {
  if (routeRaf != null) cancelAnimationFrame(routeRaf);
  routeRaf = requestAnimationFrame(() => {
    routeRaf = null;
    runHashRoute();
  });
}

function runHashRoute() {
  const { view, arg } = parseRoute();
  showView(view);
  if (view === "sections") {
    if (arg) {
      const norm = normalizeSectionQuery(decodeURIComponent(arg));
      const found = ALL_SECTIONS.find((s) => normalizeSectionQuery(s) === norm);
      state.selectedSection = found || null;
    } else {
      state.selectedSection = null;
    }
  } else {
    state.selectedSection = null;
  }
  if (view === "inbox" && arg && arg.length > 8) {
    openThreadUi(arg);
  } else {
    closeThreadUi();
  }
  renderSectionFilterLabel();
  renderPostsLists();
  applySearchFilter();
  if (view === "profile") {
    fillProfileForm();
  }
}

function renderSectionFilterLabel() {
  if (!els.sectionFilterLabel) return;
  if (state.selectedSection) {
    els.sectionFilterLabel.textContent = `Filtrando por sector: ${state.selectedSection}. Pulsa de nuevo el mismo sector para quitar el filtro.`;
  } else {
    els.sectionFilterLabel.textContent =
      "Ningún sector seleccionado: se muestran todas las publicaciones recientes que mencionan sectores.";
  }
}

function sectionMatchesPost(section, post) {
  const blob = [
    ...(post.sectionsHave || []),
    ...(post.sectionsWant || []),
    post.body || "",
  ]
    .join(" ")
    .toUpperCase();
  const s = normalizeSectionQuery(section);
  return blob.includes(s) || blob.includes(s.replace(/\s/g, ""));
}

function renderSectionGroups() {
  if (!els.sectionGroupsRoot) return;
  els.sectionGroupsRoot.innerHTML = "";
  SECTION_GROUPS.forEach((group) => {
    const wrap = document.createElement("div");
    wrap.dataset.search = `${group.label} ${group.sections.join(" ")}`;
    const h = document.createElement("h3");
    h.className = "group-title";
    h.textContent = group.label;
    wrap.appendChild(h);
    const grid = document.createElement("div");
    grid.className = "section-grid";
    group.sections.forEach((sec) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "section-chip";
      btn.textContent = sec;
      btn.dataset.search = sec;
      btn.addEventListener("click", () => {
        if (state.selectedSection === sec) {
          state.selectedSection = null;
          navigate("sections");
        } else {
          state.selectedSection = sec;
          location.hash = `#/sectores/${encodeURIComponent(sec)}`;
        }
        renderSectionFilterLabel();
        renderPostsLists();
        applySearchFilter();
      });
      grid.appendChild(btn);
    });
    wrap.appendChild(grid);
    els.sectionGroupsRoot.appendChild(wrap);
  });
}

function formatTime(ts) {
  if (!ts?.toDate) return "";
  const d = ts.toDate();
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function postCardHtml(post, { showPm } = { showPm: true }) {
  const kind = post.kind || "exchange";
  const label = KIND_LABEL[kind] || kind;
  const dates = post.dates || "";
  const have = (post.sectionsHave || []).filter(Boolean).join(", ") || "—";
  const want = (post.sectionsWant || []).filter(Boolean).join(", ") || "—";
  const uid = state.user?.uid;
  const isMine = uid && post.authorUid === uid;
  const pm =
    showPm && state.firebaseReady && uid && post.authorUid && post.authorUid !== uid;
  return `
    <article class="post-card" data-post-id="${post.id}" data-search="${escapeAttr(
      `${label} ${post.authorName} ${have} ${want} ${post.body} ${dates}`
    )}">
      <div class="post-meta">
        <span class="post-kind kind-${kind}">${label}</span>
        <strong>${escapeHtml(post.authorName || "ARMY")}</strong>
        · ${formatTime(post.createdAt)} · ${escapeHtml(dates)}
      </div>
      <p class="post-body">${escapeHtml(post.body || "")}</p>
      <div class="post-meta">Tengo / contexto: ${escapeHtml(have)}</div>
      <div class="post-meta">Interés / deseo: ${escapeHtml(want)}</div>
      <div class="post-actions">
        ${
          pm
            ? `<button type="button" class="btn btn--primary pm-btn" data-peer="${escapeAttr(
                post.authorUid
              )}" data-peer-name="${escapeAttr(post.authorName || "ARMY")}">Mensaje privado</button>`
            : ""
        }
        ${
          isMine
            ? `<button type="button" class="btn delete-post-btn" data-id="${escapeAttr(
                post.id
              )}">Borrar mi publicación</button>`
            : ""
        }
      </div>
    </article>
  `;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function mountPosts(container, posts, filterFn, { showPm } = { showPm: true }) {
  if (!container) return;
  const list = posts.filter(filterFn).slice(0, 80);
  container.innerHTML = list.length
    ? list.map((p) => postCardHtml(p, { showPm })).join("")
    : '<p class="legal">Aún no hay publicaciones. Sé la primera en publicar (vista “Publicar”).</p>';
  container.querySelectorAll(".pm-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const peer = btn.getAttribute("data-peer");
      const name = btn.getAttribute("data-peer-name") || "ARMY";
      startPrivateChat(peer, name);
    });
  });
  container.querySelectorAll(".delete-post-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      if (!id || !state.db || !state.user) return;
      if (!confirm("¿Borrar esta publicación?")) return;
      try {
        await deleteDoc(doc(state.db, "posts", id));
      } catch (e) {
        alert("No se pudo borrar. ¿Reglas de Firestore o conexión?");
        console.error(e);
      }
    });
  });
}

function renderPostsLists() {
  const posts = state.posts;
  const sec = state.selectedSection;
  const bySection = (p) => {
    if (!sec) return true;
    return sectionMatchesPost(sec, p);
  };
  mountPosts(els.postsBySection, posts, bySection);
  mountPosts(
    els.postsSeeking,
    posts,
    (p) => p.kind === "seeking"
  );
  mountPosts(
    els.postsGiveaway,
    posts,
    (p) => p.kind === "giveaway"
  );
}

function threadIdFor(u1, u2) {
  return [u1, u2].sort().join("_");
}

async function ensureProfile(uid) {
  if (!state.db || !uid) return null;
  const ref = doc(state.db, "profiles", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

async function saveProfile(uid, displayName) {
  if (!state.db || !uid) return;
  await setDoc(
    doc(state.db, "profiles", uid),
    { displayName, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

function loadProfilePrefsFromLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_PREFS_KEY);
    if (!raw) return { concertDay: "", concertSector: "" };
    const j = JSON.parse(raw);
    return {
      concertDay: typeof j.concertDay === "string" ? j.concertDay : "",
      concertSector: typeof j.concertSector === "string" ? j.concertSector : "",
    };
  } catch {
    return { concertDay: "", concertSector: "" };
  }
}

function saveProfilePrefsToLocal(prefs) {
  try {
    localStorage.setItem(LOCAL_PROFILE_PREFS_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn(e);
  }
}

function mergePrefsFromProfileDoc(profile) {
  const local = loadProfilePrefsFromLocal();
  const cloudDay =
    profile && typeof profile.concertDay === "string" ? profile.concertDay : "";
  const cloudSec =
    profile && typeof profile.concertSector === "string" ? profile.concertSector : "";
  state.profilePrefs = {
    concertDay: cloudDay !== "" ? cloudDay : local.concertDay,
    concertSector: cloudSec !== "" ? cloudSec : local.concertSector,
  };
  saveProfilePrefsToLocal(state.profilePrefs);
}

async function persistProfilePrefsToCloud() {
  if (!state.db || !state.user || !state.displayName) return;
  const { concertDay, concertSector } = state.profilePrefs;
  await setDoc(
    doc(state.db, "profiles", state.user.uid),
    {
      displayName: state.displayName,
      concertDay: concertDay || "",
      concertSector: concertSector || "",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function updateIdentityUi() {
  const name = state.displayName || "ARMY";
  if (els.headerUsername) els.headerUsername.textContent = name;
  if (els.profileDisplayNickname) els.profileDisplayNickname.textContent = name;
}

function updateAccountUi() {
  const panel = $("panel-account");
  const anonEl = $("account-block-anonymous");
  const signedEl = $("account-block-signedin");
  const statusEl = $("account-status-line");
  if (!panel || !anonEl || !signedEl || !statusEl) return;

  if (!state.firebaseReady) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;

  const user = state.user;
  if (!user) {
    anonEl.hidden = true;
    signedEl.hidden = true;
    statusEl.textContent = "Conectando con Firebase…";
    return;
  }

  if (user.isAnonymous) {
    anonEl.hidden = false;
    signedEl.hidden = true;
    statusEl.textContent =
      "Sesión de invitado en este navegador. Enlaza la cuenta o entra para usar la misma identidad en otros dispositivos.";
  } else {
    anonEl.hidden = true;
    signedEl.hidden = false;
    const labels = user.providerData.map((p) => {
      if (p.providerId === "google.com") return "Google";
      if (p.providerId === "password") return "correo y contraseña";
      return p.providerId;
    });
    const provText = labels.length ? labels.join(" + ") : "cuenta";
    statusEl.textContent = `Cuenta permanente (${provText}). Inicia sesión con el mismo método en otro móvil u ordenador para recuperar mensajes y perfil.`;
  }
}

function googleProvider() {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: "select_account" });
  return p;
}

function fillProfileForm() {
  updateIdentityUi();
  if (els.profileConcertDay) {
    els.profileConcertDay.value = state.profilePrefs.concertDay || "";
  }
  if (els.profileConcertSector) {
    els.profileConcertSector.value = state.profilePrefs.concertSector || "";
  }
}

function promptDisplayNameModal() {
  return new Promise((resolve) => {
    if (!els.modalRoot) return resolve(null);
    els.modalRoot.hidden = false;
    els.modalRoot.innerHTML = `
      <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="dn-title">
        <div class="modal">
          <h3 id="dn-title">Tu nombre en la comunidad</h3>
          <p>Elige un apodo visible (2–40 caracteres). Se usará en publicaciones y foro.</p>
          <form id="form-display-name" class="form-grid">
            <label>Apodo ARMY
              <input name="displayName" required minlength="2" maxlength="40" autocomplete="nickname" />
            </label>
            <button type="submit" class="btn btn--primary">Guardar</button>
            <button type="button" class="btn" id="btn-skip-dn">Usar “ARMY” por ahora</button>
          </form>
        </div>
      </div>
    `;
    const form = $("form-display-name");
    const close = (name) => {
      els.modalRoot.hidden = true;
      els.modalRoot.innerHTML = "";
      resolve(name);
    };
    $("btn-skip-dn")?.addEventListener("click", () => close("ARMY"));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const name = String(fd.get("displayName") || "").trim();
      if (name.length < 2) return;
      close(name);
    });
  });
}

async function initAuthFlow() {
  if (!state.auth || !state.db) return;
  await signInAnonymously(state.auth).catch((e) => {
    console.error(e);
    showBanner(
      "No se pudo iniciar sesión anónima. Revisa Auth → Sign-in method (Anónimo activado).",
      "warn"
    );
  });
}

function subscribePosts() {
  if (!state.db) return;
  if (state.unsubPosts) state.unsubPosts();
  const qy = query(collection(state.db, "posts"), orderBy("createdAt", "desc"), limit(120));
  state.unsubPosts = onSnapshot(
    qy,
    (snap) => {
      state.posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderPostsLists();
      applySearchFilter();
    },
    (err) => {
      console.error(err);
      showBanner(
        "Error leyendo publicaciones. Comprueba reglas de Firestore e índices.",
        "warn"
      );
    }
  );
}

function subscribeForum() {
  if (!state.db) return;
  if (state.unsubForum) state.unsubForum();
  const qy = query(
    collection(state.db, "forum_posts"),
    orderBy("createdAt", "desc"),
    limit(100)
  );
  state.unsubForum = onSnapshot(
    qy,
    (snap) => {
      state.forumPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderForum();
      applySearchFilter();
    },
    (err) => {
      console.error(err);
    }
  );
}

function renderForum() {
  if (!els.forumStream) return;
  const uid = state.user?.uid;
  els.forumStream.innerHTML = state.forumPosts
    .slice()
    .reverse()
    .map(
      (m) => `
    <div class="forum-msg" data-search="${escapeAttr(
      `${m.authorName} ${m.body}`
    )}" data-msg-id="${escapeAttr(m.id)}">
      <strong>${escapeHtml(m.authorName || "ARMY")}</strong>
      <span style="color:var(--muted);font-size:0.8rem"> · ${formatTime(m.createdAt)}</span>
      <div>${escapeHtml(m.body || "")}</div>
      ${
        uid && m.authorUid === uid
          ? `<button type="button" class="btn delete-forum-btn" style="margin-top:0.35rem" data-id="${escapeAttr(
              m.id
            )}">Borrar</button>`
          : ""
      }
    </div>
  `
    )
    .join("");
  els.forumStream.querySelectorAll(".delete-forum-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      if (!id || !state.db) return;
      if (!confirm("¿Borrar este mensaje del foro?")) return;
      try {
        await deleteDoc(doc(state.db, "forum_posts", id));
      } catch (e) {
        alert("No se pudo borrar.");
        console.error(e);
      }
    });
  });
}

function subscribeThreads() {
  if (!state.db || !state.user) return;
  if (state.unsubThreads) state.unsubThreads();
  const qy = query(
    collection(state.db, "threads"),
    where("participants", "array-contains", state.user.uid),
    limit(40)
  );
    state.unsubThreads = onSnapshot(
    qy,
    (snap) => {
      state.threads = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      state.threads.sort((a, b) => {
        const ta = a.updatedAt?.toMillis?.() || 0;
        const tb = b.updatedAt?.toMillis?.() || 0;
        return tb - ta;
      });
      renderInboxList();
      applySearchFilter();
    },
    (err) => {
      console.error(err);
      showBanner(
        "Para la bandeja hace falta un índice compuesto en Firestore (enlace en consola de error).",
        "warn"
      );
    }
  );
}

function renderInboxList() {
  if (!els.inboxList || !state.user) return;
  const my = state.user.uid;
  els.inboxList.innerHTML = state.threads.length
    ? state.threads
        .map((t) => {
          const other = (t.participants || []).find((u) => u !== my) || "?";
          const names = t.participantNames || {};
          const title = names[other] || "ARMY";
          const preview = t.lastPreview || "Sin mensajes aún";
          return `
        <button type="button" class="inbox-row" data-thread="${escapeAttr(t.id)}" data-search="${escapeAttr(
          `${title} ${preview}`
        )}">
          <span><strong>${escapeHtml(title)}</strong><br/><span style="font-size:0.8rem;color:var(--muted)">${escapeHtml(
            preview
          )}</span></span>
          <span style="font-size:0.75rem;color:var(--muted)">${formatTime(t.updatedAt)}</span>
        </button>`;
        })
        .join("")
    : '<p class="legal">No hay conversaciones. Abre un “Mensaje privado” desde una publicación.</p>';
  els.inboxList.querySelectorAll(".inbox-row").forEach((row) => {
    row.addEventListener("click", () => {
      const id = row.getAttribute("data-thread");
      if (id) location.hash = `#/hilo/${id}`;
    });
  });
}

function closeThreadUi() {
  state.currentThreadId = null;
  state.currentOtherUid = null;
  if (state.unsubMessages) {
    state.unsubMessages();
    state.unsubMessages = null;
  }
  if (els.inboxListPanel) els.inboxListPanel.hidden = false;
  if (els.inboxThreadPanel) els.inboxThreadPanel.hidden = true;
}

function openThreadUi(threadId) {
  if (!threadId || !state.db || !state.user) return;
  state.currentThreadId = threadId;
  if (els.inboxListPanel) els.inboxListPanel.hidden = true;
  if (els.inboxThreadPanel) els.inboxThreadPanel.hidden = false;
  const th = state.threads.find((t) => t.id === threadId);
  const my = state.user.uid;
  const other = th ? (th.participants || []).find((u) => u !== my) : null;
  state.currentOtherUid = other || null;
  const names = th?.participantNames || {};
  if (els.threadTitle) {
    els.threadTitle.textContent = other ? names[other] || "Conversación" : "Conversación";
  }
  if (state.unsubMessages) state.unsubMessages();
  const mq = query(
    collection(state.db, "threads", threadId, "messages"),
    orderBy("createdAt", "asc"),
    limit(200)
  );
  state.unsubMessages = onSnapshot(mq, (snap) => {
    state.threadMessages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderThreadMessages();
  });
}

function renderThreadMessages() {
  if (!els.threadMessages || !state.user) return;
  const my = state.user.uid;
  els.threadMessages.innerHTML = state.threadMessages
    .map((m) => {
      const mine = m.senderId === my;
      return `
      <div class="bubble ${mine ? "bubble--me" : ""}">
        ${escapeHtml(m.body || "")}
        <small>${formatTime(m.createdAt)}</small>
      </div>`;
    })
    .join("");
  els.threadMessages.scrollTop = els.threadMessages.scrollHeight;
}

async function startPrivateChat(peerUid, peerName) {
  if (!state.firebaseReady || !state.user || !state.db) {
    alert("Activa Firebase para usar mensajes privados.");
    return;
  }
  if (!peerUid || peerUid === state.user.uid) return;
  const tid = threadIdFor(state.user.uid, peerUid);
  const myName = state.displayName || "ARMY";
  await setDoc(
    doc(state.db, "threads", tid),
    {
      participants: [state.user.uid, peerUid].sort(),
      participantNames: {
        [state.user.uid]: myName,
        [peerUid]: peerName || "ARMY",
      },
      updatedAt: serverTimestamp(),
      lastPreview: "Conversación iniciada",
    },
    { merge: true }
  );
  location.hash = `#/hilo/${tid}`;
}

function wireForms() {
  els.formPost?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.firebaseReady) {
      alert("Configura Firebase para publicar.");
      return;
    }
    const fd = new FormData(els.formPost);
    const kind = fd.get("kind");
    const dates = fd.get("dates");
    const sectionsHave = String(fd.get("sectionsHave") || "")
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const sectionsWant = String(fd.get("sectionsWant") || "")
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const body = String(fd.get("body") || "").trim();
    if (!body) return;
    try {
      await addDoc(collection(state.db, "posts"), {
        authorUid: state.user.uid,
        authorName: state.displayName || "ARMY",
        kind,
        dates,
        sectionsHave,
        sectionsWant,
        body,
        createdAt: serverTimestamp(),
      });
      els.formPost.reset();
      alert("Publicación enviada.");
      navigate("sections");
    } catch (err) {
      console.error(err);
      alert("No se pudo publicar. Revisa conexión y reglas.");
    }
  });

  els.formForum?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.firebaseReady) {
      alert("Configura Firebase para escribir en el foro.");
      return;
    }
    const fd = new FormData(els.formForum);
    const body = String(fd.get("body") || "").trim();
    if (!body) return;
    try {
      await addDoc(collection(state.db, "forum_posts"), {
        authorUid: state.user.uid,
        authorName: state.displayName || "ARMY",
        body,
        createdAt: serverTimestamp(),
      });
      els.formForum.reset();
    } catch (err) {
      console.error(err);
      alert("No se pudo enviar el mensaje.");
    }
  });

  els.formThread?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.currentThreadId || !state.db || !state.user) return;
    const fd = new FormData(els.formThread);
    const body = String(fd.get("body") || "").trim();
    if (!body) return;
    const tid = state.currentThreadId;
    try {
      await addDoc(collection(state.db, "threads", tid, "messages"), {
        senderId: state.user.uid,
        body,
        createdAt: serverTimestamp(),
      });
      const prev = body.length > 120 ? `${body.slice(0, 117)}…` : body;
      await setDoc(
        doc(state.db, "threads", tid),
        { updatedAt: serverTimestamp(), lastPreview: prev },
        { merge: true }
      );
      els.formThread.reset();
    } catch (err) {
      console.error(err);
      alert("No se pudo enviar.");
    }
  });

  els.btnBackInbox?.addEventListener("click", () => {
    navigate("inbox");
  });

  els.formProfilePrefs?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(els.formProfilePrefs);
    const concertDay = String(fd.get("concertDay") || "").trim();
    const concertSector = String(fd.get("concertSector") || "").trim().slice(0, 120);
    state.profilePrefs = { concertDay, concertSector };
    saveProfilePrefsToLocal(state.profilePrefs);
    if (state.firebaseReady && state.user && state.db) {
      try {
        await persistProfilePrefsToCloud();
      } catch (err) {
        console.error(err);
        alert(
          "Se guardó en este dispositivo, pero no en la nube. Revisa reglas de Firestore o conexión."
        );
        return;
      }
    }
    alert("Día y sector guardados.");
  });

  $("btn-link-google")?.addEventListener("click", async () => {
    if (!state.user?.isAnonymous) return;
    try {
      await linkWithPopup(state.user, googleProvider());
      alert(
        "Cuenta enlazada con Google. En otro dispositivo usa «Entrar con Google» con la misma cuenta."
      );
    } catch (err) {
      console.error(err);
      if (err.code === "auth/credential-already-in-use") {
        alert(
          "Ese Google ya está vinculado a otra cuenta. Usa «Entrar con Google» abajo en lugar de enlazar."
        );
      } else if (err.code === "auth/popup-closed-by-user") {
        return;
      } else if (err.code === "auth/operation-not-allowed") {
        alert(
          "Google no está activado en Firebase. En la consola: Authentication → Sign-in method → activa Google (y el dominio egolatrada.github.io en Authorized domains)."
        );
      } else {
        alert(err.message || "No se pudo enlazar con Google.");
      }
    }
  });

  $("form-link-email")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.auth || !state.user?.isAnonymous) return;
    const fd = new FormData(e.target);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    if (password.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    try {
      const cred = EmailAuthProvider.credential(email, password);
      await linkWithCredential(state.user, cred);
      e.target.reset();
      alert(
        "Correo enlazado. En otro dispositivo usa «Entrar con correo» con el mismo email y contraseña."
      );
    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        alert(
          "Ese correo ya tiene cuenta. Usa «Entrar con correo» en lugar de enlazar, o prueba otro email."
        );
      } else if (err.code === "auth/weak-password") {
        alert("Contraseña demasiado débil.");
      } else if (err.code === "auth/operation-not-allowed") {
        alert(
          "Correo/contraseña no está activado en Firebase. En la consola: Authentication → Sign-in method → activa Email/Password."
        );
      } else {
        alert(err.message || "No se pudo enlazar el correo.");
      }
    }
  });

  $("btn-signin-google")?.addEventListener("click", async () => {
    if (!state.auth) return;
    try {
      await signInWithPopup(state.auth, googleProvider());
    } catch (err) {
      console.error(err);
      if (err.code === "auth/popup-closed-by-user") return;
      if (err.code === "auth/operation-not-allowed") {
        alert(
          "Google no está activado en Firebase (Authentication → Sign-in method → Google)."
        );
        return;
      }
      alert(err.message || "No se pudo iniciar sesión con Google.");
    }
  });

  $("form-signin-email")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.auth) return;
    const fd = new FormData(e.target);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    try {
      await signInWithEmailAndPassword(state.auth, email, password);
      e.target.reset();
    } catch (err) {
      console.error(err);
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        alert("Correo o contraseña incorrectos.");
      } else if (err.code === "auth/operation-not-allowed") {
        alert(
          "Correo/contraseña no está activado en Firebase (Authentication → Sign-in method)."
        );
      } else {
        alert(err.message || "No se pudo iniciar sesión.");
      }
    }
  });

  $("btn-sign-out")?.addEventListener("click", async () => {
    if (!state.auth) return;
    try {
      await signOut(state.auth);
      await signInAnonymously(state.auth);
      alert("Sesión cerrada. Se ha creado una nueva sesión de invitado en este navegador.");
    } catch (err) {
      console.error(err);
      alert(err.message || "No se pudo cerrar sesión.");
    }
  });
}

function applySearchFilter() {
  const q = normalizeSectionQuery(els.search?.value || "");
  const tokens = q.split(" ").filter(Boolean);

  const match = (text) => {
    if (!tokens.length) return true;
    const up = text.toUpperCase();
    return tokens.every((t) => up.includes(t));
  };

  document.querySelectorAll(".section-chip").forEach((el) => {
    el.classList.toggle("is-hidden", tokens.length && !match(el.textContent));
  });

  document.querySelectorAll(".post-card").forEach((el) => {
    const hay = el.getAttribute("data-search") || "";
    el.classList.toggle("is-hidden", tokens.length && !match(hay));
  });

  document.querySelectorAll(".forum-msg").forEach((el) => {
    const hay = el.getAttribute("data-search") || "";
    el.classList.toggle("is-hidden", tokens.length && !match(hay));
  });

  document.querySelectorAll(".inbox-row").forEach((el) => {
    const hay = el.getAttribute("data-search") || "";
    el.classList.toggle("is-hidden", tokens.length && !match(hay));
  });
}

function wireSearch() {
  els.search?.addEventListener("input", () => applySearchFilter());
}

async function bootFirebase() {
  if (!isFirebaseConfigured()) {
    showBanner(
      "Modo solo lectura local: configura Firebase en docs/js/firebase-config.js y despliega las reglas (archivo firestore.rules del repositorio) para foro, publicaciones y bandeja entre personas.",
      "off"
    );
    state.firebaseReady = false;
    if (els.btnSubmitPost) els.btnSubmitPost.disabled = true;
    if (els.btnForumSend) els.btnForumSend.disabled = true;
    return;
  }
  try {
    state.app = initializeApp(firebaseConfig);
    state.auth = getAuth(state.app);
    state.db = getFirestore(state.app);
    if (firebaseConfig.measurementId) {
      isSupported()
        .then((ok) => {
          if (ok) getAnalytics(state.app);
        })
        .catch(() => {});
    }
    state.firebaseReady = true;
    hideBanner();
    updateAccountUi();
  } catch (e) {
    console.error(e);
    showBanner("Error al iniciar Firebase. Revisa la configuración.", "warn");
    return;
  }

  onAuthStateChanged(state.auth, async (user) => {
    state.user = user;
    if (!user) {
      updateAccountUi();
      return;
    }
    let profile = await ensureProfile(user.uid);
    if (!profile?.displayName) {
      const name = await promptDisplayNameModal();
      const finalName =
        name && String(name).trim().length >= 2 ? String(name).trim() : "ARMY";
      await saveProfile(user.uid, finalName);
      state.displayName = finalName;
    } else {
      state.displayName = profile.displayName;
    }
    mergePrefsFromProfileDoc(profile);
    updateIdentityUi();
    const { view, arg } = parseRoute();
    if (view === "profile") fillProfileForm();
    subscribePosts();
    subscribeForum();
    subscribeThreads();
    if (view === "inbox" && arg) openThreadUi(arg);
    updateAccountUi();
  });

  await initAuthFlow();
}

function boot() {
  state.profilePrefs = loadProfilePrefsFromLocal();
  initElements();
  updateIdentityUi();
  updateAccountUi();
  fillProfileForm();
  renderSectionGroups();
  wireForms();
  wireSearch();
  window.addEventListener("hashchange", onHashChange);
  runHashRoute();
  bootFirebase();
}

boot();
