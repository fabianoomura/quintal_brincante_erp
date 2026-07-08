import type { Database } from '@/lib/database.types'

type TipoOcorrencia = Database['public']['Enums']['tipo_ocorrencia']

// Avisos prontos de 1 toque, focados no play. Pela regra do quintal, a equipe NÃO leva a
// criança ao banheiro nem troca de roupa — então avisa o responsável para vir. Também cobre
// choro / não adaptação e "pode vir buscar".
export type AvisoRapido = {
  id: string
  label: string
  tipo: TipoOcorrencia
  texto: string
}

export const AVISOS_RAPIDOS: AvisoRapido[] = [
  { id: 'banheiro', label: '🚽 Banheiro', tipo: 'banheiro', texto: 'A criança pediu para ir ao banheiro. Pode vir ajudar, por favor?' },
  { id: 'trocar', label: '👕 Trocar roupa', tipo: 'outro', texto: 'A criança precisa trocar de roupa. Pode vir ao espaço, por favor?' },
  { id: 'chorando', label: '😢 Chorando', tipo: 'nao_adaptou', texto: 'A criança está chorando e precisando de você por aqui. Pode vir ao espaço?' },
  { id: 'buscar', label: '🔔 Vir buscar', tipo: 'outro', texto: 'Pode vir buscar a criança, por favor? Estamos aguardando por aqui.' },
]
