/**
 * Mock Judge Database
 * Centralized source of truth for all judge data
 */

export interface Judge {
  id: number
  name: string
  title: string
  tagline: string
  rating: number
  reviews: number
  price: number
  specialties: string[]
  color: 'purple' | 'cyan' | 'gold'
  avatar: string
  trending?: boolean
  bio: string
  expertise: string[]
  achievements: string[]
  sampleReviews: Array<{
    rating: number
    comment: string
    author: string
    date: string
  }>
}

// Mock database of all judges
const judgesDB: Judge[] = [
  {
    id: 1,
    name: 'Dr. Academic',
    title: 'Research Specialist',
    tagline: 'Rigorous analysis meets clarity',
    rating: 9.8,
    reviews: 342,
    price: 0.025,
    specialties: ['Research', 'Academic', 'Analysis'],
    color: 'purple',
    avatar: '/judges/professional-academic-avatar.jpg',
    trending: true,
    bio: 'With over 15 years of experience in academic research and peer review, I provide comprehensive analysis that combines scholarly rigor with practical insights.',
    expertise: [
      'Academic paper structure and argumentation',
      'Research methodology evaluation',
      'Citation and reference quality assessment',
      'Statistical analysis review',
    ],
    achievements: [
      'Published 50+ peer-reviewed papers',
      'Former editor at Nature Communications',
      'PhD in Computational Biology from MIT',
    ],
    sampleReviews: [
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
    ],
  },
  {
    id: 2,
    name: 'Creative Maven',
    title: 'Design Critic',
    tagline: 'Where art meets innovation',
    rating: 9.5,
    reviews: 289,
    price: 0.03,
    specialties: ['Design', 'Creative', 'UX'],
    color: 'cyan',
    avatar: '/judges/creative-designer-avatar.png',
    trending: true,
    bio: 'Award-winning designer with a passion for user-centered design. I help creators elevate their work through actionable, creative feedback.',
    expertise: [
      'Visual hierarchy and composition',
      'User experience and interaction design',
      'Brand identity and consistency',
      'Accessibility and inclusive design',
    ],
    achievements: [
      'Winner of 3 Webby Awards',
      'Lead Designer at Fortune 500 companies',
      'Featured in Design Week Magazine',
    ],
    sampleReviews: [
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
    ],
  },
  {
    id: 3,
    name: 'Tech Guru',
    title: 'Code Reviewer',
    tagline: 'Clean code, better systems',
    rating: 9.7,
    reviews: 412,
    price: 0.035,
    specialties: ['Code', 'Architecture', 'Performance'],
    color: 'gold',
    avatar: '/judges/tech-expert-avatar.png',
    bio: 'Senior software architect specializing in scalable systems and clean code practices. I provide technical reviews that improve code quality and system design.',
    expertise: [
      'Code quality and best practices',
      'System architecture and scalability',
      'Performance optimization',
      'Security and vulnerability assessment',
    ],
    achievements: [
      'Built systems serving 100M+ users',
      'Open source contributor with 10k+ GitHub stars',
      'Former Tech Lead at Google',
    ],
    sampleReviews: [
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
    ],
  },
  {
    id: 4,
    name: 'Business Strategist',
    title: 'Market Analyst',
    tagline: 'Data-driven insights for growth',
    rating: 9.4,
    reviews: 198,
    price: 0.028,
    specialties: ['Business', 'Strategy', 'Marketing'],
    color: 'purple',
    avatar: '/placeholder-user.jpg',
    bio: 'MBA with 12 years of experience in business strategy and market analysis. I help entrepreneurs validate ideas and refine their business models.',
    expertise: [
      'Business model validation',
      'Market opportunity analysis',
      'Competitive landscape assessment',
      'Go-to-market strategy',
    ],
    achievements: [
      'Advised 50+ successful startups',
      'Former McKinsey consultant',
      'MBA from Harvard Business School',
    ],
    sampleReviews: [
      {
        rating: 9.6,
        comment: 'Helped me pivot my business model successfully.',
        author: 'Tom H.',
        date: '1 week ago',
      },
    ],
  },
  {
    id: 5,
    name: 'Content Wizard',
    title: 'Writing Coach',
    tagline: 'Words that resonate and convert',
    rating: 9.6,
    reviews: 267,
    price: 0.022,
    specialties: ['Writing', 'Content', 'Copywriting'],
    color: 'cyan',
    avatar: '/placeholder-user.jpg',
    bio: 'Professional writer and editor with expertise in content strategy and persuasive copywriting. I help writers craft compelling narratives.',
    expertise: [
      'Content structure and flow',
      'Tone and voice consistency',
      'SEO and readability optimization',
      'Persuasive copywriting techniques',
    ],
    achievements: [
      'Published author with 3 bestsellers',
      'Content strategist for major brands',
      '10+ years in editorial leadership',
    ],
    sampleReviews: [
      {
        rating: 9.7,
        comment: 'My blog posts improved dramatically after this feedback.',
        author: 'Lisa W.',
        date: '2 days ago',
      },
    ],
  },
  {
    id: 6,
    name: 'Data Scientist',
    title: 'Analytics Expert',
    tagline: 'Turning data into decisions',
    rating: 9.3,
    reviews: 156,
    price: 0.032,
    specialties: ['Data', 'Analytics', 'ML'],
    color: 'gold',
    avatar: '/placeholder-user.jpg',
    trending: true,
    bio: 'PhD in Statistics with expertise in machine learning and data analysis. I provide rigorous evaluation of data projects and analytical approaches.',
    expertise: [
      'Statistical methodology',
      'Machine learning model evaluation',
      'Data visualization best practices',
      'Experimental design',
    ],
    achievements: [
      'PhD in Statistics from Stanford',
      'Published 30+ papers on ML',
      'Led data teams at tech unicorns',
    ],
    sampleReviews: [
      {
        rating: 9.5,
        comment: 'Excellent statistical insights and methodology review.',
        author: 'Chris B.',
        date: '3 days ago',
      },
    ],
  },
]

/**
 * Get all judges
 */
export function getAllJudges(): Judge[] {
  return judgesDB
}

/**
 * Get judge by ID
 */
export function getJudgeById(id: number): Judge | undefined {
  return judgesDB.find(judge => judge.id === id)
}

/**
 * Get multiple judges by IDs
 */
export function getJudgesByIds(ids: number[]): Judge[] {
  return judgesDB.filter(judge => ids.includes(judge.id))
}

/**
 * Get judges by specialty
 */
export function getJudgesBySpecialty(specialty: string): Judge[] {
  return judgesDB.filter(judge =>
    judge.specialties.some(s => s.toLowerCase().includes(specialty.toLowerCase()))
  )
}

/**
 * Get trending judges
 */
export function getTrendingJudges(): Judge[] {
  return judgesDB.filter(judge => judge.trending)
}

/**
 * Search judges by name or title
 */
export function searchJudges(query: string): Judge[] {
  const lowerQuery = query.toLowerCase()
  return judgesDB.filter(judge =>
    judge.name.toLowerCase().includes(lowerQuery) ||
    judge.title.toLowerCase().includes(lowerQuery) ||
    judge.specialties.some(s => s.toLowerCase().includes(lowerQuery))
  )
}
