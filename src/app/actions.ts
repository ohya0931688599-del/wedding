'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// --- Questions ---
export async function addQuestion(data: { order: number; text: string; hint: string; correctAnswer: string; type?: 'QUIZ' | 'MANUAL' | 'PUZZLE' | 'IMAGE_QUIZ'; phase?: number; imageUrl?: string; imageUrls?: string[] }) {
  await prisma.question.create({ data: { ...data, phase: data.phase || 1 } })
  revalidatePath('/admin/questions')
  revalidatePath('/table')
}

export async function updateQuestion(id: number, data: { order: number; text: string; hint: string; correctAnswer: string; type?: 'QUIZ' | 'MANUAL' | 'PUZZLE' | 'IMAGE_QUIZ'; phase?: number; imageUrl?: string; imageUrls?: string[] }) {
  // Only update fields that are provided
  const updateData: any = { ...data, phase: data.phase || 1 }
  if (data.imageUrl === undefined) delete updateData.imageUrl
  if (data.imageUrls === undefined) delete updateData.imageUrls
  
  await prisma.question.update({ where: { id }, data: updateData })
  revalidatePath('/admin/questions')
  revalidatePath('/table')
}

export async function deleteQuestion(id: number) {
  await prisma.question.delete({ where: { id } })
  revalidatePath('/admin/questions')
  revalidatePath('/table')
}

export async function getQuestions() {
  return await prisma.question.findMany({ orderBy: { order: 'asc' } })
}

// --- Tables ---
export async function addTable(data: { name: string; token: string }) {
  await prisma.table.create({ data })
  revalidatePath('/admin/tables')
}

export async function deleteTable(id: number) {
  await prisma.table.delete({ where: { id } })
  revalidatePath('/admin/tables')
}

export async function getTables() {
  const tables = await prisma.table.findMany({ 
    include: {
      tableChallenges: {
        include: { question: true }
      }
    }
  })

  const questions = await prisma.question.findMany({ where: { type: 'QUIZ' } })

  const quizScores = new Map<number, number>()
  for (const t of tables) quizScores.set(t.id, 0)

  for (const q of questions) {
    const completed = []
    const failed = []
    for (const t of tables) {
      const tc = t.tableChallenges.find(tc => tc.questionId === q.id)
      if (tc?.status === 'COMPLETED') completed.push({ tableId: t.id, timeSpent: tc.timeSpent })
      else if (tc?.status === 'FAILED') failed.push(t.id)
    }

    completed.sort((a, b) => a.timeSpent - b.timeSpent)

    completed.forEach((c, index) => {
      let pts = 0
      const rank = index + 1
      if (rank === 1) pts = 25
      else if (rank === 2) pts = 23
      else if (rank === 3) pts = 21
      else if (rank >= 4 && rank <= 6) pts = 18
      else if (rank >= 7 && rank <= 9) pts = 15
      else if (rank >= 10 && rank <= 12) pts = 12
      else pts = 10
      quizScores.set(c.tableId, quizScores.get(c.tableId)! + pts)
    })

    failed.forEach(tId => {
      quizScores.set(tId, quizScores.get(tId)! + 10)
    })
  }

  const result = tables.map(t => {
    const emergencyScore = t.score
    const manualScore = t.tableChallenges.filter((tc: any) => tc.manualScore).reduce((sum: number, tc: any) => sum + tc.manualScore, 0)
    const quizScore = quizScores.get(t.id) || 0
    const totalScore = emergencyScore + manualScore + quizScore
    return {
      ...t,
      quizScore,
      manualScore,
      totalScore
    }
  })

  result.sort((a, b) => b.totalScore - a.totalScore)
  return result
}

// --- Quiz Logic (Legacy/Fallback) ---
export async function getTableState(token: string) {
  const table = await prisma.table.findUnique({
    where: { token },
    include: {
      answers: true,
      emergencySubmissions: {
        orderBy: { createdAt: 'desc' },
      },
      tableChallenges: true,
      playerSubmissions: true
    }
  })
  
  let settings = await prisma.systemSetting.findUnique({
    where: { id: 'global' }
  })
  if (!settings) {
    settings = await prisma.systemSetting.create({
      data: { id: 'global', isEmergencyModeActive: false, activeEmergencyMode: 0, phase1Active: false, phase2Active: false }
    })
  }
  
  return { table, settings }
}

export async function submitAnswer(tableId: number, questionId: number, submittedText: string) {
  const question = await prisma.question.findUnique({ where: { id: questionId } })
  if (!question) throw new Error('Question not found')

  const isCorrect = submittedText.trim() === question.correctAnswer.trim()
  
  await prisma.answer.upsert({
    where: { tableId_questionId: { tableId, questionId } },
    update: { submittedText, isCorrect },
    create: { tableId, questionId, submittedText, isCorrect }
  })

  if (isCorrect) {
    await prisma.table.update({
      where: { id: tableId },
      data: { score: { increment: 10 }, currentQuestionIndex: { increment: 1 } }
    })
  }

  revalidatePath('/admin')
  return isCorrect
}


// --- Phase 1 & 2: Challenge Lobby Logic ---
export async function togglePhase1(isActive: boolean) {
  await prisma.systemSetting.upsert({
    where: { id: 'global' },
    update: { phase1Active: isActive },
    create: { id: 'global', phase1Active: isActive, isEmergencyModeActive: false, phase2Active: false }
  })

  if (!isActive) {
    // Auto-fail uncompleted phase 1 questions
    const tables = await prisma.table.findMany({ include: { tableChallenges: true } })
    const phase1Questions = await prisma.question.findMany({ where: { phase: 1 } })
    
    for (const t of tables) {
      for (const q of phase1Questions) {
        const tc = t.tableChallenges.find(tc => tc.questionId === q.id)
        if (!tc || (tc.status !== 'COMPLETED' && tc.status !== 'FAILED')) {
          await prisma.tableChallenge.upsert({
            where: { tableId_questionId: { tableId: t.id, questionId: q.id } },
            update: { status: 'FAILED' },
            create: { tableId: t.id, questionId: q.id, status: 'FAILED' }
          })
        }
      }
      await prisma.table.update({ where: { id: t.id }, data: { activeChallengeId: null, challengeStartTime: null } })
    }
  }

  revalidatePath('/admin')
  revalidatePath('/table')
}

export async function togglePhase2(isActive: boolean) {
  await prisma.systemSetting.upsert({
    where: { id: 'global' },
    update: { phase2Active: isActive },
    create: { id: 'global', phase2Active: isActive, phase1Active: false, isEmergencyModeActive: false }
  })
  
  if (!isActive) {
    // Auto-fail uncompleted phase 2 questions
    const tables = await prisma.table.findMany({ include: { tableChallenges: true } })
    const phase2Questions = await prisma.question.findMany({ where: { phase: 2 } })
    
    for (const t of tables) {
      for (const q of phase2Questions) {
        const tc = t.tableChallenges.find(tc => tc.questionId === q.id)
        if (!tc || (tc.status !== 'COMPLETED' && tc.status !== 'FAILED')) {
          await prisma.tableChallenge.upsert({
            where: { tableId_questionId: { tableId: t.id, questionId: q.id } },
            update: { status: 'FAILED' },
            create: { tableId: t.id, questionId: q.id, status: 'FAILED' }
          })
        }
      }
      await prisma.table.update({ where: { id: t.id }, data: { activeChallengeId: null, challengeStartTime: null } })
    }
  }

  revalidatePath('/admin')
  revalidatePath('/table')
}

export async function startChallenge(tableId: number, questionId: number) {
  await prisma.table.update({
    where: { id: tableId },
    data: { 
      activeChallengeId: questionId,
      challengeStartTime: new Date()
    }
  })
  
  await prisma.tableChallenge.upsert({
    where: { tableId_questionId: { tableId, questionId } },
    update: { status: 'ACTIVE' },
    create: { tableId, questionId, status: 'ACTIVE' }
  })
  
  revalidatePath('/table')
}

export async function cancelChallenge(tableId: number, questionId: number) {
  await prisma.table.update({
    where: { id: tableId },
    data: { activeChallengeId: null, challengeStartTime: null }
  })
  
  await prisma.tableChallenge.updateMany({
    where: { tableId, questionId, status: 'ACTIVE' },
    data: { status: 'IDLE' }
  })
  
  revalidatePath('/table')
}

export async function submitChallengeAnswer(tableId: number, questionId: number, playerId: string, submittedText: string) {
  const table = await prisma.table.findUnique({ where: { id: tableId } })
  const question = await prisma.question.findUnique({ where: { id: questionId } })
  if (!table || !question) throw new Error('Not found')

  const isCorrect = submittedText.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()

  let challenge = await prisma.tableChallenge.findUnique({
    where: { tableId_questionId: { tableId, questionId } }
  })
  if (!challenge) return { error: '未開始挑戰' }

  if (isCorrect) {
    const timeSpent = table.challengeStartTime ? Math.floor((Date.now() - table.challengeStartTime.getTime()) / 1000) : 0
    await prisma.tableChallenge.update({
      where: { id: challenge.id },
      data: { status: 'COMPLETED', timeSpent }
    })
    await prisma.table.update({
      where: { id: tableId },
      data: { activeChallengeId: null, challengeStartTime: null }
    })
    revalidatePath('/table')
    return { success: true, correct: true, timeSpent }
  } else {
    challenge = await prisma.tableChallenge.update({
      where: { id: challenge.id },
      data: { wrongAttempts: { increment: 1 } }
    })
    if (challenge.wrongAttempts >= 10) {
      await prisma.tableChallenge.update({
        where: { id: challenge.id },
        data: { status: 'FAILED' }
      })
      await prisma.table.update({
        where: { id: tableId },
        data: { activeChallengeId: null, challengeStartTime: null }
      })
      revalidatePath('/table')
      return { success: true, correct: false, failed: true }
    }
    revalidatePath('/table')
    return { success: true, correct: false, failed: false, remaining: 10 - challenge.wrongAttempts }
  }
}

export async function giveUpChallenge(tableId: number, questionId: number) {
  await prisma.tableChallenge.updateMany({
    where: { tableId, questionId },
    data: { status: 'FAILED' }
  })
  await prisma.table.update({
    where: { id: tableId },
    data: { activeChallengeId: null, challengeStartTime: null }
  })
  revalidatePath('/table')
}

// Staff Manual Scoring
export async function updateManualScore(tableId: number, questionId: number, score: number) {
  await prisma.tableChallenge.upsert({
    where: { tableId_questionId: { tableId, questionId } },
    update: { status: 'COMPLETED', manualScore: score },
    create: { tableId, questionId, status: 'COMPLETED', manualScore: score }
  })
  revalidatePath('/staff')
  revalidatePath('/table')
}


// --- Emergency Mode ---
export async function toggleEmergencyMode(mode: number) {
  if (mode === 0) {
    const untallied = await prisma.emergencySubmission.findMany({ where: { isTallied: false } })
    const maxScores = new Map<number, number>()
    for (const sub of untallied) {
      const currentMax = maxScores.get(sub.tableId) || 0
      if (sub.score > currentMax) maxScores.set(sub.tableId, sub.score)
    }
    for (const [tableId, scoreToAdd] of maxScores.entries()) {
      await prisma.table.update({
        where: { id: tableId },
        data: { score: { increment: scoreToAdd } }
      })
    }
    await prisma.emergencySubmission.updateMany({
      where: { isTallied: false },
      data: { isTallied: true }
    })
  }

  await prisma.systemSetting.upsert({
    where: { id: 'global' },
    update: { isEmergencyModeActive: mode > 0, activeEmergencyMode: mode },
    create: { id: 'global', isEmergencyModeActive: mode > 0, activeEmergencyMode: mode, phase1Active: false, phase2Active: false }
  })
  revalidatePath('/admin')
  revalidatePath('/table')
}

export async function getEmergencySubmissions(mode?: number) {
  const whereClause = mode ? { mode } : {}
  const allSubmissions = await prisma.emergencySubmission.findMany({
    where: whereClause,
    include: { table: true },
    orderBy: { score: 'desc' }
  })
  const bestSubmissions = new Map()
  for (const sub of allSubmissions) {
    if (!bestSubmissions.has(sub.tableId)) bestSubmissions.set(sub.tableId, sub)
  }
  return Array.from(bestSubmissions.values())
}

// --- Reset ---
export async function resetGame() {
  await prisma.answer.deleteMany({})
  await prisma.emergencySubmission.deleteMany({})
  await prisma.tableChallenge.deleteMany({})
  await prisma.playerSubmission.deleteMany({})
  
  await prisma.table.updateMany({
    data: { score: 0, currentQuestionIndex: 0, activeChallengeId: null, challengeStartTime: null }
  })
  
  await prisma.systemSetting.upsert({
    where: { id: 'global' },
    update: { isEmergencyModeActive: false, activeEmergencyMode: 0, phase1Active: false, phase2Active: false },
    create: { id: 'global', isEmergencyModeActive: false, activeEmergencyMode: 0, phase1Active: false, phase2Active: false }
  })
  
  revalidatePath('/admin')
  revalidatePath('/table')
}
