(() => {
  if (!document.querySelector('#mode-select')) return;

  const data = Array.isArray(window.DISHES) ? window.DISHES.slice() : [];
  const byName = (a, b) => a.name.localeCompare(b.name, 'ru');

  const soups  = data.filter(d => d.category === 'soup').sort(byName);
  const mains  = data.filter(d => d.category === 'main').sort(byName);
  const drinks = data.filter(d => d.category === 'drink').sort(byName);

  const $  = (sel, root = document) => root.querySelector(sel);

  // ===== CART
  const CART_KEY = "cart";
  const loadCart = () => { 
    try { 
      return JSON.parse(localStorage.getItem(CART_KEY)) || {}; 
    } catch { 
      return {}; 
    } 
  };
  const saveCart = (obj) => { 
    localStorage.setItem(CART_KEY, JSON.stringify(obj));
    updateCartBadge(); 
  };
  const addSingle = (keyword, qty) => {
  if (qty <= 0) return;
  const cart = loadCart();
  const dish = data.find(d => d.keyword === keyword);
  if (!dish) return;

  const id = "single_" + keyword;
  if (!cart[id]) {
    cart[id] = {
      type: "free",
      keyword: dish.keyword,
      name: dish.name,
      price: dish.price,
      img: dish.image,
      desc: dish.count, 
      qty: 0
    };
  }
  cart[id].qty += qty;
  saveCart(cart);
};
  const addBusiness = (items, price) => {
    const cart = loadCart();
    const id = "blanch_" + Date.now() + "_" + Math.floor(Math.random()*1000);
    cart[id] = { type: "business", id, items, qty: 1, price };
    saveCart(cart);
  };
  const cartCount = () => Object.values(loadCart()).reduce((s, it) => s + (it.qty || 0), 0);
  const updateCartBadge = () => { 
    const b = document.querySelector('.cart-count'); 
    if (b) b.textContent = cartCount(); 
  };
  updateCartBadge();

  // ===== Переключение режимов
  const modeSelect = $('#mode-select');
  const business   = $('#business');
  const free       = $('#free');
  const steps      = business.querySelector('.layout');
  const orderBox   = business.querySelector('.order-box');

  modeSelect.addEventListener('click', (e) => {
    const btn = e.target.closest('.mode-btn'); if (!btn) return;
    const mode = btn.dataset.mode;
    modeSelect.classList.add('hidden');
    if (mode === 'business') {
      business.classList.remove('hidden');
      updateVisibility();
      renderBusiness();
    } else {
      free.classList.remove('hidden');
    }
  });
  document.querySelectorAll('[data-back]').forEach(b =>
    b.addEventListener('click', () => {
      business.classList.add('hidden');
      free.classList.add('hidden');
      modeSelect.classList.remove('hidden');
    })
  );

  // ===== БИЗНЕС-ЛАНЧ
  let bCount = 0;
  const bSelected = { soup: new Map(), main: new Map(), drink: new Map() };

  const updateVisibility = () => {
    if (bCount > 0) { steps.classList.remove('hidden'); orderBox.classList.remove('hidden'); }
    else { steps.classList.add('hidden'); orderBox.classList.add('hidden'); }
  };

  $('[data-bplus]').addEventListener('click', () => {
    bCount = Math.min(10, bCount + 1);
    $('[data-bcount]').textContent = bCount;
    updateVisibility(); renderBusiness();
  });
  $('[data-bminus]').addEventListener('click', () => {
    bCount = Math.max(0, bCount - 1);
    $('[data-bcount]').textContent = bCount;
    updateVisibility(); renderBusiness();
  });

  const gridSoup  = $('#grid-soup');
  const gridMain  = $('#grid-main');
  const gridDrink = $('#grid-drink');

  const totalCat = (cat) => [...bSelected[cat].values()].reduce((s,n)=>s+n,0);
  const canAdd   = (cat) => bCount > 0 && totalCat(cat) < bCount;
  const inc = (key, cat) => { if (!canAdd(cat)) return; bSelected[cat].set(key, (bSelected[cat].get(key) || 0) + 1); };
  const dec = (key, cat) => { const m = bSelected[cat], cur = m.get(key) || 0; if (cur <= 1) m.delete(key); else m.set(key, cur - 1); };

  const cardB = (d) => {
    const qty = bSelected[d.category].get(d.keyword) || 0;
    return `
      <div class="dish ${qty>0 ? 'selected' : ''}" data-key="${d.keyword}" data-cat="${d.category}">
        <img src="${d.image}" alt="${d.name}">
        <p class="price">${d.price}₽</p>
        <p class="name">${d.name}</p>
        <p class="weight">${d.count}</p>
        <div class="actions">
          <button class="${qty>0?'btn-selected':''}" data-add ${!canAdd(d.category)&&qty===0?'disabled':''}>
            ${qty>0 ? 'Выбрано' : 'Выбрать'}
          </button>
          ${qty>0 ? `
            <div class="qty">
              <button class="qbtn" data-act="dec">−</button>
              <span class="qval">${qty}</span>
              <button class="qbtn" data-act="inc">+</button>
            </div>` : ''}
        </div>
      </div>`;
  };

  function renderBusiness() {
    gridSoup.innerHTML  = soups.map(cardB).join('');
    gridMain.innerHTML  = mains.map(cardB).join('');
    gridDrink.innerHTML = drinks.map(cardB).join('');
    [gridSoup, gridMain, gridDrink].forEach(g => {
      g.onclick = (e) => {
        const c = e.target.closest('.dish'); if (!c) return;
        const key = c.dataset.key, cat = c.dataset.cat;
        if (e.target.dataset.add !== undefined) { if (bCount === 0) return; inc(key, cat); renderBusiness(); updateBox(); }
        if (e.target.dataset.act === 'inc')     { inc(key, cat); renderBusiness(); updateBox(); }
        if (e.target.dataset.act === 'dec')     { dec(key, cat); renderBusiness(); updateBox(); }
      };
    });
    updateBox();
  }

  function updateBox() {
    let sum = 0;
    ['soup', 'main', 'drink'].forEach(cat => {
      const ul = $(`[data-list="${cat}"]`); ul.innerHTML = '';
      if (!bSelected[cat].size) {
        const li = document.createElement('li');
        li.textContent = cat === 'drink' ? 'Напиток не выбран' : 'Не выбрано';
        li.style.color = '#a00';
        ul.appendChild(li);
      } else {
        for (const [key, qty] of bSelected[cat].entries()) {
          const dish = data.find(x => x.keyword === key);
          sum += dish.price * qty;
          const li = document.createElement('li');
          li.textContent = `${dish.name}${qty>1 ? ' ×' + qty : ''}`;
          ul.appendChild(li);
        }
      }
    });
    $('[data-bsum]').textContent = `${sum}₽`;
  }

  // Добавить в корзину (бизнес-ланч)
  $('[data-badd]').addEventListener('click', () => {
    let sum = 0;
    const items = {
      soup: Array.from(bSelected.soup.entries()),
      main: Array.from(bSelected.main.entries()),
      drink: Array.from(bSelected.drink.entries())
    };
    ['soup','main','drink'].forEach(cat=>{
      for(const [key, qty] of bSelected[cat].entries()){
        const dish = data.find(x => x.keyword === key);
        sum += dish.price * qty;
      }
    });
    if (items.soup.length || items.main.length || items.drink.length) addBusiness(items, sum);

    bSelected.soup.clear(); bSelected.main.clear(); bSelected.drink.clear();
    bCount = 0; $('[data-bcount]').textContent = '0';
    updateVisibility(); renderBusiness();
  });

  // ===== СВОБОДНЫЙ РЕЖИМ
  let freeTotal = 0;
  const FREE_LIMIT = 10;
  const freeStage = new Map();
  const fCountEl  = $('[data-fcount]');
  const freeSoup  = $('#free-soup');
  const freeMain  = $('#free-main');
  const freeDrink = $('#free-drink');

  function flyToCart(startElement){
    const cartIcon = document.querySelector('.cart-link');
    const rect = startElement.getBoundingClientRect();
    const cartRect = cartIcon.getBoundingClientRect();

    const circle = document.createElement('div');
    circle.style.position = 'fixed';
    circle.style.left = rect.left + rect.width/2 + 'px';
    circle.style.top = rect.top + rect.height/2 + 'px';
    circle.style.width = '20px';
    circle.style.height = '20px';
    circle.style.background = '#2a7d2e';
    circle.style.borderRadius = '50%';
    circle.style.zIndex = 1000;
    document.body.appendChild(circle);

    circle.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${cartRect.left-rect.left}px, ${cartRect.top-rect.top}px) scale(0.3)`, opacity: 0.6 }
    ], { duration: 600, easing: 'ease-in-out' }).onfinish = () => circle.remove();
  }

  const cardF = (d) => {
    const qty = freeStage.get(d.keyword) || 1;
    return `
      <div class="dish" data-key="${d.keyword}">
        <img src="${d.image}" alt="${d.name}">
        <p class="price">${d.price}₽</p>
        <p class="name">${d.name}</p>
        <p class="weight">${d.count}</p>
        <div class="free-actions">
          <div class="qty">
            <button class="qbtn" data-act="dec">−</button>
            <span class="qval">${qty}</span>
            <button class="qbtn" data-act="inc">+</button>
          </div>
          <button class="add-btn" data-add>В корзину</button>
        </div>
      </div>`;
  };

  function renderFree() {
    freeSoup.innerHTML  = soups.map(cardF).join('');
    freeMain.innerHTML  = mains.map(cardF).join('');
    freeDrink.innerHTML = drinks.map(cardF).join('');

    [freeSoup, freeMain, freeDrink].forEach(g => {
      g.onclick = (e) => {
        const c = e.target.closest('.dish'); 
        if (!c) return;
        const key = c.dataset.key;
        const cur = freeStage.get(key) || 1;

        if (e.target.dataset.act === 'inc') {
          freeStage.set(key, cur + 1);
          renderFree();
        }
        if (e.target.dataset.act === 'dec') {
          freeStage.set(key, Math.max(1, cur - 1));
          renderFree();
        }
        if (e.target.dataset.add !== undefined) {
          freeTotal = cartCount();
          if (freeTotal >= FREE_LIMIT) return;

          let add = freeStage.get(key) || 1;
          if (freeTotal + add > FREE_LIMIT) {
            add = FREE_LIMIT - freeTotal;
          }

          freeTotal += add;
          fCountEl.textContent = freeTotal;

          flyToCart(c);

          addSingle(key, add);
          updateCartBadge();
        }
      };
    });
  }

  // сброс при выходе из режима
  document.querySelectorAll('[data-back]').forEach(b =>
    b.addEventListener('click', () => {
      business.classList.add('hidden');
      free.classList.add('hidden');
      modeSelect.classList.remove('hidden');

      freeTotal = 0;
      freeStage.clear();
      fCountEl.textContent = "0";
      renderFree();
    })
  );

  renderFree();

})();
