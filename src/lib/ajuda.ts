// Textos de ajuda por tela. Um só lugar para manter — o botão "?" do cabeçalho
// (ajuda-button.tsx) pega a explicação da rota atual daqui.

export type Ajuda = { titulo: string; texto: string; dicas?: string[] }

// Chave = prefixo da rota. Casa por prefixo mais longo (sub-rotas herdam a ajuda do pai).
export const AJUDA: Record<string, Ajuda> = {
  '/': {
    titulo: 'Início',
    texto:
      'Ponto de partida. Toque num atalho ou use o menu à esquerda (no celular, o ☰ no canto). Cada tela tem este botão de ajuda no topo.',
  },
  '/presenca': {
    titulo: 'Quem está aqui',
    texto:
      'Mostra quem está no espaço agora e a lotação do dia. É onde se registra entrada e saída das crianças.',
    dicas: [
      'Check-in: marca a entrada e fixa o valor/hora do play daquele horário.',
      'Check-out: calcula o valor do play e gera o lançamento no Financeiro.',
      'A lista de hoje sai automaticamente (quem entrou e ainda não saiu).',
    ],
  },
  '/criancas': {
    titulo: 'Crianças',
    texto:
      'Cadastro completo de cada criança: responsáveis, contatos de emergência, dados de saúde e o consentimento LGPD.',
    dicas: [
      'Filtre por tipo (play, colônia, mensalista) ou busque pelo nome.',
      'A ficha pede documento do responsável (CPF preferencial).',
      'O selo "⚠️ LGPD pendente" lembra de registrar o consentimento.',
    ],
  },
  '/conversas': {
    titulo: 'Conversas',
    texto:
      'Central de atendimento WhatsApp: veja e responda as mensagens dos responsáveis sem sair do sistema. Todo o histórico fica guardado aqui.',
    dicas: [
      'A bolinha verde mostra quantas mensagens não lidas há em cada conversa.',
      'Os avisos automáticos do sistema também aparecem no histórico (marcados como "sistema").',
      '"Não identificado" = número que não bate com nenhum contato do cadastro.',
      'No playground, o botão 💬 do card abre direto a conversa do responsável.',
    ],
  },
  '/playground': {
    titulo: 'Playground',
    texto:
      'Central rápida do play: coloca a criança no play, mostra o cronômetro de cada uma e dispara avisos ao responsável.',
    dicas: [
      'Avisos rápidos: banheiro, trocar roupa, chorando, vir buscar.',
      'Cada aviso vira uma notificação registrada e enviada ao responsável.',
    ],
  },
  '/grade': {
    titulo: 'Grade do play (valores)',
    texto:
      'Planilha de preços do play: o valor/hora em cada dia da semana × horário. É aqui que se ajusta quanto custa o play.',
    dicas: [
      'A cobrança tem piso de 1 hora e é proporcional depois.',
      'Ex.: R$20/h → 40 min = R$20 · 1h15 = R$25.',
      'Feriados têm valor próprio, definido no Calendário.',
    ],
  },
  '/calendario': {
    titulo: 'Feriados',
    texto:
      'Calendário de feriados com valor/hora próprio — dias especiais podem custar diferente do normal.',
    dicas: [
      'O sistema sugere os feriados nacionais do mês para cadastrar num toque.',
      'Feriado sem valor definido usa a grade normal daquele dia.',
    ],
  },
  '/mensagens': {
    titulo: 'Mensagens',
    texto:
      'Os textos das mensagens de WhatsApp (avisos rápidos do play + mensagens do sistema) e o status de aprovação de cada template na Meta.',
    dicas: [
      'Edite aqui o texto que a equipe dispara no Playground.',
      'Marque "Aprovado" conforme a Meta liberar cada template.',
    ],
  },
  '/mensalistas': {
    titulo: 'Mensalistas',
    texto:
      'Crianças com plano mensal. Faz a matrícula num plano e controla os dias combinados na semana.',
    dicas: [
      'Dá para repor dias perdidos (viagem, falta) em outra data.',
      'Irmãos (mesmo responsável) ganham desconto automático.',
    ],
  },
  '/planos': {
    titulo: 'Planos',
    texto:
      'Cadastro dos planos de mensalidade por frequência (ex.: 2x, 3x na semana) e seus valores. Os mensalistas se matriculam nesses planos.',
  },
  '/colonias': {
    titulo: 'Colônia de férias',
    texto:
      'Crie e edite colônias (período, valor e vagas) e inscreva as crianças. Cada inscrição gera o lançamento no Financeiro.',
    dicas: [
      'Mudar o valor vale para novas inscrições; quem já entrou mantém o valor.',
      'Irmão inscrito na mesma colônia ganha desconto automático.',
    ],
  },
  '/financeiro': {
    titulo: 'Financeiro',
    texto:
      'Todos os lançamentos (play, mensalidade, colônia, diária). É onde se dá baixa quando o pagamento entra.',
    dicas: [
      'Na baixa você escolhe a forma de recebimento e pode aplicar desconto.',
      'Os cards separam o total por modalidade de recebimento.',
      'Dá para exportar a conciliação de um período em CSV.',
    ],
  },
  '/faturamento': {
    titulo: 'Faturamento',
    texto:
      'Visão da receita dividida por operação (play, mensalistas, colônia…) e por mês. Serve para acompanhar quanto cada frente rendeu.',
  },
  '/gerencial': {
    titulo: 'Gerencial',
    texto:
      'Painel do dono (admin): indicadores do dia e ações de gestão, como gerar as mensalidades do mês.',
  },
  '/ambientes': {
    titulo: 'Ambientes',
    texto:
      'Cadastro de salas/espaços, caso você controle ambientes distintos. É opcional — deixe vazio se usa um espaço só.',
  },
  '/colaboradores': {
    titulo: 'Colaboradores',
    texto:
      'A equipe que usa o sistema. Cadastre pessoas e defina o papel de acesso.',
    dicas: [
      'Admin vê e mexe em tudo (valores, gestão, configurações).',
      'Operador vê só o operacional (presença, crianças, play).',
    ],
  },
  '/configuracoes': {
    titulo: 'Configurações',
    texto:
      'Ajustes do sistema — as regras ficam aqui, nunca no código.',
    dicas: [
      'Capacidade do dia e antecedência do aviso de tempo.',
      'Descontos: por irmão e na baixa (liga/desliga).',
      'Conciliação automática do pagamento (fica desligada por padrão).',
    ],
  },
  '/kiosk': {
    titulo: 'Modo quiosque',
    texto:
      'Tela cheia e simples do play para o tablet da recepção. Fixe esta aba no tablet do play.',
  },
}

// Acha a ajuda da rota: casa por prefixo mais longo (sub-rotas herdam do pai).
export function ajudaDaRota(path: string): Ajuda | null {
  if (path === '/') return AJUDA['/']
  let melhor: string | null = null
  for (const key of Object.keys(AJUDA)) {
    if (key === '/') continue
    if (path === key || path.startsWith(key + '/')) {
      if (!melhor || key.length > melhor.length) melhor = key
    }
  }
  return melhor ? AJUDA[melhor] : null
}
