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

    // Deletion endpoint
    if (data && (data.action === 'delete' || data.delete === true)) {
      var ok = deleteSubmission(summarySheet, detailsSheet, data);
      lock.releaseLock();
      return ContentService.createTextOutput(
        JSON.stringify({success: ok, message: ok ? "Deleted" : "Not found"})
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.isUpdate || data.isVerification) {
      // Update existing rows instead of appending new ones
      var updated = false;
      try {
        updated = updateExistingSubmission(summarySheet, detailsSheet, data);
        if (!updated) {
          // Fallback: append if not found (write details first, then summary)
          addDetailedRows(detailsSheet, data);
          addSummaryRow(summarySheet, data, detailsSheet);
        }
      } catch (updateErr) {
        // If anything goes wrong, fall back to append to avoid data loss
        addDetailedRows(detailsSheet, data);
        addSummaryRow(summarySheet, data, detailsSheet);
      }
    } else {
      // First-time submission: write details first, then summary so percent is accurate
      addDetailedRows(detailsSheet, data);
      addSummaryRow(summarySheet, data, detailsSheet);
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

// Delete a submission from both Summary and Task Details
function deleteSubmission(summarySheet, detailsSheet, data) {
  var date = data.date;
  var user = data.user;
  var type = data.checklistType;
  var submittedAt = data.submittedAt; // optional precise key
  var found = false;

  // Delete Summary rows
  var sum = summarySheet.getDataRange().getValues();
  for (var i = sum.length - 1; i >= 1; i--) {
    var r = sum[i];
    if (r[0] === date && r[2] === user && r[4] === type && (!submittedAt || r[1] === submittedAt)) {
      summarySheet.deleteRow(i + 1);
      found = true;
    }
  }

  // Delete Details rows
  var det = detailsSheet.getDataRange().getValues();
  for (var j = det.length - 1; j >= 1; j--) {
    var d = det[j];
    if (d[0] === date && d[2] === user && d[3] === type && (!submittedAt || d[1] === submittedAt)) {
      detailsSheet.deleteRow(j + 1);
    }
  }

  return found;
}

// Read API: returns unified JSON history, supports JSONP via ?callback=fn
function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet();
    var summarySheet = sheet.getSheetByName("Summary");
    var detailsSheet = sheet.getSheetByName("Task Details");

    if (!summarySheet || !detailsSheet) {
      return respond_(e, { success: true, submissions: [] });
    }

    var summary = summarySheet.getDataRange().getValues();
    var details = detailsSheet.getDataRange().getValues();

    var byKey = {};

    // Build from Summary (skip header)
    for (var i = 1; i < summary.length; i++) {
      var row = summary[i];
      var date = row[0];
      var submittedAt = row[1];
      var user = row[2];
      var role = row[3];
      var type = row[4];
      var completedCount = row[5];
      var totalCount = row[6];
      var loginTime = row[8];
      var submissionCount = row[9];
      var revisionHistoryText = row[10] || "";
      var supervisorReview = (row[11] || "").toString().toLowerCase() === "yes";
      var supervisor = row[12] || "-";
      var verifiedAt = row[13] || "-";

      var key = date + "|" + user + "|" + type;
      byKey[key] = {
        date: date,
        submittedAt: submittedAt,
        user: user,
        role: role,
        checklistType: type,
        completedCount: Number(completedCount) || 0,
        totalCount: Number(totalCount) || 0,
        loginTime: loginTime,
        submissionCount: Number(submissionCount) || 1,
        revisionHistory: revisionHistoryText ? revisionHistoryText.split(" | ") : [],
        supervisorReview: supervisorReview,
        supervisor: supervisor,
        verifiedAt: verifiedAt,
        // items shaped like client localStorage expects
        items: []
      };
    }

    // Attach task details (skip header)
    for (var j = 1; j < details.length; j++) {
      var d = details[j];
      var dDate = d[0];
      var dSubmittedAt = d[1];
      var dUser = d[2];
      var dType = d[3];
      var taskName = d[4];
      var status = d[5];
      var remark = d[6];
      var timestamp = d[7];
      var supVerified = d[8];
      var supRemark = d[9];

      var key2 = dDate + "|" + dUser + "|" + dType;
      if (!byKey[key2]) {
        // In case a details row exists without summary (shouldn't happen), seed minimal
        byKey[key2] = {
          date: dDate,
          submittedAt: dSubmittedAt,
          user: dUser,
          role: "",
          checklistType: dType,
          completedCount: 0,
          totalCount: 0,
          loginTime: "",
          submissionCount: 1,
          revisionHistory: [],
          supervisorReview: false,
          supervisor: "-",
          verifiedAt: "-",
          items: []
        };
      }
      byKey[key2].items.push({
        task: taskName,
        checked: String(status || "").toLowerCase() === "done",
        remark: remark && remark !== "-" ? remark : "",
        timestamp: timestamp && timestamp !== "-" ? timestamp : "",
        supervisorVerified: supVerified,
        supervisorRemark: supRemark
      });
    }

    // Recompute counts from items for reliability
    var submissions = Object.keys(byKey).map(function(k){
      var s = byKey[k];
      var total = s.items.length;
      var completed = 0;
      for (var z = 0; z < s.items.length; z++) {
        if (s.items[z].checked) completed++;
      }
      s.totalCount = total;
      s.completedCount = completed;
      return s;
    });

    // Sort by submittedAt desc if possible
    submissions.sort(function(a,b){
      var at = new Date(a.submittedAt || a.date).getTime();
      var bt = new Date(b.submittedAt || b.date).getTime();
      return bt - at;
    });

    return respond_(e, { success: true, submissions: submissions });

  } catch (err) {
    return respond_(e, { success: false, error: err.toString(), submissions: [] });
  }
}

function respond_(e, obj) {
  var payload = JSON.stringify(obj);
  var cb = e && e.parameter && e.parameter.callback;
  if (cb) {
    return ContentService.createTextOutput(cb + "(" + payload + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
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
      "Submission Count",
      "Revision History",
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

function addSummaryRow(sheet, data, detailsSheet) {
  // Prefer server-side recompute from Task Details if sheet provided
  var completionPercent = detailsSheet
    ? recalcCompletionPercent(detailsSheet, data.user, data.date, data.checklistType)
    : ((data.completedCount / data.totalCount) * 100).toFixed(1) + "%";
  var revisionHistoryText = (data.revisionHistory || []).join(" | ");
  
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
    data.submissionCount || 1,
    revisionHistoryText,
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

// Recalculate completion % directly from Task Details sheet
function recalcCompletionPercent(detailsSheet, user, date, type) {
  var values = detailsSheet.getDataRange().getValues();
  var done = 0, total = 0;
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (r[0] === date && r[2] === user && r[3] === type) {
      total++;
      if (String(r[5]).toLowerCase() === "done") done++;
    }
  }
  var pct = total ? ((done / total) * 100).toFixed(1) + "%" : "0%";
  return pct;
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

// Unified function to update existing submission (for both updates and verifications)
function updateExistingSubmission(summarySheet, detailsSheet, data) {
  // Find and update in Summary sheet
  var dateCol = 1;
  var userCol = 3;
  var typeCol = 5;
  var lastRow = summarySheet.getLastRow();
  
  if (lastRow < 2) return false;
  
  var range = summarySheet.getRange(2, 1, lastRow - 1, 5);
  var values = range.getValues();
  
for (var i = 0; i < values.length; i++) {
    var row = values[i];
    if (row[0] === data.date && row[2] === data.user && row[4] === data.checklistType) {
      var rowIndex = i + 2;
      var revisionHistoryText = (data.revisionHistory || []).join(" | ");

      // First update Task Details rows (delete + insert)
      updateTaskDetails(detailsSheet, data);

      // Recompute completion from Task Details sheet
      var completionPercent = recalcCompletionPercent(detailsSheet, data.user, data.date, data.checklistType);

      // Also recompute counts from payload to keep columns 6-7 aligned
      var completedCount = 0;
      var totalCount = 0;
      (data.tasks || []).forEach(function(t){ totalCount++; if (String(t.status||"").toLowerCase()==="done") completedCount++; });
      
      // Update all relevant columns
      summarySheet.getRange(rowIndex, 2).setValue(data.submittedAt);
      summarySheet.getRange(rowIndex, 6).setValue(completedCount);
      summarySheet.getRange(rowIndex, 7).setValue(totalCount);
      summarySheet.getRange(rowIndex, 8).setValue(completionPercent);
      summarySheet.getRange(rowIndex, 10).setValue(data.submissionCount || 1);
      summarySheet.getRange(rowIndex, 11).setValue(revisionHistoryText);
      summarySheet.getRange(rowIndex, 12).setValue(data.supervisorReview ? "Yes" : "No");
      summarySheet.getRange(rowIndex, 13).setValue(data.supervisor || "-");
      summarySheet.getRange(rowIndex, 14).setValue(data.verifiedAt || "-");
      
      // Color code completion percentage
      var percentCell = summarySheet.getRange(rowIndex, 8);
      var percent = parseFloat(completionPercent);
      if (percent === 100) {
        percentCell.setBackground("#D4EDDA").setFontColor("#155724");
      } else if (percent >= 80) {
        percentCell.setBackground("#FFF3CD").setFontColor("#856404");
      } else {
        percentCell.setBackground("#F8D7DA").setFontColor("#721C24");
      }
      
      return true;
    }
  }
  
  return false;
}

function updateTaskDetails(sheet, data) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  
  // Find and delete existing task rows for this submission
  var range = sheet.getRange(2, 1, lastRow - 1, 4);
  var values = range.getValues();
  var rowsToDelete = [];
  
  for (var i = values.length - 1; i >= 0; i--) {
    var row = values[i];
    if (row[0] === data.date && row[2] === data.user && row[3] === data.checklistType) {
      rowsToDelete.push(i + 2); // +2 for header row and 0-index
    }
  }
  
  // Delete rows from bottom to top to maintain indices
  for (var j = 0; j < rowsToDelete.length; j++) {
    sheet.deleteRow(rowsToDelete[j]);
  }
  
  // Add new task rows
  addDetailedRows(sheet, data);
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

