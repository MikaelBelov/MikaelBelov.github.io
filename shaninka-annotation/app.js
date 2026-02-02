// 🔒 Приложение БЕЗ публичных API ключей
// Всё идёт через Apps Script!

let articlesData = [];
let currentItem = null;
let annotatedIds = new Set();

// Получение IP адреса
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

// Загрузка данных через Apps Script
async function loadDataFromAppsScript() {
    try {
        const url = `${CONFIG.appsScriptUrl}?action=getData`;
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Ошибка загрузки данных');
        }
        
        articlesData = result.data;
        console.log(`Загружено ${articlesData.length} статей`);
        return true;
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showError('Ошибка загрузки данных: ' + error.message);
        return false;
    }
}

// Загрузка размеченных ID через Apps Script
async function loadAnnotatedIds() {
    try {
        const url = `${CONFIG.appsScriptUrl}?action=getAnnotated`;
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            annotatedIds = new Set(result.data);
            console.log(`Загружено ${annotatedIds.size} размеченных статей`);
        }
    } catch (error) {
        console.error('Ошибка загрузки аннотаций:', error);
    }
}

// Сохранение через Apps Script
async function saveAnnotation(itemId, wordMention, authorAffiliation, ip) {
    try {
        const timestamp = new Date().toISOString();
        
        if (!CONFIG.appsScriptUrl || CONFIG.appsScriptUrl === 'ВСТАВЬ_СЮДА_URL_APPS_SCRIPT') {
            throw new Error('❌ Не настроен Apps Script URL!\n\nОткрой config.js и вставь URL');
        }
        
        const response = await fetch(CONFIG.appsScriptUrl, {
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

// Получить следующий элемент
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
async function handleSave() {
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
        await saveAnnotation(currentItem.id, wordMention, authorAffiliation, ip);
        
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
async function handleSkip() {
    if (!currentItem) return;
    
    const skipBtn = document.getElementById('skipBtn');
    const saveBtn = document.getElementById('saveBtn');
    skipBtn.disabled = true;
    saveBtn.disabled = true;
    skipBtn.textContent = 'Пропуск...';
    
    try {
        const ip = await getClientIP();
        await saveAnnotation(currentItem.id, false, false, ip);
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
        const dataLoaded = await loadDataFromAppsScript();
        if (!dataLoaded) return;
        
        await loadAnnotatedIds();
        
        loadNextItem();
        
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showError('Ошибка инициализации приложения');
    }
}

// Обработчики событий
document.getElementById('saveBtn').addEventListener('click', handleSave);
document.getElementById('skipBtn').addEventListener('click', handleSkip);

// Горячие клавиши
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
    } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSkip();
    }
});

// Запуск
window.addEventListener('load', init);
