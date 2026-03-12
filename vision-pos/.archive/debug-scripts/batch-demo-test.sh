#!/bin/bash

# Demo Document Batch Testing Script

BASE_URL="http://localhost:3000/api"
RESULTS_FILE="/private/tmp/claude/-Users-cmac-let/4800dd6b-c887-420f-a8d2-be9d3125a356/scratchpad/demo-results.txt"

# Documents to test
declare -A docs
docs[1]="DA_Eyemed-Benefits.pdf|cminudpy65fd6hfrxt9e|David Anderson|/Users/cmac/let/vision-pos/public/uploads/insurance-docs/cminudpy65fd6hfrxt9e_1768608907330_DA_Eyemed-Benefits.pdf"
docs[2]="TC_Benefits-Eyemed.pdf|cminudpygf869vu4l7iv|Thomas Chadwick|/Users/cmac/let/vision-pos/public/uploads/insurance-docs/cminudpygf869vu4l7iv_1769443233666_TC_Benefits-Eyemed.pdf"
docs[3]="SS_eyemed.pdf|cust_93800643|Steven Soto|/Users/cmac/let/vision-pos/public/uploads/insurance-docs/cust_93800643_1768495131786_SS_eyemed.pdf"
docs[4]="LM_eyemed-2025.pdf|cminudpyz0qoge161phfm|Lorene Mingione|/Users/cmac/let/vision-pos/public/uploads/insurance-docs/cminudpyz0qoge161phfm_1768610228772_LM_eyemed-2025.pdf"
docs[5]="GB_eyemed.pdf|cminudpycvo1756s326c|GB Customer|/Users/cmac/let/vision-pos/public/uploads/insurance-docs/cminudpycvo1756s326c_1768613356788_GB_eyemed.pdf"
docs[6]="ES_Eyemed-Benefits.pdf|cminudpz5eyycx1vchw|ES Customer|/Users/cmac/let/vision-pos/public/uploads/insurance-docs/cminudpz5eyycx1vchw_1768609270089_ES_Eyemed-Benefits.pdf"
docs[7]="AP_eyemed.pdf|cminudpz2mmiy1b7r9hh|AP Customer|/Users/cmac/let/vision-pos/public/uploads/insurance-docs/cminudpz2mmiy1b7r9hh_1768608797399_AP_eyemed.pdf"
docs[8]="ER-eyemed.pdf|cminudpz3totzr070b3c|ER Customer|/Users/cmac/let/vision-pos/public/uploads/insurance-docs/cminudpz3totzr070b3c_1768609269396_ER-eyemed.pdf"

echo "🚀 Starting Batch Demo Document Testing"
echo "Processing ${#docs[@]} documents..."
echo "=======================================================================" > "$RESULTS_FILE"

successful=0
failed=0

for i in "${!docs[@]}"; do
  IFS='|' read -r docname custid custname filepath <<< "${docs[$i]}"

  echo ""
  echo "📄 [$i/8] Processing: $docname"

  # Step 1: Upload document
  echo "  1️⃣  Uploading..."
  upload_resp=$(curl -s -X POST "$BASE_URL/documents/upload" \
    -F "file=@$filepath" \
    -F "customerId=$custid" \
    -F "uploadedBy=demo-test")

  doc_id=$(echo $upload_resp | jq -r '.documentId // empty' 2>/dev/null)

  if [ -z "$doc_id" ]; then
    echo "  ❌ Upload failed"
    echo "$docname|$custid|FAILED|Upload error" >> "$RESULTS_FILE"
    ((failed++))
    continue
  fi

  echo "    ✓ Document ID: $doc_id"

  # Step 2: Process (extract)
  echo "  2️⃣  Extracting..."
  process_resp=$(curl -s -X POST "$BASE_URL/documents/$doc_id/process")
  carrier=$(echo $process_resp | jq -r '.carrier // empty' 2>/dev/null)

  if [ -z "$carrier" ]; then
    echo "  ❌ Extraction failed"
    echo "$docname|$custid|FAILED|Extraction error" >> "$RESULTS_FILE"
    ((failed++))
    continue
  fi

  member_name=$(echo $process_resp | jq -r '.memberName // "N/A"' 2>/dev/null)
  member_id=$(echo $process_resp | jq -r '.memberId // "N/A"' 2>/dev/null)
  echo "    ✓ Carrier: $carrier"
  echo "    ✓ Member: $member_name ($member_id)"

  # Step 3: Verify (create authorization)
  echo "  3️⃣  Verifying & creating authorization..."
  verify_resp=$(curl -s -X POST "$BASE_URL/documents/$doc_id/verify")
  auth_id=$(echo $verify_resp | jq -r '.authorizationId // empty' 2>/dev/null)

  if [ -z "$auth_id" ]; then
    echo "  ❌ Verification failed"
    echo "$docname|$custid|FAILED|Verification error" >> "$RESULTS_FILE"
    ((failed++))
    continue
  fi

  echo "    ✓ Authorization ID: $auth_id"

  # Step 4: Get authorization details
  echo "  4️⃣  Fetching details..."
  auth_resp=$(curl -s "$BASE_URL/customers/$custid/authorization")
  exam_copay=$(echo $auth_resp | jq -r '.examCopay // "N/A"' 2>/dev/null)
  frame_allow=$(echo $auth_resp | jq -r '.frameAllowance // "N/A"' 2>/dev/null)
  echo "    ✓ Exam: \$$exam_copay, Frame: \$$frame_allow"

  # Step 5: Get pricelist count
  echo "  5️⃣  Checking pricelist..."
  price_resp=$(curl -s "$BASE_URL/customers/$custid/price-plan")
  product_count=$(echo $price_resp | jq -r '.products | length // 0' 2>/dev/null)
  echo "    ✓ Products priced: $product_count"

  echo "  ✅ Success"
  echo "$docname|$custid|$custname|SUCCESS|$auth_id|$exam_copay|$frame_allow|$product_count|http://localhost:3000/customers/$custid?tab=price-plan" >> "$RESULTS_FILE"
  ((successful++))

  # Small delay to avoid rate limiting
  sleep 2
done

echo ""
echo "======================================================================="
echo ""
echo "📊 RESULTS SUMMARY"
echo ""
echo "Processed: $successful successful, $failed failed out of 8"
echo ""
echo "Results saved to: $RESULTS_FILE"
echo ""
echo "Customer Profile Links:"
grep "SUCCESS" "$RESULTS_FILE" | while IFS='|' read -r doc cust name status auth exam frame prod link; do
  echo "  $link"
done

echo ""
echo "✅ Batch testing complete!"
