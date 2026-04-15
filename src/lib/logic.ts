
import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, orderBy, limit, startAfter, deleteDoc, doc, updateDoc } from 'firebase/firestore';

// ─── Types ───────────────────────────────────────────────────────────────────────
export type Client = {
    id: string;
    name: string;
    code: string;
};

export type Contract = {
    id: string;
    fullCode: string;
    clientName: string;
    contractNumber: string;
    year: string;
    lawyerId: string;
    createdAt: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────────
export const LAWYERS = [
    { id: '01', name: 'Renata' },
    { id: '02', name: 'Felipe' },
    { id: '03', name: 'Gleison' },
    { id: '04', name: 'Océlio' },
    { id: '05', name: 'Hermes' },
    { id: '06', name: 'Larissa' },
    { id: '07', name: 'Danielle' },
    { id: '08', name: 'Bruno' },
    { id: '09', name: 'Externo' },
];

// ─── Clients ─────────────────────────────────────────────────────────────────────
export async function getClients(): Promise<Client[]> {
    try {
        const snapshot = await getDocs(query(collection(db, 'clients')));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Client));
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        return [];
    }
}

// ─── Code Generation ─────────────────────────────────────────────────────────────
export async function generateContractCode(clientName: string, lawyerId: string) {
    if (!clientName || !lawyerId) throw new Error('Dados incompletos');

    const clientsRef = collection(db, 'clients');
    const clientSnap = await getDocs(query(clientsRef, where('name', '==', clientName.trim())));

    let clientCode: string;
    let clientId: string;

    if (!clientSnap.empty) {
        const clientDoc = clientSnap.docs[0];
        const d = clientDoc.data();
        clientId = clientDoc.id;

        if (d.code) {
            // Cliente já tem código — usa o existente
            clientCode = d.code;
        } else {
            // Cliente existe mas sem campo `code` — gera e salva
            clientCode = Math.floor(1000 + Math.random() * 9000).toString();
            await updateDoc(doc(clientsRef, clientId), { code: clientCode });
        }
    } else {
        clientCode = Math.floor(1000 + Math.random() * 9000).toString();
        const newClient = await addDoc(clientsRef, {
            name: clientName.trim(),
            code: clientCode,
            createdAt: new Date().toISOString(),
        });
        clientId = newClient.id;
    }

    const year = new Date().getFullYear().toString().slice(-2);
    let contractNumber = '';
    let fullCode = '';
    let isUnique = false;

    while (!isUnique) {
        contractNumber = Math.floor(1000 + Math.random() * 9000).toString();
        fullCode = `${clientCode}-${year}.${contractNumber}`;
        const snap = await getDocs(query(collection(db, 'cases'), where('fullCode', '==', fullCode)));
        if (snap.empty) isUnique = true;
    }

    const countSnap = await getDocs(query(collection(db, 'cases'), where('clientId', '==', clientId)));
    const caseSequence = countSnap.size + 1;

    await addDoc(collection(db, 'cases'), {
        fullCode,
        contractNumber,
        year,
        lawyerId: lawyerId.padStart(2, '0'),
        clientId,
        clientName: clientName.trim(),
        createdAt: new Date().toISOString(),
    });

    return { fullCode, clientCode, contractNumber, caseSequence };
}

// ─── Search & Pagination ─────────────────────────────────────────────────────────
export const PAGE_SIZE = 20;

export interface ContractsPage {
    contracts: Contract[];
    lastDoc: any | null; // Firestore DocumentSnapshot cursor
    hasMore: boolean;
}

export async function searchContracts(
    term: string = '',
    cursor: any | null = null
): Promise<ContractsPage> {
    try {
        const casesRef = collection(db, 'cases');

        // If there's a search term, fetch all and filter client-side
        // (Firestore doesn't support full-text search natively)
        if (term) {
            const q = query(casesRef, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const lower = term.toLowerCase();
            const filtered = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as Contract))
                .filter(c =>
                    c.clientName.toLowerCase().includes(lower) ||
                    c.fullCode?.toLowerCase().includes(lower)
                );
            return { contracts: filtered, lastDoc: null, hasMore: false };
        }

        // No search term: use cursor-based pagination
        const constraints: any[] = [orderBy('createdAt', 'desc'), limit(PAGE_SIZE + 1)];
        if (cursor) constraints.push(startAfter(cursor));

        const q = query(casesRef, ...constraints);
        const snapshot = await getDocs(q);
        const docs = snapshot.docs;

        const hasMore = docs.length > PAGE_SIZE;
        const pageDocs = hasMore ? docs.slice(0, PAGE_SIZE) : docs;

        return {
            contracts: pageDocs.map(d => ({ id: d.id, ...d.data() } as Contract)),
            lastDoc: pageDocs[pageDocs.length - 1] ?? null,
            hasMore,
        };
    } catch (error) {
        console.error('Erro na busca:', error);
        return { contracts: [], lastDoc: null, hasMore: false };
    }
}

export async function getTotalContracts(): Promise<number> {
    try {
        const snapshot = await getDocs(collection(db, 'cases'));
        return snapshot.size;
    } catch {
        return 0;
    }
}

export async function deleteContract(id: string) {
    await deleteDoc(doc(db, 'cases', id));
}
