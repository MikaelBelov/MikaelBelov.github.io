// 📊 Главная логика приложения

let articlesData = [];
let currentItem = null;
let annotatedIds = new Set();

// Получение IP адреса пользователя
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Ошибка получения IP:', error);
        return 'unknown';
    }
}

// Загрузка данных из Google Sheets
async function loadDataFromSheets() {
    try {
        const range = `${CONFIG.sheets.data}!A:M`;
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.spreadsheetId}/values/${range}?key=${CONFIG.apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.values || data.values.length === 0) {
            throw new Error('Нет данных в таблице');
        }
        
        const rows = data.values.slice(1);
        
        articlesData = rows.map((row, index) => ({
            id: row[0] || `row_${index}`,
            title: row[4] || 'Без названия',
            authors: row[5] ? JSON.parse(row[5]) : [],
            url: row[6] || '',
            journal_name: row[10] || 'Не указан',
            publication_year: row[11] || 'Не указан',
            publisher: row[7] || ''
        }));
        
        console.log(`Загружено ${articlesData.length} статей`);
        return true;
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showError('Ошибка загрузки данных из Google Sheets: ' + error.message);
        return false;
    }
}

// Загрузка уже размеченных ID
async function loadAnnotatedIds() {
    try {
        const range = `${CONFIG.sheets.annotations}!A:A`;
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.spreadsheetId}/values/${range}?key=${CONFIG.apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.values && data.values.length > 1) {
            annotatedIds = new Set(data.values.slice(1).map(row => row[0]));
            console.log(`Загружено ${annotatedIds.size} размеченных статей`);
        }
    } catch (error) {
        console.error('Ошибка загрузки аннотаций:', error);
    }
}

// Сохранение через Google Apps Script
async function saveAnnotationToScript(itemId, wordMention, authorAffiliation, ip) {
    try {
        const timestamp = new Date().toISOString();
        
        const scriptUrl = CONFIG.appsScriptUrl;
        
        if (!scriptUrl || scriptUrl === 'ВСТАВЬ_СЮДА_URL_APPS_SCRIPT') {
            throw new Error('❌ Не настроен Apps Script URL!\n\n📖 Смотри инструкцию в README.md');
        }
        
        const response = await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                item_id: itemId,
                word_mention: wordMention,
                author_affiliation: authorAffiliation,
                ip: ip,
                timestamp: timestamp
            })
        });
        
        return true;
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        throw error;
    }
}

// Получить следующий неразмеченный элемент
function getNextItem() {
    for (const item of articlesData) {
        if (!annotatedIds.has(item.id)) {
            return item;
        }
    }
    return null;
}

// Отобразить элемент
function displayItem(item) {
    const metadata = document.getElementById('metadata');
    const form = document.getElementById('annotationForm');
    const frame = document.getElementById('articleFrame');
    
    metadata.innerHTML = `
        <div class="metadata-item">
            <div class="metadata-label">Название</div>
            <div class="metadata-value">${escapeHtml(item.title)}</div>
        </div>
        
        <div class="metadata-item">
            <div class="metadata-label">Авторы</div>
            <ul class="authors-list metadata-value">
                ${item.authors.map(author => `<li>${escapeHtml(author)}</li>`).join('')}
            </ul>
        </div>
        
        <div class="metadata-item">
            <div class="metadata-label">Журнал</div>
            <div class="metadata-value">${escapeHtml(item.journal_name)}</div>
        </div>
        
        <div class="metadata-item">
            <div class="metadata-label">Год публикации</div>
            <div class="metadata-value">${escapeHtml(String(item.publication_year))}</div>
        </div>
    `;
    
    form.style.display = 'block';
    
    document.getElementById('wordMention').checked = false;
    document.getElementById('authorAffiliation').checked = false;
    
    frame.src = item.url;
}

// Обновить статистику
function updateStats() {
    const total = articlesData.length;
    const annotated = annotatedIds.size;
    const remaining = total - annotated;
    const percent = total > 0 ? (annotated / total * 100) : 0;
    
    document.getElementById('totalCount').textContent = total;
    document.getElementById('annotatedCount').textContent = annotated;
    document.getElementById('remainingCount').textContent = remaining;
    document.getElementById('progressBar').style.width = percent + '%';
}

// Загрузить следующий элемент
function loadNextItem() {
    const item = getNextItem();
    
    if (item) {
        currentItem = item;
        displayItem(item);
        updateStats();
    } else {
        showCompletionMessage();
    }
}

// Сохранить аннотацию
async function saveAnnotation() {
    if (!currentItem) return;
    
    const wordMention = document.getElementById('wordMention').checked;
    const authorAffiliation = document.getElementById('authorAffiliation').checked;
    
    const saveBtn = document.getElementById('saveBtn');
    const skipBtn = document.getElementById('skipBtn');
    saveBtn.disabled = true;
    skipBtn.disabled = true;
    saveBtn.textContent = 'Сохранение...';
    
    try {
        const ip = await getClientIP();
        await saveAnnotationToScript(currentItem.id, wordMention, authorAffiliation, ip);
        
        annotatedIds.add(currentItem.id);
        
        setTimeout(() => {
            loadNextItem();
        }, 500);
        
    } catch (error) {
        alert(error.message);
    } finally {
        saveBtn.disabled = false;
        skipBtn.disabled = false;
        saveBtn.textContent = 'Сохранить';
    }
}

// Пропустить элемент
async function skipItem() {
    if (!currentItem) return;
    
    const skipBtn = document.getElementById('skipBtn');
    const saveBtn = document.getElementById('saveBtn');
    skipBtn.disabled = true;
    saveBtn.disabled = true;
    skipBtn.textContent = 'Пропуск...';
    
    try {
        const ip = await getClientIP();
        await saveAnnotationToScript(currentItem.id, false, false, ip);
        annotatedIds.add(currentItem.id);
        
        setTimeout(() => {
            loadNextItem();
        }, 500);
    } catch (error) {
        alert(error.message);
    } finally {
        skipBtn.disabled = false;
        saveBtn.disabled = false;
        skipBtn.textContent = 'Пропустить';
    }
}

// Сообщение о завершении
function showCompletionMessage() {
    const metadata = document.getElementById('metadata');
    const form = document.getElementById('annotationForm');
    
    metadata.innerHTML = `
        <div class="alert alert-success">
            <strong>Поздравляем!</strong><br>
            Все элементы размечены. Спасибо за вашу работу!
        </div>
    `;
    
    form.style.display = 'none';
}

// Показать ошибку
function showError(message) {
    const metadata = document.getElementById('metadata');
    metadata.innerHTML = `
        <div class="alert alert-error">
            <strong>Ошибка!</strong><br>
            ${escapeHtml(message)}
        </div>
    `;
}

// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Инициализация
async function init() {
    try {
        const dataLoaded = await loadDataFromSheets();
        if (!dataLoaded) return;
        
        await loadAnnotatedIds();
        
        loadNextItem();
        
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showError('Ошибка инициализации приложения');
    }
}

// Обработчики событий
document.getElementById('saveBtn').addEventListener('click', saveAnnotation);
document.getElementById('skipBtn').addEventListener('click', skipItem);

// Горячие клавиши
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        saveAnnotation();
    } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        skipItem();
    }
});

// Запуск
window.addEventListener('load', init);
