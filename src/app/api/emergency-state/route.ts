import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  const settings = await prisma.systemSetting.findUnique({
    where: { id: 'global' }
  })
  
  return NextResponse.json({
    isActive: settings?.isEmergencyModeActive || false,
    activeEmergencyMode: settings?.activeEmergencyMode || 0
  })
}
