/* ===================================
   DOM ELEMENTS
=================================== */

const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const taskContainer = document.getElementById("taskContainer");
const emptyState = document.getElementById("emptyState");
const historyContainer = document.getElementById("historyContainer");
const badgesContainer = document.getElementById("badgesContainer");
const totalTasks = document.getElementById("totalTasks");
const completedTasks = document.getElementById("completedTasks");
const pendingTasks = document.getElementById("pendingTasks");
const streakCount = document.getElementById("streakCount");
const lifetimeTasks = document.getElementById("lifetimeTasks");
const lifetimeCompleted = document.getElementById("lifetimeCompleted");

/* ===================================
   DATE
=================================== */

const today = new Date().toLocaleDateString();

/* ===================================
   APPLICATION DATA
=================================== */

let appData = JSON.parse(localStorage.getItem("taskflow"));

/* ===================================
   INITIAL DATA
=================================== */

if (!appData) {
    appData = {
        date: today,
        tasks: [],
        history: [],
        streak: 0,
        badges: [],
        totalCompletedTasks: 0,
        activityDates: [],
        lifetimeTasks: 0,
        lifetimeCompleted: 0
    };
    saveData();
}

/* ===================================
   SAFETY CHECKS - FIXED
=================================== */

appData.history = appData.history || [];
appData.badges = appData.badges || [];
appData.totalCompletedTasks = appData.totalCompletedTasks || 0;
appData.streak = appData.streak || 0;
appData.activityDates = appData.activityDates || [];
appData.lifetimeTasks ??= 0;
appData.lifetimeCompleted ??= 0;

/* ===================================
   UTILITY - INPUT SANITIZATION
=================================== */

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - Raw user input
 * @returns {string} Sanitized text
 */
function sanitizeInput(input) {
    const div = document.createElement("div");
    div.textContent = input;
    return div.innerHTML;
}

/* ===================================
   STORAGE
=================================== */

function saveData() {
    try {
        localStorage.setItem("taskflow", JSON.stringify(appData));
    } catch (error) {
        console.error("Error saving data to localStorage:", error);
        alert("Failed to save your data. Your browser storage might be full.");
    }
}

/* ===================================
   DAILY RESET + ARCHIVE
=================================== */

function checkAndResetDaily() {
    if (appData.date !== today) {
        const completedCount = appData.tasks.filter(task => task.completed).length;

        if (completedCount > 0) {
            appData.streak++;

            if (!appData.activityDates.includes(appData.date)) {
                appData.activityDates.push(appData.date);
            }
        } else {
            appData.streak = 0;
        }

        appData.history.push({
            date: appData.date,
            totalTasks: appData.tasks.length,
            completedTasks: completedCount,
            streak: appData.streak
        });

        appData.date = today;
        appData.tasks = [];

        updateBadges();
        saveData();
    }
}

checkAndResetDaily();

/* ===================================
   BADGE SYSTEM
=================================== */

/**
 * Update badges based on achievements
 */
function updateBadges() {
    const badges = appData.badges;
    const total = appData.totalCompletedTasks;

    // Badge milestones
    const badgeMilestones = [
        { name: "Bronze", threshold: 50 },
        { name: "Silver", threshold: 100 },
        { name: "Gold", threshold: 500 },
        { name: "Platinum", threshold: 1000 }
    ];

    badgeMilestones.forEach(({ name, threshold }) => {
        if (total >= threshold && !badges.includes(name)) {
            badges.push(name);
        }
    });

    // Streak badge
    if (appData.streak >= 7 && !badges.includes("Daily Warrior")) {
        badges.push("Daily Warrior");
    }
}

/* ===================================
   BADGE RENDERING
=================================== */

/**
 * Render achievement badges
 */
function renderBadges() {
    badgesContainer.innerHTML = "";

    if (appData.badges.length === 0) {
        badgesContainer.innerHTML = `<div class="badge">🚀 No Badges Yet</div>`;
        return;
    }

    const badgeEmojis = {
        "Bronze": "🥉",
        "Silver": "🥈",
        "Gold": "🥇",
        "Platinum": "💎",
        "Daily Warrior": "🏆"
    };

    appData.badges.forEach(badge => {
        const div = document.createElement("div");
        div.classList.add("badge");
        div.textContent = `${badgeEmojis[badge]} ${badge}`;
        badgesContainer.appendChild(div);
    });
}

/* ===================================
   DASHBOARD STATS
=================================== */

/**
 * Update dashboard statistics
 */
function updateStats() {
    const total = appData.tasks.length;
    const completed = appData.tasks.filter(task => task.completed).length;

    totalTasks.textContent = total;
    completedTasks.textContent = completed;
    pendingTasks.textContent = total - completed;
    streakCount.textContent = appData.streak;
    lifetimeTasks.textContent = appData.lifetimeTasks;
    lifetimeCompleted.textContent = appData.lifetimeCompleted;
}

/* ===================================
   ADD TASK
=================================== */

/**
 * Add a new task to the list
 */
function addTask() {
    const title = taskInput.value.trim();

    if (title === "") {
        alert("Please enter a task.");
        return;
    }

    if (title.length > 200) {
        alert("Task title must be less than 200 characters.");
        return;
    }

    const task = {
        id: Date.now(),
        title: sanitizeInput(title),
        completed: false,
        createdAt: new Date().toLocaleString()
    };

    appData.tasks.push(task);
    appData.lifetimeTasks++;

    if (!appData.activityDates.includes(today)) {
        appData.activityDates.push(today);
    }

    saveData();
    renderCalendar();
    renderTasks();
    taskInput.value = "";
    taskInput.focus();
}

/* ===================================
   COMPLETE / UNDO TASK - FIXED
=================================== */

/**
 * Toggle task completion status
 * Fixed: Was comparing completed state incorrectly
 */
function toggleTask(id) {
    const task = appData.tasks.find(t => t.id === id);

    if (!task) return;

    const wasCompleted = task.completed;
    task.completed = !task.completed;

    // Only increment counters when completing a task (not when undoing)
    if (task.completed && !wasCompleted) {
        appData.totalCompletedTasks++;
        appData.lifetimeCompleted++;
    }

    updateBadges();
    saveData();
    renderTasks();
}

/* ===================================
   DELETE TASK
=================================== */

/**
 * Delete a task from the list
 */
function deleteTask(id) {
    const confirmed = confirm("Are you sure you want to delete this task?");

    if (!confirmed) return;

    const initialLength = appData.tasks.length;
    appData.tasks = appData.tasks.filter(task => task.id !== id);

    if (appData.tasks.length < initialLength) {
        saveData();
        renderTasks();
    }
}

/* ===================================
   EDIT TASK
=================================== */

/**
 * Edit an existing task
 */
function editTask(id) {
    const task = appData.tasks.find(t => t.id === id);

    if (!task) return;

    const updatedTitle = prompt("Update task title:", task.title);

    if (updatedTitle === null) return;

    const cleanedTitle = updatedTitle.trim();

    if (cleanedTitle === "") {
        alert("Task title cannot be empty.");
        return;
    }

    if (cleanedTitle.length > 200) {
        alert("Task title must be less than 200 characters.");
        return;
    }

    task.title = sanitizeInput(cleanedTitle);
    saveData();
    renderTasks();
}

/* ===================================
   TASK RENDERING - OPTIMIZED
=================================== */

/**
 * Render all tasks to the DOM
 * Optimized with documentFragment and improved structure
 */
function renderTasks() {
    taskContainer.innerHTML = "";

    if (appData.tasks.length === 0) {
        emptyState.style.display = "block";
        updateStats();
        renderBadges();
        return;
    }

    emptyState.style.display = "none";

    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();

    appData.tasks.forEach(task => {
        const taskDiv = document.createElement("div");
        taskDiv.classList.add("task");

        if (task.completed) {
            taskDiv.classList.add("completed");
        }

        const statusClass = task.completed ? "completed" : "pending";
        const statusText = task.completed ? "✅ Completed" : "⏳ Pending";
        const buttonText = task.completed ? "Undo" : "Complete";

        taskDiv.innerHTML = `
            <div class="task-top">
                <h3>${task.title}</h3>
            </div>
            <p class="task-date">Created: ${task.createdAt}</p>
            <p class="status ${statusClass}">${statusText}</p>
            <div class="task-actions">
                <button class="complete-btn" onclick="toggleTask(${task.id})" aria-label="${buttonText} task">
                    ${buttonText}
                </button>
                <button class="edit-btn" onclick="editTask(${task.id})" aria-label="Edit task">
                    Edit
                </button>
                <button class="delete-btn" onclick="deleteTask(${task.id})" aria-label="Delete task">
                    Delete
                </button>
            </div>
        `;

        fragment.appendChild(taskDiv);
    });

    taskContainer.appendChild(fragment);
    updateStats();
    renderBadges();
}

/* ===================================
   HISTORY RENDERING
=================================== */

/**
 * Render task history
 */
function renderHistory() {
    historyContainer.innerHTML = "";

    if (appData.history.length === 0) {
        historyContainer.innerHTML = `<div class="history-card">📊 No history available yet.</div>`;
        return;
    }

    const fragment = document.createDocumentFragment();

    appData.history
        .slice()
        .reverse()
        .forEach(day => {
            const historyCard = document.createElement("div");
            historyCard.classList.add("history-card");

            historyCard.innerHTML = `
                <h3>${day.date}</h3>
                <p>📋 Total Tasks: <strong>${day.totalTasks}</strong></p>
                <p>✅ Completed: <strong>${day.completedTasks}</strong></p>
                <p>🔥 Streak: <strong>${day.streak}</strong></p>
            `;

            fragment.appendChild(historyCard);
        });

    historyContainer.appendChild(fragment);
}

/* ===================================
   CALENDAR RENDERING
=================================== */

/**
 * Render activity calendar
 */
function renderCalendar() {
    const container = document.getElementById("calendarContainer");

    if (!container) return;

    container.innerHTML = "";

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const fragment = document.createDocumentFragment();

    for (let day = 1; day <= daysInMonth; day++) {
        const div = document.createElement("div");
        div.classList.add("day");

        const dateString = new Date(year, month, day).toLocaleDateString();

        if (appData.activityDates.includes(dateString)) {
            div.classList.add("active-day");
            div.setAttribute("aria-label", `Active day: ${day}`);
        } else {
            div.classList.add("inactive-day");
            div.setAttribute("aria-label", `Inactive day: ${day}`);
        }

        div.textContent = day;
        fragment.appendChild(div);
    }

    container.appendChild(fragment);
}

/* ===================================
   REFRESH UI
=================================== */

/**
 * Refresh all UI components
 */
function refreshUI() {
    renderTasks();
    renderHistory();
    renderBadges();
    renderCalendar();
    updateStats();
}

/* ===================================
   EVENT LISTENERS
=================================== */

addBtn.addEventListener("click", addTask);

taskInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        addTask();
    }
});

/* ===================================
   APPLICATION STARTUP
=================================== */

refreshUI();

/* ===================================
   GLOBAL FUNCTIONS (for inline onclick)
=================================== */

window.toggleTask = toggleTask;
window.deleteTask = deleteTask;
window.editTask = editTask;

/* ===================================
   DEBUG
=================================== */

console.log("✅ TaskFlow Application Started");
console.log("📊 App Data:", appData);
