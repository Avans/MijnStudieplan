import { notFound } from 'next/navigation';
import OpleidingClient from './OpleidingClient';

const OPLEIDING_MAP: Record<string, { displayName: string; jsonUrl: string }> = {
    ict: {
        displayName: 'ICT — Informatica',
        jsonUrl: '/leeruitkomsten/Leeruitkomsten-ICT.json',
    },
    cmd: {
        displayName: 'CMD — Communication & Multimedia Design',
        jsonUrl: '/leeruitkomsten/Leeruitkomsten-CMD.json',
    },
};

export function generateStaticParams() {
    return Object.keys(OPLEIDING_MAP).map((opleiding) => ({ opleiding }));
}

export default async function OpleidingPage({ params }: { params: Promise<{ opleiding: string }> }) {
    const { opleiding } = await params;
    const meta = OPLEIDING_MAP[opleiding.toLowerCase()];
    if (!meta) notFound();

    return <OpleidingClient opleiding={opleiding.toLowerCase()} displayName={meta.displayName} jsonUrl={meta.jsonUrl} />;
}
