/**
 * Pinata IPFS Service
 * Handles uploading agent metadata to IPFS via Pinata REST API
 */

export interface AgentMetadata {
  name: string
  title: string
  description?: string
  capabilities: string[]
  hederaAccount?: string
  createdAt: number
  version?: string
}

export class PinataService {
  private apiKey: string
  private apiSecret: string
  private jwt: string | undefined

  constructor() {
    this.apiKey = process.env.PINATA_API_KEY || ''
    this.apiSecret = process.env.PINATA_API_SECRET || ''
    this.jwt = process.env.PINATA_JWT

    // Check for invalid/placeholder values
    const isPlaceholder =
      !this.apiKey ||
      !this.apiSecret ||
      this.apiKey.includes('your-') ||
      this.apiSecret.includes('your-') ||
      this.apiKey.length < 15

    if (isPlaceholder) {
      console.warn('⚠️  PINATA_API_KEY and PINATA_API_SECRET not properly configured. Using mock mode.')
      this.apiKey = ''
      this.apiSecret = ''
    }
  }

  /**
   * Upload agent metadata to IPFS via Pinata REST API
   * Returns the IPFS URI (ipfs://Qm...)
   */
  async uploadAgentMetadata(metadata: AgentMetadata): Promise<string> {
    try {
      console.log('📤 Uploading agent metadata to IPFS via Pinata...')

      // Check for mock mode BEFORE making any API calls
      const isConfigured = this.apiKey && this.apiSecret && this.apiKey.length > 10

      if (!isConfigured) {
        // Mock mode for testing
        const mockHash = `Qm${Math.random().toString(36).substring(2, 15).padEnd(46, '0')}`
        console.log('⚠️  Mock mode: Generated mock IPFS hash')
        console.log(`📍 Mock IPFS URI: ipfs://${mockHash}`)
        return `ipfs://${mockHash}`
      }

      const data = {
        pinataContent: metadata,
        pinataMetadata: {
          name: `agent-${metadata.name}-${Date.now()}`,
        },
        pinataOptions: {
          cidVersion: 1,
        },
      }

      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: this.apiKey,
          pinata_secret_api_key: this.apiSecret,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`Pinata API error: ${response.statusText}`)
      }

      const result = await response.json()
      const ipfsUri = `ipfs://${result.IpfsHash}`

      console.log('✅ Metadata uploaded to IPFS')
      console.log(`📍 IPFS URI: ${ipfsUri}`)
      console.log(`🔗 Gateway URL: https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`)

      return ipfsUri
    } catch (error) {
      console.error('❌ Error uploading to IPFS:', error)
      throw new Error(`Failed to upload metadata to IPFS: ${error}`)
    }
  }

  /**
   * Retrieve agent metadata from IPFS
   */
  async getAgentMetadata(ipfsUri: string): Promise<AgentMetadata> {
    try {
      const hash = ipfsUri.replace('ipfs://', '')
      const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${hash}`

      console.log(`📥 Fetching metadata from IPFS: ${hash}`)

      const response = await fetch(gatewayUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch from IPFS: ${response.statusText}`)
      }

      const metadata = await response.json()
      return metadata as AgentMetadata
    } catch (error) {
      console.error('❌ Error fetching from IPFS:', error)
      throw new Error(`Failed to fetch metadata from IPFS: ${error}`)
    }
  }

  /**
   * Test Pinata connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.apiKey || !this.apiSecret) {
        console.log('⚠️  Mock mode: Connection test skipped')
        return true
      }

      const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
        method: 'GET',
        headers: {
          pinata_api_key: this.apiKey,
          pinata_secret_api_key: this.apiSecret,
        },
      })

      if (response.ok) {
        console.log('✅ Pinata connection successful')
        return true
      }

      console.error('❌ Pinata connection failed')
      return false
    } catch (error) {
      console.error('❌ Pinata connection failed:', error)
      return false
    }
  }

  /**
   * Pin existing IPFS hash (if you already have content on IPFS)
   */
  async pinByHash(ipfsHash: string, name?: string): Promise<void> {
    try {
      if (!this.apiKey || !this.apiSecret) {
        console.log('⚠️  Mock mode: Pin by hash skipped')
        return
      }

      const data = {
        hashToPin: ipfsHash,
        ...(name && { pinataMetadata: { name } }),
      }

      const response = await fetch('https://api.pinata.cloud/pinning/pinByHash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: this.apiKey,
          pinata_secret_api_key: this.apiSecret,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`Pinata API error: ${response.statusText}`)
      }

      console.log(`✅ Pinned hash: ${ipfsHash}`)
    } catch (error) {
      console.error('❌ Error pinning hash:', error)
      throw error
    }
  }

  /**
   * Unpin content from Pinata (removes from your account, content may still exist on IPFS)
   */
  async unpin(ipfsHash: string): Promise<void> {
    try {
      if (!this.apiKey || !this.apiSecret) {
        console.log('⚠️  Mock mode: Unpin skipped')
        return
      }

      const response = await fetch(`https://api.pinata.cloud/pinning/unpin/${ipfsHash}`, {
        method: 'DELETE',
        headers: {
          pinata_api_key: this.apiKey,
          pinata_secret_api_key: this.apiSecret,
        },
      })

      if (!response.ok) {
        throw new Error(`Pinata API error: ${response.statusText}`)
      }

      console.log(`✅ Unpinned hash: ${ipfsHash}`)
    } catch (error) {
      console.error('❌ Error unpinning hash:', error)
      throw error
    }
  }
}

// Singleton instance
let pinataService: PinataService | null = null

export function getPinataService(): PinataService {
  if (!pinataService) {
    pinataService = new PinataService()
  }
  return pinataService
}
