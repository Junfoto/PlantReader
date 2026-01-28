/**
 * PlantID AI - Core Application Logic
 * Integrates Gemini 1.5 Flash for plant identification.
 */

class PlantIDApp {
    constructor() {
        // Core UI elements
        this.video = document.getElementById('camera-feed');
        this.canvas = document.getElementById('capture-canvas');
        this.captureBtn = document.getElementById('capture-btn');
        this.galleryBtn = document.getElementById('gallery-btn');
        this.flipBtn = document.getElementById('flip-camera-btn');
        this.settingsBtn = document.getElementById('settings-btn');

        // Drawer elements
        this.drawer = document.getElementById('results-drawer');
        this.closeDrawerBtn = document.getElementById('close-drawer');
        this.loadingState = document.getElementById('loading-state');
        this.plantDetails = document.getElementById('plant-details');

        // Modal elements
        this.settingsModal = document.getElementById('settings-modal');
        this.closeSettingsBtn = document.getElementById('close-settings');
        this.saveSettingsBtn = document.getElementById('save-settings');
        this.apiKeyInput = document.getElementById('api-key-input');
        this.toggleKeyVisibilityBtn = document.getElementById('toggle-key-visibility');

        // Landing screen elements
        this.landingScreen = document.getElementById('landing-screen');
        this.startScanBtn = document.getElementById('start-scan-btn');
        this.mainView = document.querySelector('.main-view');

        // Other
        this.toast = document.getElementById('toast');
        this.stream = null;
        this.facingMode = 'environment';
        this.apiKey = localStorage.getItem('GEMINI_API_KEY') || '';

        this.init();
    }

    async init() {
        this.setupEventListeners();

        if (!this.apiKey) {
            this.showToast("Please enter your Gemini API key in Settings.");
            this.openSettings();
        }
    }

    setupEventListeners() {
        this.startScanBtn.addEventListener('click', () => this.handleStartScan());
        this.captureBtn.addEventListener('click', () => this.captureAndIdentify());
        this.flipBtn.addEventListener('click', () => this.toggleCamera());
        this.closeDrawerBtn.addEventListener('click', () => this.closeResults());
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
        this.saveSettingsBtn.addEventListener('click', () => this.saveApiKey());
        this.toggleKeyVisibilityBtn.addEventListener('click', () => this.toggleKeyVisibility());

        this.galleryBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => this.handleFileUpload(e);
            input.click();
        });

        // Close modal on click outside
        this.settingsModal.querySelector('.modal-backdrop').addEventListener('click', () => this.closeSettings());
    }

    async handleStartScan() {
        this.landingScreen.classList.add('fade-out');
        setTimeout(() => {
            this.landingScreen.classList.add('hidden');
            this.mainView.classList.remove('hidden');
        }, 500);

        await this.startCamera();
    }

    async startCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: this.facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });
            this.video.srcObject = this.stream;
        } catch (err) {
            console.error("Camera access error:", err);
            this.showToast("Cannot access camera. Please check permissions.");
        }
    }

    async toggleCamera() {
        this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
        await this.startCamera();
        this.flipBtn.style.transform = `rotate(${this.flipBtn.style.transform.includes('180') ? '0' : '180'}deg)`;
    }

    async captureAndIdentify() {
        if (!this.apiKey) {
            this.showToast("API Key required. Open settings.");
            this.openSettings();
            return;
        }

        const context = this.canvas.getContext('2d');
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

        const imageData = this.canvas.toDataURL('image/jpeg', 0.8);
        const base64Data = imageData.split(',')[1];

        this.openResults();
        this.setLoading(true);

        try {
            const result = await this.identifyWithGemini(base64Data);
            this.displayResults(result);
        } catch (err) {
            console.error(err);
            this.showToast(err.message || "Identification failed.");
            this.closeResults();
        } finally {
            this.setLoading(false);
        }
    }

    async identifyWithGemini(base64Image) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

        const prompt = `Identify this plant. Return a JSON object with: 
        "name": (common name), 
        "scientificName": (Latin name), 
        "confidence": (percentage match as a number), 
        "light": (brief lighting requirements), 
        "water": (brief watering requirements), 
        "description": (1-2 sentences about the plant). 
        Only return the JSON object, no other text.`;

        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: "image/jpeg", data: base64Image } }
                    ]
                }]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || "Gemini API error");
        }

        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;

        try {
            // Clean markdown if Gemini returns it
            const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();
            return JSON.parse(cleanText);
        } catch (e) {
            console.error("Failed to parse JSON:", text);
            throw new Error("Could not interpret AI response.");
        }
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file || !this.apiKey) {
            if (!this.apiKey) {
                this.showToast("API Key required.");
                this.openSettings();
            }
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const imageData = e.target.result;
            const base64Data = imageData.split(',')[1];

            this.openResults();
            this.setLoading(true);

            try {
                const result = await this.identifyWithGemini(base64Data);
                this.displayResults(result);
            } catch (err) {
                this.showToast(err.message || "Identification failed.");
                this.closeResults();
            } finally {
                this.setLoading(false);
            }
        };
        reader.readAsDataURL(file);
    }

    displayResults(data) {
        document.getElementById('plant-name').textContent = data.name;
        document.getElementById('plant-scientific').textContent = data.scientificName;
        document.getElementById('plant-confidence').textContent = `${data.confidence}% Match`;
        document.getElementById('plant-light').textContent = data.light;
        document.getElementById('plant-water').textContent = data.water;
        document.getElementById('plant-description').textContent = data.description;

        this.plantDetails.classList.remove('hidden');
    }

    // Modal & Drawer State
    openSettings() {
        this.apiKeyInput.value = this.apiKey;
        this.settingsModal.classList.remove('hidden');
    }

    closeSettings() {
        this.settingsModal.classList.add('hidden');
    }

    saveApiKey() {
        const key = this.apiKeyInput.value.trim();
        if (!key) {
            this.showToast("Please enter a valid key.");
            return;
        }
        this.apiKey = key;
        localStorage.setItem('GEMINI_API_KEY', key);
        this.showToast("Settings saved successfully!");
        this.closeSettings();
    }

    toggleKeyVisibility() {
        const type = this.apiKeyInput.type === 'password' ? 'text' : 'password';
        this.apiKeyInput.type = type;
        const icon = type === 'password' ? 'eye' : 'eye-off';
        this.toggleKeyVisibilityBtn.innerHTML = `<i data-lucide="${icon}"></i>`;
        lucide.createIcons();
    }

    openResults() {
        this.drawer.classList.add('open');
    }

    closeResults() {
        this.drawer.classList.remove('open');
        setTimeout(() => {
            this.plantDetails.classList.add('hidden');
            this.setLoading(false);
        }, 400);
    }

    setLoading(isLoading) {
        if (isLoading) {
            this.loadingState.classList.remove('hidden');
            this.plantDetails.classList.add('hidden');
        } else {
            this.loadingState.classList.add('hidden');
        }
    }

    showToast(message) {
        this.toast.textContent = message;
        this.toast.classList.remove('hidden');
        setTimeout(() => {
            this.toast.classList.add('hidden');
        }, 3000);
    }
}

// Start the app
window.addEventListener('DOMContentLoaded', () => {
    new PlantIDApp();
    lucide.createIcons();
});
