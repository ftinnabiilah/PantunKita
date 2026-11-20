/* ==========================================================================
   PANTUNKITA APPLICATION LOGIC
   Implements FR-01 through FR-09 and NFR-01 through NFR-07
   ========================================================================== */

const STORAGE_KEY = "pantunkita_favourites_v1";

// Application State
let state = {
  selectedAcara: "Hari Perayaan",
  selectedNada: "Inspirasi",
  keyword: "",
  pageOffset: 0,
  cardsPerPage: 4, // Matches Figure 4 layout (4 cards visible at once)
  favourites: loadFavourites()
};

// Initialize App on DOM Load
document.addEventListener("DOMContentLoaded", () => {
  updateFavouriteBadge();
  renderSuggestions();
});

/* ==========================================================================
   1. NAVIGATION (FR-09) & MODAL POPUP (FR-08)
   ========================================================================== */
function switchView(viewName) {
  const viewCipta = document.getElementById("view-cipta");
  const viewKegemaran = document.getElementById("view-kegemaran");
  const navCipta = document.getElementById("nav-cipta");
  const navKegemaran = document.getElementById("nav-kegemaran");

  if (viewName === "cipta") {
    viewCipta.classList.remove("hidden");
    viewKegemaran.classList.add("hidden");
    navCipta.classList.add("active");
    navKegemaran.classList.remove("active");
    renderSuggestions();
  } else if (viewName === "kegemaran") {
    viewCipta.classList.add("hidden");
    viewKegemaran.classList.remove("hidden");
    navCipta.classList.remove("active");
    navKegemaran.classList.add("active");
    renderFavourites();
  }
}

function openAboutModal() {
  document.getElementById("about-modal").classList.remove("hidden");
}

function closeAboutModal() {
  document.getElementById("about-modal").classList.add("hidden");
}

function handleBackdropClick(event) {
  if (event.target.id === "about-modal") {
    closeAboutModal();
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAboutModal();
});

/* ==========================================================================
   2. EVENT & TONE SELECTION (FR-01 & FR-02)
   ========================================================================== */
function selectAcara(acara, btnElement) {
  state.selectedAcara = acara;
  state.pageOffset = 0;

  document.querySelectorAll("#acara-primary-list .filter-pill, #acara-extra-list .filter-pill")
    .forEach(btn => btn.classList.remove("active"));
  btnElement.classList.add("active");

  renderSuggestions();
}

function selectNada(nada, btnElement) {
  state.selectedNada = nada;
  state.pageOffset = 0;

  document.querySelectorAll("#nada-primary-list .filter-pill, #nada-extra-list .filter-pill")
    .forEach(btn => btn.classList.remove("active"));
  btnElement.classList.add("active");

  renderSuggestions();
}

function toggleExtraAcara() {
  const extra = document.getElementById("acara-extra-list");
  const btn = document.getElementById("btn-more-acara");
  const isHidden = extra.classList.toggle("hidden");
  btn.textContent = isHidden ? "Lagi..." : "Tutup";
}

function toggleExtraNada() {
  const extra = document.getElementById("nada-extra-list");
  const btn = document.getElementById("btn-more-nada");
  const isHidden = extra.classList.toggle("hidden");
  btn.textContent = isHidden ? "Lagi..." : "Tutup";
}

function handleKeywordSearch() {
  state.keyword = document.getElementById("keyword-input").value.trim().toLowerCase();
  state.pageOffset = 0;
  renderSuggestions();
}

function shuffleSuggestions() {
  state.pageOffset += state.cardsPerPage;
  renderSuggestions();
}

/* ==========================================================================
   3. PANTUN MATCHING & SUGGESTION CARDS (FR-03, FR-04, NFR-04)
   ========================================================================== */
function filterPantuns() {
  const kw = state.keyword;

  // Helper to check keyword match
  const matchesKeyword = (item) => {
    if (!kw) return true;
    const inLines = item.lines.some(line => line.toLowerCase().includes(kw));
    const inKeywords = item.keywords.some(k => k.toLowerCase().includes(kw));
    return inLines || inKeywords;
  };

  // Exact match: Acara + Nada + Keyword
  let exactMatches = PANTUN_DATASET.filter(item => {
    const matchAcara = state.selectedAcara === "Semua" || item.acara === state.selectedAcara;
    const matchNada = state.selectedNada === "Semua" || item.nada === state.selectedNada;
    return matchAcara && matchNada && matchesKeyword(item);
  });

  if (exactMatches.length > 0) {
    return { results: exactMatches, fallbackMessage: "" };
  }

  // Fallback 1 (NFR-04): Match Acara + Keyword (ignoring Nada)
  let acaraMatches = PANTUN_DATASET.filter(item => {
    const matchAcara = state.selectedAcara === "Semua" || item.acara === state.selectedAcara;
    return matchAcara && matchesKeyword(item);
  });

  if (acaraMatches.length > 0) {
    return {
      results: acaraMatches,
      fallbackMessage: `Tiada padanan tepat untuk nada "${state.selectedNada}". Memaparkan pantun berkaitan kategori "${state.selectedAcara}":`
    };
  }

  // Fallback 2 (NFR-04): Match Keyword across entire dataset
  if (kw) {
    let keywordOnlyMatches = PANTUN_DATASET.filter(matchesKeyword);
    if (keywordOnlyMatches.length > 0) {
      return {
        results: keywordOnlyMatches,
        fallbackMessage: `Memaparkan hasil carian kata kunci "${state.keyword}" merentas semua kategori:`
      };
    }
  }

  // Fallback 3 (NFR-04): Prevent blank screen completely
  return {
    results: PANTUN_DATASET.slice(0, 12),
    fallbackMessage: "Tiada padanan khusus ditemui. Berikut adalah cadangan pantun pilihan untuk anda:"
  };
}

function renderSuggestions() {
  const grid = document.getElementById("suggestions-grid");
  const statusText = document.getElementById("active-filter-text");
  const countText = document.getElementById("result-count-text");
  const fallbackEl = document.getElementById("fallback-notice");

  const { results, fallbackMessage } = filterPantuns();

  // Update status bar
  statusText.innerHTML = `Acara: <strong>${escapeHtml(state.selectedAcara)}</strong> • Nada: <strong>${escapeHtml(state.selectedNada)}</strong>`;
  countText.textContent = `${results.length} pantun ditemui`;

  // Update NFR-04 fallback notice
  if (fallbackMessage) {
    fallbackEl.textContent = fallbackMessage;
    fallbackEl.classList.remove("hidden");
  } else {
    fallbackEl.classList.add("hidden");
  }

  // Wrap pagination offset cleanly
  if (state.pageOffset >= results.length) {
    state.pageOffset = 0;
  }

  const visibleSlice = results.slice(state.pageOffset, state.pageOffset + state.cardsPerPage);

  grid.innerHTML = visibleSlice
    .map((pantun, index) => createPantunCardHTML(pantun, index + 1))
    .join("");
}

function createPantunCardHTML(pantun, displayIndex) {
  const isSaved = state.favourites.includes(pantun.id);
  const formattedNum = String(displayIndex).padStart(2, "0");

  return `
    <article class="pantun-card" data-id="${pantun.id}">
      <div>
        <div class="card-top-meta">
          <span class="card-number">${formattedNum}</span>
          <div class="card-tags">
            <span class="tag-chip">${escapeHtml(pantun.acara)}</span>
            <span class="tag-chip">${escapeHtml(pantun.nada)}</span>
          </div>
        </div>
        <div class="pantun-verse">
          ${pantun.lines.map(line => `<p>${escapeHtml(line)}</p>`).join("")}
        </div>
      </div>

      <div class="card-actions">
        <button
          class="btn-heart ${isSaved ? "saved" : ""}"
          onclick="toggleFavourite('${pantun.id}')"
          aria-label="${isSaved ? "Buang daripada kegemaran" : "Simpan ke kegemaran"}"
          title="${isSaved ? "Buang daripada kegemaran" : "Simpan ke kegemaran"}"
        >
          ♥
        </button>
        <button class="btn-copy" onclick="copyPantun('${pantun.id}')">
          Salin teks
        </button>
      </div>
    </article>
  `;
}

/* ==========================================================================
   4. COPY TO CLIPBOARD FUNCTION (FR-05)
   ========================================================================== */
function copyPantun(pantunId) {
  const pantun = PANTUN_DATASET.find(p => p.id === pantunId);
  if (!pantun) return;

  const formattedText = pantun.lines.join("\n");

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(formattedText)
      .then(() => showToast("✓ Pantun berjaya disalin ke papan keratan!"))
      .catch(() => fallbackCopyText(formattedText));
  } else {
    fallbackCopyText(formattedText);
  }
}

function fallbackCopyText(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
    showToast("✓ Pantun berjaya disalin ke papan keratan!");
  } catch (err) {
    showToast("Gagal menyalin teks. Sila salin secara manual.");
  }
  document.body.removeChild(textarea);
}

let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}

/* ==========================================================================
   5. FAVOURITES MANAGEMENT (FR-06, FR-07, NFR-06)
   ========================================================================== */
function loadFavourites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveFavourites() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.favourites));
  } catch (e) {
    console.warn("LocalStorage tidak tersedia:", e);
  }
}

function toggleFavourite(pantunId) {
  const idx = state.favourites.indexOf(pantunId);
  if (idx === -1) {
    state.favourites.push(pantunId);
    showToast("♥ Disimpan ke Pantun Kegemaran");
  } else {
    state.favourites.splice(idx, 1);
    showToast("Dibuang daripada Pantun Kegemaran");
  }

  saveFavourites();
  updateFavouriteBadge();

  // Re-render active view
  if (!document.getElementById("view-cipta").classList.contains("hidden")) {
    renderSuggestions();
  } else {
    renderFavourites();
  }
}

function clearAllFavourites() {
  state.favourites = [];
  saveFavourites();
  updateFavouriteBadge();
  renderFavourites();
  showToast("Semua pantun kegemaran telah dipadam");
}

function updateFavouriteBadge() {
  document.getElementById("fav-badge").textContent = state.favourites.length;
}

function renderFavourites() {
  const grid = document.getElementById("favourites-grid");
  const emptyState = document.getElementById("favourites-empty");
  const clearBtn = document.getElementById("btn-clear-favs");

  const savedPantuns = state.favourites
    .map(id => PANTUN_DATASET.find(p => p.id === id))
    .filter(Boolean);

  if (savedPantuns.length === 0) {
    grid.innerHTML = "";
    emptyState.classList.remove("hidden");
    clearBtn.classList.add("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  clearBtn.classList.remove("hidden");

  grid.innerHTML = savedPantuns
    .map((pantun, index) => createPantunCardHTML(pantun, index + 1))
    .join("");
}

/* ==========================================================================
   UTILITY
   ========================================================================== */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
