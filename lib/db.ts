import { PrismaClient } from '@prisma/client';
import { Employee, Visit, DailyAttendance, AttendanceStatus, KMApprovalStatus } from './types';
import { INITIAL_EMPLOYEES, INITIAL_VISITS } from './seed-data';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export function getTodayDateString(): string {
  const now = new Date();
  // Format as YYYY-MM-DD
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// In-memory fallback cache when DATABASE_URL is not configured
let inMemoryEmployees: Employee[] = [...INITIAL_EMPLOYEES];
let inMemoryVisits: Visit[] = [...INITIAL_VISITS];
let inMemoryAttendances: DailyAttendance[] = [];
let inMemorySessions: Map<string, any> = new Map();

class DatabaseStore {
  // Ensure table exists on PostgreSQL
  async initDailyAttendanceTable(): Promise<void> {
    try {
      if (process.env.DATABASE_URL) {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "DailyAttendance" (
            "id" TEXT PRIMARY KEY,
            "employeeId" TEXT NOT NULL,
            "employeeName" TEXT NOT NULL,
            "employeeMobile" TEXT NOT NULL,
            "date" TEXT NOT NULL,
            "tourPlan" TEXT,
            "tourPlanSubmittedAt" TEXT,
            "punchInTime" TEXT,
            "punchInLat" DOUBLE PRECISION,
            "punchInLng" DOUBLE PRECISION,
            "punchInLocationName" TEXT,
            "punchInMeterPhoto" TEXT,
            "startKm" DOUBLE PRECISION,
            "isLate" BOOLEAN NOT NULL DEFAULT false,
            "punchOutTime" TEXT,
            "punchOutLat" DOUBLE PRECISION,
            "punchOutLng" DOUBLE PRECISION,
            "punchOutLocationName" TEXT,
            "punchOutMeterPhoto" TEXT,
            "endKm" DOUBLE PRECISION,
            "totalOdometerKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "totalGpsKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "kmDifference" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "kmApprovalStatus" TEXT NOT NULL DEFAULT 'AUTO_APPROVED',
            "managerRemarks" TEXT,
            "completedVisits" INTEGER NOT NULL DEFAULT 0,
            "attendanceStatus" TEXT NOT NULL DEFAULT 'ABSENT',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);
        await prisma.$executeRawUnsafe(`
          CREATE UNIQUE INDEX IF NOT EXISTS "DailyAttendance_employeeId_date_key" ON "DailyAttendance"("employeeId", "date");
        `);
      }
    } catch (e) {
      console.warn('initDailyAttendanceTable warning:', e);
    }
  }

  // Employee Methods
  async getEmployees(): Promise<Employee[]> {
    try {
      if (!process.env.DATABASE_URL) return inMemoryEmployees.filter((e) => e.isActive !== false);
      const emps = await prisma.employee.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
      if (!emps || emps.length === 0) return inMemoryEmployees.filter((e) => e.isActive !== false);
      return emps as unknown as Employee[];
    } catch (error) {
      console.warn('Prisma getEmployees error, returning fallback:', error);
      return inMemoryEmployees.filter((e) => e.isActive !== false);
    }
  }

  async getEmployeeById(id: string): Promise<Employee | null> {
    try {
      if (!process.env.DATABASE_URL) {
        return inMemoryEmployees.find((e) => e.id === id) || null;
      }
      const emp = await prisma.employee.findUnique({ where: { id } });
      return emp ? (emp as unknown as Employee) : (inMemoryEmployees.find((e) => e.id === id) || null);
    } catch (error) {
      console.warn('Prisma getEmployeeById error, returning fallback:', error);
      return inMemoryEmployees.find((e) => e.id === id) || null;
    }
  }

  async getEmployeeByMobile(mobileNumber: string): Promise<Employee | null> {
    const clean = mobileNumber.replace(/[\s\-\+]/g, '');
    const tenDigit = clean.length > 10 ? clean.slice(-10) : clean;

    const employees = await this.getEmployees();
    const emp = employees.find((e) => {
      const empClean = e.mobileNumber.replace(/[\s\-\+]/g, '');
      const empTenDigit = empClean.length > 10 ? empClean.slice(-10) : empClean;
      return empTenDigit === tenDigit;
    });
    return emp || null;
  }

  async addEmployee(emp: any): Promise<Employee> {
    const newEmp: Employee = {
      id: emp.id || `emp-${Date.now()}`,
      empId: emp.empId || `INV-${Math.floor(100 + Math.random() * 900)}`,
      name: String(emp.name || 'Field Officer').replace(/^=/, '').trim(),
      mobileNumber: emp.mobileNumber,
      designation: emp.designation || 'Field Officer',
      district: String(emp.district || 'Betul').replace(/^=/, '').trim(),
      territory: String(emp.territory || `${emp.district} General`).replace(/^=/, '').trim(),
      dailyVisitTarget: Number(emp.dailyVisitTarget) || 10,
      isActive: true,
    };

    try {
      if (process.env.DATABASE_URL) {
        const created = await prisma.employee.create({
          data: {
            id: newEmp.id,
            empId: newEmp.empId,
            name: newEmp.name,
            mobileNumber: newEmp.mobileNumber,
            designation: newEmp.designation,
            district: newEmp.district,
            territory: newEmp.territory,
            dailyVisitTarget: newEmp.dailyVisitTarget,
            isActive: true,
          },
        });
        inMemoryEmployees.unshift(created as unknown as Employee);
        return created as unknown as Employee;
      }
    } catch (error) {
      console.warn('Prisma addEmployee error:', error);
    }

    inMemoryEmployees.unshift(newEmp);
    return newEmp;
  }

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee | null> {
    const cleanUpdates: any = {};
    if (updates.name !== undefined) cleanUpdates.name = String(updates.name).replace(/^=/, '').trim();
    if (updates.empId !== undefined) cleanUpdates.empId = String(updates.empId).trim();
    if (updates.mobileNumber !== undefined) {
      const clean = String(updates.mobileNumber).replace(/[\s\-\+]/g, '');
      cleanUpdates.mobileNumber = clean.length > 10 ? clean.slice(-10) : clean;
    }
    if (updates.designation !== undefined) cleanUpdates.designation = String(updates.designation).trim();
    if (updates.district !== undefined) cleanUpdates.district = String(updates.district).replace(/^=/, '').trim();
    if (updates.territory !== undefined) cleanUpdates.territory = String(updates.territory).replace(/^=/, '').trim();
    if (updates.dailyVisitTarget !== undefined) cleanUpdates.dailyVisitTarget = Number(updates.dailyVisitTarget) || 10;
    if (updates.isActive !== undefined) cleanUpdates.isActive = Boolean(updates.isActive);

    try {
      if (process.env.DATABASE_URL) {
        const updated = await prisma.employee.update({
          where: { id },
          data: cleanUpdates,
        });
        const index = inMemoryEmployees.findIndex((e) => e.id === id);
        if (index !== -1) inMemoryEmployees[index] = updated as unknown as Employee;
        return updated as unknown as Employee;
      }
    } catch (error) {
      console.warn('Prisma updateEmployee error:', error);
    }

    const index = inMemoryEmployees.findIndex((e) => e.id === id);
    if (index !== -1) {
      inMemoryEmployees[index] = { ...inMemoryEmployees[index], ...cleanUpdates };
      return inMemoryEmployees[index];
    }
    return null;
  }

  // Visit Methods
  async getVisits(): Promise<Visit[]> {
    try {
      if (!process.env.DATABASE_URL) return inMemoryVisits;
      const visits = await prisma.visit.findMany({
        orderBy: { timestamp: 'desc' },
      });
      return visits.map((v) => this.mapPrismaVisit(v));
    } catch (error) {
      console.warn('Prisma getVisits error, returning fallback:', error);
      return inMemoryVisits;
    }
  }

  async getTodayVisitsByEmployee(employeeId: string, dateStr?: string): Promise<Visit[]> {
    const today = dateStr || getTodayDateString();
    try {
      if (process.env.DATABASE_URL) {
        const visits = await prisma.visit.findMany({
          where: {
            employeeId,
            timestamp: { startsWith: today },
          },
          orderBy: { timestamp: 'desc' },
        });
        return visits.map((v) => this.mapPrismaVisit(v));
      }
    } catch (error) {
      console.warn('Prisma getTodayVisitsByEmployee error:', error);
    }

    return inMemoryVisits.filter((v) => v.employeeId === employeeId && v.timestamp.startsWith(today));
  }

  async getVisitsByEmployee(employeeId: string): Promise<Visit[]> {
    try {
      if (process.env.DATABASE_URL) {
        const visits = await prisma.visit.findMany({
          where: { employeeId },
          orderBy: { timestamp: 'desc' },
        });
        return visits.map((v) => this.mapPrismaVisit(v));
      }
    } catch (error) {
      console.warn('Prisma getVisitsByEmployee error:', error);
    }

    return inMemoryVisits.filter((v) => v.employeeId === employeeId);
  }

  async addVisit(visit: Visit): Promise<Visit> {
    const safeLat = typeof visit.latitude === 'number' && !isNaN(visit.latitude) ? visit.latitude : 21.7709;
    const safeLng = typeof visit.longitude === 'number' && !isNaN(visit.longitude) ? visit.longitude : 78.2575;

    const safeVisit: Visit = {
      ...visit,
      employeeName: String(visit.employeeName || 'Officer').replace(/^=/, '').trim(),
      village: String(visit.village || 'Field').replace(/^=/, '').trim(),
      entityName: String(visit.entityName || 'Entity').replace(/^=/, '').trim(),
      district: String(visit.district || 'Betul').replace(/^=/, '').trim(),
      locationName: String(visit.locationName || `${visit.village}, ${visit.district}`).replace(/^=/, '').trim(),
      remarksBooking: String(visit.remarksBooking || 'No specific remarks').replace(/^=/, '').trim(),
      latitude: safeLat,
      longitude: safeLng,
    };

    try {
      if (process.env.DATABASE_URL) {
        const aiAnalysis = safeVisit.aiAnalysis || {
          qualityScore: 80,
          isBlur: false,
          fieldVisible: true,
          personVisible: true,
          brandingVisible: false,
          visitTypeMatch: true,
          summaryHindi: '',
          summaryEnglish: '',
          tags: [],
        };

        const v = await prisma.visit.create({
          data: {
            id: safeVisit.id,
            employeeId: safeVisit.employeeId,
            employeeName: safeVisit.employeeName,
            employeeMobile: safeVisit.employeeMobile,
            territory: safeVisit.territory,
            district: safeVisit.district,
            visitType: safeVisit.visitType,
            entityName: safeVisit.entityName,
            village: safeVisit.village,
            latitude: safeLat,
            longitude: safeLng,
            locationName: safeVisit.locationName,
            photoUrl: safeVisit.photoUrl || '',
            remarksBooking: safeVisit.remarksBooking,
            isRepeatLocation: Boolean(safeVisit.isRepeatLocation),
            distanceFromPrevKm: Number(safeVisit.distanceFromPrevKm) || 0,
            timestamp: safeVisit.timestamp || new Date().toISOString(),
            aiQualityScore: Number(aiAnalysis.qualityScore) || 80,
            aiIsBlur: Boolean(aiAnalysis.isBlur),
            aiFieldVisible: Boolean(aiAnalysis.fieldVisible),
            aiPersonVisible: Boolean(aiAnalysis.personVisible),
            aiBrandingVisible: Boolean(aiAnalysis.brandingVisible),
            aiVisitTypeMatch: Boolean(aiAnalysis.visitTypeMatch),
            aiSummaryHindi: String(aiAnalysis.summaryHindi || ''),
            aiSummaryEnglish: String(aiAnalysis.summaryEnglish || ''),
            aiTags: JSON.stringify(Array.isArray(aiAnalysis.tags) ? aiAnalysis.tags : []),
          },
        });
        const mapped = this.mapPrismaVisit(v) as Visit;
        inMemoryVisits.unshift(mapped);

        // Update Daily Attendance visits count & attendance status
        await this.syncAttendanceVisits(safeVisit.employeeId, safeVisit.timestamp.split('T')[0]);
        return mapped;
      }
    } catch (error) {
      console.warn('Prisma addVisit error:', error);
    }

    inMemoryVisits.unshift(safeVisit);
    await this.syncAttendanceVisits(safeVisit.employeeId, safeVisit.timestamp.split('T')[0]);
    return safeVisit;
  }

  // ==========================================
  // Daily Attendance & KM Audit Methods
  // ==========================================

  async getDailyAttendances(dateStr?: string): Promise<DailyAttendance[]> {
    const date = dateStr || getTodayDateString();
    await this.initDailyAttendanceTable();

    try {
      if (process.env.DATABASE_URL) {
        const records = await prisma.dailyAttendance.findMany({
          where: { date },
          orderBy: { employeeName: 'asc' },
        });
        if (records && records.length > 0) {
          return records as unknown as DailyAttendance[];
        }
      }
    } catch (e) {
      console.warn('Prisma getDailyAttendances error:', e);
    }

    return inMemoryAttendances.filter((a) => a.date === date);
  }

  async getAttendanceByEmployeeAndDate(employeeId: string, dateStr?: string): Promise<DailyAttendance | null> {
    const date = dateStr || getTodayDateString();

    try {
      if (process.env.DATABASE_URL) {
        const record = await prisma.dailyAttendance.findUnique({
          where: {
            employeeId_date: {
              employeeId,
              date,
            },
          },
        });
        if (record) return record as unknown as DailyAttendance;
      }
    } catch (e) {
      console.warn('Prisma getAttendanceByEmployeeAndDate error:', e);
    }

    return inMemoryAttendances.find((a) => a.employeeId === employeeId && a.date === date) || null;
  }

  // 1. Submit 06:00 AM Tour Plan
  async submitTourPlan(params: {
    employeeId: string;
    date?: string;
    tourPlan: string;
  }): Promise<DailyAttendance> {
    const date = params.date || getTodayDateString();
    const emp = await this.getEmployeeById(params.employeeId);
    const empName = emp?.name || 'Officer';
    const empMobile = emp?.mobileNumber || '';

    const cleanPlan = String(params.tourPlan || '').trim();
    const submittedAt = new Date().toISOString();

    try {
      if (process.env.DATABASE_URL) {
        const record = await prisma.dailyAttendance.upsert({
          where: {
            employeeId_date: {
              employeeId: params.employeeId,
              date,
            },
          },
          create: {
            employeeId: params.employeeId,
            employeeName: empName,
            employeeMobile: empMobile,
            date,
            tourPlan: cleanPlan,
            tourPlanSubmittedAt: submittedAt,
            isLate: false,
            attendanceStatus: 'ABSENT',
            kmApprovalStatus: 'AUTO_APPROVED',
          },
          update: {
            tourPlan: cleanPlan,
            tourPlanSubmittedAt: submittedAt,
          },
        });
        return record as unknown as DailyAttendance;
      }
    } catch (e) {
      console.warn('Prisma submitTourPlan error:', e);
    }

    let existing = inMemoryAttendances.find((a) => a.employeeId === params.employeeId && a.date === date);
    if (!existing) {
      existing = {
        id: `att-${Date.now()}`,
        employeeId: params.employeeId,
        employeeName: empName,
        employeeMobile: empMobile,
        date,
        tourPlan: cleanPlan,
        tourPlanSubmittedAt: submittedAt,
        isLate: false,
        totalOdometerKm: 0,
        totalGpsKm: 0,
        kmDifference: 0,
        kmApprovalStatus: 'AUTO_APPROVED',
        completedVisits: 0,
        attendanceStatus: 'ABSENT',
      };
      inMemoryAttendances.unshift(existing);
    } else {
      existing.tourPlan = cleanPlan;
      existing.tourPlanSubmittedAt = submittedAt;
    }
    return existing;
  }

  // 2. Record Morning Punch-In (Before 10:00 AM)
  async recordPunchIn(params: {
    employeeId: string;
    date?: string;
    time?: string;
    lat?: number;
    lng?: number;
    locationName?: string;
    meterPhotoUrl?: string;
    startKm: number;
  }): Promise<DailyAttendance> {
    const date = params.date || getTodayDateString();
    const emp = await this.getEmployeeById(params.employeeId);
    const empName = emp?.name || 'Officer';
    const empMobile = emp?.mobileNumber || '';

    const now = new Date();
    const timeStr = params.time || now.toISOString();

    // Check if punch-in is after 10:00 AM local time
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const isLate = hours > 10 || (hours === 10 && minutes > 0);

    const startKmNum = Number(params.startKm) || 0;

    try {
      if (process.env.DATABASE_URL) {
        const record = await prisma.dailyAttendance.upsert({
          where: {
            employeeId_date: {
              employeeId: params.employeeId,
              date,
            },
          },
          create: {
            employeeId: params.employeeId,
            employeeName: empName,
            employeeMobile: empMobile,
            date,
            punchInTime: timeStr,
            punchInLat: params.lat || null,
            punchInLng: params.lng || null,
            punchInLocationName: params.locationName || null,
            punchInMeterPhoto: params.meterPhotoUrl || null,
            startKm: startKmNum,
            isLate,
            attendanceStatus: 'ABSENT',
            kmApprovalStatus: 'AUTO_APPROVED',
          },
          update: {
            punchInTime: timeStr,
            punchInLat: params.lat || null,
            punchInLng: params.lng || null,
            punchInLocationName: params.locationName || null,
            punchInMeterPhoto: params.meterPhotoUrl || null,
            startKm: startKmNum,
            isLate,
          },
        });
        return record as unknown as DailyAttendance;
      }
    } catch (e) {
      console.warn('Prisma recordPunchIn error:', e);
    }

    let existing = inMemoryAttendances.find((a) => a.employeeId === params.employeeId && a.date === date);
    if (!existing) {
      existing = {
        id: `att-${Date.now()}`,
        employeeId: params.employeeId,
        employeeName: empName,
        employeeMobile: empMobile,
        date,
        punchInTime: timeStr,
        punchInLat: params.lat,
        punchInLng: params.lng,
        punchInLocationName: params.locationName,
        punchInMeterPhoto: params.meterPhotoUrl,
        startKm: startKmNum,
        isLate,
        totalOdometerKm: 0,
        totalGpsKm: 0,
        kmDifference: 0,
        kmApprovalStatus: 'AUTO_APPROVED',
        completedVisits: 0,
        attendanceStatus: 'ABSENT',
      };
      inMemoryAttendances.unshift(existing);
    } else {
      existing.punchInTime = timeStr;
      existing.punchInLat = params.lat;
      existing.punchInLng = params.lng;
      existing.punchInLocationName = params.locationName;
      existing.punchInMeterPhoto = params.meterPhotoUrl;
      existing.startKm = startKmNum;
      existing.isLate = isLate;
    }
    return existing;
  }

  // 3. Record Evening Punch-Out & Calculate KM Reconciliation
  async recordPunchOut(params: {
    employeeId: string;
    date?: string;
    time?: string;
    lat?: number;
    lng?: number;
    locationName?: string;
    meterPhotoUrl?: string;
    endKm: number;
  }): Promise<DailyAttendance> {
    const date = params.date || getTodayDateString();
    const emp = await this.getEmployeeById(params.employeeId);
    const empName = emp?.name || 'Officer';
    const empMobile = emp?.mobileNumber || '';

    const now = new Date();
    const timeStr = params.time || now.toISOString();
    const endKmNum = Number(params.endKm) || 0;

    // Get current attendance to retrieve startKm
    const currentAtt = await this.getAttendanceByEmployeeAndDate(params.employeeId, date);
    const startKm = currentAtt?.startKm || 0;
    const totalOdoKm = Math.max(0, Number((endKmNum - startKm).toFixed(1)));

    // Calculate total GPS route distance for today's visits
    const todayVisits = await this.getTodayVisitsByEmployee(params.employeeId, date);
    let totalGps = 0;
    for (const v of todayVisits) {
      totalGps += Number(v.distanceFromPrevKm) || 0;
    }
    const totalGpsKm = Number(totalGps.toFixed(1));

    // Calculate difference
    const diff = Number(Math.abs(totalOdoKm - totalGpsKm).toFixed(1));

    // Rules from PDF:
    // Difference <= 15 KM: Auto Approved
    // Difference > 15 KM: Requires Manager Approval
    const kmApprovalStatus: KMApprovalStatus = diff <= 15 ? 'AUTO_APPROVED' : 'PENDING_REVIEW';

    // Visits performance attendance rule:
    // >= 5 visits: Full Day
    // 3-4 visits: Half Day
    // 0-2 visits: Absent / Review
    const visitCount = todayVisits.length;
    let attendanceStatus: AttendanceStatus = 'ABSENT';
    if (visitCount >= 5) {
      attendanceStatus = 'FULL_DAY';
    } else if (visitCount >= 3) {
      attendanceStatus = 'HALF_DAY';
    }

    try {
      if (process.env.DATABASE_URL) {
        const record = await prisma.dailyAttendance.upsert({
          where: {
            employeeId_date: {
              employeeId: params.employeeId,
              date,
            },
          },
          create: {
            employeeId: params.employeeId,
            employeeName: empName,
            employeeMobile: empMobile,
            date,
            punchOutTime: timeStr,
            punchOutLat: params.lat || null,
            punchOutLng: params.lng || null,
            punchOutLocationName: params.locationName || null,
            punchOutMeterPhoto: params.meterPhotoUrl || null,
            endKm: endKmNum,
            totalOdometerKm: totalOdoKm,
            totalGpsKm,
            kmDifference: diff,
            kmApprovalStatus,
            completedVisits: visitCount,
            attendanceStatus,
          },
          update: {
            punchOutTime: timeStr,
            punchOutLat: params.lat || null,
            punchOutLng: params.lng || null,
            punchOutLocationName: params.locationName || null,
            punchOutMeterPhoto: params.meterPhotoUrl || null,
            endKm: endKmNum,
            totalOdometerKm: totalOdoKm,
            totalGpsKm,
            kmDifference: diff,
            kmApprovalStatus,
            completedVisits: visitCount,
            attendanceStatus,
          },
        });
        return record as unknown as DailyAttendance;
      }
    } catch (e) {
      console.warn('Prisma recordPunchOut error:', e);
    }

    let existing = inMemoryAttendances.find((a) => a.employeeId === params.employeeId && a.date === date);
    if (!existing) {
      existing = {
        id: `att-${Date.now()}`,
        employeeId: params.employeeId,
        employeeName: empName,
        employeeMobile: empMobile,
        date,
        punchOutTime: timeStr,
        punchOutLat: params.lat,
        punchOutLng: params.lng,
        punchOutLocationName: params.locationName,
        punchOutMeterPhoto: params.meterPhotoUrl,
        endKm: endKmNum,
        totalOdometerKm: totalOdoKm,
        totalGpsKm,
        kmDifference: diff,
        kmApprovalStatus,
        completedVisits: visitCount,
        attendanceStatus,
        isLate: false,
      };
      inMemoryAttendances.unshift(existing);
    } else {
      existing.punchOutTime = timeStr;
      existing.punchOutLat = params.lat;
      existing.punchOutLng = params.lng;
      existing.punchOutLocationName = params.locationName;
      existing.punchOutMeterPhoto = params.meterPhotoUrl;
      existing.endKm = endKmNum;
      existing.totalOdometerKm = totalOdoKm;
      existing.totalGpsKm = totalGpsKm;
      existing.kmDifference = diff;
      existing.kmApprovalStatus = kmApprovalStatus;
      existing.completedVisits = visitCount;
      existing.attendanceStatus = attendanceStatus;
    }
    return existing;
  }

  // 4. Update attendance status whenever a visit is recorded
  async syncAttendanceVisits(employeeId: string, dateStr: string): Promise<void> {
    const todayVisits = await this.getTodayVisitsByEmployee(employeeId, dateStr);
    const visitCount = todayVisits.length;

    let totalGps = 0;
    for (const v of todayVisits) {
      totalGps += Number(v.distanceFromPrevKm) || 0;
    }
    const totalGpsKm = Number(totalGps.toFixed(1));

    let attendanceStatus: AttendanceStatus = 'ABSENT';
    if (visitCount >= 5) {
      attendanceStatus = 'FULL_DAY';
    } else if (visitCount >= 3) {
      attendanceStatus = 'HALF_DAY';
    }

    const currentAtt = await this.getAttendanceByEmployeeAndDate(employeeId, dateStr);
    const emp = await this.getEmployeeById(employeeId);

    const startKm = currentAtt?.startKm || 0;
    const endKm = currentAtt?.endKm || 0;
    const totalOdoKm = endKm > startKm ? Number((endKm - startKm).toFixed(1)) : (currentAtt?.totalOdometerKm || 0);
    const diff = Number(Math.abs(totalOdoKm - totalGpsKm).toFixed(1));
    const kmApprovalStatus: KMApprovalStatus =
      currentAtt?.kmApprovalStatus === 'MANUALLY_APPROVED'
        ? 'MANUALLY_APPROVED'
        : diff <= 15
        ? 'AUTO_APPROVED'
        : 'PENDING_REVIEW';

    try {
      if (process.env.DATABASE_URL) {
        await prisma.dailyAttendance.upsert({
          where: {
            employeeId_date: {
              employeeId,
              date: dateStr,
            },
          },
          create: {
            employeeId,
            employeeName: emp?.name || 'Officer',
            employeeMobile: emp?.mobileNumber || '',
            date: dateStr,
            completedVisits: visitCount,
            totalGpsKm,
            totalOdometerKm: totalOdoKm,
            kmDifference: diff,
            kmApprovalStatus,
            attendanceStatus,
          },
          update: {
            completedVisits: visitCount,
            totalGpsKm,
            kmDifference: diff,
            kmApprovalStatus,
            attendanceStatus,
          },
        });
        return;
      }
    } catch (e) {
      console.warn('Prisma syncAttendanceVisits error:', e);
    }

    let existing = inMemoryAttendances.find((a) => a.employeeId === employeeId && a.date === dateStr);
    if (existing) {
      existing.completedVisits = visitCount;
      existing.totalGpsKm = totalGpsKm;
      existing.kmDifference = diff;
      existing.kmApprovalStatus = kmApprovalStatus;
      existing.attendanceStatus = attendanceStatus;
    } else if (emp) {
      inMemoryAttendances.unshift({
        id: `att-${Date.now()}`,
        employeeId,
        employeeName: emp.name,
        employeeMobile: emp.mobileNumber,
        date: dateStr,
        isLate: false,
        totalOdometerKm: 0,
        totalGpsKm,
        kmDifference: 0,
        kmApprovalStatus: 'AUTO_APPROVED',
        completedVisits: visitCount,
        attendanceStatus,
      });
    }
  }

  // 5. Manager Approve / Reject KM Discrepancy
  async updateKmApproval(
    attendanceId: string,
    status: KMApprovalStatus,
    managerRemarks?: string
  ): Promise<DailyAttendance | null> {
    try {
      if (process.env.DATABASE_URL) {
        const updated = await prisma.dailyAttendance.update({
          where: { id: attendanceId },
          data: {
            kmApprovalStatus: status,
            managerRemarks: managerRemarks || null,
          },
        });
        return updated as unknown as DailyAttendance;
      }
    } catch (e) {
      console.warn('Prisma updateKmApproval error:', e);
    }

    const rec = inMemoryAttendances.find((a) => a.id === attendanceId);
    if (rec) {
      rec.kmApprovalStatus = status;
      rec.managerRemarks = managerRemarks || null;
      return rec;
    }
    return null;
  }

  // Session Methods
  async getSession(mobileNumber: string): Promise<any | null> {
    const clean = mobileNumber.replace(/[\s\-\+]/g, '');
    const key = clean.length > 10 ? clean.slice(-10) : clean;

    try {
      if (process.env.DATABASE_URL) {
        const session = await prisma.botSession.findUnique({
          where: { mobileNumber: key },
        });
        if (session) {
          return {
            mobileNumber: session.mobileNumber,
            employeeId: session.employeeId,
            currentStep: session.currentStep,
            tempVisitData: typeof session.tempVisitData === 'string' ? JSON.parse(session.tempVisitData) : session.tempVisitData,
            lastActive: session.lastActive,
          };
        }
      }
    } catch (e) {
      console.warn('Prisma getSession error:', e);
    }

    return inMemorySessions.get(key) || null;
  }

  async saveSession(session: any): Promise<void> {
    const clean = session.mobileNumber.replace(/[\s\-\+]/g, '');
    const key = clean.length > 10 ? clean.slice(-10) : clean;
    const sessionObj = {
      ...session,
      mobileNumber: key,
      lastActive: new Date().toISOString(),
    };

    inMemorySessions.set(key, sessionObj);

    try {
      if (process.env.DATABASE_URL) {
        await prisma.botSession.upsert({
          where: { mobileNumber: key },
          create: {
            mobileNumber: key,
            employeeId: session.employeeId || null,
            currentStep: session.currentStep || 'START',
            tempVisitData: JSON.stringify(session.tempVisitData || {}),
            lastActive: sessionObj.lastActive,
          },
          update: {
            employeeId: session.employeeId || null,
            currentStep: session.currentStep || 'START',
            tempVisitData: JSON.stringify(session.tempVisitData || {}),
            lastActive: sessionObj.lastActive,
          },
        });
      }
    } catch (e) {
      console.warn('Prisma saveSession error:', e);
    }
  }

  async clearSession(mobileNumber: string): Promise<void> {
    const clean = mobileNumber.replace(/[\s\-\+]/g, '');
    const key = clean.length > 10 ? clean.slice(-10) : clean;

    inMemorySessions.delete(key);

    try {
      if (process.env.DATABASE_URL) {
        await prisma.botSession.deleteMany({
          where: { mobileNumber: key },
        });
      }
    } catch (e) {
      console.warn('Prisma clearSession error:', e);
    }
  }

  private mapPrismaVisit(v: any) {
    let tags = [];
    try {
      tags = typeof v.aiTags === 'string' ? JSON.parse(v.aiTags) : v.aiTags || [];
    } catch {
      tags = [];
    }

    return {
      ...v,
      aiAnalysis: {
        qualityScore: v.aiQualityScore,
        isBlur: v.aiIsBlur,
        fieldVisible: v.aiFieldVisible,
        personVisible: v.aiPersonVisible,
        brandingVisible: v.aiBrandingVisible,
        visitTypeMatch: v.aiVisitTypeMatch,
        summaryHindi: v.aiSummaryHindi,
        summaryEnglish: v.aiSummaryEnglish,
        tags,
      },
    };
  }
}

export const db = new DatabaseStore();
