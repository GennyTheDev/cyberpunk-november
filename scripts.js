// State management
let state = {
    names: [],
    favorites: [],
    history: [],
    loading: false,
    copiedId: null
};

// DOM elements
const elements = {
    keywords: document.getElementById('keywords'),
    industry: document.getElementById('industry'),
    tone: document.getElementById('tone'),
    length: document.getElementById('length'),
    generateBtn: document.getElementById('generateBtn'),
    btnText: document.getElementById('btnText'),
    resultsSection: document.getElementById('resultsSection'),
    namesGrid: document.getElementById('namesGrid'),
    resultCount: document.getElementById('resultCount'),
    exportBtn: document.getElementById('exportBtn'),
    favCount: document.getElementById('favCount'),
    historySection: document.getElementById('historySection'),
    historyList: document.getElementById('historyList')
};

// Initialize app
function init() {
    loadFavorites();
    loadHistory();
    attachEventListeners();
}

// Load favorites from localStorage
function loadFavorites() {
    const saved = localStorage.getItem('favorites');
    if (saved) {
        state.favorites = JSON.parse(saved);
        updateExportButton();
    }
}

// Load history from localStorage
function loadHistory() {
    const saved = localStorage.getItem('history');
    if (saved) {
        state.history = JSON.parse(saved);
        renderHistory();
    }
}

// Save favorites to localStorage
function saveFavorites() {
    localStorage.setItem('favorites', JSON.stringify(state.favorites));
    updateExportButton();
}

// Save history to localStorage
function saveHistory() {
    localStorage.setItem('history', JSON.stringify(state.history));
}

// Attach event listeners
function attachEventListeners() {
    elements.generateBtn.addEventListener('click', generateNames);
    elements.exportBtn.addEventListener('click', exportFavorites);
}

// Generate names using AI
async function generateNames() {
    if (state.loading) return;

    const formData = {
        keywords: elements.keywords.value || 'innovation, tech',
        industry: elements.industry.value || 'tech',
        tone: elements.tone.value,
        length: elements.length.value,
        count: 15
    };

    setLoading(true);

    try {
        const lengthText = formData.length === 'short' 
            ? 'max 8 characters' 
            : formData.length === 'medium' 
            ? '8-12 characters' 
            : 'any length';

        const prompt = `Generate ${formData.count} creative, ${formData.tone} startup names for the ${formData.industry} industry using these keywords: ${formData.keywords}. 

Length preference: ${lengthText}.

Return ONLY a valid JSON array with this exact format, no other text:
[{"name": "ExampleName", "rationale": "Brief explanation", "style": "brandable", "score": 85}]

Make names unique, memorable, and brandable. Include varied styles: brandable, keyword-based, invented words, compound words. Assign scores 1-100 based on memorability, uniqueness, and brandability.`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1000,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        const data = await response.json();
        let text = data.content.find(c => c.type === 'text')?.text || '';
        
        // Clean up the response
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const generated = JSON.parse(text);
        state.names = generated;
        
        // Add to history
        const historyEntry = {
            timestamp: Date.now(),
            params: formData,
            count: generated.length
        };
        state.history = [historyEntry, ...state.history.slice(0, 4)];
        saveHistory();
        renderHistory();
        
        // Render results
        renderNames();
        
    } catch (err) {
        console.error('Generation error:', err);
        alert('Failed to generate names. Please try again.');
    } finally {
        setLoading(false);
    }
}

// Set loading state
function setLoading(loading) {
    state.loading = loading;
    elements.generateBtn.disabled = loading;
    
    if (loading) {
        elements.btnText.innerHTML = `
            <div class="spinner"></div>
            GENERATING...
        `;
    } else {
        elements.btnText.innerHTML = 'GENERATE NAMES';
        // Re-initialize icons after changing innerHTML
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
}

// Render names
function renderNames() {
    if (state.names.length === 0) {
        elements.resultsSection.style.display = 'none';
        return;
    }

    elements.resultsSection.style.display = 'block';
    elements.resultCount.textContent = state.names.length;
    
    elements.namesGrid.innerHTML = state.names.map((name, index) => {
        const isFavorite = state.favorites.some(f => f.name === name.name);
        const cardClass = isFavorite ? 'name-card favorited' : 'name-card';
        
        return `
            <div class="${cardClass}">
                <div class="name-card-header">
                    <div class="name-info">
                        <h3 class="name-title">${name.name}</h3>
                        <span class="name-style-tag">${name.style}</span>
                    </div>
                    <div class="name-actions">
                        <button class="action-btn ${isFavorite ? 'favorited' : ''}" onclick="toggleFavorite(${index})">
                            <i data-lucide="heart" ${isFavorite ? 'fill="currentColor"' : ''}></i>
                        </button>
                        <button class="action-btn" onclick="copyToClipboard('${name.name}', ${index})">
                            <i data-lucide="copy"></i>
                        </button>
                    </div>
                </div>
                
                <p class="name-rationale">${name.rationale}</p>
                
                <div class="score-container">
                    <span class="score-label">BRANDABILITY SCORE</span>
                    <div class="score-bar-container">
                        <div class="score-bar" style="width: ${name.score}%"></div>
                    </div>
                    <span class="score-value">${name.score}</span>
                </div>
            </div>
        `;
    }).join('');

    // Re-initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Toggle favorite
function toggleFavorite(index) {
    const name = state.names[index];
    const existingIndex = state.favorites.findIndex(f => f.name === name.name);
    
    if (existingIndex !== -1) {
        state.favorites.splice(existingIndex, 1);
    } else {
        state.favorites.push(name);
    }
    
    saveFavorites();
    renderNames();
}

// Copy to clipboard
function copyToClipboard(text, index) {
    navigator.clipboard.writeText(text).then(() => {
        // Visual feedback
        const button = document.querySelectorAll('.action-btn')[index * 2 + 1];
        const icon = button.querySelector('i');
        icon.setAttribute('data-lucide', 'check');
        button.classList.add('copied');
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        setTimeout(() => {
            icon.setAttribute('data-lucide', 'copy');
            button.classList.remove('copied');
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 2000);
    });
}

// Update export button visibility
function updateExportButton() {
    if (state.favorites.length > 0) {
        elements.exportBtn.style.display = 'flex';
        elements.favCount.textContent = state.favorites.length;
    } else {
        elements.exportBtn.style.display = 'none';
    }
}

// Export favorites to CSV
function exportFavorites() {
    if (state.favorites.length === 0) return;
    
    const csv = 'Name,Rationale,Style,Score\n' + 
        state.favorites.map(f => 
            `"${f.name}","${f.rationale}","${f.style}",${f.score}`
        ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'startup-names.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Render history
function renderHistory() {
    if (state.history.length === 0) {
        elements.historySection.style.display = 'none';
        return;
    }

    elements.historySection.style.display = 'block';
    
    elements.historyList.innerHTML = state.history.map(h => {
        const time = new Date(h.timestamp).toLocaleTimeString();
        const industry = h.params.industry || 'General';
        
        return `
            <div class="history-item">
                <span>${industry} • ${h.params.tone} • ${h.count} names</span>
                <span class="history-time">${time}</span>
            </div>
        `;
    }).join('');

    // Re-initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Make functions available globally
window.toggleFavorite = toggleFavorite;
window.copyToClipboard = copyToClipboard;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
