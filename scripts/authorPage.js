import { createClient } from 'https://esm.sh/@sanity/client'

const client = createClient({
  projectId: '07dzzde3',
  dataset: 'production',
  apiVersion: '2022-03-07',
  useCdn: true,
});

async function loadAuthorPage() {
  // Buscamos o documento do tipo authorPage que criamos no .ts
  const query = `*[_type == "authorPage"][0]{
    name,
    subtitle,
    "imageUrl": authorImage.asset->url,
    mainDescription,
    timeline,
    interests,
    literaryApproach,
    activism,
    collaborators
  }`;

  try {
    const data = await client.fetch(query);
    if (!data) return;

    // 1. PERFIL PRINCIPAL
    if (data.name) document.querySelector('.bio-intro h1').innerText = data.name;
    if (data.subtitle) document.querySelector('.bio-tagline').innerText = data.subtitle;
    if (data.mainDescription) document.querySelector('.bio-intro-text p').innerText = data.mainDescription;
    if (data.imageUrl) document.querySelector('.trajetoria-image-wrapper img').src = data.imageUrl;

    // 2. TRAJETÓRIA (LINHA DO TEMPO)
    const timelineContainer = document.querySelector('.trajetoria-list');
    if (timelineContainer && data.timeline) {
      timelineContainer.innerHTML = data.timeline.map(item => `
        <div class="trajetoria-item">
            <span class="ano">${item.year}</span>
            <p>${item.event}</p>
        </div>
      `).join('');
    }

    // 3. CAMPOS DE INTERESSE (Tópicos simples)
    const interestsContainer = document.querySelector('.interests-grid'); // Ajuste o seletor conforme seu HTML
    if (interestsContainer && data.interests) {
      interestsContainer.innerHTML = data.interests.map(interest => `
        <div class="interest-tag">${interest}</div>
      `).join('');
    }

    // 4. ABORDAGEM LITERÁRIA
    const approachContainer = document.querySelector('.approach-content');
    if (approachContainer && data.literaryApproach) {
      approachContainer.innerHTML = data.literaryApproach.map(item => `
        <div class="approach-item">
            <h3>${item.topicTitle}</h3>
            <p>${item.topicContent}</p>
        </div>
      `).join('');
    }

    // 5. PARTICIPAÇÃO E ATUAÇÃO
    const activismContainer = document.querySelector('.activism-list');
    if (activismContainer && data.activism) {
      activismContainer.innerHTML = data.activism.map(item => `
        <div class="activism-item">
            <span class="date">${item.year}</span>
            <p>${item.description}</p>
        </div>
      `).join('');
    }

    // 6. COLABORADORES
    const collabGrid = document.querySelector('.collab-grid');
    if (collabGrid && data.collaborators) {
      collabGrid.innerHTML = data.collaborators.map(col => `
        <div class="collab-card">
            <span class="collab-role">${col.collabRole}</span>
            <strong class="collab-name">${col.collabName}</strong>
            <p class="collab-desc">${col.collabBio}</p>
        </div>
      `).join('');
    }

  } catch (error) {
    console.error("Erro ao carregar dados da página do autor:", error);
  }
}

document.addEventListener('DOMContentLoaded', loadAuthorPage);