// 1. Importe os seus arquivos
import livro from './livros' // ou './livro' dependendo de como você nomeou
import categoria from './categoria'
import author from './author'
import autorPage from './autorPage'

// 2. Adicione na lista (array)
export const schemaTypes = [
  livro,
  categoria,
  author,
  autorPage,
]