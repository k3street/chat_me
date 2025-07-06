import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { addDocument } from '@/utils/vectorSearch';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, TXT, DOC, and DOCX files are allowed.' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileId = uuidv4();
    const extension = path.extname(file.name);
    const filename = `${fileId}${extension}`;

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    try {
      await writeFile(path.join(uploadsDir, filename), buffer);
    } catch {
      // If directory doesn't exist, create it
      const { mkdir } = await import('fs/promises');
      await mkdir(uploadsDir, { recursive: true });
      await writeFile(path.join(uploadsDir, filename), buffer);
    }

    // Extract text content from the file
    let textContent = '';
    
    if (file.type === 'text/plain') {
      textContent = buffer.toString('utf-8');
    } else if (file.type === 'application/pdf') {
      // For PDF files, you'd need to use a PDF parser like pdf-parse
      // For now, we'll just use a placeholder
      textContent = `PDF document: ${file.name}. Content extraction not implemented in this demo.`;
    } else {
      textContent = `Document: ${file.name}. Content extraction for this file type not implemented in this demo.`;
    }

    // Add to vector search index
    await addDocument(textContent, {
      source: fileId,
      type: 'document',
      title: file.name,
      url: `/api/files/${fileId}`, // For document download
    });

    return NextResponse.json({
      success: true,
      fileId,
      filename: file.name,
      size: file.size,
      type: file.type,
      message: 'Document processed and added to knowledge base',
    });
  } catch (error) {
    console.error('Error in upload API:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
