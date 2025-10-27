# Google Sheets Integration Setup Guide

## 📋 Overview
This guide will help you set up **permanent** Google Sheets integration for the Office Checklist Manager. Once configured, all checklist submissions will automatically sync to Google Sheets for monthly reports and historical tracking.

## 🎯 What You'll Get
- **Summary Sheet**: Overview of all submissions with completion percentages
- **Task Details Sheet**: Detailed breakdown of every task in each submission
- **Auto-sync**: Data automatically saved on every submission
- **Monthly Reports**: Easy filtering and analysis by month
- **Supervisor Tracking**: Verification records included

---

## 🚀 Setup Steps

### Step 1: Create Google Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Name it: **"Office Checklist Manager Data"**
4. Copy the **Sheet ID** from URL:
   ```
   https://docs.google.com/spreadsheets/d/1A2B3C4D5E6F7G8H9I0J/edit
                                        ^^^^^^^^^^^^^^^^^ (This is your Sheet ID)
   ```

### Step 2: Setup Apps Script
1. In your Google Sheet, click **Extensions** → **Apps Script**
2. Delete any existing code in the editor
3. Copy the entire contents of `google-apps-script.js` from this project
4. Paste it into the Apps Script editor
5. Click the **💾 Save** icon (or Ctrl+S)
6. Name the project: **"Checklist Manager API"**

### Step 3: Deploy as Web App
1. Click **Deploy** → **New deployment**
2. Click the ⚙️ gear icon next to "Select type"
3. Choose **Web app**
4. Configure settings:
   - **Description**: Office Checklist Manager
   - **Execute as**: **Me** (your email)
   - **Who has access**: **Anyone**
5. Click **Deploy**
6. Review permissions and click **Authorize access**
7. Choose your Google account
8. Click **Advanced** → **Go to Checklist Manager API (unsafe)**
9. Click **Allow**
10. **Copy the Web App URL** (looks like: `https://script.google.com/macros/s/ABC.../exec`)

### Step 4: Configure in App
1. Open the Office Checklist Manager application
2. On the login page, click **⚙️ Setup Google Sheets Sync**
3. Enter your **Sheet ID** (from Step 1)
4. Enter your **Web App URL** (from Step 3)
5. Click **Save Settings**

---

## ✅ Testing the Integration

1. **Login** to the app with credentials:
   - Username: `test`
   - Password: `demo123`
   - Role: `Office Boy`

2. **Complete a checklist**:
   - Click "Morning Opening" or "Evening Closing"
   - Check some tasks
   - Submit the checklist

3. **Check Google Sheets**:
   - Go back to your Google Sheet
   - You should see **two new sheets**:
     - **Summary**: One row with submission overview
     - **Task Details**: Multiple rows with each task's details

4. **Verify auto-sync** by checking browser console:
   - Press F12 → Console tab
   - You should see: `✓ Data synced to Google Sheets`

---

## 📊 Understanding Your Sheets

### Summary Sheet Columns
| Column | Description |
|--------|-------------|
| Date | Submission date |
| Submitted At | Exact submission timestamp |
| User | Employee name |
| Role | officeboy or supervisor |
| Type | opening or closing |
| Completed Tasks | Number of tasks completed |
| Total Tasks | Total number of tasks |
| Completion % | Percentage completed (color-coded) |
| Login Time | When user logged in |
| Supervisor Review | Was it verified? |
| Supervisor Name | Who verified it |
| Verified At | When verification happened |

### Task Details Sheet Columns
| Column | Description |
|--------|-------------|
| Date | Submission date |
| Submitted At | Submission timestamp |
| User | Employee name |
| Type | opening or closing |
| Task Name | Name of the task |
| Status | Done / Not Done (color-coded) |
| Remark | User's remark |
| Timestamp | When task was checked |
| Supervisor Verified | Verification status |
| Supervisor Remark | Supervisor's comment |

---

## 📈 Generating Monthly Reports

### Method 1: Manual Filtering
1. Open your Google Sheet
2. Click on any column header
3. Click the **Filter** icon (funnel)
4. Filter by **Date** column for specific month/year

### Method 2: Pivot Tables
1. Select all data in **Summary** sheet
2. Go to **Insert** → **Pivot table**
3. Configure rows/columns as needed
4. Example: Group by User and Month to see individual performance

### Method 3: Apps Script Function
1. Go to **Extensions** → **Apps Script**
2. Run the `generateMonthlyReport()` function
3. Check **Execution log** for results
4. Modify the function to create custom reports

---

## 🔧 Troubleshooting

### Data not syncing?
1. Check browser console (F12) for errors
2. Verify the Web App URL is correct in settings
3. Make sure Google Sheet is not deleted
4. Try re-deploying the Apps Script with a new version

### Permission errors?
1. Re-authorize the Apps Script
2. Make sure "Who has access" is set to **Anyone**
3. Ensure your Google account has edit access to the sheet

### Duplicate entries?
- This is normal if you submit the same checklist multiple times
- The system is designed to log every submission for audit purposes

---

## 🎉 You're All Set!

Your Office Checklist Manager now has **permanent Google Sheets integration**. Every submission will automatically sync, creating a complete audit trail for:
- Monthly performance reports
- Task completion tracking
- Supervisor verification records
- Employee accountability
- Historical data analysis

## 💡 Tips
- **Backup**: Make a copy of your sheet periodically
- **Share**: Share the sheet with managers (View only)
- **Charts**: Create graphs from the data for visual reports
- **Export**: Download as Excel when needed for offline analysis

