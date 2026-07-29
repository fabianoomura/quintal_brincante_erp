import Link from 'next/link'
import { getColaboradorAtual } from '@/lib/colaborador'

type Tile = { href: string; label: string; desc: string; icon: string; cor: string; adminOnly?: boolean }
type Grupo = { titulo: string; tiles: Tile[] }

// Agrupado como na sidebar: o dia a dia primeiro, gestão/config depois.
const GRUPOS: Grupo[] = [
  {
    titulo: 'Operação',
    tiles: [
      { href: '/playground', label: 'Play agora', desc: 'Entrada, fila, cronômetro e check-out', icon: '🎠', cor: 'bg-fuchsia-100 text-fuchsia-700' },
      { href: '/presenca', label: 'Quem está aqui', desc: 'Presença geral e lotação de hoje', icon: '📋', cor: 'bg-amber-100 text-amber-700' },
      { href: '/criancas', label: 'Crianças', desc: 'Cadastro, contatos e saúde', icon: '👧', cor: 'bg-sky-100 text-sky-700' },
    ],
  },
  {
    titulo: 'Matrículas',
    tiles: [
      { href: '/mensalistas', label: 'Mensalistas', desc: 'Matrículas e planos', icon: '🎟️', cor: 'bg-rose-100 text-rose-700' },
      { href: '/planos', label: 'Planos', desc: 'Mensalidade por frequência', icon: '📦', cor: 'bg-pink-100 text-pink-700', adminOnly: true },
      { href: '/colonias', label: 'Colônia', desc: 'Edições e inscrições', icon: '🏕️', cor: 'bg-amber-100 text-amber-700' },
    ],
  },
  {
    titulo: 'Financeiro',
    tiles: [
      { href: '/financeiro', label: 'Financeiro', desc: 'Lançamentos e conciliação', icon: '💰', cor: 'bg-emerald-100 text-emerald-700' },
      { href: '/faturamento', label: 'Faturamento', desc: 'Receita por operação/mês', icon: '📈', cor: 'bg-teal-100 text-teal-700', adminOnly: true },
      { href: '/gerencial', label: 'Gerencial', desc: 'Indicadores do dia', icon: '📊', cor: 'bg-indigo-100 text-indigo-700', adminOnly: true },
    ],
  },
  {
    titulo: 'Gestão do espaço',
    tiles: [
      { href: '/grade', label: 'Preços do Play', desc: 'Horários e valores', icon: '🗓️', cor: 'bg-fuchsia-100 text-fuchsia-700', adminOnly: true },
      { href: '/calendario', label: 'Feriados', desc: 'Regras para dias especiais', icon: '📅', cor: 'bg-orange-100 text-orange-700', adminOnly: true },
      { href: '/mensagens', label: 'Avisos do Play', desc: 'Textos e aprovação Meta', icon: '💬', cor: 'bg-pink-100 text-pink-700', adminOnly: true },
      { href: '/ambientes', label: 'Ambientes', desc: 'Salas e espaços', icon: '🏠', cor: 'bg-lime-100 text-lime-700', adminOnly: true },
      { href: '/colaboradores', label: 'Colaboradores', desc: 'Equipe e acessos', icon: '🧑‍🏫', cor: 'bg-cyan-100 text-cyan-700', adminOnly: true },
      { href: '/configuracoes', label: 'Configurações', desc: 'Regras e capacidade', icon: '⚙️', cor: 'bg-violet-100 text-violet-700', adminOnly: true },
    ],
  },
]

export default async function SistemaPage() {
  const colaborador = await getColaboradorAtual()
  const ehAdmin = colaborador?.papel_acesso === 'admin'
  const grupos = GRUPOS.map((g) => ({
    ...g,
    tiles: g.tiles.filter((t) => !t.adminOnly || ehAdmin),
  })).filter((g) => g.tiles.length > 0)

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-5 overflow-hidden rounded-3xl border border-emerald-100 bg-white p-6 shadow-[var(--shadow-card)] sm:flex-row sm:items-center">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">Visão geral</span>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#20322c]">
            Oi, {colaborador?.nome.split(' ')[0] ?? 'equipe'}!
          </h2>
          <p className="mt-1 text-sm text-slate-500">A operação do Quintal começa por aqui.</p>
        </div>
        <Link
          href="/playground"
          className="pop inline-flex items-center justify-center gap-3 rounded-2xl bg-fuchsia-600 px-5 py-3.5 font-display font-bold text-white shadow-lg shadow-fuchsia-600/15 hover:bg-fuchsia-700"
        >
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/15">🎠</span>
          Abrir Play agora
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {grupos.map((g) => (
        <section key={g.titulo} className="space-y-2">
          <h3 className="px-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
            {g.titulo}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.tiles.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="pop group flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm hover:border-emerald-200 hover:shadow-[var(--shadow-card)]"
              >
                <div
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${t.cor} text-lg`}
                >
                  {t.icon}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-display text-base font-bold text-[#263a33]">
                    {t.label}
                  </div>
                  <p className="truncate text-xs text-slate-500">{t.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
