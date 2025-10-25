# AA Wallet Response Format

## Overview

When creating an AA wallet, the API now returns a simplified response format that includes the essential wallet information in a clean, consistent structure.

## Response Format

### POST /orchestrator/register

**Request:**
```json
{
  "userAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "fundingAmount": 10,
  "name": "My Custom AA Wallet"
}
```

**Response:**
```json
{
  "success": true,
  "message": "AA wallet created successfully",
  "aaWallet": {
    "accountId": "0.0.7125500",
    "evmAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "name": "My Custom AA Wallet"
  },
  "details": {
    "aaWalletId": "0.0.7125500",
    "userAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "publicKey": "302a300506032b6570032100...",
    "fundedBalance": 10,
    "fundingTxId": "0.0.123456@1234567890.123456789",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "security": {
    "notes": [
      "User's private key was never required",
      "Only public key/address was used",
      "User maintains full control of their private key",
      "Wallet is ready for X402 payments and transactions"
    ]
  }
}
```

### GET /orchestrator/wallet/:aaWalletId

**Response:**
```json
{
  "aaWallet": {
    "accountId": "0.0.7125500",
    "evmAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "name": "My Custom AA Wallet"
  },
  "details": {
    "aaWalletId": "0.0.7125500",
    "userAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "publicKey": "302a300506032b6570032100...",
    "fundedBalance": 10,
    "fundingTxId": "0.0.123456@1234567890.123456789",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## Field Descriptions

### aaWallet Object
- **accountId** (string): The Hedera account ID of the created AA wallet
- **evmAddress** (string): The user's EVM address (same as input)
- **name** (string): The custom name provided by the user (defaults to "Orchestrator AA Wallet")

### details Object
- **aaWalletId** (string): Same as accountId (for backward compatibility)
- **userAddress** (string): The user's wallet address
- **publicKey** (string): The public key used for the AA wallet
- **fundedBalance** (number): The amount of HBAR funded to the wallet
- **fundingTxId** (string): Transaction ID of the funding transaction
- **createdAt** (Date): Timestamp when the wallet was created

## Usage Examples

### JavaScript/TypeScript
```typescript
const response = await fetch('/orchestrator/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    fundingAmount: 10,
    name: 'My Custom AA Wallet'
  })
})

const data = await response.json()
const { accountId, evmAddress, name } = data.aaWallet

console.log(`Created wallet: ${name}`)
console.log(`Account ID: ${accountId}`)
console.log(`EVM Address: ${evmAddress}`)
```

### Python
```python
import requests

response = requests.post('/orchestrator/register', json={
    'userAddress': '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    'fundingAmount': 10,
    'name': 'My Custom AA Wallet'
})

data = response.json()
aa_wallet = data['aaWallet']

print(f"Created wallet: {aa_wallet['name']}")
print(f"Account ID: {aa_wallet['accountId']}")
print(f"EVM Address: {aa_wallet['evmAddress']}")
```

## Benefits

1. **Consistent Format**: All AA wallet responses use the same structure
2. **Clean Interface**: Essential information is easily accessible
3. **Backward Compatibility**: Detailed information still available in `details`
4. **Type Safety**: Well-defined interfaces for TypeScript integration
5. **Easy Integration**: Simple object structure for frontend consumption

## Testing

Run the test to see the response format in action:

```bash
bun run scripts/tests/test-aa-wallet-response.ts
```

This will demonstrate the exact response format and show how to use the new structure.
