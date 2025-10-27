
// DATA
const OPENING_CHECKLIST = [
  "Light On",
  "Camera On",
  "Internet On",
  "System On",
  "Printers On",
  "Floor cleaned (YES/NO)",
  "Water Bottles (Filled/Not)",
  "Water RO - On",
  "Workstation Cleaned",
  "Bathroom checked (1. water taps 2. handwash 3. freshner)",
];

const CLOSING_CHECKLIST = [
  "Light OFF",
  "Camera OFF",
  "Internet OFF",
  "System OFF",
  "Printers OFF",
  "Water RO - OFF",
  "Files cleared from Workstation",
  "Almirah closed",
  "Balcony door closed",
  "Office locked",
];

let appState = {
  user: null,
  role: null,
  loginTime: null,
  checklistType: "opening",
  verifyType: "opening",
};

// PERMANENT GOOGLE SHEETS CONFIGURATION
// These credentials are hardcoded and auto-configured on app load
const GOOGLE_SHEETS_CONFIG = {
  sheetId: "15OgjRm14ywCmJVzrGrMxn8xagUU4SLrEOcTB55smkes",
  scriptUrl: "https://script.google.com/macros/s/AKfycbxsdiPSiG1t5N053LDebEt8ds5im58hHMRyJt6H7kvm0gEYCFqelp2GLOYbjwiM-6TE3w/exec"
};

// SESSION PERSISTENCE
const SESSION_KEY = "ocm_session";
const INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 minutes
let lastActivityAt = Date.now();

// Initialize Google Sheets config on app load
(function initializeGoogleSheets() {
  localStorage.setItem("googleSheetId", GOOGLE_SHEETS_CONFIG.sheetId);
  localStorage.setItem("googleScriptUrl", GOOGLE_SHEETS_CONFIG.scriptUrl);
  console.log("✓ Google Sheets integration initialized");
})();

// LOGIN
function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const role = document.getElementById("role").value;

  let isValid = true;
  if (!username) {
    showError("usernameError", "Required");
    isValid = false;
  } else clearError("usernameError");
  if (!password) {
    showError("passwordError", "Required");
    isValid = false;
  } else clearError("passwordError");
  if (!role) {
    showError("roleError", "Required");
    isValid = false;
  } else clearError("roleError");

  if (!isValid) return;

  if (password === "12345") {
    appState.user = username;
    appState.role = role;
    appState.loginTime = new Date();

    if (role === "supervisor") {
      document.getElementById("supervisorCard").style.display = "block";
    }

    // Persist session
    persistSession();
    updateActivity();

    showView("dashboardView");
    document.getElementById("dashboardUserName").textContent = username;
    document.getElementById("dashboardUserRole").textContent =
      role === "officeboy" ? "Office Boy" : "Supervisor";
    document.getElementById("dashboardLoginTime").textContent =
      "Logged in: " + formatTime(appState.loginTime);
  } else {
    showError("loginError", "Invalid password. Try: 12345");
  }
}

function startChecklist(type) {
  appState.checklistType = type;
  showView("checklistView");
  document.getElementById("checklistTitle").textContent =
    type === "opening" ? "Opening Checklist" : "Closing Checklist";
  document.getElementById("checklistDate").textContent =
    new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  document.getElementById("checklistUser").textContent = appState.user;
  document.getElementById("checklistTime").textContent = formatTime(
    appState.loginTime
  );
  renderChecklist();
}

function renderChecklist() {
  const checklist =
    appState.checklistType === "opening"
      ? OPENING_CHECKLIST
      : CLOSING_CHECKLIST;
  const container = document.getElementById("checklistContainer");
  container.innerHTML = "";

  const section = document.createElement("div");
  section.className = "checklist-section";

  const sectionTitle = document.createElement("div");
  sectionTitle.className = "section-title";
  sectionTitle.textContent =
    appState.checklistType === "opening" ? "Opening Tasks" : "Closing Tasks";
  section.appendChild(sectionTitle);

  checklist.forEach((task, index) => {
    const item = document.createElement("div");
    item.className = "checklist-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `checkbox-${index}`;
    checkbox.onchange = () => toggleRemark(index);

    const content = document.createElement("div");
    content.className = "item-content";

    const label = document.createElement("label");
    label.className = "item-label";
    label.textContent = task;
    label.htmlFor = `checkbox-${index}`;

    const remark = document.createElement("textarea");
    remark.id = `remark-${index}`;
    remark.className = "item-remark";
    remark.placeholder = "Add remarks (optional)";

    const timestamp = document.createElement("div");
    timestamp.className = "item-timestamp";
    timestamp.id = `timestamp-${index}`;

    content.appendChild(label);
    content.appendChild(remark);
    content.appendChild(timestamp);
    item.appendChild(checkbox);
    item.appendChild(content);
    section.appendChild(item);
  });

  container.appendChild(section);
}

function toggleRemark(index) {
  const checkbox = document.getElementById(`checkbox-${index}`);
  const remark = document.getElementById(`remark-${index}`);
  const timestamp = document.getElementById(`timestamp-${index}`);

  if (checkbox.checked) {
    remark.classList.add("show");
    timestamp.classList.add("show");
    timestamp.textContent = `✓ Checked at ${formatTime(new Date())}`;
  } else {
    remark.classList.remove("show");
    timestamp.classList.remove("show");
  }
}

function switchChecklist() {
  appState.checklistType =
    appState.checklistType === "opening" ? "closing" : "opening";
  renderChecklist();
  document.getElementById("checklistTitle").textContent =
    appState.checklistType === "opening"
      ? "Opening Checklist"
      : "Closing Checklist";
}

function handleSubmitChecklist(event) {
  event.preventDefault();
  const checklist =
    appState.checklistType === "opening"
      ? OPENING_CHECKLIST
      : CLOSING_CHECKLIST;
  const submissionData = [];

  checklist.forEach((task, index) => {
    const checkbox = document.getElementById(`checkbox-${index}`);
    const remark = document.getElementById(`remark-${index}`);
    const timestamp = document.getElementById(`timestamp-${index}`);
    submissionData.push({
      task: task,
      checked: checkbox.checked,
      remark: remark.value,
      timestamp: timestamp.textContent,
    });
  });

  const payload = {
    date: new Date().toLocaleDateString("en-IN"),
    user: appState.user,
    role: appState.role,
    loginTime: formatTime(appState.loginTime),
    checklistType: appState.checklistType,
    items: submissionData,
    submittedAt: new Date().toLocaleString("en-IN"),
  };

  const submissions = JSON.parse(
    localStorage.getItem("checklistSubmissions") || "[]"
  );
  submissions.push(payload);
  localStorage.setItem("checklistSubmissions", JSON.stringify(submissions));

  // Auto-sync to Google Sheets
  syncSingleSubmissionToSheets(payload);

  showAlertInContainer(
    "checklistAlertContainer",
    "✓ Checklist submitted successfully!",
    "success"
  );
  setTimeout(() => backToDashboard(), 2000);
}

function showHistoryView() {
  showView("historyView");
  const submissions = JSON.parse(
    localStorage.getItem("checklistSubmissions") || "[]"
  );
  const tbody = document.getElementById("historyTableBody");
  tbody.innerHTML = "";

  if (submissions.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align: center; color: #999;">No records found</td></tr>';
    return;
  }

  submissions.reverse().forEach((submission, index) => {
    const row = document.createElement("tr");
    const completedCount = submission.items.filter(
      (item) => item.checked
    ).length;
    const totalCount = submission.items.length;
    const completedText = `${completedCount}/${totalCount}`;

    // Extract only time from submittedAt
    const timeOnly =
      submission.submittedAt.split(",")[1]?.trim() || submission.submittedAt;

    row.innerHTML = `
                    <td>${submission.date}</td>
                    <td>${timeOnly}</td>
                    <td>${submission.user}</td>
                    <td>${
                      submission.checklistType === "opening"
                        ? "🌅 Opening"
                        : "🌙 Closing"
                    }</td>
                    <td><span class="completed-badge">${completedText}</span></td>
                    <td><button class="view-btn" onclick="viewTaskDetails(${
                      submissions.length - index - 1
                    })">View</button></td>
                `;
    tbody.appendChild(row);
  });
}

function viewTaskDetails(index) {
  const submissions = JSON.parse(
    localStorage.getItem("checklistSubmissions") || "[]"
  );
  const submission = submissions[index];

  document.getElementById("modalTitle").textContent = `${submission.user} - ${
    submission.checklistType === "opening" ? "🌅 Opening" : "🌙 Closing"
  } (${submission.date})`;

  const taskList = document.getElementById("modalTaskList");
  taskList.innerHTML = "";

  submission.items.forEach((item, idx) => {
    const taskDiv = document.createElement("div");
    taskDiv.className = `task-list-item ${item.checked ? "done" : ""}`;

    const statusDiv = document.createElement("div");
    statusDiv.className = "task-status";

    const taskName = document.createElement("div");
    taskName.className = "task-name";
    taskName.textContent = `${idx + 1}. ${item.task}`;

    const checkBadge = document.createElement("span");
    checkBadge.className = `task-check ${item.checked ? "done" : "not-done"}`;
    checkBadge.textContent = item.checked ? "✓ DONE" : "✗ NOT DONE";

    statusDiv.appendChild(taskName);
    statusDiv.appendChild(checkBadge);
    taskDiv.appendChild(statusDiv);

    if (item.remark) {
      const remarkDiv = document.createElement("div");
      remarkDiv.className = "task-remark";
      remarkDiv.textContent = `Remark: ${item.remark}`;
      taskDiv.appendChild(remarkDiv);
    }

    if (item.timestamp) {
      const timeDiv = document.createElement("div");
      timeDiv.className = "task-time";
      timeDiv.textContent = item.timestamp;
      taskDiv.appendChild(timeDiv);
    }

    taskList.appendChild(taskDiv);
  });

  document.getElementById("taskModal").classList.add("show");
}

function closeTaskModal() {
  document.getElementById("taskModal").classList.remove("show");
}

function showVerifyView(type) {
  if (type) appState.verifyType = type;
  showView("verifyView");
  const submissions = JSON.parse(
    localStorage.getItem("checklistSubmissions") || "[]"
  );
  const container = document.getElementById("verificationContainer");

  if (submissions.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: #999; padding: 40px;">No tasks to verify.</p>';
    return;
  }

  // Find most recent submission of the selected type
  const selectedType = appState.verifyType || "opening";
  let selectedIndex = -1;
  for (let i = submissions.length - 1; i >= 0; i--) {
    if (submissions[i].checklistType === selectedType) { selectedIndex = i; break; }
  }

  container.innerHTML = "";

  // Toggle buttons
  const toggle = document.createElement("div");
  toggle.className = "toggle-group";
  const openBtn = document.createElement("button");
  openBtn.className = `toggle-btn ${selectedType === "opening" ? "active" : ""}`;
  openBtn.textContent = "Show Opening";
  openBtn.onclick = () => { appState.verifyType = "opening"; showVerifyView(); };
  const closeBtn = document.createElement("button");
  closeBtn.className = `toggle-btn ${selectedType === "closing" ? "active" : ""}`;
  closeBtn.textContent = "Show Closing";
  closeBtn.onclick = () => { appState.verifyType = "closing"; showVerifyView(); };
  toggle.appendChild(openBtn);
  toggle.appendChild(closeBtn);
  container.appendChild(toggle);

  if (selectedIndex === -1) {
    const none = document.createElement("p");
    none.style.cssText = "text-align:center;color:#999;padding:20px;";
    none.textContent = `No ${selectedType} submissions to verify.`;
    container.appendChild(none);
    return;
  }

  const lastSubmission = submissions[selectedIndex];

  const section = document.createElement("div");
  section.className = "checklist-section";

  const sectionTitle = document.createElement("div");
  sectionTitle.className = "section-title";
  sectionTitle.style.background =
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)";
  sectionTitle.textContent = `Verify - ${
    lastSubmission.checklistType === "opening" ? "🌅 Opening" : "🌙 Closing"
  } (${lastSubmission.date})`;
  section.appendChild(sectionTitle);

  lastSubmission.items.forEach((item, index) => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "checklist-item";
    itemDiv.style.background = "#f0f8ff";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `verify-checkbox-${index}`;
    checkbox.checked = item.checked;

    const content = document.createElement("div");
    content.className = "item-content";

    const label = document.createElement("label");
    label.className = "item-label";
    label.textContent = item.task;
    label.htmlFor = `verify-checkbox-${index}`;

    const originalStatus = document.createElement("div");
    originalStatus.style.fontSize = "12px";
    originalStatus.style.color = "#999";
    originalStatus.style.marginBottom = "8px";
    originalStatus.textContent = `Original: ${
      item.checked ? "✓ Checked" : "✗ Not Checked"
    } - ${item.timestamp}`;

    const remark = document.createElement("textarea");
    remark.id = `verify-remark-${index}`;
    remark.className = "item-remark show";
    remark.placeholder = "Add verification remarks (optional)";
    remark.value = item.remark || "";

    content.appendChild(label);
    content.appendChild(originalStatus);
    if (item.remark) {
      const remarkLabel = document.createElement("div");
      remarkLabel.style.fontSize = "12px";
      remarkLabel.style.fontWeight = "500";
      remarkLabel.style.marginBottom = "8px";
      remarkLabel.textContent = "📝 Original: " + item.remark;
      content.appendChild(remarkLabel);
    }
    content.appendChild(remark);

    itemDiv.appendChild(checkbox);
    itemDiv.appendChild(content);
    section.appendChild(itemDiv);
  });

  const buttonGroup = document.createElement("div");
  buttonGroup.className = "button-group";

  const submitBtn = document.createElement("button");
  submitBtn.className = "button button-primary";
  submitBtn.textContent = "Confirm Verification";
  submitBtn.onclick = () =>
    submitVerification(lastSubmission, selectedIndex);

  buttonGroup.appendChild(submitBtn);
  section.appendChild(buttonGroup);

  container.appendChild(section);
}

function submitVerification(submission, index) {
  const submissions = JSON.parse(
    localStorage.getItem("checklistSubmissions") || "[]"
  );
  submission.items.forEach((item, idx) => {
    const checkbox = document.getElementById(`verify-checkbox-${idx}`);
    const remark = document.getElementById(`verify-remark-${idx}`);
    item.supervisorVerified = checkbox.checked;
    item.supervisorRemark = remark.value;
    item.supervisorTime = formatTime(new Date());
  });
  submission.supervisorReview = true;
  submission.supervisor = appState.user;
  submission.verifiedAt = new Date().toLocaleString("en-IN");
  submissions[index] = submission;
  localStorage.setItem("checklistSubmissions", JSON.stringify(submissions));
  
  // Auto-sync verification to Google Sheets
  syncSingleSubmissionToSheets(submission, true);
  
  showAlertInContainer(
    "verificationAlertContainer",
    "✓ Verification completed!",
    "success"
  );
  setTimeout(() => backToDashboard(), 2000);
}

// AUTO-SYNC FUNCTION
function syncSingleSubmissionToSheets(submission, isVerification = false) {
  const scriptUrl = localStorage.getItem("googleScriptUrl");
  
  if (!scriptUrl) {
    console.warn("Google Sheets not configured. Data saved locally only.");
    return;
  }

  const completedCount = submission.items.filter((item) => item.checked).length;
  
  // Prepare detailed task data for the sheet
  const taskDetails = submission.items.map(item => ({
    taskName: item.task,
    status: item.checked ? "Done" : "Not Done",
    remark: item.remark || "-",
    timestamp: item.timestamp || "-",
    supervisorVerified: item.supervisorVerified !== undefined ? (item.supervisorVerified ? "Verified" : "Not Verified") : "-",
    supervisorRemark: item.supervisorRemark || "-"
  }));

  const payload = {
    date: submission.date,
    submittedAt: submission.submittedAt,
    user: submission.user,
    role: submission.role,
    checklistType: submission.checklistType,
    completedCount: completedCount,
    totalCount: submission.items.length,
    loginTime: submission.loginTime,
    tasks: taskDetails,
    supervisorReview: submission.supervisorReview || false,
    supervisor: submission.supervisor || "-",
    verifiedAt: submission.verifiedAt || "-",
    isVerification: isVerification
  };

  fetch(scriptUrl, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then(() => {
      console.log("✓ Data synced to Google Sheets");
    })
    .catch((error) => {
      console.error("Sync error:", error);
    });
}

// EXPORT FUNCTIONS
function exportToCSV() {
  const submissions = JSON.parse(localStorage.getItem("checklistSubmissions") || "[]");
  if (submissions.length === 0) {
    alert("No data to export");
    return;
  }

  // ✅ Define exact same headers as Google Sheets
  const headers = [
    "Date",
    "Time",
    "User",
    "Role",
    "Type",
    "Completed Tasks",
    "Total Tasks",
    "Login Time",
    "Task Name",
    "Status",
    "Remarks",
    "Task Timestamp",
    "Verified By",
    "Verified Time"
  ];

  let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";

  // ✅ Generate identical rows to Google Sheet
  submissions.forEach((submission) => {
    const completedCount = submission.items.filter((item) => item.checked).length;
    const timeOnly =
      submission.submittedAt && submission.submittedAt.includes(",")
        ? submission.submittedAt.split(",")[1].trim()
        : submission.submittedAt || "";

    submission.items.forEach((item) => {
      const row = [
        submission.date || "",
        timeOnly,
        submission.user || "",
        submission.role || "",
        submission.checklistType || "",
        completedCount || "",
        submission.items.length || "",
        submission.loginTime || "",
        item.task || "",
        item.checked ? "Done" : "Not Done",
        (item.remark || "").replace(/[\n\r]/g, " "), // strip newlines
        item.timestamp || "",
        submission.supervisor || "", // verified by
        submission.verifiedAt || "" // verified time
      ].map((v) => `"${v}"`).join(",");

      csvContent += row + "\n";
    });
  });

  // ✅ Trigger download
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Checklist_Report_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showAlertInContainer(
    "historyAlertContainer",
    "✓ CSV exported successfully!",
    "success"
  );
}

// UTILITIES
function showView(viewId) {
  document
    .querySelectorAll(".view")
    .forEach((v) => v.classList.remove("active"));
  document.getElementById(viewId).classList.add("active");
  updateLastView(viewId);
}

function backToDashboard() {
  showView("dashboardView");
}

function logout() {
  appState = {
    user: null,
    role: null,
    loginTime: null,
    checklistType: "opening",
  };
  localStorage.removeItem(SESSION_KEY);
  document.getElementById("supervisorCard").style.display = "none";
  document.getElementById("loginForm").reset();
  showView("loginView");
}

function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.classList.add("show");
  }
}

function clearError(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.classList.remove("show");
  }
}

function showAlertInContainer(containerId, message, type) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const alert = document.createElement("div");
  alert.className = `alert alert-${type} show`;
  alert.textContent = message;
  container.appendChild(alert);
  setTimeout(() => alert.remove(), 4000);
}

function formatTime(date) {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Close modals when clicking outside
window.onclick = function (event) {
  const taskModal = document.getElementById("taskModal");
  if (event.target == taskModal) {
    closeTaskModal();
  }
};

// Expose functions for inline HTML event handlers
Object.assign(window, {
  handleLogin,
  startChecklist,
  backToDashboard,
  switchChecklist,
  handleSubmitChecklist,
  showHistoryView,
  viewTaskDetails,
  closeTaskModal,
  showVerifyView,
  submitVerification,
  exportToCSV,
  logout,
});

// ---------- Session helpers ----------
function persistSession() {
  const session = {
    user: appState.user,
    role: appState.role,
    loginAt: new Date().toISOString(),
    lastActiveAt: Date.now(),
    lastView: "dashboardView",
    checklistType: appState.checklistType,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function updateLastView(viewId) {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return;
  try {
    const s = JSON.parse(raw);
    s.lastView = viewId;
    if (viewId === "checklistView") s.checklistType = appState.checklistType;
    if (viewId === "verifyView") s.checklistType = appState.verifyType;
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    // Also reflect in URL hash to survive reloads reliably
    const hash = `view=${viewId}` + (viewId === "checklistView" ? `&type=${appState.checklistType}` : (viewId === "verifyView" ? `&type=${appState.verifyType}` : ""));
    if (location.hash !== `#${hash}`) location.replace(`#${hash}`);
  } catch (_) {}
}

function restoreSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return; 
    const session = JSON.parse(raw);
    const expired = Date.now() - (session.lastActiveAt || 0) > INACTIVITY_LIMIT_MS;
    if (expired) { localStorage.removeItem(SESSION_KEY); return; }

    appState.user = session.user;
    appState.role = session.role;
    appState.loginTime = new Date(session.loginAt || Date.now());

    if (appState.role === "supervisor") {
      const supCard = document.getElementById("supervisorCard");
      if (supCard) supCard.style.display = "block";
    }
    document.getElementById("dashboardUserName").textContent = appState.user;
    document.getElementById("dashboardUserRole").textContent =
      appState.role === "officeboy" ? "Office Boy" : "Supervisor";
    document.getElementById("dashboardLoginTime").textContent =
      "Logged in: " + formatTime(appState.loginTime);

    const hashState = getHashState();
    const lastView = hashState.view || session.lastView || "dashboardView";
    const type = hashState.type || session.checklistType || "opening";

    // Restore to the last view the user was on
    if (lastView === "checklistView") {
      startChecklist(type === "closing" ? "closing" : "opening");
    } else if (lastView === "historyView") {
      showHistoryView();
    } else if (lastView === "verifyView" && appState.role === "supervisor") {
      appState.verifyType = type === "closing" ? "closing" : "opening";
      showVerifyView();
    } else {
      showView("dashboardView");
    }

    lastActivityAt = session.lastActiveAt || Date.now();
  } catch (_) {}
}

function getHashState() {
  if (!location.hash) return {};
  try {
    const q = new URLSearchParams(location.hash.slice(1));
    const view = q.get("view") || undefined;
    const type = q.get("type") || undefined;
    return { view, type };
  } catch (_) { return {}; }
}

function updateActivity() {
  lastActivityAt = Date.now();
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return;
  try {
    const s = JSON.parse(raw);
    s.lastActiveAt = lastActivityAt;
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch (_) {}
}

function attachActivityListeners() {
  const handler = throttle(updateActivity, 30000); // write at most every 30s
  ["click","keydown","mousemove","touchstart","scroll"].forEach(evt => {
    window.addEventListener(evt, handler, { passive: true });
  });
  setInterval(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;
    try {
      const s = JSON.parse(raw);
      if (Date.now() - (s.lastActiveAt || 0) > INACTIVITY_LIMIT_MS) {
        logout();
      }
    } catch (_) {}
  }, 30000);
}

function throttle(fn, interval) {
  let last = 0; let timer = null;
  return function() {
    const now = Date.now();
    if (now - last >= interval) { last = now; fn(); }
    else if (!timer) {
      timer = setTimeout(() => { last = Date.now(); timer = null; fn(); }, interval - (now - last));
    }
  };
}

// Boot after DOM is ready
(function boot() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { restoreSession(); attachActivityListeners(); });
  } else {
    restoreSession();
    attachActivityListeners();
  }
})();
