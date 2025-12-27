# 📚 Mario Paulo Martins - Plataforma Literária

![Status do Projeto](https://img.shields.io/badge/Status-Em_Desenvolvimento-yellow)
![Tech Stack](https://img.shields.io/badge/Tech-HTML%20%7C%20CSS%20%7C%20JS%20%7C%20Sanity-blue)

## 📖 Sobre o Projeto

Este é o site oficial e portfólio digital do escritor e professor **Mario Paulo Martins**. O projeto vai além de um site estático comum; trata-se de uma **Single Page Application (SPA) híbrida** focada na experiência de leitura e na disseminação de obras sobre ecologia, educação e combate à fome.

A plataforma serve como um **hub centralizador** onde o autor pode publicar livros, gerenciar sua biografia e permitir que leitores leiam trechos ou obras completas diretamente no navegador.

---

## 🚀 Funcionalidades Principais

### 1. Catálogo Dinâmico (`obras-galeria.html`)
* **Integração com CMS:** Todo o conteúdo (livros, capas, sinopses) é puxado dinamicamente do **Sanity.io**.
* **Filtros Inteligentes:** O usuário pode filtrar obras por **Ano de Lançamento** e **Categoria** (ex: Ecologia, Romance, Educativo).
* **Busca em Tempo Real:** Barra de pesquisa com função *debounce* para filtrar títulos instantaneamente.
* **Deep Linking:** As URLs são atualizadas conforme os filtros mudam (ex: `?category=ecologia`), permitindo compartilhar links de buscas específicas.

### 2. Leitor Imersivo (`leitura.html`)
* **Visualizador de PDF Integrado:** Utiliza a biblioteca `PDF.js` para renderizar livros diretamente no navegador, sem necessidade de download externo.
* **Navegação por Capítulos:** Menu lateral para navegar entre capítulos (se a obra for estruturada em texto/HTML) ou paginação (se for PDF).
* **Proteção de Conteúdo:** Suporte para capítulos bloqueados (ícone 🔒) para incentivar a compra da obra completa.
* **Links de Compra:** Integração direta com links da Amazon para conversão de vendas.

### 3. Sistema de Avaliações (Reviews)
* **Feedback do Usuário:** Permite que leitores atribuam notas (1-5 estrelas) e deixem comentários nas obras.
* **Armazenamento Local:** Atualmente, o sistema utiliza `localStorage` para persistir as avaliações no dispositivo do usuário (veja *Roadmap* para expansão).

### 4. Página do Autor e Biografia (`autor.html`)
* **Linha do Tempo:** Exibição cronológica da trajetória profissional e acadêmica do autor.
* **Gestão de Conteúdo:** A biografia, foto e colaboradores são gerenciados via CMS, permitindo atualizações sem mexer no código.

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Função |
| :--- | :--- |
| **HTML5 & CSS3** | Estrutura semântica e estilização (uso intensivo de CSS Grid/Flexbox e Variáveis CSS). |
| **Vanilla JavaScript (ES6+)** | Lógica de frontend, manipulação do DOM e requisições assíncronas. |
| **Sanity.io** | **Headless CMS** (Backend). Armazena todos os dados dos livros, autor e configurações. |
| **PDF.js** | Biblioteca da Mozilla para renderização de arquivos PDF em Canvas HTML5. |
| **Intersection Observer API** | Utilizado para animações de "Reveal" (aparecer ao rolar a página). |

---

## 📂 Estrutura do Projeto

```text
/
├── index.html            # Página Inicial (Hero, Slider, Resumo)
├── leitura.html          # Interface de Leitura (Reader App)
├── html/
│   ├── autor.html        # Biografia completa
│   └── obras-galeria.html # Catálogo com filtros e busca
├── style/
│   ├── style.css         # Estilos globais e componentes
│   └── leitura.css       # Estilos específicos do leitor de PDF
├── scripts/
│   ├── script.js         # Lógica principal (Catálogo, Slider, Modal)
│   ├── leitura.js        # Lógica do Leitor (PDF render, capítulos)
│   ├── author.js         # Fetch de dados da Home
│   └── authorPage.js     # Fetch de dados da Biografia
└── data/
    └── obras.json        # Fallback de dados (caso a API falhe)

npx sanity deploy