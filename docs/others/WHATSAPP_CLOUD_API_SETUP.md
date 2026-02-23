# WhatsApp Cloud API Setup Guide

This guide walks you through setting up WhatsApp Cloud API (Meta) for Docita after the migration from Twilio.

## Prerequisites

- Meta Business Account (business.facebook.com)
- Facebook Developer Account (developers.facebook.com)
- Verified business domain
- Phone number not already registered with WhatsApp Business

---

## Step 1: Meta Business Verification (24-72 hours)

### 1.1 Create/Access Meta Business Account

1. Go to [business.facebook.com](https://business.facebook.com)
2. Create a new Business Account or use existing one
3. Navigate to **Business Settings** → **Business Info**

### 1.2 Complete Business Verification

1. Go to **Business Settings** → **Security Center**
2. Click **Start Verification**
3. Prepare these documents:
   - Business registration certificate
   - Tax registration (GST certificate for India)
   - Utility bill or bank statement with business address
   - Business license (if applicable)

4. Submit verification request
5. Wait for approval (typically 24-72 hours)

### 1.3 Verify Domain

1. Go to **Business Settings** → **Brand Safety** → **Domains**
2. Add your domain: `your-domain.com`
3. Verify using one of these methods:
   - **DNS TXT Record** (recommended):
     ```
     Type: TXT
     Host: @
     Value: meta-business-verification=xxxxxxxxxx
     ```
   - HTML file upload
   - Meta tag in `<head>`

---

## Step 2: Create WhatsApp Business App

### 2.1 Create App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click **My Apps** → **Create App**
3. Select **Business** type
4. Enter app name: `Docita WhatsApp`
5. Select your Business Account
6. Click **Create App**

### 2.2 Add WhatsApp Product

1. In your app dashboard, click **Add Product**
2. Find **WhatsApp** and click **Set Up**
3. Select your Business Account

### 2.3 Get API Credentials

Navigate to **WhatsApp** → **API Setup**:

| Credential                       | Location       | Use In                 |
| -------------------------------- | -------------- | ---------------------- |
| **Phone Number ID**              | API Setup page | `META_PHONE_NUMBER_ID` |
| **WhatsApp Business Account ID** | API Setup page | Reference only         |
| **Temporary Access Token**       | API Setup page | Testing only           |

### 2.4 Create System User & Permanent Token

1. Go to **Business Settings** → **Users** → **System Users**
2. Click **Add** → Create new system user
3. Name: `docita-api`
4. Role: **Admin**
5. Click **Generate Token**
6. Select your WhatsApp app
7. Add permissions:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
8. Generate and save the token → `META_ACCESS_TOKEN`

### 2.5 Get App Secret

1. Go to **App Dashboard** → **Settings** → **Basic**
2. Click **Show** next to App Secret
3. Copy → `META_APP_SECRET`

---

## Step 3: Register Phone Number

### 3.1 Add Business Phone Number

1. Go to **WhatsApp** → **API Setup** → **Add Phone Number**
2. Enter your business phone number
3. Choose verification method: **SMS** or **Voice Call**
4. Enter the verification code

### 3.2 Set Display Name

1. Go to **WhatsApp** → **API Setup**
2. Click on your phone number
3. Set **Display Name**: `Docita Clinic` (or your business name)
4. Wait for approval (usually instant, can take up to 24 hours)

---

## Step 4: Configure Webhooks

### 4.1 Set Webhook URL

1. Go to **WhatsApp** → **Configuration**
2. Click **Edit** next to Webhooks
3. Configure:
   ```
   Callback URL: https://api.your-domain.com/whatsapp/webhook
   Verify Token: your_custom_verify_token  (same as META_VERIFY_TOKEN)
   ```
4. Click **Verify and Save**

### 4.2 Subscribe to Webhook Fields

Enable these webhook fields:

- `messages` - Incoming messages from patients
- `message_status` - Delivery/read receipts

---

## Step 5: Submit Message Templates

Templates must be approved before sending to patients. Submit via **WhatsApp Manager**.

### 5.1 Access Template Manager

1. Go to [business.facebook.com/wa/manage/message-templates](https://business.facebook.com/wa/manage/message-templates)
2. Select your WhatsApp Business Account

### 5.2 Create Templates

Submit these templates (adjust content as needed):

#### Template 1: `appointment_scheduled`

```
Category: UTILITY
Language: English

Header: None
Body:
Hello {{1}}

Your appointment at *{{2}}* is confirmed!

 Date: {{3}}
 Time: {{4}}
‍️ Doctor: Dr. {{5}}

We look forward to seeing you!

Footer: Reply to confirm or reschedule
Buttons:
- Quick Reply:  Confirm
- Quick Reply:  Reschedule
- Quick Reply:  Cancel
```

#### Template 2: `appointment_reminder_24hr`

```
Category: UTILITY
Language: English

Body:
 *Appointment Tomorrow* - {{1}}

Hi {{2}}, this is a reminder about your appointment tomorrow.

 Date: {{3}}
 Time: {{4}}
‍️ Doctor: Dr. {{5}}

Please arrive 10 minutes early.

Buttons:
- Quick Reply:  Confirm
- Quick Reply:  Reschedule
- Quick Reply:  Cancel
```

#### Template 3: `appointment_reminder_30min`

```
Category: UTILITY
Language: English

Body:
 *Reminder* - {{1}}

Hi {{2}}, your appointment is in 30 minutes!

‍️ Dr. {{3}}
 {{4}}

Are you on your way?

Buttons:
- Quick Reply:  On my way
- Quick Reply: ️ Running late
- Quick Reply:  Cancel
```

#### Template 4: `prescription_ready`

```
Category: UTILITY
Language: English

Body:
Hello {{1}}

Your prescription from *{{2}}* is ready!

 *Medications:*
{{3}}

 *Instructions:*
{{4}}

‍️ Prescribed by: Dr. {{5}}

For queries, contact us. Get well soon!
```

#### Template 5: `invoice_ready`

```
Category: UTILITY
Language: English

Body:
Hello {{1}}

Your invoice from *{{2}}* is ready.

 *Amount:* {{3}}
 *Invoice #:* {{4}}
 *Date:* {{5}}

Thank you for choosing us!

Buttons:
- Call to Action (URL):  Pay Now → {{6}}
```

#### Template 6: `payment_confirmation`

```
Category: UTILITY
Language: English

Body:
 *Payment Received* - {{1}}

Thank you {{2}}! We've received your payment.

 *Amount:* {{3}}
 *Invoice #:* {{4}}
️ *Date:* {{5}}
 *Payment ID:* {{6}}

Your receipt is available in the app.

Thank you for choosing us!
```

#### Template 7: `payment_link`

```
Category: UTILITY
Language: English

Body:
Hello {{1}}

Here's your payment link from *{{2}}*:

 *Amount:* {{3}}
 *For:* {{4}}

This link expires in 24 hours.

Buttons:
- Call to Action (URL):  Pay Now → {{5}}
```

### 5.3 Template Approval Timeline

| Status   | Meaning       | Typical Time        |
| -------- | ------------- | ------------------- |
| Pending  | Under review  | -                   |
| Approved | Ready to use  | 24-48 hours         |
| Rejected | Needs changes | Resubmit with fixes |

**Tips for faster approval:**

- Use clear, professional language
- Avoid promotional content in UTILITY templates
- Include opt-out instructions if applicable
- Match template category to actual use case

---

## Step 6: Environment Configuration

### 6.1 Update Production Environment

Add these environment variables to your production deployment:

```env
# WhatsApp Cloud API (Meta)
META_PHONE_NUMBER_ID="123456789012345"
META_ACCESS_TOKEN="EAAxxxxxxxxxxxxxxxxxxxxxxxx"
META_APP_SECRET="abc123def456ghi789"
META_VERIFY_TOKEN="your_custom_secure_token_here"
WHATSAPP_PRODUCTION_MODE="true"
```

### 6.2 Verify Token Security

Generate a secure verify token:

```bash
openssl rand -hex 32
```

Use this value for both:

- `META_VERIFY_TOKEN` in your environment
- **Verify Token** in Meta webhook configuration

---

## Step 7: Database Migration

### 7.1 Run Migration

```bash
cd packages/db
pnpm prisma migrate deploy
```

This applies the migration that:

- Renames `twilioContentSid` → `metaTemplateId`
- Changes default provider from `"twilio"` → `"meta"`

### 7.2 Update Existing Templates (Optional)

If you have clinic-specific templates in the database:

```sql
-- Update template IDs after Meta approval
UPDATE "WhatsappTemplate"
SET "metaTemplateId" = 'appointment_scheduled',
    "status" = 'APPROVED'
WHERE "name" = 'appointment_scheduled';

-- Repeat for other templates...
```

---

## Step 8: Testing

### 8.1 Test with Meta's Test Number

Before production, test with Meta's sandbox:

1. Go to **WhatsApp** → **API Setup**
2. Use the **Test** section
3. Add your phone number as recipient
4. Send a test message

### 8.2 Test Webhook Verification

```bash
# Should return the challenge value
curl "https://api.your-domain.com/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=your_verify_token&hub.challenge=12345"
# Expected: 12345
```

### 8.3 Test Message Sending

```bash
curl -X POST https://api.your-domain.com/whatsapp/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "appointment_scheduled",
    "phoneNumber": "+919876543210",
    "variables": {
      "patientName": "John Doe",
      "clinicName": "City Clinic",
      "date": "Jan 10, 2026",
      "time": "10:30 AM",
      "doctorName": "Smith"
    }
  }'
```

---

## Step 9: Go Live Checklist

- [ ] Meta Business Account verified
- [ ] Domain verified
- [ ] WhatsApp Business App created
- [ ] Phone number registered and display name approved
- [ ] System user token generated (permanent)
- [ ] All 7+ templates approved
- [ ] Webhook URL configured and verified
- [ ] Environment variables set in production
- [ ] Database migration applied
- [ ] Test messages sent successfully
- [ ] Webhook receiving messages correctly

---

## Troubleshooting

### Common Issues

| Issue                      | Solution                                                |
| -------------------------- | ------------------------------------------------------- |
| Webhook verification fails | Check `META_VERIFY_TOKEN` matches exactly               |
| Messages not sending       | Verify `META_ACCESS_TOKEN` hasn't expired               |
| Template rejected          | Review Meta's template guidelines, resubmit             |
| Rate limit errors          | Implement exponential backoff, check quotas             |
| Signature validation fails | Ensure `META_APP_SECRET` is correct, raw body preserved |

### Useful Links

- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Template Guidelines](https://developers.facebook.com/docs/whatsapp/message-templates/guidelines)
- [Webhook Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Error Codes](https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes)

### Support

- Meta Business Help: [business.facebook.com/help](https://business.facebook.com/help)
- Developer Support: [developers.facebook.com/support](https://developers.facebook.com/support)

---

## Cost Comparison

| Volume (msgs/month) | Twilio Cost | Cloud API Cost | Savings |
| ------------------- | ----------- | -------------- | ------- |
| 500                 | ~₹750       | ~₹70           | 90%     |
| 1,500               | ~₹2,250     | ~₹210          | 91%     |
| 5,000               | ~₹7,500     | ~₹700          | 91%     |
| 15,000              | ~₹22,500    | ~₹2,100        | 91%     |

_Based on India pricing: Cloud API ~₹0.14/conversation vs Twilio ~₹1.50/message_

---

**Last Updated:** January 6, 2026
