// 🔐 Приложение с Google OAuth - автоматический вход

let articlesData = [];
let currentItem = null;
let annotatedIds = new Set();
let currentUser = null;
let currentIndex = 0;

// Google OAuth Client ID
const GOOGLE_CLIENT_ID = CONFIG.googleClientId;

// JSONP helper
function jsonp(url) {
    return new Promise((resolve, reject) => {
        const callbackName = 'jsonp_' + Math.random().toString(36).substr(2, 9);
        const script = document.createElement('script');
        
        window[callbackName] = function(data) {
            delete window[callbackName];
            document.body.removeChild(script);
            resolve(data);
        };
        
        script.onerror = function() {
            delete window[callbackName];
            document.body.removeChild(script);
            reject(new Error('JSONP request failed'));
        };
        
        script.src = url + '&callback=' + callbackName;
        document.body.appendChild(script);
    });
}

// Инициализация Google Sign-In
function initGoogleSignIn() {
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: true,
        cancel_on_tap_outside: false
    });
    
    checkStoredSession();
}

// Обработка ответа от Google
function handleCredentialResponse(response) {
    const payload = parseJwt(response.credential);
    
    currentUser = {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        sub: payload.sub
    };
    
    localStorage.setItem('google_user', JSON.stringify(currentUser));
    
    console.log('👤 Вошёл пользователь:', currentUser.name);
    
    updateUIAfterLogin();
    loadUserProgress();
}

// Парсинг JWT токена
function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// Проверка сохранённой сессии
function checkStoredSession() {
    const stored = localStorage.getItem('google_user');
    if (stored) {
        try {
            currentUser = JSON.parse(stored);
            console.log('👤 Восстановлена сессия:', currentUser.name);
            updateUIAfterLogin();
            loadUserProgress();
        } catch (e) {
            console.error('Ошибка восстановления сессии:', e);
            promptGoogleSignIn();
        }
    } else {
        promptGoogleSignIn();
    }
}

// Показать Google Sign-In (СРАЗУ, без overlay)
function promptGoogleSignIn() {
    hideLoginOverlay();
    
    // Автоматически показываем Google окно
    google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
            console.log('Google Sign-In не показан, показываем overlay');
            showLoginOverlay();
        }
        if (notification.isSkippedMoment()) {
            console.log('Пользователь закрыл окно, показываем overlay');
            showLoginOverlay();
        }
    });
}

// Показать overlay входа
function showLoginOverlay() {
    document.getElementById('loginOverlay').classList.remove('hidden');
}

// Скрыть overlay входа
function hideLoginOverlay() {
    document.getElementById('loginOverlay').classList.add('hidden');
}

// Обновить UI после входа
function updateUIAfterLogin() {
    hideLoginOverlay();
    
    document.getElementById('signInBtn').style.display = 'none';
    document.getElementById('userInfo').classList.add('active');
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userAvatar').src = currentUser.picture;
}

// Выход
function signOut() {
    currentUser = null;
    localStorage.removeItem('google_user');
    
    document.getElementById('signInBtn').style.display = 'flex';
    document.getElementById('userInfo').classList.remove('active');
    
    articlesData = [];
    annotatedIds.clear();
    
    // Сразу показываем Google Sign-In
    promptGoogleSignIn();
    
    console.log('👋 Вышли из системы');
}

// Вход (вызывается при клике на кнопку)
function signIn() {
    promptGoogleSignIn();
}

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

// Загрузка данных через JSONP
async function loadDataFromAppsScript() {
    try {
        const url = `${CONFIG.appsScriptUrl}?action=getData`;
        const result = await jsonp(url);
        
        if (!result.success) {
            throw new Error(result.error || 'Ошибка загрузки данных');
        }
        
        articlesData = result.data;
        console.log(`✅ Загружено ${articlesData.length} статей`);
        return true;
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showError('Ошибка загрузки данных: ' + error.message);
        return false;
    }
}

// Загрузка прогресса пользователя
async function loadUserProgress() {
    if (!currentUser) return;
    
    try {
        const dataLoaded = await loadDataFromAppsScript();
        if (!dataLoaded) return;
        
        const url = `${CONFIG.appsScriptUrl}?action=getUserProgress&userId=${encodeURIComponent(currentUser.sub)}`;
        const result = await jsonp(url);
        
        if (result.success && result.data) {
            annotatedIds = new Set(result.data.annotated_ids || []);
            currentIndex = result.data.last_index || 0;
            console.log(`📂 Загружен прогресс: ${annotatedIds.size} размеченных`);
        }
        
        loadNextItem();
        
    } catch (error) {
        console.error('Ошибка загрузки прогресса:', error);
        showError('Ошибка загрузки прогресса: ' + error.message);
    }
}

// Сохранение прогресса на сервер
async function saveUserProgress() {
    if (!currentUser) return;
    
    try {
        await fetch(CONFIG.appsScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'saveProgress',
                userId: currentUser.sub,
                userEmail: currentUser.email,
                userName: currentUser.name,
                annotated_ids: [...annotatedIds],
                last_index: currentIndex
            })
        });
        
        console.log('💾 Прогресс сохранён');
    } catch (error) {
        console.error('Ошибка сохранения прогресса:', error);
    }
}

// Сохранение аннотации
async function saveAnnotation(itemId, wordMention, authorAffiliation) {
    if (!currentUser) {
        throw new Error('Необходимо войти в систему');
    }
    
    try {
        const ip = await getClientIP();
        const timestamp = new Date().toISOString();
        
        await fetch(CONFIG.appsScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'saveAnnotation',
                item_id: itemId,
                word_mention: wordMention,
                author_affiliation: authorAffiliation,
                user_id: currentUser.sub,
                user_email: currentUser.email,
                user_name: currentUser.name,
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
    for (let i = currentIndex; i < articlesData.length; i++) {
        const item = articlesData[i];
        if (!annotatedIds.has(item.id)) {
            currentIndex = i;
            return item;
        }
    }
    
    for (let i = 0; i < currentIndex; i++) {
        const item = articlesData[i];
        if (!annotatedIds.has(item.id)) {
            currentIndex = i;
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
    
    const itemIndex = articlesData.findIndex(a => a.id === item.id);
    
    metadata.innerHTML = `
        <div class="metadata-item">
            <div class="metadata-label">Прогресс</div>
            <div class="metadata-value" style="color: #007bff; font-weight: 600;">
                Статья ${itemIndex + 1} из ${articlesData.length}
            </div>
        </div>
        
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
    if (!currentItem || !currentUser) return;
    
    const wordMention = document.getElementById('wordMention').checked;
    const authorAffiliation = document.getElementById('authorAffiliation').checked;
    
    const saveBtn = document.getElementById('saveBtn');
    const skipBtn = document.getElementById('skipBtn');
    saveBtn.disabled = true;
    skipBtn.disabled = true;
    saveBtn.textContent = 'Сохранение...';
    
    try {
        await saveAnnotation(currentItem.id, wordMention, authorAffiliation);
        
        annotatedIds.add(currentItem.id);
        await saveUserProgress();
        
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
    if (!currentItem || !currentUser) return;
    
    const skipBtn = document.getElementById('skipBtn');
    const saveBtn = document.getElementById('saveBtn');
    skipBtn.disabled = true;
    saveBtn.disabled = true;
    skipBtn.textContent = 'Пропуск...';
    
    try {
        await saveAnnotation(currentItem.id, false, false);
        annotatedIds.add(currentItem.id);
        await saveUserProgress();
        
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
            <strong>Поздравляем, ${escapeHtml(currentUser.name)}!</strong><br>
            Вы разметили все доступные статьи. Спасибо за вашу работу!
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

// Обработчики событий
document.getElementById('saveBtn').addEventListener('click', handleSave);
document.getElementById('skipBtn').addEventListener('click', handleSkip);
document.getElementById('signInBtn').addEventListener('click', signIn);
document.getElementById('signInBtnOverlay').addEventListener('click', signIn);
document.getElementById('signOutBtn').addEventListener('click', signOut);

// Горячие клавиши
document.addEventListener('keydown', (e) => {
    if (!currentUser) return;
    
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
    } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSkip();
    }
});

// Сохраняем прогресс при закрытии
window.addEventListener('beforeunload', () => {
    if (currentUser) {
        saveUserProgress();
    }
});

// Инициализация при загрузке
window.addEventListener('load', () => {
    if (typeof google !== 'undefined') {
        initGoogleSignIn();
    } else {
        console.error('Google Sign-In library not loaded');
        showError('Ошибка загрузки Google Sign-In');
    }
});
