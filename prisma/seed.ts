/**
 * Database Seed File
 * Populate the database with initial judge data
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clear existing data
  await prisma.auditLog.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.score.deleteMany()
  await prisma.task.deleteMany()
  await prisma.agent.deleteMany()

  // Seed judges/agents
  const agents = [
    {
      name: 'Dr. Academic',
      accountId: '0.0.1001',
      payToAddress: '0x1234567890123456789012345678901234567890',
      fee: 0.025,
      reputation: 9.8,
      specialties: JSON.stringify(['Research', 'Academic', 'Analysis']),
      bio: 'With over 15 years of experience in academic research and peer review, I provide comprehensive analysis that combines scholarly rigor with practical insights.',
      avatar: '/judges/professional-academic-avatar.jpg',
      color: 'purple',
      trending: true,
    },
    {
      name: 'Creative Maven',
      accountId: '0.0.1002',
      payToAddress: '0x2345678901234567890123456789012345678901',
      fee: 0.03,
      reputation: 9.5,
      specialties: JSON.stringify(['Design', 'Creative', 'UX']),
      bio: 'Award-winning designer with a passion for user-centered design. I help creators elevate their work through actionable, creative feedback.',
      avatar: '/judges/creative-designer-avatar.png',
      color: 'cyan',
      trending: true,
    },
    {
      name: 'Tech Guru',
      accountId: '0.0.1003',
      payToAddress: '0x3456789012345678901234567890123456789012',
      fee: 0.035,
      reputation: 9.7,
      specialties: JSON.stringify(['Code', 'Architecture', 'Performance']),
      bio: 'Senior software architect specializing in scalable systems and clean code practices. I provide technical reviews that improve code quality and system design.',
      avatar: '/judges/tech-expert-avatar.png',
      color: 'gold',
      trending: false,
    },
    {
      name: 'Business Strategist',
      accountId: '0.0.1004',
      payToAddress: '0x4567890123456789012345678901234567890123',
      fee: 0.028,
      reputation: 9.4,
      specialties: JSON.stringify(['Business', 'Strategy', 'Marketing']),
      bio: 'MBA with 12 years of experience in business strategy and market analysis. I help entrepreneurs validate ideas and refine their business models.',
      avatar: '/placeholder-user.jpg',
      color: 'purple',
      trending: false,
    },
    {
      name: 'Content Wizard',
      accountId: '0.0.1005',
      payToAddress: '0x5678901234567890123456789012345678901234',
      fee: 0.022,
      reputation: 9.6,
      specialties: JSON.stringify(['Writing', 'Content', 'Copywriting']),
      bio: 'Professional writer and editor with expertise in content strategy and persuasive copywriting. I help writers craft compelling narratives.',
      avatar: '/placeholder-user.jpg',
      color: 'cyan',
      trending: false,
    },
    {
      name: 'Data Scientist',
      accountId: '0.0.1006',
      payToAddress: '0x6789012345678901234567890123456789012345',
      fee: 0.032,
      reputation: 9.3,
      specialties: JSON.stringify(['Data', 'Analytics', 'ML']),
      bio: 'PhD in Statistics with expertise in machine learning and data analysis. I provide rigorous evaluation of data projects and analytical approaches.',
      avatar: '/placeholder-user.jpg',
      color: 'gold',
      trending: true,
    },
  ]

  for (const agent of agents) {
    await prisma.agent.create({
      data: agent,
    })
  }

  console.log(`✅ Created ${agents.length} agents`)

  // Create a sample task for testing
  const sampleTask = await prisma.task.create({
    data: {
      taskId: 'sample_task_001',
      content: 'Evaluate the quality and effectiveness of this AI-generated content for a marketing campaign.',
      topicId: '0.0.123456', // This would be a real HCS topic ID
      status: 'pending',
      currentRound: 1,
      maxRounds: 3,
      creatorAddress: '0.0.1234',
    },
  })

  console.log(`✅ Created sample task: ${sampleTask.taskId}`)

  // Create sample audit logs
  await prisma.auditLog.create({
    data: {
      taskId: sampleTask.taskId,
      event: 'task_created',
      data: JSON.stringify({
        content: 'Sample task for testing',
        judges: [1, 2, 3],
        maxRounds: 3,
      }),
    },
  })

  console.log('✅ Created sample audit log')

  console.log('🎉 Database seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
