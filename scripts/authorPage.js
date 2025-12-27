import { createClient } from 'https://esm.sh/@sanity/client'

const client = createClient({
  projectId: '07dzzde3',
  dataset: 'production',
  apiVersion: '2022-03-07',
  useCdn: true,
});

async function loadAuthorPage() {
  const query = `*[_type == "authorPage"][0]{
    name,
    subtitle,
    "imageUrl": authorImage.asset->url,
    mainDescription,
    timeline,
    interests,
    literaryApproach,
    activism,
    collaborators,
    motivationalQuotes
  }`;

  try {
    const data = await client.fetch(query);
    console.log("Dados recebidos:", data); // Verifique no console

    if (!data) return;

    // 1. PERFIL PRINCIPAL
    const h1 = document.querySelector('.bio-intro h1');
    const subtitleEl = document.querySelector('.bio-tagline');
    const mainDesc = document.querySelector('.bio-summary');
    const portraitImg = document.querySelector('.bio-portrait img');
    const motivationalQuoteEl = document.querySelector('.bio-statement blockquote');

    if (data.name && h1) h1.innerText = data.name;
    if (data.subtitle && subtitleEl) subtitleEl.innerText = data.subtitle;
    if (data.mainDescription && mainDesc) mainDesc.innerText = data.mainDescription;
    if (data.imageUrl && portraitImg) portraitImg.src = data.imageUrl;
    if (data.motivationalQuotes && motivationalQuoteEl) motivationalQuoteEl.innerText = `"${data.motivationalQuotes}"`;

    // 2. TRAJETÓRIA (Schema: year, event)
    const timelineSection = document.querySelector('.bio-trajectory');
    if (timelineSection && Array.isArray(data.timeline)) {
      // Remove os exemplos estáticos do HTML
      timelineSection.querySelectorAll('.timeline-block').forEach(n => n.remove());

      const html = data.timeline.map(item => `
        <div class="timeline-block">
          <span class="timeline-year">${item.year}</span>
          <div class="timeline-text"><p>${item.event}</p></div>
        </div>
      `).join('');
      
      // Mantém o título H2 e adiciona os blocos
      const title = timelineSection.querySelector('h2');
      timelineSection.innerHTML = '';
      if(title) timelineSection.appendChild(title);
      timelineSection.insertAdjacentHTML('beforeend', html);
    }

    // --- ÁREA DE PESQUISA (GRID) ---
    const researchGrid = document.querySelector('.research-grid');
    if (researchGrid) {
        // Limpa a grid original para não duplicar com o HTML estático
        researchGrid.innerHTML = '';

        // 3. INTERESSES (Schema: array de OBJETOS com topicTitle e topicContent)
        if (Array.isArray(data.interests)) {
            // Cria o HTML interno dos tópicos
            const topicsHtml = data.interests.map(item => `
                <h4 style="margin-top: 1rem; color: var(--color-accent);">${item.topicTitle}</h4>
                <p>${item.topicContent}</p>
            `).join('');

            // Cria o card completo
            const interestsCard = `
                <article class="research-item">
                    <h3>Campos de Interesse</h3>
                    <div class="clean-list">
                        ${topicsHtml}
                    </div>
                </article>
            `;
            researchGrid.insertAdjacentHTML('beforeend', interestsCard);
        }

        // 4. ABORDAGEM LITERÁRIA (Schema: array de TEXTOS simples)
        if (Array.isArray(data.literaryApproach)) {
            // Como é array de texto, apenas mapeamos para <p>
            const paragraphs = data.literaryApproach.map(text => `<p>${text}</p>`).join('');
            
            const approachCard = `
                <article class="research-item">
                    <h3>Abordagem Literária</h3>
                    ${paragraphs}
                </article>
            `;
            researchGrid.insertAdjacentHTML('beforeend', approachCard);
        }
    }

    // 5. PARTICIPAÇÃO E ATUAÇÃO (Schema: year, description)
    const activismList = document.querySelector('.bio-recognition .fact-list');
    if (activismList && Array.isArray(data.activism)) {
      activismList.innerHTML = data.activism.map(it => `
        <li><strong>${it.year}:</strong> ${it.description}</li>
      `).join('');
    }

    // 6. COLABORADORES (Schema: collabName, collabRole, collabBio)
    const collabGrid = document.querySelector('.collaborators-grid');
    if (collabGrid && Array.isArray(data.collaborators)) {
      collabGrid.innerHTML = data.collaborators.map(col => `
        <div class="collab-card">
          <span class="collab-role">${col.collabRole}</span>
          <strong class="collab-name">${col.collabName}</strong>
          <p class="collab-desc">${col.collabBio}</p>
        </div>
      `).join('');
    }

  } catch (error) {
    console.error("Erro ao carregar dados:", error);
  }
}

document.addEventListener('DOMContentLoaded', loadAuthorPage);