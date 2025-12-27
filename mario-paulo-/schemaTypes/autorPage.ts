export default {
  name: 'authorPage',
  title: 'Página Sobre o Autor',
  type: 'document',
  // Definição das Abas (Grupos) para organizar o gerenciador
  groups: [
    { name: 'perfil', title: 'Perfil Principal' },
    { name: 'trajetoria', title: 'Linha do Tempo' },
    { name: 'abordagem', title: 'Abordagem Literária' },
    { name: 'atuacao', title: 'Participação/Atuação' },
    { name: 'colaboradores', title: 'Colaboradores' },
    { name: 'declaracao', title: 'Frases Motivacionais' },
  ],
  fields: [
    /* --- ABA: PERFIL PRINCIPAL --- */
    {
      name: 'name',
      title: 'Nome do Autor',
      type: 'string',
      group: 'perfil',
    },
    {
      name: 'subtitle',
      title: 'Subtítulo',
      type: 'string',
      group: 'perfil',
    },
    {
      name: 'authorImage',
      title: 'Foto do Autor',
      type: 'image',
      group: 'perfil',
      options: { hotspot: true },
    },
    {
      name: 'mainDescription',
      title: 'Descrição Principal',
      type: 'text',
      rows: 5,
      group: 'perfil',
    },

    /* --- ABA: LINHA DO TEMPO (TRAJETÓRIA) --- */
    {
      name: 'timeline',
      title: 'Trajetória (Ano a Ano)',
      type: 'array',
      group: 'trajetoria',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'year', title: 'Ano', type: 'string' },
            { name: 'event', title: 'Informação da Trajetória', type: 'text', rows: 3 },
          ],
          preview: {
            select: { title: 'year', subtitle: 'event' }
          }
        }
      ]
    },

    /* --- ABA: ABORDAGEM E INTERESSES --- */
    {
      name: 'interests',
      title: 'Campos de Interesse',
      description: 'Adicione os tópicos de interesse individualmente',
      type: 'array',
      group: 'abordagem',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'topicTitle', title: 'Título do Tópico', type: 'string' },
            { name: 'topicContent', title: 'Descrição do Tópico', type: 'text', rows: 3 },
          ]
        }
      ]
    },
    {
      name: 'literaryApproach',
      title: 'Abordagem Literária',
      type: 'array',
      group: 'abordagem',
      of: [{ type: 'text' }],
    },

    /* --- ABA: PARTICIPAÇÃO E ATUAÇÃO --- */
    {
      name: 'activism',
      title: 'Participação e Atuação Social',
      type: 'array',
      group: 'atuacao',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'year', title: 'Ano ou Período', type: 'string' },
            { name: 'description', title: 'Descrição da Atuação', type: 'text' },
          ],
          preview: {
            select: { title: 'year', subtitle: 'description' }
          }
        }
      ]
    },

    /* --- ABA: COLABORADORES --- */
    {
      name: 'collaborators',
      title: 'Lista de Colaboradores',
      type: 'array',
      group: 'colaboradores',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'collabName', title: 'Nome do Colaborador', type: 'string' },
            { name: 'collabRole', title: 'O que colaborou (Cargo)', type: 'string' },
            { name: 'collabBio', title: 'Descrição do Trabalho', type: 'text', rows: 3 },
          ],
          preview: {
            select: { title: 'collabName', subtitle: 'collabRole' }
          }
        }
      ]
    },
    {
      name: 'motivationalQuotes',
      title: 'Frases Motivacionais',
      type: 'text',
      group: 'declaracao',
    },
  ]
}