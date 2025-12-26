// Importamos o cliente diretamente de uma URL (CDN) compatível com navegadores
import { createClient } from 'https://esm.sh/@sanity/client'

// Configuração do cliente Sanity
const sanityClient = createClient({
  projectId: '07dzzde3', // Verifique se este é o SEU ID real do projeto
  dataset: 'production',
  apiVersion: '2022-03-07',
  useCdn: true, // true é mais rápido para leitura pública
});

// Função para buscar dados
async function getAuthorData() {
  const query = `*[_type == "author"][0]{
    name,
    subtitle,
    backgroundImage{
      asset->{
        url
      }
    },
    authorImage{
      asset->{
        url
      }
    },
    description
  }`;

  try {
    const authorData = await sanityClient.fetch(query);
    return authorData;
  } catch (error) {
    console.error("Erro ao buscar dados do Sanity:", error);
    return null;
  }
}

// Execução ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
  const authorData = await getAuthorData();

  if (!authorData) return; // Se não houver dados, para aqui

  // Selecionando elementos
  const titleElement = document.querySelector('h1');
  const subtitleElement = document.querySelector('.description');
  const heroSection = document.querySelector('.hero'); // Para o background
  const authorImageElement = document.querySelector('.trajetoria-image-wrapper img');
  
  // ATENÇÃO: O querySelector pega apenas o PRIMEIRO parágrafo que encontrar.
  // Se quiser substituir todo o texto, talvez precise selecionar a div pai (.trajetoria-text)
  const descriptionElement = document.querySelector('.trajetoria-text p');

  // Atualizando o DOM
  if (titleElement && authorData.name) {
    // Nota: Isso vai remover o <em> do HTML original. 
    // Se quiser manter o itálico, precisaria tratar o texto ou usar innerHTML com tags.
    titleElement.innerText = authorData.name; 
  }

  if (subtitleElement && authorData.subtitle) {
    subtitleElement.innerText = authorData.subtitle;
  }

  if (descriptionElement && authorData.description) {
    descriptionElement.innerText = authorData.description;
  }

  // Atualizar Background da Hero Section
  if (heroSection && authorData.backgroundImage?.asset?.url) {
    // Importante: Assegure-se que o CSS da classe .hero aceite background-image
    heroSection.style.backgroundImage = `url('${authorData.backgroundImage.asset.url}')`;
    heroSection.style.backgroundSize = 'cover'; // Garante que a imagem cubra tudo
    heroSection.style.backgroundPosition = 'center';
  }

  // Atualizar Foto do Autor
  if (authorImageElement && authorData.authorImage?.asset?.url) {
    authorImageElement.src = authorData.authorImage.asset.url;
    authorImageElement.alt = authorData.name || "Foto do Autor";
  }
});