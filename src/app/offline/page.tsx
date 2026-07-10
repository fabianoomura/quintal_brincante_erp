import Link from 'next/link'

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-6">
      <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-black/5">
        <div className="text-5xl">🌳</div>
        <h1 className="mt-4 font-display text-2xl font-bold text-slate-700">Sem internet no momento</h1>
        <p className="mt-2 text-sm text-slate-500">
          O Quintal está instalado, mas esta tela precisa de conexão. Assim que a internet voltar,
          tente novamente para carregar os dados mais recentes.
        </p>
        <Link href="/" className="mt-5 inline-block rounded-full bg-emerald-600 px-5 py-2.5 font-bold text-white">
          Tentar novamente
        </Link>
      </div>
    </main>
  )
}
