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
  { id: 'banheiro', label: '🚽 Banheiro', tipo: 'banheiro', texto: 'Precisa ir ao banheiro — pode vir ajudar?' },
  { id: 'trocar', label: '👕 Trocar roupa', tipo: 'outro', texto: 'Precisa trocar de roupa — pode vir?' },
  { id: 'chorando', label: '😢 Chorando', tipo: 'nao_adaptou', texto: 'Está chorando / ainda não se adaptou — pode vir?' },
  { id: 'buscar', label: '🔔 Vir buscar', tipo: 'outro', texto: 'Pode vir buscar a criança, por favor.' },
]
