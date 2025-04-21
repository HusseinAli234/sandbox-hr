// API endpoints
const API_BASE_URL = 'https://api.sand-box.pp.ua';
const API_ENDPOINTS = {
    getTest: (id) => `${API_BASE_URL}/test/${id}`,
    getResume: (id) => `${API_BASE_URL}/resumes/${id}`,
    submitResult: `${API_BASE_URL}/result`
};

// DOM Elements
const elements = {
    // Test sections
    testTitle: document.getElementById('test-title'),
    testDescription: document.getElementById('test-description'),
    resumeName: document.getElementById('resume-name'),
    loadingIndicator: document.getElementById('loading-indicator'),
    testContent: document.getElementById('test-content'),
    testForm: document.getElementById('test-form'),
    submitTestButton: document.getElementById('submit-test'),
    testResults: document.getElementById('test-results'),
    resultsContent: document.getElementById('results-content'),
    
    // Notification
    notification: document.getElementById('notification')
};

// State management
let resumeId = null;
let testIds = [];
let tests = [];
let resumeData = null;
let testResults = [];

// Parse URL parameters
function parseUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    resumeId = urlParams.get('resume_id');
    
    const testsParam = urlParams.get('tests_id');
    if (testsParam) {
        testIds = testsParam.split(',').map(id => id.trim());
    }
    
    // Validate required parameters
    if (!resumeId || testIds.length === 0) {
        showError('Missing required parameters. Please check the URL and try again.');
        return false;
    }
    
    return true;
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

// Display error and disable test
function showError(message) {
    elements.loadingIndicator.textContent = `Error: ${message}`;
    elements.loadingIndicator.style.color = '#e74c3c';
    showNotification(message, true);
}

// Fetch resume data
async function fetchResumeData() {
    try {
        const response = await fetch(API_ENDPOINTS.getResume(resumeId), {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch resume information');
        }
        
        resumeData = await response.json();
        
        // Update UI with resume info
        elements.resumeName.textContent = resumeData.fullname;
        
    } catch (error) {
        console.error('Error fetching resume:', error);
        showError('Could not load resume information. Please try again later.');
        return false;
    }
    
    return true;
}

// Fetch test data
async function fetchTests() {
    const testPromises = testIds.map(async (testId) => {
        try {
            const response = await fetch(API_ENDPOINTS.getTest(testId), {
                method: 'GET',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch test ${testId}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error(`Error fetching test ${testId}:`, error);
            showNotification(`Failed to load test ${testId}`, true);
            return null;
        }
    });
    
    // Wait for all tests to be fetched
    const results = await Promise.all(testPromises);
    
    // Filter out failed test fetches
    tests = results.filter(test => test !== null);
    
    if (tests.length === 0) {
        showError('Could not load any tests. Please try again later.');
        return false;
    }
    
    return true;
}

// Render tests in the form
function renderTests() {
    // Update test title if we have only one test
    if (tests.length === 1) {
        elements.testTitle.textContent = tests[0].title;
        elements.testDescription.textContent = tests[0].proffesion || '';
    } else {
        elements.testTitle.textContent = 'Skills Assessment Tests';
        elements.testDescription.textContent = `${tests.length} tests to complete`;
    }
    
    // Clear existing content
    elements.testForm.innerHTML = '';
    
    // Create test sections
    tests.forEach((test, testIndex) => {
        const testSection = document.createElement('div');
        testSection.className = 'test-section';
        testSection.setAttribute('data-test-id', test.id);
        
        const testHeader = document.createElement('h3');
        testHeader.textContent = test.title;
        testSection.appendChild(testHeader);
        
        if (test.proffesion) {
            const testDescription = document.createElement('div');
            testDescription.className = 'test-section-description';
            testDescription.textContent = test.proffesion;
            testSection.appendChild(testDescription);
        }
        
        // Create questions
        if (test.questions && test.questions.length > 0) {
            test.questions.forEach((question, questionIndex) => {
                const questionItem = document.createElement('div');
                questionItem.className = 'question-item';
                
                const questionText = document.createElement('div');
                questionText.className = 'question-text';
                questionText.textContent = `${questionIndex + 1}. ${question.question}`;
                
                const answerContainer = document.createElement('div');
                answerContainer.className = 'answer-container';
                
                const minValue = document.createElement('span');
                minValue.textContent = '0';
                
                const slider = document.createElement('input');
                slider.type = 'range';
                slider.min = '0';
                slider.max = question.mark;
                slider.value = '0';
                slider.className = 'answer-slider';
                slider.setAttribute('data-test-index', testIndex);
                slider.setAttribute('data-question-index', questionIndex);
                slider.id = `question-${testIndex}-${questionIndex}`;
                
                const maxValue = document.createElement('span');
                maxValue.textContent = question.mark;
                
                const valueDisplay = document.createElement('div');
                valueDisplay.className = 'answer-value';
                valueDisplay.textContent = '0';
                
                // Update value display when slider changes
                slider.addEventListener('input', function() {
                    valueDisplay.textContent = this.value;
                });
                
                answerContainer.appendChild(minValue);
                answerContainer.appendChild(slider);
                answerContainer.appendChild(maxValue);
                answerContainer.appendChild(valueDisplay);
                
                questionItem.appendChild(questionText);
                questionItem.appendChild(answerContainer);
                
                testSection.appendChild(questionItem);
            });
        } else {
            // No questions case
            const noQuestions = document.createElement('p');
            noQuestions.textContent = 'This test contains no questions.';
            testSection.appendChild(noQuestions);
        }
        
        elements.testForm.appendChild(testSection);
    });
    
    // Hide loading indicator and show content
    elements.loadingIndicator.style.display = 'none';
    elements.testContent.style.display = 'block';
}

// Collect and submit test results
async function submitTestResults() {
    // Collect all test results
    const results = [];
    
    tests.forEach((test, testIndex) => {
        let totalScore = 0;
        
        // Sum all question scores for this test
        test.questions.forEach((question, questionIndex) => {
            const sliderId = `question-${testIndex}-${questionIndex}`;
            const slider = document.getElementById(sliderId);
            
            if (slider) {
                totalScore += parseInt(slider.value, 10);
            }
        });
        
        // Add test result
        results.push({
            title: test.title,
            result: totalScore
        });
    });
    
    // Prepare submission payload
    const payload = {
        resume_id: parseInt(resumeId, 10),
        sub_tests: results
    };
    
    try {
        const response = await fetch(API_ENDPOINTS.submitResult, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to submit test results');
        }
        
        // Save results for display
        testResults = results;
        
        // Show success notification
        showNotification('Test results submitted successfully!');
        
        // Show results
        displayResults();
        
    } catch (error) {
        console.error('Error submitting results:', error);
        showNotification(`Error submitting results: ${error.message}`, true);
    }
}

// Display test results
function displayResults() {
    // Hide test form and show results
    elements.testContent.style.display = 'none';
    elements.testResults.style.display = 'block';
    
    // Create result items
    elements.resultsContent.innerHTML = '';
    
    testResults.forEach(result => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        const resultTitle = document.createElement('div');
        resultTitle.className = 'result-title';
        resultTitle.textContent = result.title;
        
        const resultScore = document.createElement('div');
        resultScore.className = 'result-score';
        resultScore.textContent = result.result;
        
        resultItem.appendChild(resultTitle);
        resultItem.appendChild(resultScore);
        
        elements.resultsContent.appendChild(resultItem);
    });
}

// Main initialization function
async function init() {
    // Parse URL parameters
    if (!parseUrlParams()) {
        return;
    }
    
    // Fetch resume data
    const resumeSuccess = await fetchResumeData();
    if (!resumeSuccess) {
        return;
    }
    
    // Fetch test data
    const testsSuccess = await fetchTests();
    if (!testsSuccess) {
        return;
    }
    
    // Render tests
    renderTests();
    
    // Add submit event listener
    elements.submitTestButton.addEventListener('click', submitTestResults);
}

// Initialize the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', init); 