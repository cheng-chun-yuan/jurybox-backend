/**
 * Default Test Agents - Platform-Authorized Free Testing
 *
 * These are JuryBox's official agents made available for FREE test evaluations.
 * Users can try the multi-agent evaluation system before committing to paid agents.
 *
 * Features:
 * - pricePerJudgment: 0 (free for testing)
 * - Full ERC-8004 identity and reputation
 * - Real Hedera accounts (mock for development)
 * - Pre-configured with diverse specialties
 */

import type { Agent } from '../types/agent'

export const DEFAULT_TEST_AGENTS: Agent[] = [
  {
    id: 'test-agent-academic',
    name: 'Dr. Academic (Test)',
    title: 'Research Specialist',
    tagline: 'Rigorous analysis meets clarity',
    bio: 'With over 15 years of experience in academic research and peer review, I provide comprehensive analysis that combines scholarly rigor with practical insights. Available for FREE testing.',
    avatar: '/judges/professional-academic-avatar.jpg',
    color: 'purple',

    // Hedera integration (mock for testing)
    hederaAccount: {
      accountId: '0.0.1001',
      publicKey: '302a300506032b6570032100...',
      balance: 100,
    },

    // Payment config - FREE for testing
    paymentConfig: {
      enabled: true,
      acceptedTokens: ['HBAR'],
      pricePerJudgment: 0, // FREE FOR TESTING
      paymentAddress: '0.0.1001',
      minimumPayment: 0,
    },

    // ERC-8004 identity
    identity: {
      registryId: '0x' + 'a'.repeat(64),
      agentId: 'test-agent-academic',
      chainId: 296, // Sepolia testnet
      verified: true,
      registeredAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
    },

    // ERC-8004 reputation
    reputation: {
      totalReviews: 342,
      averageRating: 9.8,
      completedJudgments: 428,
      successRate: 0.98,
      lastUpdated: Date.now(),
    },

    // Agent capabilities
    capabilities: {
      specialties: ['Research', 'Academic', 'Analysis', 'Methodology'],
      languages: ['en', 'zh'],
      modelProvider: 'openai',
      modelName: 'gpt-4',
      systemPrompt: `You are Dr. Academic, a research specialist with expertise in academic evaluation.
Your task is to evaluate content with scholarly rigor, focusing on:
- Research methodology and validity
- Logical argumentation and structure
- Evidence quality and citation accuracy
- Clarity of presentation
- Contribution to the field

Provide constructive feedback that helps improve academic quality while maintaining high standards.
Score on a scale of 0-10, where:
- 9-10: Exceptional quality, publication-ready
- 7-8: Strong work with minor improvements needed
- 5-6: Solid foundation but significant revisions required
- 3-4: Major issues that need addressing
- 0-2: Fundamental problems

Always explain your reasoning and provide actionable suggestions.`,
      temperature: 0.7,
      maxTokens: 2000,
    },

    // Metadata
    createdBy: 'jurybox-platform',
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now(),
    isActive: true,
    trending: true,
    featured: true,
  },
  {
    id: 'test-agent-creative',
    name: 'Creative Maven (Test)',
    title: 'Design Critic',
    tagline: 'Where art meets innovation',
    bio: 'Award-winning designer with a passion for user-centered design. I help creators elevate their work through actionable, creative feedback. Available for FREE testing.',
    avatar: '/judges/creative-designer-avatar.png',
    color: 'cyan',

    // Hedera integration (mock for testing)
    hederaAccount: {
      accountId: '0.0.1002',
      publicKey: '302a300506032b6570032100...',
      balance: 100,
    },

    // Payment config - FREE for testing
    paymentConfig: {
      enabled: true,
      acceptedTokens: ['HBAR'],
      pricePerJudgment: 0, // FREE FOR TESTING
      paymentAddress: '0.0.1002',
      minimumPayment: 0,
    },

    // ERC-8004 identity
    identity: {
      registryId: '0x' + 'b'.repeat(64),
      agentId: 'test-agent-creative',
      chainId: 296,
      verified: true,
      registeredAt: Date.now() - 25 * 24 * 60 * 60 * 1000,
    },

    // ERC-8004 reputation
    reputation: {
      totalReviews: 289,
      averageRating: 9.5,
      completedJudgments: 356,
      successRate: 0.96,
      lastUpdated: Date.now(),
    },

    // Agent capabilities
    capabilities: {
      specialties: ['Design', 'Creative', 'UX', 'Visual Communication'],
      languages: ['en'],
      modelProvider: 'anthropic',
      modelName: 'claude-3-sonnet',
      systemPrompt: `You are Creative Maven, a design critic focused on user experience and visual excellence.
Your task is to evaluate creative work focusing on:
- Visual hierarchy and composition
- User experience and interaction design
- Aesthetic appeal and brand consistency
- Accessibility and inclusive design
- Innovation and originality

Provide feedback that balances creativity with practical usability.
Score on a scale of 0-10, where:
- 9-10: Outstanding design, sets industry standards
- 7-8: Strong design with minor refinements needed
- 5-6: Good foundation but needs significant improvement
- 3-4: Major design issues to address
- 0-2: Fundamental design problems

Be encouraging while maintaining professional standards. Suggest specific improvements.`,
      temperature: 0.8,
      maxTokens: 2000,
    },

    // Metadata
    createdBy: 'jurybox-platform',
    createdAt: Date.now() - 25 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now(),
    isActive: true,
    trending: true,
    featured: true,
  },
  {
    id: 'test-agent-technical',
    name: 'Tech Guru (Test)',
    title: 'Code Reviewer',
    tagline: 'Clean code, better systems',
    bio: 'Senior software architect specializing in scalable systems and clean code practices. I provide technical reviews that improve code quality and system design. Available for FREE testing.',
    avatar: '/judges/tech-expert-avatar.png',
    color: 'gold',

    // Hedera integration (mock for testing)
    hederaAccount: {
      accountId: '0.0.1003',
      publicKey: '302a300506032b6570032100...',
      balance: 100,
    },

    // Payment config - FREE for testing
    paymentConfig: {
      enabled: true,
      acceptedTokens: ['HBAR'],
      pricePerJudgment: 0, // FREE FOR TESTING
      paymentAddress: '0.0.1003',
      minimumPayment: 0,
    },

    // ERC-8004 identity
    identity: {
      registryId: '0x' + 'c'.repeat(64),
      agentId: 'test-agent-technical',
      chainId: 296,
      verified: true,
      registeredAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
    },

    // ERC-8004 reputation
    reputation: {
      totalReviews: 412,
      averageRating: 9.7,
      completedJudgments: 501,
      successRate: 0.97,
      lastUpdated: Date.now(),
    },

    // Agent capabilities
    capabilities: {
      specialties: ['Code Quality', 'Architecture', 'Performance', 'Security'],
      languages: ['en'],
      modelProvider: 'openai',
      modelName: 'gpt-4',
      systemPrompt: `You are Tech Guru, a senior software architect focused on code quality and system design.
Your task is to evaluate technical content focusing on:
- Code quality and best practices
- System architecture and scalability
- Performance optimization
- Security vulnerabilities
- Maintainability and documentation

Provide technical feedback that improves both code and architecture.
Score on a scale of 0-10, where:
- 9-10: Production-ready, exemplary code
- 7-8: Good code with minor improvements
- 5-6: Functional but needs refactoring
- 3-4: Major technical debt and issues
- 0-2: Critical problems that must be fixed

Be specific about issues and provide concrete solutions with examples.`,
      temperature: 0.6,
      maxTokens: 2000,
    },

    // Metadata
    createdBy: 'jurybox-platform',
    createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now(),
    isActive: true,
    trending: false,
    featured: true,
  },
]

/**
 * Get all default test agents
 */
export function getDefaultTestAgents(): Agent[] {
  return DEFAULT_TEST_AGENTS
}

/**
 * Get a specific test agent by ID
 */
export function getTestAgentById(id: string): Agent | undefined {
  return DEFAULT_TEST_AGENTS.find(agent => agent.id === id)
}

/**
 * Check if an agent is a free test agent
 */
export function isTestAgent(agentId: string): boolean {
  return DEFAULT_TEST_AGENTS.some(agent => agent.id === agentId)
}

/**
 * Get default test agent IDs
 */
export function getTestAgentIds(): string[] {
  return DEFAULT_TEST_AGENTS.map(agent => agent.id)
}
