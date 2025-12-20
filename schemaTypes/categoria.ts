// Caminho: schemaTypes/categoria.ts
import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'categoria',
  title: 'Categorias / Gêneros',
  type: 'document',
  fields: [
    defineField({
      name: 'titulo',
      title: 'Nome da Categoria',
      type: 'string',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'descricao',
      title: 'Descrição',
      type: 'text',
      rows: 3
    })
  ]
})