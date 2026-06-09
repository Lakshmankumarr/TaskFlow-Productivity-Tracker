/* ===================================
   UPDATED SCRIPT.JS - INTEGRATED WITH AUTH
   Modified to work with backend API
=================================== */

/* ===================================
   API CONFIGURATION
=================================== */

const API_BASE_URL = 'http://localhost:5000/api';

/* ===================================
   CHECK AUTHENTICATION ON PAGE LOAD
=================================== */

function checkAuth() {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');

    if (!token || !user) {
        // Redirect to login
        window.location.href = 'auth.html';
        return false;
    }

    // Display user name
    document.getElementById('userName').textContent = `👤 ${user.name}`;
    return true;
}

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
const logoutBtn = document.getElementById("logoutBtn");

/* ===================================
   AUTHENTICATION
=================================== */

// Check auth on page load
if (!checkAuth()) {
    // Stop execution if not authenticated
    throw new Error('User not authenticated');
}

// Logout handler
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
    window.location.href = 'auth.html';
});

/* ===================================
   GET AUTH TOKEN
=================================== */

function getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

/* ===================================
   API HELPER - FETCH WITH AUTH
=================================== */

async function apiCall(endpoint, method = 'GET', data = null) {
    const token = getAuthToken();
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const result = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                // Token expired or invalid
                localStorage.removeItem('authToken');
                sessionStorage.removeItem('authToken');
                window.location.href = 'auth.html';
                return null;
            }
            throw new Error(result.message || 'API Error');
        }

        return result;
    } catch (error) {
        console.error('API Call Error:', error);
        throw error;
    }
}

/* ===================================
   LOAD TASKS FROM API
=================================== */

async function loadTasks() {
    try {
        const response = await apiCall('/tasks');
        if (response && response.tasks) {
            const tasks = response.tasks;
            renderTasks(tasks);
            updateStats(tasks);
        }
    } catch (error) {
        console.error('Failed to load tasks:', error);
        alert('Failed to load tasks. Please refresh the page.');
    }
}

/* ===================================
   ADD TASK TO SERVER
=================================== */

async function addTask() {
    const title = taskInput.value.trim();

    if (title === "") {
        alert("Please enter a task.");
        return;
    }

    if (title.length > 200) {
        alert("Task title must be less than 200 characters.");
        return;
    }

    try {
        const response = await apiCall('/tasks', 'POST', { title });
        
        if (response && response.task) {
            taskInput.value = "";
            taskInput.focus();
            loadTasks(); // Reload tasks
        }
    } catch (error) {
        alert('Failed to add task. Please try again.');
    }
}

/* ===================================
   TOGGLE TASK COMPLETION
=================================== */

async function toggleTask(taskId) {
    try {
        await apiCall(`/tasks/${taskId}/toggle`, 'PATCH');
        loadTasks(); // Reload tasks
    } catch (error) {
        alert('Failed to update task. Please try again.');
    }
}

/* ===================================
   EDIT TASK
=================================== */

async function editTask(taskId, currentTitle) {
    const updatedTitle = prompt("Update task title:", currentTitle);

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

    try {
        await apiCall(`/tasks/${taskId}`, 'PUT', { title: cleanedTitle });
        loadTasks(); // Reload tasks
    } catch (error) {
        alert('Failed to edit task. Please try again.');
    }
}

/* ===================================
   DELETE TASK
=================================== */

async function deleteTask(taskId) {
    const confirmed = confirm("Are you sure you want to delete this task?");

    if (!confirmed) return;

    try {
        await apiCall(`/tasks/${taskId}`, 'DELETE');
        loadTasks(); // Reload tasks
    } catch (error) {
        alert('Failed to delete task. Please try again.');
    }
}

/* ===================================
   RENDER TASKS
=================================== */

function renderTasks(tasks) {
    taskContainer.innerHTML = "";

    if (tasks.length === 0) {
        emptyState.style.display = "block";
        return;
    }

    emptyState.style.display = "none";

    const fragment = document.createDocumentFragment();

    tasks.forEach(task => {
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
            <p class="task-date">Created: ${new Date(task.created_at).toLocaleString()}</p>
            <p class="status ${statusClass}">${statusText}</p>
            <div class="task-actions">
                <button class="complete-btn" onclick="toggleTask(${task.id})" aria-label="${buttonText} task">
                    ${buttonText}
                </button>
                <button class="edit-btn" onclick="editTask(${task.id}, '${task.title.replace(/'/g, "\\'")}');" aria-label="Edit task">
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
}

/* ===================================
   UPDATE STATS
=================================== */

function updateStats(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;

    totalTasks.textContent = total;
    completedTasks.textContent = completed;
    pendingTasks.textContent = total - completed;
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
   GLOBAL FUNCTIONS (for inline onclick)
=================================== */

window.toggleTask = toggleTask;
window.deleteTask = deleteTask;
window.editTask = editTask;

/* ===================================
   APPLICATION STARTUP
=================================== */

// Load tasks on page load
loadTasks();

// Refresh tasks every 30 seconds
setInterval(() => {
    loadTasks();
}, 30000);

console.log("✅ TaskFlow Dashboard Loaded with Authentication");
