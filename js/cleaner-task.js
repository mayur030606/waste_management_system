import { state, saveState, showToast } from './store.js';
import { verifyCleanedLocation } from './ml-service.js';

export function renderCleanerDashboard(container) {
    // Cleaner sees 'pending' tasks or tasks they have accepted ('in_progress')
    const availableTasks = state.tasks.filter(t => t.status === 'pending');
    const myTasks = state.tasks.filter(t => t.cleanerId === state.currentUser.id && t.status === 'in_progress');
    const completedTasks = state.tasks.filter(t => t.cleanerId === state.currentUser.id && t.status === 'completed');

    container.innerHTML = `
        <div class="dashboard-grid">
            
            <!-- Active Task (if any) -->
            ${myTasks.length > 0 ? `
                <div class="card" style="grid-column: 1 / -1; border-left: 4px solid var(--primary);">
                    <h2 class="mb-4">Active Task</h2>
                    <div class="flex gap-6 items-center flex-wrap">
                        <img src="${myTasks[0].beforeImg}" style="width: 150px; height: 150px; object-fit: cover; border-radius: var(--radius-md);">
                        <div class="flex-1">
                            <p class="font-bold">Task #${myTasks[0].id.slice(-4)}</p>
                            <p class="text-sm text-muted mb-4"><i data-lucide="map-pin" style="width:14px; height:14px;"></i> ${myTasks[0].lat}, ${myTasks[0].lng}</p>
                            
                            <!-- After Photo Upload -->
                            <div class="form-group mb-0">
                                <label>Upload Cleaned Area Photo</label>
                                <div class="file-upload-wrapper" id="afterUploadWrapper" style="height: 100px;">
                                    <i data-lucide="camera" style="width: 24px; height: 24px; color: var(--text-muted);"></i>
                                    <span class="text-sm text-muted">Upload "After" photo</span>
                                    <input type="file" id="afterPhotoInput" accept="image/*" capture="environment">
                                </div>
                            </div>
                            
                            <button id="verifyBtn" class="btn btn-primary mt-4" disabled>
                                Verify & Complete
                            </button>
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- Available Tasks -->
            <div style="grid-column: 1 / -1;">
                <h3 class="mb-4">Available Tasks nearby</h3>
                ${availableTasks.length === 0 ? `
                    <div class="text-center text-muted" style="padding: 2rem; background: var(--surface); border-radius: var(--radius-lg);">
                        <i data-lucide="check-circle" style="width: 48px; height: 48px; opacity: 0.5; margin-bottom: 1rem;"></i>
                        <p>No pending tasks! The city is clean.</p>
                    </div>
                ` : `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;">
                        ${availableTasks.map(task => `
                            <div class="card flex-col justify-between" style="gap: 1rem;">
                                <img src="${task.beforeImg}" style="width: 100%; height: 150px; object-fit: cover; border-radius: var(--radius-md);">
                                <div>
                                    <div class="font-bold">Task #${task.id.slice(-4)}</div>
                                    <div class="text-sm text-muted mb-2"><i data-lucide="map-pin" style="width:14px; height:14px;"></i> ${task.lat.substring(0,6)}, ${task.lng.substring(0,6)}</div>
                                </div>
                                <button class="btn btn-outline w-full" onclick="acceptTask('${task.id}')" ${myTasks.length > 0 ? 'disabled title="Finish current task first"' : ''}>
                                    Accept Task
                                </button>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
            
            <!-- Stats -->
            <div style="grid-column: 1 / -1; margin-top: 2rem;">
                <h3 class="mb-4">Your Stats</h3>
                <div class="flex gap-4">
                    <div class="card flex-1 text-center">
                        <div class="text-3xl font-bold text-primary">${completedTasks.length}</div>
                        <div class="text-sm text-muted">Tasks Completed</div>
                    </div>
                    <div class="card flex-1 text-center">
                        <div class="text-3xl font-bold text-warning" id="ratingDisplay">${calculateAverageRating(state.currentUser.id)}</div>
                        <div class="text-sm text-muted">Average Rating</div>
                    </div>
                </div>
            </div>

        </div>
    `;

    lucide.createIcons();

    // Attach global accept handler
    window.acceptTask = (taskId) => {
        const task = state.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = 'in_progress';
            task.cleanerId = state.currentUser.id;
            saveState();
            showToast('Task accepted!');
            renderCleanerDashboard(document.getElementById('main-content'));
        }
    };

    // Setup Verify Logic if there's an active task
    if (myTasks.length > 0) {
        setupVerifyLogic(myTasks[0]);
    }
}

function calculateAverageRating(cleanerId) {
    const cleanerRatings = state.ratings.filter(r => r.cleanerId === cleanerId);
    if (cleanerRatings.length === 0) return '5.0';
    const sum = cleanerRatings.reduce((acc, curr) => acc + curr.rating, 0);
    return (sum / cleanerRatings.length).toFixed(1);
}

function setupVerifyLogic(activeTask) {
    let afterImageBase64 = null;
    const afterPhotoInput = document.getElementById('afterPhotoInput');
    const verifyBtn = document.getElementById('verifyBtn');
    const uploadWrapper = document.getElementById('afterUploadWrapper');

    if (!afterPhotoInput) return;

    afterPhotoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                afterImageBase64 = event.target.result;
                uploadWrapper.style.backgroundImage = `url(${afterImageBase64})`;
                uploadWrapper.style.backgroundSize = 'cover';
                uploadWrapper.style.backgroundPosition = 'center';
                uploadWrapper.innerHTML = ''; // Hide icon
                verifyBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        }
    });

    verifyBtn.addEventListener('click', async () => {
        verifyBtn.innerHTML = '<i class="spinner" style="width: 16px; height: 16px; margin: 0; border-width: 2px;"></i> Verifying with ML...';
        verifyBtn.disabled = true;

        try {
            const result = await verifyCleanedLocation(activeTask.beforeImg, afterImageBase64, { lat: activeTask.lat, lng: activeTask.lng });
            
            if (result.success) {
                // Verification passed
                activeTask.status = 'completed';
                activeTask.afterImg = afterImageBase64; // Store temporarily for user to rate
                saveState();
                showToast(result.message);
                renderCleanerDashboard(document.getElementById('main-content'));
            } else {
                // Verification failed
                showToast(result.message, 'error');
                verifyBtn.innerHTML = 'Verify & Complete';
                verifyBtn.disabled = false;
            }
        } catch (error) {
            showToast('An error occurred during verification.', 'error');
            verifyBtn.innerHTML = 'Verify & Complete';
            verifyBtn.disabled = false;
        }
    });
}
