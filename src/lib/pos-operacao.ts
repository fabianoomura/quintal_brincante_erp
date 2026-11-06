// O agendador é `after` do Next: mantém o trabalho vivo após devolver a resposta.
// Não usar promises soltas: a plataforma poderia encerrar a execução.
export function agendarPosOperacao(
  agendar: (callback: () => Promise<void>) => void,
  tarefas: Array<() => Promise<unknown>>,
  falhou: () => void = () => console.error('pos-operacao: falha em tarefa de mensagem; conferir auditoria.'),
): void {
  agendar(async () => {
    for (const tarefa of tarefas) {
      try { await tarefa() }
      catch { falhou() }
    }
  })
}
