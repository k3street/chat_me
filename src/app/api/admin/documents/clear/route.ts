import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { clearDocumentStore } from '@/utils/vectorSearch';

export async function POST() {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session || session.user?.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Clear all documents from the vector store
    clearDocumentStore();

    return NextResponse.json({
      success: true,
      message: 'All documents cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing documents:', error);
    return NextResponse.json(
      { error: 'Failed to clear documents' },
      { status: 500 }
    );
  }
}
