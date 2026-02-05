// 🔐 Простая аутентификация логин/пароль

let articlesData = [];
let currentItem = null;
let currentUser = null;
let currentIndex = 0;
let currentIframeIndex = 1; // Какой iframe сейчас активен (1 или 2)
let nextItem = null; // Следующая статья (предзагруженная)

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

// Показать ошибку регистрации
function showRegisterError(message) {
    const errorDiv = document.getElementById('registerErrorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.add('active');
}

// Скрыть ошибку регистрации
function hideRegisterError() {
    const errorDiv = document.getElementById('registerErrorMessage');
    errorDiv.classList.remove('active');
}

// Показать форму регистрации
function showRegisterOverlay() {
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('registerOverlay').classList.remove('hidden');
    document.getElementById('regUsername').focus();
}

// Показать форму входа
function showLoginOverlay() {
    document.getElementById('registerOverlay').classList.add('hidden');
    document.getElementById('loginOverlay').classList.remove('hidden');
    document.getElementById('username').focus();
}

// Регистрация
async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const name = document.getElementById('regName').value.trim();
    
    if (!username || !password || !name) {
        showRegisterError('Заполните все поля');
        return;
    }
    
    if (username.length < 3) {
        showRegisterError('Логин должен быть минимум 3 символа');
        return;
    }
    
    if (password.length < 4) {
        showRegisterError('Пароль должен быть минимум 4 символа');
        return;
    }
    
    const registerBtn = document.getElementById('registerBtn');
    registerBtn.disabled = true;
    registerBtn.textContent = 'Регистрация...';
    hideRegisterError();
    
    try {
        // Регистрируем через Apps Script
        const url = `${CONFIG.appsScriptUrl}?action=register&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&name=${encodeURIComponent(name)}`;
        const result = await jsonp(url);
        
        if (result.success && result.user) {
            currentUser = result.user;
            localStorage.setItem('current_user', JSON.stringify(currentUser));
            
            console.log('👤 Зарегистрирован пользователь:', currentUser.name);
            
            hideRegisterOverlay();
            updateUIAfterLogin();
            loadUserProgress();
        } else {
            showRegisterError(result.error || 'Ошибка регистрации');
        }
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        showRegisterError('Ошибка соединения с сервером');
    } finally {
        registerBtn.disabled = false;
        registerBtn.textContent = 'Зарегистрироваться';
    }
}

// Скрыть форму регистрации
function hideRegisterOverlay() {
    document.getElementById('registerOverlay').classList.add('hidden');
}

// Показать ошибку входа
function showLoginError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.add('active');
}

// Скрыть ошибку входа
function hideLoginError() {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.classList.remove('active');
}

// Вход
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showLoginError('Заполните все поля');
        return;
    }
    
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Вход...';
    hideLoginError();
    
    try {
        // Проверяем логин/пароль через Apps Script
        const url = `${CONFIG.appsScriptUrl}?action=login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
        const result = await jsonp(url);
        
        if (result.success && result.user) {
            currentUser = result.user;
            localStorage.setItem('current_user', JSON.stringify(currentUser));
            
            console.log('👤 Вошёл пользователь:', currentUser.name);
            
            hideLoginOverlay();
            updateUIAfterLogin();
            loadUserProgress();
        } else {
            showLoginError(result.error || 'Неверный логин или пароль');
        }
    } catch (error) {
        console.error('Ошибка входа:', error);
        showLoginError('Ошибка соединения с сервером');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Войти';
    }
}

// Показать форму входа
function showLoginOverlay() {
    document.getElementById('loginOverlay').classList.remove('hidden');
    document.getElementById('username').focus();
}

// Скрыть форму входа
function hideLoginOverlay() {
    document.getElementById('loginOverlay').classList.add('hidden');
}

// Обновить UI после входа
function updateUIAfterLogin() {
    document.getElementById('showLoginBtn').style.display = 'none';
    document.getElementById('userInfo').classList.add('active');
    document.getElementById('userName').textContent = currentUser.name;
}

// Выход
function signOut() {
    currentUser = null;
    localStorage.removeItem('current_user');
    
    document.getElementById('showLoginBtn').style.display = 'flex';
    document.getElementById('userInfo').classList.remove('active');
    
    articlesData = [];
    currentIndex = 0;
    
    document.getElementById('metadata').innerHTML = '<div class="loading">Нажмите "Войти" для начала работы</div>';
    document.getElementById('annotationForm').style.display = 'none';
    document.getElementById('articleFrame1').src = 'about:blank';
    document.getElementById('articleFrame2').src = 'about:blank';
    currentIframeIndex = 1;
    nextItem = null;
    
    // Очищаем форму
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    hideLoginError();
    
    console.log('👋 Вышли из системы');
}

// Проверка сохранённой сессии
function checkStoredSession() {
    const stored = localStorage.getItem('current_user');
    console.log('🔍 Проверка localStorage:', stored);
    
    if (stored) {
        try {
            currentUser = JSON.parse(stored);
            console.log('✅ Восстановлена сессия:', currentUser.name, currentUser);
            updateUIAfterLogin();
            loadUserProgress();
            return true;
        } catch (e) {
            console.error('❌ Ошибка восстановления сессии:', e);
            localStorage.removeItem('current_user');
        }
    } else {
        console.log('❌ Нет сохранённой сессии в localStorage');
    }
    return false;
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
    if (!currentUser) {
        console.log('❌ Нет currentUser');
        return;
    }
    
    if (!currentUser.username) {
        console.error('❌ currentUser.username отсутствует!', currentUser);
        alert('Ошибка сессии! Пожалуйста, войдите заново.');
        signOut();
        return;
    }
    
    console.log('📂 Загружаем прогресс для:', currentUser.username);

    // Показываем индикатор загрузки
    document.getElementById('metadata').innerHTML = `
        <div class="loading">
            <div>⏳ Загрузка профиля ${escapeHtml(currentUser.name)}...</div>
        </div>
    `;

    try {
        const dataLoaded = await loadDataFromAppsScript();
        if (!dataLoaded) return;
        
        const url = `${CONFIG.appsScriptUrl}?action=getUserProgress&userId=${encodeURIComponent(currentUser.username)}`;
        console.log('🔗 Запрос прогресса:', url);
        
        const result = await jsonp(url);
        console.log('📥 Ответ сервера:', result);
        
        if (result.success && result.data) {
            currentIndex = result.data.last_index || 0;
            console.log(`✅ Загружен прогресс: начинаем с индекса ${currentIndex}`);
        } else {
            console.log('⚠️ Нет данных прогресса, начинаем с нуля');
            currentIndex = 0;
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
        console.log('💾 Сохраняем прогресс:', {
            userId: currentUser.username,
            index: currentIndex
        });
        
        const params = new URLSearchParams({
            action: 'saveProgress',
            userId: currentUser.username,
            userName: currentUser.name,
            last_index: currentIndex
        });
        const url = `${CONFIG.appsScriptUrl}?${params.toString()}`;
        const response = await fetch(url, { redirect: 'follow' });

        console.log('✅ Прогресс сохранён на сервер');
    } catch (error) {
        console.error('❌ Ошибка сохранения прогресса:', error);
        console.log('⚠️ Прогресс НЕ сохранён на сервере, только локально');
    }
}

// Сохранение аннотации
async function saveAnnotation(itemId, wordMention, affiliatedAuthors) {
    if (!currentUser) {
        throw new Error('Необходимо войти в систему');
    }
    
    try {
        const ip = await getClientIP();
        const timestamp = new Date().toISOString();
        
        console.log('💾 Сохраняем аннотацию:', {
            item: itemId.substring(0, 50),
            word: wordMention,
            authors: affiliatedAuthors
        });
        
        const params = new URLSearchParams({
            action: 'saveAnnotation',
            item_id: itemId,
            word_mention: wordMention,
            affiliated_authors: JSON.stringify(affiliatedAuthors),
            user_id: currentUser.username,
            user_name: currentUser.name,
            ip: ip,
            timestamp: timestamp
        });
        const url = `${CONFIG.appsScriptUrl}?${params.toString()}`;
        const response = await fetch(url, { redirect: 'follow' });

        console.log('✅ Аннотация сохранена');
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка сохранения аннотации:', error);
        console.log('⚠️ Аннотация НЕ сохранена на сервере');
        return true; // Не блокируем работу
    }
}

// Получить следующий элемент (просто следующий по индексу)
function getNextItem(preview = false) {
    const index = preview ? currentIndex + 1 : currentIndex;
    
    if (index >= 0 && index < articlesData.length) {
        if (!preview) {
            currentIndex = index;
        }
        return articlesData[index];
    }
    
    return null;
}

// Отобразить элемент
function displayItem(item, skipPreload = false) {
    const metadata = document.getElementById('metadata');
    const form = document.getElementById('annotationForm');
    
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
    
    // Очищаем чекбокс упоминания
    document.getElementById('wordMention').checked = false;
    
    // Создаём чекбоксы для авторов
    const authorsContainer = document.getElementById('authorsCheckboxes');
    authorsContainer.innerHTML = '';
    
    if (item.authors && item.authors.length > 0) {
        item.authors.forEach((author, index) => {
            const checkboxGroup = document.createElement('div');
            checkboxGroup.className = 'checkbox-group';
            
            const label = document.createElement('label');
            label.className = 'checkbox-label';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `author_${index}`;
            checkbox.dataset.authorName = author;
            
            const span = document.createElement('span');
            span.className = 'checkbox-text';
            span.textContent = `${author} использует в данной статье шанинскую аффилиацию`;
            
            label.appendChild(checkbox);
            label.appendChild(span);
            checkboxGroup.appendChild(label);
            authorsContainer.appendChild(checkboxGroup);
        });
    } else {
        authorsContainer.innerHTML = '<div style="color: #6c757d; font-size: 14px; padding: 10px;">Нет авторов</div>';
    }
    
    // Переключаем активный iframe
    const currentFrame = document.getElementById(`articleFrame${currentIframeIndex}`);
    const nextFrameIndex = currentIframeIndex === 1 ? 2 : 1;
    const nextFrame = document.getElementById(`articleFrame${nextFrameIndex}`);
    
    // Если nextItem уже загружен в nextFrame - просто переключаемся
    if (nextItem && nextItem.id === item.id) {
        // Мгновенное переключение!
        currentFrame.classList.remove('active');
        nextFrame.classList.add('active');
        currentIframeIndex = nextFrameIndex;
        console.log('⚡ Мгновенное переключение на предзагруженную статью!');
    } else {
        // Загружаем в текущий iframe (первый раз или если что-то пошло не так)
        currentFrame.src = item.url;
    }
    
    // Предзагружаем следующую статью (если не сказано пропустить)
    if (!skipPreload) {
        preloadNextItem();
    }
}

// Предзагрузка следующей статьи
function preloadNextItem() {
    const item = getNextItem(true); // Получаем следующую БЕЗ изменения currentIndex
    
    if (item) {
        nextItem = item;
        const nextFrameIndex = currentIframeIndex === 1 ? 2 : 1;
        const nextFrame = document.getElementById(`articleFrame${nextFrameIndex}`);
        
        // Грузим в фоновый iframe
        nextFrame.src = item.url;
        console.log('🔄 Предзагрузка следующей статьи:', item.title.substring(0, 50) + '...');
    } else {
        nextItem = null;
    }
}

// Обновить статистику
function updateStats() {
    const total = articlesData.length;
    const annotated = currentIndex;
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
    
    // Собираем выбранных авторов
    const affiliatedAuthors = [];
    if (currentItem.authors && currentItem.authors.length > 0) {
        currentItem.authors.forEach((author, index) => {
            const checkbox = document.getElementById(`author_${index}`);
            if (checkbox && checkbox.checked) {
                affiliatedAuthors.push(author);
            }
        });
    }
    
    // Запоминаем текущую статью
    const itemToSave = currentItem;
    
    // Увеличиваем индекс (переходим к следующей)
    currentIndex++;
    
    // МГНОВЕННО переключаемся на следующую
    loadNextItem();
    
    // Сохраняем В ФОНЕ (без ожидания)
    saveAnnotation(itemToSave.id, wordMention, affiliatedAuthors)
        .then(() => {
            return saveUserProgress();
        })
        .catch(error => {
            console.error('Ошибка фонового сохранения:', error);
        });
}

// Пропустить элемент
async function handleSkip() {
    if (!currentItem || !currentUser) return;
    
    // Запоминаем текущую статью
    const itemToSave = currentItem;
    
    // Увеличиваем индекс (пропускаем = тоже засчитывается)
    currentIndex++;
    
    // МГНОВЕННО переключаемся на следующую
    loadNextItem();
    
    // Сохраняем пропуск В ФОНЕ (пустой массив авторов)
    saveAnnotation(itemToSave.id, false, [])
        .then(() => {
            return saveUserProgress();
        })
        .catch(error => {
            console.error('Ошибка фонового сохранения пропуска:', error);
        });
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
document.getElementById('showLoginBtn').addEventListener('click', showLoginOverlay);
document.getElementById('loginForm').addEventListener('submit', handleLogin);
document.getElementById('registerForm').addEventListener('submit', handleRegister);
document.getElementById('showRegisterLink').addEventListener('click', (e) => {
    e.preventDefault();
    showRegisterOverlay();
});
document.getElementById('showLoginLink').addEventListener('click', (e) => {
    e.preventDefault();
    showLoginOverlay();
});
document.getElementById('signOutBtn').addEventListener('click', signOut);
document.getElementById('saveBtn').addEventListener('click', handleSave);
document.getElementById('skipBtn').addEventListener('click', handleSkip);

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

// Сохраняем прогресс при закрытии (используем sendBeacon — он работает при выгрузке страницы)
window.addEventListener('beforeunload', () => {
    if (currentUser) {
        const params = new URLSearchParams({
            action: 'saveProgress',
            userId: currentUser.username,
            userName: currentUser.name,
            last_index: currentIndex
        });
        const url = `${CONFIG.appsScriptUrl}?${params.toString()}`;
        navigator.sendBeacon(url);
    }
});

// Инициализация при загрузке
window.addEventListener('load', () => {
    // Проверяем есть ли сохранённая сессия
    if (!checkStoredSession()) {
        // Нет сессии - просто ждём пока нажмут кнопку "Войти"
        console.log('👋 Нажмите "Войти" для начала работы');
    }
});
