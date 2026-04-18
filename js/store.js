export const state = {
    currentUser: null,
    tasks: [],
    ratings: []
};

export function initStore() {
    const savedState = localStorage.getItem('ecoCleanState');
    if (savedState) {
        const parsed = JSON.parse(savedState);
        state.currentUser = parsed.currentUser;
        state.tasks = parsed.tasks || [];
        state.ratings = parsed.ratings || [];
    }
}

export function saveState() {
    localStorage.setItem('ecoCleanState', JSON.stringify(state));
}

export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 'alert-circle';
    
    toast.innerHTML = `
        <i data-lucide="${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    lucide.createIcons({ root: toast });
    
    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s forwards reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
