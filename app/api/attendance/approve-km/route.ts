import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { KMApprovalStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { attendanceId, status, managerRemarks } = body;

    if (!attendanceId || !status) {
      return NextResponse.json({
        success: false,
        error: 'attendanceId and status (MANUALLY_APPROVED / REJECTED) are required',
      }, { status: 400 });
    }

    const updated = await db.updateKmApproval(attendanceId, status as KMApprovalStatus, managerRemarks);

    return NextResponse.json({
      success: true,
      message: `KM status updated to ${status}`,
      attendance: updated,
    });
  } catch (err: any) {
    console.error('POST /api/attendance/approve-km error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
