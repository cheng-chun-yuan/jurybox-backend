#!/bin/bash
# Simple cURL test for Feedback Auth API

BASE_URL="http://localhost:10001"
AGENT_ID=1
CLIENT_ADDRESS="0x742d35cc6634c0532925a3b844bc9e7595f0beb0"

echo "🧪 Testing Feedback Auth API with cURL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Generate FeedbackAuth
echo "📝 Step 1: Generating FeedbackAuth..."
echo "Request:"
echo "POST $BASE_URL/api/feedback/auth/generate"
echo '{"agentId": '$AGENT_ID', "clientAddress": "'$CLIENT_ADDRESS'", "indexLimit": 100, "expiryHours": 1}'
echo ""

AUTH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/feedback/auth/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": '$AGENT_ID',
    "clientAddress": "'$CLIENT_ADDRESS'",
    "indexLimit": 100,
    "expiryHours": 1
  }')

echo "Response:"
echo "$AUTH_RESPONSE" | jq '.'
echo ""

# Extract values for verification
SIGNATURE=$(echo "$AUTH_RESPONSE" | jq -r '.data.signature')
INDEX_FROM=$(echo "$AUTH_RESPONSE" | jq -r '.data.indexFrom')
INDEX_TO=$(echo "$AUTH_RESPONSE" | jq -r '.data.indexTo')
EXPIRY=$(echo "$AUTH_RESPONSE" | jq -r '.data.expiry')
ENCODED=$(echo "$AUTH_RESPONSE" | jq -r '.data.encoded')

if [ "$SIGNATURE" != "null" ]; then
  echo "✅ FeedbackAuth generated successfully!"
  echo "   Signature: ${SIGNATURE:0:30}..."
  echo "   Index Range: $INDEX_FROM → $INDEX_TO"
  echo "   Encoded Length: ${#ENCODED} characters"
  echo ""

  # Step 2: Verify FeedbackAuth
  echo "🔍 Step 2: Verifying FeedbackAuth..."
  echo "Request:"
  echo "POST $BASE_URL/api/feedback/verify"
  echo ""

  VERIFY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/feedback/verify" \
    -H "Content-Type: application/json" \
    -d '{
      "agentId": "'$AGENT_ID'",
      "clientAddress": "'$CLIENT_ADDRESS'",
      "indexFrom": "'$INDEX_FROM'",
      "indexTo": "'$INDEX_TO'",
      "expiry": "'$EXPIRY'",
      "signature": "'$SIGNATURE'"
    }')

  echo "Response:"
  echo "$VERIFY_RESPONSE" | jq '.'
  echo ""

  IS_VALID=$(echo "$VERIFY_RESPONSE" | jq -r '.data.isValid')
  if [ "$IS_VALID" = "true" ]; then
    echo "✅ Signature is valid!"
  else
    echo "⚠️  Signature validation issue"
  fi
else
  echo "❌ Failed to generate FeedbackAuth"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Test completed!"
echo ""
echo "📋 Summary:"
echo "   The encoded FeedbackAuth can be used to submit feedback on-chain."
echo "   It contains the signature that authorizes the client to submit feedback."
echo ""
echo "🔗 Next Steps:"
echo "   1. Use the encoded data: $ENCODED"
echo "   2. Submit to blockchain via ERC-8004 ReputationRegistry contract"
echo "   3. Transaction hash will be returned on successful submission"
