import { db } from './db';
import { DailySummary, VisitType } from './types';
import { calculateTotalRouteKm } from './geo';

export async function generateDailyManagementSummary(targetDateStr?: string): Promise<DailySummary> {
  const dateStr = targetDateStr || new Date().toISOString().split('T')[0];
  const allEmployees = await db.getEmployees();
  const allVisits = await db.getVisits();
  const allAttendances = await db.getDailyAttendances(dateStr);

  // Filter visits for the specified date
  const dayVisits = allVisits.filter((v) => {
    return v.timestamp.startsWith(dateStr);
  });

  const activeEmployeeIds = new Set(dayVisits.map((v) => v.employeeId));

  const visitsByType: Record<VisitType, number> = {
    'Farmer Visit': 0,
    'Dealer Visit': 0,
    'Distributor Visit': 0,
    'Field Visit': 0,
    'Field Program': 0,
    'Other': 0,
  };

  let repeatCount = 0;
  let uniqueCount = 0;

  dayVisits.forEach((v) => {
    if (visitsByType[v.visitType] !== undefined) {
      visitsByType[v.visitType]++;
    } else {
      visitsByType['Other']++;
    }

    if (v.isRepeatLocation) {
      repeatCount++;
    } else {
      uniqueCount++;
    }
  });

  // Calculate per employee performance
  const employeePerformances = allEmployees.map((emp) => {
    const empVisits = dayVisits.filter((v) => v.employeeId === emp.id);
    const count = empVisits.length;
    // PDF Rule: Minimum daily target is 5 visits
    const target = 5;
    const targetAchievedPercent = Math.min(100, Math.round((count / target) * 100));
    
    // Sort chronological for route
    const chronological = [...empVisits].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const travelKm = calculateTotalRouteKm(chronological);

    return {
      employeeId: emp.id,
      employeeName: emp.name,
      district: emp.district,
      territory: emp.territory,
      visitsCount: count,
      target,
      targetAchievementPercent: targetAchievedPercent,
      travelKm,
      visits: empVisits,
    };
  });

  const totalEstimatedKm = Number(
    employeePerformances.reduce((acc, curr) => acc + curr.travelKm, 0).toFixed(1)
  );

  const totalTargetPlanned = allEmployees.length * 5;
  const overallTargetAchievementPercent = totalTargetPlanned > 0
    ? Math.round((dayVisits.length / totalTargetPlanned) * 100)
    : 0;

  const activePerformers = employeePerformances.filter((p) => p.visitsCount > 0);
  const sortedByVisits = [...activePerformers].sort((a, b) => b.visitsCount - a.visitsCount);

  const topPerformers = sortedByVisits.slice(0, 5).map((p) => ({
    employeeName: p.employeeName,
    district: p.district,
    visitsCount: p.visitsCount,
    targetAchievementPercent: p.targetAchievementPercent,
    travelKm: p.travelKm,
  }));

  const lowPerformers = employeePerformances
    .filter((p) => p.visitsCount < 3)
    .slice(0, 5)
    .map((p) => ({
      employeeName: p.employeeName,
      district: p.district,
      visitsCount: p.visitsCount,
      targetAchievementPercent: p.targetAchievementPercent,
    }));

  // PDF specific Attendance & KM counters
  let fullDayCount = 0;
  let halfDayCount = 0;
  let latePunchInCount = 0;
  let kmAutoApprovedCount = 0;
  let kmPendingReviewCount = 0;

  allAttendances.forEach((a) => {
    if (a.attendanceStatus === 'FULL_DAY') fullDayCount++;
    else if (a.attendanceStatus === 'HALF_DAY') halfDayCount++;
    
    if (a.isLate) latePunchInCount++;
    if (a.kmApprovalStatus === 'PENDING_REVIEW') kmPendingReviewCount++;
    else if (a.kmApprovalStatus === 'AUTO_APPROVED' || a.kmApprovalStatus === 'MANUALLY_APPROVED') {
      kmAutoApprovedCount++;
    }
  });

  const presentCount = fullDayCount + halfDayCount;
  const absentCount = Math.max(0, allEmployees.length - presentCount);

  return {
    date: dateStr,
    totalEmployees: allEmployees.length,
    activeEmployees: activeEmployeeIds.size,
    totalVisits: dayVisits.length,
    uniqueLocations: uniqueCount,
    repeatLocations: repeatCount,
    visitsByType,
    totalEstimatedKm,
    overallTargetAchievementPercent,
    presentCount,
    latePunchInCount,
    absentCount,
    halfDayCount,
    kmAutoApprovedCount,
    kmPendingReviewCount,
    topPerformers,
    lowPerformers,
  };
}

export function formatWhatsAppDailyReportText(summary: DailySummary): string {
  return `📊 *INNOVEG 7 PM DAILY EXECUTIVE PERFORMANCE REPORT*
📅 *Date:* ${summary.date}
━━━━━━━━━━━━━━━━━━━
👥 *Field Workforce:* ${summary.totalEmployees} Officers
🟢 *Present (Full Day $\ge$5 Visits):* ${summary.presentCount - (summary.halfDayCount || 0)}
🟡 *Half Day (3–4 Visits):* ${summary.halfDayCount || 0}
🔴 *Absent / Review (0–2 Visits):* ${summary.absentCount}
⏰ *Late Punch-In (>10:00 AM):* ${summary.latePunchInCount}

🚗 *Vehicle KM & Odometer Reconciliation:*
• Total Field Route: ~${summary.totalEstimatedKm} KM
• Auto-Approved KM ($\le$15 KM diff): ${summary.kmAutoApprovedCount} Officers
• Pending Manager Review (>15 KM diff): ${summary.kmPendingReviewCount} Officers

🎯 *Field Activity:*
• Total Visits Recorded: ${summary.totalVisits}
• Farmer Visits: ${summary.visitsByType['Farmer Visit']}
• Dealer Visits: ${summary.visitsByType['Dealer Visit']}
• Distributor Visits: ${summary.visitsByType['Distributor Visit']}
• Field Programs & Others: ${summary.visitsByType['Field Program'] + summary.visitsByType['Field Visit'] + summary.visitsByType['Other']}

🏆 *Top Performing Field Officers:*
${summary.topPerformers.map((p, idx) => `${idx + 1}. ${p.employeeName} (${p.district}) - ${p.visitsCount} visits | ${p.travelKm} KM`).join('\n') || 'None recorded'}

━━━━━━━━━━━━━━━━━━━
*InnoVeg Central Digital Operations Hub*`;
}
