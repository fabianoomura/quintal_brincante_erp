import Link from 'next/link'
import { getColaboradorAtual } from '@/lib/colaborador'

type Tile = { href: string; label: string; desc: string; icon: string; cor: string; adminOnly?: boolean }
type Grupo = { titulo: string; tiles: Tile[] }

// Agrupado como na sidebar: o dia a dia primeiro, gestão/config depois.
const GRUPOS: Grupo[] = [
  {
    titulo: 'Operação',
    tiles: [
      { href: '/playground', label: 'Playground', desc: 'Check-in/out rápido, cronômetro', icon: '🎠', cor: 'from-fuchsia-500 to-pink-500' },
      { href: '/presenca', label: 'Quem está aqui', desc: 'Presença e lotação de hoje', icon: '📋', cor: 'from-amber-500 to-orange-500' },
      { href: '/criancas', label: 'Crianças', desc: 'Cadastro, contatos e saúde', icon: '👧', cor: 'from-sky-500 to-cyan-600' },
    ],
  },
  {
    titulo: 'Matrículas',
    tiles: [
      { href: '/mensalistas', label: 'Mensalistas', desc: 'Matrículas e planos', icon: '🎟️', cor: 'from-pink-500 to-rose-600' },
      { href: '/planos', label: 'Planos', desc: 'Mensalidade por frequência', icon: '🎟️', cor: 'from-pink-500 to-rose-600', adminOnly: true },
      { href: '/colonias', label: 'Colônia', desc: 'Edições e inscrições', icon: '🏕️', cor: 'from-yellow-500 to-amber-600' },
    ],
  },
  {
    titulo: 'Financeiro',
    tiles: [
      { href: '/financeiro', label: 'Financeiro', desc: 'Lançamentos e conciliação', icon: '💰', cor: 'from-emerald-500 to-teal-600' },
      { href: '/faturamento', label: 'Faturamento', desc: 'Receita por operação/mês', icon: '📈', cor: 'from-emerald-600 to-green-700', adminOnly: true },
      { href: '/gerencial', label: 'Gerencial', desc: 'Indicadores do dia', icon: '📊', cor: 'from-indigo-500 to-blue-600', adminOnly: true },
    ],
  },
  {
    titulo: 'Gestão do espaço',
    tiles: [
      { href: '/grade', label: 'Grade do play', desc: 'Horários e valores do play', icon: '🎠', cor: 'from-fuchsia-500 to-purple-600', adminOnly: true },
      { href: '/calendario', label: 'Feriados', desc: 'Valor por feriado', icon: '📅', cor: 'from-orange-500 to-amber-600', adminOnly: true },
      { href: '/mensagens', label: 'Mensagens', desc: 'Textos e aprovação Meta', icon: '💬', cor: 'from-fuchsia-600 to-purple-700', adminOnly: true },
      { href: '/ambientes', label: 'Ambientes', desc: 'Salas e espaços', icon: '🏠', cor: 'from-lime-500 to-green-600', adminOnly: true },
      { href: '/colaboradores', label: 'Colaboradores', desc: 'Equipe e acessos', icon: '🧑‍🏫', cor: 'from-teal-500 to-cyan-700', adminOnly: true },
      { href: '/configuracoes', label: 'Configurações', desc: 'Flags e capacidade', icon: '⚙️', cor: 'from-violet-500 to-purple-600', adminOnly: true },
    ],
  },
]

export default async function HomePage() {
  const colaborador = await getColaboradorAtual()
  const ehAdmin = colaborador?.papel_acesso === 'admin'
  const grupos = GRUPOS.map((g) => ({
    ...g,
    tiles: g.tiles.filter((t) => !t.adminOnly || ehAdmin),
  })).filter((g) => g.tiles.length > 0)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-800">
          Oi, {colaborador?.nome.split(' ')[0] ?? 'equipe'}! 🌈
        </h2>
        <p className="text-sm text-slate-500">O que você quer fazer agora?</p>
      </div>

      {grupos.map((g) => (
        <section key={g.titulo} className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {g.titulo}
          </h3>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {g.tiles.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="pop group flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 hover:shadow-md"
              >
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${t.cor} text-xl text-white shadow`}
                >
                  {t.icon}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-display text-base font-bold text-slate-800">
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
