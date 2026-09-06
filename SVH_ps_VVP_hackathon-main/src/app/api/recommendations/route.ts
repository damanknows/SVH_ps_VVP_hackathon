import { NextResponse } from 'next/server';
import { mockActions } from '@/lib/mockData';

export async function GET() {
  const recommendations = mockActions.map((action, idx) => ({
    hour: (new Date().getHours() + idx) % 24,
    directive: action.priority === 'HIGH' ? 'CHARGE_BESS' : action.priority === 'MED' ? 'CURTAIL_LOAD' : 'EXPORT_GRID',
    target_kw: action.priority === 'HIGH' ? 150 : action.priority === 'MED' ? 45 : 80,
    headline: action.title,
    rationale: action.reason,
    estimated_impact_inr: (idx + 1) * 650,
  }));

  return NextResponse.json(recommendations);
}
