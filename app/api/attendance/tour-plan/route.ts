import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, employeeMobile, tourPlan, date } = body;

    let targetEmployeeId = employeeId;
    if (!targetEmployeeId && employeeMobile) {
      const emp = await db.getEmployeeByMobile(employeeMobile);
      if (emp) targetEmployeeId = emp.id;
    }

    if (!targetEmployeeId || !tourPlan) {
      return NextResponse.json({
        success: false,
        error: 'employeeId (or employeeMobile) and tourPlan text are required',
      }, { status: 400 });
    }

    const att = await db.submitTourPlan({
      employeeId: targetEmployeeId,
      date,
      tourPlan,
    });

    return NextResponse.json({ success: true, attendance: att });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
