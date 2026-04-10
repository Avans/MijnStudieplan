'use client';

import { parseJSON, distributeItemsByStudiepad } from '@/lib/utils';
import { Toaster, toast } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Step2 from '@/components/Step2';
import { CurriculumData, StudentInfo, PlanGrid } from '@/lib/types';
import PrintModal from '@/components/PrintModal';
import PrintView from '@/components/PrintView';

interface OpleidingClientProps {
    opleiding: string;
    displayName: string;
    jsonUrl: string;
}

export default function OpleidingClient({ opleiding, displayName, jsonUrl }: OpleidingClientProps) {
    const storageKey = `mijnStudieplan_${opleiding}`;

    const [view, setView] = useState<'uitleg' | 'plan'>('uitleg');
    const [curriculum, setCurriculum] = useState<CurriculumData | null>(null);
    const [selectedPad, setSelectedPad] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [savedData, setSavedData] = useState<Record<string, unknown> | null>(null);

    const [student, setStudent] = useState<StudentInfo>({
        name: '',
        number: '',
        coach: '',
        date: new Date().toISOString().split('T')[0],
    });

    const [planGrid, setPlanGrid] = useState<PlanGrid>({});
    const [achieved, setAchieved] = useState<Set<string>>(new Set());
    const [numYears, setNumYears] = useState<number>(4);
    const [commentOpen, setCommentOpen] = useState<Set<string>>(new Set());
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.timestamp) setSavedData(parsed);
            } catch {
                // ignore malformed data
            }
        }
    }, [storageKey]);

    const loadAndGoToPlan = async (fromSaved: boolean) => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(jsonUrl);
            if (!res.ok) throw new Error('Kon JSON niet laden');
            const rawData = await res.json();

            const parsedModules = parseJSON(rawData);
            const data: CurriculumData = {
                studiepaden: rawData.studiepaden || {},
                modules: parsedModules,
            };
            setCurriculum(data);

            if (fromSaved && savedData) {
                setSelectedPad((savedData.selectedPad as string) || '');
                setPlanGrid((savedData.planGrid as PlanGrid) || {});
                setAchieved(new Set((savedData.achieved as string[]) || []));
                setCommentOpen(new Set((savedData.commentOpen as string[]) || []));
                if (savedData.numYears) setNumYears(savedData.numYears as number);
                if (savedData.student) setStudent(savedData.student as StudentInfo);
                toast.success('Studieplan hervat!');
            } else {
                const pads = Object.keys(data.studiepaden);
                if (pads.length > 0) {
                    setSelectedPad(pads[0]);
                    setPlanGrid(distributeItemsByStudiepad(data.modules, data.studiepaden[pads[0]]));
                } else {
                    setError('De opleiding heeft geen studiepaden ingevuld.');
                    return;
                }
            }

            setView('plan');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Onbekende fout');
        } finally {
            setLoading(false);
        }
    };

    const handleNewStart = () => {
        localStorage.removeItem(storageKey);
        setSavedData(null);
        loadAndGoToPlan(false);
    };

    const handleSave = () => {
        const data = {
            selectedPad,
            planGrid,
            achieved: Array.from(achieved),
            commentOpen: Array.from(commentOpen),
            student,
            numYears,
            timestamp: new Date().toISOString(),
        };
        localStorage.setItem(storageKey, JSON.stringify(data));
        toast.success('Studieplan opgeslagen! (Lokaal)');
    };

    return (
        <div className="min-h-screen bg-bg-app flex flex-col print:bg-white text-text-main">
            <Header
                backLabel={view === 'plan' ? `← Uitleg ${displayName}` : undefined}
                onBack={view === 'plan' ? () => setView('uitleg') : undefined}
                showActions={view === 'plan'}
                onSave={handleSave}
                onPrint={() => setIsPrintModalOpen(true)}
            />

            <main className="flex-1 w-full max-w-[1140px] mx-auto px-6 py-7 print:hidden">
                {error && (
                    <div className="text-red-700 bg-red-50 border border-red-200 p-4 rounded-radius mb-6">{error}</div>
                )}

                {view === 'uitleg' && (
                    <UitlegScherm
                        displayName={displayName}
                        savedData={savedData}
                        loading={loading}
                        onStart={() => loadAndGoToPlan(false)}
                        onResume={() => loadAndGoToPlan(true)}
                        onNewStart={handleNewStart}
                    />
                )}

                {view === 'plan' && curriculum && (
                    <Step2
                        curriculum={curriculum}
                        selectedPad={selectedPad}
                        setSelectedPad={setSelectedPad}
                        planGrid={planGrid}
                        setPlanGrid={setPlanGrid}
                        achieved={achieved}
                        setAchieved={setAchieved}
                        commentOpen={commentOpen}
                        setCommentOpen={setCommentOpen}
                        numYears={numYears}
                        setNumYears={setNumYears}
                    />
                )}
            </main>

            {isPrintModalOpen && view === 'plan' && (
                <PrintModal
                    student={student}
                    setStudent={setStudent}
                    onClose={() => setIsPrintModalOpen(false)}
                    onConfirm={() => {
                        setIsPrintModalOpen(false);
                        setTimeout(() => window.print(), 100);
                    }}
                />
            )}

            <PrintView
                step={view === 'plan' ? 2 : 1}
                student={student}
                curriculum={curriculum}
                planGrid={planGrid}
                achieved={achieved}
                numYears={numYears}
            />

            <Toaster position="bottom-right" />
        </div>
    );
}

// ── Uitleg scherm ──────────────────────────────────────────────────────────────

interface UitlegSchermProps {
    displayName: string;
    savedData: Record<string, unknown> | null;
    loading: boolean;
    onStart: () => void;
    onResume: () => void;
    onNewStart: () => void;
}

function UitlegScherm({ displayName, savedData, loading, onStart, onResume, onNewStart }: UitlegSchermProps) {
    const formattedDate = savedData?.timestamp
        ? new Date(savedData.timestamp as string).toLocaleString('nl-NL')
        : null;

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h2 className="text-2xl font-bold mb-1">{displayName}</h2>
                <p className="text-muted text-sm">Stel je studieplan op en houd bij welke leeruitkomsten je hebt behaald.</p>
            </div>

            {savedData ? (
                <div className="bg-primary-light border-2 border-primary rounded-xl p-5 flex items-center justify-between gap-4 flex-wrap shadow-sm">
                    <div>
                        <h3 className="text-primary font-bold text-lg mb-1">Opgeslagen studieplan gevonden</h3>
                        <p className="text-text-main text-sm">Laatst opgeslagen op {formattedDate}.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onNewStart}
                            disabled={loading}
                            className="bg-card text-text-main border border-border-subtle hover:bg-bg-app px-4 py-2 font-semibold text-sm rounded transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            Nieuw starten
                        </button>
                        <button
                            onClick={onResume}
                            disabled={loading}
                            className="bg-primary text-white border-none hover:bg-primary-dark px-4 py-2 font-semibold text-sm rounded shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {loading ? 'Laden...' : 'Hervatten'}
                        </button>
                    </div>
                </div>
            ) : null}

            <div className="bg-card border border-border-subtle rounded-xl p-6 space-y-3">
                <h3 className="font-bold text-lg">Hoe werkt dit?</h3>
                <ol className="list-decimal list-inside space-y-2 text-[0.95rem] text-text-main">
                    <li>Je studieplan laat zien welke leeruitkomsten je wanneer wilt behalen.</li>
                    <li>Sleep leeruitkomsten naar de periode waarin jij ze wilt behalen.</li>
                    <li>Vink leeruitkomsten af zodra je ze hebt behaald.</li>
                    <li>Sla je plan op en print het uit voor overleg met je studieloopbaanbegeleider.</li>
                </ol>
                <p className="text-sm text-muted pt-1">
                    Je plan wordt lokaal in je browser opgeslagen. Gebruik dezelfde browser en computer om je plan te hervatten.
                </p>
            </div>

            {!savedData && (
                <div>
                    <button
                        onClick={onStart}
                        disabled={loading}
                        className="px-6 py-3 bg-primary text-white font-semibold rounded-radius shadow-sm hover:bg-primary-dark transition-colors disabled:opacity-50 text-[1rem] cursor-pointer"
                    >
                        {loading ? 'Laden...' : `Ga naar mijn studieoverzicht — ${displayName}`}
                    </button>
                </div>
            )}
        </div>
    );
}
