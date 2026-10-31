import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import realEmployees from '@/lib/real-employees.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Purge visits if any exist so foreign keys do not conflict
    await prisma.visit.deleteMany({});

    // 2. Delete old employee records
    await prisma.employee.deleteMany({});

    // 3. Format and insert all 73 real employees
    const formattedData = realEmployees.map((emp, index) => {
      const cleanMobile = emp.mobileNumber.replace(/[\s\-\+]/g, '');
      const tenDigit = cleanMobile.length > 10 ? cleanMobile.slice(-10) : cleanMobile;

      return {
        id: emp.id || `emp-real-${index + 1}`,
        empId: emp.empId || `INNOV-${1001 + index}`,
        name: emp.name,
        mobileNumber: tenDigit,
        designation: emp.designation || 'Field Officer',
        district: emp.district || 'Amravati',
        territory: emp.territory || emp.district || 'Amravati',
        dailyVisitTarget: Number(emp.dailyVisitTarget) || 10,
        avatarUrl: emp.avatarUrl || null,
        isActive: true,
        joinedDate: emp.joinedDate || null,
      };
    });

    const result = await prisma.employee.createMany({
      data: formattedData,
      skipDuplicates: true,
    });

    const totalInDatabase = await prisma.employee.count();
    const sample = await prisma.employee.findMany({
      take: 3,
      orderBy: { id: 'asc' },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${result.count} real employees into Supabase database!`,
      totalInDatabase,
      sample,
    });
  } catch (err: any) {
    console.error('Seed Employees Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
