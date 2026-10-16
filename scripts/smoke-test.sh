#!/usr/bin/env bash
# Smoke test against a running ScopeLock instance (default http://localhost:3000)
set -euo pipefail
BASE="${SCOPELOCK_URL:-http://localhost:3000}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "→ $BASE/api/health"
curl -sf "$BASE/api/health" | python3 -m json.tool

echo "→ index SOW"
INDEX_JSON=$(curl -sf -X POST "$BASE/api/sow" \
  -H 'Content-Type: application/json' \
  -d "$(python3 -c "import json; print(json.dumps({'title':'Smoke test SOW','content':open('$ROOT/samples/sow.md').read()}))")")
echo "$INDEX_JSON" | python3 -m json.tool
DOC_ID=$(echo "$INDEX_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['documentId'])")
BACKEND=$(echo "$INDEX_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('backend','tiger'))")

BODY=$(python3 -c "
import json
thread=open('$ROOT/samples/thread.txt').read()
payload={'thread':thread,'hourlyRate':125}
if '$BACKEND'=='mongodb':
    payload['mongoDocumentId']='$DOC_ID'
else:
    payload['documentId']='$DOC_ID'
print(json.dumps(payload))
")

echo "→ analyze (may take ~60s)"
curl -sf -X POST "$BASE/api/analyze" -H 'Content-Type: application/json' -d "$BODY" \
  -o /tmp/scopelock-smoke-analyze.json
python3 -c "
import json
d=json.load(open('/tmp/scopelock-smoke-analyze.json'))
assert 'result' in d, d.get('error')
r=d['result']
print('mode', d.get('mode'), 'risk', r['overallRisk'], 'tabpfn', d.get('tabpfnHours'))
print('analysisId', d.get('analysisId'))
print('summary', r['summary'][:160]+'...')
"

echo "→ voice"
REPLY=$(python3 -c "import json; print(json.load(open('/tmp/scopelock-smoke-analyze.json'))['result']['suggestedReply'][:500])")
curl -sf -X POST "$BASE/api/voice" -H 'Content-Type: application/json' \
  -d "$(python3 -c "import json,sys; print(json.dumps({'text':sys.argv[1]}))" "$REPLY")" \
  -o /tmp/scopelock-smoke-voice.mp3
ls -la /tmp/scopelock-smoke-voice.mp3

echo "✓ smoke test passed"
