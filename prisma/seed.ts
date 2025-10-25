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
  await prisma.judge.deleteMany()

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
      avatar: '/judges/business-strategist-avatar.png',
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
      avatar: '/judges/content-writer-avatar.png',
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
      avatar: '/judges/data-scientist-avatar.png',
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

  // Seed judges data (for the new Judge API)
  const judges = [
    {
      name: 'Dr. Academic',
      title: 'Research Specialist',
      tagline: 'Rigorous analysis meets clarity',
      rating: 9.8,
      reviews: 342,
      price: 0.025,
      specialties: JSON.stringify(['Research', 'Academic', 'Analysis']),
      color: 'purple',
      avatar: '/judges/professional-academic-avatar.jpg',
      trending: true,
      bio: 'With over 15 years of experience in academic research and peer review, I provide comprehensive analysis that combines scholarly rigor with practical insights.',
      expertise: JSON.stringify([
        'Academic paper structure and argumentation',
        'Research methodology evaluation',
        'Citation and reference quality assessment',
        'Statistical analysis review',
      ]),
      achievements: JSON.stringify([
        'Published 50+ peer-reviewed papers',
        'Former editor at Nature Communications',
        'PhD in Computational Biology from MIT',
      ]),
      sampleReviews: JSON.stringify([
        {
          rating: 9.9,
          comment: 'Incredibly detailed feedback that helped me improve my thesis significantly.',
          author: 'Sarah M.',
          date: '2 days ago',
        },
        {
          rating: 9.7,
          comment: 'Professional and thorough analysis. Worth every penny.',
          author: 'James K.',
          date: '1 week ago',
        },
      ]),
    },
    {
      name: 'Creative Maven',
      title: 'Design Critic',
      tagline: 'Where art meets innovation',
      rating: 9.5,
      reviews: 289,
      price: 0.03,
      specialties: JSON.stringify(['Design', 'Creative', 'UX']),
      color: 'cyan',
      avatar: '/judges/creative-designer-avatar.png',
      trending: true,
      bio: 'Award-winning designer with a passion for user-centered design. I help creators elevate their work through actionable, creative feedback.',
      expertise: JSON.stringify([
        'Visual hierarchy and composition',
        'User experience and interaction design',
        'Brand identity and consistency',
        'Accessibility and inclusive design',
      ]),
      achievements: JSON.stringify([
        'Winner of 3 Webby Awards',
        'Lead Designer at Fortune 500 companies',
        'Featured in Design Week Magazine',
      ]),
      sampleReviews: JSON.stringify([
        {
          rating: 9.8,
          comment: 'Transformed my portfolio with insightful design critiques.',
          author: 'Alex P.',
          date: '3 days ago',
        },
        {
          rating: 9.2,
          comment: 'Great eye for detail and user experience.',
          author: 'Maria L.',
          date: '5 days ago',
        },
      ]),
    },
    {
      name: 'Tech Guru',
      title: 'Code Reviewer',
      tagline: 'Clean code, better systems',
      rating: 9.7,
      reviews: 412,
      price: 0.035,
      specialties: JSON.stringify(['Code', 'Architecture', 'Performance']),
      color: 'gold',
      avatar: '/judges/tech-expert-avatar.png',
      trending: false,
      bio: 'Senior software architect specializing in scalable systems and clean code practices. I provide technical reviews that improve code quality and system design.',
      expertise: JSON.stringify([
        'Code quality and best practices',
        'System architecture and scalability',
        'Performance optimization',
        'Security and vulnerability assessment',
      ]),
      achievements: JSON.stringify([
        'Built systems serving 100M+ users',
        'Open source contributor with 10k+ GitHub stars',
        'Former Tech Lead at Google',
      ]),
      sampleReviews: JSON.stringify([
        {
          rating: 9.9,
          comment: 'Caught critical issues I missed. Excellent technical depth.',
          author: 'David R.',
          date: '1 day ago',
        },
        {
          rating: 9.5,
          comment: "Best code review I've ever received. Very thorough.",
          author: 'Emma T.',
          date: '4 days ago',
        },
      ]),
    },
    {
      name: 'Business Strategist',
      title: 'Market Analyst',
      tagline: 'Data-driven insights for growth',
      rating: 9.4,
      reviews: 198,
      price: 0.028,
      specialties: JSON.stringify(['Business', 'Strategy', 'Marketing']),
      color: 'purple',
      avatar: '/judges/business-strategist-avatar.png',
      trending: false,
      bio: 'MBA with 12 years of experience in business strategy and market analysis. I help entrepreneurs validate ideas and refine their business models.',
      expertise: JSON.stringify([
        'Business model validation',
        'Market opportunity analysis',
        'Competitive landscape assessment',
        'Go-to-market strategy',
      ]),
      achievements: JSON.stringify([
        'Advised 50+ successful startups',
        'Former McKinsey consultant',
        'MBA from Harvard Business School',
      ]),
      sampleReviews: JSON.stringify([
        {
          rating: 9.6,
          comment: 'Helped me pivot my business model successfully.',
          author: 'Tom H.',
          date: '1 week ago',
        },
      ]),
    },
    {
      name: 'Content Wizard',
      title: 'Writing Coach',
      tagline: 'Words that resonate and convert',
      rating: 9.6,
      reviews: 267,
      price: 0.022,
      specialties: JSON.stringify(['Writing', 'Content', 'Copywriting']),
      color: 'cyan',
      avatar: '/judges/content-writer-avatar.png',
      trending: false,
      bio: 'Professional writer and editor with expertise in content strategy and persuasive copywriting. I help writers craft compelling narratives.',
      expertise: JSON.stringify([
        'Content structure and flow',
        'Tone and voice consistency',
        'SEO and readability optimization',
        'Persuasive copywriting techniques',
      ]),
      achievements: JSON.stringify([
        'Published author with 3 bestsellers',
        'Content strategist for major brands',
        '10+ years in editorial leadership',
      ]),
      sampleReviews: JSON.stringify([
        {
          rating: 9.7,
          comment: 'My blog posts improved dramatically after this feedback.',
          author: 'Lisa W.',
          date: '2 days ago',
        },
      ]),
    },
    {
      name: 'Data Scientist',
      title: 'Analytics Expert',
      tagline: 'Turning data into decisions',
      rating: 9.3,
      reviews: 156,
      price: 0.032,
      specialties: JSON.stringify(['Data', 'Analytics', 'ML']),
      color: 'gold',
      avatar: '/judges/data-scientist-avatar.png',
      trending: true,
      bio: 'PhD in Statistics with expertise in machine learning and data analysis. I provide rigorous evaluation of data projects and analytical approaches.',
      expertise: JSON.stringify([
        'Statistical methodology',
        'Machine learning model evaluation',
        'Data visualization best practices',
        'Experimental design',
      ]),
      achievements: JSON.stringify([
        'PhD in Statistics from Stanford',
        'Published 30+ papers on ML',
        'Led data teams at tech unicorns',
      ]),
      sampleReviews: JSON.stringify([
        {
          rating: 9.5,
          comment: 'Excellent statistical insights and methodology review.',
          author: 'Chris B.',
          date: '3 days ago',
        },
      ]),
    },
  ]

  for (const judge of judges) {
    await prisma.judge.create({
      data: judge,
    })
  }

  console.log(`✅ Created ${judges.length} judges`)

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
