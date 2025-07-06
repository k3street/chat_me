import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDocumentStore } from '@/utils/vectorSearch';

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session || session.user?.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all documents from the vector store
    const documents = getDocumentStore();

    return NextResponse.json({
      success: true,
      documents: documents,
      count: documents.length,
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
