import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '@/lib/auth-middleware';

const FAVICON_PATH = path.join(process.cwd(), 'src', 'app', 'favicon.ico');

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.endsWith('.ico')) {
      return NextResponse.json({ error: 'Only .ico files are allowed for the favicon' }, { status: 400 });
    }

    if (file.size > 1 * 1024 * 1024) {
      return NextResponse.json({ error: 'Favicon size must be less than 1MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Make sure the src/app directory exists (it should, but just in case)
    const appDir = path.dirname(FAVICON_PATH);
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
    }

    // Overwrite the file
    fs.writeFileSync(FAVICON_PATH, buffer);

    return NextResponse.json({ success: true, message: 'Favicon updated successfully' });
  } catch (error) {
    console.error('Error uploading favicon:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE() {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    if (fs.existsSync(FAVICON_PATH)) {
      fs.unlinkSync(FAVICON_PATH);
    }
    return NextResponse.json({ success: true, message: 'Favicon deleted successfully' });
  } catch (error) {
    console.error('Error deleting favicon:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
