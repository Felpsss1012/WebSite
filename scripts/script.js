document.addEventListener('DOMContentLoaded', () => {
  /* ==========================================================
     LÓGICA GERAL & HOME (Preservada do original)
     ========================================================== */

  // Header scroll effect
  const header = document.querySelector('.main-header');
  if (header) {
    const isFixedPage = header.classList.contains('style-fixed');
    // Só aplica efeito de scroll se NÃO for a página interna (que já é fixa)
    if (!isFixedPage) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
          header.style.background = 'rgba(255, 255, 255, 0.95)';
          header.style.padding = '15px 5%';
          header.style.position = 'fixed';
          header.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
          document.querySelectorAll('.nav-links a, .logo').forEach(el => el.style.color = '#1a1a1a');
        } else {
          header.style.background = 'transparent';
          header.style.padding = '30px 5%';
          header.style.position = 'absolute';
          header.style.boxShadow = 'none';
          document.querySelectorAll('.nav-links a, .logo').forEach(el => el.style.color = '#fff');
        }
      });
    }
  }


  /* -------------------------
     Smooth Scroll e Navegação entre Páginas
  ------------------------- */
  document.querySelectorAll('a[href^="#"], a[href*="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');

      // Se o link for apenas um ID (ex: #contato) e estivermos na Home
      if (href.startsWith('#')) {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          window.scrollTo({
            top: target.offsetTop - 80, // Desconto do header fixo
            behavior: 'smooth'
          });
        }
      }
      // Se o link for para outra página com âncora (ex: index.html#contato)
      else if (href.includes('#') && !href.startsWith('http')) {
        const path = href.split('#')[0];
        const hash = '#' + href.split('#')[1];

        // Se já estamos na página do path, apenas faz o scroll
        if (window.location.pathname.endsWith(path) || path === './index.html' || path === '../index.html') {
          const target = document.querySelector(hash);
          if (target) {
            e.preventDefault();
            window.scrollTo({
              top: target.offsetTop - 80,
              behavior: 'smooth'
            });
          }
        }
      }
    });
  });

  // Slider Home
  const wrapper = document.querySelector('.obras-wrapper');
  const grid = document.querySelector('.obras-grid');
  // Verifica se estamos na Home (slider existe)
  if (grid) {
    const cards = Array.from(document.querySelectorAll('.obra-card'));
    const nextBtn = document.querySelector('.nav-btn.next');
    const prevBtn = document.querySelector('.nav-btn.prev');

    if (cards.length > 0) {
      let currentIndex = 0;
      const gap = 30;

      function calcVisibleCards() {
        if (window.innerWidth <= 768) return 1;
        if (window.innerWidth <= 1140) return 2;
        return 3;
      }
      let visibleCards = calcVisibleCards();

      function updateLayout() {
        visibleCards = calcVisibleCards();
        const totalCards = cards.length;
        if (totalCards <= visibleCards) {
          if (nextBtn) nextBtn.style.display = 'none';
          if (prevBtn) prevBtn.style.display = 'none';
          grid.style.justifyContent = 'center';
          if (wrapper) wrapper.style.overflow = 'visible';
        } else {
          if (nextBtn) nextBtn.style.display = 'inline-flex';
          if (prevBtn) prevBtn.style.display = 'inline-flex';
          grid.style.justifyContent = 'flex-start';
          if (wrapper) wrapper.style.overflow = 'hidden';
        }
        const maxIndex = Math.max(0, cards.length - visibleCards);
        if (currentIndex > maxIndex) currentIndex = maxIndex;
        updateSlider();
      }

      function updateSlider() {
        const cardWidth = cards[0].offsetWidth;
        const moveAmount = currentIndex * (cardWidth + gap);
        grid.style.transform = `translateX(-${moveAmount}px)`;

        if (prevBtn) {
          prevBtn.style.opacity = currentIndex === 0 ? '0.3' : '1';
          prevBtn.disabled = currentIndex === 0;
        }
        if (nextBtn) {
          const maxIndex = cards.length - visibleCards;
          nextBtn.style.opacity = currentIndex >= maxIndex ? '0.3' : '1';
          nextBtn.disabled = currentIndex >= maxIndex;
        }
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          const maxIndex = cards.length - visibleCards;
          if (currentIndex < maxIndex) {
            currentIndex += 1;
            updateSlider();
          }
        });
      }
      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          if (currentIndex > 0) {
            currentIndex -= 1;
            updateSlider();
          }
        });
      }

      window.addEventListener('resize', () => {
        clearTimeout(window.__obrasResizeTimer);
        window.__obrasResizeTimer = setTimeout(updateLayout, 120);
      });
      updateLayout();
    }
  }

  /* ==========================================================
     LÓGICA DO CATÁLOGO DE OBRAS (Nova Funcionalidade)
     ========================================================== */

  // Verifica se estamos na página do catálogo
  const catalogoGrid = document.getElementById('obrasGrid');

  if (catalogoGrid) {
    initCatalog(catalogoGrid);
  }

});

/**
 * Função principal para inicializar o catálogo
 */
async function initCatalog(gridContainer) {
  if (!gridContainer) return;

  const PROJECT_ID = '07dzzde3';
  const DATASET = 'production';
  const noResultsMsg = document.getElementById('noResults');

  // Query com campos compatíveis com seu Sanity
  const QUERY = encodeURIComponent(`*[_type == "livro" && status == "Publicado"]{
        "id": _id,
        "title": titulo,
        "year": 2024,
        "category": "Obra",
        "image": capa.asset->url,
        "synopsis": sinopse,
        "linkRead": leitura_online,
        "linkBuy": linkAmazon
    }`);

  const API_URL = `https://${PROJECT_ID}.api.sanity.io/v2021-10-21/data/query/${DATASET}?query=${QUERY}`;

  try {
    const response = await fetch(API_URL);
    const result = await response.json();
    const dataFromSanity = result.result || [];

    gridContainer.innerHTML = '';

    if (dataFromSanity.length === 0) {
      if (noResultsMsg) noResultsMsg.style.display = 'block';
      return;
    }

    if (noResultsMsg) noResultsMsg.style.display = 'none';

    // Renderiza cada livro diretamente
    dataFromSanity.forEach(work => {
      const card = document.createElement('div');
      card.className = 'obra-card';
      const imgUrl = work.image || '../img/capa-padrao.jpg';

      card.innerHTML = `
          <img src="${imgUrl}" alt="${work.title}" class="obra-img">
          <div class="obra-info" style="padding: 20px;">
              <span class="obra-cat" style="font-size: 0.75rem; color: #888;">${work.category}</span>
              <h3 class="obra-title" style="font-size: 1.1rem; margin-top: 5px;">${work.title}</h3>
          </div>
      `;

      card.addEventListener('click', () => {
        if (typeof openModal === 'function') openModal(work);
      });

      gridContainer.appendChild(card);
    });

  } catch (error) {
    console.error("Erro API:", error);
  }
}

fetch(URL)
  .then(res => res.json())
  .then(data => {
    // Aqui você mapeia os dados para o seu grid de obras
    console.log(data.result);
  });

// Elementos do DOM
const searchInput = document.getElementById('searchInput');
const filterYear = document.getElementById('filterYear');
const filterCategory = document.getElementById('filterCategory');
const modal = document.getElementById('obraModal');
const closeModalBtn = document.getElementById('closeModal');

// Popular filtro de anos dinamicamente
const years = [...new Set(worksData.map(w => w.year))].sort((a, b) => b - a);
years.forEach(year => {
  const option = document.createElement('option');
  option.value = year;
  option.textContent = year;
  filterYear.appendChild(option);
});

// Função de Renderização
// 1. Função de Renderização (Coloque-a ANTES da initCatalog para evitar erros de inicialização)
function renderWorks(works, gridContainer) {
  const noResultsMsg = document.getElementById('noResults');
  if (!gridContainer) return;

  gridContainer.innerHTML = '';

  if (works.length === 0) {
    if (noResultsMsg) noResultsMsg.style.display = 'block';
    return;
  }

  if (noResultsMsg) noResultsMsg.style.display = 'none';

  works.forEach(work => {
    const card = document.createElement('div');
    card.className = 'obra-card';
    // Fallback para imagem caso não exista no Sanity
    const imageUrl = work.image ? work.image : '../img/capa-padrao.jpg';

    card.innerHTML = `
            <img src="${imageUrl}" alt="${work.title}" class="obra-img">
            <div class="obra-info">
                <span class="obra-cat">${work.category || 'Literatura'}</span>
                <h3 class="obra-title">${work.title}</h3>
                <p class="obra-year">${work.year || ''}</p>
            </div>
        `;
    card.addEventListener('click', () => openModal(work));
    gridContainer.appendChild(card);
  });
}

// 2. Função de Inicialização com a API
async function initCatalog(gridContainer) {
  if (!gridContainer) return;

  const PROJECT_ID = '07dzzde3';
  const DATASET = 'production';

  // Query que busca seus dados reais do Sanity
  const QUERY = encodeURIComponent(`*[_type == "livro" && status == "Publicado"]{
        "id": _id,
        "title": titulo,
        "year": 2024, 
        "category": "romance",
        "image": capa.asset->url,
        "synopsis": sinopse,
        "linkRead": leitura_online,
        "linkBuy": linkAmazon
    }`);

  const API_URL = `https://${PROJECT_ID}.api.sanity.io/v2021-10-21/data/query/${DATASET}?query=${QUERY}`;

  try {
    const response = await fetch(API_URL);

    // Verifica se a resposta é HTML (erro 404) ou JSON real
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new TypeError("A API não retornou um JSON válido. Verifique o Project ID.");
    }

    const result = await response.json();
    const worksData = result.result || [];

    // Chama a renderização passando os dados recebidos
    renderWorks(worksData, gridContainer);

  } catch (error) {
    console.error("Erro detalhado:", error);
    gridContainer.innerHTML = `<p style="color: red; text-align: center; width: 100%;">
            Erro ao carregar catálogo.<br>
            <small>${error.message}</small>
        </p>`;
  }
}

// Lógica de Filtro
function filterWorks() {
  const searchTerm = searchInput.value.toLowerCase();
  const yearVal = filterYear.value;
  const catVal = filterCategory.value;

  const filtered = worksData.filter(work => {
    const matchesSearch = work.title.toLowerCase().includes(searchTerm) ||
      work.synopsis.toLowerCase().includes(searchTerm);
    const matchesYear = yearVal === 'all' || work.year.toString() === yearVal;
    const matchesCat = catVal === 'all' || work.category === catVal;

    return matchesSearch && matchesYear && matchesCat;
  });

  renderWorks(filtered);
}

// Listeners dos filtros
searchInput.addEventListener('input', filterWorks);
filterYear.addEventListener('change', filterWorks);
filterCategory.addEventListener('change', filterWorks);

// Lógica da Modal
/* ==========================================================
   LÓGICA DO MODAL CORRIGIDA
   ========================================================== */
function openModal(work) {
    const modal = document.getElementById('workModal');
    if (!modal) return;

    // Popula dados básicos
    const modalImg = document.getElementById('modalImg');
    if (modalImg) {
        modalImg.src = work.image || '../img/capa-padrao.jpg';
        modalImg.alt = `Capa do livro ${work.title}`;
    }
    
    document.getElementById('modalTitle').textContent = work.title;
    document.getElementById('modalYear').textContent = work.year || '';
    document.getElementById('modalCategory').textContent = work.category || 'Obra';
    document.getElementById('modalSynopsis').textContent = work.synopsis || 'Sinopse não disponível.';

    // Botões de Ação
    const btnRead = document.getElementById('btnRead'); // Leitura Online
    const btnBuy = document.getElementById('btnBuy');   // Amazon

    // Configura o botão de Ler Online
    if (btnRead) {
        if (work.linkRead) {
            btnRead.style.display = 'inline-block';
            btnRead.onclick = () => window.open(work.linkRead, '_blank');
        } else {
            btnRead.style.display = 'none';
        }
    }

    // Configura o botão da Amazon
    if (btnBuy) {
        if (work.linkBuy) {
            btnBuy.style.display = 'inline-block';
            btnBuy.onclick = () => window.open(work.linkBuy, '_blank');
        } else {
            btnBuy.style.display = 'none';
        }
    }

    modal.showModal();
    document.body.style.overflow = 'hidden';
}

// LÓGICA DE FECHAMENTO (Botão X e clicar fora)
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('workModal');
    const closeModalBtn = document.querySelector('.close-modal');

    if (closeModalBtn && modal) {
        closeModalBtn.addEventListener('click', () => {
            modal.close();
            document.body.style.overflow = '';
        });

        // Fechar ao clicar no fundo (backdrop)
        modal.addEventListener('click', (e) => {
            const rect = modal.getBoundingClientRect();
            const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
                                rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
            if (!isInDialog) {
                modal.close();
                document.body.style.overflow = '';
            }
        });
    }
});

closeModalBtn.addEventListener('click', closeModal);

// Fechar ao clicar fora (backdrop)
modal.addEventListener('click', (e) => {
  const rect = modal.getBoundingClientRect();
  const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
    rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
  if (!isInDialog) {
    closeModal();
  }
});

// Helper: Formata categoria (ex: 'ensaio' -> 'Ensaio')
function formatCategory(cat) {
  const map = {
    'romance': 'Romance',
    'ensaio': 'Ensaio',
    'cronica': 'Crônica',
    'artigo': 'Artigo Acadêmico'
  };
  return map[cat] || cat;
}

function setupButton(btnElement, link) {
  if (!link) {
    btnElement.style.display = 'none';
  } else {
    btnElement.style.display = 'inline-block';
    btnElement.href = link;
  }
}

// Substitua o trecho que cria o card por este:
worksData.forEach(work => {
    const card = document.createElement('div');
    card.className = 'obra-card';
    card.style.cursor = 'pointer'; // Garante que o rato mude ao passar por cima
    
    const imgUrl = work.image || '../img/capa-padrao.jpg';
    
    card.innerHTML = `
        <img src="${imgUrl}" alt="${work.title}" class="obra-img">
        <div class="obra-info">
            <span class="obra-cat">${work.category || 'Obra'}</span>
            <h3 class="obra-title">${work.title}</h3>
        </div>
    `;
    
    // O CLIQUE VOLTA AQUI:
    card.onclick = () => {
        console.log("Clicou na obra:", work.title); // Para testar no F12
        openModal(work);
    };

    gridContainer.appendChild(card);
});

// Inicialização inicial
renderWorks(worksData);