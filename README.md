# 📋 Office Checklist Manager

A comprehensive daily task management system with **permanent Google Sheets integration** for monthly reports and historical tracking.

## ✨ Features

### Core Features
- 🌅 **Morning Opening Checklist** - Start-of-day tasks
- 🌙 **Evening Closing Checklist** - End-of-day tasks
- 👤 **Role-Based Access** - Office Boy & Supervisor roles
- ✅ **Supervisor Verification** - Re-verify completed tasks
- 📊 **Submission History** - View all past records
- 📥 **CSV Export** - Download data locally

### Google Sheets Integration ⭐
- ☁️ **Automatic Sync** - Data syncs on every submission
- 📈 **Two-Sheet System**:
  - **Summary Sheet** - Overview with completion percentages
  - **Task Details Sheet** - Detailed breakdown of every task
- 📅 **Monthly Reports** - Built-in filtering and reporting
- 🔄 **Real-time Updates** - No manual sync required
- 🎨 **Color-Coded Data** - Visual indicators for status
- 🔒 **Audit Trail** - Complete history of all submissions

## 🚀 Quick Start

### 1. Run the Application
Open `index.html` in a web browser (Chrome recommended)

### 2. Default Login
- **Username**: Any name (e.g., "John Doe")
- **Password**: `demo123`
- **Role**: Choose "Office Boy" or "Supervisor"

### 3. Setup Google Sheets (One-Time)
Follow the guide in `GOOGLE_SHEETS_SETUP.md` to enable permanent syncing.

## 📁 Project Structure

```
0_officeChecklistManager/
├── index.html                    # Main HTML file
├── src/
│   ├── main.js                   # Application logic with auto-sync
│   └── style.css                 # Styling
├── google-apps-script.js         # Google Sheets backend script
├── GOOGLE_SHEETS_SETUP.md        # Setup instructions
└── README.md                     # This file
```

## 🎯 How It Works

### Workflow
1. **Login** → User enters credentials and role
2. **Select Task** → Choose Opening or Closing checklist
3. **Complete Tasks** → Check items and add remarks
4. **Submit** → Data saved locally AND synced to Google Sheets automatically
5. **Supervisor Reviews** → (Optional) Supervisor can re-verify tasks
6. **Reports** → Access data in Google Sheets for analysis

### Data Flow
```
User Submission
      ↓
Local Storage (Backup)
      ↓
Auto-Sync Function
      ↓
Google Apps Script API
      ↓
Google Sheets (2 Tabs)
  ├── Summary
  └── Task Details
```

## 🛠️ Customization

### Adding New Tasks
Edit `src/main.js`:

```javascript
const OPENING_CHECKLIST = [
  "Light On",
  "Camera On",
  // Add your custom tasks here
];

const CLOSING_CHECKLIST = [
  "Light OFF",
  "Camera OFF",
  // Add your custom tasks here
];
```

### Changing Password
Edit line 58 in `src/main.js`:

```javascript
if (password === "demo123") {  // Change "demo123" to your password
```

### Customizing Sheets
Edit `google-apps-script.js` to modify:
- Column headers
- Data formatting
- Color schemes
- Additional sheets

## 📊 Using Your Data

### Monthly Reports
1. Open your Google Sheet
2. Use **Filter** on Date column
3. Select month/year range
4. Analyze completion rates

### Performance Tracking
- Sort by **Completion %** to see best/worst days
- Filter by **User** to track individual performance
- Use **Pivot Tables** for advanced analysis

### Exporting Data
- **From App**: Click "Download CSV" in History view
- **From Sheets**: File → Download → Excel/CSV

## 🔒 Security Notes

- All data stored locally in browser localStorage
- Google Sheets accessible only via your deployed script URL
- No external servers or databases used
- Configure Google Sheets access permissions as needed

## 💡 Tips

1. **Daily Routine**: Set up app as homepage for office computers
2. **Backup**: Periodically backup the Google Sheet
3. **Monitoring**: Share Sheet (view-only) with management
4. **Reports**: Create monthly charts in Google Sheets
5. **Alerts**: Use Google Sheets notifications for incomplete tasks

## 🐛 Troubleshooting

### Data not syncing to Sheets?
- Open browser console (F12) and check for errors
- Verify Google Sheets setup in `GOOGLE_SHEETS_SETUP.md`
- Data is still saved locally even if sync fails

### Login issues?
- Password is `demo123` (case-sensitive)
- Clear browser cache and try again

### Old data missing?
- Check localStorage: F12 → Application → Local Storage
- Check Google Sheets for historical data

## 📝 License

Free to use and modify for your organization.

## 🤝 Support

For setup help, refer to:
1. `GOOGLE_SHEETS_SETUP.md` - Detailed Google Sheets setup
2. Browser console (F12) - Check for error messages
3. Google Apps Script logs - Check execution history

---

**Built for office task management with permanent data storage** ⭐

