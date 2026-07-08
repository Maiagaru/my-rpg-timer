let countdown;
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
    initCalendar();
    
    document.getElementById('open-splitter-btn').addEventListener('click', () => splitterModal.classList.remove('hidden'));
    document.getElementById('close-splitter-btn').addEventListener('click', () => splitterModal.classList.add('hidden'));
    document.getElementById('quick-add-btn').addEventListener('click', quickAddSubtask);

    // 🌟 新增：點擊歷史查看窗的純圖示「×」就關閉彈窗
    document.getElementById('close-view-log-btn').addEventListener('click', () => {
        document.getElementById('view-log-modal').classList.add('hidden');
    });
    
    // 快捷追加子任務事件
    document.getElementById('quick-add-btn').addEventListener('click', quickAddSubtask);
});

// 1. 解析多層級減號機制 (- 項目, -- 細節)
document.getElementById('save-split-btn').addEventListener('click', () => {
    const bigTitle = document.getElementById('big-task-input').value.trim();
    const rawLines = document.getElementById('subtasks-textarea').value.split('\n');
    
    if (!bigTitle) return alert("請輸入主任務代號！");
    
    let parsedSubtasks = [];
    rawLines.forEach(line => {
        if (!line.trim()) return;
        
        let level = 1;
        let cleanText = line.trim();
        
        if (cleanText.startsWith('--')) {
            level = 3;
            cleanText = cleanText.replace(/^--/, '').trim();
        } else if (cleanText.startsWith('-')) {
            level = 2;
            cleanText = cleanText.replace(/^-/, '').trim();
        }
        
        if (cleanText) {
            parsedSubtasks.push({ title: cleanText, level: level });
        }
    });
    
    let questDatabase = JSON.parse(localStorage.getItem('rpg_quests_v2')) || {};
    questDatabase[bigTitle] = parsedSubtasks;
    localStorage.setItem('rpg_quests_v2', JSON.stringify(questDatabase));
    
    document.getElementById('big-task-input').value = "";
    document.getElementById('subtasks-textarea').value = "";
    splitterModal.classList.add('hidden');
    
    renderBigTasks();
});

// 2. 渲染左側大任務日誌 (帶有刪除主任務功能)
function renderBigTasks() {
    const bigTaskList = document.getElementById('big-task-list');
    bigTaskList.innerHTML = "";
    const questDatabase = JSON.parse(localStorage.getItem('rpg_quests_v2')) || {};
    
    Object.keys(questDatabase).forEach(title => {
        const item = document.createElement('div');
        item.className = `quest-item ${selectedBigTask === title ? 'active' : ''}`;
        
        item.innerHTML = `
            <span style="flex:1;">📂 ${title} (${questDatabase[title].length})</span>
            <span class="btn-mini btn-mini-del" style="box-shadow:none;" onclick="deleteBigTask(event, '${title}')">× 刪除</span>
        `;
        
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-mini-del')) return;
            selectedBigTask = title;
            renderBigTasks();
            renderSubtasks();
        });
        bigTaskList.appendChild(item);
    });
}

function deleteBigTask(event, title) {
    event.stopPropagation();
    if (!confirm(`確定要刪除整個【${title}】任務與其底下的所有子項目嗎？`)) return;
    
    let questDatabase = JSON.parse(localStorage.getItem('rpg_quests_v2')) || {};
    delete questDatabase[title];
    localStorage.setItem('rpg_quests_v2', JSON.stringify(questDatabase));
    
    if (selectedBigTask === title) {
        selectedBigTask = null;
        document.getElementById('quick-add-box').classList.add('hidden');
    }
    renderBigTasks();
    renderSubtasks();
}

// 3. 渲染右側子任務（支援 3 層級顯示、前 3 個活躍、純圖示按鈕）
function renderSubtasks() {
    const pool = document.getElementById('subtask-pool');
    const titleHeader = document.getElementById('active-quest-title');
    const quickAddBox = document.getElementById('quick-add-box');
    pool.innerHTML = "";
    
    if (!selectedBigTask) {
        titleHeader.textContent = "請選擇一項主線任務";
        quickAddBox.classList.add('hidden');
        return;
    }
    
    quickAddBox.classList.remove('hidden');
    const questDatabase = JSON.parse(localStorage.getItem('rpg_quests_v2')) || {};
    const subtasks = questDatabase[selectedBigTask] || [];
    titleHeader.textContent = `📌 當前委託：${selectedBigTask}`;
    
    if (subtasks.length === 0) {
        pool.innerHTML = "<p style='opacity:0.5;'>⚠️ 本專案所有子節點已全數破解/完成！</p>";
        return;
    }

    subtasks.forEach((subtask, index) => {
        const item = document.createElement('div');
        
        // 🌟 判定：如果索引大於等於 3，代表是還沒輪到的任務，加上 hidden-node 的半透明外觀
        const isLocked = index >= 3;
        item.className = `subtask-node node-lvl-${subtask.level} ${isLocked ? 'hidden-node' : ''}`;
        
        // 🌟 修改：拿掉「改」與「刪」中文字，只保留 📝 與 ×，並根據鎖定狀態調整提示
        item.innerHTML = `
            <span id="text-node-${index}">
                [L${subtask.level}] ${subtask.title} ${isLocked ? '<span style="font-size:0.75rem; opacity:0.5;">(🔒)</span>' : ''}
            </span>
            <div class="node-actions">
                <button class="btn-mini" onclick="editSubtask(${index})">📝</button>
                <button class="btn-mini btn-mini-del" onclick="deleteSubtask(${index})">×</button>
                <button style="padding:2px 8px; font-size:0.75rem;" onclick="launchFocus(${index})">LINK</button>
            </div>
        `;
        pool.appendChild(item);
    });
}

// 4. 在工作台隨時修改與刪除單個子任務
function editSubtask(index) {
    let questDatabase = JSON.parse(localStorage.getItem('rpg_quests_v2')) || {};
    let subtasks = questDatabase[selectedBigTask] || [];
    
    const newText = prompt(">> 修改此節點數據描述 // UPDATE_NODE_DATA:", subtasks[index].title);
    if (newText === null) return; // 按取消
    
    if (newText.trim() === "") {
        deleteSubtask(index);
    } else {
        subtasks[index].title = newText.trim();
        questDatabase[selectedBigTask] = subtasks;
        localStorage.setItem('rpg_quests_v2', JSON.stringify(questDatabase));
        renderSubtasks();
    }
}

function deleteSubtask(index) {
    let questDatabase = JSON.parse(localStorage.getItem('rpg_quests_v2')) || {};
    let subtasks = questDatabase[selectedBigTask] || [];
    
    subtasks.splice(index, 1);
    questDatabase[selectedBigTask] = subtasks;
    localStorage.setItem('rpg_quests_v2', JSON.stringify(questDatabase));
    renderSubtasks();
    renderBigTasks();
}

function quickAddSubtask() {
    const input = document.getElementById('quick-subtask-input');
    const text = input.value.trim();
    if (!text) return;
    
    let level = 1;
    let cleanText = text;
    if (cleanText.startsWith('--')) { level = 3; cleanText = cleanText.replace(/^--/, '').trim(); }
    else if (cleanText.startsWith('-')) { level = 2; cleanText = cleanText.replace(/^-/, '').trim(); }
    
    let questDatabase = JSON.parse(localStorage.getItem('rpg_quests_v2')) || {};
    questDatabase[selectedBigTask].push({ title: cleanText, level: level });
    localStorage.setItem('rpg_quests_v2', JSON.stringify(questDatabase));
    
    input.value = "";
    renderSubtasks();
    renderBigTasks();
}

// 5. 計時器與反思控制
function launchFocus(index) {
    const questDatabase = JSON.parse(localStorage.getItem('rpg_quests_v2')) || {};
    activeSubtaskIndex = index;
    timeLeft = parseInt(document.getElementById('timer-config-select').value);
    
    document.getElementById('timer-target-task').textContent = `🎯 NODE: ${questDatabase[selectedBigTask][index].title}`;
    timerModal.classList.remove('hidden');
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

document.getElementById('giveup-timer-btn').addEventListener('click', () => { clearInterval(countdown); timerModal.classList.add('hidden'); });

document.getElementById('save-log-btn').addEventListener('click', () => {
    const gain = document.getElementById('gain-input').value.trim();
    const next = document.getElementById('next-input').value.trim();
    
    let questDatabase = JSON.parse(localStorage.getItem('rpg_quests_v2')) || {};
    const taskTitle = questDatabase[selectedBigTask][activeSubtaskIndex].title;
    
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
    localStorage.setItem('rpg_quests_v2', JSON.stringify(questDatabase));
    
    document.getElementById('gain-input').value = "";
    document.getElementById('next-input').value = "";
    reflectionModal.classList.add('hidden');
    
    renderSubtasks(); renderBigTasks(); renderArchive(); initCalendar();
});

// 6. 備份機制
document.getElementById('export-data-btn').addEventListener('click', () => {
    const backupData = { quests: localStorage.getItem('rpg_quests_v2'), logs: localStorage.getItem('rpg_journey_logs') };
    const base64Code = btoa(encodeURIComponent(JSON.stringify(backupData)));
    const temp = document.createElement('textarea'); temp.value = base64Code; document.body.appendChild(temp); temp.select(); document.execCommand('copy'); document.body.removeChild(temp);
    alert("⚡ [DATA_PACKAGED] 數據傳輸碼已自動複製到剪貼簿！");
});

document.getElementById('import-data-btn').addEventListener('click', () => {
    const code = prompt(">> 請輸入數據傳輸碼 // INPUT_PROTOCOL_CODE:");
    if (!code) return;
    try {
        const importedData = JSON.parse(decodeURIComponent(atob(code)));
        if (importedData.quests) localStorage.setItem('rpg_quests_v2', importedData.quests);
        if (importedData.logs) localStorage.setItem('rpg_journey_logs', importedData.logs);
        alert("✨ [DECODE_SUCCESS] 數據同步成功！");
        renderBigTasks(); renderArchive(); initCalendar();
    } catch (e) { alert("❌ [DECODE_ERROR] 解析失敗。"); }
});

// 6. 渲染歷史存檔與數據查閱（升級版：支援點擊查看反思）
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
    
    // 依序渲染歷史卡片
    logs.forEach((log, index) => {
        const item = document.createElement('div');
        item.style.padding = "8px";
        item.style.borderBottom = "1px dashed var(--accent-color)";
        item.style.fontSize = "0.9rem";
        
        // 渲染外觀文字
        item.innerHTML = `[${log.date}] 🟢 成功破解: <strong>${log.task}</strong> (委託: ${log.parent})`;
        
        // 🌟 核心進化：幫每一條紀錄綁定「點擊事件」
        item.addEventListener('click', () => {
            // 填入該筆紀錄當時寫下的反思與下一步
            document.getElementById('view-log-title').textContent = `📂 檔案讀取 // ${log.task}`;
            document.getElementById('view-gain-text').textContent = log.gain || "無紀錄";
            document.getElementById('view-next-text').textContent = log.next || "無紀錄";
            
            // 帥氣浮現毛玻璃查閱窗
            document.getElementById('view-log-modal').classList.remove('hidden');
        });
        
        list.appendChild(item);
    });
}

function initCalendar() {
    const grid = document.getElementById('calendar-grid'); if (!grid) return; grid.innerHTML = "";
    const now = new Date(); const currentYear = now.getFullYear(); const currentMonth = now.getMonth();
    document.getElementById('calendar-month-year').textContent = `${currentYear} / ${String(currentMonth + 1).padStart(2, '0')}`;
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const logs = JSON.parse(localStorage.getItem('rpg_journey_logs')) || [];
    const activeDates = logs.filter(log => { const d = new Date(log.timestamp); return d.getFullYear() === currentYear && d.getMonth() === currentMonth; }).map(log => new Date(log.timestamp).getDate());
    for (let x = 0; x < firstDayIndex; x++) { const emptyCell = document.createElement('div'); emptyCell.className = 'calendar-day-empty'; grid.appendChild(emptyCell); }
    for (let i = 1; i <= daysInMonth; i++) { const dayCell = document.createElement('div'); dayCell.className = 'calendar-day'; dayCell.textContent = i; if (i === now.getDate()) dayCell.classList.add('today'); if (activeDates.includes(i)) dayCell.classList.add('has-data'); grid.appendChild(dayCell); }
}