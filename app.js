let countdown;
// 🌟 修改：讓初始時間預設為選單目前選中的秒數（預設 1500 秒 = 25 分鐘）
const timerSelect = document.getElementById('timer-config-select');
let timeLeft = timerSelect ? parseInt(timerSelect.value) : 1500; 

let selectedBigTask = null;
let activeSubtaskIndex = null;

const themeToggleBtn = document.getElementById('theme-toggle-btn');
const splitterModal = document.getElementById('splitter-modal');
const timerModal = document.getElementById('timer-modal');
const reflectionModal = document.getElementById('reflection-modal');

themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const nextTheme = currentTheme === 'nier' ? 'cyberpunk' : 'nier';
    document.documentElement.setAttribute('data-theme', nextTheme);
});

document.addEventListener('DOMContentLoaded', () => {
    renderBigTasks();
    renderArchive();
    initCalendar(); // 確保 DOM 載入後立刻執行
    
    document.getElementById('open-splitter-btn').addEventListener('click', () => splitterModal.classList.remove('hidden'));
    document.getElementById('close-splitter-btn').addEventListener('click', () => splitterModal.classList.add('hidden'));
});

document.getElementById('save-split-btn').addEventListener('click', () => {
    const bigTitle = document.getElementById('big-task-input').value.trim();
    const rawSubtasks = document.getElementById('subtasks-textarea').value.split('\n');
    
    if (!bigTitle) return alert("請輸入主任務代號！");
    
    const subtaskTitles = rawSubtasks.map(t => t.trim()).filter(t => t.length > 0);
    let questDatabase = JSON.parse(localStorage.getItem('rpg_quests')) || {};
    questDatabase[bigTitle] = subtaskTitles;
    
    localStorage.setItem('rpg_quests', JSON.stringify(questDatabase));
    
    document.getElementById('big-task-input').value = "";
    document.getElementById('subtasks-textarea').value = "";
    splitterModal.classList.add('hidden');
    
    renderBigTasks();
});

function renderBigTasks() {
    const bigTaskList = document.getElementById('big-task-list');
    bigTaskList.innerHTML = "";
    const questDatabase = JSON.parse(localStorage.getItem('rpg_quests')) || {};
    
    Object.keys(questDatabase).forEach(title => {
        const item = document.createElement('div');
        item.className = `quest-item ${selectedBigTask === title ? 'active' : ''}`;
        item.textContent = `📂 ${title} (${questDatabase[title].length})`;
        item.addEventListener('click', () => {
            selectedBigTask = title;
            renderBigTasks();
            renderSubtasks();
        });
        bigTaskList.appendChild(item);
    });
}

function renderSubtasks() {
    const pool = document.getElementById('subtask-pool');
    const titleHeader = document.getElementById('active-quest-title');
    pool.innerHTML = "";
    
    if (!selectedBigTask) return;
    
    const questDatabase = JSON.parse(localStorage.getItem('rpg_quests')) || {};
    const subtasks = questDatabase[selectedBigTask] || [];
    titleHeader.textContent = `📌 當前委託：${selectedBigTask}`;
    
    if (subtasks.length === 0) {
        pool.innerHTML = "<p style='opacity:0.5;'>⚠️ 本專案所有子節點已全數破解/完成！</p>";
        return;
    }

    subtasks.forEach((subtask, index) => {
        const item = document.createElement('div');
        if (index < 3) {
            item.className = 'subtask-node';
            item.innerHTML = `<span>[目標 ${index + 1}] ${subtask}</span><button onclick="launchFocus(${index})">同步 // LINK</button>`;
        } else {
            item.className = 'subtask-node hidden-node';
            item.innerHTML = `<span>[鎖定節點] ${subtask}</span><span style='font-size:0.8rem; opacity:0.6;'>(需先完成前置目標)</span>`;
        }
        pool.appendChild(item);
    });
}

function launchFocus(index) {
    const questDatabase = JSON.parse(localStorage.getItem('rpg_quests')) || {};
    activeSubtaskIndex = index;
    document.getElementById('timer-target-task').textContent = `🎯 NODE: ${questDatabase[selectedBigTask][index]}`;
    timerModal.classList.remove('hidden');
    
    // 🌟 修改：點擊同步時，動態抓取當下下拉選單設定的秒數
    timeLeft = parseInt(document.getElementById('timer-config-select').value);
    
    runTimer();
}

function runTimer() {
    clearInterval(countdown);
    updateTimerUI(timeLeft);
    countdown = setInterval(() => {
        timeLeft--;
        updateTimerUI(timeLeft);
        if (timeLeft <= 0) {
            clearInterval(countdown);
            timerModal.classList.add('hidden');
            reflectionModal.classList.remove('hidden');
        }
    }, 1000);
}

function updateTimerUI(s) {
    const m = Math.floor(s / 60); const remainder = s % 60;
    document.getElementById('big-timer').textContent = `${m < 10 ? '0' : ''}${m}:${remainder < 10 ? '0' : ''}${remainder}`;
}

document.getElementById('giveup-timer-btn').addEventListener('click', () => {
    clearInterval(countdown);
    timerModal.classList.add('hidden');
});

document.getElementById('save-log-btn').addEventListener('click', () => {
    const gain = document.getElementById('gain-input').value.trim();
    const next = document.getElementById('next-input').value.trim();
    
    let questDatabase = JSON.parse(localStorage.getItem('rpg_quests')) || {};
    const taskTitle = questDatabase[selectedBigTask][activeSubtaskIndex];
    
    const logEntry = {
        timestamp: Date.now(),
        date: new Date().toLocaleDateString(),
        parent: selectedBigTask,
        task: taskTitle,
        gain: gain || "N/A",
        next: next || "N/A"
    };
    
    let logs = JSON.parse(localStorage.getItem('rpg_journey_logs')) || [];
    logs.unshift(logEntry);
    localStorage.setItem('rpg_journey_logs', JSON.stringify(logs));
    
    questDatabase[selectedBigTask].splice(activeSubtaskIndex, 1);
    localStorage.setItem('rpg_quests', JSON.stringify(questDatabase));
    
    document.getElementById('gain-input').value = "";
    document.getElementById('next-input').value = "";
    reflectionModal.classList.add('hidden');
    
    renderSubtasks();
    renderBigTasks();
    renderArchive();
    initCalendar();
});

function renderArchive() {
    const list = document.getElementById('completed-log-list');
    list.innerHTML = "";
    const logs = JSON.parse(localStorage.getItem('rpg_journey_logs')) || [];
    
    document.getElementById('stat-count').textContent = `${logs.length} 次`;
    document.getElementById('stat-hours').textContent = `${logs.length * 25} 分鐘`;

    if (logs.length === 0) {
        list.innerHTML = "<p style='opacity:0.4;'>目前尚無已下載的歷史數據。</p>";
        return;
    }
    
    logs.forEach(log => {
        const item = document.createElement('div');
        item.style.padding = "8px"; item.style.borderBottom = "1px dashed var(--accent-color)"; item.style.fontSize = "0.9rem";
        item.innerHTML = `[${log.date}] 🟢 成功破解: <strong>${log.task}</strong> (來自委託: ${log.parent})`;
        list.appendChild(item);
    });
}

function initCalendar() {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return; // 安全檢查防呆
    grid.innerHTML = "";
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    document.getElementById('calendar-month-year').textContent = `${currentYear} / ${String(currentMonth + 1).padStart(2, '0')}`;
    
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const logs = JSON.parse(localStorage.getItem('rpg_journey_logs')) || [];
    const activeDates = logs
        .filter(log => {
            const d = new Date(log.timestamp);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        })
        .map(log => new Date(log.timestamp).getDate());

    for (let x = 0; x < firstDayIndex; x++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day-empty';
        grid.appendChild(emptyCell);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        dayCell.textContent = i;
        if (i === now.getDate()) dayCell.classList.add('today');
        if (activeDates.includes(i)) dayCell.classList.add('has-data');
        grid.appendChild(dayCell);
    }
    // ==================== 💾 竄網使數據備份與傳輸協議 ====================
// 點擊匯出：把當前的任務和歷史紀錄打包成一串文字
document.getElementById('export-data-btn').addEventListener('click', () => {
    const backupData = {
        quests: localStorage.getItem('rpg_quests'),
        logs: localStorage.getItem('rpg_journey_logs')
    };
    
    // 將資料轉成 Base64 編碼（看起來就像一串帥氣的賽博密碼）
    const jsonString = JSON.stringify(backupData);
    const base64Code = btoa(encodeURIComponent(jsonString));
    
    // 彈出視窗讓使用者複製
    const tempTextArea = document.createElement('textarea');
    tempTextArea.value = base64Code;
    document.body.appendChild(tempTextArea);
    tempTextArea.select();
    document.execCommand('copy');
    document.body.removeChild(tempTextArea);
    
    alert("⚡ [DATA_PACKAGED] 數據傳輸碼已自動複製到剪貼簿！\n請將這串代碼發送到你的手機上。");
});

// 點擊匯入：貼上代碼，解碼並寫入本地
document.getElementById('import-data-btn').addEventListener('click', () => {
    const code = prompt(">> 請輸入或貼上數據傳輸碼 // INPUT_PROTOCOL_CODE:");
    if (!code) return;
    
    try {
        const decodedString = decodeURIComponent(atob(code));
        const importedData = JSON.parse(decodedString);
        
        if (importedData.quests) localStorage.setItem('rpg_quests', importedData.quests);
        if (importedData.logs) localStorage.setItem('rpg_journey_logs', importedData.logs);
        
        alert("✨ [DECODE_SUCCESS] 核心數據同步成功！更新協議狀態。");
        
        // 重新整理畫面
        renderBigTasks();
        if (selectedBigTask) renderSubtasks();
        renderArchive();
        initCalendar();
    } catch (e) {
        alert("❌ [DECODE_ERROR] 傳輸碼解析失敗，請確認代碼是否完整。");
    }
});
}