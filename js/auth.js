import { state, saveState, showToast } from './store.js';
import { route } from './app.js';

export function renderLogin(container) {
    container.innerHTML = `
        <div class="flex-center full-height">
            <div class="card" style="width: 100%; max-width: 400px;">
                <div class="text-center mb-4">
                    <i data-lucide="leaf" style="width: 48px; height: 48px; color: var(--primary);"></i>
                    <h2 class="mt-4">Welcome to EcoClean</h2>
                    <p class="text-muted">Login or create an account</p>
                </div>

                <form id="authForm">
                    <div class="form-group">
                        <label for="name">Full Name</label>
                        <input type="text" id="name" class="form-input" required placeholder="John Doe">
                    </div>
                    
                    <div class="form-group">
                        <label for="email">Gmail / Email</label>
                        <input type="email" id="email" class="form-input" required placeholder="example@gmail.com">
                    </div>

                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" class="form-input" required placeholder="Enter your password">
                    </div>

                    <div class="form-group">
                        <label for="role">I am a...</label>
                        <select id="role" class="form-input">
                            <option value="user">Citizen (Report Waste)</option>
                            <option value="cleaner">Cleaner (Complete Tasks)</option>
                        </select>
                    </div>

                    <button type="submit" class="btn btn-primary w-full mt-4">
                        Continue <i data-lucide="arrow-right"></i>
                    </button>
                </form>
            </div>
        </div>
    `;

    lucide.createIcons();

    document.getElementById('authForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const role = document.getElementById('role').value;

        // Mock Authentication / User Creation
        // Check if user already exists based on email
        let user = state.users.find(u => u.email === email && u.role === role);

        if (!user) {
            // New user registration
            const userId = 'usr_' + Math.random().toString(36).substr(2, 9);
            user = {
                id: userId,
                name,
                email,
                role,
                rating: role === 'cleaner' ? 5.0 : null // Default rating
            };
            state.users.push(user);
        }

        state.currentUser = user;

        saveState();
        showToast(`Welcome back, ${name}!`);
        route();
    });
}
