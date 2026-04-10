import Link from 'next/link';

export default function Home() {
    return (
        <div className="min-h-screen bg-bg-app text-text-main">
            <header className="bg-card border-b border-border-subtle p-3.5 px-6 sticky top-0 z-50 shadow-sm">
                <div className="max-w-[1140px] mx-auto">
                    <h1 className="text-xl font-bold text-primary">Mijn Studieplan</h1>
                </div>
            </header>

            <main className="w-full max-w-[1140px] mx-auto px-6 py-10 space-y-8">
                {/* TODO Feature 2: volledige ATD-uitleg hier */}
                <div>
                    <h2 className="text-2xl font-bold mb-2">Over het studieadviesproces</h2>
                    <p className="text-muted text-sm">Hier komt uitleg over het ATD-studieadviesproces en hoe dit hulpmiddel daarin past.</p>
                </div>

                <div className="flex gap-5 flex-wrap">
                    <Link
                        href="/ict"
                        className="flex-1 min-w-[200px] max-w-[280px] bg-card border-2 border-border-subtle rounded-xl p-7 text-center flex flex-col items-center gap-3 hover:border-primary hover:-translate-y-1 hover:shadow-md transition-all duration-200"
                    >
                        <div className="text-4xl">💻</div>
                        <div className="font-semibold text-base">ICT — Informatica</div>
                    </Link>
                    <Link
                        href="/cmd"
                        className="flex-1 min-w-[200px] max-w-[280px] bg-card border-2 border-border-subtle rounded-xl p-7 text-center flex flex-col items-center gap-3 hover:border-primary hover:-translate-y-1 hover:shadow-md transition-all duration-200"
                    >
                        <div className="text-4xl">🎨</div>
                        <div className="font-semibold text-base">CMD — Communication & Multimedia Design</div>
                    </Link>
                </div>
            </main>
        </div>
    );
}
