import { state, saveState, showToast } from './store.js';

export function renderUserDashboard(container) {
    const userTasks = state.tasks.filter(t => t.userId === state.currentUser.id);

    container.innerHTML = `
        <div class="dashboard-grid">
            <!-- Report Form -->
            <div class="card" style="grid-column: 1 / -1; max-width: 600px; margin: 0 auto;">
                <h2 class="mb-4">Report Waste</h2>
                <form id="reportForm">
                    <div class="form-group">
                        <label>Photo Evidence (Before)</label>
                        <div class="file-upload-wrapper" id="uploadWrapper">
                            <i data-lucide="camera" style="width: 32px; height: 32px; color: var(--text-muted);"></i>
                            <span class="text-muted">Click to capture or upload photo</span>
                            <input type="file" id="photoInput" accept="image/*" capture="environment" required>
                            <img id="photoPreview" class="preview-image" style="display: none;">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Location</label>
                        <div class="flex items-center gap-2">
                            <button type="button" id="getLocationBtn" class="btn btn-secondary flex-1">
                                <i data-lucide="map-pin"></i> Get Current Location
                            </button>
                            <span id="locationStatus" class="text-sm text-muted">Not set</span>
                        </div>
                        <input type="hidden" id="lat">
                        <input type="hidden" id="lng">
                    </div>

                    <button type="submit" class="btn btn-primary w-full mt-4" id="submitBtn" disabled>
                        Submit Report
                    </button>
                </form>
            </div>

            <!-- User's Tasks -->
            <div style="grid-column: 1 / -1;">
                <h3 class="mb-4">Your Reports</h3>
                ${userTasks.length === 0 ? `
                    <div class="text-center text-muted" style="padding: 2rem; background: var(--surface); border-radius: var(--radius-lg);">
                        <i data-lucide="inbox" style="width: 48px; height: 48px; opacity: 0.5; margin-bottom: 1rem;"></i>
                        <p>You haven't reported any waste yet.</p>
                    </div>
                ` : `
                    <div style="display: grid; gap: 1rem;">
                        ${userTasks.map(task => `
                            <div class="card flex justify-between items-center" style="padding: 1rem;">
                                <div class="flex items-center gap-4">
                                    <img src="${task.beforeImg}" style="width: 60px; height: 60px; object-fit: cover; border-radius: var(--radius-md);">
                                    <div>
                                        <div class="font-bold">Task #${task.id.slice(-4)}</div>
                                        <div class="text-sm text-muted">${new Date(task.timestamp).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div class="flex-col items-center gap-2" style="align-items: flex-end;">
                                    ${getStatusBadge(task.status)}
                                    ${task.status === 'completed' && !task.rated ? `
                                        <button class="btn btn-outline" style="padding: 0.25rem 0.75rem; font-size: 0.75rem;" onclick="rateTask('${task.id}')">Rate Cleaner</button>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
    `;

    lucide.createIcons();
    setupReportLogic();

    // Attach global rating handler
    window.rateTask = (taskId) => {
        const rating = prompt('Rate the cleaner from 1 to 5:');
        if (rating && !isNaN(rating) && rating >= 1 && rating <= 5) {
            const task = state.tasks.find(t => t.id === taskId);
            if (task) {
                task.rated = true;
                
                // Save rating
                state.ratings.push({
                    taskId: task.id,
                    cleanerId: task.cleanerId,
                    rating: parseFloat(rating)
                });

                // Temporary data cleanup logic: Keep the rating, delete the large images.
                task.beforeImg = null;
                task.afterImg = null;

                saveState();
                showToast(`Thank you for rating! (${rating} stars)`);
                renderUserDashboard(document.getElementById('main-content'));
            }
        } else if (rating) {
            showToast('Invalid rating. Please enter a number between 1 and 5.', 'error');
        }
    };
}

function getStatusBadge(status) {
    switch (status) {
        case 'pending': return '<span class="badge badge-pending">Pending</span>';
        case 'in_progress': return '<span class="badge badge-in-progress">In Progress</span>';
        case 'completed': return '<span class="badge badge-completed">Completed</span>';
        default: return '';
    }
}

function setupReportLogic() {
    let currentImageBase64 = null;
    const photoInput = document.getElementById('photoInput');
    const photoPreview = document.getElementById('photoPreview');
    const getLocationBtn = document.getElementById('getLocationBtn');
    const locationStatus = document.getElementById('locationStatus');
    const latInput = document.getElementById('lat');
    const lngInput = document.getElementById('lng');
    const submitBtn = document.getElementById('submitBtn');

    // Handle Image Upload
    photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                currentImageBase64 = event.target.result;
                photoPreview.src = currentImageBase64;
                photoPreview.style.display = 'block';
                checkFormValidity();
            };
            reader.readAsDataURL(file);
        }
    });

    // Handle Geolocation
    getLocationBtn.addEventListener('click', () => {
        getLocationBtn.innerHTML = '<i class="spinner" style="width: 16px; height: 16px; margin: 0; border-width: 2px;"></i> Locating...';
        getLocationBtn.disabled = true;

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    latInput.value = position.coords.latitude;
                    lngInput.value = position.coords.longitude;
                    locationStatus.innerHTML = `<i data-lucide="check" style="width: 16px; height: 16px; color: var(--success);"></i> Saved`;
                    lucide.createIcons();
                    getLocationBtn.innerHTML = '<i data-lucide="map-pin"></i> Get Current Location';
                    getLocationBtn.disabled = false;
                    checkFormValidity();
                },
                (error) => {
                    locationStatus.innerText = 'Location access denied.';
                    getLocationBtn.innerHTML = '<i data-lucide="map-pin"></i> Try Again';
                    getLocationBtn.disabled = false;
                    showToast('Failed to get location.', 'error');
                }
            );
        } else {
            showToast('Geolocation is not supported by this browser.', 'error');
        }
    });

    function checkFormValidity() {
        if (currentImageBase64 && latInput.value && lngInput.value) {
            submitBtn.disabled = false;
        } else {
            submitBtn.disabled = true;
        }
    }

    // Handle Form Submit
    document.getElementById('reportForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newTask = {
            id: 'tsk_' + Date.now(),
            userId: state.currentUser.id,
            cleanerId: null,
            beforeImg: currentImageBase64,
            afterImg: null,
            lat: latInput.value,
            lng: lngInput.value,
            status: 'pending',
            timestamp: new Date().toISOString(),
            rated: false
        };

        state.tasks.push(newTask);
        saveState();
        showToast('Waste reported successfully!');
        
        // Re-render dashboard
        renderUserDashboard(document.getElementById('main-content'));
    });
}
