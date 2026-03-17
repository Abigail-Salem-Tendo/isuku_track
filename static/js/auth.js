// js file that handles token check, logout

// Check token then redirect to login if the user is not logged in

const token = localStorage.getItem('authToken');
const role = localStorage.getItem('userRole');

if (!token) {
    window.location.href = '/templates/login1.html';
}