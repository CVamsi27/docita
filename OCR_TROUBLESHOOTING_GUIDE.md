# OCR Smart Digitization - Troubleshooting Guide

## Understanding the "Low Confidence Fields Detected" Message

When you see empty columns with "Low confidence fields detected" in the Staff Correction Panel, it means the OCR system couldn't extract text from the image with high confidence.

## Why Does This Happen?

### Common Causes:
1. **Tesseract.js Loading Issues** - The OCR library fails to download or initialize
2. **Poor Image Quality** - Blurry, dark, or low-resolution images
3. **Handwritten Text** - The OCR system struggles with cursive or poor handwriting
4. **Unusual Formatting** - Non-standard medical document layouts
5. **Server Environment** - Network connectivity issues downloading language files

## What to Do When Fields Are Empty

### Step 1: Check the Message
Look at the message at the top of the form. It tells you what happened:
- ✅ **"Document scanned using Tesseract OCR"** = OCR worked
- ⚠️ **"Unable to extract text from image"** = OCR failed, manual entry needed

### Step 2: Manually Enter the Highlighted Fields
When OCR fails:
1. All fields will be empty with **low confidence (0-20%)**
2. Fields are highlighted to show which ones need attention
3. You can manually type in the values

### Step 3: Use the Staff Correction Panel

The form shows three sections:

#### **Personal Information**
- **First Name**: Patient's first name (required for record creation)
- **Last Name**: Patient's surname
- **Age**: Numeric age or calculated from date of birth
- **Gender**: Select from MALE, FEMALE, OTHER
- **Phone Number**: 10-digit contact number (required)
- **Email**: Patient's email address

#### **Medical Information**
- **Blood Type**: Format like "O+", "A-", "B+", "AB-"
- **Diagnosis**: Chief complaint or diagnosis
- **Symptoms**: Any listed symptoms
- **Allergies**: Known allergies (important!)
- **Medical History**: Past medical conditions

#### **Vital Signs & Lab Values**
- **Blood Pressure**: Format "120/80" (systolic/diastolic)
- **Temperature**: In Celsius (e.g., "98.6")
- **Pulse**: Beats per minute
- **SpO2**: Oxygen saturation percentage
- **Blood Glucose**: Lab value
- **Hemoglobin**: Lab value
- **Creatinine**: Lab value

### Step 4: Review Confidence Scores

Each field shows a confidence indicator:
- 🟢 **Green (60-100%)**: Field was extracted with good confidence
- 🟡 **Yellow (40-60%)**: Field should be reviewed
- 🔴 **Red (0-40%)**: Field is empty or low confidence - needs manual entry

## Tips for Better OCR Results

### Taking Better Photos:
1. **Use Good Lighting** - Natural light works best
2. **Keep Documents Flat** - Avoid angles or folds
3. **Center the Content** - Ensure text is fully visible
4. **Avoid Shadows** - Shadows can obscure text
5. **Use High Resolution** - Modern phone cameras work well

### Document Quality:
1. **Use Clear Originals** - Avoid photocopies of photocopies
2. **Black Ink on White Paper** - High contrast is better
3. **Remove Handwritten Marks** - Use clean documents if possible
4. **Legible Handwriting** - Cursive is harder to extract

### When OCR Consistently Fails:

If OCR keeps failing for certain documents:
1. **Check Image Size** - File should be reasonable size (not tiny)
2. **Verify Format** - Use JPEG, PNG, GIF, or WebP
3. **Check Connection** - Ensure server can reach OCR service
4. **Manual Entry** - Fall back to typing information directly

## Workflow for Failed OCR

```
1. Click "Scan Image" button
   ↓
2. OCR processes document
   ↓
3. If successful: Fields populate, confidence shows 60-90%
   ↓
4. If failed: Message shows "Unable to extract text from image"
   ↓
5. Manually enter required fields:
   - First Name (required)
   - Last Name
   - Phone Number (required)
   - Age, Gender, etc.
   ↓
6. Click "Save & Create Record"
   ↓
7. Patient record created with manual data
```

## Saving Records with Manual Data

You can save patient records even with low OCR confidence:

1. **Minimum Required Fields**:
   - ✅ First Name
   - ✅ Phone Number (or age)
   - ✅ Gender

2. **Click "Save & Create Record"**:
   - System creates patient in database
   - Creates appointment/visit record
   - Saves vital signs if provided

3. **What Happens Next**:
   - You're redirected to patient profile
   - You can continue adding more details
   - Can attach original document if needed

## Advanced Troubleshooting

### If OCR Keeps Timing Out:
1. Reduce image size (resize to < 5MB)
2. Try a different image format
3. Check server logs for errors
4. Contact system administrator

### If Fields Keep Showing Empty:
1. Make sure image file is valid
2. Verify browser has camera/file permissions
3. Try uploading a test document
4. Clear browser cache and reload

### If Confidence Scores Are Always Low:
1. Try higher quality images
2. Ensure good lighting and contrast
3. Use documents with printed text (not handwritten)
4. Check that OCR service is running

## Performance Notes

- **First Scan**: May take 30-60 seconds (downloading language files)
- **Subsequent Scans**: Typically 5-15 seconds
- **Large Images**: May take longer to process
- **Timeout**: If takes > 60 seconds, will return empty with low confidence

## Getting Help

If you continue to experience issues:
1. Check browser console (F12) for errors
2. Note the timestamp and document type
3. Contact administrator with:
   - Error message shown
   - Image file (if possible)
   - Browser and device used
   - Steps to reproduce

---

**Remember**: The OCR system is a convenience tool. When it doesn't work, manual entry is always available and just as valid for creating patient records. The system prioritizes accuracy over automation.
