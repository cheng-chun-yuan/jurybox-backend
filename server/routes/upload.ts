import { FastifyPluginAsync } from 'fastify'
import { MultipartFile } from '@fastify/multipart'

const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Upload image/file to IPFS via Pinata
   * POST /api/upload
   */
  fastify.post('/', async (request, reply) => {
    try {
      const data = await request.file()

      if (!data) {
        return reply.code(400).send({ error: 'No file provided' })
      }

      const file = data as MultipartFile

      // Check file size (max 5MB)
      const MAX_SIZE = 5 * 1024 * 1024
      const buffer = await file.toBuffer()

      if (buffer.length > MAX_SIZE) {
        return reply.code(400).send({
          error: 'File too large. Maximum size is 5MB',
        })
      }

      // Check file type (images only)
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
      ]

      if (!file.mimetype || !allowedTypes.includes(file.mimetype)) {
        return reply.code(400).send({
          error: 'Invalid file type. Only images are allowed',
        })
      }

      const apiKey = process.env.PINATA_API_KEY
      const apiSecret = process.env.PINATA_API_SECRET

      if (!apiKey || !apiSecret || apiKey.includes('your-')) {
        return reply.code(500).send({
          error: 'Pinata credentials not configured',
        })
      }

      // Upload to Pinata
      const pinataFormData = new FormData()
      const blob = new Blob([buffer], { type: file.mimetype })
      pinataFormData.append('file', blob, file.filename)

      const metadata = JSON.stringify({
        name: `agent-image-${Date.now()}-${file.filename}`,
        keyvalues: {
          type: 'agent-avatar',
          uploadedAt: new Date().toISOString(),
        },
      })
      pinataFormData.append('pinataMetadata', metadata)

      const options = JSON.stringify({
        cidVersion: 1,
      })
      pinataFormData.append('pinataOptions', options)

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          pinata_api_key: apiKey,
          pinata_secret_api_key: apiSecret,
        },
        body: pinataFormData,
      })

      if (!response.ok) {
        const error = await response.text()
        fastify.log.error('Pinata upload error:', error)
        return reply.code(500).send({
          error: 'Failed to upload to IPFS',
        })
      }

      const result = await response.json() as { IpfsHash: string }
      const ipfsHash = result.IpfsHash
      const ipfsUri = `ipfs://${ipfsHash}`
      const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`

      return reply.code(200).send({
        success: true,
        ipfsHash,
        ipfsUri,
        gatewayUrl,
        size: buffer.length,
        type: file.mimetype,
      })
    } catch (error: any) {
      fastify.log.error('Upload error:', error)
      return reply.code(500).send({
        error: 'Failed to upload file',
        message: error.message,
      })
    }
  })
}

export default uploadRoutes
