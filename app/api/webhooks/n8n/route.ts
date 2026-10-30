import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Visit } from '@/lib/types';
import { calculateDistanceKm, isDuplicateLocation } from '@/lib/geo';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('authorization');
    const queryToken = searchParams.get('token');
    const N8N_SECRET = process.env.N8N_SECRET_TOKEN || 'n8n_secret';

    const isAuthorized =
      authHeader === `Bearer ${N8N_SECRET}` ||
      queryToken === N8N_SECRET ||
      !process.env.N8N_SECRET_TOKEN; // Permissive in dev/default mode

    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized: invalid N8N secret token' }, { status: 401 });
    }

    const body = await request.json();

    // Verify minimum required fields
    if (!body.employeeMobile || !body.visitType || body.latitude === undefined || body.longitude === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required fields (employeeMobile, visitType, latitude, longitude)' }, { status: 400 });
    }

    const cleanMobile = String(body.employeeMobile).replace(/[\s\-\+]/g, '');
    const tenDigit = cleanMobile.length > 10 ? cleanMobile.slice(-10) : cleanMobile;

    // Get employee details or auto-register if new mobile number
    let employee = await db.getEmployeeByMobile(tenDigit);
    
    if (!employee) {
      // Auto-register new field officer when a new mobile number sends a report
      const newName = body.employeeName || `Officer (${tenDigit})`;
      const newDistrict = body.district || 'Betul';
      const newTerritory = body.territory || body.village || `${newDistrict} Zone`;

      employee = await db.addEmployee({
        id: `emp-${Date.now()}`,
        empId: `INV-${Math.floor(100 + Math.random() * 900)}`,
        name: newName,
        mobileNumber: tenDigit,
        designation: 'Field Officer',
        district: newDistrict,
        territory: newTerritory,
        dailyVisitTarget: 10,
        isActive: true,
      });
    }

    // Calculate distance and repeat locations if not provided by n8n
    const todayVisits = await db.getTodayVisitsByEmployee(employee.id);
    const lastVisit = todayVisits.length > 0 ? todayVisits[0] : undefined;
    let distanceFromPrev = 0;
    if (lastVisit) {
      distanceFromPrev = calculateDistanceKm(lastVisit.latitude, lastVisit.longitude, Number(body.latitude), Number(body.longitude));
    }

    const allEmpVisits = await db.getVisitsByEmployee(employee.id);
    const isRepeat = isDuplicateLocation(Number(body.latitude), Number(body.longitude), allEmpVisits, 150);

    const newVisit: Visit = {
      id: `v-${Date.now()}`,
      employeeId: employee.id,
      employeeName: employee.name,
      employeeMobile: employee.mobileNumber,
      district: employee.district,
      territory: employee.territory,
      visitType: body.visitType,
      entityName: body.entityName || 'Entity',
      village: body.village || employee.territory,
      latitude: Number(body.latitude),
      longitude: Number(body.longitude),
      locationName: body.locationName || `${body.village || employee.territory}, ${employee.district}`,
      photoUrl: body.photoUrl || 'https://images.unsplash.com/photo-1592417817098-8f3d6eb22513?w=600&auto=format&fit=crop&q=80',
      remarksBooking: body.remarksBooking || 'No specific remarks',
      isRepeatLocation: body.isRepeatLocation !== undefined ? Boolean(body.isRepeatLocation) : isRepeat,
      distanceFromPrevKm: body.distanceFromPrevKm !== undefined ? Number(body.distanceFromPrevKm) : distanceFromPrev,
      aiAnalysis: body.aiAnalysis || {
        qualityScore: 80,
        isBlur: false,
        fieldVisible: true,
        personVisible: true,
        brandingVisible: false,
        visitTypeMatch: true,
        summaryHindi: 'Processed by n8n',
        summaryEnglish: 'Processed by n8n',
        tags: [body.visitType || 'Farmer', 'n8n']
      },
      timestamp: new Date().toISOString(),
    };

    const savedVisit = await db.addVisit(newVisit);

    return NextResponse.json({ success: true, visit: savedVisit });

  } catch (error: any) {
    console.error('N8N Webhook Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
