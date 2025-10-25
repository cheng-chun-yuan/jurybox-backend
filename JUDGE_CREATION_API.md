# Judge Creation API Documentation

## Overview

The Judge Creation API allows you to create new judges (agents) with automatic IPFS upload and database storage. This follows the ERC-8004 standard for agent registration.

## Endpoint

**POST** `/api/judges`

## Request Body

```json
{
  "name": "Dr. Elena Voss",
  "title": "Research Specialist",
  "tagline": ["Academic", "Research"],
  "description": "Dr. Elena Voss brings 15 years of interdisciplinary research experience...",
  "avatar": "ipfs://bafkreiaq5kzght2mkeuhztho7h2ib7zc2iu7agr2i6mxnuspm7i4kp2pz4",
  "themeColor": "#8B5CF6",
  "specialties": ["Data Analysis", "Research Methodology", "Academic Writing"],
  "modelProvider": "OpenAI",
  "modelName": "gpt-4",
  "systemPrompt": "You are Dr. Elena Voss, an expert researcher...",
  "temperature": 0.70,
  "price": 0.05,
  "walletAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "hederaAccount": "0.0.7128113",
  "capabilities": ["Data analyst", "easy-going"],
  "version": "1.0.0"
}
```

### Required Fields
- `name` (string): Judge's display name

### Optional Fields
- `title` (string): Professional title
- `tagline` (string[]): Array of tagline keywords
- `description` (string): Detailed description
- `avatar` (string): Avatar image URL (IPFS preferred)
- `themeColor` (string): UI theme color (default: "#8B5CF6")
- `specialties` (string[]): Array of specialties
- `modelProvider` (string): AI model provider (default: "OpenAI")
- `modelName` (string): AI model name (default: "gpt-4")
- `systemPrompt` (string): AI system prompt
- `temperature` (number): AI temperature (default: 0.70)
- `price` (number): Price per judgment in HBAR (default: 0.05)
- `walletAddress` (string): Wallet address for payments
- `hederaAccount` (string): Hedera account ID
- `capabilities` (string[]): Agent capabilities
- `version` (string): Agent version (default: "1.0.0")

## Response

### Success Response (201 Created)
```json
{
  "success": true,
  "data": {
    "judgeId": 6,
    "ipfsUri": "ipfs://QmX1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v",
    "ipfsHash": "QmX1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v",
    "paymentPageUrl": "https://yourdomain.com/api/pay/judge/6",
    "registryTxHash": null
  },
  "message": "Judge created successfully"
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "error": "Missing required field",
  "message": "Name is required"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "IPFS upload failed",
  "message": "Failed to upload agent metadata to IPFS"
}
```

## Process Flow

1. **Validation**: Validates required fields
2. **IPFS Upload**: Creates ERC-8004 compliant metadata and uploads to IPFS
3. **Database Storage**: Stores judge information in database
4. **Payment URL Generation**: Generates payment page URL
5. **Response**: Returns judge ID, IPFS URI, and payment URL

## ERC-8004 Metadata Structure

The system automatically creates ERC-8004 compliant metadata:

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "Dr. Elena Voss",
  "title": "Research Specialist",
  "description": "Dr. Elena Voss brings 15 years...",
  "image": "ipfs://bafkreiaq5kzght2mkeuhztho7h2ib7zc2iu7agr2i6mxnuspm7i4kp2pz4",
  "capabilities": ["Data analyst", "easy-going"],
  "hederaAccount": "0.0.7128113",
  "createdAt": 1761386355374,
  "version": "1.0.0",
  "endpoints": [
    {
      "name": "A2A",
      "endpoint": "https://yourdomain.com/.well-known/agent-card.json",
      "version": "0.3.0"
    },
    {
      "name": "agentWallet",
      "endpoint": "eip155:296:0.0.7128113"
    }
  ],
  "registrations": [],
  "supportedTrust": ["reputation", "crypto-economic"]
}
```

## Database Storage

The judge is stored in the `judges` table with the following mapping:

| API Field | Database Field | Type | Notes |
|-----------|----------------|------|-------|
| name | name | string | Required |
| title | title | string | |
| tagline | tagline | string | JSON stringified array |
| description | bio | string | |
| avatar | avatar | string | |
| themeColor | color | string | |
| specialties | specialties | string | JSON stringified array |
| price | price | number | HBAR per judgment |
| walletAddress | bio | string | Appended to bio field |

## IPFS Integration

- Uses Pinata service for IPFS uploads
- Falls back to mock mode if Pinata credentials not configured
- Returns both IPFS URI (`ipfs://...`) and hash
- Metadata follows ERC-8004 standard

## Payment Integration

- Generates payment page URL: `{BACKEND_URL}/api/pay/judge/{judgeId}`
- Stores wallet address in judge bio
- Ready for X402 payment protocol integration

## Usage Examples

### JavaScript/TypeScript
```typescript
const response = await fetch('/api/judges', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Dr. Elena Voss',
    title: 'Research Specialist',
    description: 'Expert researcher...',
    specialties: ['Data Analysis', 'Research'],
    walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    hederaAccount: '0.0.7128113'
  })
})

const result = await response.json()
console.log('Judge created:', result.data.judgeId)
console.log('IPFS URI:', result.data.ipfsUri)
```

### Python
```python
import requests

response = requests.post('/api/judges', json={
    'name': 'Dr. Elena Voss',
    'title': 'Research Specialist',
    'description': 'Expert researcher...',
    'specialties': ['Data Analysis', 'Research'],
    'walletAddress': '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    'hederaAccount': '0.0.7128113'
})

result = response.json()
print(f"Judge created: {result['data']['judgeId']}")
print(f"IPFS URI: {result['data']['ipfsUri']}")
```

## Testing

Run the test script to verify the API:

```bash
bun run scripts/tests/test-judge-creation.ts
```

## Environment Variables

- `BACKEND_URL`: Backend URL for payment page generation
- `PINATA_API_KEY`: Pinata API key for IPFS uploads
- `PINATA_API_SECRET`: Pinata API secret for IPFS uploads

## Error Handling

- Validates required fields before processing
- Handles IPFS upload failures gracefully
- Provides detailed error messages
- Logs all operations for debugging

## Security Notes

- No authentication required (public endpoint)
- Input validation prevents injection attacks
- IPFS uploads are public by design
- Wallet addresses are stored in bio field
