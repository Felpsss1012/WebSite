import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'livro',
  title: 'Livros (Obras)',
  type: 'document',
  fields: [
    defineField({ name: 'titulo', title: 'Título', type: 'string', validation: Rule => Rule.required() }),
    defineField({ name: 'slug', title: 'URL Amigável (Slug)', type: 'slug', options: { source: 'titulo' } }),
    defineField({
      name: 'status',
      title: 'Status de Publicação',
      type: 'string',
      options: { list: ['Rascunho', 'Em Revisão', 'Publicado'] },
      initialValue: 'Rascunho'
    }),
    defineField({ name: 'capa', title: 'Capa do Livro', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'sinopse', title: 'Sinopse', type: 'text' }),
    defineField({ name: 'linkAmazon', title: 'Link Amazon', type: 'url' }),
    defineField({
      name: 'capitulos',
      title: 'Capítulos',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'nome', title: 'Nome do Capítulo', type: 'string' },
          { name: 'conteudo', title: 'Conteúdo/Preview', type: 'text' },
          { name: 'disponivel', title: 'Publicado?', type: 'boolean' }
        ]
      }]
    })
  ]
})