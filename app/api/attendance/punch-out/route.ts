import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractOdometerKm } from '@/lib/gemini-ocr';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, employeeMobile, date, time, latitude, longitude, locationName, meterPhotoUrl } = body;

    let targetEmployeeId = employeeId;
    if (!targetEmployeeId && employeeMobile) {
      const emp = await db.getEmployeeByMobile(employeeMobile);
      if (emp) targetEmployeeId = emp.id;
    }

    if (!targetEmployeeId) {
      return NextResponse.json({ success: false, error: 'employeeId or employeeMobile is required' }, { status: 400 });
    }

    let endKm = Number(body.endKm);
    if (isNaN(endKm) && meterPhotoUrl) {
      const extracted = await extractOdometerKm(meterPhotoUrl, body.text);
      if (extracted.km) endKm = extracted.km;
    }

    const att = await db.recordPunchOut({
      employeeId: targetEmployeeId,
      date,
      time,
      lat: latitude !== undefined ? Number(latitude) : undefined,
      lng: longitude !== undefined ? Number(longitude) : undefined,
      locationName,
      meterPhotoUrl,
      endKm: !isNaN(endKm) ? endKm : 0,
    });

    return NextResponse.json({ success: true, attendance: att });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
