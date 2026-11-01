import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await db.initDailyAttendanceTable();
    return NextResponse.json({
      success: true,
      message: 'Successfully initialized DailyAttendance schema in Supabase PostgreSQL!',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
