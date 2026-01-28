/**
 * PlantID AI - Core Application Logic
 */

class PlantIDApp {
    constructor() {
        this.video = document.getElementById('camera-feed');
        this.canvas = document.getElementById('capture-canvas');
        this.captureBtn = document.getElementById('capture-btn');
        this.galleryBtn = document.getElementById('gallery-btn');
        this.flipBtn = document.getElementById('flip-camera-btn');
        this.drawer = document.getElementById('results-drawer');
        this.closeDrawerBtn = document.getElementById('close-drawer');
        this.loadingState = document.getElementById('loading-state');
        this.plantDetails = document.getElementById('plant-details');
        this.toast = document.getElementById('toast');

        this.stream = null;
        this.facingMode = 'environment'; // Default to back camera

        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.startCamera();
    }

    setupEventListeners() {
        this.captureBtn.addEventListener('click', () => this.captureAndIdentify());
        this.flipBtn.addEventListener('click', () => this.toggleCamera());
        this.closeDrawerBtn.addEventListener('click', () => this.closeResults());
        
        // Mock gallery upload
        this.galleryBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => this.handleFileUpload(e);
            input.click();
        });
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
        
        // Add a little rotation animation to the button
        this.flipBtn.style.transform = `rotate(${this.flipBtn.style.transform === 'rotate(180deg)' ? '0deg' : '180deg'})`;
    }

    async captureAndIdentify() {
        // 1. Capture image from video
        const context = this.canvas.getContext('2d');
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        const imageData = this.canvas.toDataURL('image/jpeg');

        // 2. Show UI state
        this.openResults();
        this.setLoading(true);

        // 3. Call AI Identification (Simulated for Now)
        try {
            const result = await this.mockIdentifyPlant(imageData);
            this.displayResults(result);
        } catch (err) {
            this.showToast("Identification failed. Please try again.");
            this.closeResults();
        } finally {
            this.setLoading(false);
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const imageData = e.target.result;
            this.openResults();
            this.setLoading(true);
            
            try {
                const result = await this.mockIdentifyPlant(imageData);
                this.displayResults(result);
            } catch (err) {
                this.showToast("Identification failed.");
                this.closeResults();
            } finally {
                this.setLoading(false);
            }
        };
        reader.readAsDataURL(file);
    }

    async mockIdentifyPlant(imageData) {
        // Simulate network/AI delay
        await new Promise(resolve => setTimeout(resolve, 2500));

        // Return a realistic sample response
        return {
            name: "Fiddle Leaf Fig",
            scientificName: "Ficus lyrata",
            confidence: 94,
            light: "Bright, filtered light",
            water: "Every 1-2 weeks",
            description: "The Fiddle Leaf Fig is a species of flowering plant in the mulberry and fig family Moraceae. It is native to western Africa, from Cameroon west to Sierra Leone, where it grows in lowland tropical rainforest."
        };
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
});
