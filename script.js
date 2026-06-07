/* ===================================
   DOM ELEMENTS
=================================== */

const taskInput =
document.getElementById(
    "taskInput"
);

const addBtn =
document.getElementById(
    "addBtn"
);

const taskContainer =
document.getElementById(
    "taskContainer"
);

const emptyState =
document.getElementById(
    "emptyState"
);

const historyContainer =
document.getElementById(
    "historyContainer"
);

const badgesContainer =
document.getElementById(
    "badgesContainer"
);

const totalTasks =
document.getElementById(
    "totalTasks"
);

const completedTasks =
document.getElementById(
    "completedTasks"
);

const pendingTasks =
document.getElementById(
    "pendingTasks"
);

const streakCount =
document.getElementById(
    "streakCount"
);

/* ===================================
   DATE
=================================== */

const today =
new Date()
.toLocaleDateString();

/* ===================================
   APPLICATION DATA
=================================== */

let appData =
JSON.parse(
    localStorage.getItem(
        "taskflow"
    )
);

/* ===================================
   INITIAL DATA
=================================== */

if(!appData)
{
    appData = {

        date: today,

        tasks: [],

        history: [],

        streak: 0,

        badges: [],

        totalCompletedTasks: 0,

        activityDates: []

    };

    saveData();
}

/* ===================================
   SAFETY CHECKS
=================================== */

appData.history =
appData.history || [];

appData.badges =
appData.badges || [];

appData.totalCompletedTasks =
appData.totalCompletedTasks || 0;

appData.streak =
appData.streak || 0;

appData.activityDates =
appData.activityDates || [];

/* ===================================
   STORAGE
=================================== */

function saveData()
{
    localStorage.setItem(
        "taskflow",
        JSON.stringify(
            appData
        )
    );
}

/* ===================================
   DAILY RESET + ARCHIVE
=================================== */

if(appData.date !== today)
{
    const completedCount =
    appData.tasks.filter(
        task => task.completed
    ).length;

    if(completedCount > 0)
    {
        appData.streak++;

        if(
            !appData.activityDates.includes(
                appData.date
            )
        )
        {
            appData.activityDates.push(
                appData.date
            );
        }
    }
    else
    {
        appData.streak = 0;
    }

    appData.history.push({

        date:
        appData.date,

        totalTasks:
        appData.tasks.length,

        completedTasks:
        completedCount,

        streak:
        appData.streak

    });

    appData.date = today;

    appData.tasks = [];

    updateBadges();

    saveData();
}

/* ===================================
   BADGE SYSTEM
=================================== */

function updateBadges()
{
    const badges =
    appData.badges;

    const total =
    appData.totalCompletedTasks;

    if(
        total >= 50 &&
        !badges.includes(
            "Bronze"
        )
    )
    {
        badges.push(
            "Bronze"
        );
    }

    if(
        total >= 100 &&
        !badges.includes(
            "Silver"
        )
    )
    {
        badges.push(
            "Silver"
        );
    }

    if(
        total >= 500 &&
        !badges.includes(
            "Gold"
        )
    )
    {
        badges.push(
            "Gold"
        );
    }

    if(
        total >= 1000 &&
        !badges.includes(
            "Platinum"
        )
    )
    {
        badges.push(
            "Platinum"
        );
    }

    if(
        appData.streak >= 7 &&
        !badges.includes(
            "Daily Warrior"
        )
    )
    {
        badges.push(
            "Daily Warrior"
        );
    }
}

/* ===================================
   BADGE RENDERING
=================================== */

function renderBadges()
{
    badgesContainer.innerHTML =
    "";

    if(
        appData.badges.length === 0
    )
    {
        badgesContainer.innerHTML =

        `
        <div class="badge">
            No Badges Yet
        </div>
        `;

        return;
    }

    appData.badges.forEach(
    badge => {

        const div =
        document.createElement(
            "div"
        );

        div.classList.add(
            "badge"
        );

        switch(badge)
        {
            case "Bronze":
                div.textContent =
                "🥉 Bronze";
                break;

            case "Silver":
                div.textContent =
                "🥈 Silver";
                break;

            case "Gold":
                div.textContent =
                "🥇 Gold";
                break;

            case "Platinum":
                div.textContent =
                "💎 Platinum";
                break;

            case "Daily Warrior":
                div.textContent =
                "🏆 Daily Warrior";
                break;
        }

        badgesContainer
        .appendChild(div);
    });
}

/* ===================================
   DASHBOARD STATS
=================================== */

function updateStats()
{
    const total =
    appData.tasks.length;

    const completed =
    appData.tasks.filter(
        task => task.completed
    ).length;

    totalTasks.textContent =
    total;

    completedTasks.textContent =
    completed;

    pendingTasks.textContent =
    total - completed;

    streakCount.textContent =
    appData.streak;
}

/* ===================================
   ADD TASK
=================================== */

function addTask()
{
    const title =
    taskInput.value.trim();

    if(title === "")
    {
        alert(
            "Please enter a task."
        );

        return;
    }

    const task = {

        id:
        Date.now(),

        title:
        title,

        completed:
        false,

        createdAt:
        new Date()
        .toLocaleString()

    };

    appData.tasks.push(
        task
    );
    if(
    !appData.activityDates.includes(
        today
    )
    )
    {
    appData.activityDates.push(
        today
    );
    }

    saveData();

    renderCalendar();

    renderTasks();

    taskInput.value = "";
}

/* ===================================
   COMPLETE / UNDO TASK
=================================== */

function toggleTask(id)
{
    appData.tasks =
    appData.tasks.map(task => {

        if(task.id === id)
        {
            const newCompleted =
            !task.completed;

            if(
                newCompleted &&
                !task.completed
            )
            {
                appData.totalCompletedTasks++;
            }

            return {

                ...task,

                completed:
                newCompleted

            };
        }

        return task;
    });

    updateBadges();

    saveData();

    renderTasks();
}

/* ===================================
   DELETE TASK
=================================== */

function deleteTask(id)
{
    const confirmDelete =
    confirm(
        "Delete this task?"
    );

    if(!confirmDelete)
    {
        return;
    }

    appData.tasks =
    appData.tasks.filter(
        task =>
        task.id !== id
    );

    saveData();

    renderTasks();
}

/* ===================================
   EDIT TASK
=================================== */

function editTask(id)
{
    const task =
    appData.tasks.find(
        task =>
        task.id === id
    );

    if(!task)
    {
        return;
    }

    const updatedTitle =
    prompt(
        "Update task title:",
        task.title
    );

    if(
        updatedTitle === null
    )
    {
        return;
    }

    const cleanedTitle =
    updatedTitle.trim();

    if(cleanedTitle === "")
    {
        alert(
            "Task title cannot be empty."
        );

        return;
    }

    appData.tasks =
    appData.tasks.map(task => {

        if(task.id === id)
        {
            return {

                ...task,

                title:
                cleanedTitle

            };
        }

        return task;

    });

    saveData();

    renderTasks();
}

/* ===================================
   TASK RENDERING
=================================== */

function renderTasks()
{
    taskContainer.innerHTML =
    "";

    if(
        appData.tasks.length === 0
    )
    {
        emptyState.style.display =
        "block";

        updateStats();

        renderBadges();

        return;
    }

    emptyState.style.display =
    "none";

    appData.tasks.forEach(task => {

        const taskDiv =
        document.createElement(
            "div"
        );

        taskDiv.classList.add(
            "task"
        );

        if(task.completed)
        {
            taskDiv.classList.add(
                "completed"
            );
        }

        taskDiv.innerHTML =

        `
        <div class="task-top">

            <h3>
                ${task.title}
            </h3>

        </div>

        <p class="task-date">

            Created:

            ${task.createdAt}

        </p>

        <p
        class="status ${
            task.completed
            ?
            "completed"
            :
            "pending"
        }">

            ${
                task.completed
                ?
                "Completed"
                :
                "Pending"
            }

        </p>

        <div
        class="task-actions">

            <button
            class="complete-btn"
            onclick="
            toggleTask(
            ${task.id}
            )">

                ${
                    task.completed
                    ?
                    "Undo"
                    :
                    "Complete"
                }

            </button>

            <button
            class="edit-btn"
            onclick="
            editTask(
            ${task.id}
            )">

                Edit

            </button>

            <button
            class="delete-btn"
            onclick="
            deleteTask(
            ${task.id}
            )">

                Delete

            </button>

        </div>
        `;

        taskContainer
        .appendChild(
            taskDiv
        );
    });

    updateStats();

    renderBadges();
}

/* ===================================
   HISTORY RENDERING
=================================== */

function renderHistory()
{
    historyContainer.innerHTML =
    "";

    if(
        appData.history.length === 0
    )
    {
        historyContainer.innerHTML =

        `
        <div class="history-card">

            No history available yet.

        </div>
        `;

        return;
    }

    appData.history
    .slice()
    .reverse()
    .forEach(day => {

        const historyCard =
        document.createElement(
            "div"
        );

        historyCard.classList.add(
            "history-card"
        );

        historyCard.innerHTML =

        `
        <h3>
            ${day.date}
        </h3>

        <p>
            Total Tasks:
            ${day.totalTasks}
        </p>

        <p>
            Completed Tasks:
            ${day.completedTasks}
        </p>

        <p>
            🔥 Streak:
            ${day.streak}
        </p>
        `;

        historyContainer
        .appendChild(
            historyCard
        );

    });
}

/* ===================================
   CALENDAR RENDERING
=================================== */

function renderCalendar()
{
    const container =
    document.getElementById(
        "calendarContainer"
    );

    if(!container)
    {
        return;
    }

    container.innerHTML =
    "";

    const now =
    new Date();

    const year =
    now.getFullYear();

    const month =
    now.getMonth();

    const daysInMonth =
    new Date(
        year,
        month + 1,
        0
    ).getDate();

    for(
        let day = 1;
        day <= daysInMonth;
        day++
    )
    {
        const div =
        document.createElement(
            "div"
        );

        div.classList.add(
            "day"
        );

        const dateString =
        new Date(
            year,
            month,
            day
        ).toLocaleDateString();

        if(
            appData.activityDates.includes(
                dateString
            )
        )
        {
            div.classList.add(
                "active-day"
            );
        }
        else
        {
            div.classList.add(
                "inactive-day"
            );
        }

        div.textContent =
        day;

        container.appendChild(
            div
        );
    }
}

/* ===================================
   REFRESH UI
=================================== */

function refreshUI()
{
    renderTasks();

    renderHistory();

    renderBadges();

    renderCalendar();

    updateStats();
}

/* ===================================
   EVENT LISTENERS
=================================== */

addBtn.addEventListener(
    "click",
    addTask
);

taskInput.addEventListener(
    "keydown",
    event => {

        if(
            event.key === "Enter"
        )
        {
            addTask();
        }

    }
);

/* ===================================
   APPLICATION STARTUP
=================================== */

refreshUI();

/* ===================================
   GLOBAL FUNCTIONS
=================================== */

window.toggleTask =
toggleTask;

window.deleteTask =
deleteTask;

window.editTask =
editTask;

/* ===================================
   DEBUG (OPTIONAL)
=================================== */

// Uncomment if needed

/*
console.log(
    "TaskFlow Started"
);

console.log(
    appData
);
*/