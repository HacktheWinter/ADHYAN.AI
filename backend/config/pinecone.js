import { Pinecone } from '@pinecone-database/pinecone';

let pc = null;
let index = null;

export const initPinecone = async () => {
    try {
        const apiKey = process.env.PINECONE_API_KEY;
        const indexName = process.env.PINECONE_INDEX_NAME || 'adhyan-attendance';

        if (!apiKey) {
            console.warn(' PINECONE_API_KEY is not set. Face Recognition will fail.');
            return;
        }

        pc = new Pinecone({ apiKey });
        index = pc.index(indexName);
        console.log(` Pinecone initialized successfully with index: ${indexName}`);
    } catch (e) {
        console.error(' Failed to initialize Pinecone');
        console.error(e);
    }
};

export const getPineconeIndex = () => {
    if (!index) throw new Error("Pinecone index not initialized");
    return index;
};
