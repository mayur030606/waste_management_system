// Basic state management and routing
import { initStore, state, saveState } from './store.js';
import { renderLogin } from './auth.js';
import { renderUserDashboard } from './waste-report.js';
import { renderCleanerDashboard } from './cleaner-task.js';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    initStore();

    // Initialize lucide icons
    lucide.createIcons();

    // Route based on state
    route();
}

// route export only
export function route() {
    const appContainer = document.getElementById('app');
    
    // Clear container
    appContainer.innerHTML = '';
    appContainer.className = 'view-enter';
    
    // Trigger reflow for animation
    void appContainer.offsetWidth;

    if (!state.currentUser) {
        renderLogin(appContainer);
    } else {
        // Render Header
        appContainer.innerHTML = `
            <header class="app-header">
                <div class="brand">
                    <i data-lucide="leaf"></i> EcoClean
                </div>
                <div class="user-profile">
                    <div class="flex-col" style="text-align: right;">
                        <span class="font-bold">${state.currentUser.name}</span>
                        <span class="text-sm text-muted capitalize">${state.currentUser.role}</span>
                    </div>
                    <div class="avatar">${state.currentUser.name.charAt(0).toUpperCase()}</div>
                    <button id="logoutBtn" class="btn btn-outline" style="padding: 0.5rem; margin-left: 1rem;" title="Logout">
                        <i data-lucide="log-out"></i>
                    </button>
                </div>
            </header>
            <main id="main-content" class="container mt-8"></main>
        `;
        lucide.createIcons();
        
        document.getElementById('logoutBtn').addEventListener('click', () => {
            state.currentUser = null;
            saveState();
            route();
        });

        const mainContent = document.getElementById('main-content');

        if (state.currentUser.role === 'user') {
            renderUserDashboard(mainContent);
        } else if (state.currentUser.role === 'cleaner') {
            renderCleanerDashboard(mainContent);
        }
    }
}


