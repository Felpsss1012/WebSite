// Substituir os dois blocos DOMContentLoaded anteriores por este bloco unificado.
// Ele preserva a lógica original (header scroll, smooth anchor scroll, navegação do slider),
// corrige os seletores (usa .obras-wrapper e .nav-btn), evita wrapper === null e melhora responsividade.

document.addEventListener('DOMContentLoaded', () => {
  /* -------------------------
     Header scroll effect (mantive sua lógica)
     ------------------------- */
  const header = document.querySelector('.main-header');
  window.addEventListener('scroll', () => {
    if (!header) return;
    if (window.scrollY > 100) {
      header.style.background = 'rgba(255, 255, 255, 0.95)';
      header.style.padding = '15px 5%';
      header.style.position = 'fixed';
      document.querySelectorAll('.nav-links a, .logo').forEach(el => el.style.color = '#1a1a1a');
    } else {
      header.style.background = 'transparent';
      header.style.padding = '30px 5%';
      header.style.position = 'absolute';
      document.querySelectorAll('.nav-links a, .logo').forEach(el => el.style.color = '#fff');
    }
  });

  /* -------------------------
     Smooth scroll for internal anchors (preserve behaviour)
     ------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      // preserve intended default for external mailto/links
      const href = this.getAttribute('href');
      if (!href || href === '#' || href.startsWith('mailto:')) return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  /* -------------------------
     Slider (unificado e robusto)
     - Usa .obras-wrapper (adicionada ao HTML)
     - Usa .nav-btn (já existente no HTML)
     - Mantém a ideia de visibleCards / gap / currentIndex
     ------------------------- */
  const wrapper = document.querySelector('.obras-wrapper'); // agora existe (HTML atualizado)
  const grid = document.querySelector('.obras-grid');
  const cards = Array.from(document.querySelectorAll('.obra-card'));
  const nextBtn = document.querySelector('.nav-btn.next');
  const prevBtn = document.querySelector('.nav-btn.prev');

  // Se não houver grid ou cards, nada a fazer (preserva comportamento anterior)
  if (!grid || cards.length === 0) return;

  let currentIndex = 0;
  const gap = 30; // deve manter sincronizado com o CSS (obras-grid gap)
  // visibleCards original era 3; vamos adaptar conforme largura (mantendo lógica)
  function calcVisibleCards() {
    if (window.innerWidth <= 768) return 1;
    if (window.innerWidth <= 1140) return 2;
    return 3;
  }
  let visibleCards = calcVisibleCards();

  // Atualiza layout: exibe/oculta setas, ajusta overflow e chama updateSlider
  function updateLayout() {
    visibleCards = calcVisibleCards();
    const totalCards = cards.length;

    // se houver menos ou igual ao número visível, esconder setas e centralizar
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

    // Ajusta currentIndex caso a viewport tenha mudado (ex.: reduzir visibleCards)
    const maxIndex = Math.max(0, cards.length - visibleCards);
    if (currentIndex > maxIndex) currentIndex = maxIndex;

    updateSlider();
  }

  // Move o slider com base no currentIndex
  function updateSlider() {
    const cardWidth = cards[0].offsetWidth;
    const moveAmount = currentIndex * (cardWidth + gap);
    // Usamos transform para transições suaves (CSS já tem transition)
    grid.style.transform = `translateX(-${moveAmount}px)`;

    // Acessibilidade: aria-disabled e visual (opacity)
    if (prevBtn) {
      const disabledPrev = currentIndex === 0;
      prevBtn.style.opacity = disabledPrev ? '0.3' : '1';
      prevBtn.setAttribute('aria-disabled', disabledPrev ? 'true' : 'false');
    }
    if (nextBtn) {
      const maxIndex = cards.length - visibleCards;
      const disabledNext = currentIndex >= maxIndex;
      nextBtn.style.opacity = disabledNext ? '0.3' : '1';
      nextBtn.setAttribute('aria-disabled', disabledNext ? 'true' : 'false');
    }
  }

  // Bind nos botões (mantendo a semântica original)
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

  // Recalcula layout no resize (preserva comportamento do script anterior)
  window.addEventListener('resize', () => {
    // Debounce simples (evita chamadas em excesso)
    clearTimeout(window.__obrasResizeTimer);
    window.__obrasResizeTimer = setTimeout(updateLayout, 120);
  });

  // Inicializa
  updateLayout();
});
