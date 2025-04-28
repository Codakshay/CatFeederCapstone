import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const filePath = path.join(process.cwd(), 'feedSchedule.json');


// POST — Save list of scheduled hours and custom times to file
export async function POST(req: NextRequest) {
  try {
    const { hourSchedule, customSchedule } = await req.json();

    if (!Array.isArray(hourSchedule) || !Array.isArray(customSchedule)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const scheduleData = {
      hourSchedule,
      customSchedule,
      savedAt: new Date().toISOString(),
    };

    await fs.writeFile(filePath, JSON.stringify(scheduleData, null, 2));

    return NextResponse.json({ message: 'Schedule saved successfully' });
  } catch (error) {
    console.error('Error saving schedule:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

// GET - Return saved schedules or empty schedules if file doesn't exist
export async function GET() {
  try {
    // if file doesn't exist, will throw exception and return default json
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data);

    return NextResponse.json({
      hourSchedule: Array.isArray(parsed.hourSchedule) ? parsed.hourSchedule : [],
      customSchedule: Array.isArray(parsed.customSchedule) ? parsed.customSchedule : [],
      savedAt: parsed.savedAt ?? null,
    });
  } catch (error) {
    console.error('Error reading schedule:', error);
    return NextResponse.json({
      hourSchedule: [],
      customSchedule: [],
      savedAt: null,
    });
  }
}