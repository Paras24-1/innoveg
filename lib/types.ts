export type VisitType =
  | 'Farmer Visit'
  | 'Dealer Visit'
  | 'Distributor Visit'
  | 'Field Visit'
  | 'Field Program'
  | 'Other';

export interface Employee {
  id: string;
  empId: string;
  name: string;
  mobileNumber: string;
  designation: string;
  district: string;
  territory: string;
  dailyVisitTarget: number;
  avatarUrl?: string;
  isActive: boolean;
  joinedDate?: string;
}

export interface AIAnalysisResult {
  qualityScore: number; // 0 - 100
  isBlur: boolean;
  fieldVisible: boolean;
  personVisible: boolean;
  brandingVisible: boolean;
  visitTypeMatch: boolean;
  summaryHindi: string;
  summaryEnglish: string;
  tags: string[];
}

export interface Visit {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeMobile: string;
  territory: string;
  district: string;
  visitType: VisitType;
  entityName: string; // Dealer / Farmer / Program Name
  village: string;
  latitude: number;
  longitude: number;
  locationName: string;
  photoUrl: string;
  remarksBooking: string;
  isRepeatLocation: boolean;
  distanceFromPrevKm: number;
  aiAnalysis: AIAnalysisResult;
  timestamp: string; // ISO 8601
}

export type AttendanceStatus = 'FULL_DAY' | 'HALF_DAY' | 'ABSENT';
export type KMApprovalStatus = 'AUTO_APPROVED' | 'PENDING_REVIEW' | 'MANUALLY_APPROVED' | 'REJECTED';

export interface DailyAttendance {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeMobile: string;
  date: string; // YYYY-MM-DD
  
  // 6:00 AM Tour Plan
  tourPlan?: string | null;
  tourPlanSubmittedAt?: string | null;

  // Morning Punch-In (Before 10:00 AM)
  punchInTime?: string | null;
  punchInLat?: number | null;
  punchInLng?: number | null;
  punchInLocationName?: string | null;
  punchInMeterPhoto?: string | null;
  startKm?: number | null;
  isLate: boolean;

  // Evening Punch-Out
  punchOutTime?: string | null;
  punchOutLat?: number | null;
  punchOutLng?: number | null;
  punchOutLocationName?: string | null;
  punchOutMeterPhoto?: string | null;
  endKm?: number | null;

  // KM Calculation & Audit
  totalOdometerKm: number;
  totalGpsKm: number;
  kmDifference: number;
  kmApprovalStatus: KMApprovalStatus;
  managerRemarks?: string | null;

  // Daily Visits & Performance Attendance Status
  completedVisits: number;
  attendanceStatus: AttendanceStatus;

  createdAt?: string;
  updatedAt?: string;
}

export type BotStep =
  | 'START'
  | 'SUBMIT_TOUR_PLAN'
  | 'PUNCH_IN_LOCATION'
  | 'PUNCH_IN_METER_PHOTO'
  | 'PUNCH_IN_KM'
  | 'SELECT_VISIT_TYPE'
  | 'COLLECT_DETAILS'
  | 'COLLECT_LOCATION'
  | 'COLLECT_PHOTO'
  | 'COLLECT_REMARKS'
  | 'PUNCH_OUT_LOCATION'
  | 'PUNCH_OUT_METER_PHOTO'
  | 'PUNCH_OUT_KM'
  | 'CONFIRMED';

export interface BotSession {
  mobileNumber: string;
  employeeId?: string;
  currentStep: BotStep;
  tempVisitData: {
    visitType?: VisitType;
    entityName?: string;
    village?: string;
    latitude?: number;
    longitude?: number;
    locationName?: string;
    photoUrl?: string;
    remarksBooking?: string;
    // Odometer & Punch data
    startKm?: number;
    endKm?: number;
    meterPhotoUrl?: string;
    tourPlanText?: string;
  };
  lastActive: string;
}

export interface DailySummary {
  date: string;
  totalEmployees: number;
  activeEmployees: number;
  totalVisits: number;
  uniqueLocations: number;
  repeatLocations: number;
  visitsByType: Record<VisitType, number>;
  totalEstimatedKm: number;
  overallTargetAchievementPercent: number;
  
  // PDF specific Attendance & KM counters
  presentCount: number;
  latePunchInCount: number;
  absentCount: number;
  halfDayCount: number;
  kmAutoApprovedCount: number;
  kmPendingReviewCount: number;

  topPerformers: {
    employeeName: string;
    district: string;
    visitsCount: number;
    targetAchievementPercent: number;
    travelKm: number;
  }[];
  lowPerformers: {
    employeeName: string;
    district: string;
    visitsCount: number;
    targetAchievementPercent: number;
  }[];
}
