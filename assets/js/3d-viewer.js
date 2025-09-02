// Portfolio Image Display - No 3D functionality
class CADViewer {
    constructor(containerId, modelPath) {
        this.container = document.getElementById(containerId);
        this.modelPath = modelPath;

        // Create a simple placeholder message
        this.init();
    }

    init() {
        // Clear any existing content
        this.container.innerHTML = '';

        // Create a placeholder element
        const placeholder = document.createElement('div');
        placeholder.style.width = '100%';
        placeholder.style.height = '100%';
        placeholder.style.display = 'flex';
        placeholder.style.alignItems = 'center';
        placeholder.style.justifyContent = 'center';
        placeholder.style.backgroundColor = '#f5f5f5';
        placeholder.style.border = '1px solid #ddd';
        placeholder.style.borderRadius = '4px';
        placeholder.style.color = '#666';
        placeholder.style.fontSize = '14px';
        placeholder.textContent = 'Image displayed on project page';

        this.container.appendChild(placeholder);
    }

    dispose() {
        // No cleanup needed for this simple implementation
    }
}

// Initialize placeholder viewer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Make CADViewer available globally (for compatibility)
    window.CADViewer = CADViewer;
});
