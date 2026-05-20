import './style.css';
import { Dota2Datafeed } from 'dota2-datawrapper';

const api = Dota2Datafeed.fromGitHub('Egezenn', 'dota2-datawrapper');

const favicon = document.createElement('link');
favicon.rel = 'icon';
favicon.href = Dota2Datafeed.urls.ASSET_URLS.FAVICON;
document.head.appendChild(favicon);

const gridContainer = document.getElementById('grid-container');
const configSelect = document.getElementById('config-select');

let heroData = {};

async function init() {
  try {
    const heroes = await api.getHeroes();

    heroes.forEach(hero => {
      heroData[hero.id] = {
        name: hero.name,
        displayName: hero.name_loc,
        imgUrl: Dota2Datafeed.urls.heroImage(hero.name),
      };
    });

    const configRes = await fetch('./hero_grid_config.json');
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
      const active = configSelect.querySelector('.active');
      if (active) {
        const activeIndex = Array.from(configSelect.children).indexOf(active);
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
      if (!hero) return;

      const boxEl = document.createElement('div');
      boxEl.className = 'hero-box';
      boxEl.title = hero.displayName;

      const img = document.createElement('img');
      img.src = hero.imgUrl;
      img.alt = hero.displayName;
      img.loading = 'lazy';

      const nameEl = document.createElement('span');
      nameEl.className = 'hero-name';
      nameEl.textContent = hero.displayName;

      boxEl.appendChild(img);
      boxEl.appendChild(nameEl);
      heroList.appendChild(boxEl);
    });

    catEl.appendChild(heroList);
    scaleWrapper.appendChild(catEl);
  });

  const availableWidth = gridContainer.clientWidth;
  if (maxRight > 0) {
    const scale = Math.min(availableWidth / maxRight, 1.5);
    scaleWrapper.style.transform = `scale(${scale})`;
    scaleWrapper.style.width = `${maxRight}px`;
  }
}

init();
