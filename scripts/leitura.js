/**
 * LÓGICA DE LEITURA ONLINE - MARIO PAULO
 * Baseado no Schema: livro (titulo, slug, capitulos[])
 */

const PROJECT_ID = '07dzzde3';
const DATASET = 'production';

async function initReader() {
    // 1. Captura o slug da URL (ex: ?obra=felpinho-dos-ferrari)
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('obra');

    if (!slug) {
        document.getElementById('loader').innerHTML = "Obra não especificada.";
        return;
    }

    // 2. Query GROQ: Busca o livro e seus capítulos
    const QUERY = encodeURIComponent(`*[_type == "livro" && slug.current == "${slug}" && status == "Publicado"][0]{
        titulo,
        "capa": capa.asset->url,
        sinopse,
        linkAmazon,
        capitulos
    }`);

    const API_URL = `https://${PROJECT_ID}.api.sanity.io/v2021-10-21/data/query/${DATASET}?query=${QUERY}`;

    try {
        const response = await fetch(API_URL);
        const { result } = await response.json();

        if (!result) {
            document.getElementById('loader').innerHTML = "Livro não encontrado ou não disponível para leitura.";
            return;
        }

        renderReader(result);

    } catch (error) {
        console.error("Erro ao carregar leitura:", error);
        document.getElementById('loader').innerHTML = "Erro de conexão com o acervo.";
    }
}

function renderReader(book) {
    // Esconde loader e mostra conteúdo
    document.getElementById('loader').style.display = 'none';
    const mainContent = document.getElementById('mainContent');
    mainContent.style.display = 'grid';

    // Update Editorial Info
    document.title = `${book.titulo} | Leitura Online - Mario Paulo`;
    document.getElementById('bookTitle').textContent = book.titulo;
    document.getElementById('bookCover').src = book.capa;
    document.getElementById('bookSynopsis').textContent = book.sinopse;
    document.getElementById('amazonLink').href = book.linkAmazon;
    document.getElementById('ctaAmazon').href = book.linkAmazon;

    const listContainer = document.getElementById('chapterList');
    listContainer.innerHTML = '';

    // Renderiza Lista de Capítulos
    if (book.capitulos && book.capitulos.length > 0) {
        book.capitulos.forEach((cap, index) => {
            const li = document.createElement('li');
            li.className = `chapter-item ${!cap.disponivel ? 'locked' : ''}`;
            
            li.innerHTML = `
                <span>${cap.nome}</span>
                ${!cap.disponivel ? '<span class="lock-icon">🔒</span>' : ''}
            `;

            if (cap.disponivel) {
                li.onclick = () => loadChapter(cap, li);
                // Carrega o primeiro capítulo disponível automaticamente
                if (!document.querySelector('.chapter-item.active')) {
                    loadChapter(cap, li);
                }
            }
            listContainer.appendChild(li);
        });
    }
}

function loadChapter(cap, element) {
    // UI Update
    document.querySelectorAll('.chapter-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    // Content Update
    document.getElementById('currentChapterTitle').textContent = cap.nome;
    document.getElementById('textContent').textContent = cap.conteudo;
    
    // Smooth scroll para o topo da área de leitura em mobile
    if(window.innerWidth < 900) {
        document.querySelector('.reading-area').scrollIntoView({ behavior: 'smooth' });
    }
}

// Inicializa
initReader();