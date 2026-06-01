'use client';

import { parseJSON, distributeItemsByStudiepad } from '@/lib/utils';
import { Toaster, toast } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Step2 from '@/components/Step2';
import { CurriculumData, StudentInfo, PlanGrid, ToetsonderdeelState } from '@/lib/types';
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
    const [toetsonderdeelStates, setToetsonderdeelStates] = useState<Map<string, ToetsonderdeelState>>(new Map());
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
                naamOpleiding: rawData.naamOpleiding,
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
                if (savedData.toetsonderdeelStates) {
                    setToetsonderdeelStates(new Map(savedData.toetsonderdeelStates as [string, ToetsonderdeelState][]));
                }
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

    const toggleToetsonderdeel = (key: string) => {
        setToetsonderdeelStates(prev => {
            const next = new Map(prev);
            const current = next.get(key) ?? 'unchecked';
            next.set(key, current === 'unchecked' ? 'checked' : 'unchecked');
            return next;
        });
    };

    // Sync LU achieved state whenever TO states change
    useEffect(() => {
        if (!curriculum) return;
        setAchieved(prev => {
            const next = new Set(prev);
            for (const mod of curriculum.modules) {
                const outcomes = mod.outcomes ?? [];
                for (let i = 0; i < outcomes.length; i++) {
                    const numTO = outcomes[i].toetsonderdelen?.length ?? 0;
                    if (numTO === 0) continue;
                    const luKey = `${mod.code}|${i}`;
                    const allChecked = Array.from({ length: numTO }, (_, ti) =>
                        toetsonderdeelStates.get(`${mod.code}|${i}|${ti}`) === 'checked'
                    ).every(Boolean);
                    if (allChecked) next.add(luKey);
                    else next.delete(luKey);
                }
            }
            return next;
        });
    }, [toetsonderdeelStates, curriculum]);

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
            toetsonderdeelStates: Array.from(toetsonderdeelStates.entries()),
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
                backLabel={view === 'plan' ? 'Uitleg over mijn studieplan' : undefined}
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
                        toetsonderdeelStates={toetsonderdeelStates}
                        setToetsonderdeelStates={setToetsonderdeelStates}
                        toggleToetsonderdeel={toggleToetsonderdeel}
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
                displayName={displayName}
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
    savedData: Record<string, unknown> | null;
    loading: boolean;
    onStart: () => void;
    onResume: () => void;
    onNewStart: () => void;
}

function UitlegScherm({ savedData, loading, onStart, onResume, onNewStart }: UitlegSchermProps) {
    const formattedDate = savedData?.timestamp
        ? new Date(savedData.timestamp as string).toLocaleString('nl-NL')
        : null;

    const ctaButton = (
        <button
            onClick={onStart}
            disabled={loading}
            className="px-5 py-2.5 bg-success text-white font-semibold rounded-radius shadow-sm hover:bg-success-dark transition-colors disabled:opacity-50 text-[0.95rem] cursor-pointer whitespace-nowrap"
        >
            {loading ? 'Laden...' : 'Ga naar mijn studieplan'}
        </button>
    );

    return (
        <div className="animate-fade-in flex justify-center">
            <div className="w-full max-w-[1080px] bg-card border border-border-subtle rounded-xl shadow-sm p-8 flex flex-col gap-8">

                {/* Knop rechtsboven — alleen als er geen opgeslagen plan is */}
                {!savedData && (
                    <div className="flex justify-end -mb-2">{ctaButton}</div>
                )}

                {/* Hervatten-banner */}
                {savedData && (
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
                                className="bg-success text-white border-none hover:bg-success-dark px-4 py-2 font-semibold text-sm rounded shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                {loading ? 'Laden...' : 'Hervatten'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Sectie 1: Het studieadvies */}
                <div className="space-y-8">

                    {/* Intro */}
                    <div className="space-y-3">
                        <h2 className="text-2xl font-bold">Studieadvies en doorstroomnorm</h2>
                        <p className="text-[0.97rem] leading-relaxed text-text-main font-semibold">
                            Als eerstejaarsstudent krijg je vóór het einde van het studiejaar een studieadvies van de examencommissie.
                        </p>
                        <p className="text-[0.97rem] leading-relaxed text-text-main font-semibold">
                            Dit advies is niet bindend, maar geeft je inzicht in hoe je ervoor staat.
                        </p>
                        <div className="space-y-1">
                            <p className="text-[0.97rem] leading-relaxed text-text-main font-semibold">Er wordt gekeken naar:</p>
                            <ul className="list-disc list-inside space-y-1 pl-1">
                                <li className="text-[0.97rem] leading-relaxed text-text-main font-semibold">Je studieresultaten</li>
                                <li className="text-[0.97rem] leading-relaxed text-text-main font-semibold">Je motivatie</li>
                                <li className="text-[0.97rem] leading-relaxed text-text-main font-semibold">Je persoonlijke situatie*</li>
                                <li className="text-[0.97rem] leading-relaxed text-text-main font-semibold">Je potentie om de opleiding succesvol af te ronden</li>
                            </ul>
                        </div>
                        <p className="text-[0.93rem] leading-relaxed text-muted italic">
                            *Meld veranderingen in je persoonlijke situatie tijdig bij{' '}
                            <a href="https://avans.sharepoint.com/sites/student-support-studentbegeleiding/SitePages/Studentendecaan.aspx" target="_blank" rel="noopener noreferrer" className="underline hover:text-text-main transition-colors">
                                Student Support, de studentendecaan
                            </a>{' '}
                            zodat jij de ondersteuning krijgt die nodig is.
                        </p>
                    </div>

                    {/* Mag ik naar het 2e jaar? */}
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <h3 className="text-xl font-semibold text-primary">Mag ik naar het 2e jaar?</h3>
                        </div>
                        <div className="col-span-2 space-y-4">
                            <p className="text-[0.97rem] leading-relaxed text-text-main">
                                Om door te gaan naar het tweede jaar gelden twee normen:
                            </p>
                            <ol className="list-decimal list-inside space-y-3 pl-1">
                                <li className="text-[0.97rem] leading-relaxed text-text-main">
                                    <strong>Kwantitatieve norm</strong><br />
                                    <span className="pl-5 block">Je moet minimaal 45 studiepunten hebben gehaald in het eerste jaar.</span>
                                </li>
                                <li className="text-[0.97rem] leading-relaxed text-text-main">
                                    <strong>Kwalitatieve norm</strong><br />
                                    <span className="pl-5 block">Sommige opleidingen stellen extra eisen. Bijvoorbeeld dat je bepaalde onderdelen hebt gehaald die belangrijk zijn voor je vervolg, zoals leeruitkomsten die nodig zijn voor een stage of voor het beroep waarvoor je wordt opgeleid.</span>
                                </li>
                            </ol>
                            <p className="text-[0.97rem] leading-relaxed text-text-main">
                                Wil je weten of jouw opleiding extra eisen heeft?<br />
                                Kijk in het{' '}
                                <a href="https://www.avans.nl/studeren/praktische-zaken/onderwijs-en-examenregelingen-2024-2025" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:opacity-80 transition-opacity">
                                    Onderwijs- en Examenreglement (OER)
                                </a>{' '}
                                van jouw opleiding.
                            </p>
                        </div>
                    </div>

                    {/* Wanneer hoor ik er iets over? */}
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <h3 className="text-xl font-semibold text-primary">Wanneer hoor ik er iets over?</h3>
                        </div>
                        <div className="col-span-2 space-y-3">
                            <p className="text-[0.97rem] leading-relaxed text-text-main">
                                In elke onderwijsperiode heb je minimaal één gesprek met je studieloopbaanbegeleider (SLB&apos;er/coach) over hoe je studie verloopt.
                            </p>
                            <p className="text-[1.05rem] leading-relaxed text-text-main">
                                In januari krijg je ook bericht van de examencommissie over je studievoortgang.<br />
                                Wil je namelijk stoppen met je studie, dan is het slim om dit voor 1 februari te doen.<br />
                                Dat heet de{' '}
                                <a href="https://duo.nl/particulier/opleiding-stoppen-of-wijzigen/stoppen-in-je-eerste-jaar.jsp" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80 transition-opacity">
                                    eerstejaarsregeling
                                </a>
                                . Je hoeft dan je prestatiebeurs niet terug te betalen.
                            </p>
                            <p className="text-[0.97rem] leading-relaxed text-text-main">
                                <strong>Mis je studiepunten?</strong><br />
                                Dan maak je samen met je SLB&apos;er een studieplan om achterstanden in te halen.<br />
                                Dit plan helpt je om overzicht te houden en afspraken te maken over vervolgstappen in je studie.
                            </p>
                        </div>
                    </div>

                    {/* Uitkomsten van het studieadvies */}
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <h3 className="text-xl font-semibold text-primary">Uitkomsten van het studieadvies</h3>
                        </div>
                        <div className="col-span-2 space-y-2">
                            <p className="text-[0.97rem] leading-relaxed text-text-main">
                                Aan het einde van je eerste studiejaar krijg je een <strong>persoonlijk studieadvies.</strong><br />
                                Er zijn drie mogelijke uitkomsten:
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="border border-border-subtle rounded-lg p-4 space-y-2">
                            <h2 className="text-lg font-bold text-text-main">Positief studieadvies</h2>
                            <p className="text-[0.93rem] leading-relaxed text-text-main">Je kunt zonder problemen doorgaan naar het tweede jaar.</p>
                        </div>
                        <div className="border border-border-subtle rounded-lg p-4 space-y-2">
                            <h2 className="text-lg font-bold text-text-main">Advies passend studietraject</h2>
                            <p className="text-[0.93rem] leading-relaxed text-text-main">Je kunt doorgaan, maar er zijn aandachtspunten. Samen met je SLB&apos;er bespreek je wat nodig is om succesvol verder te studeren.</p>
                        </div>
                        <div className="border border-border-subtle rounded-lg p-4 space-y-2">
                            <h2 className="text-lg font-bold text-text-main">Verwijsadvies</h2>
                            <p className="text-[0.93rem] leading-relaxed text-text-main">De opleiding adviseert je om een andere studie te overwegen. Je SLB&apos;er helpt je hierbij en verwijst je naar <strong>Student Support</strong> voor extra begeleiding.</p>
                        </div>
                    </div>


                </div>

                {/* Sectie 4: Hoe gebruik je dit hulpmiddel */}
                <div className="space-y-3">
                    <h2 className="text-2xl font-bold">Hoe gebruik je dit hulpmiddel?</h2>
                    <p className="text-[0.97rem] leading-relaxed text-text-main">
                        Met dit hulpmiddel maak je jouw studieplan concreet en inzichtelijk. Je sleept leeruitkomsten naar de periode waarin jij ze wilt behalen en houdt bij welke je al hebt gehaald. Zo bouw je, op basis van jouw eigen inzichten en prioriteiten, een persoonlijk plan op dat aansluit bij jouw situatie.
                    </p>
                    <p className="text-[0.97rem] leading-relaxed text-text-main">
                        Je hoeft dus niet te wachten op je slb&apos;er om aan de slag te gaan. Juist het omgekeerde: door al voorbereid aan je gesprek te beginnen, kun je de tijd met je slb&apos;er gebruiken om jouw plan te toetsen en aan te scherpen in plaats van het van nul te beginnen.
                    </p>
                    <p className="text-[0.97rem] leading-relaxed text-text-main">
                        Wanneer je plan klaar is, druk je het af als PDF via de knop &apos;Afdrukken / PDF&apos; in de menubalk. Dit document onderteken je en upload je vervolgens samen met je verzoek in Osiris, zodat de examencommissie het kan beoordelen.
                    </p>
                </div>

                {/* Disclaimer */}
                <div className="bg-bg-app border border-border-subtle rounded-lg p-4 text-[0.85rem] text-muted leading-relaxed space-y-1">
                    <p className="font-semibold text-text-main">Let op: jouw gegevens blijven bij jou</p>
                    <p>Dit hulpmiddel slaat alles uitsluitend lokaal op in jouw browser. Er zijn geen koppelingen met Osiris of andere onderwijssystemen. Wij hebben geen enkele inzage in wat je hier invult. Dat betekent ook dat je zelf volledig verantwoordelijk bent voor het bewaren, bijhouden en tijdig indienen van je studieplan. Gebruik steeds dezelfde browser en computer om verder te gaan waar je gebleven was.</p>
                </div>

                {/* Knop rechtsonder — alleen als er geen opgeslagen plan is */}
                {!savedData && (
                    <div className="flex justify-end -mt-2">{ctaButton}</div>
                )}

            </div>
        </div>
    );
}
