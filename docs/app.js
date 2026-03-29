const gridContainer = document.getElementById('grid-container');
const configSelect = document.getElementById('config-select');

let heroData = {};

async function init() {
    try {
        // Fetch hero list from GitHub (CORS friendly)
        const heroRes = await fetch('https://raw.githubusercontent.com/Egezenn/OpenDotaGuides/refs/heads/main/constants/heroes.csv');
        const heroText = await heroRes.text();
        
        // Simple CSV parser
        const lines = heroText.trim().split('\n');
        const headers = lines[0].split(',');
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            const id = parseInt(cols[0]);
            const localizedName = cols[1];
            const fullName = cols[2];
            
            heroData[id] = {
                name: fullName.replace('npc_dota_hero_', ''),
                displayName: localizedName
            };
        }

        // Fetch local config
        const configRes = await fetch('hero_grid_config.json');
        const configJson = await configRes.json();

        configJson.configs.forEach((config, index) => {
            const btn = document.createElement('button');
            btn.className = 'config-btn';
            btn.textContent = config.config_name;
            btn.onclick = () => {
                document.querySelectorAll('.config-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderGrid(config);
            };
            configSelect.appendChild(btn);
            if (index === 0) btn.classList.add('active');
        });

    window.addEventListener('resize', () => {
        if (configSelect.querySelector('.active')) {
            const activeIndex = Array.from(configSelect.children).indexOf(configSelect.querySelector('.active'));
            renderGrid(configJson.configs[activeIndex]);
        }
    });

        if (configJson.configs.length > 0) {
            renderGrid(configJson.configs[0]);
        }
    } catch (err) {
        console.error('Failed to initialize renderer:', err);
        gridContainer.innerHTML = `<div style="color:red; padding:20px;">Error loading data: ${err.message}</div>`;
    }
}

function renderGrid(config) {
    gridContainer.innerHTML = '';
    
    // Create a wrapper for scaling
    const scaleWrapper = document.createElement('div');
    scaleWrapper.id = 'scale-wrapper';
    gridContainer.appendChild(scaleWrapper);

    let maxRight = 0;
    config.categories.forEach(cat => {
        maxRight = Math.max(maxRight, cat.x_position + cat.width);
        
        const catEl = document.createElement('div');
        catEl.className = 'category';
        catEl.style.left = `${cat.x_position}px`;
        catEl.style.top = `${cat.y_position}px`;
        catEl.style.width = `${cat.width}px`;
        catEl.style.height = `${cat.height}px`;

        const header = document.createElement('div');
        header.className = 'category-header';
        header.textContent = cat.category_name;
        catEl.appendChild(header);

        const heroList = document.createElement('div');
        heroList.className = 'hero-list';
        
        cat.hero_ids.forEach(id => {
            const hero = heroData[id];
            if (hero) {
                const boxEl = document.createElement('div');
                boxEl.className = 'hero-box';
                boxEl.title = hero.displayName; // Tooltip for full name
                boxEl.textContent = hero.displayName;
                heroList.appendChild(boxEl);
            }
        });
        
        catEl.appendChild(heroList);
        scaleWrapper.appendChild(catEl);
    });

    // Apply scaling
    const padding = 0;
    const availableWidth = gridContainer.clientWidth - padding;
    if (maxRight > 0) {
        const scale = Math.min(availableWidth / maxRight, 1.5); // Cap at 1.5x zoom
        scaleWrapper.style.transform = `scale(${scale})`;
        scaleWrapper.style.width = `${maxRight}px`;
    }
}

init();
