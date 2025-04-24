// API endpoints
const API_BASE_URL = 'https://api.sand-box.pp.ua';
const API_ENDPOINTS = {
    register: `${API_BASE_URL}/auth/register`,
    login: `${API_BASE_URL}/auth/login`,
    logout: `${API_BASE_URL}/auth/logout`,
    uploadPdf: `${API_BASE_URL}/upload_pdf`,
    createVacancy: `${API_BASE_URL}/vacancy_post`,
    getVacancies: `${API_BASE_URL}/vacancy/`,
    getResumes: `${API_BASE_URL}/resumes/`,
    getResumesByVacancy: (vacancyId) => `${API_BASE_URL}/resumes/resumes_by_vacancy/${vacancyId}`,
    getResumeById: (id) => `${API_BASE_URL}/resumes/${id}`,
    deleteResume: (id) => `${API_BASE_URL}/resumes/${id}`,
    deleteVacancy: (id) => `${API_BASE_URL}/vacancy/${id}`,
    submitTest: `${API_BASE_URL}/test/submit`,
    me: `${API_BASE_URL}/auth/me`,
    refresh: `${API_BASE_URL}/auth/refresh`
};

// DOM Elements
const elements = {
    // Auth views
    loggedOutView: document.getElementById('logged-out-view'),
    loggedInView: document.getElementById('logged-in-view'),
    usernameDisplay: document.getElementById('username-display'),
    
    // Forms and sections
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    resumeUploadSection: document.getElementById('resume-upload-section'),
    vacancyManagementSection: document.getElementById('vacancy-management-section'),
    myResumesSection: document.getElementById('my-resumes-section'),
    createVacancyForm: document.getElementById('create-vacancy-form'),
    viewVacanciesContainer: document.getElementById('view-vacancies-container'),
    
    // Buttons
    showLoginBtn: document.getElementById('show-login'),
    showRegisterBtn: document.getElementById('show-register'),
    logoutBtn: document.getElementById('logout-btn'),
    showResumeBtn: document.getElementById('show-resume-section'),
    showVacancyBtn: document.getElementById('show-vacancy-section'),
    showMyResumesBtn: document.getElementById('show-my-resumes-section'),
    showCreateVacancyBtn: document.getElementById('show-create-vacancy'),
    showViewVacanciesBtn: document.getElementById('show-view-vacancies'),
    
    // Form elements
    loginFormElement: document.getElementById('login'),
    registerFormElement: document.getElementById('register'),
    resumeUploadFormElement: document.getElementById('resume-upload-form'),
    vacancyCreateFormElement: document.getElementById('vacancy-create'),
    
    // Form inputs
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    registerName: document.getElementById('register-name'),
    registerAbout: document.getElementById('register-about'),
    registerAddress: document.getElementById('register-address'),
    registerEmail: document.getElementById('register-email'),
    registerPhone: document.getElementById('register-phone'),
    registerInn: document.getElementById('register-inn'),
    registerLogo: document.getElementById('register-logo'),
    registerPassword: document.getElementById('register-password'),
    vacancySelector: document.getElementById('vacancy-selector'),
    vacancyId: document.getElementById('vacancy-id'),
    resumeFile: document.getElementById('resume-file'),
    
    // Vacancy form inputs
    vacancyTitle: document.getElementById('vacancy-title'),
    vacancyLocation: document.getElementById('vacancy-location'),
    vacancyDescription: document.getElementById('vacancy-description'),
    vacancyRequirements: document.getElementById('vacancy-requirements'),
    vacancySalary: document.getElementById('vacancy-salary'),
    vacancySkills: document.getElementById('vacancy-skills'),
    
    // Lists and containers
    uploadHistoryList: document.getElementById('upload-history-list'),
    vacanciesList: document.getElementById('vacancies-list'),
    resumesListContainer: document.getElementById('resumes-list-container'),
    
    // Modal elements
    resumeDetailModal: document.getElementById('resume-detail-modal'),
    resumeDetailContent: document.getElementById('resume-detail-content'),
    closeModalBtn: document.querySelector('.close-modal'),
    
    // Notification
    notification: document.getElementById('notification')
};

// State management
let currentUser = null;
const uploadHistory = [];
let userVacancies = [];
let userResumes = [];

// Helper function for authenticated API requests
async function fetchWithAuth(url, options = {}) {
    // Получаем токен из localStorage
    const token = localStorage.getItem('authToken');
    const headers = {
        ...options.headers || {},
    };
    
    // Добавляем токен в заголовок если он есть
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return fetch(url, {
        ...options,
        headers,
        credentials: 'include' // Оставляем для совместимости с куками
    });
}

// Конфигурация JWT
const config = {
    JWT_ACCESS_COOKIE_NAME: 'my_access_token',
    JWT_REFRESH_COOKIE_NAME: 'my_refresh_token'
};

// Функция для сохранения токена в localStorage
function setAuthToken(token, refreshToken = null) {
    if (token) {
        localStorage.setItem('authToken', token);
        console.log('Access token saved to localStorage');
    }
    
    if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
        console.log('Refresh token saved to localStorage');
    }
}

// Функция для удаления токенов
function clearAuthTokens() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
}

// Check authentication status
function checkAuthStatus() {
    const savedUser = localStorage.getItem('currentUser');
    const authToken = localStorage.getItem('authToken');
    
    if (savedUser && authToken) {
        try {
            currentUser = JSON.parse(savedUser);
            updateUIForLoggedInUser();
        } catch (e) {
            console.error('Error parsing saved user data', e);
            logoutUser();
        }
    } else {
        // If either token or user info is missing, show login view
        updateUIForLoggedOutUser();
    }
}

// Function to update UI for logged in users
function updateUIForLoggedInUser() {
    // Скрываем все, что связано с неавторизованным состоянием
    elements.loggedOutView.style.display = 'none';
    elements.loginForm.style.display = 'none';
    elements.registerForm.style.display = 'none';
    
    // Показываем интерфейс для авторизованных пользователей
    elements.loggedInView.style.display = 'block';
    
    // Set username in UI if available
    if (currentUser && currentUser.name) {
        elements.usernameDisplay.textContent = currentUser.name;
    } else if (currentUser && currentUser.email) {
        elements.usernameDisplay.textContent = currentUser.email;
    }
    
    // Show resume section by default
    showResumeSection();
    
    // Load initial data
    loadVacanciesForDropdown();
    loadUploadHistory();
}

function updateUIForLoggedOutUser() {
    elements.loggedOutView.style.display = 'block';
    elements.loggedInView.style.display = 'none';
    elements.loginForm.style.display = 'block';
    elements.registerForm.style.display = 'none';
    elements.resumeUploadSection.style.display = 'none';
    elements.vacancyManagementSection.style.display = 'none';
    elements.myResumesSection.style.display = 'none';
    
    // Clear form fields
    elements.loginFormElement.reset();
    elements.registerFormElement.reset();
}

function showResumeSection() {
    elements.resumeUploadSection.style.display = 'block';
    elements.vacancyManagementSection.style.display = 'none';
    elements.myResumesSection.style.display = 'none';
    
    elements.showResumeBtn.classList.add('active');
    elements.showVacancyBtn.classList.remove('active');
    elements.showMyResumesBtn.classList.remove('active');
    
    // Load vacancies for the dropdown if not already loaded
    loadVacanciesForDropdown();
}

function showVacancySection() {
    elements.resumeUploadSection.style.display = 'none';
    elements.vacancyManagementSection.style.display = 'block';
    elements.myResumesSection.style.display = 'none';
    
    elements.showResumeBtn.classList.remove('active');
    elements.showVacancyBtn.classList.add('active');
    elements.showMyResumesBtn.classList.remove('active');
    
    // Default to create vacancy tab
    showCreateVacancyTab();
}

function showMyResumesSection() {
    elements.resumeUploadSection.style.display = 'none';
    elements.vacancyManagementSection.style.display = 'none';
    elements.myResumesSection.style.display = 'block';
    
    elements.showResumeBtn.classList.remove('active');
    elements.showVacancyBtn.classList.remove('active');
    elements.showMyResumesBtn.classList.add('active');
    
    // Create vacancy selector if it doesn't exist
    if (!document.getElementById('resume-vacancy-selector')) {
        const selectorContainer = document.createElement('div');
        selectorContainer.className = 'vacancy-filter-container';
        
        const label = document.createElement('label');
        label.htmlFor = 'resume-vacancy-selector';
        label.textContent = 'Filter by Vacancy:';
        
        const select = document.createElement('select');
        select.id = 'resume-vacancy-selector';
        
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'All Resumes';
        select.appendChild(defaultOption);
        
        selectorContainer.appendChild(label);
        selectorContainer.appendChild(select);
        
        // Insert before the resumes list container
        elements.myResumesSection.insertBefore(selectorContainer, elements.resumesListContainer);
        
        // Add event listener for the selector
        select.addEventListener('change', function() {
            const selectedVacancyId = this.value;
            fetchResumes(selectedVacancyId);
        });
    }
    
    // Load vacancies for the filter dropdown
    loadVacanciesForFilterDropdown();
    
    // Fetch all resumes initially
    fetchResumes();
}

function showCreateVacancyTab() {
    elements.createVacancyForm.style.display = 'block';
    elements.viewVacanciesContainer.style.display = 'none';
    
    elements.showCreateVacancyBtn.classList.add('active');
    elements.showViewVacanciesBtn.classList.remove('active');
}

function showViewVacanciesTab() {
    elements.createVacancyForm.style.display = 'none';
    elements.viewVacanciesContainer.style.display = 'block';
    
    elements.showCreateVacancyBtn.classList.remove('active');
    elements.showViewVacanciesBtn.classList.add('active');
    
    // Fetch vacancies when switching to this tab
    fetchVacancies();
}

// Display notification
function showNotification(message, isError = false) {
    elements.notification.textContent = message;
    elements.notification.classList.add('show');
    
    if (isError) {
        elements.notification.classList.add('error');
    } else {
        elements.notification.classList.remove('error');
    }
    
    setTimeout(() => {
        elements.notification.classList.remove('show');
    }, 3000);
}

// History management
function addToUploadHistory(vacancyId, vacancyTitle, filename, timestamp, isMultipleUpload = false) {
    let historyItem;
    
    if (isMultipleUpload) {
        // Check if there's already a batch upload entry with this timestamp
        const existingBatchIndex = uploadHistory.findIndex(item => 
            item.isBatch && item.timestamp === timestamp && item.vacancyId === vacancyId);
        
        if (existingBatchIndex !== -1) {
            // Update existing batch entry
            uploadHistory[existingBatchIndex].count += 1;
            uploadHistory[existingBatchIndex].files.push(filename);
            
            // Keep list at max 10 items
            if (uploadHistory.length > 10) {
                uploadHistory.pop();
            }
            
            // Save to localStorage
            localStorage.setItem(`uploadHistory_${currentUser.email}`, JSON.stringify(uploadHistory));
            
            // Update UI
            renderUploadHistory();
            return;
        }
        
        // Create a new batch entry
        historyItem = { 
            vacancyId,
            vacancyTitle,
            filename, 
            timestamp,
            isBatch: true,
            count: 1,
            files: [filename]
        };
    } else {
        // Single file upload
        historyItem = { vacancyId, vacancyTitle, filename, timestamp, isBatch: false };
    }
    
    uploadHistory.unshift(historyItem); // Add to beginning of array
    
    // Keep only the last 10 items
    if (uploadHistory.length > 10) {
        uploadHistory.pop();
    }
    
    // Save to localStorage
    localStorage.setItem(`uploadHistory_${currentUser.email}`, JSON.stringify(uploadHistory));
    
    // Update UI
    renderUploadHistory();
}

function loadUploadHistory() {
    if (!currentUser || !currentUser.email) return;
    
    const savedHistory = localStorage.getItem(`uploadHistory_${currentUser.email}`);
    if (savedHistory) {
        // Replace the array contents
        uploadHistory.length = 0;
        const parsedHistory = JSON.parse(savedHistory);
        uploadHistory.push(...parsedHistory);
        
        // Update UI
        renderUploadHistory();
    }
}

function renderUploadHistory() {
    elements.uploadHistoryList.innerHTML = '';
    
    if (uploadHistory.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.textContent = 'No upload history available.';
        elements.uploadHistoryList.appendChild(emptyItem);
        return;
    }
    
    uploadHistory.forEach(item => {
        const listItem = document.createElement('li');
        const date = new Date(item.timestamp).toLocaleString();
        
        if (item.isBatch && item.count > 1) {
            // Display batch upload
            listItem.innerHTML = `
                <div><strong>Vacancy:</strong> ${item.vacancyTitle}</div>
                <div><strong>Files:</strong> ${item.count} files uploaded</div>
                <div><strong>Uploaded:</strong> ${date}</div>
            `;
        } else {
            // Display single file upload
            listItem.innerHTML = `
                <div><strong>Vacancy:</strong> ${item.vacancyTitle}</div>
                <div><strong>File:</strong> ${item.filename}</div>
                <div><strong>Uploaded:</strong> ${date}</div>
            `;
        }
        
        elements.uploadHistoryList.appendChild(listItem);
    });
}

// Vacancy functions
async function createVacancy(vacancyData) {
    try {
        const response = await fetchWithAuth(API_ENDPOINTS.createVacancy, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(vacancyData)
        });
        
        // Handle unauthorized
        if (response.status === 401) {
            showNotification('Your session has expired. Please log in again.', true);
            logoutUser();
            return;
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to create vacancy');
        }
        
        showNotification('Vacancy created successfully!');
        
        // Reset form and switch to view vacancies tab
        elements.vacancyCreateFormElement.reset();
        showViewVacanciesTab();
        
    } catch (error) {
        showNotification(`Error creating vacancy: ${error.message}`, true);
        console.error('Vacancy creation error:', error);
    }
}

async function fetchVacancies() {
    try {
        elements.vacanciesList.innerHTML = '<p>Loading vacancies...</p>';
        
        const response = await fetchWithAuth(API_ENDPOINTS.getVacancies, {
            method: 'GET',
            headers: {
                "Content-Type": "application/json"
            }
        });
        
        // Handle unauthorized
        if (response.status === 401) {
            showNotification('Your session has expired. Please log in again.', true);
            logoutUser();
            return;
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch vacancies');
        }
        
        // Store vacancies and render them
        userVacancies = data;
        renderVacancies();
        
    } catch (error) {
        elements.vacanciesList.innerHTML = `<p class="error">Error loading vacancies: ${error.message}</p>`;
        console.error('Fetch vacancies error:', error);
    }
}

function renderVacancies() {
    elements.vacanciesList.innerHTML = '';
    
    if (!userVacancies || userVacancies.length === 0) {
        elements.vacanciesList.innerHTML = '<p class="no-vacancies">You haven\'t created any vacancies yet.</p>';
        return;
    }
    
    userVacancies.forEach(vacancy => {
        const vacancyEl = document.createElement('div');
        vacancyEl.className = 'vacancy-card';
        
        const header = document.createElement('div');
        header.className = 'vacancy-header';
        
        const titleInfo = document.createElement('div');
        const title = document.createElement('h3');
        title.className = 'vacancy-title';
        title.textContent = vacancy.title;
        
        const location = document.createElement('div');
        location.className = 'vacancy-location';
        location.textContent = vacancy.location;
        
        titleInfo.appendChild(title);
        titleInfo.appendChild(location);
        
        const salary = document.createElement('div');
        salary.className = 'vacancy-salary';
        salary.textContent = vacancy.salary;
        
        header.appendChild(titleInfo);
        header.appendChild(salary);
        
        const description = document.createElement('div');
        description.className = 'vacancy-description';
        description.textContent = vacancy.description;
        
        const requirements = document.createElement('div');
        requirements.className = 'vacancy-requirements';
        requirements.innerHTML = `<strong>Requirements:</strong> ${vacancy.requirements}`;
        
        const skillsList = document.createElement('div');
        skillsList.className = 'skills-list';
        
        if (vacancy.skills && vacancy.skills.length > 0) {
            vacancy.skills.forEach(skill => {
                const skillTag = document.createElement('span');
                skillTag.className = 'skill-tag';
                skillTag.textContent = skill.title;
                skillsList.appendChild(skillTag);
            });
        }
        
        // Add delete button
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'vacancy-actions';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'vacancy-action-btn delete';
        deleteBtn.textContent = 'Delete Vacancy';
        deleteBtn.setAttribute('data-vacancy-id', vacancy.id);
        deleteBtn.addEventListener('click', () => deleteVacancy(vacancy.id));
        
        actionsDiv.appendChild(deleteBtn);
        
        vacancyEl.appendChild(header);
        vacancyEl.appendChild(description);
        vacancyEl.appendChild(requirements);
        vacancyEl.appendChild(skillsList);
        vacancyEl.appendChild(actionsDiv);
        
        elements.vacanciesList.appendChild(vacancyEl);
    });
}

// Resume functions
async function fetchResumes(vacancyId = null) {
    try {
        elements.resumesListContainer.innerHTML = '<p>Loading your resumes...</p>';
        
        // Choose the appropriate endpoint based on whether a vacancy ID is provided
        const endpoint = vacancyId 
            ? API_ENDPOINTS.getResumesByVacancy(vacancyId) 
            : API_ENDPOINTS.getResumes;
        
        const response = await fetchWithAuth(endpoint, {
            method: 'GET',
            headers: { "Content-Type": "application/json" }
        });
        
        // Handle unauthorized
        if (response.status === 401) {
            showNotification('Your session has expired. Please log in again.', true);
            logoutUser();
            return;
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch resumes');
        }
        
        // Store resumes and render them
        userResumes = data;
        renderResumes(vacancyId);
        
    } catch (error) {
        elements.resumesListContainer.innerHTML = `<p class="error">Error loading resumes: ${error.message}</p>`;
        console.error('Fetch resumes error:', error);
    }
}

function renderResumes(vacancyId = null) {
    elements.resumesListContainer.innerHTML = '';
    
    if (!userResumes || userResumes.length === 0) {
        elements.resumesListContainer.innerHTML = '<p class="no-resumes">No resumes found for this selection.</p>';
        return;
    }
    
    // Add description of resume quality if viewing by vacancy
    if (vacancyId) {
        const qualityInfo = document.createElement('div');
        qualityInfo.className = 'resume-quality-info';
        qualityInfo.innerHTML = `
            <p>Resumes are sorted by match quality for this vacancy:</p>
            <div class="quality-indicators">
                <span class="quality best">Best Match</span>
                <span class="quality good">Good Match</span>
                <span class="quality average">Average Match</span>
                <span class="quality normal">Standard Resume</span>
            </div>
        `;
        elements.resumesListContainer.appendChild(qualityInfo);
    }
    
    // Container for all resume cards
    const resumesContainer = document.createElement('div');
    resumesContainer.className = 'resumes-grid';
    elements.resumesListContainer.appendChild(resumesContainer);
    
    userResumes.forEach((resume, index) => {
        const resumeEl = document.createElement('div');
        resumeEl.className = 'resume-card';
        
        // Add quality class based on index if viewing by vacancy
        if (vacancyId) {
            if (index === 0) {
                resumeEl.classList.add('quality-best');
                resumeEl.innerHTML = '<div class="quality-badge">Best Match</div>';
            } else if (index === 1) {
                resumeEl.classList.add('quality-good');
                resumeEl.innerHTML = '<div class="quality-badge">Good Match</div>';
            } else if (index === 2) {
                resumeEl.classList.add('quality-average');
                resumeEl.innerHTML = '<div class="quality-badge">Average Match</div>';
            } else {
                resumeEl.classList.add('quality-normal');
            }
        }
        
        const header = document.createElement('div');
        header.className = 'resume-header';
        
        const nameInfo = document.createElement('div');
        const name = document.createElement('h3');
        name.className = 'resume-name';
        name.textContent = resume.fullname;
        
        const location = document.createElement('div');
        location.className = 'resume-location';
        location.textContent = resume.location;
        
        nameInfo.appendChild(name);
        nameInfo.appendChild(location);
        
        header.appendChild(nameInfo);
        
        const skills = document.createElement('div');
        skills.className = 'resume-skills';
        
        // Show up to 5 skills
        const displaySkills = resume.skills.slice(0, 5);
        
        if (displaySkills && displaySkills.length > 0) {
            displaySkills.forEach(skill => {
                const skillTag = document.createElement('span');
                skillTag.className = `resume-skill ${skill.type.toLowerCase()}`;
                skillTag.textContent = skill.title;
                skills.appendChild(skillTag);
            });
            
            if (resume.skills.length > 5) {
                const moreSkills = document.createElement('span');
                moreSkills.className = 'resume-skill';
                moreSkills.textContent = `+${resume.skills.length - 5} more`;
                skills.appendChild(moreSkills);
            }
        }
        
        const actions = document.createElement('div');
        actions.className = 'resume-actions';
        
        const viewBtn = document.createElement('button');
        viewBtn.className = 'resume-action-btn view';
        viewBtn.textContent = 'View';
        viewBtn.setAttribute('data-resume-id', resume.id);
        viewBtn.addEventListener('click', () => viewResumeDetails(resume.id));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'resume-action-btn delete';
        deleteBtn.textContent = 'Delete';
        deleteBtn.setAttribute('data-resume-id', resume.id);
        deleteBtn.addEventListener('click', () => deleteResume(resume.id));
        
        actions.appendChild(viewBtn);
        actions.appendChild(deleteBtn);
        
        resumeEl.appendChild(header);
        resumeEl.appendChild(skills);
        resumeEl.appendChild(actions);
        
        resumesContainer.appendChild(resumeEl);
    });
}

async function viewResumeDetails(resumeId) {
    try {
        // Show modal with loading message
        elements.resumeDetailContent.innerHTML = '<p>Loading resume details...</p>';
        elements.resumeDetailModal.style.display = 'block';
        
        const response = await fetchWithAuth(API_ENDPOINTS.getResumeById(resumeId), {
            method: 'GET'
        });
        
        if (response.status === 401) {
            showNotification('Your session has expired. Please log in again.', true);
            logoutUser();
            return;
        }
        
        const resume = await response.json();
        
        if (!response.ok) {
            throw new Error(resume.message || 'Failed to fetch resume details');
        }
        
        // Render resume details in the modal
        renderResumeDetails(resume);
        
    } catch (error) {
        elements.resumeDetailContent.innerHTML = `<p class="error">Error loading resume details: ${error.message}</p>`;
        console.error('View resume details error:', error);
    }
}

function renderResumeDetails(resume) {
    let html = `
        <div class="resume-header-detail">
            <h2>${resume.fullname}</h2>
            <p class="resume-location"><i class="fas fa-map-marker-alt"></i> ${resume.location}</p>
        </div>
        
        <div class="action-buttons">
            <a href="test.html?resume_id=${resume.id}&tests_id=1" class="button-link primary-btn">
                <i class="fas fa-tasks"></i> Start Skills Assessment
            </a>
            <button id="refresh-analysis" class="refresh-btn secondary-btn" data-resume-id="${resume.id}">
                <span class="refresh-icon">↻</span> Refresh Analysis
            </button>
        </div>
        
        <div class="detail-section score-summary-section">
            <h3><i class="fas fa-chart-bar"></i> Score Summary</h3>
            <div class="scores-summary">
    `;
    
    // Add score summaries if available
    if (resume.hard_total) {
        html += `
            <div class="score-card hard-score">
                <div class="score-title">Hard Skills Score</div>
                <div class="score-value">${(resume.hard_total.total).toFixed(0)}%</div>
                <p class="justification">${resume.hard_total.justification}</p>
            </div>
        `;
    }
    
    if (resume.soft_total && resume.soft_total.total !== null) {
        html += `
            <div class="score-card soft-score">
                <div class="score-title">Soft Skills Score</div>
                <div class="score-value">${(resume.soft_total.total).toFixed(0)}%</div>
                <p class="justification">${resume.soft_total.justification}</p>
            </div>
        `;
    } else {
        html += `
            <div class="score-card soft-score pending">
                <div class="score-title">Soft Skills Score</div>
                <div class="analysis-pending">
                    <span class="pending-message">Analysis in progress...</span>
                    <div class="loading-spinner"></div>
                </div>
            </div>
        `;
    }
    
    if (resume.test_total) {
        html += `
            <div class="score-card test-score">
                <div class="score-title">Test Score</div>
                <div class="score-value">${(resume.test_total.total).toFixed(0)}%</div>
                <p class="justification">Based on completed skill assessments</p>
            </div>
        `;
    }
    
    html += `
        </div>
    </div>
    
    <div class="detail-section skills-section">
        <h3><i class="fas fa-brain"></i> Skills Analysis</h3>
        <div class="skills-tabs">
            <button class="tab-btn active" data-tab="hard">CV Analysis</button>
            <button class="tab-btn" data-tab="soft">Social Media Analysis</button>
            <button class="tab-btn" data-tab="test">Survey Analysis</button>
            <button class="tab-btn" data-tab="feedback">Employers Feedback</button>
        </div>
        <div class="skills-container">
    `;
    
    // Group skills by type
    const hardSkills = resume.skills.filter(skill => skill.type === 'HARD');
    const softSkills = resume.skills.filter(skill => skill.type === 'SOFT');
    const testSkills = resume.skills.filter(skill => skill.type === 'TEST');
    const feedbackSkills = resume.skills.filter(skill => skill.type === 'FEEDBACK');
    
    // CV Analysis (Hard Skills)
    html += `
        <div class="skills-tab-content active" id="hard-tab">
            <div class="tab-header">
                <h4>CV Analysis</h4>
                <p class="tab-description">These skills were identified from the candidate's CV and resume</p>
            </div>
    `;
    
    if (hardSkills.length > 0) {
        html += '<div class="skills-grid">';
        hardSkills.forEach(skill => {
            html += `
                <div class="skill-card">
                    <div class="skill-header">
                        <span class="skill-title">${skill.title}</span>
                        <span class="skill-level">${(skill.level).toFixed(0)}%</span>
                    </div>
                    <div class="skill-bar">
                        <div class="skill-progress" style="width: ${skill.level}%;"></div>
                    </div>
                    <div class="skill-justification">${skill.justification}</div>
                </div>
            `;
        });
        html += '</div>';
    } else {
        html += '<p class="no-skills">No hard skills detected in the resume.</p>';
    }
    
    html += '</div>';
    
    // Social Media Analysis (Soft Skills)
    html += `
        <div class="skills-tab-content" id="soft-tab">
            <div class="tab-header">
                <h4>Social Media Analysis</h4>
                <p class="tab-description">These soft skills were identified from the candidate's social media profiles</p>
            </div>
    `;
    
    if (softSkills.length > 0) {
        html += '<div class="skills-grid">';
        softSkills.forEach(skill => {
            html += `
                <div class="skill-card soft">
                    <div class="skill-header">
                        <span class="skill-title">${skill.title}</span>
                        <span class="skill-level">${(skill.level).toFixed(0)}%</span>
                    </div>
                    <div class="skill-bar">
                        <div class="skill-progress" style="width: ${skill.level}%;"></div>
                    </div>
                    <div class="skill-justification">${skill.justification}</div>
                </div>
            `;
        });
        html += '</div>';
    } else if (resume.soft_total && resume.soft_total.total === 0) {
        html += '<p class="no-skills">No soft skills detected in the analysis.</p>';
    } else {
        html += `
            <div class="analysis-pending-full">
                <span class="pending-message">Social media analysis in progress. This may take a few minutes...</span>
                <div class="loading-spinner"></div>
            </div>
        `;
    }
    
    html += '</div>';
    
    // Survey Analysis (Test Skills)
    html += `
        <div class="skills-tab-content" id="test-tab">
            <div class="tab-header">
                <h4>Survey Analysis</h4>
                <p class="tab-description">These skills were identified from the candidate's skill assessment tests</p>
            </div>
    `;
    
    if (testSkills.length > 0) {
        html += '<div class="skills-grid">';
        testSkills.forEach(skill => {
            html += `
                <div class="skill-card test">
                    <div class="skill-header">
                        <span class="skill-title">${skill.title}</span>
                        <span class="skill-level">${(skill.level).toFixed(0)}%</span>
                    </div>
                    <div class="skill-bar">
                        <div class="skill-progress" style="width: ${skill.level}%;"></div>
                    </div>
                    <div class="skill-justification">${skill.justification || 'Based on assessment test results'}</div>
                </div>
            `;
        });
        html += '</div>';
    } else {
        html += `
            <p class="no-skills">No test assessments completed yet.</p>
            <div class="centered-action">
                <a href="test.html?resume_id=${resume.id}&tests_id=1" class="button-link secondary-btn">
                    <i class="fas fa-tasks"></i> Start an Assessment
                </a>
            </div>
        `;
    }
    
    html += '</div>';
    
    // Employers Feedback
    html += `
        <div class="skills-tab-content" id="feedback-tab">
            <div class="tab-header">
                <h4>Employers Feedback</h4>
                <p class="tab-description">Skills and feedback provided by previous employers</p>
            </div>
    `;
    
    if (feedbackSkills.length > 0) {
        html += '<div class="skills-grid">';
        feedbackSkills.forEach(skill => {
            html += `
                <div class="skill-card feedback">
                    <div class="skill-header">
                        <span class="skill-title">${skill.title}</span>
                        <span class="skill-level">${(skill.level).toFixed(0)}%</span>
                    </div>
                    <div class="skill-bar">
                        <div class="skill-progress" style="width: ${skill.level}%;"></div>
                    </div>
                    <div class="skill-justification">${skill.justification || 'Feedback from previous employers'}</div>
                </div>
            `;
        });
        html += '</div>';
    } else {
        html += '<p class="no-skills">No employer feedback available yet.</p>';
    }
    
    html += '</div>'; // Close feedback tab
    html += '</div>'; // Close skills-container
    html += '</div>'; // Close skills-section
    
    // Education section
    html += `
        <div class="detail-section">
            <h3><i class="fas fa-graduation-cap"></i> Education</h3>
            <div class="details-list">
    `;
    
    if (resume.educations && resume.educations.length > 0) {
        resume.educations.forEach(education => {
            html += `
                <div class="detail-card">
                    <div class="detail-title">${education.name}</div>
                    <div class="detail-content">${education.description}</div>
                </div>
            `;
        });
    } else {
        html += '<p class="no-data">No education information available.</p>';
    }
    
    html += `
        </div>
    </div>
    
    <div class="detail-section">
        <h3><i class="fas fa-briefcase"></i> Experience</h3>
        <div class="details-list">
    `;
    
    if (resume.experiences && resume.experiences.length > 0) {
        resume.experiences.forEach(experience => {
            html += `
                <div class="detail-card">
                    <div class="detail-title">${experience.name}</div>
                    <div class="detail-content">${experience.description}</div>
                </div>
            `;
        });
    } else {
        html += '<p class="no-data">No experience information available.</p>';
    }
    
    html += '</div></div>';
    
    elements.resumeDetailContent.innerHTML = html;
    
    // Add event listener for refresh button
    const refreshButton = document.getElementById('refresh-analysis');
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            const resumeId = this.getAttribute('data-resume-id');
            refreshResumeAnalysis(resumeId);
        });
    }
    
    // Add tab switching functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.skills-tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const tabId = `${button.getAttribute('data-tab')}-tab`;
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Function to refresh resume analysis
async function refreshResumeAnalysis(resumeId) {
    try {
        // Show loading state on the button
        const refreshButton = document.getElementById('refresh-analysis');
        if (refreshButton) {
            refreshButton.innerHTML = '<span class="refresh-icon spinning">↻</span> Refreshing...';
            refreshButton.disabled = true;
        }
        
        // Fetch updated resume data
        const response = await fetchWithAuth(API_ENDPOINTS.getResumeById(resumeId), {
            method: 'GET'
        });
        
        if (response.status === 401) {
            showNotification('Your session has expired. Please log in again.', true);
            logoutUser();
            return;
        }
        
        const resume = await response.json();
        
        if (!response.ok) {
            throw new Error(resume.message || 'Failed to refresh resume details');
        }
        
        // Render updated resume details
        renderResumeDetails(resume);
        
        // Show notification if soft skills analysis is complete
        if (resume.soft_total || (resume.skills && resume.skills.some(skill => skill.type === 'SOFT'))) {
            showNotification('Soft skills analysis completed!');
        } else {
            showNotification('Analysis still in progress. Please check back later.');
        }
        
    } catch (error) {
        showNotification(`Error refreshing analysis: ${error.message}`, true);
        console.error('Refresh resume analysis error:', error);
        
        // Reset button state
        const refreshButton = document.getElementById('refresh-analysis');
        if (refreshButton) {
            refreshButton.innerHTML = '<span class="refresh-icon">↻</span> Refresh Analysis';
            refreshButton.disabled = false;
        }
    }
}

async function deleteResume(resumeId) {
    if (!confirm('Are you sure you want to delete this resume?')) {
        return;
    }
    
    try {
        const response = await fetchWithAuth(API_ENDPOINTS.deleteResume(resumeId), {
            method: 'DELETE'
        });
        
        if (response.status === 401) {
            showNotification('Your session has expired. Please log in again.', true);
            logoutUser();
            return;
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to delete resume');
        }
        
        showNotification('Resume deleted successfully!');
        
        // Refresh resumes list
        fetchResumes();
        
    } catch (error) {
        showNotification(`Error deleting resume: ${error.message}`, true);
        console.error('Delete resume error:', error);
    }
}

// Auth functions
async function registerUser(userData) {
    try {
        const response = await fetch(API_ENDPOINTS.register, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        console.log('Register response:', data);
        
        if (!response.ok) {
            throw new Error(data.message || data.detail || 'Registration failed');
        }
        
        // Извлекаем токены из ответа API
        const accessToken = data.access_token;
        const refreshToken = data.refresh_token;
        
        // Сохраняем токены в localStorage
        if (accessToken) {
            setAuthToken(accessToken, refreshToken);
        } else {
            console.warn('No tokens received from registration response');
        }
        
        // Получаем информацию о пользователе
        try {
            const userResponse = await fetchWithAuth(API_ENDPOINTS.me, {
                method: 'GET'
            });
            
            if (userResponse.ok) {
                const userData = await userResponse.json();
                currentUser = userData;
            } else {
                // Если не удалось получить данные пользователя, используем переданные
                currentUser = {
                    email: userData.email,
                    name: userData.name
                };
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            currentUser = {
                email: userData.email,
                name: userData.name
            };
        }
        
        // Save to local storage
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        showNotification('Registration successful!');
        updateUIForLoggedInUser();
        
    } catch (error) {
        showNotification(`Registration error: ${error.message}`, true);
        console.error('Registration error:', error);
    }
}

async function loginUser(email, password) {
    try {
        const response = await fetch(API_ENDPOINTS.login, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        console.log('Login response:', data);
        
        if (!response.ok) {
            throw new Error(data.message || data.detail || 'Login failed');
        }
        
        // Извлекаем токены из ответа API
        const accessToken = data.access_token;
        const refreshToken = data.refresh_token;
        
        // Сохраняем токены в localStorage
        if (accessToken) {
            setAuthToken(accessToken, refreshToken);
        } else {
            console.warn('No tokens received from login response');
        }
        
        // Получаем информацию о пользователе
        try {
            const userResponse = await fetchWithAuth(API_ENDPOINTS.me, {
                method: 'GET'
            });
            
            if (userResponse.ok) {
                const userData = await userResponse.json();
                currentUser = userData;
            } else {
                // Если не удалось получить данные пользователя, используем базовые
                currentUser = { email };
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            currentUser = { email };
        }
        
        // Save to local storage
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        showNotification('Login successful!');
        updateUIForLoggedInUser();
        
    } catch (error) {
        showNotification(`Login error: ${error.message}`, true);
        console.error('Login error:', error);
    }
}

async function logoutUser() {
    try {
        // Try to notify the server
        await fetchWithAuth(API_ENDPOINTS.logout, {
            method: 'POST'
        });
        
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Always clean up local state regardless of server response
        clearAuthTokens();
        localStorage.removeItem('currentUser');
        currentUser = null;
        
        // Reset upload history
        uploadHistory.length = 0;
        
        // Update UI
        updateUIForLoggedOutUser();
        showNotification('Logged out successfully');
    }
}

// File upload function
async function uploadResume(vacancy_id, files) {
    // Store button reference and original text outside the try block
    const uploadBtn = elements.resumeUploadFormElement.querySelector('button[type="submit"]');
    const originalBtnText = uploadBtn.textContent;
    
    try {
        // Show loading indicator
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<span class="loading-spinner"></span> Uploading...';
        
        // Get vacancy title for history
        const selectedVacancy = Array.from(elements.vacancySelector.options)
            .find(option => option.value === vacancy_id);
        
        if (!selectedVacancy) {
            throw new Error('Selected vacancy not found');
        }
        
        const vacancyTitle = selectedVacancy.textContent;
        
        // Prepare the form data with the files
        const formData = new FormData();
        
        // API expects vacancy_id as a query parameter, not in the form data
        const uploadUrl = `${API_ENDPOINTS.uploadPdf}?vacancy_id=${vacancy_id}`;
        
        // Add all files to the FormData
        files.forEach(file => {
            formData.append('files', file);
        });
        
        // Получаем токен из localStorage
        const token = localStorage.getItem('authToken');
        const headers = {};
        
        // Добавляем токен в заголовок если он есть
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: headers,
            body: formData
        });
        
        // Handle unauthorized
        if (response.status === 401) {
            // Попытка обновить токен
            const refreshSuccess = await refreshAccessToken();
            if (refreshSuccess) {
                // Повторить запрос
                return uploadResume(vacancy_id, files);
            } else {
                showNotification('Your session has expired. Please log in again.', true);
                logoutUser();
                return;
            }
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || data.detail || 'Failed to upload resume');
        }
        
        // Show success message
        showNotification('Resume uploaded successfully!');
        
        // Add to upload history
        if (files.length === 1) {
            // Single file upload
            addToUploadHistory(vacancy_id, vacancyTitle, files[0].name, new Date().toISOString());
        } else {
            // Multiple files upload
            addToUploadHistory(vacancy_id, vacancyTitle, null, new Date().toISOString(), true, files.length);
        }
        
        // Reset form
        elements.resumeUploadFormElement.reset();
        
    } catch (error) {
        showNotification(`Error uploading resume: ${error.message}`, true);
        console.error('Upload error:', error);
    } finally {
        // Restore button state
        uploadBtn.disabled = false;
        uploadBtn.textContent = originalBtnText;
        
        // Hide status indicator
        const statusDiv = document.getElementById('upload-status');
        if (statusDiv) {
            statusDiv.style.display = 'none';
        }
    }
}

// Функция для обновления access token с использованием refresh token
async function refreshAccessToken() {
    try {
        console.log('Attempting to refresh token');
        
        // Получаем refresh token из localStorage
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            console.log('No refresh token found in localStorage');
            return false;
        }
        
        // Отправляем запрос с refresh token в заголовке
        const response = await fetch(API_ENDPOINTS.refresh, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${refreshToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.log('Refresh token request failed with status:', response.status);
            return false;
        }
        
        const data = await response.json();
        console.log('Refresh response:', data);
        
        // Получаем новый access token из ответа
        const newAccessToken = data.access_token;
        
        if (newAccessToken) {
            // Сохраняем новый токен
            localStorage.setItem('authToken', newAccessToken);
            console.log('New access token saved to localStorage');
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error refreshing token:', error);
        return false;
    }
}

// New function to load vacancies for the dropdown
async function loadVacanciesForDropdown() {
    try {
        // Сохраняем первую опцию (placeholder)
        const defaultOption = elements.vacancySelector.options[0];
        
        // Полностью очищаем селектор
        elements.vacancySelector.innerHTML = '';
        
        // Возвращаем первую опцию обратно
        if (defaultOption) {
            elements.vacancySelector.appendChild(defaultOption);
        }
        
        const response = await fetchWithAuth(API_ENDPOINTS.getVacancies, {
            method: 'GET',
            headers: {
                "Content-Type": "application/json"
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch vacancies');
        }
        
        const vacancies = await response.json();
        
        if (vacancies && vacancies.length > 0) {
            // Add options to the dropdown
            vacancies.forEach(vacancy => {
                const option = document.createElement('option');
                option.value = vacancy.id;
                option.textContent = vacancy.title;
                option.setAttribute('data-location', vacancy.location);
                elements.vacancySelector.appendChild(option);
            });
        } else {
            // Add a disabled option if no vacancies
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "No vacancies available";
            option.disabled = true;
            elements.vacancySelector.appendChild(option);
        }
    } catch (error) {
        console.error('Error loading vacancies for dropdown:', error);
        showNotification('Failed to load vacancies. Please try again later.', true);
        
        // Add a disabled option indicating the error
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "Error loading vacancies";
        option.disabled = true;
        elements.vacancySelector.appendChild(option);
    }
}

// Function to load vacancies for the filter dropdown
async function loadVacanciesForFilterDropdown() {
    const vacancySelector = document.getElementById('resume-vacancy-selector');
    if (!vacancySelector) return;
    
    try {
        // Сохраняем первую опцию "All Resumes"
        const defaultOption = vacancySelector.options[0];
        
        // Полностью очищаем селектор
        vacancySelector.innerHTML = '';
        
        // Возвращаем первую опцию обратно
        if (defaultOption) {
            vacancySelector.appendChild(defaultOption);
        }
        
        const response = await fetchWithAuth(API_ENDPOINTS.getVacancies, {
            method: 'GET',
            headers: { "Content-Type": "application/json" }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch vacancies');
        }
        
        const vacancies = await response.json();
        
        if (vacancies && vacancies.length > 0) {
            // Add options to the dropdown
            vacancies.forEach(vacancy => {
                const option = document.createElement('option');
                option.value = vacancy.id;
                option.textContent = vacancy.title;
                vacancySelector.appendChild(option);
            });
        } else {
            // Добавляем опцию, если нет вакансий
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "No vacancies available";
            option.disabled = true;
            vacancySelector.appendChild(option);
        }
    } catch (error) {
        console.error('Error loading vacancies for filter dropdown:', error);
        // Добавляем опцию с сообщением об ошибке
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "Error loading vacancies";
        option.disabled = true;
        vacancySelector.appendChild(option);
    }
}

// Event Listeners
function attachEventListeners() {
    // Auth section toggle
    elements.showLoginBtn.addEventListener('click', () => {
        elements.loginForm.style.display = 'block';
        elements.registerForm.style.display = 'none';
        elements.showLoginBtn.classList.add('active');
        elements.showRegisterBtn.classList.remove('active');
    });
    
    elements.showRegisterBtn.addEventListener('click', () => {
        elements.loginForm.style.display = 'none';
        elements.registerForm.style.display = 'block';
        elements.showLoginBtn.classList.remove('active');
        elements.showRegisterBtn.classList.add('active');
    });
    
    // Navigation
    elements.showResumeBtn.addEventListener('click', showResumeSection);
    elements.showVacancyBtn.addEventListener('click', showVacancySection);
    elements.showMyResumesBtn.addEventListener('click', showMyResumesSection);
    
    // Tabs in vacancy section
    elements.showCreateVacancyBtn.addEventListener('click', showCreateVacancyTab);
    elements.showViewVacanciesBtn.addEventListener('click', showViewVacanciesTab);
    
    // Auth forms
    elements.loginFormElement.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = elements.loginEmail.value;
        const password = elements.loginPassword.value;
        
        if (email && password) {
            loginUser(email, password);
        } else {
            showNotification('Please fill in all fields', true);
        }
    });
    
    elements.registerFormElement.addEventListener('submit', (e) => {
        e.preventDefault();
        const userData = {
            name: elements.registerName.value.trim(),
            about: elements.registerAbout.value.trim(),
            address: elements.registerAddress.value.trim(),
            email: elements.registerEmail.value.trim(),
            phone: elements.registerPhone.value.trim(),
            inn: elements.registerInn.value.trim(),
            logo: elements.registerLogo.value.trim(), // Assuming this is a URL
            password: elements.registerPassword.value
        };
        
        // Check if all required fields are filled
        if (userData.name && userData.email && userData.password) {
            registerUser(userData);
        } else {
            showNotification('Please fill in all required fields', true);
        }
    });
    
    // Resume upload form
    // Add status indicator to the form
    if (!document.getElementById('upload-status')) {
        const statusDiv = document.createElement('div');
        statusDiv.id = 'upload-status';
        statusDiv.className = 'upload-status';
        statusDiv.style.display = 'none';
        elements.resumeUploadFormElement.appendChild(statusDiv);
    }
    
    elements.resumeUploadFormElement.addEventListener('submit', (e) => {
        e.preventDefault();
        const vacancyId = elements.vacancySelector.value;
        const files = elements.resumeFile.files;
        
        if (vacancyId && files.length > 0) {
            // Check if all files are PDFs
            const allPdfs = Array.from(files).every(file => file.type === 'application/pdf');
            
            if (!allPdfs) {
                showNotification('Please select only PDF files', true);
                return;
            }
            
            // Show status indicator
            const statusDiv = document.getElementById('upload-status');
            statusDiv.innerHTML = `
                <div class="status-indicator">
                    <div class="loading-spinner"></div>
                    <span>Uploading ${files.length} file${files.length > 1 ? 's' : ''}... Please wait.</span>
                </div>
            `;
            statusDiv.style.display = 'block';
            
            uploadResume(vacancyId, Array.from(files));
        } else {
            if (!vacancyId) {
                showNotification('Please select a vacancy', true);
            } else {
                showNotification('Please select at least one PDF file', true);
            }
        }
    });
    
    elements.vacancyCreateFormElement.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Parse skills from comma-separated string to array of objects
        const skillsInput = elements.vacancySkills.value.trim();
        const skillsArray = skillsInput.split(',')
            .map(skill => skill.trim())
            .filter(skill => skill !== '')
            .map(skill => ({ title: skill }));
        
        const vacancyData = {
            title: elements.vacancyTitle.value.trim(),
            location: elements.vacancyLocation.value.trim(),
            description: elements.vacancyDescription.value.trim(),
            requirements: elements.vacancyRequirements.value.trim(),
            salary: elements.vacancySalary.value.trim(),
            skills: skillsArray,
            resumes: []
        };
        
        // Check if all required fields are filled
        if (vacancyData.title && vacancyData.location && vacancyData.description && 
            vacancyData.requirements && vacancyData.salary && skillsArray.length > 0) {
            createVacancy(vacancyData);
        } else {
            showNotification('Please fill in all fields', true);
        }
    });
    
    // Logout
    elements.logoutBtn.addEventListener('click', logoutUser);
    
    // Modal events
    elements.closeModalBtn.addEventListener('click', () => {
        elements.resumeDetailModal.style.display = 'none';
    });
    
    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === elements.resumeDetailModal) {
            elements.resumeDetailModal.style.display = 'none';
        }
    });
    
    // Add vacancy selector change event
    elements.vacancySelector.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        if (selectedOption && selectedOption.value) {
            elements.vacancyId.value = selectedOption.value;
        } else {
            elements.vacancyId.value = '';
        }
    });
}

// Initialize the application
function init() {
    checkAuthStatus();
    attachEventListeners();
}

// Start the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);

async function deleteVacancy(vacancyId) {
    if (!confirm('Are you sure you want to delete this vacancy? This will also delete all associated resumes.')) {
        return;
    }
    
    try {
        const response = await fetchWithAuth(API_ENDPOINTS.deleteVacancy(vacancyId), {
            method: 'DELETE'
        });
        
        if (response.status === 401) {
            showNotification('Your session has expired. Please log in again.', true);
            logoutUser();
            return;
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to delete vacancy');
        }
        
        showNotification('Vacancy deleted successfully!');
        
        // Refresh vacancies list
        fetchVacancies();
        
        // Also refresh the vacancy selectors
        loadVacanciesForDropdown();
        loadVacanciesForFilterDropdown();
        
    } catch (error) {
        showNotification(`Error deleting vacancy: ${error.message}`, true);
        console.error('Delete vacancy error:', error);
    }
}

// Load vacancies for the dropdown selector
async function loadVacancies() {
    try {
        // Get token from localStorage
        const token = localStorage.getItem('authToken');
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Add auth token if present
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Сохраняем первую опцию (placeholder), если она есть
        let defaultOption = null;
        if (elements.vacancySelector.options.length > 0) {
            defaultOption = elements.vacancySelector.options[0];
        }
        
        // Полностью очищаем селектор
        elements.vacancySelector.innerHTML = '';
        
        // Возвращаем первую опцию обратно, если она была
        if (defaultOption) {
            elements.vacancySelector.appendChild(defaultOption);
        }
        
        const response = await fetch(API_ENDPOINTS.getVacancies, {
            method: 'GET',
            headers: headers
        });
        
        // Handle unauthorized
        if (response.status === 401) {
            // Try to refresh token
            const refreshSuccess = await refreshAccessToken();
            if (refreshSuccess) {
                // Retry the request if refresh successful
                return loadVacancies();
            } else {
                showNotification('Your session has expired. Please log in again.', true);
                logoutUser();
                return;
            }
        }
        
        if (!response.ok) {
            throw new Error('Failed to load vacancies');
        }
        
        const vacancies = await response.json();
        
        // Add vacancies to the selector
        if (vacancies && vacancies.length > 0) {
            vacancies.forEach(vacancy => {
                const option = document.createElement('option');
                option.value = vacancy.id;
                option.textContent = vacancy.title;
                elements.vacancySelector.appendChild(option);
            });
        } else {
            // Добавляем опцию, если нет вакансий
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "No vacancies available";
            option.disabled = true;
            elements.vacancySelector.appendChild(option);
        }
        
    } catch (error) {
        console.error('Error loading vacancies:', error);
        showNotification('Failed to load vacancies. Please try again later.', true);
        
        // Добавляем опцию с сообщением об ошибке
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "Error loading vacancies";
        option.disabled = true;
        elements.vacancySelector.appendChild(option);
    }
} 