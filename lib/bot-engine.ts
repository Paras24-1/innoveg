import { db, getTodayDateString } from './db';
import { VisitType, Visit, BotStep, BotSession } from './types';
import { calculateDistanceKm, calculateDistanceMeters, isDuplicateLocation } from './geo';
import { extractOdometerKm } from './gemini-ocr';

export interface BotIncomingMessage {
  fromMobile: string;
  body?: string;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  photoUrl?: string;
}

export interface BotResponse {
  replyText: string;
  currentStep: BotStep;
  quickReplies?: string[];
  requiresLocation?: boolean;
  requiresPhoto?: boolean;
  recordedVisit?: Visit;
}

const VISIT_TYPES: Record<string, VisitType> = {
  '1': 'Farmer Visit',
  'farmer visit': 'Farmer Visit',
  'farmer': 'Farmer Visit',
  '2': 'Dealer Visit',
  'dealer visit': 'Dealer Visit',
  'dealer': 'Dealer Visit',
  '3': 'Distributor Visit',
  'distributor visit': 'Distributor Visit',
  'distributor': 'Distributor Visit',
  '4': 'Field Visit',
  'field visit': 'Field Visit',
  'field': 'Field Visit',
  '5': 'Field Program',
  'field program': 'Field Program',
  'program': 'Field Program',
  '6': 'Other Visit',
  'other visit': 'Other Visit',
  'other': 'Other Visit',
};

export async function processIncomingWhatsAppMessage(
  msg: BotIncomingMessage
): Promise<BotResponse> {
  const cleanMobile = String(msg.fromMobile || '').replace(/[^0-9]/g, '');
  const tenDigit = cleanMobile.length > 10 ? cleanMobile.slice(-10) : cleanMobile;

  // Look up employee or auto-register if new mobile number
  let employee = await db.getEmployeeByMobile(tenDigit);

  if (!employee) {
    employee = await db.addEmployee({
      id: `emp-${Date.now()}`,
      empId: `INV-${Math.floor(100 + Math.random() * 900)}`,
      name: `Officer (${tenDigit})`,
      mobileNumber: tenDigit,
      designation: 'Field Officer',
      district: 'Amravati',
      territory: 'Field Zone',
      dailyVisitTarget: 5,
      isActive: true,
    });
  }

  let session: BotSession | null = await db.getSession(tenDigit);
  if (!session) {
    session = {
      mobileNumber: tenDigit,
      employeeId: employee.id,
      currentStep: 'START',
      tempVisitData: {},
      lastActive: new Date().toISOString(),
    };
  }

  const text = (msg.body || '').trim();
  const lowerText = text.toLowerCase();
  const firstName = employee.name.split(' ')[0] || 'Officer';

  // ==========================================
  // FLOW 1: TOUR PLAN SUBMISSION (06:00 AM)
  // ==========================================
  if (
    lowerText.startsWith('tour plan:') ||
    lowerText.startsWith('tour plan') ||
    lowerText.startsWith('plan:') ||
    session.currentStep === 'SUBMIT_TOUR_PLAN'
  ) {
    let planText = text.replace(/^(tour plan:?|plan:?)\s*/i, '').trim();

    if (!planText || planText.length < 3) {
      session.currentStep = 'SUBMIT_TOUR_PLAN';
      await db.saveSession(session);
      return {
        replyText: `📋 *06:00 AM Tour Plan*\n\n${firstName} जी, कृपया आज का Tour Plan भेजें (कि किन-किन गाँवों, किसानों और डीलरों से मिलना है).\n\nउदाहरण: *आज वरुड़ गाँव में 3 किसान विजिट और 2 डीलर विजिट (मल्टी एग्रो, श्रीराम ट्रेडर्स) प्लान है।*`,
        currentStep: 'SUBMIT_TOUR_PLAN',
      };
    }

    await db.submitTourPlan({
      employeeId: employee.id,
      tourPlan: planText,
    });

    session.currentStep = 'START';
    session.tempVisitData = {};
    await db.saveSession(session);

    return {
      replyText: `✅ *Tour Plan दर्ज कर लिया गया!*\n\n📝 योजना: ${planText}\n\n⚠️ *आवश्यक सूचना*: कृपया सुबह 10:00 AM से पहले *Punch In* करना अनिवार्य है, अन्यथा कंपनी नियमानुसार आपकी अनुपस्थिति (ABSENT) दर्ज की जाएगी।\n\n(Punch-In के लिए *Punch In* बटन दबाएं या लिखें).`,
      currentStep: 'START',
      quickReplies: ['Punch In'],
    };
  }

  // ==========================================
  // FLOW 2: MORNING PUNCH-IN (Before 10:00 AM)
  // ==========================================
  if (
    lowerText === 'punch in' ||
    lowerText === 'punchin' ||
    lowerText === 'punch-in' ||
    lowerText === 'पंच इन' ||
    lowerText === 'duty start' ||
    lowerText === 'in'
  ) {
    session.currentStep = 'PUNCH_IN_LOCATION';
    session.tempVisitData = {};
    await db.saveSession(session);

    return {
      replyText: `🌅 *Morning Punch-In (InnoVeg)*\n\n${firstName} जी, ड्यूटी शुरू करने के लिए कृपया अपनी 📌 **Current Location (GPS)** शेयर करें।\n\n*(WhatsApp 📎 Attachment -> Location चुनें या Latitude, Longitude लिखें)*`,
      currentStep: 'PUNCH_IN_LOCATION',
      requiresLocation: true,
    };
  }

  // Punch-In Step 1: Receiving Location
  if (session.currentStep === 'PUNCH_IN_LOCATION') {
    let lat: number | undefined;
    let lng: number | undefined;
    let locName = employee.territory;

    if (msg.location && !isNaN(Number(msg.location.latitude))) {
      lat = Number(msg.location.latitude);
      lng = Number(msg.location.longitude);
      if (msg.location.name) locName = msg.location.name;
    } else if (text.includes(',')) {
      const parts = text.split(',');
      const parsedLat = parseFloat(parts[0].trim());
      const parsedLng = parseFloat(parts[1].trim());
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        lat = parsedLat;
        lng = parsedLng;
      }
    }

    if (lat === undefined || lng === undefined) {
      return {
        replyText: `⚠️ लोकेशन नहीं मिली।\n\nकृपया WhatsApp से अपनी 📌 **Live/Current Location** भेजें या लिखें (जैसे *20.9320, 77.7523*).`,
        currentStep: 'PUNCH_IN_LOCATION',
        requiresLocation: true,
      };
    }

    session.tempVisitData.latitude = lat;
    session.tempVisitData.longitude = lng;
    session.tempVisitData.locationName = locName;
    session.currentStep = 'PUNCH_IN_METER_PHOTO';
    await db.saveSession(session);

    return {
      replyText: `📍 *लोकेशन प्राप्त हुई*: ${lat.toFixed(4)}, ${lng.toFixed(4)}\n\n📷 अब कृपया अपनी **गाड़ी के मीटर (Odometer) की स्पष्ट फोटो** भेजें।\n\n*(AI मीटर से KM अपने आप पढ़ लेगा या आप फोटो के साथ KM लिख सकते हैं)*`,
      currentStep: 'PUNCH_IN_METER_PHOTO',
      requiresPhoto: true,
    };
  }

  // Punch-In Step 2: Receiving Meter Photo & Start KM
  if (session.currentStep === 'PUNCH_IN_METER_PHOTO') {
    const photoUrl = msg.photoUrl || (text.startsWith('http') ? text : undefined);

    if (!photoUrl && !text.match(/\d{3,}/)) {
      return {
        replyText: `📷 कृपया गाड़ी के मीटर की फोटो भेजें या शुरुआती किलोमीटर लिखें (जैसे *25000*).`,
        currentStep: 'PUNCH_IN_METER_PHOTO',
        requiresPhoto: true,
      };
    }

    // Try AI/OCR extraction or fallback text
    const extracted = await extractOdometerKm(photoUrl || '', text);
    let startKm = extracted.km;

    if (!startKm) {
      // Prompt for explicit KM if unreadable
      session.tempVisitData.meterPhotoUrl = photoUrl;
      session.currentStep = 'PUNCH_IN_KM';
      await db.saveSession(session);

      return {
        replyText: `📷 फोटो प्राप्त हो गई!\n\nकृपया वर्तमान **Odometer KM Reading** संख्या में लिखकर भेजें (उदाहरण: *25000*).`,
        currentStep: 'PUNCH_IN_KM',
      };
    }

    session.tempVisitData.startKm = startKm;
    session.tempVisitData.meterPhotoUrl = photoUrl;

    const lat = session.tempVisitData.latitude || 21.7709;
    const lng = session.tempVisitData.longitude || 78.2575;

    const att = await db.recordPunchIn({
      employeeId: employee.id,
      lat,
      lng,
      locationName: session.tempVisitData.locationName,
      meterPhotoUrl: photoUrl,
      startKm,
    });

    session.currentStep = 'START';
    session.tempVisitData = {};
    await db.saveSession(session);

    const lateStatus = att.isLate
      ? '🔴 Late Mark (10:00 AM के बाद - अनुपस्थित / ABSENT दर्ज)'
      : '🟢 On-Time (समय पर)';

    return {
      replyText: `✅ *Morning Punch-In सफल!*\n\n👤 अधिकारी: ${employee.name}\n⏰ समय: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}\n🚦 स्थिति: ${lateStatus}\n🚗 शुरुआती KM: ${startKm} KM\n📍 स्थान: ${att.punchInLocationName || employee.territory}\n\n🎯 *विज़िट रिपोर्टिंग अनलॉक*: अब आप अपनी फील्ड विज़िट रिपोर्ट कर सकते हैं। Full Day उपस्थिति हेतु कम से कम 5 विज़िट्स अनिवार्य हैं।\n\nविजिट शुरू करने के लिए *New Visit* भेजें।`,
      currentStep: 'START',
      quickReplies: ['New Visit', 'Menu'],
    };
  }

  // Punch-In Step 3: Explicit KM fallback
  if (session.currentStep === 'PUNCH_IN_KM') {
    const num = parseFloat(text.replace(/[^0-9.]/g, ''));
    if (isNaN(num) || num <= 0) {
      return {
        replyText: `कृपया मान्य किलोमीटर संख्या भेजें (जैसे *25000*).`,
        currentStep: 'PUNCH_IN_KM',
      };
    }

    const lat = session.tempVisitData.latitude || 21.7709;
    const lng = session.tempVisitData.longitude || 78.2575;

    const att = await db.recordPunchIn({
      employeeId: employee.id,
      lat,
      lng,
      locationName: session.tempVisitData.locationName,
      meterPhotoUrl: session.tempVisitData.meterPhotoUrl,
      startKm: num,
    });

    session.currentStep = 'START';
    session.tempVisitData = {};
    await db.saveSession(session);

    const lateStatus = att.isLate ? '⚠️ Late Mark' : '✅ On-Time';

    return {
      replyText: `✅ *Morning Punch-In दर्ज!*\n\n🚗 शुरुआती KM: ${num} KM\n🚦 स्थिति: ${lateStatus}\n\nअब आप अपनी फील्ड विजिट शुरू कर सकते हैं। नई विजिट के लिए *New Visit* लिखें।`,
      currentStep: 'START',
      quickReplies: ['New Visit', 'Menu'],
    };
  }

  // ==========================================
  // FLOW 3: EVENING PUNCH-OUT & KM AUDIT
  // ==========================================
  if (
    lowerText === 'punch out' ||
    lowerText === 'punchout' ||
    lowerText === 'punch-out' ||
    lowerText === 'पंच आउट' ||
    lowerText === 'duty off' ||
    lowerText === 'out'
  ) {
    session.currentStep = 'PUNCH_OUT_LOCATION';
    session.tempVisitData = {};
    await db.saveSession(session);

    return {
      replyText: `🌇 *Evening Punch-Out (InnoVeg)*\n\n${firstName} जी, दिन का कार्य समाप्त करने के लिए कृपया अपनी 📌 **Current Location (GPS)** भेजें।`,
      currentStep: 'PUNCH_OUT_LOCATION',
      requiresLocation: true,
    };
  }

  // Punch-Out Step 1: Receiving Location
  if (session.currentStep === 'PUNCH_OUT_LOCATION') {
    let lat: number | undefined;
    let lng: number | undefined;

    if (msg.location && !isNaN(Number(msg.location.latitude))) {
      lat = Number(msg.location.latitude);
      lng = Number(msg.location.longitude);
    } else if (text.includes(',')) {
      const parts = text.split(',');
      const parsedLat = parseFloat(parts[0].trim());
      const parsedLng = parseFloat(parts[1].trim());
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        lat = parsedLat;
        lng = parsedLng;
      }
    }

    if (lat === undefined || lng === undefined) {
      return {
        replyText: `⚠️ लोकेशन नहीं मिली।\n\nकृपया WhatsApp से अपनी 📌 **Current Location** भेजें।`,
        currentStep: 'PUNCH_OUT_LOCATION',
        requiresLocation: true,
      };
    }

    session.tempVisitData.latitude = lat;
    session.tempVisitData.longitude = lng;
    session.currentStep = 'PUNCH_OUT_METER_PHOTO';
    await db.saveSession(session);

    return {
      replyText: `📍 लोकेशन प्राप्त हुई!\n\n📷 अब कृपया शाम के **गाड़ी के मीटर (Closing Odometer) की फोटो** भेजें।`,
      currentStep: 'PUNCH_OUT_METER_PHOTO',
      requiresPhoto: true,
    };
  }

  // Punch-Out Step 2: Receiving Closing Meter Photo
  if (session.currentStep === 'PUNCH_OUT_METER_PHOTO') {
    const photoUrl = msg.photoUrl || (text.startsWith('http') ? text : undefined);

    if (!photoUrl && !text.match(/\d{3,}/)) {
      return {
        replyText: `📷 कृपया शाम के मीटर की फोटो भेजें या अंतिम किलोमीटर लिखें।`,
        currentStep: 'PUNCH_OUT_METER_PHOTO',
        requiresPhoto: true,
      };
    }

    const extracted = await extractOdometerKm(photoUrl || '', text);
    let endKm = extracted.km;

    if (!endKm) {
      session.tempVisitData.meterPhotoUrl = photoUrl;
      session.currentStep = 'PUNCH_OUT_KM';
      await db.saveSession(session);

      return {
        replyText: `📷 फोटो प्राप्त हो गई!\n\nकृपया अंतिम **Closing Odometer KM** संख्या में लिखकर भेजें (उदाहरण: *25085*).`,
        currentStep: 'PUNCH_OUT_KM',
      };
    }

    const att = await db.recordPunchOut({
      employeeId: employee.id,
      lat: session.tempVisitData.latitude,
      lng: session.tempVisitData.longitude,
      meterPhotoUrl: photoUrl,
      endKm,
    });

    session.currentStep = 'START';
    session.tempVisitData = {};
    await db.saveSession(session);

    const approvalStatus =
      att.kmApprovalStatus === 'AUTO_APPROVED'
        ? 'Auto Approved ✅'
        : `⚠️ अंतर 15 KM से अधिक है (${att.kmDifference} KM अंतर) - मैनेजर रिव्यू के लिए भेजा गया`;

    const attText =
      att.attendanceStatus === 'FULL_DAY'
        ? 'Full Day (पूरा दिन) 🟢'
        : att.attendanceStatus === 'HALF_DAY'
        ? 'Half Day (आधा दिन) 🟡'
        : 'Absent / Review 🔴';

    const payout = Math.round(att.totalOdometerKm * 3);

    return {
      replyText: `🏁 *Evening Punch-Out सफल!*\n\n📊 *आज का दैनिक विवरण:*\n👤 अधिकारी: ${employee.name}\n🚗 कुल ओडोमीटर KM: ${att.totalOdometerKm} KM\n💰 यात्रा भुगतान (@ ₹3/KM): *₹${payout.toLocaleString('en-IN')}*\n📍 GPS Tracked KM: ${att.totalGpsKm} KM\n📐 अंतर: ${att.kmDifference} KM (${approvalStatus})\n🎯 कुल Field Visits: ${att.completedVisits}\n🏷️ Attendance Status: *${attText}*\n\nधन्यवाद! आज का कार्य सफलतापूर्वक समाप्त हुआ।`,
      currentStep: 'START',
    };
  }

  // Punch-Out Step 3: Explicit End KM fallback
  if (session.currentStep === 'PUNCH_OUT_KM') {
    const endKm = parseFloat(text.replace(/[^0-9.]/g, ''));
    if (isNaN(endKm) || endKm <= 0) {
      return {
        replyText: `कृपया मान्य अंतिम किलोमीटर संख्या भेजें (जैसे *25085*).`,
        currentStep: 'PUNCH_OUT_KM',
      };
    }

    const att = await db.recordPunchOut({
      employeeId: employee.id,
      lat: session.tempVisitData.latitude,
      lng: session.tempVisitData.longitude,
      meterPhotoUrl: session.tempVisitData.meterPhotoUrl,
      endKm,
    });

    session.currentStep = 'START';
    session.tempVisitData = {};
    await db.saveSession(session);

    const approvalStatus =
      att.kmApprovalStatus === 'AUTO_APPROVED'
        ? 'Auto Approved ✅'
        : `⚠️ अंतर 15 KM से अधिक (${att.kmDifference} KM अंतर) - मैनेजर रिव्यू`;

    const attText =
      att.attendanceStatus === 'FULL_DAY'
        ? 'Full Day 🟢'
        : att.attendanceStatus === 'HALF_DAY'
        ? 'Half Day 🟡'
        : 'Absent / Review 🔴';

    return {
      replyText: `🏁 *Punch-Out दर्ज!*\n\n🚗 Odometer KM: ${att.totalOdometerKm} KM\n📍 GPS KM: ${att.totalGpsKm} KM\n📐 अंतर: ${att.kmDifference} KM (${approvalStatus})\n🎯 कुल Visits: ${att.completedVisits}\n🏷️ Attendance: *${attText}*\n\nधन्यवाद!`,
      currentStep: 'START',
    };
  }

  // ==========================================
  // FLOW 4: FIELD VISITS (Min. 5 Targets)
  // ==========================================

  // Reset or start new visit command anytime
  if (
    !session.currentStep ||
    session.currentStep === 'START' ||
    lowerText === 'new visit' ||
    lowerText === 'hi' ||
    lowerText === 'hello' ||
    lowerText === 'hey' ||
    lowerText === 'start' ||
    lowerText === 'namaste' ||
    lowerText === 'restart' ||
    lowerText === 'reset' ||
    lowerText === 'menu' ||
    lowerText === '0'
  ) {
    // STRICT CLIENT REQUIREMENT: Punch-In Gatekeeper
    // Employees CANNOT report visits until they have punched in for today!
    const todayStr = getTodayDateString();
    const todayAtt = await db.getAttendanceByEmployeeAndDate(employee.id, todayStr);

    if (!todayAtt || !todayAtt.punchInTime) {
      return {
        replyText: `⚠️ *Punch-In आवश्यक है!*\n\n${firstName} जी, फील्ड विजिट रिपोर्ट करने से पहले सुबह 10:00 AM से पहले *Punch In* करना अनिवार्य है।\n\n(कृपया पहले *Punch In* बटन दबाएं और अपनी लाइव लोकेशन व मीटर फोटो भेजें).`,
        currentStep: 'START',
        quickReplies: ['Punch In', 'Tour Plan:'],
      };
    }

    session.currentStep = 'SELECT_VISIT_TYPE';
    session.tempVisitData = {};
    await db.saveSession(session);

    return {
      replyText: `नमस्कार ${firstName} जी 👋\n\nनई Field Visit दर्ज करने के लिए Visit Type चुनें:\n\n1️⃣ Farmer Visit\n2️⃣ Dealer Visit\n3️⃣ Distributor Visit\n4️⃣ Field Visit\n5️⃣ Field Program\n6️⃣ Other Visit\n\n*(संख्या 1-6 लिखें या विकल्प चुनें)*`,
      currentStep: 'SELECT_VISIT_TYPE',
      quickReplies: [
        '1. Farmer Visit',
        '2. Dealer Visit',
        '3. Distributor Visit',
        '4. Field Visit',
        '5. Field Program',
        '6. Other Visit',
      ],
    };
  }

  // Step 1: Selecting Visit Type
  if (session.currentStep === 'SELECT_VISIT_TYPE') {
    const matchedType =
      VISIT_TYPES[lowerText] ||
      VISIT_TYPES[text.replace(/^[0-9]\.\s*/, '').toLowerCase()] ||
      VISIT_TYPES[text.replace(/[^0-9]/g, '')];

    if (!matchedType) {
      return {
        replyText: `⚠️ कृपया 1 से 6 के बीच मान्य Visit Type चुनें:\n\n1. Farmer Visit\n2. Dealer Visit\n3. Distributor Visit\n4. Field Visit\n5. Field Program\n6. Other Visit`,
        currentStep: 'SELECT_VISIT_TYPE',
        quickReplies: [
          '1. Farmer Visit',
          '2. Dealer Visit',
          '3. Distributor Visit',
          '4. Field Visit',
          '5. Field Program',
          '6. Other Visit',
        ],
      };
    }

    session.tempVisitData.visitType = matchedType;
    session.currentStep = 'COLLECT_NAME';
    await db.saveSession(session);

    const typeLabel = matchedType === 'Dealer Visit' ? 'Dealer का नाम' : (matchedType === 'Farmer Visit' ? 'Farmer का नाम' : 'संबंधित व्यक्ति / संस्था का नाम');

    return {
      replyText: `📝 *${matchedType} चुना गया*\n\n1️⃣ कृपया *${typeLabel}* लिखकर भेजें।\n\n(उदा: Shiv Shakti Krishi Kendra / Rameshwar Patel)`,
      currentStep: 'COLLECT_NAME',
    };
  }

  // Step 2A: Collecting Name
  if (session.currentStep === 'COLLECT_NAME') {
    if (!text || text.length < 2) {
      return {
        replyText: `⚠️ कृपया मान्य नाम भेजें (कम से कम 2 अक्षर).\n\n(उदा: Shiv Shakti Krishi Kendra)`,
        currentStep: 'COLLECT_NAME',
      };
    }

    session.tempVisitData.entityName = text.trim();
    session.currentStep = 'COLLECT_MOBILE';
    await db.saveSession(session);

    return {
      replyText: `👤 नाम दर्ज: *${text.trim()}*\n\n2️⃣ कृपया इनका *Contact Mobile Number* (10 अंकों का मोबाइल नंबर) भेजें।`,
      currentStep: 'COLLECT_MOBILE',
    };
  }

  // Step 2B: Collecting Mobile Number
  if (session.currentStep === 'COLLECT_MOBILE') {
    const cleanNum = text.replace(/[^0-9]/g, '');
    const mobileNum = cleanNum.length > 10 ? cleanNum.slice(-10) : cleanNum;

    if (!mobileNum || mobileNum.length < 10) {
      return {
        replyText: `⚠️ कृपया 10 अंकों का मान्य मोबाइल नंबर भेजें (जैसे 9876543210).`,
        currentStep: 'COLLECT_MOBILE',
      };
    }

    session.tempVisitData.remarksBooking = `Mobile: ${mobileNum}`;
    session.currentStep = 'COLLECT_CITY';
    await db.saveSession(session);

    return {
      replyText: `📱 मोबाइल नंबर दर्ज: *${mobileNum}*\n\n3️⃣ कृपया *City / Town / Village* (शहर या गाँव का नाम) भेजें।\n\n(उदा: Multai / Dunawa)`,
      currentStep: 'COLLECT_CITY',
    };
  }

  // Step 2C: Collecting City / Village
  if (session.currentStep === 'COLLECT_CITY') {
    if (!text || text.length < 2) {
      return {
        replyText: `⚠️ कृपया मान्य शहर या गाँव का नाम भेजें (कम से कम 2 अक्षर).`,
        currentStep: 'COLLECT_CITY',
      };
    }

    const city = text.trim();
    session.tempVisitData.village = city;
    session.currentStep = 'COLLECT_LOCATION';
    await db.saveSession(session);

    return {
      replyText: `🏘️ शहर/गाँव दर्ज: *${city}*\n\n📍 अब कृपया WhatsApp से अपनी 📌 **Current Location (GPS)** शेयर करें।\n\n*(WhatsApp 📎 Attachment -> Location भेजें)*`,
      currentStep: 'COLLECT_LOCATION',
      requiresLocation: true,
    };
  }

  // Step 3: Collecting GPS Location (Point 1 - Arrival)
  if (session.currentStep === 'COLLECT_LOCATION') {
    let lat: number | undefined;
    let lng: number | undefined;
    let locationName = session.tempVisitData.village || employee.territory;

    if (msg.location && !isNaN(Number(msg.location.latitude)) && !isNaN(Number(msg.location.longitude))) {
      lat = Number(msg.location.latitude);
      lng = Number(msg.location.longitude);
      if (msg.location.name) locationName = msg.location.name;
    }

    // Anti-Fraud: Block plain text coordinates (forces native WhatsApp GPS share)
    if (lat === undefined || lng === undefined) {
      return {
        replyText: `⚠️ लोकेशन नहीं मिली।\n\nकृपया WhatsApp 📎 Attachment -> 📍 **Location** फीचर से अपनी वास्तविक Live GPS Location शेयर करें।\n\n*(सुरक्षा नियमानुसार टेक्स्ट में लिखे कोऑर्डिनेट्स मान्य नहीं हैं)*`,
        currentStep: 'COLLECT_LOCATION',
        requiresLocation: true,
      };
    }

    session.tempVisitData.latitude = lat;
    session.tempVisitData.longitude = lng;
    session.tempVisitData.locationName = locationName;
    session.tempVisitData.location1Time = Date.now();
    session.currentStep = 'COLLECT_PHOTO';
    await db.saveSession(session);

    return {
      replyText: `📍 *1st GPS (Arrival) प्राप्त*: ${lat.toFixed(5)}, ${lng.toFixed(5)}\n\n📷 अब Visit की **Live Photo** भेजें (कैमरे से फोटो खींचकर भेजें).`,
      currentStep: 'COLLECT_PHOTO',
      requiresPhoto: true,
    };
  }

  // Step 4: Collecting Photo (Zero AI analysis)
  if (session.currentStep === 'COLLECT_PHOTO') {
    const photoUrl = msg.photoUrl || (text.startsWith('http') ? text : undefined);

    if (!photoUrl) {
      return {
        replyText: `📷 कृपया Visit की फोटो भेजें।`,
        currentStep: 'COLLECT_PHOTO',
        requiresPhoto: true,
      };
    }

    session.tempVisitData.photoUrl = photoUrl;
    session.currentStep = 'COLLECT_REMARKS';
    await db.saveSession(session);

    return {
      replyText: `📷 फोटो प्राप्त हो गई!\n\n📝 *अनिवार्य*: कृपया इस Visit के लिए **Remarks (विज़िट चर्चा या विवरण)** लिखकर भेजें।\n\n*(कंपनी नियमानुसार Remarks देना अनिवार्य है)*`,
      currentStep: 'COLLECT_REMARKS',
    };
  }

  // Step 5: Compulsory Remarks -> Transitions to Step 6 (2nd GPS Verification)
  if (session.currentStep === 'COLLECT_REMARKS') {
    if (!text || text.length < 3 || lowerText === 'skip' || lowerText === 'none') {
      return {
        replyText: `⚠️ *Remarks देना अनिवार्य है!*\n\nकृपया इस विज़िट का विवरण, किसान/डीलर की आवश्यकता या चर्चा के बिंदु लिखें। (Skip मान्य नहीं है).`,
        currentStep: 'COLLECT_REMARKS',
      };
    }

    const remarks = text.trim();
    session.tempVisitData.remarksBooking = remarks;
    session.currentStep = 'VERIFY_LOCATION';
    await db.saveSession(session);

    return {
      replyText: `📝 *Remarks दर्ज हो गए!*\n\n📍 *अंतिम सत्यापन (Two-Point GPS Audit)*:\nकृपया विज़िट समाप्ति पर अपनी **Current Live GPS Location** एक बार पुनः शेयर करें।\n\n*(कंपनी सुरक्षा नियमानुसार फर्जी पिन या पुरानी लोकेशन रोकने हेतु 2nd GPS अनिवार्य है)*`,
      currentStep: 'VERIFY_LOCATION',
      requiresLocation: true,
    };
  }

  // Step 6: 2nd GPS Location & Drift Analysis (Two-Point GPS Drift Detection)
  if (session.currentStep === 'VERIFY_LOCATION') {
    let verifyLat: number | undefined;
    let verifyLng: number | undefined;

    if (msg.location && !isNaN(Number(msg.location.latitude)) && !isNaN(Number(msg.location.longitude))) {
      verifyLat = Number(msg.location.latitude);
      verifyLng = Number(msg.location.longitude);
    }

    if (verifyLat === undefined || verifyLng === undefined) {
      return {
        replyText: `⚠️ अंतिम सत्यापन हेतु GPS लोकेशन प्राप्त नहीं हुई।\n\nकृपया WhatsApp 📎 Attachment -> 📍 **Location** से अपनी करंट लाइव लोकेशन शेयर करें।\n\n*(टेक्स्ट कोऑर्डिनेट्स मान्य नहीं हैं)*`,
        currentStep: 'VERIFY_LOCATION',
        requiresLocation: true,
      };
    }

    const lat1 = Number(session.tempVisitData.latitude);
    const lng1 = Number(session.tempVisitData.longitude);
    const driftMeters = calculateDistanceMeters(lat1, lng1, verifyLat, verifyLng);

    // Two-Point GPS Drift Evaluation:
    // 1) 0m (or < 1m) = 100% Bit-for-bit identical -> Fake Static Pinned Location (FLAGGED)
    // 2) > 800m = Excessive drift during a short visit -> Location mismatch (FLAGGED)
    // 3) 1m to 800m = Natural hardware GPS drift / officer walking around -> VERIFIED!
    let verificationStatus: 'VERIFIED' | 'FLAGGED' = 'VERIFIED';
    let driftBadge = '';

    if (driftMeters < 1) {
      verificationStatus = 'FLAGGED';
      driftBadge = `⚠️ *संदिग्ध (0m Drift)*: दोनों GPS बिल्कुल एक समान हैं। यह स्थिर पिन (Static Pinned Location) दर्शाता है।`;
    } else if (driftMeters > 800) {
      verificationStatus = 'FLAGGED';
      driftBadge = `⚠️ *संदिग्ध (${driftMeters}m Drift)*: विज़िट के दौरान असामान्य अधिक दूरी दर्ज हुई।`;
    } else {
      verificationStatus = 'VERIFIED';
      driftBadge = `✅ *GPS सत्यापित (${driftMeters}m natural drift)*: विज़िट वास्तविक है।`;
    }

    // Retrieve previous visits to calculate distance & repeat location
    const todayVisits = await db.getTodayVisitsByEmployee(employee.id);
    const lastVisit = todayVisits.length > 0 ? todayVisits[0] : undefined;
    let distanceFromPrev = 0;
    if (lastVisit) {
      distanceFromPrev = calculateDistanceKm(lastVisit.latitude, lastVisit.longitude, lat1, lng1);
    }

    const allEmpVisits = await db.getVisitsByEmployee(employee.id);
    const isRepeat = isDuplicateLocation(lat1, lng1, allEmpVisits, 150);

    const visitType = session.tempVisitData.visitType || 'Farmer Visit';
    const entityName = session.tempVisitData.entityName || 'Field Visit';
    const village = session.tempVisitData.village || employee.territory;
    const remarks = session.tempVisitData.remarksBooking || '';

    const newVisit: Visit = {
      id: `v-${Date.now()}`,
      employeeId: employee.id,
      employeeName: employee.name,
      employeeMobile: employee.mobileNumber,
      district: employee.district,
      territory: employee.territory,
      visitType,
      entityName,
      contactName: entityName,
      contactMobile: session.tempVisitData.remarksBooking?.match(/\d{10}/)?.[0] || '',
      city: village,
      village,
      latitude: lat1,
      longitude: lng1,
      locationName: session.tempVisitData.locationName || `${village}, ${employee.district}`,
      photoUrl: session.tempVisitData.photoUrl || 'https://images.unsplash.com/photo-1592417817098-8f3d6eb22513?w=600&auto=format&fit=crop&q=80',
      remarksBooking: remarks,
      isRepeatLocation: isRepeat,
      distanceFromPrevKm: distanceFromPrev,
      humanVerificationStatus: verificationStatus,
      gpsDriftMeters: driftMeters,
      verificationNote: driftBadge,
      timestamp: new Date().toISOString(),
    };

    const savedVisit = await db.addVisit(newVisit);
    await db.clearSession(tenDigit);

    const todayCount = todayVisits.length + 1;
    const target = 5;
    const remaining = Math.max(0, target - todayCount);

    let targetStatus = '';
    if (todayCount >= 5) {
      targetStatus = `🎉 *बधाई हो! आज का Daily Target (${todayCount} Visits) पूरा! Full Day Attendance पक्की! 🟢*`;
    } else if (todayCount >= 3) {
      targetStatus = `📌 *आज ${todayCount} Visits पूरी (Half Day 🟡)*\nFull Day के लिए ${remaining} और विजिट करें।`;
    } else {
      targetStatus = `📌 आज ${todayCount} Visits पूरी। Full Day (5 Visits) के लिए ${remaining} और आवश्यक हैं।`;
    }

    return {
      replyText: `✅ *Field Visit सफलतापूर्वक दर्ज!* (#${todayCount})\n\n🏢 प्रकार: ${visitType}\n👤 नाम: ${entityName}\n🏘️ शहर/गाँव: ${village}\n📝 Remarks: ${remarks}\n📍 GPS Drift: ${driftMeters} मीटर\n🛡️ सुरक्षा जांच: ${driftBadge}\n🚗 पिछली विजिट से दूरी: ${distanceFromPrev} KM\n\n${targetStatus}\n\nअगली विजिट दर्ज करने के लिए *New Visit* भेजें या शाम को *Punch Out* करें।`,
      currentStep: 'START',
      quickReplies: ['New Visit', 'Punch Out', 'Menu'],
      recordedVisit: savedVisit,
    };
  }

  // Fallback
  return {
    replyText: `नमस्ते ${firstName} जी। कृपया मुख्य मेनू देखने के लिए *Menu* लिखें या *Punch In* / *New Visit* / *Punch Out* चुनें।`,
    currentStep: 'START',
    quickReplies: ['Punch In', 'New Visit', 'Punch Out'],
  };
}
