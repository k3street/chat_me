import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';

export interface DocumentChunk {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    source: string;
    type: 'document' | 'youtube';
    title?: string;
    timestamp?: number;
  };
}

// In-memory storage for demo purposes
// In production, you'd use a proper vector database like Pinecone, Weaviate, or Chroma
let documentStore: DocumentChunk[] = [];

export async function createEmbedding(text: string): Promise<number[]> {
  const result = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: text,
  });
  
  return result.embedding;
}

export async function addDocument(
  content: string,
  metadata: DocumentChunk['metadata']
): Promise<string> {
  const chunks = chunkText(content, 1000); // Split into 1000-character chunks
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await createEmbedding(chunk);
    
    const documentChunk: DocumentChunk = {
      id: `${metadata.source}-${i}`,
      content: chunk,
      embedding,
      metadata: {
        ...metadata,
        timestamp: Date.now(),
      },
    };
    
    documentStore.push(documentChunk);
  }
  
  return `Added ${chunks.length} chunks from ${metadata.source}`;
}

export async function searchSimilarDocuments(
  query: string,
  topK: number = 3
): Promise<DocumentChunk[]> {
  if (documentStore.length === 0) {
    return [];
  }
  
  const queryEmbedding = await createEmbedding(query);
  
  // Calculate cosine similarity for all documents
  const similarities = documentStore.map(doc => ({
    document: doc,
    similarity: cosineSimilarity(queryEmbedding, doc.embedding),
  }));
  
  // Sort by similarity and return top K
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
    .map(item => item.document);
}

function chunkText(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  
  const sentences = text.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxLength) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    } else {
      currentChunk += sentence + '.';
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  
  return dotProduct / (magnitudeA * magnitudeB);
}

export function getDocumentStore(): DocumentChunk[] {
  return documentStore;
}

export function clearDocumentStore(): void {
  documentStore = [];
}
