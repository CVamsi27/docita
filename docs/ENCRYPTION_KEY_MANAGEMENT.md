# Encryption Key Management Guide

## Overview

This document provides comprehensive guidance on managing encryption keys for the Docita application, which uses AES-256-GCM encryption for sensitive patient data (DPDP Act 2023 compliance).

## Key Generation

### Initial Setup

Generate a new encryption key using Node.js crypto:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This generates a 64-character hexadecimal string (32 bytes = 256 bits).

### Requirements

- **Format**: 64 hexadecimal characters (a-f, 0-9)
- **Length**: Exactly 32 bytes (256 bits)
- **Example**: `1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890`

## Environment Configuration

### Production

Set the encryption key in your environment:

```bash
export ENCRYPTION_KEY="your_64_char_hex_key_here"
```

Or in your .env file:

```
ENCRYPTION_KEY=your_64_char_hex_key_here
```

### Staging/Development

Use a separate key for each environment. **NEVER** use production keys in non-production environments.

## Key Backup Procedures

### 1. Secure Storage

Store your encryption keys in a secure secrets manager:

#### AWS Systems Manager Parameter Store

```bash
aws ssm put-parameter \
  --name "/docita/production/ENCRYPTION_KEY" \
  --value "your_key_here" \
  --type "SecureString" \
  --description "Docita production encryption key" \
  --tags "Key=Environment,Value=production" "Key=Application,Value=docita"
```

#### HashiCorp Vault

```bash
vault kv put secret/docita/production ENCRYPTION_KEY="your_key_here"
```

#### Google Cloud Secret Manager

```bash
echo -n "your_key_here" | gcloud secrets create docita-encryption-key \
  --data-file=- \
  --replication-policy="automatic"
```

### 2. Offline Backup

For disaster recovery:

1. **Encrypt the key** using GPG:

   ```bash
   echo "your_key_here" | gpg --encrypt --armor --recipient security@yourdomain.com > encryption_key.gpg
   ```

2. **Store securely**:
   - Physical safe or safety deposit box
   - Multiple geographical locations
   - Access restricted to 2-3 authorized personnel only

3. **Document recovery procedures**:
   - Who has access
   - Where keys are stored
   - How to decrypt and restore

## Key Rotation

### When to Rotate

- **Scheduled**: Every 90 days (recommended)
- **Compromised**: Immediately if key exposure is suspected
- **Personnel Changes**: When key custodians leave the organization
- **Regulatory**: As required by compliance audits

### Rotation Process (Current: Manual - TODO: Automate)

#### Step 1: Generate New Key

```bash
# Generate new key
NEW_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "New Key: $NEW_KEY"

# Save to secrets manager immediately
aws ssm put-parameter \
  --name "/docita/production/ENCRYPTION_KEY_V2" \
  --value "$NEW_KEY" \
  --type "SecureString"
```

#### Step 2: Re-encrypt Existing Data

```typescript
// TODO: Implement automated migration script
// For now, manual database update required:

import { EncryptionService } from "./src/common/encryption.service";
import { PrismaClient } from "@prisma/client";

async function rotateEncryptionKey() {
  const prisma = new PrismaClient();

  // Initialize with OLD key
  const oldEncryption = new EncryptionService(/* old key */);

  // Initialize with NEW key
  const newEncryption = new EncryptionService(/* new key */);

  // Fetch all patients
  const patients = await prisma.patient.findMany();

  for (const patient of patients) {
    // Decrypt with old key
    const decrypted = oldEncryption.decryptPatientData(patient);

    // Re-encrypt with new key
    const reencrypted = newEncryption.encryptPatientData(decrypted);

    // Update database
    await prisma.patient.update({
      where: { id: patient.id },
      data: reencrypted,
    });
  }

  console.log(`Rotated encryption for ${patients.length} patients`);
}
```

#### Step 3: Deploy New Key

1. **Test in staging**:

   ```bash
   # Staging deployment with new key
   ENCRYPTION_KEY=$NEW_KEY npm run start:prod
   ```

2. **Deploy to production** (zero-downtime):

   ```bash
   # Set new key in environment
   kubectl set env deployment/docita-api ENCRYPTION_KEY=$NEW_KEY

   # Or for Railway:
   railway variables set ENCRYPTION_KEY=$NEW_KEY

   # Trigger rolling update
   railway up
   ```

3. **Verify** decryption works:
   ```bash
   # Test decryption with new key
   curl -H "Authorization: Bearer $TOKEN" \
     https://api.yourdomain.com/api/v1/patients/patient_id
   ```

#### Step4: Retire Old Key

After 30-day grace period:

1. **Archive old key**:

   ```bash
   aws ssm put-parameter \
     --name "/docita/production/ENCRYPTION_KEY_V1_RETIRED_$(date +%Y%m%d)" \
     --value "$OLD_KEY" \
     --type "SecureString" \
     --tags "Key=Status,Value=retired" "Key=RetiredAt,Value=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
   ```

2. **Delete from active secrets**:

   ```bash
   aws ssm delete-parameter --name "/docita/production/ENCRYPTION_KEY"
   ```

3. **Rename new key to primary**:
   ```bash
   # V2 becomes the new ENCRYPTION_KEY
   ```

## Key Recovery (Emergency)

### Scenario: Lost Production Encryption Key

**Impact**: All encrypted patient data becomes permanently inaccessible.

**Recovery Steps**:

1. **Immediately check backups**:
   - Secrets manager (AWS SSM, Vault, etc.)
   - Offline GPG-encrypted backups
   - Infrastructure-as-code configs (Terraform state, etc.)

2. **If key is irrecoverable**:
   - ⚠️ **Data loss is permanent** for encrypted fields
   - Notify affected patients per DPDP Act requirements
   - Incident response plan activation
   - Regulatory reporting (Data Protection Authority)

3. **Prevention**:
   - Multiple backup locations
   - Regular backup verification drills
   - Audit trail for key access

## Best Practices

### ✅ DO

- Use environment variables or secure secrets managers
- Rotate keys regularly (90-day cycle)
- Maintain offline encrypted backups
- Log all key access (audit trail)
- Use different keys per environment
- Test backup recovery procedures quarterly
- Implement least-privilege access (2-3 personnel only)

### ❌ DON'T

- Commit keys to version control (Git)
- Share keys via email, Slack, or messaging apps
- Use the same key across environments
- Store keys in plain text files
- Skip backup verification
- Grant broad access to encryption keys
- Delay rotation after suspected compromise

## Compliance Considerations

### DPDP Act 2023 Requirements

- **Encryption at rest**: AES-256-GCM ✅
- **Key management**: Documented procedures ✅
- **Access control**: Role-based, audited ✅
- **Data breach notification**: 72-hour window if key compromised
- **Right to erasure**: Re-keying may be required

### HIPAA (if applicable)

- Encryption: AES-256 minimum ✅
- Key management plan documented ✅
- Annual security risk assessment
- Encryption key rotation: Annually minimum (we recommend quarterly)

## Monitoring & Alerts

### Set up alerts for:

- Encryption/decryption failures (indicates key mismatch)
- Unusual access patterns to secrets manager
- Failed key retrieval attempts
- Key age (alert at 80 days for 90-day rotation cycle)

### Sample Alert Configuration (AWS CloudWatch)

```json
{
  "AlarmName": "docita-encryption-key-age",
  "MetricName": "ParameterAge",
  "Threshold": 80,
  "ComparisonOperator": "GreaterThanThreshold",
  "AlarmDescription": "Encryption key is older than 80 days - rotation due"
}
```

## Future Enhancements (TODO)

- [ ] Implement automated key rotation script
- [ ] Add key versioning support in `EncryptionService`
- [ ] Integrate with AWS KMS for envelope encryption
- [ ] Implement key derivation for field-level keys
- [ ] Add metrics dashboard for encryption operations
- [ ] Automated backup verification (monthly)

## Contact & Support

For encryption-related incidents or questions:

- **Security Team**: security@yourdomain.com
- **On-call**: PagerDuty escalation policy
- **Runbook**: internal/runbooks/encryption-incident-response.md
