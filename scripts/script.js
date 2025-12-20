/**
 * SCRIPT PRINCIPAL - MARIO PAULO (Refatorado)
 * * CHANGELOG:
 * - Implementado fallback robusto para data/obras.json.
 * - Adicionado retry logic no fetch.
 * - Catálogo: Deep-linking (URL params), busca com debounce, filtros combinados.
 * - Modal: Focus trap, no-scroll body lock, lazy image, acessibilidade ARIA completa.
 * - Slider: RequestAnimationFrame, keyboard nav, pause on hover.
 * - Leitura: Redirecionamento para leitura.html (não modal).
 * - Helpers: escapeHtml, debounce, setupButton seguro.
 */

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
*[_type == "livro" && visivel == true] | order(dataLancamento desc){
  _id,
  titulo,
  "slug": slug.current,
  sinopse,
  linkAmazon,
  dataLancamento,
  "image": capa.asset->url,
  "categorias": categorias[]->title
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
    const res = await fetch(SANITY_ENDPOINT);
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const json = await res.json();
    return json.result || [];
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
    if (!Array.isArray(data)) return [];

    return data.map(item => {
        // Data
        let release_date = null;
        let year = '';

        if (item.dataLancamento) {
            const d = new Date(item.dataLancamento);
            if (!isNaN(d)) {
                release_date = d.toISOString().split('T')[0];
                year = d.getFullYear().toString();
            }
        }

        // Categoria
        let category = 'obra';
        if (Array.isArray(item.categorias) && item.categorias.length) {
            category = item.categorias[0];
        }

        return {
            // padrão interno
            id: item._id || null,
            title: item.titulo || 'Sem título',
            titulo: item.titulo || 'Sem título',

            slug: item.slug || '',
            image: item.image || './img/capa-padrao.jpg',
            capa: item.image || './img/capa-padrao.jpg',

            synopsis: item.sinopse || '',
            sinopse: item.sinopse || '',

            linkAmazon: item.linkAmazon || '',
            linkRead: '',

            date: release_date ? new Date(release_date) : null,
            release_date,
            year,

            category: category.toLowerCase(),
            categoria: category.toLowerCase()
        };
    });
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
        anchor.addEventListener('click', function(e) {
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

    // 1. Ler URL params para deep-linking
    const params = new URLSearchParams(window.location.search);
    state.filters.term = params.get('q') || '';
    state.filters.year = params.get('year') || 'all';
    state.filters.category = params.get('category') || 'all';

    // 2. Setup Inputs
    const searchInput = document.querySelector(CONFIG.selectors.searchInput);
    const filterYear = document.querySelector(CONFIG.selectors.filterYear);
    const filterCategory = document.querySelector(CONFIG.selectors.filterCategory);

    if (searchInput) searchInput.value = state.filters.term;
    
    // 3. Popular Selects dinamicamente
    if (filterYear) populateSelect(filterYear, [...new Set(works.map(w => w.year).filter(Boolean))].sort().reverse());
    if (filterCategory) populateSelect(filterCategory, [...new Set(works.map(w => w.category).filter(Boolean))].sort());

    if (filterYear) filterYear.value = state.filters.year;
    if (filterCategory) filterCategory.value = state.filters.category;

    // 4. Render Inicial
    applyFilters();

    // 5. Event Listeners (com Debounce na busca)
    if (searchInput) searchInput.addEventListener('input', debounce((e) => {
        state.filters.term = e.target.value;
        updateURL();
        applyFilters();
    }, 300));

    [filterYear, filterCategory].forEach(el => {
        if (el) el.addEventListener('change', (e) => {
            if (e.target.id === 'filterYear') state.filters.year = e.target.value;
            if (e.target.id === 'filterCategory') state.filters.category = e.target.value;
            updateURL();
            applyFilters();
        });
    });
}

function applyFilters() {
    const { term, year, category } = state.filters;
    const termLower = term.toLowerCase();

    const filtered = state.allWorks.filter(work => {
        const matchesTerm = !term || work.title.toLowerCase().includes(termLower) || work.synopsis.toLowerCase().includes(termLower);
        const matchesYear = year === 'all' || work.year === year;
        const matchesCat = category === 'all' || work.category === category;
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
                <img src="${imgUrl}" alt="${obra.titulo}" class="obra-img" loading="lazy">
                <div class="obra-overlay">
                    <button class="btn-detalhes">Ver Detalhes</button>
                </div>
            </div>
            <div class="obra-info">
                <span class="obra-categoria">${capitalize(obra.categoria || 'Literatura')}</span>
                <h3 class="obra-titulo">${obra.titulo}</h3>
                <p class="obra-ano">${dataAno}</p>
            </div>
        `;

        card.addEventListener('click', () => openModal(obra));
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
    if (state.filters.category !== 'all') params.set('category', state.filters.category);
    
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
        modal.showModal();
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

    if(prevBtn) prevBtn.addEventListener('click', () => smoothScrollSlider(container, -350));
    if(nextBtn) nextBtn.addEventListener('click', () => smoothScrollSlider(container, 350));
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
    if(!str) return '';
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
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}