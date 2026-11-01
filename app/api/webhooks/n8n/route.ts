import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Visit } from '@/lib/types';
import { calculateDistanceKm, isDuplicateLocation } from '@/lib/geo';
import { processIncomingWhatsAppMessage } from '@/lib/bot-engine';
import { extractOdometerKm } from '@/lib/gemini-ocr';

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
      !process.env.N8N_SECRET_TOKEN;

    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized: invalid N8N secret token' }, { status: 401 });
    }

    const body = await request.json();
    const action = String(body.action || '').toLowerCase();

    // 1. Direct interactive WhatsApp text / media message processing
    if (action === 'whatsapp_message' || (body.fromMobile && (body.body || body.location || body.photoUrl) && !body.visitType && !action)) {
      const response = await processIncomingWhatsAppMessage({
        fromMobile: body.fromMobile || body.employeeMobile,
        body: body.body || body.text || body.message,
        location: body.location,
        photoUrl: body.photoUrl,
      });
      return NextResponse.json({ success: true, botResponse: response });
    }

    const cleanMobile = String(body.employeeMobile || body.fromMobile || '').replace(/[\s\-\+]/g, '');
    const tenDigit = cleanMobile.length > 10 ? cleanMobile.slice(-10) : cleanMobile;

    if (!tenDigit) {
      return NextResponse.json({ success: false, error: 'employeeMobile or fromMobile is required' }, { status: 400 });
    }

    // Get employee or auto-register
    let employee = await db.getEmployeeByMobile(tenDigit);
    if (!employee) {
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
        dailyVisitTarget: 5,
        isActive: true,
      });
    }

    // 2. Action: Tour Plan
    if (action === 'tour_plan' || action === 'tour-plan') {
      const tourPlan = body.tourPlan || body.plan || body.text || 'No tour plan text';
      const date = body.date;
      const att = await db.submitTourPlan({
        employeeId: employee.id,
        date,
        tourPlan,
      });
      return NextResponse.json({ success: true, action: 'tour_plan', attendance: att });
    }

    // 3. Action: Morning Punch-In
    if (action === 'punch_in' || action === 'punch-in') {
      let startKm = Number(body.startKm);
      const meterPhoto = body.meterPhotoUrl || body.photoUrl || null;

      // Extract via AI if meter photo provided and startKm missing
      if (isNaN(startKm) && meterPhoto) {
        const extracted = await extractOdometerKm(meterPhoto, body.text);
        if (extracted.km) startKm = extracted.km;
      }

      if (isNaN(startKm) || startKm <= 0) {
        startKm = 0;
      }

      const att = await db.recordPunchIn({
        employeeId: employee.id,
        date: body.date,
        time: body.time,
        lat: body.latitude !== undefined ? Number(body.latitude) : undefined,
        lng: body.longitude !== undefined ? Number(body.longitude) : undefined,
        locationName: body.locationName || body.village,
        meterPhotoUrl: meterPhoto,
        startKm,
      });

      return NextResponse.json({ success: true, action: 'punch_in', attendance: att });
    }

    // 4. Action: Evening Punch-Out
    if (action === 'punch_out' || action === 'punch-out') {
      let endKm = Number(body.endKm);
      const meterPhoto = body.meterPhotoUrl || body.photoUrl || null;

      if (isNaN(endKm) && meterPhoto) {
        const extracted = await extractOdometerKm(meterPhoto, body.text);
        if (extracted.km) endKm = extracted.km;
      }

      if (isNaN(endKm) || endKm <= 0) {
        endKm = 0;
      }

      const att = await db.recordPunchOut({
        employeeId: employee.id,
        date: body.date,
        time: body.time,
        lat: body.latitude !== undefined ? Number(body.latitude) : undefined,
        lng: body.longitude !== undefined ? Number(body.longitude) : undefined,
        locationName: body.locationName || body.village,
        meterPhotoUrl: meterPhoto,
        endKm,
      });

      return NextResponse.json({ success: true, action: 'punch_out', attendance: att });
    }

    // 5. Action: Visit Recording (Default legacy and explicit)
    if (!body.visitType || body.latitude === undefined || body.longitude === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Missing required visit fields (visitType, latitude, longitude)',
      }, { status: 400 });
    }

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
        tags: [body.visitType || 'Farmer', 'n8n'],
      },
      timestamp: body.timestamp || new Date().toISOString(),
    };

    const savedVisit = await db.addVisit(newVisit);

    return NextResponse.json({ success: true, action: 'visit', visit: savedVisit });
  } catch (error: any) {
    console.error('N8N Webhook Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
