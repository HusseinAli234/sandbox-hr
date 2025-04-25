// API endpoints
const API_BASE_URL = 'https://sandbox-backend-390134393019.us-central1.run.app';
const API_ENDPOINTS = {
    getTest: (id) => `${API_BASE_URL}/test/${id}`,
    submitResult: `${API_BASE_URL}/result`
};

// DOM Elements
const elements = {
    // Test sections
    testTitle: document.getElementById('test-title'),
    testDescription: document.getElementById('test-description'),
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
        
        // Проверяем наличие и отображаем описание теста
        if (test.proffesion) {
            const testDescription = document.createElement('div');
            testDescription.className = 'test-section-description';
            testDescription.textContent = test.proffesion;
            testSection.appendChild(testDescription);
        }
        
        // Проверяем, является ли тест с опциями Yes/No
        const isOptionalTest = test.is_Optional === true;
        
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
                
                // Если это опциональный тест с ответами Yes/No
                if (isOptionalTest) {
                    // Определяем баллы за ответы
                    const yesValue = question.mark > 0 ? question.mark : 0;
                    const noValue = question.mark < 0 ? 1 : 0;
                    
                    // Создаем контейнер для радио-кнопок
                    const radioGroup = document.createElement('div');
                    radioGroup.className = 'yes-no-options';
                    
                    // Создаем радио-кнопку "Yes"
                    const yesContainer = document.createElement('div');
                    yesContainer.className = 'option';
                    
                    const yesRadio = document.createElement('input');
                    yesRadio.type = 'radio';
                    yesRadio.name = `question-${testIndex}-${questionIndex}`;
                    yesRadio.id = `question-${testIndex}-${questionIndex}-yes`;
                    yesRadio.value = yesValue;
                    yesRadio.setAttribute('data-test-index', testIndex);
                    yesRadio.setAttribute('data-question-index', questionIndex);
                    
                    const yesLabel = document.createElement('label');
                    yesLabel.htmlFor = `question-${testIndex}-${questionIndex}-yes`;
                    yesLabel.textContent = 'Yes';
                    
                    yesContainer.appendChild(yesRadio);
                    yesContainer.appendChild(yesLabel);
                    
                    // Создаем радио-кнопку "No"
                    const noContainer = document.createElement('div');
                    noContainer.className = 'option';
                    
                    const noRadio = document.createElement('input');
                    noRadio.type = 'radio';
                    noRadio.name = `question-${testIndex}-${questionIndex}`;
                    noRadio.id = `question-${testIndex}-${questionIndex}-no`;
                    noRadio.value = noValue;
                    noRadio.setAttribute('data-test-index', testIndex);
                    noRadio.setAttribute('data-question-index', questionIndex);
                    
                    const noLabel = document.createElement('label');
                    noLabel.htmlFor = `question-${testIndex}-${questionIndex}-no`;
                    noLabel.textContent = 'No';
                    
                    noContainer.appendChild(noRadio);
                    noContainer.appendChild(noLabel);
                    
                    // Добавляем подсказку о баллах
                    const scoreHint = document.createElement('div');
                    scoreHint.className = 'score-hint';
                    if (question.mark > 0) {
                        scoreHint.textContent = `("Yes" = ${yesValue} point${yesValue !== 1 ? 's' : ''}, "No" = 0 points)`;
                    } else {
                        scoreHint.textContent = `("Yes" = 0 points, "No" = ${noValue} point${noValue !== 1 ? 's' : ''})`;
                    }
                    
                    radioGroup.appendChild(yesContainer);
                    radioGroup.appendChild(noContainer);
                    
                    answerContainer.appendChild(radioGroup);
                    answerContainer.appendChild(scoreHint);
                }
                // Для обычных тестов используем слайдеры
                else {
                    const minValue = document.createElement('span');
                    minValue.textContent = '0';
                    minValue.className = 'slider-min';
                    
                    const slider = document.createElement('input');
                    slider.type = 'range';
                    slider.min = '0';
                    slider.max = question.mark > 0 ? question.mark : 1; // Защита от отрицательных значений
                    slider.value = '0';
                    slider.className = 'answer-slider';
                    slider.setAttribute('data-test-index', testIndex);
                    slider.setAttribute('data-question-index', questionIndex);
                    slider.id = `question-${testIndex}-${questionIndex}`;
                    
                    const maxValue = document.createElement('span');
                    maxValue.textContent = question.mark > 0 ? question.mark : 1;
                    maxValue.className = 'slider-max';
                    
                    const valueDisplay = document.createElement('div');
                    valueDisplay.className = 'answer-value';
                    valueDisplay.textContent = '0';
                    
                    // Update value display when slider changes
                    slider.addEventListener('input', function() {
                        valueDisplay.textContent = this.value;
                    });
                    
                    const sliderContainer = document.createElement('div');
                    sliderContainer.className = 'slider-container';
                    
                    sliderContainer.appendChild(minValue);
                    sliderContainer.appendChild(slider);
                    sliderContainer.appendChild(maxValue);
                    
                    answerContainer.appendChild(sliderContainer);
                    answerContainer.appendChild(valueDisplay);
                }
                
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
        let maximumScore = 0;
        const isOptionalTest = test.is_Optional === true;
        
        // Sum all question scores for this test
        test.questions.forEach((question, questionIndex) => {
            // Рассчитываем максимальный возможный балл
            if (isOptionalTest) {
                // Для опциональных тестов максимум равен сумме положительных баллов
                if (question.mark > 0) {
                    maximumScore += question.mark;
                } else {
                    maximumScore += 1; // Если оценка отрицательная, считаем что max = 1
                }
            } else {
                // Для обычных тестов максимум равен сумме всех mark
                maximumScore += (question.mark > 0 ? question.mark : 1);
            }
            
            if (isOptionalTest) {
                // Для опциональных тестов получаем выбранную радио-кнопку
                const radioName = `question-${testIndex}-${questionIndex}`;
                const selectedRadio = document.querySelector(`input[name="${radioName}"]:checked`);
                
                if (selectedRadio) {
                    totalScore += parseInt(selectedRadio.value, 10);
                }
            } else {
                // Для обычных тестов получаем значение слайдера
                const sliderId = `question-${testIndex}-${questionIndex}`;
                const slider = document.getElementById(sliderId);
                
                if (slider) {
                    totalScore += parseInt(slider.value, 10);
                }
            }
        });
        
        // Add test result with additional fields
        results.push({
            title: test.title,
            result: totalScore,
            is_Optional: isOptionalTest,
            maximum: maximumScore
        });
    });
    
    // Check if all questions are answered
    let allQuestionsAnswered = true;
    let unansweredSections = [];
    
    tests.forEach((test, testIndex) => {
        const isOptionalTest = test.is_Optional === true;
        let sectionComplete = true;
        
        test.questions.forEach((question, questionIndex) => {
            if (isOptionalTest) {
                // Проверяем радио-кнопки
                const radioName = `question-${testIndex}-${questionIndex}`;
                const selectedRadio = document.querySelector(`input[name="${radioName}"]:checked`);
                
                if (!selectedRadio) {
                    sectionComplete = false;
                }
            } else {
                // Проверяем слайдеры (опционально - если хотим проверить, что значение не 0)
                const sliderId = `question-${testIndex}-${questionIndex}`;
                const slider = document.getElementById(sliderId);
                
                // Раскомментируйте следующие строки, если хотите требовать ненулевые ответы
                // if (slider && parseInt(slider.value, 10) === 0) {
                //     sectionComplete = false;
                // }
            }
        });
        
        if (!sectionComplete) {
            allQuestionsAnswered = false;
            unansweredSections.push(test.title);
        }
    });
    
    // Если есть неотвеченные вопросы, предупреждаем пользователя
    if (!allQuestionsAnswered) {
        const confirm = window.confirm(`Some questions in ${unansweredSections.join(', ')} have not been answered. Do you want to submit anyway?`);
        if (!confirm) {
            return;
        }
    }
    
    // Disable submit button
    elements.submitTestButton.disabled = true;
    elements.submitTestButton.textContent = 'Submitting...';
    
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
        
        // Re-enable submit button
        elements.submitTestButton.disabled = false;
        elements.submitTestButton.textContent = 'Submit Answers';
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
        resultScore.textContent = `${result.result}/${result.maximum}`;
        
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