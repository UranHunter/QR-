
// import { GoogleGenAI } from "@google/genai"; // Keep for potential future use
// QRCode is loaded globally via script tag

// --- Constants ---
// ADMIN_STORAGE_KEY, CLIENTS_STORAGE_KEY, LOGGED_IN_ADMIN_KEY, LOGGED_IN_CLIENT_KEY are removed as data will be server-side.
const CURRENT_VIEW_KEY = 'currentAppView'; // Remains for UI state
const LEGACY_DEFAULT_CLIENT_PASSWORD = "password123"; // For checking against existing clients

// --- Global State ---
let currentAdmin = null; // Populated from API on login
let currentClient = null; // Populated from API on login
let clients = []; // Populated from API

// --- DOM Elements ---
let appContainer, appHeader, headerTitle, mainContent;
let unifiedLoginView, adminLoginView, clientLoginView, adminPanelView, clientQrView, adminSettingsView;
let adminLoginForm, adminPasswordInput, adminLoginError;
let clientLoginForm, clientLoginIdInput, clientLoginPasswordInput, clientLoginError;
let showAdminLoginBtn, showClientLoginBtn;
let backToUnifiedLoginFromAdminBtn, backToUnifiedLoginFromClientBtn;

let adminControls, goToAdminPanelBtn, goToAdminSettingsBtn, logoutBtn, goToUnifiedLoginBtn, clientSettingsBtn;
let addClientBtn, exportClientsBtn, clientListContainer, clientListUl;
let addClientModal, closeAddClientModalBtn, addClientForm;
let clientFullNameInput, clientPhoneInput, clientIikoIdInput, clientPasswordAdminInput, addClientError;

let clientQrContent, clientNameDisplay, qrCodeContainerClient, clientDefaultPasswordMessage;
let changeClientPasswordView, changeClientPasswordForm, currentClientPasswordInput, newClientPasswordInput, confirmNewClientPasswordInput, changeClientPasswordError, changeClientPasswordSuccess, backToClientQrViewBtn;
let clientAccessError; 

let changeAdminCredentialsForm, oldPasswordInput, newPasswordInput, confirmNewPasswordInput, adminSettingsError, adminSettingsSuccess;
let loadingSpinner;

let resetClientPasswordModal, closeResetClientPasswordModalBtn, resetClientPasswordForm, resetClientPasswordClientIdInput, resetClientPasswordNewInput, resetClientPasswordConfirmInput, resetClientPasswordError, resetClientPasswordSuccess;

// --- LocalStorage Helper Functions (for UI state like CURRENT_VIEW_KEY) ---
function saveToLocalStorage(key, data) {
    try {
        const stringifiedData = JSON.stringify(data);
        localStorage.setItem(key, stringifiedData);
        // console.log(`[Storage] Successfully saved UI data for key: ${key}`);
        return true;
    } catch (error) {
        console.error(`[Storage] Failed to save UI data for key: ${key}. Error:`, error);
        return false;
    }
}

function loadFromLocalStorage(key, defaultValue) {
    try {
        const storedData = localStorage.getItem(key);
        if (storedData === null) {
            return defaultValue;
        }
        return JSON.parse(storedData);
    } catch (error) {
        console.error(`[Storage] Failed to load UI data for key: ${key}. Error:`, error);
        return defaultValue;
    }
}

function removeFromLocalStorage(key) { // Typically for UI state on logout or specific scenarios
    try {
        localStorage.removeItem(key);
        // console.log(`[Storage] Successfully removed UI data for key: ${key}`);
    } catch (error) {
        console.error(`[Storage] Failed to remove UI data for key: ${key}. Error:`, error);
    }
}


// --- API Helper (Illustrative MOCK) ---
const API_BASE_URL = '/api'; // Placeholder for your actual API base URL

async function apiRequest(endpoint, method = 'GET', body = null) {
    showLoading();
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                // Add Authorization header if using tokens:
                // 'Authorization': `Bearer ${sessionStorage.getItem('authToken')}` // Example
            },
        };
        if (body) {
            options.body = JSON.stringify(body);
        }

        console.warn(`[API MOCK] Simulating API Call: ${method} ${API_BASE_URL}${endpoint}`, body || '');
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // --- Placeholder/Mock Implementation START ---
        // This section needs to be replaced with actual fetch calls to your backend API.
        
        if (method === 'POST' && endpoint === '/admin/login') {
            if (body.password === '1') { // Mock admin password
                console.log("[API MOCK] Admin login successful.");
                // In a real app, server would return admin data and possibly a session token
                return { id: 'admin001', username: 'admin', message: 'Admin login successful (mock)' };
            } else {
                console.error("[API MOCK] Invalid admin credentials.");
                throw new Error('Неверный пароль администратора (mock)');
            }
        }

        if (method === 'POST' && endpoint === '/clients/login') {
            // Mock a specific client for login demonstration, independent of 'clients' array
            const MOCK_CLIENT_LOGIN_ID = "+79001234567";
            const MOCK_CLIENT_PASSWORD = "password123";
            const MOCK_CLIENT_DATA = {
                id: 'client001-mock',
                fullName: 'Тестовый Клиент (Mock)',
                phone: MOCK_CLIENT_LOGIN_ID,
                iikoId: 'iiko001-mock',
                qrData: 'iiko001-mock', // This would be the iikoId
                clientLoginId: MOCK_CLIENT_LOGIN_ID,
                clientPasswordHash: MOCK_CLIENT_PASSWORD, // Server compares hashes
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            if (body.phone === MOCK_CLIENT_LOGIN_ID && body.password === MOCK_CLIENT_PASSWORD) {
                 console.log("[API MOCK] Client login successful.");
                return { ...MOCK_CLIENT_DATA, message: 'Client login successful (mock)'};
            }
            console.error("[API MOCK] Invalid client credentials.");
            throw new Error('Неверный номер телефона или пароль (mock)');
        }

        if (method === 'GET' && endpoint === '/clients') {
            // This would fetch clients for the logged-in admin.
            // Returning the current in-memory 'clients' array for admin panel demonstration.
            // In a real app, this data comes fresh from the server.
            console.log("[API MOCK] Fetching clients. Returning in-memory list for demo.", [...clients]);
            return [...clients]; // Return a copy
        }

        if (method === 'POST' && endpoint === '/clients') {
            // Mock adding a client. Server would handle validation, hashing password, and DB insertion.
            const newMockClient = {
                ...body,
                id: generateUUID(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                // clientPasswordHash: server_would_hash_this, // Server responsibility
                qrData: body.iikoId // Ensure qrData is set
            };
            console.log("[API MOCK] Client created:", newMockClient);
            return { ...newMockClient, message: 'Client created (mock)' };
        }

        if (method === 'DELETE' && endpoint.startsWith('/clients/')) { // e.g., /clients/xyz
            const clientId = endpoint.split('/').pop();
            console.log(`[API MOCK] Client ${clientId} deleted.`);
            return { message: 'Client deleted (mock)' };
        }

        if (method === 'PUT' && endpoint.startsWith('/clients/') && endpoint.endsWith('/password')) { // e.g. /clients/xyz/password
            const clientId = endpoint.split('/')[2];
             // Server would verify old password (if client changes it) or just set new one (if admin resets)
             // Server would hash the new password.
            console.log(`[API MOCK] Password for client ${clientId} updated.`);
            return { id: clientId, updatedAt: new Date().toISOString(), message: 'Client password updated (mock)' };
        }
        
        if (method === 'PUT' && endpoint === '/admin/password') {
            // Server would verify oldPassword and hash newPassword.
            console.log("[API MOCK] Admin password updated.");
            return { updatedAt: new Date().toISOString(), message: 'Admin password updated (mock)' };
        }
        
        if (method === 'POST' && endpoint === '/logout') {
            console.log("[API MOCK] Logout successful.");
            return { message: 'Logout successful (mock)'};
        }

        // Fallback for other unmocked endpoints
        console.warn(`[API MOCK] Unmocked endpoint: ${method} ${API_BASE_URL}${endpoint}. Returning generic success.`);
        return { message: `Mock success for ${method} ${endpoint}` };
        // --- Placeholder/Mock Implementation END ---

    } catch (error) {
        console.error('[API MOCK] CATCH Block Error:', error.message);
        hideLoading(); // Ensure loading is hidden on API error
        throw error; // Re-throw to be caught by calling function
    } finally {
        hideLoading();
    }
}


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
    // console.log(`Showing view: ${viewId}`);
    showLoading();
    [unifiedLoginView, adminLoginView, clientLoginView, adminPanelView, clientQrView, adminSettingsView].forEach(view => {
        if (view) view.style.display = 'none';
    });

    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.style.display = 'block';
        saveToLocalStorage(CURRENT_VIEW_KEY, viewId); // UI view state can still use localStorage

        if (viewId === 'unifiedLoginView' || viewId === 'adminLoginView' || viewId === 'clientLoginView') {
            appHeader.style.display = 'none';
        } else {
            appHeader.style.display = 'flex';
            headerTitle.textContent = title || getDefaultTitleForView(viewId);
        }
        updateHeaderControls(viewId);
    }
    
    if (viewId === 'clientQrView' && clientQrContent && changeClientPasswordView) { // Check elements exist
        clientQrContent.style.display = 'block';
        changeClientPasswordView.style.display = 'none';
    }

    hideLoading();
}

function getDefaultTitleForView(viewId) {
    switch (viewId) {
        case 'adminPanelView': return 'Панель администратора';
        case 'adminSettingsView': return 'Настройки администратора';
        case 'clientQrView': return currentClient?.fullName || `Клиент ${currentClient?.clientLoginId || ''}`;
        default: return 'QR iiko';
    }
}

function updateHeaderControls(viewId) {
    const isAdminLoggedIn = !!currentAdmin;
    const isClientLoggedIn = !!currentClient;

    goToAdminPanelBtn.style.display = isAdminLoggedIn && viewId !== 'adminPanelView' ? 'inline-block' : 'none';
    goToAdminSettingsBtn.style.display = isAdminLoggedIn && viewId !== 'adminSettingsView' ? 'inline-block' : 'none';
    logoutBtn.style.display = (isAdminLoggedIn || isClientLoggedIn) ? 'inline-block' : 'none';
    goToUnifiedLoginBtn.style.display = (isAdminLoggedIn || isClientLoggedIn) && viewId !== 'unifiedLoginView' ? 'inline-block' : 'none';
    
    if (clientSettingsBtn && clientQrContent && changeClientPasswordView) { // Check elements exist
        clientSettingsBtn.style.display = isClientLoggedIn && viewId === 'clientQrView' && clientQrContent.style.display === 'block' ? 'inline-block' : 'none';
        if (viewId === 'clientQrView' && changeClientPasswordView.style.display === 'block') {
            clientSettingsBtn.style.display = 'none'; 
        }
    }
}


// --- Initialization ---
async function initializeAdmin() {
    // Admin object (`currentAdmin`) is populated by server response upon successful login.
    // No local admin initialization. `currentAdmin` remains `null` until login.
    console.log("Admin state initialized to null. Login required.");
}

async function loadClientsData() {
    if (!currentAdmin) {
        console.log("Admin not logged in. Client list not loaded from server.");
        clients = []; // Ensure clients array is empty if no admin is logged in
        return;
    }
    try {
        console.log("Attempting to load clients from server (mock)...");
        const serverClients = await apiRequest('/clients', 'GET'); // Mock will return in-memory clients for now
        clients = serverClients || [];
        console.log("Clients loaded from server (mock):", clients);
    } catch (error) {
        console.error("Failed to load clients from server (mock):", error.message);
        clients = []; // Default to empty list on error
        // Optionally show an error to the admin in the UI
        if(adminPanelView.style.display === 'block') { // only if admin panel is active
            clientListUl.innerHTML = '<li>Ошибка загрузки списка клиентов.</li>';
        }
    }
}


// --- Admin Authentication ---
async function handleAdminLogin(event) {
    event.preventDefault();
    adminLoginError.textContent = '';
    const password = adminPasswordInput.value;

    try {
        const adminData = await apiRequest('/admin/login', 'POST', { password });
        currentAdmin = adminData; // Store admin details from server response
        console.log("Admin logged in:", currentAdmin);
        showView('adminPanelView');
        await loadClientsData(); // Load clients after admin logs in
        renderClientList();
    } catch (error) {
        adminLoginError.textContent = error.message || 'Ошибка входа администратора.';
        currentAdmin = null;
    }
}

// --- Client Authentication ---
async function handleClientLogin(event) {
    event.preventDefault();
    clientLoginError.textContent = '';
    const loginId = clientLoginIdInput.value.trim();
    const password = clientLoginPasswordInput.value;

    if (!loginId || !password) {
        clientLoginError.textContent = 'Введите номер телефона и пароль.';
        return;
    }
    if (!loginId.startsWith('+7') || loginId.length < 11) {
        clientLoginError.textContent = 'Номер телефона должен начинаться с +7 и содержать не менее 11 цифр.';
        return;
    }

    try {
        const clientData = await apiRequest('/clients/login', 'POST', { phone: loginId, password: password });
        currentClient = clientData;
        console.log("Client logged in:", currentClient);
        showView('clientQrView');
        displayClientQrCode(currentClient);
        if (clientDefaultPasswordMessage && currentClient.clientPasswordHash === LEGACY_DEFAULT_CLIENT_PASSWORD) {
            clientDefaultPasswordMessage.style.display = 'block';
        } else if (clientDefaultPasswordMessage) {
            clientDefaultPasswordMessage.style.display = 'none';
        }
    } catch (error) {
        clientLoginError.textContent = error.message || 'Неверный номер телефона или пароль.';
        currentClient = null;
    }
}

async function handleLogout() {
    console.log("Logging out...");
    try {
        await apiRequest('/logout', 'POST'); // Inform server about logout
    } catch (error) {
        console.error("Error during server logout (mock):", error.message);
        // Proceed with client-side logout anyway
    }
    currentAdmin = null;
    currentClient = null;
    clients = []; // Clear in-memory client list
    // UI state like CURRENT_VIEW_KEY in localStorage is fine to keep or clear as preferred
    // removeFromLocalStorage(CURRENT_VIEW_KEY); // Optional: clear last view on logout
    showView('unifiedLoginView');
    console.log("Logout complete. Current admin/client set to null.");
}

// --- Admin Panel: Client Management ---
function renderClientList() {
    if (!clientListUl) return;
    clientListUl.innerHTML = ''; 

    if (clients.length === 0) {
        clientListUl.innerHTML = '<li>Нет добавленных клиентов.</li>';
        return;
    }
    console.log("Rendering client list:", clients);

    clients.forEach(client => {
        const listItem = document.createElement('li');
        listItem.setAttribute('data-client-id', client.id);

        const infoDiv = document.createElement('div');
        infoDiv.classList.add('client-info');
        infoDiv.innerHTML = `
            <strong>Телефон (Login ID):</strong> ${client.clientLoginId}<br>
            <strong>iiko ID:</strong> ${client.iikoId}<br>
            ${client.fullName ? `<strong>ФИО:</strong> ${client.fullName}<br>` : ''}
            <small>Добавлен: ${client.createdAt ? new Date(client.createdAt).toLocaleString() : 'N/A'}</small><br>
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
            text: client.qrData || client.iikoId, 
            width: 80,
            height: 80,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    });
}

async function handleAddClient(event) {
    event.preventDefault();
    addClientError.textContent = '';

    const fullName = clientFullNameInput.value.trim();
    const phone = clientPhoneInput.value.trim();
    const iikoId = clientIikoIdInput.value.trim();
    const clientPassword = clientPasswordAdminInput.value; // Server should hash this

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
    // Server should handle uniqueness checks (phone, iikoId)

    const clientData = {
        fullName: fullName || undefined,
        phone: phone, // This will be clientLoginId as well
        iikoId: iikoId,
        clientLoginId: phone, 
        clientPassword: clientPassword, // Send plain password, server hashes
        // qrData: iikoId, // qrData is typically the iikoId itself, server can set this or frontend can assume
    };

    try {
        const newClientFromServer = await apiRequest('/clients', 'POST', clientData);
        clients.push(newClientFromServer); // Add client returned from server (with ID, timestamps)
        console.log("Client added (in-memory):", newClientFromServer, "Current clients:", clients);
        renderClientList();
        addClientForm.reset();
        addClientModal.style.display = 'none';
    } catch (error) {
        addClientError.textContent = error.message || 'Ошибка сохранения клиента.';
    }
}

async function handleDeleteClient(clientId) {
    if (confirm('Вы уверены, что хотите удалить этого клиента? Это действие необратимо.')) {
        try {
            await apiRequest(`/clients/${clientId}`, 'DELETE');
            clients = clients.filter(client => client.id !== clientId);
            console.log(`Client ${clientId} deleted (in-memory). Current clients:`, clients);
            renderClientList();
            // If the deleted client was the currently logged-in client (unlikely in admin panel, but good check)
            if (currentClient && currentClient.id === clientId) { 
                await handleLogout(); 
            }
        } catch (error) {
            alert(error.message || 'Ошибка удаления клиента.');
        }
    }
}

function showResetPasswordModal(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (!client) {
        console.error(`Client with ID ${clientId} not found for password reset.`);
        return;
    }

    resetClientPasswordClientIdInput.value = clientId;
    document.getElementById('resetClientPasswordModalTitle').textContent = `Сбросить пароль для: ${client.fullName || client.clientLoginId}`;
    resetClientPasswordForm.reset();
    resetClientPasswordError.textContent = '';
    resetClientPasswordSuccess.textContent = '';
    resetClientPasswordModal.style.display = 'flex';
}

async function handleResetClientPassword(event) {
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

    try {
        // Server handles hashing and updating the password
        await apiRequest(`/clients/${clientId}/password`, 'PUT', { newPassword: newPassword }); 
        
        // Update local client object (mock behavior, real data is on server)
        const clientIndex = clients.findIndex(c => c.id === clientId);
        if (clientIndex !== -1) {
            // clients[clientIndex].clientPasswordHash = "new_hashed_password_from_server"; // Mock
            clients[clientIndex].updatedAt = new Date().toISOString();
            console.log(`Password for client ${clientId} reset (in-memory).`);
        }
        
        resetClientPasswordSuccess.textContent = 'Пароль клиента успешно обновлен.';
        renderClientList(); // Re-render to show updated timestamp if any

        setTimeout(() => {
            resetClientPasswordModal.style.display = 'none';
            resetClientPasswordSuccess.textContent = '';
        }, 2000);
    } catch (error) {
        resetClientPasswordError.textContent = error.message || 'Ошибка сохранения нового пароля.';
    }
}


// --- Admin Settings ---
async function handleChangeAdminCredentials(event) {
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

    let payload = { oldPassword }; 

    if (newPassword) {
        if (newPassword.length < 6) { 
             adminSettingsError.textContent = 'Новый пароль администратора должен содержать не менее 6 символов.';
             return;
        }
        if (newPassword !== confirmNewPassword) {
            adminSettingsError.textContent = 'Новые пароли не совпадают.';
            return;
        }
        payload.newPassword = newPassword;
    } else {
        adminSettingsError.textContent = 'Новый пароль не был указан. Изменений не внесено.';
        changeAdminCredentialsForm.reset();
        return;
    }
    
    try {
        const updatedAdminData = await apiRequest('/admin/password', 'PUT', payload);
        // currentAdmin.passwordHash = "new_admin_hashed_password_from_server"; // Mock update
        currentAdmin.updatedAt = updatedAdminData.updatedAt || new Date().toISOString();
        adminSettingsSuccess.textContent = 'Пароль администратора успешно обновлен.';
        console.log("Admin credentials changed (in-memory).");
    } catch (error) {
        adminSettingsError.textContent = error.message || 'Ошибка сохранения настроек администратора.';
    }
    changeAdminCredentialsForm.reset();
}

// --- Client QR View & Password Change ---
function displayClientQrCode(client) {
    if (!clientNameDisplay || !qrCodeContainerClient || !clientAccessError || !headerTitle) return;

    clientNameDisplay.textContent = client.fullName || `Клиент ${client.clientLoginId}`;
    qrCodeContainerClient.innerHTML = ''; 
    new QRCode(qrCodeContainerClient, {
        text: client.qrData || client.iikoId, 
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

async function handleChangeClientPassword(event) {
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

    if (!newPassword || newPassword.length < 6) {
        changeClientPasswordError.textContent = 'Новый пароль должен содержать не менее 6 символов.';
        return;
    }
    if (newPassword !== confirmPassword) {
        changeClientPasswordError.textContent = 'Новые пароли не совпадают.';
        return;
    }
    
    try {
        // Server should verify currentPassword and hash newPassword
        await apiRequest(`/clients/${currentClient.id}/password`, 'PUT', {
            currentPassword: currentPassword, 
            newPassword: newPassword
        });
        
        // currentClient.clientPasswordHash = "new_client_hashed_password_from_server"; // Mock update
        currentClient.updatedAt = new Date().toISOString(); 
        console.log(`Client ${currentClient.id} password changed (in-memory).`);

        changeClientPasswordSuccess.textContent = 'Пароль успешно изменен.';
        if (clientDefaultPasswordMessage) clientDefaultPasswordMessage.style.display = 'none'; 
        changeClientPasswordForm.reset();
        
        setTimeout(() => {
            if (clientQrContent && changeClientPasswordView) {
                clientQrContent.style.display = 'block';
                changeClientPasswordView.style.display = 'none';
            }
            changeClientPasswordSuccess.textContent = ''; 
            // Update title back to client name
            headerTitle.textContent = currentClient?.fullName || `Клиент ${currentClient?.clientLoginId}`;
            updateHeaderControls('clientQrView');
        }, 2000);

    } catch (error) {
        changeClientPasswordError.textContent = error.message || 'Ошибка сохранения нового пароля.';
    }
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

    goToAdminPanelBtn.addEventListener('click', async () => {
        showView('adminPanelView');
        // Data should be fresh from server if admin was already logged in and navigates back
        // For mock, loadClientsData might return the same in-memory list or fetch a mock empty list
        await loadClientsData(); 
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

    if (clientSettingsBtn) { 
        clientSettingsBtn.addEventListener('click', () => {
            if (clientQrContent && changeClientPasswordView && headerTitle) { 
                clientQrContent.style.display = 'none';
                changeClientPasswordView.style.display = 'block';
                headerTitle.textContent = "Смена пароля";
                changeClientPasswordError.textContent = '';
                changeClientPasswordSuccess.textContent = '';
                changeClientPasswordForm.reset(); // Reset form when opening
                updateHeaderControls('clientQrView'); 
            }
        });
    }
    if (changeClientPasswordForm) changeClientPasswordForm.addEventListener('submit', handleChangeClientPassword);
    if (backToClientQrViewBtn) {
        backToClientQrViewBtn.addEventListener('click', () => {
            if (clientQrContent && changeClientPasswordView && headerTitle) { 
                 clientQrContent.style.display = 'block';
                changeClientPasswordView.style.display = 'none';
                headerTitle.textContent = currentClient?.fullName || `Клиент ${currentClient?.clientLoginId}`;
                updateHeaderControls('clientQrView');
            }
        });
    }


    if (resetClientPasswordForm) resetClientPasswordForm.addEventListener('submit', handleResetClientPassword);
    if (closeResetClientPasswordModalBtn) closeResetClientPasswordModalBtn.addEventListener('click', () => resetClientPasswordModal.style.display = 'none');
    if (resetClientPasswordModal) resetClientPasswordModal.addEventListener('click', (event) => {
        if (event.target === resetClientPasswordModal) {
            resetClientPasswordModal.style.display = 'none';
        }
    });

    if (exportClientsBtn) {
        exportClientsBtn.addEventListener('click', handleExportClients);
    }
}

// --- CSV Export ---
function handleExportClients() {
    if (!clients || clients.length === 0) {
        alert("Нет клиентов для экспорта (данные в памяти).");
        return;
    }

    const headers = ["ID", "ФИО", "Телефон (Логин)", "iiko ID", "QR Data", "Дата создания", "Дата обновления"];
    const csvRows = [headers.join(',')]; // Header row

    clients.forEach(client => {
        const row = [
            client.id,
            client.fullName || "",
            client.clientLoginId,
            client.iikoId,
            client.qrData,
            client.createdAt ? new Date(client.createdAt).toLocaleString() : "",
            client.updatedAt ? new Date(client.updatedAt).toLocaleString() : ""
        ].map(field => `"${String(field || "").replace(/"/g, '""')}"`); // Escape quotes and ensure string
        csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) { 
        const url = URL.createObjectURL(blob);
        const dateStr = new Date().toISOString().slice(0,10);
        link.setAttribute("href", url);
        link.setAttribute("download", `clients_export_${dateStr}_session.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } else {
        alert("Экспорт CSV не поддерживается вашим браузером.");
    }
}


// --- App Initialization ---
async function initializeApp() {
    console.log("Initializing application...");
    // DOM elements
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
    exportClientsBtn = document.getElementById('exportClientsBtn');
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

    await initializeAdmin(); // Sets up initial admin state (null until login)
    setupEventListeners();

    // With server-side data, app always starts "logged out" from frontend perspective.
    // Session/token would be validated with server if it existed.
    // `currentAdmin` and `currentClient` are null at this point.
    
    const lastView = loadFromLocalStorage(CURRENT_VIEW_KEY, null);
    // If a specific view was stored (e.g. admin panel), but no active session,
    // revert to unified login.
    if ((lastView === 'adminPanelView' || lastView === 'adminSettingsView') && !currentAdmin) {
        showView('unifiedLoginView');
    } else if (lastView === 'clientQrView' && !currentClient) {
        showView('unifiedLoginView');
    } else if (lastView && (document.getElementById(lastView))) {
        // This case is unlikely to be hit if currentAdmin/Client are null as intended.
        // It's a fallback if CURRENT_VIEW_KEY points to a valid view and somehow a session "persisted" (not really).
        // For robustness, check if the entities for that view exist.
        if (lastView === 'adminPanelView' && currentAdmin) {
             await loadClientsData(); renderClientList(); showView(lastView);
        } else if (lastView === 'adminSettingsView' && currentAdmin) {
             showView(lastView);
        } else if (lastView === 'clientQrView' && currentClient) {
             displayClientQrCode(currentClient); showView(lastView);
        }
        else {
             showView('unifiedLoginView');
        }
    }
    else {
        showView('unifiedLoginView');
    }
    console.log("Application initialization complete.");
}

document.addEventListener('DOMContentLoaded', initializeApp);
