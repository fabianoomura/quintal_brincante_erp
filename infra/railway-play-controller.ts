// Railway Function (Bun): arquivo único, sem imports locais e sem estado em disco.
// Redis permanece ligado. Somente deploymentStop/deploymentRedeploy são permitidos.
export type Snapshot = {
  enabled: boolean
  revision: number
  idle_seconds: number
  blockers: number
  margin_seconds: number
}
type Deployment = { id: string; status: string }
type Message = { para: string; conteudo: string; enquete?: { opcoes: string[] } }
export interface ControlIO {
  state(action: 'claim' | 'check' | 'touch' | 'release', owner: string): Promise<Snapshot | null>
  latest(service: string): Promise<Deployment>
  start(id: string): Promise<void>
  stop(id: string): Promise<void>
  connected(): Promise<boolean>
  send(message: Message): Promise<{ ok: true; providerMsgId: string }>
  pause(): Promise<void>
  now(): number
}
const TERMINAL = new Set(['REMOVED', 'STOPPED', 'FAILED', 'CRASHED', 'SKIPPED'])
const STARTING = new Set(['WAITING', 'QUEUED', 'INITIALIZING', 'BUILDING', 'DEPLOYING', 'SLEEPING'])

export class PlayController {
  constructor(private io: ControlIO, private postgres: string, private evolution: string) {}

  async run(action: 'wake' | 'tick' | 'send', message?: Message) {
    const owner = crypto.randomUUID()
    const deadline = this.io.now() + 150_000
    let claimed: Snapshot | null = null
    while (!(claimed = await this.io.state('claim', owner))) {
      if (this.io.now() > deadline - 110_000) throw new Error('Controle ocupado; tente novamente.')
      await this.io.pause()
    }
    const checkDeadline = () => {
      if (this.io.now() > deadline) throw new Error('Tempo limite ao aguardar os serviços.')
    }
    const state = async (action: 'check' | 'touch' = 'check') => {
      checkDeadline()
      const result = await this.io.state(action, owner)
      if (!result) throw new Error('Lock do controle perdido; operação interrompida.')
      return result
    }
    const readyService = async (service: string) => {
      let deployment = await this.io.latest(service)
      const original = deployment.id
      const restarting = TERMINAL.has(deployment.status) || deployment.status === 'SLEEPING'
      if (restarting) {
        await this.io.start(deployment.id)
        await this.io.pause()
      }
      else if (deployment.status !== 'SUCCESS' && !STARTING.has(deployment.status)) {
        throw new Error('Estado de deployment desconhecido; nenhuma alteração realizada.')
      }
      do {
        checkDeadline()
        deployment = await this.io.latest(service)
        if (deployment.status === 'SUCCESS') return
        if (TERMINAL.has(deployment.status) && (!restarting || deployment.id !== original)) {
          throw new Error('Falha ao iniciar serviço.')
        }
        await this.io.pause()
      } while (true)
    }
    const ready = async () => {
      await state('touch')
      await readyService(this.postgres)
      await readyService(this.evolution)
      while (!(await this.io.connected())) {
        checkDeadline()
        await this.io.pause()
      }
    }
    try {
      if (!claimed.enabled) return { skipped: 'disabled' }
      if (action === 'wake' || action === 'send') {
        await ready()
        if (action === 'send') {
          if (!message) throw new Error('Mensagem ausente.')
          // Lock distribuído cobre o envio inteiro: tick nunca interrompe um envio.
          try { return await this.io.send(message) }
          finally { await state('touch') }
        }
        return { ready: true }
      }
      const initial = await state()
      if (initial.blockers > 0) {
        await ready()
        return { skipped: 'busy' }
      }
      if (initial.idle_seconds < initial.margin_seconds) return { skipped: 'margin' }
      // A leitura de presença é refeita antes/depois de cada parada. Um check-in
      // que chega durante a chamada Railway causa compensação e aguarda /wake.
      for (const service of [this.evolution, this.postgres]) {
        const current = await state()
        if (!current.enabled || current.blockers > 0 || current.revision !== initial.revision) {
          await ready()
          return { skipped: 'new_activity' }
        }
        let deployment = await this.io.latest(service)
        if (deployment.status === 'SUCCESS') {
          await this.io.stop(deployment.id)
          do {
            await this.io.pause()
            checkDeadline()
            deployment = await this.io.latest(service)
          } while (!TERMINAL.has(deployment.status))
        } else if (!TERMINAL.has(deployment.status)) {
          return { skipped: 'deployment_in_progress' }
        }
      }
      const final = await state()
      if (final.blockers > 0 || final.revision !== initial.revision || !final.enabled) {
        await ready()
        return { skipped: 'new_activity' }
      }
      return { stopped: true }
    } finally {
      await this.io.state('release', owner)
    }
  }
}

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Variável ausente: ${name}`)
  return value
}

// Cada requisição tem prazo total menor que o lease SQL (240s). Uma instância
// antiga não pode continuar operando depois de outra assumir o controle.
export function productionIO(signal: AbortSignal): ControlIO {
  const json = async (url: string, init: RequestInit) => {
    const response = await fetch(url, {
      ...init, signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
    })
    if (!response.ok) throw new Error(`Serviço remoto respondeu HTTP ${response.status}`)
    return response.json()
  }
  const railway = async (query: string, variables: Record<string, unknown>) => {
    const result = await json('https://backboard.railway.com/graphql/v2', {
      method: 'POST', headers: {
        'Content-Type': 'application/json',
        'Project-Access-Token': required('RAILWAY_PROJECT_TOKEN'),
      }, body: JSON.stringify({ query, variables }),
    })
    if (result.errors?.length || !result.data) throw new Error('Railway recusou a operação GraphQL.')
    return result.data
  }
  const evolution = (path: string, init: RequestInit = {}) => json(
    `${required('EVOLUTION_URL').replace(/\/$/, '')}/${path}/${encodeURIComponent(required('EVOLUTION_INSTANCE'))}`,
    { ...init, headers: { apikey: required('EVOLUTION_API_KEY'), 'Content-Type': 'application/json' } },
  )
  return {
    now: Date.now,
    pause: () => new Promise(resolve => setTimeout(resolve, 2000)),
    async state(action, owner) {
      return json(`${required('SUPABASE_URL')}/rest/v1/rpc/railway_play_control`, {
        method: 'POST', headers: {
          apikey: required('SUPABASE_SERVICE_ROLE_KEY'),
          Authorization: `Bearer ${required('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        }, body: JSON.stringify({ p_action: action, p_owner: owner }),
      })
    },
    async latest(service) {
      const data = await railway(`query($input: DeploymentListInput!) {
        deployments(input: $input, first: 1) { edges { node { id status } } }
      }`, { input: {
        projectId: required('TARGET_PROJECT_ID'), environmentId: required('TARGET_ENVIRONMENT_ID'), serviceId: service,
      } })
      const deployment = data.deployments?.edges?.[0]?.node
      if (!deployment) throw new Error('Serviço sem deployment; intervenção necessária.')
      return deployment
    },
    async start(id) {
      await railway('mutation($id: String!) { deploymentRedeploy(id: $id) { id status } }', { id })
    },
    async stop(id) {
      await railway('mutation($id: String!) { deploymentStop(id: $id) }', { id })
    },
    async connected() {
      try { return (await evolution('instance/connectionState')).instance?.state === 'open' }
      catch { signal.throwIfAborted(); return false }
    },
    async send(message) {
      const body = message.enquete
        ? { number: message.para.replace(/\D/g, ''), name: message.conteudo, selectableCount: 1, values: message.enquete.opcoes }
        : { number: message.para.replace(/\D/g, ''), text: message.conteudo }
      const result = await evolution(`message/${message.enquete ? 'sendPoll' : 'sendText'}`, {
        method: 'POST', body: JSON.stringify(body),
      })
      if (!result.key?.id) throw new Error('Evolution não confirmou o envio com id.')
      return { ok: true, providerMsgId: result.key.id }
    },
  }
}

export async function handle(request: Request) {
  const path = new URL(request.url).pathname
  if (request.method === 'GET' && path === '/health') return Response.json({ ok: true })
  const secret = process.env.PLAY_CONTROL_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ erro: 'não autorizado' }, { status: 401 })
  }
  if (request.method !== 'POST' || !['/wake', '/tick', '/send'].includes(path)) {
    return Response.json({ erro: 'rota inválida' }, { status: 404 })
  }
  try {
    const action = path.slice(1) as 'wake' | 'tick' | 'send'
    let message: Message | undefined
    if (action === 'send') {
      if (Number(request.headers.get('content-length')) > 32_768) {
        return Response.json({ erro: 'mensagem muito grande' }, { status: 413 })
      }
      message = await request.json()
      if (!message || typeof message.para !== 'string' || !message.para.replace(/\D/g, '') ||
        typeof message.conteudo !== 'string' || message.conteudo.length > 16_000 ||
        (message.enquete && (!Array.isArray(message.enquete.opcoes) ||
          !message.enquete.opcoes.every(value => typeof value === 'string')))) {
        return Response.json({ erro: 'mensagem inválida' }, { status: 400 })
      }
    }
    const controller = new PlayController(productionIO(AbortSignal.timeout(170_000)),
      required('POSTGRES_SERVICE_ID'), required('EVOLUTION_SERVICE_ID'))
    const result = await controller.run(action, message)
    // Nunca sinalizar sucesso ao ERP se o controle não enviou de verdade.
    return Response.json(result, { status: action === 'send' && !('ok' in result) ? 503 : 200 })
  } catch {
    console.error('play-control: operação interrompida; conferir serviços e configuração.')
    return Response.json({ ok: false, erro: 'Controle indisponível; envio não confirmado.' }, { status: 503 })
  }
}

const server = { port: Number(process.env.PORT ?? 8080), idleTimeout: 255, fetch: handle }
export default server
