'use client';

interface Step1Props {
    onSelectOpleiding: (url: string) => void;
    loading: boolean;
    savedTimestamp?: string;
    onResume: () => void;
    onClear: () => void;
}

export default function Step1({ onSelectOpleiding, loading, savedTimestamp, onResume, onClear }: Step1Props) {
    const opleidingen = [
        { name: 'Informatica ICT', url: 'leeruitkomsten/Leeruitkomsten-ICT.json', icon: '💻', code: 'ICT' },
        { name: 'Communication & Multimedia Design', url: 'leeruitkomsten/Leeruitkomsten-CMD.json', icon: '🎨', code: 'CMD' }
    ];

    const formattedDate = savedTimestamp ? new Date(savedTimestamp).toLocaleString('nl-NL') : null;

    return (
        <div className="space-y-6 animate-fade-in">
            {savedTimestamp && (
                <div className="bg-primary-light border-2 border-primary rounded-xl p-5 mb-6 flex items-center justify-between gap-4 flex-wrap shadow-sm">
                    <div>
                        <h3 className="text-primary font-bold text-lg mb-1">Opgeslagen Studieplan gevonden</h3>
                        <p className="text-text-main text-sm">Je hebt een studieplan aangepast en opgeslagen op {formattedDate}.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClear}
                            className="bg-card text-text-main border border-border-subtle hover:bg-bg-app px-4 py-2 font-semibold text-sm rounded transition-colors"
                        >
                            Nieuwe starten
                        </button>
                        <button
                            onClick={onResume}
                            className="bg-primary text-white border-none hover:bg-primary-dark px-4 py-2 font-semibold text-sm rounded shadow-sm transition-colors"
                        >
                            Hervatten
                        </button>
                    </div>
                </div>
            )}

            <div>
                <h2 className="text-2xl font-bold mb-2">Stap 1: Opleiding kiezen</h2>
                <p className="text-muted text-sm">Selecteer je opleiding om het studieplan in te laden.</p>
            </div>

            <div className="flex gap-5 flex-wrap">
                {opleidingen.map(opl => (
                    <div
                        key={opl.code}
                        onClick={() => !loading && onSelectOpleiding(opl.url)}
                        className={`flex-1 min-w-[200px] max-w-[280px] bg-card border-2 border-border-subtle rounded-xl p-7 text-center flex flex-col items-center gap-3 cursor-pointer transition-all duration-200 hover:border-primary hover:-translate-y-1 hover:shadow-md ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className="text-4xl">{opl.icon}</div>
                        <div className="font-semibold text-base">{opl.name}</div>
                        <div className="text-xs text-muted bg-bg-app px-2 py-1 rounded">Module {opl.code}</div>
                    </div>
                ))}
            </div>

            {loading && (
                <div className="text-center text-muted p-6">Laden...</div>
            )}
        </div>
    );
}
