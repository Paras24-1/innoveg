import { NextResponse } from 'next/server';
import { db, getTodayDateString } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || getTodayDateString();
    const employeeId = searchParams.get('employeeId');

    const employees = await db.getEmployees();
    const records = await db.getDailyAttendances(date);

    // Merge with master 44 employee roster so every officer has a status row
    const fullRosterAttendance = employees.map((emp) => {
      const existing = records.find((r) => r.employeeId === emp.id || r.employeeMobile === emp.mobileNumber);
      if (existing) {
        return existing;
      }
      return {
        id: `att-empty-${emp.id}-${date}`,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeMobile: emp.mobileNumber,
        date,
        tourPlan: null,
        tourPlanSubmittedAt: null,
        punchInTime: null,
        punchInLat: null,
        punchInLng: null,
        punchInLocationName: null,
        punchInMeterPhoto: null,
        startKm: null,
        isLate: false,
        punchOutTime: null,
        punchOutLat: null,
        punchOutLng: null,
        punchOutLocationName: null,
        punchOutMeterPhoto: null,
        endKm: null,
        totalOdometerKm: 0,
        totalGpsKm: 0,
        kmDifference: 0,
        kmApprovalStatus: 'AUTO_APPROVED' as const,
        completedVisits: 0,
        attendanceStatus: 'ABSENT' as const,
      };
    });

    if (employeeId) {
      const single = fullRosterAttendance.find((a) => a.employeeId === employeeId);
      return NextResponse.json({ success: true, date, attendance: single || null });
    }

    return NextResponse.json({
      success: true,
      date,
      count: fullRosterAttendance.length,
      attendance: fullRosterAttendance,
    });
  } catch (err: any) {
    console.error('GET /api/attendance error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
