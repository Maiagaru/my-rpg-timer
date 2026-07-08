// ==========================================================================
// ⚡ CORE_PROTOCOL // 戰術專注終端核心控制矩陣 V2.5
// ==========================================================================

let countdown;
const timerSelect = document.getElementById('timer-config-select');
// 預設讀取選單的值（預設 1500 秒 = 25 分鐘）
let timeLeft = timerSelect ? parseInt(timerSelect.value) : 1500; 
let selectedBigTask = null;
let activeSubtaskIndex = null;

// 取得 UI 彈出視窗群
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const splitterModal = document.getElementById('splitter-modal');
const timerModal = document.getElementById('timer-modal');
const reflectionModal = document.getElementById('reflection-modal');

// 主題動態切換協議
themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const nextTheme = currentTheme === 'nier' ? 'cyberpunk' : 'nier';
    document.documentElement.setAttribute('data-theme', nextTheme);
});

// 網頁初始生命週期監聽
document.addEventListener('DOMContentLoaded', () => {
    renderBigTasks();
    renderArchive();
    initCalendar();
    
    // 視窗開關監聽
    document.getElementById('open-splitter-btn').addEventListener('click', () => splitterModal.classList.remove('hidden'));
    document.getElementById('close-splitter-btn').addEventListener('click', () => splitterModal.classList.add('hidden'));
    
    // 快捷追加子任務事件
    document.getElementById('quick-add-btn').addEventListener('click', quickAddSubtask);

    // 歷史查看窗的純圖示「×」關閉監聽
    const closeViewLogBtn = document.getElementById('close-view-log-btn');
    if (closeViewLogBtn) {
        closeViewLogBtn.addEventListener('click', () => {
            document.getElementById('view-log-modal').classList.add('hidden');
        });
    }
});

// ==========================================================================
// 📂 1. 任務矩陣拆解與寫入核心 (支援 - 與 -- 減號多層級解析)
// ==========================================================================
document.getElementById('save-split-btn').addEventListener('click', () => {
    const bigTitle = document.getElementById('big-task-input').value.trim();
    const rawLines = document.getElementById('subtasks-textarea').value.split('\n');
    
    if (!bigTitle) return alert("請輸入主任務/區域委託名稱！");
    
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
    
    // 清空輸入框
    document.getElementById('big-task-input').value = "";
    document.getElementById('subtasks-textarea').value = "";
    splitterModal.classList.add('hidden');
    
    renderBigTasks();
});

// ==========================================================================
// 📂 2. 主線任務日誌渲染 (帶有一鍵清理主線功能)
// ==========================================================================
function renderBigTasks() {
    const bigTaskList = document.getElementById('big-task-list');
    bigTaskList.innerHTML = "";
    const questDatabase = JSON.parse(localStorage.getItem('rpg_quests_v2')) || {};
    
    Object.keys(questDatabase).forEach(title => {
        const item = document.createElement('div');
        item.className = `quest-item ${selectedBigTask === title ? 'active' : ''}`;
        
        // 純圖示俐落外觀，防止手機版字體加粗溢出
        item.innerHTML = `
            <span style="flex:1;">📂 ${title} (${questDatabase[title].length})</span>
            <span class="btn-mini btn-mini-del" style="box-shadow:none;" onclick="deleteBigTask(event, '${title}')">×</span>
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

// ==========================================================================
// 🎯 3. 當前任務決策矩陣渲染 (支援三層級顯示、前3個活躍、純圖示按鈕)
// ==========================================================================
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
        
        // 判定：如果索引大於等於 3，代表是還沒輪到的任務，加上 hidden-node 的半透明鎖定樣式
        const isLocked = index >= 3;
        item.className = `subtask-node node-lvl-${subtask.level} ${isLocked ? 'hidden-node' : ''}`;
        
        // 移除了中文字，換成純圖示 📝 與 ×，鎖定時自動附加安全防護鎖
        item.innerHTML = `
            <span id="text-node-${index}">
                [L${subtask.level}] ${subtask.title} ${isLocked ? '<span style="font-size:0.75rem; opacity:0.4;">(🔒 鎖定)</span>' : ''}
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

// ==========================================================================
// 📝 4. 控制台現場動態修正邏輯 (修改、刪除、原地快捷追加)
// ==========================================================================
function editSubtask(index) {
    let questDatabase = JSON.parse(localStorage.getItem('rpg_quests_v2')) || {};
    let subtasks = questDatabase[selectedBigTask] || [];
    
    const newText = prompt(">> 修改此節點數據描述 // UPDATE_NODE_DATA:", subtasks[index].title);
    if (newText === null) return; 
    
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

// ==========================================================================
// ⏱️ 5. 計時器與成果反思控制中樞
// ==========================================================================
function launchFocus(index) {
    const questDatabase = JSON.parse(localStorage.getItem('rpg_quests_v2')) || {};
    activeSubtaskIndex = index;
    
    // 讀取當下選單設定的倒數秒數
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

document.getElementById('giveup-timer-btn').addEventListener('click', () => { 
    clearInterval(countdown); 
    timerModal.classList.add('hidden'); 
});

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
    
    // 完成後將該子任務自工作台移除
    questDatabase[selectedBigTask].splice(activeSubtaskIndex, 1);
    localStorage.setItem('rpg_quests_v2', JSON.stringify(questDatabase));
    
    document.getElementById('gain-input').value = "";
    document.getElementById('next-input').value = "";
    reflectionModal.classList.add('hidden');
    
    renderSubtasks(); renderBigTasks(); renderArchive(); initCalendar();
});

// ==========================================================================
// 💾 6. 竄網使數據備份與傳輸協議（V2.0 三層級終極修正版）
// ==========================================================================

// 點擊匯出：全面打包包含三層級結構的 v2 資料庫
document.getElementById('export-data-btn').addEventListener('click', () => {
    const backupData = {
        quests: localStorage.getItem('rpg_quests_v2'), // 修正：精準對接 V2 資料庫
        logs: localStorage.getItem('rpg_journey_logs')
    };
    
    try {
        const jsonString = JSON.stringify(backupData);
        const base64Code = btoa(encodeURIComponent(jsonString));
        
        // 建立暫時性區域自動複製
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = base64Code;
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        document.execCommand('copy');
        document.body.removeChild(tempTextArea);
        
        alert("⚡ [DATA_PACKAGED_V2] 2.0 三層級數據傳輸碼已自動複製！\n請將此代碼發送到你的手機上。");
    } catch (err) {
        alert("❌ [EXPORT_ERROR] 數據打包失敗：" + err.message);
    }
});

// 點擊匯入：精準解碼並覆蓋手機/電腦兩端的 v2 資料庫
document.getElementById('import-data-btn').addEventListener('click', () => {
    const code = prompt(">> 請輸入或貼上最新數據傳輸碼 // INPUT_PROTOCOL_CODE:");
    if (!code) return;
    
    try {
        const decodedString = decodeURIComponent(atob(code));
        const importedData = JSON.parse(decodedString);
        
        // 解碼成功後，精準寫入 localStorage 核心對接點
        if (importedData.quests) localStorage.setItem('rpg_quests_v2', importedData.quests);
        if (importedData.logs) localStorage.setItem('rpg_journey_logs', importedData.logs);
        
        alert("✨ [DECODE_SUCCESS] 2.0 任務樹網絡同步成功！更新協議狀態。");
        
        // 全局畫面重刷與聯動優化
        renderBigTasks();
        if (selectedBigTask) {
            renderSubtasks();
        } else {
            document.getElementById('subtask-pool').innerHTML = "";
            document.getElementById('active-quest-title').textContent = "請選擇一項主線任務";
            document.getElementById('quick-add-box').classList.add('hidden');
        }
        renderArchive();
        initCalendar();
    } catch (e) {
        alert("❌ [DECODE_ERROR] 傳輸碼解析失敗！\n原因：您可能複製到了舊版(V1)的舊代碼，或字串複製不完整。");
    }
});

// ==========================================================================
// 📊 7. 歷史存檔、今日數據與點擊彈窗查閱邏輯
// ==========================================================================
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
    
    logs.forEach((log, index) => {
        const item = document.createElement('div'); 
        item.style.padding = "8px"; 
        item.style.borderBottom = "1px dashed var(--accent-color)"; 
        item.style.fontSize = "0.9rem";
        
        item.innerHTML = `[${log.date}] 🟢 成功破解: <strong>${log.task}</strong> (委託: ${log.parent})`;
        
        // 點擊歷史檔案：彈出讀取視窗查閱當時的反思紀錄
        item.addEventListener('click', () => {
            document.getElementById('view-log-title').textContent = `📂 檔案讀取 // ${log.task}`;
            document.getElementById('view-gain-text').textContent = log.gain || "無紀錄";
            document.getElementById('view-next-text').textContent = log.next || "無紀錄";
            document.getElementById('view-log-modal').classList.remove('hidden');
        });
        
        list.appendChild(item);
    });
}

// ==========================================================================
// 📅 8. 旅程月曆自動對齊生成演算法
// ==========================================================================
function initCalendar() {
    const grid = document.getElementById('calendar-grid'); 
    if (!grid) return; 
    grid.innerHTML = "";
    
    const now = new Date(); 
    const currentYear = now.getFullYear(); 
    const currentMonth = now.getMonth();
    
    document.getElementById('calendar-month-year').textContent = `${currentYear} / ${String(currentMonth + 1).padStart(2, '0')}`;
    
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const logs = JSON.parse(localStorage.getItem('rpg_journey_logs')) || [];
    
    const activeDates = logs.filter(log => { 
        const d = new Date(log.timestamp); 
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth; 
    }).map(log => new Date(log.timestamp).getDate());
    
    // 生成當月 1 號之前的空網格進行星期對齊
    for (let x = 0; x < firstDayIndex; x++) { 
        const emptyCell = document.createElement('div'); 
        emptyCell.className = 'calendar-day-empty'; 
        grid.appendChild(emptyCell); 
    }
    
    // 生成日期網格並套用高亮協議
    for (let i = 1; i <= daysInMonth; i++) { 
        const dayCell = document.createElement('div'); 
        dayCell.className = 'calendar-day'; 
        dayCell.textContent = i; 
        if (i === now.getDate()) dayCell.classList.add('today'); 
        if (activeDates.includes(i)) dayCell.classList.add('has-data'); 
        grid.appendChild(dayCell); 
    }
}