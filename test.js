// API endpoints
const API_BASE_URL = 'https://api.sand-box.pp.ua';
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

// --- Пошаговый режим теста ---
let currentTestIndex = 0;
let currentQuestionIndex = 0;
let userAnswers = {}; // { 'testIndex-questionIndex': value }
let resumeName = '';
let testResultsToSend = [];

// Parse URL parameters
function parseUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    resumeId = urlParams.get('resume_id');
    resumeName = urlParams.get('resume_name') ? decodeURIComponent(urlParams.get('resume_name')) : '';
    const testsParam = urlParams.get('tests_id');
    if (testsParam) {
        testIds = testsParam.split(',').map(id => id.trim());
    }
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
function renderCurrentQuestion() {
    const test = tests[currentTestIndex];
    const testIndex = currentTestIndex;
    const questionIndex = currentQuestionIndex;
    const isOptionalTest = test.is_Optional === true;
    const hasImageOptions = isOptionalTest && test.questions.every(q => q.source);

    // Заголовки
    if (isOptionalTest && resumeName) {
        elements.testTitle.textContent = `Пройдите опрос, связанный с вашим бывшим работником ${resumeName}`;
    } else {
        elements.testTitle.textContent = test.title;
    }
    elements.testDescription.textContent = test.proffesion || '';
    elements.testForm.innerHTML = '';

    // Если это опрос с картинками (выбор одного варианта)
    if (hasImageOptions) {
        const info = document.createElement('div');
        info.style.marginBottom = '1rem';
        info.style.fontWeight = '500';
        info.textContent = 'Выберите подходящий вариант:';
        elements.testForm.appendChild(info);

        const optionsWrap = document.createElement('div');
        optionsWrap.style.display = 'flex';
        optionsWrap.style.flexWrap = 'wrap';
        optionsWrap.style.gap = '24px';
        optionsWrap.style.justifyContent = 'center';
        test.questions.forEach((question, qIdx) => {
            const optionCard = document.createElement('div');
            optionCard.style.border = '2px solid #e5e7eb';
            optionCard.style.borderRadius = '10px';
            optionCard.style.padding = '12px';
            optionCard.style.cursor = 'pointer';
            optionCard.style.textAlign = 'center';
            optionCard.style.width = '180px';
            optionCard.style.transition = 'border 0.2s, box-shadow 0.2s';
            optionCard.className = 'image-option-card';
            if (userAnswers[`imgopt-${testIndex}`] == qIdx) {
                optionCard.style.border = '2.5px solid #4a6cf7';
                optionCard.style.boxShadow = '0 0 0 2px #c7d2fe';
            }
            const img = document.createElement('img');
            img.src = question.source;
            img.alt = question.question;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '120px';
            img.style.borderRadius = '8px';
            img.style.marginBottom = '10px';
            const label = document.createElement('div');
            label.textContent = question.question;
            label.style.marginTop = '8px';
            label.style.fontWeight = '500';
            label.style.fontSize = '1rem';
            optionCard.appendChild(img);
            optionCard.appendChild(label);
            optionCard.onclick = () => {
                userAnswers[`imgopt-${testIndex}`] = qIdx;
                renderCurrentQuestion();
            };
            optionsWrap.appendChild(optionCard);
        });
        elements.testForm.appendChild(optionsWrap);
        // Кнопки управления
        const controls = document.createElement('div');
        controls.className = 'test-controls';
        // Управляем только стилем и текстом кнопки, не добавляем её в DOM
        elements.submitTestButton.style.display = 'inline-block';
        elements.submitTestButton.textContent = (currentTestIndex === tests.length - 1) ? 'Завершить' : 'Далее';
        elements.submitTestButton.disabled = (userAnswers[`imgopt-${testIndex}`] === undefined);
        elements.testForm.appendChild(controls);
        elements.loadingIndicator.style.display = 'none';
        elements.testContent.style.display = 'block';
        return;
    }
    // --- Обычный пошаговый режим ---
    const question = test.questions[questionIndex];
    // Прогресс
    const progress = document.createElement('div');
    progress.style.marginBottom = '1rem';
    progress.style.fontWeight = '500';
    progress.textContent = `Вопрос ${questionIndex + 1} из ${test.questions.length}`;
    elements.testForm.appendChild(progress);
    // Вопрос
    const questionItem = document.createElement('div');
    questionItem.className = 'question-item';
    const questionText = document.createElement('div');
    questionText.className = 'question-text';
    questionText.textContent = question.question;
    questionItem.appendChild(questionText);
    const answerContainer = document.createElement('div');
    answerContainer.className = 'answer-container';
    if (isOptionalTest) {
        const radioName = `question-${testIndex}-${questionIndex}`;
        const yesValue = question.mark > 0 ? question.mark : 0;
        const noValue = question.mark < 0 ? 1 : 0;
        const radioGroup = document.createElement('div');
        radioGroup.className = 'yes-no-options';
        // Yes
        const yesContainer = document.createElement('div');
        yesContainer.className = 'option';
        const yesRadio = document.createElement('input');
        yesRadio.type = 'radio';
        yesRadio.name = radioName;
        yesRadio.value = yesValue;
        yesRadio.id = `${radioName}-yes`;
        if (userAnswers[radioName] == yesValue) yesRadio.checked = true;
        const yesLabel = document.createElement('label');
        yesLabel.htmlFor = `${radioName}-yes`;
        yesLabel.textContent = 'Yes';
        yesContainer.appendChild(yesRadio);
        yesContainer.appendChild(yesLabel);
        // No
        const noContainer = document.createElement('div');
        noContainer.className = 'option';
        const noRadio = document.createElement('input');
        noRadio.type = 'radio';
        noRadio.name = radioName;
        noRadio.value = noValue;
        noRadio.id = `${radioName}-no`;
        if (userAnswers[radioName] == noValue) noRadio.checked = true;
        const noLabel = document.createElement('label');
        noLabel.htmlFor = `${radioName}-no`;
        noLabel.textContent = 'No';
        noContainer.appendChild(noRadio);
        noContainer.appendChild(noLabel);
        radioGroup.appendChild(yesContainer);
        radioGroup.appendChild(noContainer);
        answerContainer.appendChild(radioGroup);
    } else {
        // Слайдер
        const sliderId = `question-${testIndex}-${questionIndex}`;
        const minValue = document.createElement('span');
        minValue.textContent = '0';
        minValue.className = 'slider-min';
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = question.mark > 0 ? question.mark : 1;
        slider.value = userAnswers[sliderId] !== undefined ? userAnswers[sliderId] : '0';
        slider.className = 'answer-slider';
        slider.id = sliderId;
        const maxValue = document.createElement('span');
        maxValue.textContent = question.mark > 0 ? question.mark : 1;
        maxValue.className = 'slider-max';
        const valueDisplay = document.createElement('div');
        valueDisplay.className = 'answer-value';
        valueDisplay.textContent = slider.value;
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
    questionItem.appendChild(answerContainer);
    elements.testForm.appendChild(questionItem);
    // Кнопки управления
    const controls = document.createElement('div');
    controls.className = 'test-controls';
    // Назад
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.textContent = 'Назад';
    prevBtn.className = 'test-nav-btn';
    prevBtn.disabled = (questionIndex === 0);
    prevBtn.onclick = () => {
        saveCurrentAnswer();
        if (questionIndex > 0) {
            currentQuestionIndex--;
            renderCurrentQuestion();
        }
    };
    controls.appendChild(prevBtn);
    // Далее или Завершить
    if (questionIndex < test.questions.length - 1) {
        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.textContent = 'Далее';
        nextBtn.className = 'test-nav-btn';
        nextBtn.onclick = () => {
            saveCurrentAnswer();
            if (questionIndex < test.questions.length - 1) {
                currentQuestionIndex++;
                renderCurrentQuestion();
            }
        };
        controls.appendChild(nextBtn);
        elements.submitTestButton.style.display = 'none';
    } else {
        // Последний вопрос — показать submit
        elements.submitTestButton.style.display = 'inline-block';
        elements.submitTestButton.textContent = (currentTestIndex === tests.length - 1) ? 'Завершить' : 'Далее';
        elements.submitTestButton.disabled = false;
    }
    elements.testForm.appendChild(controls);
    elements.loadingIndicator.style.display = 'none';
    elements.testContent.style.display = 'block';
}

function saveCurrentAnswer() {
    const testIndex = currentTestIndex;
    const questionIndex = currentQuestionIndex;
    const test = tests[testIndex];
    const isOptionalTest = test.is_Optional === true;
    const hasImageOptions = isOptionalTest && test.questions.every(q => q.source);
    if (hasImageOptions) {
        // already saved on click
        return;
    }
    const question = test.questions[questionIndex];
    if (isOptionalTest) {
        const radioName = `question-${testIndex}-${questionIndex}`;
        const selectedRadio = document.querySelector(`input[name="${radioName}"]:checked`);
        if (selectedRadio) {
            userAnswers[radioName] = selectedRadio.value;
        }
    } else {
        const sliderId = `question-${testIndex}-${questionIndex}`;
        const slider = document.getElementById(sliderId);
        if (slider) {
            userAnswers[sliderId] = slider.value;
        }
    }
}

// Переопределяем renderTests для запуска пошагового режима
function renderTests() {
    currentTestIndex = 0;
    currentQuestionIndex = 0;
    userAnswers = {};
    renderCurrentQuestion();
}

// Collect and submit test results
async function submitTestResults() {
    saveCurrentAnswer();
    const test = tests[currentTestIndex];
    const testIndex = currentTestIndex;
    const isOptionalTest = test.is_Optional === true;
    const hasImageOptions = isOptionalTest && test.questions.every(q => q.source);
    let result = null;
    if (hasImageOptions) {
        // Найти выбранный вариант
        const selectedIdx = userAnswers[`imgopt-${testIndex}`];
        if (selectedIdx !== undefined) {
            const chosen = test.questions[selectedIdx];
            result = {
                title: chosen.question,
                result: 0,
                is_Optional: true,
                maximum: 0
            };
        }
    } else {
        let totalScore = 0;
        let maximumScore = 0;
        test.questions.forEach((question, questionIndex) => {
            if (isOptionalTest) {
                if (question.mark > 0) {
                    maximumScore += question.mark;
                } else {
                    maximumScore += 1;
                }
            } else {
                maximumScore += (question.mark > 0 ? question.mark : 1);
            }
            if (isOptionalTest) {
                const radioName = `question-${testIndex}-${questionIndex}`;
                const answer = userAnswers[radioName];
                if (answer !== undefined) {
                    totalScore += parseInt(answer, 10);
                }
            } else {
                const sliderId = `question-${testIndex}-${questionIndex}`;
                const answer = userAnswers[sliderId];
                if (answer !== undefined) {
                    totalScore += parseInt(answer, 10);
                }
            }
        });
        result = {
            title: test.title,
            result: totalScore,
            is_Optional: isOptionalTest,
            maximum: maximumScore
        };
    }
    if (result) testResultsToSend.push(result);
    // Если есть следующий тест — перейти к нему
    if (currentTestIndex < tests.length - 1) {
        currentTestIndex++;
        currentQuestionIndex = 0;
        renderCurrentQuestion();
        return;
    }
    // Если это последний тест — отправить результаты
    elements.submitTestButton.disabled = true;
    elements.submitTestButton.textContent = 'Submitting...';
    const payload = {
        resume_id: parseInt(resumeId, 10),
        sub_tests: testResultsToSend
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
        testResults = testResultsToSend;
        showNotification('Test results submitted successfully!');
        displayResults();
    } catch (error) {
        console.error('Error submitting results:', error);
        showNotification(`Error submitting results: ${error.message}`, true);
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