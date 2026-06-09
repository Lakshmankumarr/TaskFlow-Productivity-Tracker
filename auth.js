/* ===================================
   AUTHENTICATION JAVASCRIPT - FRONTEND
=================================== */

/* ===================================
   API CONFIGURATION
=================================== */

const API_BASE_URL = 'http://localhost:5000/api';

/* ===================================
   DOM ELEMENTS
=================================== */

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const switchToRegister = document.getElementById('switchToRegister');
const switchToLogin = document.getElementById('switchToLogin');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

/* ===================================
   PASSWORD VISIBILITY TOGGLES
=================================== */

const loginToggle = document.getElementById('loginToggle');
const registerToggle = document.getElementById('registerToggle');
const confirmToggle = document.getElementById('confirmToggle');

const loginPassword = document.getElementById('loginPassword');
const registerPassword = document.getElementById('registerPassword');
const confirmPassword = document.getElementById('confirmPassword');

/* ===================================
   PASSWORD STRENGTH INDICATOR
=================================== */

/**
 * Check password strength
 * @param {string} password - Password to check
 * @returns {string} Strength level: weak, medium, strong, very-strong
 */
function checkPasswordStrength(password) {
    let strength = 0;

    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    const levels = ['weak', 'weak', 'medium', 'strong', 'strong', 'very-strong'];
    return levels[strength];
}

/* ===================================
   PASSWORD STRENGTH LISTENER
=================================== */

registerPassword.addEventListener('input', function() {
    const strength = checkPasswordStrength(this.value);
    const indicator = document.getElementById('passwordStrength');
    
    if (this.value.length === 0) {
        indicator.className = 'password-strength';
    } else {
        indicator.className = `password-strength ${strength}`;
    }
});

/* ===================================
   PASSWORD VISIBILITY TOGGLES
=================================== */

function togglePasswordVisibility(input, button) {
    button.addEventListener('click', function(e) {
        e.preventDefault();
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        button.textContent = isPassword ? '🙈' : '👁️';
    });
}

togglePasswordVisibility(loginPassword, loginToggle);
togglePasswordVisibility(registerPassword, registerToggle);
togglePasswordVisibility(confirmPassword, confirmToggle);

/* ===================================
   FORM SWITCHING
=================================== */

function switchForm(showForm, hideForm) {
    hideForm.classList.remove('active-form');
    setTimeout(() => {
        showForm.classList.add('active-form');
    }, 50);
    clearMessages();
    clearErrors();
}

switchToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm(registerForm, loginForm);
});

switchToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm(loginForm, registerForm);
});

/* ===================================
   VALIDATION FUNCTIONS
=================================== */

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {boolean} True if meets minimum requirements
 */
function validatePassword(password) {
    return password.length >= 8 && 
           /[a-z]/.test(password) && 
           /[A-Z]/.test(password) &&
           /[0-9]/.test(password);
}

/**
 * Clear all error messages
 */
function clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => {
        el.textContent = '';
    });
}

/**
 * Clear all messages
 */
function clearMessages() {
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
    errorMessage.textContent = '';
    successMessage.textContent = '';
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Show success message
 * @param {string} message - Success message to display
 */
function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    successMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Set field error
 * @param {string} fieldId - ID of the error element
 * @param {string} message - Error message
 */
function setFieldError(fieldId, message) {
    const errorEl = document.getElementById(fieldId);
    if (errorEl) {
        errorEl.textContent = message;
    }
}

/* ===================================
   LOGIN HANDLER
=================================== */

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();
    clearErrors();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    // Validate inputs
    if (!email) {
        setFieldError('loginEmailError', 'Email is required');
        return;
    }

    if (!validateEmail(email)) {
        setFieldError('loginEmailError', 'Please enter a valid email');
        return;
    }

    if (!password) {
        setFieldError('loginPasswordError', 'Password is required');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, rememberMe })
        });

        const data = await response.json();

        if (!response.ok) {
            showError(data.message || 'Login failed');
            return;
        }

        // Store token
        if (rememberMe) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        } else {
            sessionStorage.setItem('authToken', data.token);
            sessionStorage.setItem('user', JSON.stringify(data.user));
        }

        showSuccess('✅ Login successful! Redirecting...');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);

    } catch (error) {
        console.error('Login error:', error);
        showError('Connection error. Please try again.');
    }
});

/* ===================================
   REGISTER HANDLER
=================================== */

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();
    clearErrors();

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPwd = document.getElementById('confirmPassword').value;

    // Validate inputs
    let hasError = false;

    if (!name) {
        setFieldError('registerNameError', 'Name is required');
        hasError = true;
    } else if (name.length < 2) {
        setFieldError('registerNameError', 'Name must be at least 2 characters');
        hasError = true;
    }

    if (!email) {
        setFieldError('registerEmailError', 'Email is required');
        hasError = true;
    } else if (!validateEmail(email)) {
        setFieldError('registerEmailError', 'Please enter a valid email');
        hasError = true;
    }

    if (!password) {
        setFieldError('registerPasswordError', 'Password is required');
        hasError = true;
    } else if (!validatePassword(password)) {
        setFieldError('registerPasswordError', 'Password must be at least 8 characters with uppercase, lowercase, and number');
        hasError = true;
    }

    if (password !== confirmPwd) {
        setFieldError('confirmPasswordError', 'Passwords do not match');
        hasError = true;
    }

    if (hasError) return;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            showError(data.message || 'Registration failed');
            return;
        }

        showSuccess('✅ Account created successfully! Redirecting to login...');
        setTimeout(() => {
            switchForm(loginForm, registerForm);
            loginForm.reset();
            document.getElementById('loginEmail').focus();
        }, 1500);

    } catch (error) {
        console.error('Registration error:', error);
        showError('Connection error. Please try again.');
    }
});

/* ===================================
   CHECK AUTHENTICATION ON LOAD
=================================== */

function checkAuthentication() {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
        // User is already logged in, redirect to dashboard
        window.location.href = 'index.html';
    }
}

checkAuthentication();

/* ===================================
   KEYBOARD NAVIGATION
=================================== */

document.addEventListener('keydown', (e) => {
    // Tab between forms with keyboard
    if (e.key === 'Escape') {
        clearMessages();
    }
});
