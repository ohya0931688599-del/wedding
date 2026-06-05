const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  await prisma.table.updateMany({
    data: { currentQuestionIndex: 0, score: 0 }
  })
  console.log('Tables reset')
}

main().catch(console.error).finally(() => prisma.$disconnect())
