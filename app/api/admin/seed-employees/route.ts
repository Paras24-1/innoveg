import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import realEmployees from '@/lib/real-employees.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const validMobiles = realEmployees.map((e) => {
      const clean = e.mobileNumber.replace(/[\s\-\+]/g, '');
      return clean.length > 10 ? clean.slice(-10) : clean;
    });

    const seeded = [];
    for (const emp of realEmployees) {
      const cleanMobile = emp.mobileNumber.replace(/[\s\-\+]/g, '');
      const tenDigit = cleanMobile.length > 10 ? cleanMobile.slice(-10) : cleanMobile;

      const upserted = await prisma.employee.upsert({
        where: { mobileNumber: tenDigit },
        update: {
          name: emp.name,
          empId: emp.empId,
          designation: emp.designation || 'Field Officer',
          district: emp.district || 'Amravati',
          territory: emp.territory || emp.district || 'Amravati',
          dailyVisitTarget: Number(emp.dailyVisitTarget) || 10,
          avatarUrl: emp.avatarUrl,
          isActive: true,
          joinedDate: emp.joinedDate || null,
        },
        create: {
          id: emp.id,
          empId: emp.empId,
          name: emp.name,
          mobileNumber: tenDigit,
          designation: emp.designation || 'Field Officer',
          district: emp.district || 'Amravati',
          territory: emp.territory || emp.district || 'Amravati',
          dailyVisitTarget: Number(emp.dailyVisitTarget) || 10,
          avatarUrl: emp.avatarUrl,
          isActive: true,
          joinedDate: emp.joinedDate || null,
        },
      });
      seeded.push(upserted);
    }

    // Clean up or deactivate any stale employee not in the 73 roster
    const staleEmployees = await prisma.employee.findMany({
      where: {
        mobileNumber: {
          notIn: validMobiles,
        },
      },
      include: {
        visits: true,
      },
    });

    let deletedCount = 0;
    let deactivatedCount = 0;

    for (const stale of staleEmployees) {
      if (!stale.visits || stale.visits.length === 0) {
        await prisma.employee.delete({ where: { id: stale.id } });
        deletedCount++;
      } else {
        await prisma.employee.update({
          where: { id: stale.id },
          data: { isActive: false },
        });
        deactivatedCount++;
      }
    }

    const currentCount = await prisma.employee.count({ where: { isActive: true } });

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized ${seeded.length} real employees into database`,
      currentActiveEmployees: currentCount,
      deletedStale: deletedCount,
      deactivatedStale: deactivatedCount,
    });
  } catch (err: any) {
    console.error('Seed Employees Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
