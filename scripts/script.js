/* =========================
   CONFIGURAÇÃO & CONSTANTES
   ========================= */
const CONFIG = {
    sanity: {
        projectId: '07dzzde3',
        dataset: 'production',
        apiVersion: '2021-10-21',
        useCdn: true
    },
    selectors: {
        grid: '#obrasGrid',
        slider: '.home-slider',
        modal: '#obraModal',
        closeBtn: '#closeModal',
        searchInput: '#searchInput',
        filterYear: '#filterYear',
        filterCategory: '#filterCategory',
        noResults: '#noResults'
    },
    routes: {
        leitura: './leitura.html', // Rota para página de leitura
        fallbackData: '../data/obras.json' // Caminho relativo para JSON local
    }
};

// Query GROQ
const SANITY_QUERY = `
*[_type == "livro" && (visivel == true || status == "Publicado")] | order(dataLancamento desc){
  _id,
  titulo,
  "slug": slug.current,
  sinopse,
  linkAmazon,
  dataLancamento,
  "image": capa.asset->url,
  "categorias": categorias[]->titulo, 
  status
}
`;



const SANITY_ENDPOINT = `https://${CONFIG.sanity.projectId}.api.sanity.io/v${CONFIG.sanity.apiVersion}/data/query/${CONFIG.sanity.dataset}?query=${encodeURIComponent(SANITY_QUERY)}`;

/* =========================
   ESTADO GLOBAL
   ========================= */
const state = {
    allWorks: [],
    lastFocusedElement: null,
    filters: {
        term: '',
        year: 'all',
        category: 'all'
    }
};

/* =========================
   INICIALIZAÇÃO (DOMContentLoaded)
   ========================= */
document.addEventListener('DOMContentLoaded', async () => {
    initGlobalUX();

    // Carrega dados (Sanity -> Fallback JSON -> Array Hardcoded)
    state.allWorks = await fetchWorksWithRetry();

    // Inicializa componentes baseados na existência de elementos no DOM
    if (document.querySelector(CONFIG.selectors.slider)) {
        initHomeSlider(state.allWorks);
    }

    if (document.querySelector(CONFIG.selectors.grid)) {
        initCatalog(state.allWorks);
    }

    initModalSystem();
});

/* =========================
   DATA FETCHING LAYER
   ========================= */
async function fetchWorksWithRetry(retries = 1) {
    try {
        const data = await fetchSanity();
        return normalizeWorks(data);
    } catch (err) {
        console.warn(`Sanity fetch failed. Retries left: ${retries}.`, err);
        if (retries > 0) {
            return await fetchWorksWithRetry(retries - 1);
        } else {
            return await fetchLocalFallback();
        }
    }
}

async function fetchSanity() {
    console.debug('[Sanity] Endpoint:', SANITY_ENDPOINT);

    try {
        const res = await fetch(SANITY_ENDPOINT, {
            method: 'GET',
            credentials: 'omit'
        });

        if (!res.ok) {
            let body = '';
            try {
                body = await res.text();
            } catch (_) {
                body = '(no response body)';
            }
            throw new Error(`Sanity HTTP ${res.status}: ${body}`);
        }

        const json = await res.json();
        console.debug('[Sanity] Response JSON:', json);

        // Sanity v1 padrão → { result: [...] }
        if (json && Array.isArray(json.result)) {
            return json.result;
        }

        console.warn('[Sanity] Resposta inesperada, usando fallback:', json);
        return [];
    } catch (err) {
        // IMPORTANTE: aqui aparecem erros reais de CORS no browser
        console.error('[Sanity] Fetch falhou:', err);
        throw err; // mantém fallback existente
    }
}


async function fetchLocalFallback() {
    console.info('Tentando carregar fallback local (data/obras.json)...');
    try {
        const res = await fetch(CONFIG.routes.fallbackData);
        if (!res.ok) throw new Error('Local fallback not found');
        const json = await res.json();
        return normalizeWorks(json);
    } catch (err) {
        console.error('Fallback falhou. Usando array vazio.', err);
        return [];
    }
}

function normalizeWorks(data) {
    // Segurança: espera um array; se não for, loga e retorna vazio
    if (!Array.isArray(data)) {
        console.warn('[normalizeWorks] Esperado array, obtido:', data);
        return [];
    }

    console.debug('[normalizeWorks] Normalizando', data.length, 'itens. Exemplo:', data[0]);

    const out = [];

    for (let i = 0; i < data.length; i++) {
        const raw = data[i];
        try {
            // Garante que temos um objeto mínimo
            const item = raw || {};

            // --- Data / ano ---
            let release_date = null;
            let year = '';
            if (item.dataLancamento) {
                const d = new Date(item.dataLancamento);
                if (!isNaN(d.getTime())) {
                    release_date = d.toISOString().split('T')[0];
                    year = d.getFullYear().toString();
                }
            }

            // --- Categoria: aceita várias formas e defensivamente evita nulls ---
            let category = 'obra';
            if (Array.isArray(item.categorias) && item.categorias.length && item.categorias[0]) {
                category = item.categorias[0];
            } else if (typeof item.categoria === 'string' && item.categoria) {
                category = item.categoria;
            } else if (typeof item.categorias === 'string' && item.categorias) {
                category = item.categorias;
            }

            // --- Slug pode ser objeto { current } no Sanity ---
            let slugVal = '';
            if (item.slug) {
                if (typeof item.slug === 'string') slugVal = item.slug;
                else if (typeof item.slug === 'object' && item.slug.current) slugVal = item.slug.current;
            }

            // --- Imagem: tenta várias chaves possíveis ---
            const img = item.image || item.capa || item.capaUrl || (item.capa && item.capa.asset && item.capa.asset.url) || '../img/capa-padrao.png';

            out.push({
                id: item._id || null,
                title: item.titulo || 'Sem título',
                titulo: item.titulo || 'Sem título',

                slug: slugVal,
                image: img,
                capa: img,

                synopsis: item.sinopse || '',
                sinopse: item.sinopse || '',

                linkAmazon: item.linkAmazon || '',
                linkRead: '',

                date: release_date ? new Date(release_date) : null,
                release_date,
                year,

                // GUARDA DEFENSIVA: nunca chamar toLowerCase em null/undefined
                category: (category || 'obra').toLowerCase(),
                categoria: (category || 'obra').toLowerCase()
            });
        } catch (err) {
            // Log detalhado por item sem quebrar todo o processamento
            console.error('[normalizeWorks] erro ao normalizar item index', i, 'raw:', raw, err);
            // pula item problemático
        }
    }

    return out;
}


/* =========================
   UX GLOBAL
   ========================= */
function initGlobalUX() {
    // Header Scroll
    const header = document.querySelector('.main-header');
    if (header && !header.classList.contains('style-fixed')) {
        window.addEventListener('scroll', () => {
            const isScrolled = window.scrollY > 50;
            header.style.background = isScrolled ? 'rgba(255, 255, 255, 0.98)' : 'transparent';
            header.style.boxShadow = isScrolled ? '0 2px 10px rgba(0,0,0,0.1)' : 'none';
            header.classList.toggle('scrolled', isScrolled);

            // Ajuste de cores para contraste
            const color = isScrolled ? '#1a1a1a' : '#fff';
            document.querySelectorAll('.nav-links a, .logo').forEach(el => el.style.color = color);
        });
    }

    // Smooth Scroll
    document.querySelectorAll('a[href^="#"], a[href*="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (!href || href === '#') return;

            // Lógica para links na mesma página ou cross-page
            if (href.startsWith('#')) {
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    const offset = 80;
                    window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
                }
            }
        });
    });
}

/* =========================
   CATÁLOGO & FILTROS
   ========================= */
function initCatalog(works) {
    const grid = document.querySelector(CONFIG.selectors.grid);
    if (!grid) return;

    // 1. Ler URL params para deep-linking (normaliza category para lowercase)
    const params = new URLSearchParams(window.location.search);
    state.filters.term = params.get('q') || '';
    state.filters.year = params.get('year') || 'all';
    state.filters.category = (params.get('category') || 'all').toLowerCase();

    // 2. Setup Inputs
    const searchInput = document.querySelector(CONFIG.selectors.searchInput);
    const filterYear = document.querySelector(CONFIG.selectors.filterYear);
    const filterCategory = document.querySelector(CONFIG.selectors.filterCategory);

    if (searchInput) searchInput.value = state.filters.term;

    // 3. Popular Selects dinamicamente (gera opções a partir dos dados reais)
    // YEARS
    if (filterYear) {
        filterYear.innerHTML = '<option value="all">Todos os Anos</option>';
        const years = [...new Set(works.map(w => w.year).filter(Boolean))].sort().reverse();
        years.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            filterYear.appendChild(opt);
        });
    }

    // CATEGORIES - valores em lowercase (para comparação), label capitalizada
    if (filterCategory) {
        filterCategory.innerHTML = '<option value="all">Todas</option>';
        const categories = [...new Set(works.map(w => (w.category || '').toString().toLowerCase()).filter(Boolean))].sort();
        categories.forEach(cat => {
            const el = document.createElement('option');
            el.value = cat;                    // valor comparável (lowercase)
            el.textContent = capitalize(cat);  // label legível
            filterCategory.appendChild(el);
        });
    }

    // 4. Ajusta selects para o estado atual
    if (filterYear) filterYear.value = state.filters.year;
    if (filterCategory) filterCategory.value = state.filters.category || 'all';

    // 5. Render Inicial
    applyFilters();

    // 6. Event Listeners (com Debounce na busca)
    if (searchInput) searchInput.addEventListener('input', debounce((e) => {
        state.filters.term = e.target.value;
        updateURL();
        applyFilters();
    }, 300));

    [filterYear, filterCategory].forEach(el => {
        if (el) el.addEventListener('change', (e) => {
            if (e.target.id === 'filterYear') state.filters.year = e.target.value;
            if (e.target.id === 'filterCategory') state.filters.category = (e.target.value || 'all').toLowerCase();
            updateURL();
            applyFilters();
        });
    });
}


function applyFilters() {
    const { term, year, category } = state.filters;
    const termLower = (term || '').toLowerCase();
    const categoryLower = (category || 'all').toLowerCase();

    const filtered = state.allWorks.filter(work => {
        const workTitle = (work.title || work.titulo || '').toString();
        const workSynopsis = (work.synopsis || work.sinopse || '').toString();
        const workYear = work.year || '';
        const workCategory = (work.category || work.categoria || '').toString().toLowerCase();

        const matchesTerm = !term || workTitle.toLowerCase().includes(termLower) || workSynopsis.toLowerCase().includes(termLower);
        const matchesYear = year === 'all' || workYear === year;
        const matchesCat = categoryLower === 'all' || !workCategory || workCategory === categoryLower;

        return matchesTerm && matchesYear && matchesCat;
    });

    renderWorks(filtered);
}


function renderWorks(obras) {
    const grid = document.querySelector(CONFIG.selectors.grid);
    const slider = document.querySelector(CONFIG.selectors.slider);

    // Define qual container usar (prioriza o grid da galeria, depois o slider da home)
    const container = grid || slider;
    if (!container) return;

    container.innerHTML = '';

    if (obras.length === 0) {
        container.innerHTML = '<p class="no-results">Nenhuma obra encontrada.</p>';
        return;
    }

    obras.forEach(obra => {
        const card = document.createElement('article');
        card.className = 'obra-card';

        // Verifica se existe imagem, senão usa placeholder
        const imgUrl = obra.image || 'https://via.placeholder.com/400x600?text=Sem+Capa';
        const dataAno = obra.release_date ? obra.release_date.split('-')[0] : 'S/D';

        card.innerHTML = `
            <div class="obra-img-container">
                <img src="${imgUrl}" alt="${escapeHtml(obra.titulo)}" class="obra-img" loading="lazy">
                <div class="obra-overlay" aria-hidden="true">
                    <button class="btn-detalhes" aria-label="Ver detalhes de ${escapeHtml(obra.titulo)}">Ver Detalhes</button>
                    <a class="btn-read btn-secondary" href="${obra.slug ? `${CONFIG.routes.leitura}?obra=${encodeURIComponent(obra.slug)}` : '#'}">Ler Online</a>
                </div>
            </div>
            <div class="obra-info">
                <span class="obra-categoria">${capitalize(obra.categoria || 'Literatura')}</span>
                <h3 class="obra-titulo">${escapeHtml(obra.titulo)}</h3>
                <p class="obra-ano">${dataAno}</p>
            </div>
        `;

        // Clique na carta abre modal (detalhes)
        card.addEventListener('click', () => openModal(obra));

        // Intercepta botão "Ver Detalhes" para abrir modal sem propagar o clique da carta
        const btnDetalhes = card.querySelector('.btn-detalhes');
        if (btnDetalhes) {
            btnDetalhes.addEventListener('click', (e) => {
                e.stopPropagation();
                openModal(obra, btnDetalhes);
            });
        }

        // Configura "Ler Online" (esconde se sem slug ou link)
        const btnRead = card.querySelector('.btn-read');
        if (btnRead) {
            if (!obra.slug && !obra.linkRead) {
                btnRead.style.display = 'none';
            } else {
                // evita que o clique no link dispare o openModal
                btnRead.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // se houver linkRead externo, use ele; senão navega para leitura interna
                    if (obra.linkRead && obra.linkRead.length > 0) {
                        window.location.href = obra.linkRead;
                    } else {
                        // link já foi definido no href (rota interna)
                        // navegamos normalmente (mesma aba)
                        // nada a fazer aqui — deixar o href funcionar
                    }
                });
            }
        }

        container.appendChild(card);
    });

    // Se estivermos na Home, inicializa as setas
    if (slider) initSliderControls();
}


function initSliderControls() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const slider = document.querySelector(CONFIG.selectors.slider);

    if (prevBtn && nextBtn && slider) {
        prevBtn.onclick = () => slider.scrollBy({ left: -350, behavior: 'smooth' });
        nextBtn.onclick = () => slider.scrollBy({ left: 350, behavior: 'smooth' });
    }
}

function updateURL() {
    const params = new URLSearchParams();
    if (state.filters.term) params.set('q', state.filters.term);
    if (state.filters.year !== 'all') params.set('year', state.filters.year);
    if ((state.filters.category || 'all').toLowerCase() !== 'all') params.set('category', (state.filters.category || 'all').toLowerCase());

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
}


/* =========================
   MODAL SYSTEM (Dialog Nativo + A11y)
   ========================= */
function initModalSystem() {
    const modal = document.querySelector(CONFIG.selectors.modal);
    const closeBtn = document.querySelector(CONFIG.selectors.closeBtn);

    if (!modal) return;

    // Fechar ao clicar no botão X
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    // Fechar ao clicar no backdrop (fora do conteúdo)
    modal.addEventListener('click', (e) => {
        const rect = modal.getBoundingClientRect();
        const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
            rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
        if (!isInDialog) closeModal();
    });

    // Fechar com ESC (Nativo do <dialog> mas reforçado para limpar estado)
    modal.addEventListener('close', onModalCloseCleanup);
}

function openModal(work, triggerElement) {
    const modal = document.querySelector(CONFIG.selectors.modal);
    if (!modal) return;

    state.lastFocusedElement = triggerElement;

    // Popula dados com segurança
    const els = {
        img: modal.querySelector('#modalImg'),
        title: modal.querySelector('#modalTitle'),
        year: modal.querySelector('#modalYear'),
        cat: modal.querySelector('#modalCategory'),
        synopsis: modal.querySelector('#modalSynopsis'),
        btnRead: modal.querySelector('#btnRead'),
        btnBuy: modal.querySelector('#btnBuy')
    };

    if (els.img) {
        els.img.src = ''; // Limpa anterior
        els.img.src = work.image;
        els.img.alt = `Capa de ${work.title}`;
    }
    if (els.title) els.title.textContent = work.title;
    if (els.year) els.year.textContent = work.year;
    if (els.cat) els.cat.textContent = capitalize(work.category);
    if (els.synopsis) els.synopsis.textContent = work.synopsis;

    // Configura botões
    // Ler Online: redireciona para página de leitura se houver slug/link
    if (els.btnRead) {
        if (work.linkRead || (work.slug && work.linkRead !== '#')) {
            els.btnRead.style.display = 'inline-flex';
            // Se tiver link externo direto, usa ele. Se não, usa rota interna com slug.
            const targetUrl = work.slug ? `${CONFIG.routes.leitura}?obra=${work.slug}` : work.linkRead;
            els.btnRead.href = targetUrl;
            els.btnRead.target = work.slug ? '_self' : '_blank'; // Interno abre na mesma aba (SPA feel) ou nova
        } else {
            els.btnRead.style.display = 'none';
        }
    }

    // Amazon
    setupButton(els.btnBuy, work.linkAmazon);

    // Show Modal
    if (typeof modal.showModal === 'function') {
        // Workaround: garante centralização consistente mesmo com body scrolled
        document.body.classList.add('no-scroll'); // bloqueia scroll do body

        // Mostra o modal e garante centralização relativa à viewport
        modal.showModal();

        // Garantias extras de posicionamento (CSS já faz isso, mas reforçamos via JS para consistência cross-browser)
        modal.style.position = 'fixed';
        modal.style.left = '50%';
        modal.style.top = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.zIndex = '10000';

    } else {
        modal.setAttribute('open', ''); // Fallback
    }


    // Lock Scroll & Focus Trap
    document.body.classList.add('no-scroll');

    // Atualiza título da página (SEO/UX)
    document.title = `${work.title} | Mario Paulo`;
}

function closeModal() {
    const modal = document.querySelector(CONFIG.selectors.modal);
    if (!modal) return;

    if (typeof modal.close === 'function') {
        modal.close();
    } else {
        modal.removeAttribute('open');
        onModalCloseCleanup();
    }
}

function onModalCloseCleanup() {
    document.body.classList.remove('no-scroll');
    document.title = 'Catálogo de Obras | Mario Paulo'; // Restaura título

    // Restaura foco
    if (state.lastFocusedElement) {
        state.lastFocusedElement.focus();
    }
}

/* =========================
   HOME SLIDER (Otimizado)
   ========================= */
function initHomeSlider(works) {
    const container = document.querySelector(CONFIG.selectors.slider);
    if (!container || !works.length) return;

    // Renderiza cards
    container.innerHTML = '';
    works.forEach(work => {
        const card = document.createElement('article');
        card.className = 'obra-card';
        card.innerHTML = `
            <div class="obra-capa">
                <img src="${work.image}" alt="${work.title}" loading="lazy">
            </div>
            <div class="obra-info">
                <h3>${escapeHtml(work.title)}</h3>
                <p>${escapeHtml(truncate(work.synopsis, 80))}</p>
            </div>
        `;
        // Ao clicar, redireciona para catálogo com filtro ou abre modal se estiver na mesma página
        card.addEventListener('click', () => {
            window.location.href = `./html/obras-galeria.html?q=${encodeURIComponent(work.title)}`;
        });
        container.appendChild(card);
    });

    // Lógica de Slider
    let startX, scrollLeft, isDown = false;

    // Drag to scroll simples para desktop/mobile
    container.addEventListener('mousedown', (e) => {
        isDown = true;
        container.classList.add('active');
        startX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    });
    container.addEventListener('mouseleave', () => { isDown = false; container.classList.remove('active'); });
    container.addEventListener('mouseup', () => { isDown = false; container.classList.remove('active'); });
    container.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        const walk = (x - startX) * 2; // Velocidade
        container.scrollLeft = scrollLeft - walk;
    });

    // Botões de Navegação
    const prevBtn = document.querySelector('.nav-btn.prev');
    const nextBtn = document.querySelector('.nav-btn.next');

    if (prevBtn) prevBtn.addEventListener('click', () => smoothScrollSlider(container, -350));
    if (nextBtn) nextBtn.addEventListener('click', () => smoothScrollSlider(container, 350));
}

function smoothScrollSlider(element, amount) {
    element.scrollBy({ left: amount, behavior: 'smooth' });
}

/* =========================
   HELPERS & UTILS
   ========================= */
function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<"'>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

function truncate(text, len) {
    if (!text) return '';
    return text.length > len ? text.substring(0, len) + '...' : text;
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function populateSelect(select, options) {
    options.forEach(opt => {
        const el = document.createElement('option');
        el.value = opt;
        el.textContent = opt;
        select.appendChild(el);
    });
}

function setupButton(btn, link) {
    if (!btn) return;
    if (link && link.length > 1) {
        btn.style.display = 'inline-flex';
        btn.href = link;
        btn.target = '_blank';
        btn.rel = 'noopener noreferrer';
    } else {
        btn.style.display = 'none';
    }
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/* =========================
   Reviews & Modal enhancements
   - Armazena avaliações em localStorage por slug
   - Apresenta média, % aprovação e comentários
   ========================= */

function _reviewsKey(slug) { return `mp_reviews_${slug}`; }

function getReviews(slug) {
    try {
        return JSON.parse(localStorage.getItem(_reviewsKey(slug)) || '[]');
    } catch { return []; }
}

function saveReviews(slug, arr) {
    localStorage.setItem(_reviewsKey(slug), JSON.stringify(arr || []));
}

function addReview(slug, rating, comment) {
    const arr = getReviews(slug);
    arr.push({
        rating: Number(rating),
        comment: comment ? String(comment).trim() : '',
        createdAt: new Date().toISOString()
    });
    saveReviews(slug, arr);
    return arr;
}

function clearReviews(slug) {
    localStorage.removeItem(_reviewsKey(slug));
}

/* cria N estrelas (visual) para um container */
function renderStars(container, count, filledCount) {
    container.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        const s = document.createElement('span');
        s.className = 'star' + (i <= filledCount ? ' filled' : '');
        s.dataset.value = i;
        container.appendChild(s);
    }
}

/* calcula percent approval: aprovados = notas >=4 */
function calcApproval(reviews) {
    if (!reviews || !reviews.length) return { percent: 0, avg: 0, total: 0 };
    const total = reviews.length;
    const approved = reviews.filter(r => (r.rating || 0) >= 4).length;
    const percent = Math.round((approved / total) * 100);
    const avg = (reviews.reduce((s, r) => s + (r.rating || 0), 0) / total);
    return { percent, avg: Math.round(avg * 10) / 10, total };
}

/* Renderiza a aba de reviews no modal */
function renderModalReviews(work) {
    const slug = work.slug || work.id || 'unknown';
    const reviews = getReviews(slug);
    const summary = calcApproval(reviews);

    const starsContainer = document.getElementById('modalAvgStars');
    const approvalEl = document.getElementById('modalApproval');
    const votesEl = document.getElementById('modalVotes');
    const listEl = document.getElementById('modalReviews');

    // média visual (ainda mostramos as 5 estrelas preenchidas com média)
    renderStars(starsContainer, 5, Math.round(summary.avg || 0));
    approvalEl.textContent = reviews.length ? `${summary.percent}% aprov.` : 'Sem avaliações';
    votesEl.textContent = reviews.length ? `${summary.total} avaliação(ões)` : '';

    // lista de reviews — somente comentário + meta (sem estrelas por item)
    listEl.innerHTML = '';
    if (!reviews.length) {
        listEl.innerHTML = `<div style="color:var(--text-muted)">Seja o primeiro a avaliar esta obra.</div>`;
    } else {
        // render maior e menos compactado
        reviews.slice().reverse().forEach(r => {
            const rc = document.createElement('div');
            rc.className = 'review-card';

            const date = new Date(r.createdAt).toLocaleString();

            // estrutura: comentário principal (texto) + meta abaixo (data e nota opcional)
            rc.innerHTML = `
        <div style="flex:1">
          <div class="comment-text">${escapeHtml(r.comment || '')}</div>
          <div class="meta" style="margin-top:8px;">
            <span style="font-weight:700; margin-right:8px; color:var(--text-muted);">${r.rating}★</span>
            <span style="color:var(--text-muted);">${date}</span>
          </div>
        </div>
      `;

            listEl.appendChild(rc);
        });
    }

    // Rating input (interativo) - mantém o mesmo comportamento anterior
    const ratingInput = document.getElementById('reviewRating');
    ratingInput.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.className = 'star';
        star.dataset.value = i;
        star.role = 'radio';
        star.tabIndex = 0;
        ratingInput.appendChild(star);
    }

    // interactive handlers (reutiliza o padrão anterior)
    let selectedRating = 0;
    ratingInput.querySelectorAll('.star').forEach(s => {
        s.addEventListener('click', () => {
            selectedRating = Number(s.dataset.value);
            ratingInput.querySelectorAll('.star').forEach(x => x.classList.toggle('filled', Number(x.dataset.value) <= selectedRating));
        });
        s.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s.click(); }
        });
    });

    // submit handler
    const submitBtn = document.getElementById('submitReview');
    submitBtn.onclick = () => {
        const comment = document.getElementById('reviewComment').value;
        if (!selectedRating) {
            alert('Escolha uma nota de 1 a 5 estrelas antes de enviar.');
            return;
        }
        const arr = addReview(slug, selectedRating, comment);
        document.getElementById('reviewComment').value = '';
        selectedRating = 0;
        ratingInput.querySelectorAll('.star').forEach(x => x.classList.remove('filled'));
        renderModalReviews(work); // rerender
    };

    const clearBtn = document.getElementById('clearReviews');
    if (clearBtn) {
        clearBtn.onclick = () => {
            if (!confirm('Apagar avaliações locais desta obra?')) return;
            clearReviews(slug);
            renderModalReviews(work);
        };
    }
}


/* Tab switching */
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.modal-tabs button');
    if (!btn) return;
    const parent = btn.parentElement;
    parent.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
});

/* Hook: quando abrir modal, renderiza reviews e garante Ler Online */
const _openModalOrig = openModal;
openModal = function (work, triggerElement) {
    _openModalOrig(work, triggerElement);

    // renderiza avaliações (se existir)
    try { renderModalReviews(work); } catch (err) { console.error('renderModalReviews error', err); }

    // garante botão Ler Online visível e apontando corretamente
    const els = {
        btnRead: document.getElementById('btnRead'),
    };
    if (els.btnRead) {
        if (work.linkRead && work.linkRead.length) {
            els.btnRead.href = work.linkRead;
            els.btnRead.style.display = 'inline-flex';
            els.btnRead.target = '_blank';
        } else if (work.slug) {
            els.btnRead.href = `${CONFIG.routes.leitura}?obra=${encodeURIComponent(work.slug)}`;
            els.btnRead.style.display = 'inline-flex';
            els.btnRead.target = '_self';
        } else {
            els.btnRead.style.display = 'none';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const revealImages = document.querySelectorAll('.img-reveal');

    if (revealImages.length) {
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    console.log("Imagem visível:", entry.target);  // Verifica se a imagem foi detectada
                    entry.target.classList.add('in-view');
                    observer.unobserve(entry.target);  // Para de observar após adicionar a classe
                }
            });
        }, { threshold: 0.5 });  // A imagem será considerada visível quando 50% dela estiver na tela

        revealImages.forEach(img => {
            observer.observe(img);
        });
    }
});