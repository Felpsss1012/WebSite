const PROJECT_ID = '07dzzde3';
const DATASET = 'production';

async function initReader() {
    const urlParams = new URLSearchParams(window.location.search);
    const slugParam = urlParams.get('obra');

    if (!slugParam) {
        console.error("ERRO: Nenhum slug na URL (?obra=...)");
        return;
    }

    const slug = String(slugParam).split(':')[0];

    // Query ampliada: traz capa, sinopse, linkAmazon, pdf, capitulos e flags
    // usamos coalesce para suportar variações de nomes de campo (capa / cover / imagem)
    const query = `*[_type == "livro" && slug.current == "${slug}"][0]{
        titulo,
        visivel,
        gratuito,
        sinopse,
        "capa": coalesce(capa.asset->url, cover.asset->url, imagem.asset->url),
        "pdf": coalesce(arquivoPDF.asset->url, pdf.asset->url),
        linkAmazon,
        capitulos[] { nome, disponivel, conteudo }
    }`;

    const API_URL = `https://${PROJECT_ID}.api.sanity.io/v2021-10-21/data/query/${DATASET}?query=${encodeURIComponent(query)}`;

    console.log("initReader: buscando livro com slug:", slug);
    console.log("initReader: url da API:", API_URL);

    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`Resposta da API: ${response.status} ${response.statusText}`);
        }
        const json = await response.json();
        const result = json.result;

        console.log("initReader: resultado do Sanity:", result);

        if (!result) {
            console.error("ERRO: Livro não encontrado no banco de dados.");
            // atualiza UI: esconde loader e informa usuário (não altera mainContent)
            const loaderEl = document.getElementById('loader');
            if (loaderEl) loaderEl.textContent = 'Livro não encontrado.';
            alert("Livro não encontrado! Verifique se o SLUG está correto.");
            return;
        }

        // Avisos sobre visibilidade / PDF
        if (result.visivel !== true) {
            console.warn("ALERTA: O livro existe, mas 'visivel' está FALSO.");
        }

        if (!result.pdf) {
            console.warn("AVISO: Não foi encontrado link de PDF na resposta (campo 'pdf' vazio).");
        }

        // Normaliza/expande campos para compatibilidade com renderReader
        const book = {
            titulo: result.titulo,
            visivel: result.visivel,
            gratuito: result.gratuito,
            sinopse: result.sinopse,
            capa: result.capa || null,
            pdf: result.pdf || null,
            linkAmazon: result.linkAmazon || null,
            capitulos: Array.isArray(result.capitulos) ? result.capitulos : []
        };

        // Renderiza tudo no DOM (renderReader decide exibir viewer, capa, links etc)
        renderReader(book);

    } catch (error) {
        console.error("ERRO FATAL NA REQUISIÇÃO initReader:", error);
        const loaderEl = document.getElementById('loader');
        if (loaderEl) loaderEl.textContent = 'Erro ao carregar a obra. Veja o console.';
    }
}




function renderReader(book) {
    // Cleanup de viewer antigo
    try { destroyPdfViewer(); } catch (e) {}

    /* =====================
       ESTADO DA TELA
       ===================== */
    const loaderEl = document.getElementById('loader');
    const mainContent = document.getElementById('mainContent');

    if (loaderEl) loaderEl.style.display = 'none';
    if (mainContent) {
        mainContent.classList.remove('hidden');
        mainContent.style.display = 'grid';
    }

    /* =====================
       METADADOS
       ===================== */
    document.title = `${book.titulo || 'Leitura'} | Leitura Online - Mario Paulo`;

    /* =====================
       SIDEBAR (EDITORIAL)
       ===================== */
    const titleEl = document.getElementById('bookTitle');
    if (titleEl) titleEl.textContent = book.titulo || '';

    const synopsisEl = document.getElementById('bookSynopsis');
    if (synopsisEl) synopsisEl.textContent = book.sinopse || '';

    const coverEl = document.getElementById('bookCover');
    const amazonLink = book.linkAmazon || null;

    if (coverEl && book.capa) {
        coverEl.src = book.capa;
        coverEl.alt = `Capa do livro ${book.titulo || ''}`;

        // Torna a capa clicável se houver Amazon
        if (amazonLink) {
            coverEl.style.cursor = 'pointer';
            coverEl.setAttribute('role', 'link');
            coverEl.setAttribute('tabindex', '0');

            coverEl.onclick = () => window.open(amazonLink, '_blank');
            coverEl.onkeydown = (e) => {
                if (e.key === 'Enter') window.open(amazonLink, '_blank');
            };
        }
    }

    /* =====================
       LINKS AMAZON
       ===================== */
    const amazonBtn = document.getElementById('amazonLink');
    const ctaAmazon = document.getElementById('ctaAmazon');

    if (amazonBtn) {
        amazonBtn.href = amazonLink || '#';
        amazonBtn.style.display = amazonLink ? 'block' : 'none';
    }

    if (ctaAmazon) {
        ctaAmazon.href = amazonLink || '#';
        ctaAmazon.style.display = amazonLink ? 'inline-block' : 'none';
    }

    /* =====================
       CAPÍTULOS
       ===================== */
    const listContainer = document.getElementById('chapterList');
    if (listContainer) listContainer.innerHTML = '';

    let firstAvailableChapter = null;

    if (Array.isArray(book.capitulos) && book.capitulos.length && listContainer) {
        book.capitulos.forEach((cap) => {
            const li = document.createElement('li');
            li.className = `chapter-item ${cap.disponivel ? '' : 'locked'}`;

            li.innerHTML = `
                <span>${cap.nome || 'Capítulo'}</span>
                ${!cap.disponivel ? '<span class="lock-icon">🔒</span>' : ''}
            `;

            if (cap.disponivel) {
                li.addEventListener('click', () => loadChapter(cap, li));
                if (!firstAvailableChapter) firstAvailableChapter = { cap, li };
            }

            listContainer.appendChild(li);
        });
    }

    /* =====================
       ÁREA DE LEITURA
       ===================== */
    const textContent = document.getElementById('textContent');
    const pdfWrapper = document.getElementById('pdfWrapper');
    const chapterNav = document.getElementById('chapterList');

    const hasPdf = !!book.pdf;
    const isFree = book.gratuito === undefined ? true : !!book.gratuito;

    // Reset seguro
    if (pdfWrapper) {
        pdfWrapper.classList.add('hidden');
        pdfWrapper.style.display = 'none';
    }
    if (textContent) textContent.style.display = '';
    if (chapterNav) chapterNav.style.display = '';

    if (hasPdf && isFree) {
        // Modo PDF
        if (textContent) textContent.style.display = 'none';
        if (chapterNav) chapterNav.style.display = 'none';
        if (pdfWrapper) {
            pdfWrapper.classList.remove('hidden');
            pdfWrapper.style.display = 'block';
        }

        initPdfViewer(book.pdf).catch(() => {
            const info = document.getElementById('pdfPageInfo');
            if (info) info.textContent = 'Não foi possível carregar o PDF.';
        });

    } else {
        // Modo capítulos/texto
        if (firstAvailableChapter) {
            loadChapter(firstAvailableChapter.cap, firstAvailableChapter.li);
        }
    }
}


function loadChapter(cap, element) {
    // UI Update
    document.querySelectorAll('.chapter-item').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');

    // Content Update
    const titleEl = document.getElementById('currentChapterTitle');
    if (titleEl) titleEl.textContent = cap.nome || '';

    const contentEl = document.getElementById('textContent');
    if (contentEl) contentEl.textContent = cap.conteudo || '';

    // Smooth scroll para o topo da área de leitura em mobile
    if (window.innerWidth < 900) {
        const readingArea = document.querySelector('.reading-area');
        if (readingArea) readingArea.scrollIntoView({ behavior: 'smooth' });
    }
}

/* --------------------
   Reviews (mantive igual)
   -------------------- */
(function () {
    function getSlug() {
        const params = new URLSearchParams(window.location.search);
        return params.get('obra') || 'unknown';
    }
    function getReviews(slug) {
        try { return JSON.parse(localStorage.getItem('mp_reviews_' + slug) || '[]'); } catch (e) { return []; }
    }
    function calcApproval(reviews) {
        if (!reviews || !reviews.length) return { percent: 0, avg: 0, total: 0 };
        const total = reviews.length;
        const approved = reviews.filter(r => (r.rating || 0) >= 4).length;
        const percent = Math.round((approved / total) * 100);
        const avg = reviews.reduce((s, r) => s + (r.rating || 0), 0) / total;
        return { percent, avg: Math.round(avg * 10) / 10, total };
    }
    function renderStars(container, count, filled) {
        if (!container) return;
        container.innerHTML = '';
        for (let i = 1; i <= count; i++) {
            const s = document.createElement('span');
            s.className = 'star' + (i <= filled ? ' filled' : '');
            s.dataset.value = i;
            container.appendChild(s);
        }
    }
    function escapeHtml(text) { if (!text) return ''; return String(text).replace(/[&<"'>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": "&#039;" })[m]); }
    function renderPageReviews() {
        const slug = getSlug();
        const reviews = getReviews(slug) || [];
        const summary = calcApproval(reviews);
        const starsEl = document.getElementById('reviewsAvgStars');
        const approvalEl = document.getElementById('reviewsApproval');
        const countEl = document.getElementById('reviewsCount');
        const listEl = document.getElementById('reviewsList');
        renderStars(starsEl, 5, Math.round(summary.avg || 0));
        if (approvalEl) approvalEl.textContent = reviews.length ? `${summary.percent}% aprov.` : 'Sem avaliações';
        if (countEl) countEl.textContent = reviews.length ? `${summary.total} avaliação(ões)` : '';
        if (!listEl) return;
        listEl.innerHTML = '';
        if (!reviews.length) {
            listEl.innerHTML = '<div style="color:var(--text-muted)">Seja o primeiro a avaliar esta obra.</div>';
        } else {
            reviews.slice().reverse().forEach(r => {
                const rc = document.createElement('div');
                rc.className = 'review-card';
                const date = r.createdAt ? new Date(r.createdAt).toLocaleString() : '';
                rc.innerHTML = `
                  <div style="flex:1">
                    <div class="comment-text">${escapeHtml(r.comment || '')}</div>
                    <div class="meta" style="margin-top:8px;">
                      <span style="font-weight:700; margin-right:8px; color:var(--text-muted);">${r.rating}★</span>
                      <span style="color:var(--text-muted);">${date}</span>
                    </div>
                  </div>`;
                listEl.appendChild(rc);
            });
        }
    }
    window.addEventListener('storage', function (e) {
        if (e.key && e.key.startsWith('mp_reviews_')) renderPageReviews();
    });
    let attempts = 0;
    const waitAndRender = setInterval(() => {
        attempts++;
        const cover = document.getElementById('bookCover');
        const coverLarge = document.getElementById('bookCoverLarge');
        if (cover && cover.src && coverLarge) { coverLarge.src = cover.src; }
        const title = document.getElementById('bookTitle');
        const titleLarge = document.getElementById('bookTitleLarge');
        if (title && titleLarge) titleLarge.textContent = title.textContent;
        const synopsis = document.getElementById('bookSynopsis');
        const synopsisShort = document.getElementById('bookSynopsisShort');
        if (synopsis && synopsisShort) synopsisShort.textContent = synopsis.textContent;
        const mainContent = document.getElementById('mainContent');
        if (mainContent && mainContent.style.display !== 'none') {
            renderPageReviews();
            clearInterval(waitAndRender);
        }
        if (attempts > 12) { // ~3s
            renderPageReviews();
            clearInterval(waitAndRender);
        }
    }, 250);
    window._leituraPageReviews = { render: renderPageReviews };
})();

/* ======================
   PDF Viewer usando pdf.js
   ====================== */
let _pdfDoc = null;
let _currentPage = 1;
let _totalPages = 0;
let _pageRendering = false;
let _scale = 1.08; // ajuste de zoom inicial
let canvas = null;
let canvasCtx = null;

// named handlers so we can remove them later
function _pdfKeyHandler(e) {
    if (e.key === 'ArrowLeft') gotoPrevPage();
    if (e.key === 'ArrowRight') gotoNextPage();
}
function _onResize() {
    // re-renderiza a página atual mais devagar para evitar loops
    debounce(() => renderPage(_currentPage), 150)();
}

async function initPdfViewer(url) {
    // inicializa canvas aqui (para garantir que DOM esteja pronto)
    canvas = document.getElementById('pdfCanvas');
    canvasCtx = canvas ? canvas.getContext('2d') : null;

    if (!canvas || !canvasCtx) {
        console.error('Canvas do PDF não encontrado');
        const info = document.getElementById('pdfPageInfo');
        if (info) info.textContent = 'Leitor indisponível (elemento canvas não encontrado).';
        throw new Error('Canvas not found');
    }

    if (!window.pdfjsLib) {
        console.warn('pdfjsLib não encontrado - verifique inclusão do CDN no HTML');
        const info = document.getElementById('pdfPageInfo');
        if (info) info.textContent = 'Leitor não disponível (biblioteca pdf.js ausente).';
        throw new Error('pdfjsLib not found');
    }

    try {
        // Tentativa 1: fetch do arquivo e passar arrayBuffer (às vezes necessário por CORS)
        let loadingTask;
        try {
            console.debug('[leitura.pdf] tentando fetch do PDF (arrayBuffer)...', url);
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`fetch retornou ${resp.status}`);
            const buffer = await resp.arrayBuffer();
            loadingTask = pdfjsLib.getDocument({ data: buffer });
        } catch (errFetch) {
            // Fallback: tenta carregar pelo URL diretamente
            console.warn('[leitura.pdf] fetch direto falhou, tentando carregar por URL:', errFetch);
            loadingTask = pdfjsLib.getDocument(url);
        }

        _pdfDoc = await loadingTask.promise;
        _totalPages = _pdfDoc.numPages;
        _currentPage = 1;
        updatePdfPageInfo();

        // garante que o wrapper esteja visível ANTES de calcular larguras (evita clientWidth == 0)
        const pdfWrapper = document.getElementById('pdfWrapper');
        if (pdfWrapper) {
            pdfWrapper.classList.remove('hidden');
            pdfWrapper.style.display = 'block';
            // force reflow para garantir medidas corretas
            void pdfWrapper.offsetWidth;
        }

        await renderPage(_currentPage);

        // conecta botões
        const prev = document.getElementById('pdfPrev');
        const next = document.getElementById('pdfNext');
        if (prev) prev.addEventListener('click', gotoPrevPage);
        if (next) next.addEventListener('click', gotoNextPage);

        // keyboard arrows
        document.addEventListener('keydown', _pdfKeyHandler);
        // resize -> re-renderiza página para ajustar
        window.addEventListener('resize', _onResize);

        console.info('[leitura.pdf] PDF carregado com sucesso. Páginas:', _totalPages);
    } catch (err) {
        console.error('Erro ao abrir PDF:', err);
        const info = document.getElementById('pdfPageInfo');
        if (info) info.textContent = 'Não foi possível carregar o PDF.';
        // lança para caller lidar
        throw err;
    }
}


async function renderPage(pageNum) {
    if (!_pdfDoc) {
        console.warn('[leitura.pdf] _pdfDoc não inicializado');
        return;
    }
    if (_pageRendering) return;
    _pageRendering = true;

    try {
        const page = await _pdfDoc.getPage(pageNum);

        // viewport base (scale 1)
        const viewport = page.getViewport({ scale: 1 });
        const container = document.getElementById('pdfViewport');

        // Se container existir e tiver largura utilizável, usa-a.
        // Caso contrário, usa a largura natural do viewport (evita divisão por zero).
        let containerWidth = viewport.width;
        if (container) {
            const cw = container.clientWidth;
            if (cw && cw > 0) containerWidth = cw;
        }

        // evita NaN/0
        const desiredScale = ((containerWidth || viewport.width) / viewport.width) * _scale || _scale;
        const scaledViewport = page.getViewport({ scale: desiredScale });

        // garante canvas/context válidos (re-inicializa se necessário)
        if (!canvas || !canvasCtx) {
            canvas = document.getElementById('pdfCanvas');
            canvasCtx = canvas ? canvas.getContext('2d') : null;
            if (!canvas || !canvasCtx) throw new Error('Canvas não encontrado no renderPage');
        }

        // usa inteiros e define estilo visível/responsivo
        canvas.width = Math.floor(scaledViewport.width);
        canvas.height = Math.floor(scaledViewport.height);
        canvas.style.display = 'block';
        canvas.style.width = '100%';
        canvas.style.height = 'auto';

        const renderContext = {
            canvasContext: canvasCtx,
            viewport: scaledViewport
        };

        const renderTask = page.render(renderContext);
        await renderTask.promise;

        _pageRendering = false;
        updatePdfPageInfo();
    } catch (err) {
        _pageRendering = false;
        console.error('Erro ao renderizar página do PDF:', err);
        const info = document.getElementById('pdfPageInfo');
        if (info) info.textContent = 'Erro ao renderizar página do PDF.';
    }
}


function updatePdfPageInfo() {
    const info = document.getElementById('pdfPageInfo');
    if (info) info.textContent = `Página ${_currentPage} de ${_totalPages}`;
}

function gotoPrevPage() {
    if (_currentPage <= 1 || _pageRendering) return;
    _currentPage--;
    renderPage(_currentPage);
}

function gotoNextPage() {
    if (_currentPage >= _totalPages || _pageRendering) return;
    _currentPage++;
    renderPage(_currentPage);
}

/* Cleanup (caso precise recarregar outro livro) */
function destroyPdfViewer() {
    try {
        document.removeEventListener('keydown', _pdfKeyHandler);
        window.removeEventListener('resize', _onResize);

        const prev = document.getElementById('pdfPrev');
        const next = document.getElementById('pdfNext');
        if (prev) prev.removeEventListener('click', gotoPrevPage);
        if (next) next.removeEventListener('click', gotoNextPage);
    } catch (e) { /* ignore */ }
    _pdfDoc = null;
    _currentPage = 1;
    _totalPages = 0;
    const pdfWrapper = document.getElementById('pdfWrapper');
    if (pdfWrapper) { pdfWrapper.classList.add('hidden'); pdfWrapper.style.display = 'none'; }
}

/* Debounce utilitário */
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Inicializa
initReader();
