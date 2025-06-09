
// import { GoogleGenAI } from "@google/genai"; // Keep for potential future use
// QRCode is loaded globally via script tag

// --- Constants ---
const ADMIN_STORAGE_KEY = 'iikoAdmin';
const CLIENTS_STORAGE_KEY = 'iikoClients';
const CURRENT_VIEW_KEY = 'currentAppView';
const LOGGED_IN_ADMIN_KEY = 'loggedInAdmin';
const LOGGED_IN_CLIENT_KEY = 'loggedInClient';
const LEGACY_DEFAULT_CLIENT_PASSWORD = "password123"; // For checking against existing clients


// --- Global State ---
let currentAdmin = null;
let currentClient = null;
let clients = [];

// --- DOM Elements ---
let appContainer, appHeader, headerTitle, mainContent;
let unifiedLoginView, adminLoginView, clientLoginView, adminPanelView, clientQrView, adminSettingsView;
let adminLoginForm, adminPasswordInput, adminLoginError;
let clientLoginForm, clientLoginIdInput, clientLoginPasswordInput, clientLoginError;
let showAdminLoginBtn, showClientLoginBtn;
let backToUnifiedLoginFromAdminBtn, backToUnifiedLoginFromClientBtn;

let adminControls, goToAdminPanelBtn, goToAdminSettingsBtn, logoutBtn, goToUnifiedLoginBtn, clientSettingsBtn;
let addClientBtn, clientListContainer, clientListUl;
let addClientModal, closeAddClientModalBtn, addClientForm;
let clientFullNameInput, clientPhoneInput, clientIikoIdInput, clientPasswordAdminInput, addClientError;

let clientQrContent, clientNameDisplay, qrCodeContainerClient, clientDefaultPasswordMessage;
let changeClientPasswordView, changeClientPasswordForm, currentClientPasswordInput, newClientPasswordInput, confirmNewClientPasswordInput, changeClientPasswordError, changeClientPasswordSuccess, backToClientQrViewBtn;
let clientAccessError; 

let changeAdminCredentialsForm, oldPasswordInput, newPasswordInput, confirmNewPasswordInput, adminSettingsError, adminSettingsSuccess;
let loadingSpinner;

let resetClientPasswordModal, closeResetClientPasswordModalBtn, resetClientPasswordForm, resetClientPasswordClientIdInput, resetClientPasswordNewInput, resetClientPasswordConfirmInput, resetClientPasswordError, resetClientPasswordSuccess;


// --- Utility Functions ---
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function showLoading() {
    if (loadingSpinner) loadingSpinner.style.display = 'flex';
}

function hideLoading() {
    if (loadingSpinner) loadingSpinner.style.display = 'none';
}

function showView(viewId, title) {
    showLoading();
    [unifiedLoginView, adminLoginView, clientLoginView, adminPanelView, clientQrView, adminSettingsView].forEach(view => {
        if (view) view.style.display = 'none';
    });

    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.style.display = 'block';
        localStorage.setItem(CURRENT_VIEW_KEY, viewId);

        if (viewId === 'unifiedLoginView' || viewId === 'adminLoginView' || viewId === 'clientLoginView') {
            appHeader.style.display = 'none';
        } else {
            appHeader.style.display = 'flex';
            headerTitle.textContent = title || getDefaultTitleForView(viewId);
        }
        updateHeaderControls(viewId);
    }
    
    if (viewId === 'clientQrView') {
        clientQrContent.style.display = 'block';
        changeClientPasswordView.style.display = 'none';
    }

    hideLoading();
}

function getDefaultTitleForView(viewId) {
    switch (viewId) {
        case 'adminPanelView': return 'Панель администратора';
        case 'adminSettingsView': return 'Настройки администратора';
        case 'clientQrView': return currentClient?.fullName || `Клиент ${currentClient?.clientLoginId}`;
        default: return 'QR iiko';
    }
}

function updateHeaderControls(viewId) {
    const isAdminLoggedIn = !!localStorage.getItem(LOGGED_IN_ADMIN_KEY);
    const isClientLoggedIn = !!localStorage.getItem(LOGGED_IN_CLIENT_KEY);

    goToAdminPanelBtn.style.display = isAdminLoggedIn && viewId !== 'adminPanelView' ? 'inline-block' : 'none';
    goToAdminSettingsBtn.style.display = isAdminLoggedIn && viewId !== 'adminSettingsView' ? 'inline-block' : 'none';
    logoutBtn.style.display = (isAdminLoggedIn || isClientLoggedIn) ? 'inline-block' : 'none';
    goToUnifiedLoginBtn.style.display = (isAdminLoggedIn || isClientLoggedIn) && viewId !== 'unifiedLoginView' ? 'inline-block' : 'none';
    clientSettingsBtn.style.display = isClientLoggedIn && viewId === 'clientQrView' && clientQrContent.style.display === 'block' ? 'inline-block' : 'none';

    if (viewId === 'clientQrView' && changeClientPasswordView.style.display === 'block') {
        clientSettingsBtn.style.display = 'none'; 
    }
}


// --- Initialization and Data Loading ---
function initializeAdmin() {
    const storedAdmin = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!storedAdmin) {
        const defaultAdmin = {
            passwordHash: '1', // Default admin password (plain text for MVP)
            updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(defaultAdmin));
        currentAdmin = defaultAdmin;
    } else {
        const parsedAdmin = JSON.parse(storedAdmin);
        // Ensure compatibility with old structure by only taking passwordHash
        currentAdmin = {
            passwordHash: parsedAdmin.passwordHash || '1', // Fallback if somehow passwordHash is missing
            updatedAt: parsedAdmin.updatedAt || new Date().toISOString()
        };
        if (!parsedAdmin.passwordHash) { // If old admin only had login, reset to default pass
             localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(currentAdmin));
        }
    }
}

function loadClients() {
    const storedClients = localStorage.getItem(CLIENTS_STORAGE_KEY);
    clients = storedClients ? JSON.parse(storedClients) : [];
}

function loadLoggedInClient() {
    const loggedInClientId = localStorage.getItem(LOGGED_IN_CLIENT_KEY);
    if (loggedInClientId) {
        currentClient = clients.find(c => c.id === loggedInClientId) || null;
    } else {
        currentClient = null;
    }
}


// --- Admin Authentication ---
function handleAdminLogin(event) {
    event.preventDefault();
    adminLoginError.textContent = '';
    const password = adminPasswordInput.value;

    if (!currentAdmin) initializeAdmin(); 

    if (currentAdmin && password === currentAdmin.passwordHash) {
        localStorage.setItem(LOGGED_IN_ADMIN_KEY, 'true');
        showView('adminPanelView');
        renderClientList();
    } else {
        adminLoginError.textContent = 'Неверный пароль.';
        localStorage.removeItem(LOGGED_IN_ADMIN_KEY);
    }
}

// --- Client Authentication ---
function handleClientLogin(event) {
    event.preventDefault();
    clientLoginError.textContent = '';
    const loginId = clientLoginIdInput.value.trim(); // This is now the phone number
    const password = clientLoginPasswordInput.value;

    if (!loginId || !password) {
        clientLoginError.textContent = 'Введите номер телефона и пароль.';
        return;
    }
    if (!loginId.startsWith('+7') || loginId.length < 11) {
        clientLoginError.textContent = 'Номер телефона должен начинаться с +7 и содержать не менее 11 цифр.';
        return;
    }

    const client = clients.find(c => c.clientLoginId === loginId);

    if (client && client.clientPasswordHash === password) { // Compare plain text passwords
        currentClient = client;
        localStorage.setItem(LOGGED_IN_CLIENT_KEY, client.id);
        showView('clientQrView');
        displayClientQrCode(client);
        if (client.clientPasswordHash === LEGACY_DEFAULT_CLIENT_PASSWORD) { // Check if using the old default
            clientDefaultPasswordMessage.style.display = 'block';
        } else {
            clientDefaultPasswordMessage.style.display = 'none';
        }
    } else {
        clientLoginError.textContent = 'Неверный номер телефона или пароль.';
        currentClient = null;
        localStorage.removeItem(LOGGED_IN_CLIENT_KEY);
    }
}

function handleLogout() {
    localStorage.removeItem(LOGGED_IN_ADMIN_KEY);
    localStorage.removeItem(LOGGED_IN_CLIENT_KEY);
    currentAdmin = null;
    currentClient = null;
    initializeAdmin(); 
    showView('unifiedLoginView');
}

// --- Admin Panel: Client Management ---
function renderClientList() {
    if (!clientListUl) return;
    clientListUl.innerHTML = ''; 

    if (clients.length === 0) {
        clientListUl.innerHTML = '<li>Нет добавленных клиентов.</li>';
        return;
    }

    clients.forEach(client => {
        const listItem = document.createElement('li');
        listItem.setAttribute('data-client-id', client.id);

        const infoDiv = document.createElement('div');
        infoDiv.classList.add('client-info');
        infoDiv.innerHTML = `
            <strong>Телефон (Login ID):</strong> ${client.clientLoginId}<br>
            <strong>iiko ID:</strong> ${client.iikoId}<br>
            ${client.fullName ? `<strong>ФИО:</strong> ${client.fullName}<br>` : ''}
            <small>Добавлен: ${new Date(client.createdAt).toLocaleString()}</small><br>
            ${client.updatedAt ? `<small>Обновлен: ${new Date(client.updatedAt).toLocaleString()}</small><br>` : ''}
        `;

        const qrContainer = document.createElement('div');
        qrContainer.id = `qr-${client.id}`;
        qrContainer.classList.add('qr-code-container');
        
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('client-actions');
        
        const resetButton = document.createElement('button');
        resetButton.textContent = 'Сбросить пароль';
        resetButton.classList.add('secondary-button', 'small-button');
        resetButton.onclick = () => showResetPasswordModal(client.id);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Удалить';
        deleteButton.classList.add('danger-button', 'small-button');
        deleteButton.onclick = () => handleDeleteClient(client.id);
        
        actionsDiv.appendChild(resetButton);
        actionsDiv.appendChild(deleteButton);
        
        listItem.appendChild(infoDiv);
        listItem.appendChild(qrContainer);
        listItem.appendChild(actionsDiv);
        clientListUl.appendChild(listItem);

        new QRCode(qrContainer, {
            text: client.qrData, 
            width: 80, // Slightly smaller QR for list
            height: 80,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    });
}

function handleAddClient(event) {
    event.preventDefault();
    addClientError.textContent = '';

    const fullName = clientFullNameInput.value.trim();
    const phone = clientPhoneInput.value.trim();
    const iikoId = clientIikoIdInput.value.trim();
    const clientPassword = clientPasswordAdminInput.value;

    if (!phone || !iikoId || !clientPassword) {
        addClientError.textContent = 'Телефон, iiko ID и пароль клиента являются обязательными полями.';
        return;
    }

    if (!phone.startsWith('+7') || phone.length < 11) {
        addClientError.textContent = 'Номер телефона должен начинаться с +7 и содержать не менее 11 цифр.';
        return;
    }
     if (clientPassword.length < 6) {
        addClientError.textContent = 'Пароль клиента должен содержать не менее 6 символов.';
        return;
    }

    if (clients.some(c => c.clientLoginId === phone)) {
        addClientError.textContent = 'Клиент с таким номером телефона (Login ID) уже существует.';
        return;
    }
    if (clients.some(c => c.iikoId === iikoId)) {
        addClientError.textContent = 'Клиент с таким iiko ID уже существует.';
        return;
    }

    const newClient = {
        id: generateUUID(),
        fullName: fullName || undefined,
        phone: phone,
        iikoId: iikoId,
        qrData: iikoId, 
        clientLoginId: phone, // Client logs in with their phone number
        clientPasswordHash: clientPassword, // Admin sets password, store plain for MVP
        createdAt: new Date().toISOString(),
    };

    clients.push(newClient);
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
    renderClientList();
    addClientForm.reset();
    addClientModal.style.display = 'none';
}

function handleDeleteClient(clientId) {
    if (confirm('Вы уверены, что хотите удалить этого клиента? Это действие необратимо.')) {
        clients = clients.filter(client => client.id !== clientId);
        localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
        renderClientList();
        if (currentClient && currentClient.id === clientId) { 
            handleLogout();
        }
    }
}

function showResetPasswordModal(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    resetClientPasswordClientIdInput.value = clientId;
    document.getElementById('resetClientPasswordModalTitle').textContent = `Сбросить пароль для: ${client.fullName || client.clientLoginId}`;
    resetClientPasswordForm.reset();
    resetClientPasswordError.textContent = '';
    resetClientPasswordSuccess.textContent = '';
    resetClientPasswordModal.style.display = 'flex';
}

function handleResetClientPassword(event) {
    event.preventDefault();
    resetClientPasswordError.textContent = '';
    resetClientPasswordSuccess.textContent = '';

    const clientId = resetClientPasswordClientIdInput.value;
    const newPassword = resetClientPasswordNewInput.value;
    const confirmPassword = resetClientPasswordConfirmInput.value;

    if (!newPassword || newPassword.length < 6) {
        resetClientPasswordError.textContent = 'Новый пароль должен содержать не менее 6 символов.';
        return;
    }
    if (newPassword !== confirmPassword) {
        resetClientPasswordError.textContent = 'Новые пароли не совпадают.';
        return;
    }

    const clientIndex = clients.findIndex(c => c.id === clientId);
    if (clientIndex === -1) {
        resetClientPasswordError.textContent = 'Клиент не найден.';
        return;
    }

    clients[clientIndex].clientPasswordHash = newPassword; // Store plain text for MVP
    clients[clientIndex].updatedAt = new Date().toISOString();
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));

    resetClientPasswordSuccess.textContent = 'Пароль клиента успешно обновлен.';
    renderClientList(); // Re-render to reflect update timestamp potentially

    setTimeout(() => {
        resetClientPasswordModal.style.display = 'none';
    }, 2000);
}


// --- Admin Settings ---
function handleChangeAdminCredentials(event) {
    event.preventDefault();
    adminSettingsError.textContent = '';
    adminSettingsSuccess.textContent = '';

    const oldPassword = oldPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmNewPassword = confirmNewPasswordInput.value;

    if (!currentAdmin) {
        adminSettingsError.textContent = 'Ошибка: администратор не авторизован.';
        return;
    }

    if (oldPassword !== currentAdmin.passwordHash) {
        adminSettingsError.textContent = 'Старый пароль неверен.';
        return;
    }
    
    let changesMade = false;
    const updatedAdmin = { 
        passwordHash: currentAdmin.passwordHash, 
        updatedAt: currentAdmin.updatedAt 
    };


    if (newPassword) { // Only proceed if a new password is provided
        if (newPassword.length < 6) { 
             adminSettingsError.textContent = 'Новый пароль администратора должен содержать не менее 6 символов.';
             return;
        }
        if (newPassword !== confirmNewPassword) {
            adminSettingsError.textContent = 'Новые пароли не совпадают.';
            return;
        }
        updatedAdmin.passwordHash = newPassword; // Store plain text for MVP
        changesMade = true;
    }
    
    if (changesMade) {
        updatedAdmin.updatedAt = new Date().toISOString();
        localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(updatedAdmin));
        currentAdmin = updatedAdmin; 
        adminSettingsSuccess.textContent = 'Пароль администратора успешно обновлен.';
    } else {
         adminSettingsError.textContent = 'Новый пароль не был указан. Изменений не внесено.';
    }
    changeAdminCredentialsForm.reset();
}

// --- Client QR View & Password Change ---
function displayClientQrCode(client) {
    clientNameDisplay.textContent = client.fullName || `Клиент ${client.clientLoginId}`;
    qrCodeContainerClient.innerHTML = ''; 
    new QRCode(qrCodeContainerClient, {
        text: client.qrData, 
        width: 256,
        height: 256,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    clientAccessError.textContent = '';
    headerTitle.textContent = client.fullName || `Клиент ${client.clientLoginId}`; 
    updateHeaderControls('clientQrView');
}

function handleChangeClientPassword(event) {
    event.preventDefault();
    changeClientPasswordError.textContent = '';
    changeClientPasswordSuccess.textContent = '';

    if (!currentClient) {
        changeClientPasswordError.textContent = 'Ошибка: клиент не авторизован.';
        return;
    }

    const currentPassword = currentClientPasswordInput.value;
    const newPassword = newClientPasswordInput.value;
    const confirmPassword = confirmNewClientPasswordInput.value;

    if (currentPassword !== currentClient.clientPasswordHash) { // Plain text comparison
        changeClientPasswordError.textContent = 'Текущий пароль неверен.';
        return;
    }

    if (!newPassword || newPassword.length < 6) {
        changeClientPasswordError.textContent = 'Новый пароль должен содержать не менее 6 символов.';
        return;
    }

    if (newPassword !== confirmPassword) {
        changeClientPasswordError.textContent = 'Новые пароли не совпадают.';
        return;
    }

    currentClient.clientPasswordHash = newPassword; // Store plain text
    currentClient.updatedAt = new Date().toISOString(); 

    const clientIndex = clients.findIndex(c => c.id === currentClient.id);
    if (clientIndex > -1) {
        clients[clientIndex] = currentClient;
        localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
    }
    
    changeClientPasswordSuccess.textContent = 'Пароль успешно изменен.';
    clientDefaultPasswordMessage.style.display = 'none'; 
    changeClientPasswordForm.reset();
    
    setTimeout(() => {
        clientQrContent.style.display = 'block';
        changeClientPasswordView.style.display = 'none';
        changeClientPasswordSuccess.textContent = ''; 
        updateHeaderControls('clientQrView');
    }, 2000);
}


// --- Event Listeners Setup ---
function setupEventListeners() {
    showAdminLoginBtn.addEventListener('click', () => showView('adminLoginView', 'Вход для администратора'));
    showClientLoginBtn.addEventListener('click', () => showView('clientLoginView', 'Вход для клиента'));

    backToUnifiedLoginFromAdminBtn.addEventListener('click', () => showView('unifiedLoginView'));
    backToUnifiedLoginFromClientBtn.addEventListener('click', () => showView('unifiedLoginView'));
    
    adminLoginForm.addEventListener('submit', handleAdminLogin);
    clientLoginForm.addEventListener('submit', handleClientLogin);
    logoutBtn.addEventListener('click', handleLogout);
    goToUnifiedLoginBtn.addEventListener('click', () => showView('unifiedLoginView'));

    goToAdminPanelBtn.addEventListener('click', () => {
        showView('adminPanelView');
        renderClientList();
    });
    goToAdminSettingsBtn.addEventListener('click', () => showView('adminSettingsView'));

    addClientBtn.addEventListener('click', () => {
        addClientModal.style.display = 'flex';
        addClientForm.reset();
        addClientError.textContent = '';
    });
    closeAddClientModalBtn.addEventListener('click', () => addClientModal.style.display = 'none');
    addClientModal.addEventListener('click', (event) => {
        if (event.target === addClientModal) {
            addClientModal.style.display = 'none';
        }
    });
    addClientForm.addEventListener('submit', handleAddClient);
    
    changeAdminCredentialsForm.addEventListener('submit', handleChangeAdminCredentials);

    clientSettingsBtn.addEventListener('click', () => {
        clientQrContent.style.display = 'none';
        changeClientPasswordView.style.display = 'block';
        headerTitle.textContent = "Смена пароля";
        changeClientPasswordError.textContent = '';
        changeClientPasswordSuccess.textContent = '';
        updateHeaderControls('clientQrView'); 
    });
    changeClientPasswordForm.addEventListener('submit', handleChangeClientPassword);
    backToClientQrViewBtn.addEventListener('click', () => {
        clientQrContent.style.display = 'block';
        changeClientPasswordView.style.display = 'none';
        headerTitle.textContent = currentClient?.fullName || `Клиент ${currentClient?.clientLoginId}`;
        updateHeaderControls('clientQrView');
    });

    // Reset client password modal listeners
    if (resetClientPasswordForm) resetClientPasswordForm.addEventListener('submit', handleResetClientPassword);
    if (closeResetClientPasswordModalBtn) closeResetClientPasswordModalBtn.addEventListener('click', () => resetClientPasswordModal.style.display = 'none');
    if (resetClientPasswordModal) resetClientPasswordModal.addEventListener('click', (event) => {
        if (event.target === resetClientPasswordModal) {
            resetClientPasswordModal.style.display = 'none';
        }
    });
}

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    appContainer = document.getElementById('app-container');
    appHeader = document.getElementById('app-header');
    headerTitle = document.getElementById('header-title');
    mainContent = document.getElementById('main-content');
    loadingSpinner = document.getElementById('loading-spinner');

    unifiedLoginView = document.getElementById('unifiedLoginView');
    adminLoginView = document.getElementById('adminLoginView');
    clientLoginView = document.getElementById('clientLoginView');
    adminPanelView = document.getElementById('adminPanelView');
    clientQrView = document.getElementById('clientQrView');
    adminSettingsView = document.getElementById('adminSettingsView');

    showAdminLoginBtn = document.getElementById('showAdminLoginBtn');
    showClientLoginBtn = document.getElementById('showClientLoginBtn');
    backToUnifiedLoginFromAdminBtn = document.getElementById('backToUnifiedLoginFromAdminBtn');
    backToUnifiedLoginFromClientBtn = document.getElementById('backToUnifiedLoginFromClientBtn');

    adminLoginForm = document.getElementById('adminLoginForm');
    adminPasswordInput = document.getElementById('adminPassword');
    adminLoginError = document.getElementById('adminLoginError');

    clientLoginForm = document.getElementById('clientLoginForm');
    clientLoginIdInput = document.getElementById('clientLoginIdInput');
    clientLoginPasswordInput = document.getElementById('clientLoginPasswordInput');
    clientLoginError = document.getElementById('clientLoginError');

    adminControls = document.getElementById('admin-controls');
    goToAdminPanelBtn = document.getElementById('goToAdminPanelBtn');
    goToAdminSettingsBtn = document.getElementById('goToAdminSettingsBtn');
    logoutBtn = document.getElementById('logoutBtn');
    goToUnifiedLoginBtn = document.getElementById('goToUnifiedLoginBtn');
    clientSettingsBtn = document.getElementById('clientSettingsBtn');
    
    addClientBtn = document.getElementById('addClientBtn');
    clientListContainer = document.getElementById('clientListContainer');
    clientListUl = document.getElementById('clientList');

    addClientModal = document.getElementById('addClientModal');
    closeAddClientModalBtn = document.getElementById('closeAddClientModalBtn');
    addClientForm = document.getElementById('addClientForm');
    clientFullNameInput = document.getElementById('clientFullName');
    clientPhoneInput = document.getElementById('clientPhone');
    clientIikoIdInput = document.getElementById('clientIikoId');
    clientPasswordAdminInput = document.getElementById('clientPasswordAdmin');
    addClientError = document.getElementById('addClientError');

    resetClientPasswordModal = document.getElementById('resetClientPasswordModal');
    closeResetClientPasswordModalBtn = document.getElementById('closeResetClientPasswordModalBtn');
    resetClientPasswordForm = document.getElementById('resetClientPasswordForm');
    resetClientPasswordClientIdInput = document.getElementById('resetClientPasswordClientId');
    resetClientPasswordNewInput = document.getElementById('resetClientPasswordNewInput');
    resetClientPasswordConfirmInput = document.getElementById('resetClientPasswordConfirmInput');
    resetClientPasswordError = document.getElementById('resetClientPasswordError');
    resetClientPasswordSuccess = document.getElementById('resetClientPasswordSuccess');
    
    clientQrContent = document.getElementById('clientQrContent');
    clientNameDisplay = document.getElementById('clientNameDisplay');
    qrCodeContainerClient = document.getElementById('qrCodeContainerClient');
    clientDefaultPasswordMessage = document.getElementById('clientDefaultPasswordMessage');
    clientAccessError = document.getElementById('clientAccessError');

    changeClientPasswordView = document.getElementById('changeClientPasswordView');
    changeClientPasswordForm = document.getElementById('changeClientPasswordForm');
    currentClientPasswordInput = document.getElementById('currentClientPassword');
    newClientPasswordInput = document.getElementById('newClientPassword');
    confirmNewClientPasswordInput = document.getElementById('confirmNewClientPassword');
    changeClientPasswordError = document.getElementById('changeClientPasswordError');
    changeClientPasswordSuccess = document.getElementById('changeClientPasswordSuccess');
    backToClientQrViewBtn = document.getElementById('backToClientQrViewBtn');

    changeAdminCredentialsForm = document.getElementById('changeAdminCredentialsForm');
    oldPasswordInput = document.getElementById('oldPassword');
    newPasswordInput = document.getElementById('newPassword');
    confirmNewPasswordInput = document.getElementById('confirmNewPassword');
    adminSettingsError = document.getElementById('adminSettingsError');
    adminSettingsSuccess = document.getElementById('adminSettingsSuccess');

    initializeAdmin();
    loadClients();
    loadLoggedInClient(); 
    setupEventListeners();

    const urlParams = new URLSearchParams(window.location.search);
    const urlClientId = urlParams.get('clientId'); // This was for iikoID from URL, now less relevant for auto-login

    if (localStorage.getItem(LOGGED_IN_ADMIN_KEY) === 'true' && currentAdmin) {
        const lastView = localStorage.getItem(CURRENT_VIEW_KEY);
        if (lastView === 'adminPanelView' || lastView === 'adminSettingsView') {
            showView(lastView);
            if (lastView === 'adminPanelView') renderClientList();
        } else {
            showView('adminPanelView');
            renderClientList();
        }
    } else if (localStorage.getItem(LOGGED_IN_CLIENT_KEY) === 'true' && currentClient) {
        showView('clientQrView');
        displayClientQrCode(currentClient);
         if (currentClient.clientPasswordHash === LEGACY_DEFAULT_CLIENT_PASSWORD) {
            clientDefaultPasswordMessage.style.display = 'block';
        }
    } else if (urlClientId) { 
        showView('clientLoginView', 'Вход для клиента');
    }
    else {
        showView('unifiedLoginView');
    }
});
