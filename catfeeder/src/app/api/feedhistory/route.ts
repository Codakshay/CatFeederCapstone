import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const filePath = path.join("/home/CatFeeder", 'feedHistory.txt');


// POST — Append a single { timestamp, feeder } to a new line
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { timestamp, feeder } = body;

    if (!timestamp || !feeder) {
      return NextResponse.json({ error: 'Missing timestamp or feeder' }, { status: 400 });
    }

    const line = `${timestamp},${feeder}\n`;
    await fs.appendFile(filePath, line, 'utf8');

    return NextResponse.json({ message: 'Entry appended successfully!' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

// DELETE — Clear the file contents
export async function DELETE() {
  try {
    await fs.writeFile(filePath, '', 'utf8'); // Overwrite with empty content
    return NextResponse.json({ message: 'File cleared successfully!' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function GET() {
  try {
    await fs.access(filePath);
    const content = await fs.readFile(filePath, 'utf8');

    // Split by lines, remove empty lines
    const lines = content
      .split('\n')
      .filter(line => line.trim().length > 0);

    // Convert each line to { timestamp, feeder }
    const items = lines.map(line => {
      const [timestamp, feeder] = line.split(',');
      return { timestamp, feeder };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ items: [], message: 'File is empty or not found.' });
  }
}