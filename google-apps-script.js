// ============================================
// GOOGLE APPS SCRIPT FOR OFFICE CHECKLIST MANAGER
// ============================================
// Instructions:
// 1. Open your Google Sheet
// 2. Go to Extensions > Apps Script
// 3. Delete any existing code and paste this entire script
// 4. Click "Deploy" > "New deployment"
// 5. Select "Web app", set "Execute as: Me", "Who has access: Anyone"
// 6. Click "Deploy" and copy the Web App URL
// 7. Paste the URL in your Office Checklist Manager settings

function doPost(e) {
  try {
    var lock = LockService.getScriptLock();
    lock.waitLock(30000); // Wait up to 30 seconds for other processes to finish
    
    var sheet = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    
    // Get or create sheets
    var summarySheet = getOrCreateSheet(sheet, "Summary");
    var detailsSheet = getOrCreateSheet(sheet, "Task Details");
    
    // Setup headers if needed
    setupSummaryHeaders(summarySheet);
    setupDetailsHeaders(detailsSheet);
    
    if (data.isVerification) {
      // Update existing rows instead of appending new ones
      var updated = false;
      try {
        updated = updateSummaryVerification(summarySheet, data);
        updateDetailsVerification(detailsSheet, data);
      } catch (updateErr) {
        // If anything goes wrong, fall back to append to avoid data loss
        addSummaryRow(summarySheet, data);
        addDetailedRows(detailsSheet, data);
      }
    } else {
      // First-time submission: append rows
      addSummaryRow(summarySheet, data);
      addDetailedRows(detailsSheet, data);
    }
    
    lock.releaseLock();
    
    return ContentService.createTextOutput(
      JSON.stringify({success: true, message: "Data synced successfully"})
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch(err) {
    return ContentService.createTextOutput(
      JSON.stringify({success: false, error: err.toString()})
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(spreadsheet, sheetName) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  return sheet;
}

function setupSummaryHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    var headers = [
      "Date",
      "Submitted At",
      "User",
      "Role",
      "Type",
      "Completed Tasks",
      "Total Tasks",
      "Completion %",
      "Login Time",
      "Supervisor Review",
      "Supervisor Name",
      "Verified At"
    ];
    
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setBackground("#4285F4");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
  }
}

function setupDetailsHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    var headers = [
      "Date",
      "Submitted At",
      "User",
      "Type",
      "Task Name",
      "Status",
      "Remark",
      "Timestamp",
      "Supervisor Verified",
      "Supervisor Remark"
    ];
    
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setBackground("#34A853");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
  }
}

function addSummaryRow(sheet, data) {
  var completionPercent = ((data.completedCount / data.totalCount) * 100).toFixed(1) + "%";
  
  var row = [
    data.date,
    data.submittedAt,
    data.user,
    data.role,
    data.checklistType,
    data.completedCount,
    data.totalCount,
    completionPercent,
    data.loginTime,
    data.supervisorReview ? "Yes" : "No",
    data.supervisor,
    data.verifiedAt
  ];
  
  sheet.appendRow(row);
  
  // Format the new row
  var lastRow = sheet.getLastRow();
  var rowRange = sheet.getRange(lastRow, 1, 1, row.length);
  
  // Alternate row colors
  if (lastRow % 2 === 0) {
    rowRange.setBackground("#F8F9FA");
  }
  
  // Color code completion percentage
  var percentCell = sheet.getRange(lastRow, 8);
  var percent = parseFloat(completionPercent);
  if (percent === 100) {
    percentCell.setBackground("#D4EDDA").setFontColor("#155724");
  } else if (percent >= 80) {
    percentCell.setBackground("#FFF3CD").setFontColor("#856404");
  } else {
    percentCell.setBackground("#F8D7DA").setFontColor("#721C24");
  }
  
  // Auto-resize columns
  sheet.autoResizeColumns(1, row.length);
}

function addDetailedRows(sheet, data) {
  var tasks = data.tasks || [];
  
  tasks.forEach(function(task) {
    var row = [
      data.date,
      data.submittedAt,
      data.user,
      data.checklistType,
      task.taskName,
      task.status,
      task.remark,
      task.timestamp,
      task.supervisorVerified,
      task.supervisorRemark
    ];
    
    sheet.appendRow(row);
    
    // Format the new row
    var lastRow = sheet.getLastRow();
    var rowRange = sheet.getRange(lastRow, 1, 1, row.length);
    
    // Alternate row colors
    if (lastRow % 2 === 0) {
      rowRange.setBackground("#F8F9FA");
    }
    
    // Color code status
    var statusCell = sheet.getRange(lastRow, 6);
    if (task.status === "Done") {
      statusCell.setBackground("#D4EDDA").setFontColor("#155724");
    } else {
      statusCell.setBackground("#F8D7DA").setFontColor("#721C24");
    }
  });
  
  // Auto-resize columns
  sheet.autoResizeColumns(1, 10);
}

// Update supervisor verification in Summary sheet (columns 10-12) for an existing submission
function updateSummaryVerification(sheet, data) {
  var submittedAtCol = 2; // "Submitted At"
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false; // only header present
  var range = sheet.getRange(2, submittedAtCol, lastRow - 1, 1);
  var values = range.getValues();
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === data.submittedAt) {
      var rowIndex = i + 2; // account for header row
      // Update Completed, Total and Completion % (cols 6-8) based on supervisor overrides
      var completed = Number(data.completedCount || 0);
      var total = Number(data.totalCount || 0);
      var completionPercent = total > 0 ? ((completed / total) * 100).toFixed(1) + "%" : "0%";
      sheet.getRange(rowIndex, 6, 1, 3).setValues([[completed, total, completionPercent]]);

      // Update Supervisor Review fields (cols 10-12)
      sheet.getRange(rowIndex, 10, 1, 3).setValues([[
        data.supervisorReview ? "Yes" : "No",
        data.supervisor || "-",
        data.verifiedAt || "-"
      ]]);
      return true;
    }
  }
  return false;
}

// Update supervisor verification columns (9-10) in Task Details for an existing submission
function updateDetailsVerification(sheet, data) {
  var submittedAtCol = 2; // "Submitted At"
  var taskNameCol = 5; // "Task Name"
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return; // only header present
  var range = sheet.getRange(2, 1, lastRow - 1, 10); // read all columns for matching
  var rows = range.getValues();
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (row[submittedAtCol - 1] === data.submittedAt) {
      // find matching task in payload by name
      var task = (data.tasks || []).find(function(t){ return t.taskName === row[taskNameCol - 1]; });
      if (task) {
        var rowIndex = i + 2; // account for header
        // Reflect supervisor override in Status (col 6)
        var done = String(task.status || "").toLowerCase() === "done";
        sheet.getRange(rowIndex, 6).setValue(done ? "Done" : "Not Done");
        // Update Supervisor Verified and Remark (cols 9-10)
        sheet.getRange(rowIndex, 9, 1, 2).setValues([[
          task.supervisorVerified,
          task.supervisorRemark
        ]]);
      }
    }
  }
}

// Optional: Function to generate monthly report
function generateMonthlyReport() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var summarySheet = sheet.getSheetByName("Summary");
  
  if (!summarySheet) {
    Logger.log("Summary sheet not found");
    return;
  }
  
  var data = summarySheet.getDataRange().getValues();
  var currentMonth = new Date().getMonth();
  var currentYear = new Date().getFullYear();
  
  var monthlyData = data.filter(function(row, index) {
    if (index === 0) return false; // Skip header
    var date = new Date(row[0]);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  
  Logger.log("Monthly Report: " + monthlyData.length + " records found");
  
  // You can add more sophisticated reporting here
  return monthlyData;
}

