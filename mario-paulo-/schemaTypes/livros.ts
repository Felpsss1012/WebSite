import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'livro',
  title: 'Livros',
  type: 'document',
  // Organização visual em abas no painel
  groups: [
    { name: 'principal', title: 'Principal', default: true },
    { name: 'editorial', title: 'Dados Editoriais' },
    { name: 'conteudo', title: 'Conteúdo' },
    { name: 'sistema', title: 'Configurações' },
  ],
  fields: [
    /* --- BLOCO PRINCIPAL --- */
    defineField({
      name: 'titulo',
      title: 'Título da Obra',
      type: 'string',
      validation: Rule => Rule.required(),
      group: 'principal'
    }),
    defineField({
      name: 'destaque',
      title: 'Destaque na Home?',
      description: 'Marque se este livro deve aparecer no banner principal ou topo da lista.',
      type: 'boolean',
      initialValue: false,
      group: 'principal'
    }),
    defineField({
      name: 'capa',
      title: 'Capa do Livro',
      type: 'image',
      options: { hotspot: true },
      group: 'principal'
    }),

    /* --- NOVO: CATEGORIAS --- */
    defineField({
      name: 'categorias',
      title: 'Gêneros / Categorias',
      description: 'Ex: Romance, Ensaio, Poesia. (Crie as categorias no menu lateral antes de selecionar)',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'categoria' }] }], // Referência ao schema auxiliar
      group: 'principal'
    }),

    /* --- BLOCO EDITORIAL --- */
    defineField({
      name: 'dataLancamento',
      title: 'Data de Lançamento',
      type: 'date',
      options: { dateFormat: 'DD/MM/YYYY' },
      group: 'editorial'
    }),
    defineField({
      name: 'idioma',
      title: 'Idioma da Obra',
      type: 'string',
      options: {
        list: [
          { title: 'Português (Brasil)', value: 'pt-BR' },
          { title: 'Inglês (EUA)', value: 'en-US' },
          { title: 'Espanhol', value: 'es-ES' }
        ]
      },
      initialValue: 'pt-BR',
      group: 'editorial'
    }),
    defineField({
      name: 'infoEditorial',
      title: 'Ficha Técnica',
      type: 'object',
      group: 'editorial',
      options: { collapsible: true, collapsed: true }, // Esconde por padrão para limpar a tela
      fields: [
        { name: 'isbn', title: 'ISBN', type: 'string' },
        { name: 'edicao', title: 'Edição', type: 'string', description: 'Ex: 1ª Edição' },
        { name: 'paginas', title: 'Número de Páginas', type: 'number' }
      ]
    }),

    /* --- BLOCO DE CONTEÚDO --- */
    defineField({
      name: 'preview',
      title: 'Preview Editorial (Curto)',
      description: 'Texto curto para cards e SEO (Máx 200 caracteres).',
      type: 'text',
      rows: 3,
      validation: Rule => Rule.max(200).warning('Textos muito longos podem ser cortados nos cards.'),
      group: 'conteudo'
    }),
    defineField({
      name: 'sinopse',
      title: 'Sinopse Completa',
      type: 'text',
      rows: 10,
      group: 'conteudo'
    }),
    defineField({
      name: 'arquivoPDF',
      title: 'Livro em PDF (Leitura Online)',
      description: 'Upload do livro completo em PDF. Só será exibido se "Leitura Gratuita" estiver ativa.',
      type: 'file',
      options: {
        accept: 'application/pdf'
      },
      group: 'conteudo'
    }),
    defineField({
      name: 'capitulos',
      title: 'Capítulos',
      type: 'array',
      group: 'conteudo',
      hidden: ({ document }) => !!document?.arquivoPDF,
      of: [{
        type: 'object',
        // Visualização do item na lista
        preview: {
          select: {
            title: 'nome',
            ordem: 'ordem',
            publicado: 'disponivel'
          },
          prepare({ title, ordem, publicado }) {
            return {
              title: `${ordem ? ordem + '. ' : ''}${title}`,
              subtitle: publicado ? '🟢 Disponível' : '🔒 Bloqueado'
            }
          }
        },
        fields: [
          {
            name: 'ordem',
            title: 'Ordem Numérica',
            type: 'number',
            description: 'Use para forçar a ordenação (1, 2, 3...)'
          },
          { name: 'nome', title: 'Título do Capítulo', type: 'string' },
          { name: 'conteudo', title: 'Conteúdo do Capítulo', type: 'text' }, // Mantenha text ou mude para blockContent se quiser rich text
          {
            name: 'disponivel',
            title: 'Disponível para Leitura Online?',
            type: 'boolean',
            initialValue: false
          }
        ]
      }]
    }),

    /* --- BLOCO DE SISTEMA E LINKS --- */
    defineField({
      name: 'slug',
      title: 'Slug (URL)',
      type: 'slug',
      options: { source: 'titulo', maxLength: 96 },
      validation: Rule => Rule.required(),
      group: 'sistema'
    }),
    defineField({
      name: 'linkAmazon',
      title: 'Link para Compra (Amazon)',
      type: 'url',
      group: 'sistema'
    }),
    defineField({
      name: 'gratuito',
      title: 'Leitura Gratuita?',
      description: 'Se ativo, o livro poderá ser lido online (capítulos ou PDF).',
      type: 'boolean',
      initialValue: false,
      group: 'sistema'
    }),
    defineField({
      name: 'visivel',
      title: 'Visível no Site?',
      description: 'Desative para esconder o livro do site sem excluí-lo do banco de dados.',
      type: 'boolean',
      initialValue: true,
      group: 'sistema'
    })
  ],
  // Configuração de como o card do livro aparece na lista geral do Sanity
  preview: {
    select: {
      title: 'titulo',
      subtitle: 'dataLancamento',
      media: 'capa',
      visivel: 'visivel'
    },
    prepare(selection) {
      const { title, subtitle, media, visivel } = selection
      const isHidden = visivel === false

      return {
        title: title,
        subtitle: `${subtitle ? subtitle.split('-')[0] : 'S/ Data'} ${isHidden ? '(Oculto)' : ''}`,
        media
      }
    }
  }
})