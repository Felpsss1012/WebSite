export default {
  name: 'author',
  title: 'Pagina Inicial',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Nome do Autor',
      type: 'string',
      description: 'Nome do autor que aparecerá no site.',
    },
    {
      name: 'subtitle',
      title: 'Subtítulo',
      type: 'string',
      description: 'Subtítulo que aparece abaixo do nome.',
    },
    {
      name: 'backgroundImage',
      title: 'Imagem de Fundo',
      type: 'image',
      description: 'Imagem que ficará como fundo na seção principal.',
      options: {
        hotspot: true, // Permite o ajuste da área de destaque da imagem.
      },
    },
    {
      name: 'authorImage',
      title: 'Foto do Autor',
      type: 'image',
      description: 'Imagem do autor que aparece na seção de trajetória.',
      options: {
        hotspot: true,
      },
    },
    {
      name: 'description',
      title: 'Descrição do Autor',
      type: 'text',
      description: 'Texto da trajetória.',
    },
  ],
};
