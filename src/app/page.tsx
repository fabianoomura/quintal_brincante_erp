import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Image from 'next/image'
import Link from 'next/link'
import styles from './home.module.css'

const title = 'Quintal Brincante | ERP da operação'
const description =
  'A operação da escolinha, colônia, Play e gestão reunida em um ERP feito para o ritmo do Quintal Brincante.'

export async function generateMetadata(): Promise<Metadata> {
  const incomingHeaders = await headers()
  const host =
    incomingHeaders.get('x-forwarded-host')?.split(',')[0].trim() ??
    incomingHeaders.get('host') ??
    'localhost:6006'
  const protocol =
    incomingHeaders.get('x-forwarded-proto')?.split(',')[0].trim() ??
    (host.startsWith('localhost') ? 'http' : 'https')
  const ogImage = new URL('/og.png', `${protocol}://${host}`).toString()

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: 'Quintal Brincante — ERP da operação' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

const MODULOS = [
  {
    icon: '🎠',
    color: 'fuchsia',
    title: 'Play em tempo real',
    text: 'Entrada rápida, lotação, fila de espera, cronômetro, pausas, avisos e check-out no mesmo fluxo.',
  },
  {
    icon: '🌈',
    color: 'sky',
    title: 'Escolinha e mensalistas',
    text: 'Planos, matrículas, frequência combinada e reposições organizadas por criança.',
  },
  {
    icon: '🏕️',
    color: 'amber',
    title: 'Colônias de férias',
    text: 'Edições, vagas, inscrições e cobranças conectadas à rotina financeira.',
  },
  {
    icon: '💬',
    color: 'emerald',
    title: 'Comunicação integrada',
    text: 'Avisos automáticos, mensagens rápidas e conversas com responsáveis pelo WhatsApp.',
  },
  {
    icon: '💰',
    color: 'violet',
    title: 'Financeiro conectado',
    text: 'Recebimentos, pendências, descontos e faturamento ligados à operação que os gerou.',
  },
  {
    icon: '🧒',
    color: 'rose',
    title: 'Cadastro que acompanha',
    text: 'Crianças, responsáveis, saúde, documentos e autorização de imagem em uma ficha única.',
  },
] as const

const JORNADA = [
  ['01', 'Chegada', 'A equipe encontra ou cadastra a criança e registra a entrada.'],
  ['02', 'Acompanhamento', 'Tempo, lotação e necessidades ficam visíveis durante a permanência.'],
  ['03', 'Comunicação', 'Avisos importantes chegam ao responsável e ficam registrados.'],
  ['04', 'Saída', 'O check-out calcula o período, registra o recebimento e fecha a operação.'],
] as const

export default function HomePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.nav}>
          <a href="#inicio" className={styles.brand} aria-label="Quintal Brincante, início">
            <Image src="/icon-192.png" alt="" width={42} height={42} priority />
            <span>
              <strong>Quintal Brincante</strong>
              <small>ERP da operação</small>
            </span>
          </a>

          <nav className={styles.links} aria-label="Navegação principal">
            <a href="#plataforma">Plataforma</a>
            <a href="#operacao">Como funciona</a>
            <a href="#perfis">Para a equipe</a>
          </nav>

          <Link href="/login" className={styles.loginButton}>
            Entrar no sistema <span aria-hidden="true">→</span>
          </Link>
        </div>
      </header>

      <section id="inicio" className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroContent}>
          <div className={styles.eyebrow}>
            <span aria-hidden="true">●</span> A operação inteira no mesmo lugar
          </div>
          <h1>
            Mais tempo para cuidar.
            <span> Menos esforço para organizar.</span>
          </h1>
          <p className={styles.heroText}>
            Um ERP feito para o ritmo real de escolinhas, colônias de férias e Play:
            da chegada da criança ao fechamento financeiro do dia.
          </p>
          <div className={styles.heroActions}>
            <Link href="/login" className={styles.primaryButton}>
              Acessar o ERP <span aria-hidden="true">→</span>
            </Link>
            <a href="#plataforma" className={styles.secondaryButton}>
              Conhecer a operação
            </a>
          </div>
          <div className={styles.trustLine}>
            <span>✓ Acesso por perfil</span>
            <span>✓ Dados protegidos</span>
            <span>✓ Rotina integrada</span>
          </div>
        </div>

        <div className={styles.demoWrap} aria-label="Demonstração conceitual do ERP">
          <div className={styles.demoBadge}>Demonstração da plataforma</div>
          <div className={styles.demo}>
            <aside className={styles.demoSidebar}>
              <div className={styles.demoLogo}>🌳</div>
              <span className={styles.demoNavActive}>🎠</span>
              <span>📋</span>
              <span>💬</span>
              <span>💰</span>
            </aside>
            <div className={styles.demoMain}>
              <div className={styles.demoTop}>
                <div>
                  <small>OPERAÇÃO</small>
                  <strong>Play agora</strong>
                </div>
                <span className={styles.live}><i /> Em andamento</span>
              </div>
              <div className={styles.demoStats}>
                <div><span>👧</span><small>Presentes</small><strong>Acompanhando</strong></div>
                <div><span>⏱️</span><small>Próxima ação</small><strong>No tempo certo</strong></div>
                <div><span>💬</span><small>Comunicação</small><strong>Conectada</strong></div>
              </div>
              <div className={styles.demoBody}>
                <div className={styles.sessionCard}>
                  <div className={styles.sessionHead}>
                    <span className={styles.avatar}>🧒</span>
                    <div><strong>Sessão no Play</strong><small>Tempo acompanhado ao vivo</small></div>
                    <span className={styles.status}>Tudo certo</span>
                  </div>
                  <div className={styles.progress}><i /></div>
                  <div className={styles.sessionActions}>
                    <span>⏸ Pausar</span><span>💬 Avisar</span><strong>Check-out</strong>
                  </div>
                </div>
                <div className={styles.flowCard}>
                  <small>FLUXO CONECTADO</small>
                  <div className={styles.flowRow}>
                    <span>Entrada</span><i /><span>Aviso</span><i /><span>Recebimento</span>
                  </div>
                  <p>Cada etapa atualiza a próxima sem perder o histórico.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="plataforma" className={styles.section}>
        <div className={styles.sectionIntro}>
          <span className={styles.kicker}>UMA PLATAFORMA, TODA A ROTINA</span>
          <h2>Cada frente organizada.<br />Todas trabalhando juntas.</h2>
          <p>
            O ERP transforma atividades separadas em uma operação contínua,
            simples para quem está atendendo e clara para quem está gerindo.
          </p>
        </div>
        <div className={styles.moduleGrid}>
          {MODULOS.map((modulo) => (
            <article key={modulo.title} className={styles.moduleCard}>
              <span className={`${styles.moduleIcon} ${styles[modulo.color]}`} aria-hidden="true">
                {modulo.icon}
              </span>
              <h3>{modulo.title}</h3>
              <p>{modulo.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="operacao" className={styles.operationSection}>
        <div className={styles.operationIntro}>
          <span className={styles.kicker}>DO PRIMEIRO OI AO FIM DO DIA</span>
          <h2>Um fluxo que acompanha a equipe.</h2>
          <p>
            A informação nasce na operação e segue com ela. Sem anotações soltas,
            contas refeitas ou mensagens fora de contexto.
          </p>
        </div>
        <div className={styles.journey}>
          {JORNADA.map(([number, title, text]) => (
            <article key={number} className={styles.journeyItem}>
              <span>{number}</span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section id="perfis" className={styles.profilesSection}>
        <div className={styles.profileCopy}>
          <span className={styles.kicker}>A INTERFACE CERTA PARA CADA PAPEL</span>
          <h2>Rápido para operar.<br />Completo para gerir.</h2>
          <p>
            Cada pessoa acessa o que precisa para trabalhar, enquanto as regras e
            informações sensíveis continuam protegidas.
          </p>
          <div className={styles.securityNote}>
            <span aria-hidden="true">🛡️</span>
            <div><strong>Controle por perfil</strong><small>Operador e administrador têm acessos adequados às suas responsabilidades.</small></div>
          </div>
        </div>
        <div className={styles.profileCards}>
          <article>
            <span className={styles.profileTag}>NO DIA A DIA</span>
            <h3>Operação</h3>
            <ul>
              <li>Play, presença e fila em tempo real</li>
              <li>Cadastro e histórico das crianças</li>
              <li>Conversas e avisos aos responsáveis</li>
              <li>Check-out e recebimento rápido</li>
            </ul>
          </article>
          <article className={styles.adminCard}>
            <span className={styles.profileTag}>VISÃO DO NEGÓCIO</span>
            <h3>Gestão</h3>
            <ul>
              <li>Preços, planos e configurações</li>
              <li>Faturamento por frente de operação</li>
              <li>Colônias, vagas e mensalidades</li>
              <li>Equipe, acessos e indicadores</li>
            </ul>
          </article>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <span className={styles.kicker}>QUINTAL BRINCANTE ERP</span>
          <h2>A operação continua leve.<br />A organização fica por conta do sistema.</h2>
        </div>
        <Link href="/login" className={styles.lightButton}>
          Entrar no sistema <span aria-hidden="true">→</span>
        </Link>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <Image src="/icon-192.png" alt="" width={38} height={38} />
          <div><strong>Quintal Brincante</strong><small>ERP da operação</small></div>
        </div>
        <p>Escolinha, colônia, Play e gestão no mesmo ritmo.</p>
        <span>Tecnologia por <strong>Atl4s</strong></span>
      </footer>
    </main>
  )
}
