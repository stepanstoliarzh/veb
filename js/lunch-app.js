// js/lunch-app.js
(() => {
  // Если на странице нет блоков режима — выходим
  if (!Array.isArray(window.DISHES)) return;

  // ===== Утилиты =====
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const byName = (a, b) => a.name.localeCompare(b.name, 'ru');

  // ===== Данные =====
  const data = window.DISHES.slice();

  const soups    = data.filter(d => d.category === 'soup').sort(byName);
  const mains    = data.filter(d => d.category === 'main').sort(byName);
  const drinks   = data.filter(d => d.category === 'drink').sort(byName);
  const salads   = data.filter(d => d.category === 'salad').sort(byName);
  const desserts = data.filter(d => d.category === 'dessert').sort(byName);
  const kids     = data.filter(d => d.category === 'kids').sort(byName);

  // ===== Корзина (localStorage) =====
  const CART_KEY = 'cart';
  const loadCart = () => {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; }
    catch { return {}; }
  };
  const saveCart = (obj) => {
    localStorage.setItem(CART_KEY, JSON.stringify(obj));
    updateCartBadge();
  };
  const cartCount = () => Object.values(loadCart())
    .reduce((s, it) => s + (Number(it.qty) || 0), 0);

  const updateCartBadge = () => {
    const val = cartCount();
    const idBadge = $('#cart-count');
    if (idBadge) idBadge.textContent = String(val);
    $$('.cart-count').forEach(b => b.textContent = String(val));
  };

  // Добавить одну позицию (свободный режим)
  const addSingle = (keyword, qty) => {
    if (!keyword || qty <= 0) return;
    const dish = data.find(d => d.keyword === keyword);
    if (!dish) return;

    const cart = loadCart();
    const id = 'single_' + keyword;

    if (!cart[id]) {
      cart[id] = {
        type: 'free',
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

  // Добавить бизнес-ланч как набор
  const addBusiness = (items, price) => {
    const cart = loadCart();
    const id = 'blanch_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    cart[id] = {
      type: 'business',
      id,
      items,
      qty: 1,
      price
    };
    saveCart(cart);
  };

  // Лёгкая анимация «полет к корзине»
  function flyToCart(startEl) {
    const cartLink = $('.cart-link') || $('#cart-count') || document.body;
    if (!startEl || !cartLink) return;

    const rectS = startEl.getBoundingClientRect();
    const rectC = cartLink.getBoundingClientRect();

    const dot = document.createElement('div');
    dot.style.position = 'fixed';
    dot.style.left = rectS.left + rectS.width / 2 + 'px';
    dot.style.top = rectS.top + rectS.height / 2 + 'px';
    dot.style.width = '18px';
    dot.style.height = '18px';
    dot.style.borderRadius = '50%';
    dot.style.background = '#2a7d2e';
    dot.style.zIndex = 9999;
    document.body.appendChild(dot);

    const dx = rectC.left - rectS.left;
    const dy = rectC.top - rectS.top;

    dot.animate(
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.3)`, opacity: 0.1 }
      ],
      { duration: 600, easing: 'ease-in-out' }
    ).onfinish = () => dot.remove();
  }

  // Обновляем бейдж при загрузке
  updateCartBadge();

  // =====================================================================
  //                           РЕЖИМЫ СТРАНИЦЫ
  // =====================================================================
  const modeSelect = $('#mode-select');  // селектор экранов
  const business   = $('#business');
  const free       = $('#free');

  // Безопасные гварды: если секций нет — тихо выходим (страница без ланча)
  if (!modeSelect && !business && !free) return;

  // Кнопки выбора режима (если присутствуют)
  if (modeSelect) {
    modeSelect.addEventListener('click', (e) => {
      const btn = e.target.closest('.mode-btn');
      if (!btn) return;
      const mode = btn.dataset.mode;
      modeSelect.classList.add('hidden');
      if (mode === 'business' && business) {
        business.classList.remove('hidden');
        updateVisibility();
        renderBusiness();
      } else if (free) {
        free.classList.remove('hidden');
        renderFree();
      }
    });
  }

  // Кнопки «назад» (если есть)
  $$('.back-btn[data-back]').forEach(b => {
    b.addEventListener('click', () => {
      if (business) business.classList.add('hidden');
      if (free) {
        free.classList.add('hidden');
        // Сброс счётчиков свободного режима
        freeTotal = 0;
        freeStage.clear();
        const cnt = $('[data-fcount]');
        if (cnt) cnt.textContent = '0';
      }
      if (modeSelect) modeSelect.classList.remove('hidden');
      // Перерисуем сетки на чистую
      renderFree();
    });
  });

  // =====================================================================
  //                          БИЗНЕС-ЛАНЧ
  // =====================================================================
  // Контейнеры сеток
  const gridSoup    = $('#grid-soup');
  const gridMain    = $('#grid-main');
  const gridDrink   = $('#grid-drink');
  const gridSalad   = $('#grid-salad');
  const gridDessert = $('#grid-dessert');

  // Боковая панель «Ваш выбор»
  const steps     = business ? business.querySelector('.layout') : null;
  const orderBox  = business ? business.querySelector('.order-box') : null;

  // Состояние выбранных блюд для бизнес-ланча
  const bSelected = {
    soup: new Map(),
    main: new Map(),
    drink: new Map(),
    salad: new Map(),
    dessert: new Map()
  };

  let bCount = 0; // общий счётчик выбранных позиций (для индикации)

  // Можно ли добавить из категории (если решим ограничивать)
  const canAdd = (/*category*/) => true; // сейчас не ограничиваем

  // Карточка для бизнес-ланча
  const cardB = (d) => {
    const qty = bSelected[d.category].get(d.keyword) || 0;
    return `
      <div class="dish ${qty>0 ? 'selected' : ''}" data-key="${d.keyword}" data-cat="${d.category}">
        <img src="${d.image}" alt="${d.name}">
        <p class="price">${d.price}₽</p>
        <p class="name">${d.name}</p>
        <p class="weight">${d.count}</p>
        <div class="actions">
          <button class="${qty>0 ? 'btn-selected' : ''}" data-add ${!canAdd(d.category) && qty===0 ? 'disabled' : ''}>
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

  function inc(key, cat) {
    const cur = bSelected[cat].get(key) || 0;
    bSelected[cat].set(key, cur + 1);
    bCount++;
    const bc = $('[data-bcount]');
    if (bc) bc.textContent = String(bCount);
  }
  function dec(key, cat) {
    const cur = bSelected[cat].get(key) || 0;
    if (cur > 1) {
      bSelected[cat].set(key, cur - 1);
      bCount--;
    } else if (cur === 1) {
      bSelected[cat].delete(key);
      bCount--;
    }
    const bc = $('[data-bcount]');
    if (bc) bc.textContent = String(bCount);
  }

  function updateVisibility() {
    // Можем подсвечивать шаги/кнопку «Добавить в корзину»
    // Ничего не ломаем, просто тихо выходим, если DOM-узлов нет.
    if (!steps || !orderBox) return;
  }

  function renderBusiness() {
    if (gridSoup)    gridSoup.innerHTML    = soups.map(cardB).join('');
    if (gridMain)    gridMain.innerHTML    = mains.map(cardB).join('');
    if (gridDrink)   gridDrink.innerHTML   = drinks.map(cardB).join('');
    if (gridSalad)   gridSalad.innerHTML   = salads.map(cardB).join('');
    if (gridDessert) gridDessert.innerHTML = desserts.map(cardB).join('');

    [gridSoup, gridMain, gridDrink, gridSalad, gridDessert]
      .filter(Boolean)
      .forEach(g => {
        g.onclick = (e) => {
          const c = e.target.closest('.dish'); if (!c) return;
          const key = c.dataset.key, cat = c.dataset.cat;
          if (e.target.dataset.add !== undefined) { if (!canAdd(cat) && !bSelected[cat].has(key)) return; inc(key, cat); renderBusiness(); updateBox(); }
          if (e.target.dataset.act === 'inc')     { inc(key, cat); renderBusiness(); updateBox(); }
          if (e.target.dataset.act === 'dec')     { dec(key, cat); renderBusiness(); updateBox(); }
        };
      });

    updateBox();
  }

  function updateBox() {
    const sumEl = $('[data-bsum]');
    if (!orderBox || !sumEl) return;

    let sum = 0;
    ['soup', 'main', 'drink', 'salad', 'dessert'].forEach(cat => {
      const ul = $(`[data-list="${cat}"]`);
      if (!ul) return;
      ul.innerHTML = '';

      if (!bSelected[cat].size) {
        const li = document.createElement('li');
        li.textContent = (cat === 'drink') ? 'Напиток не выбран' : 'Не выбрано';
        li.style.color = '#a00';
        ul.appendChild(li);
      } else {
        for (const [key, qty] of bSelected[cat].entries()) {
          const dish = data.find(x => x.keyword === key);
          if (!dish) continue;
          sum += dish.price * qty;
          const li = document.createElement('li');
          li.textContent = `${dish.name}${qty > 1 ? ' ×' + qty : ''}`;
          ul.appendChild(li);
        }
      }
    });

    sumEl.textContent = `${sum}₽`;
  }

  // Кнопка «Добавить в корзину» (бизнес-ланч)
  const bAddBtn = $('[data-badd]');
  if (bAddBtn) {
    bAddBtn.addEventListener('click', () => {
      let sum = 0;
      const items = {
        soup: Array.from(bSelected.soup.entries()),
        main: Array.from(bSelected.main.entries()),
        drink: Array.from(bSelected.drink.entries()),
        salad: Array.from(bSelected.salad.entries()),
        dessert: Array.from(bSelected.dessert.entries())
      };

      ['soup', 'main', 'drink', 'salad', 'dessert'].forEach(cat => {
        for (const [key, qty] of bSelected[cat].entries()) {
          const dish = data.find(x => x.keyword === key);
          if (!dish) continue;
          sum += dish.price * qty;
        }
      });

      // Добавляем только если есть минимум что-то осмысленное
      if (items.soup.length || items.main.length || items.drink.length) {
        addBusiness(items, sum);
        // Сброс выбора
        bSelected.soup.clear();
        bSelected.main.clear();
        bSelected.drink.clear();
        bSelected.salad.clear();
        bSelected.dessert.clear();
        bCount = 0;
        const bc = $('[data-bcount]'); if (bc) bc.textContent = '0';
        updateVisibility();
        renderBusiness();
      }
    });
  }

  // =====================================================================
  //                          СВОБОДНЫЙ РЕЖИМ
  // =====================================================================
  const freeSoup    = $('#free-soup');
  const freeMain    = $('#free-main');
  const freeDrink   = $('#free-drink');
  const freeSalad   = $('#free-salad');
  const freeDessert = $('#free-dessert');
  const freeKids    = $('#free-kids');

  let freeTotal = 0;                    // выбранные позиции до добавления в корзину (индикатор)
  const FREE_LIMIT = 10;                // просто подсказка пользователю
  const freeStage = new Map();          // временное количество по блюду
  const fCountEl  = $('[data-fcount]'); // индикатор «выбрано позиций»

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

  // ===== Фильтры (ЛР5) =====
  // Храним активный фильтр для каждой категории (кроме kids)
  const activeFilters = {
    soup: null,    // fish | meat | veg
    main: null,    // fish | meat | veg
    drink: null,   // cold | hot
    salad: null,   // fish | meat | veg
    dessert: null  // small | medium | large
  };

  function applyFilter(list, kind) {
    if (!kind) return list;
    return list.filter(d => d.kind === kind);
  }

  function renderCategory(list, container, cat) {
    if (!container) return;
    const filtered = applyFilter(list, activeFilters[cat]);
    container.innerHTML = filtered.map(cardF).join('');
  }

  function renderFree() {
    renderCategory(soups,    freeSoup,    'soup');
    renderCategory(mains,    freeMain,    'main');
    renderCategory(drinks,   freeDrink,   'drink');
    renderCategory(salads,   freeSalad,   'salad');
    renderCategory(desserts, freeDessert, 'dessert');

    if (freeKids) freeKids.innerHTML = kids.map(cardF).join('');

    // Делегирование кликов для каждой сетки
    [freeSoup, freeMain, freeDrink, freeSalad, freeDessert, freeKids]
      .filter(Boolean)
      .forEach(g => {
        g.onclick = (e) => {
          const card = e.target.closest('.dish'); if (!card) return;
          const key = card.dataset.key;
          const cur = freeStage.get(key) || 1;

          if (e.target.dataset.act === 'inc') {
            freeStage.set(key, cur + 1);
            renderFree();
            return;
          }
          if (e.target.dataset.act === 'dec') {
            freeStage.set(key, Math.max(1, cur - 1));
            renderFree();
            return;
          }
          if (e.target.dataset.add !== undefined) {
            // лимит чисто визуальный, чтобы был понятен счётчик
            const inCart = cartCount();
            let addQty = freeStage.get(key) || 1;
            if (inCart + addQty > FREE_LIMIT) {
              addQty = Math.max(0, FREE_LIMIT - inCart);
            }
            if (addQty > 0) {
              flyToCart(card);
              addSingle(key, addQty);
              freeTotal = inCart + addQty;
              if (fCountEl) fCountEl.textContent = String(Math.min(freeTotal, FREE_LIMIT));
            }
          }
        };
      });
  }

  // Навешиваем обработчики на кнопки фильтров (если есть в верстке)
  $$('.filters').forEach(panel => {
    panel.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-kind]');
      if (!btn) return;

      // Определяем категорию из id следующей сетки внутри секции
      const section = btn.closest('section');
      const grid = section && section.querySelector('.dishes-grid');
      if (!grid || !grid.id.startsWith('free-')) return;

      const cat = grid.id.replace('free-', '');    // soup | main | drink | salad | dessert
      const kind = btn.dataset.kind;               // fish/meat/veg/... по методичке

      // Переключаем активное состояние
      if (activeFilters[cat] === kind) {
        activeFilters[cat] = null;
        btn.classList.remove('active');
      } else {
        activeFilters[cat] = kind;
        // снимаем active со всех в панели и ставим на текущую
        $$('.filters button', panel).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }

      renderFree();
    });
  });

  // Первая отрисовка свободного режима (если открыт)
  renderFree();
})();
