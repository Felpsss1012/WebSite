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

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        
        const json = await response.json();
        const result = json.result;

        if (!result) {
            alert("Livro não encontrado! Verifique se o SLUG está correto.");
            return;
        }

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

        renderReader(book);

    } catch (error) {
        console.error("ERRO FATAL:", error);
        const loaderEl = document.getElementById('loader');
        if (loaderEl) loaderEl.innerHTML = '<p style="color:red">Erro ao carregar a obra.</p>';
    }
}

function renderReader(book) {
    try { destroyPdfViewer(); } catch (e) {}

    const loaderEl = document.getElementById('loader');
    const mainContent = document.getElementById('mainContent');

    if (loaderEl) loaderEl.style.display = 'none';
    if (mainContent) {
        mainContent.classList.remove('hidden');
        // display grid já definido no CSS
    }

    document.title = `${book.titulo || 'Leitura'} | Mario Paulo`;

    // --- Coluna Esquerda ---
    const titleEl = document.getElementById('bookTitle');
    if (titleEl) titleEl.textContent = book.titulo || '';

    const synopsisEl = document.getElementById('bookSynopsis');
    if (synopsisEl) synopsisEl.textContent = book.sinopse || '';

    const coverEl = document.getElementById('bookCover');
    if (coverEl && book.capa) {
        coverEl.src = book.capa;
        coverEl.alt = `Capa de ${book.titulo}`;
    }

    const amazonBtn = document.getElementById('amazonLink');
    if (amazonBtn) {
        amazonBtn.href = book.linkAmazon || '#';
        if (!book.linkAmazon) amazonBtn.style.display = 'none'; // esconde se não tiver link
    }

    // --- Coluna Central (PDF ou Texto) ---
    const hasPdf = !!book.pdf;
    
    if (hasPdf) {
        // Inicializa PDF
        initPdfViewer(book.pdf).catch(() => {
             document.getElementById('pdfError').classList.remove('hidden');
        });
    } else {
        // Fallback Texto (se necessário)
        const textContent = document.getElementById('textContent');
        if (textContent) textContent.textContent = "Leitura disponível apenas em Mídia fisica para esta obra.";
    }

    // --- Coluna Direita (Reviews) renderizada via IIFE abaixo ---
}

/* ======================
   PDF Viewer 
   ====================== */
let _pdfDoc = null;
let _currentPage = 1;
let _totalPages = 0;
let _pageRendering = false;
let _scale = 1.2; // Escala base
let canvas = null;
let canvasCtx = null;

// Handlers de navegação
function _navPrevHandler(e) { e.stopPropagation(); gotoPrevPage(); showFeedback('navLeft'); }
function _navNextHandler(e) { e.stopPropagation(); gotoNextPage(); showFeedback('navRight'); }
function _kbdHandler(e) {
    if (e.key === 'ArrowLeft') { gotoPrevPage(); showFeedback('navLeft'); }
    if (e.key === 'ArrowRight') { gotoNextPage(); showFeedback('navRight'); }
}

// Pequeno efeito visual ao usar teclado
function showFeedback(elementId) {
    const el = document.getElementById(elementId);
    if(el) {
        el.style.opacity = '1';
        setTimeout(() => el.style.opacity = '', 300);
    }
}

async function initPdfViewer(url) {
    canvas = document.getElementById('pdfCanvas');
    canvasCtx = canvas ? canvas.getContext('2d') : null;
    const wrapper = document.getElementById('pdfWrapper');
    
    if (!canvas || !window.pdfjsLib) throw new Error('PDF Lib missing');

    wrapper.classList.remove('hidden');

    try {
        const loadingTask = pdfjsLib.getDocument(url);
        _pdfDoc = await loadingTask.promise;
        _totalPages = _pdfDoc.numPages;
        _currentPage = 1;
        
        updatePdfPageInfo();
        await renderPage(_currentPage);

        // Zonas de Clique (Invisíveis)
        const leftZone = document.getElementById('navLeft');
        const rightZone = document.getElementById('navRight');
        
        if (leftZone) leftZone.onclick = _navPrevHandler;
        if (rightZone) rightZone.onclick = _navNextHandler;
        
        document.addEventListener('keydown', _kbdHandler);
        window.addEventListener('resize', () => debounce(() => renderPage(_currentPage), 200)());

    } catch (err) {
        console.error('Erro PDF:', err);
        throw err;
    }
}

async function renderPage(pageNum) {
    if (!_pdfDoc || _pageRendering) return;
    _pageRendering = true;

    try {
        const page = await _pdfDoc.getPage(pageNum);
        
        // Responsividade do canvas:
        // Pega largura do container pai (viewport)
        const viewportContainer = document.getElementById('pdfViewport');
        const availableWidth = viewportContainer.clientWidth || 800;

        // Calcula escala baseada na largura disponível
        const unscaledViewport = page.getViewport({ scale: 1 });
        const scale = availableWidth / unscaledViewport.width;
        
        // Renderiza
        const viewport = page.getViewport({ scale: scale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
            canvasContext: canvasCtx,
            viewport: viewport
        };

        await page.render(renderContext).promise;
        _pageRendering = false;
        updatePdfPageInfo();

    } catch (err) {
        _pageRendering = false;
        console.error(err);
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

function destroyPdfViewer() {
    document.removeEventListener('keydown', _kbdHandler);
    _pdfDoc = null;
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/* ======================
   Reviews (Simplificado)
   ====================== */
(function() {
    function getSlug() { return new URLSearchParams(window.location.search).get('obra'); }
    
    // Simula reviews ou pega do localStorage
    function renderReviews() {
        const slug = getSlug();
        const reviews = JSON.parse(localStorage.getItem('mp_reviews_' + slug) || '[]');
        
        const listEl = document.getElementById('reviewsList');
        const starsEl = document.getElementById('reviewsAvgStars');
        const approvalEl = document.getElementById('reviewsApproval');
        
        if(!listEl) return;
        listEl.innerHTML = '';

        if(reviews.length === 0) {
            listEl.innerHTML = '<div style="color:#999; font-size:0.9rem; text-align:center;">Seja o primeiro a avaliar.</div>';
            if(approvalEl) approvalEl.style.display = 'none';
            return;
        }

        // Calcula Média
        const avg = reviews.reduce((a,b)=>a+(b.rating||0),0) / reviews.length;
        if(starsEl) starsEl.innerHTML = `★ ${avg.toFixed(1)} <span style="font-weight:400; color:#888">(${reviews.length})</span>`;
        if(approvalEl) approvalEl.textContent = `${Math.round((reviews.filter(r=>r.rating>=4).length/reviews.length)*100)}% Aprov.`;

        // Renderiza Lista
        reviews.reverse().forEach(r => {
            const div = document.createElement('div');
            div.className = 'review-card';
            div.innerHTML = `
                <div style="font-weight:500;">${r.comment || 'Sem comentário'}</div>
                <div class="review-meta">
                    <span style="color:#fbbf24; font-weight:bold;">${r.rating}★</span>
                    <span>${new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
            `;
            listEl.appendChild(div);
        });
    }

    // Tenta renderizar após um tempo (garante DOM pronto)
    setTimeout(renderReviews, 1000);
})();

initReader();