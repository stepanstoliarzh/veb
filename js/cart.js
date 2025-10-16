// js/cart.js
document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "https://edu.std-900.ist.mospolytech.ru";
  const API_KEY = "d81cdbfb-4744-4d11-aafb-1417de1e1937";

  // ======== УТИЛИТЫ ========
  function loadCart() {
    try {
      const data = JSON.parse(localStorage.getItem("cart")) || {};
      return data;
    } catch {
      return {};
    }
  }

  function saveCart(cart) {
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartBadge();
  }

  function clearCart() {
    localStorage.removeItem("cart");
    updateCartBadge();
  }

  function updateCartBadge() {
    const cart = loadCart();
    let count = 0;
    for (const category in cart) {
      if (cart[category] && Array.isArray(cart[category])) {
        count += cart[category].length;
      }
    }
    document.querySelectorAll(".cart-count").forEach(el => (el.textContent = count));
  }

  // ======== ОТОБРАЖЕНИЕ СОСТАВА ЗАКАЗА ========
  async function renderOrderItems() {
    const orderItemsContainer = document.getElementById("order-items");
    const orderSummaryContainer = document.getElementById("order-summary");
    const totalPriceContainer = document.getElementById("total-price");
    
    if (!orderItemsContainer || !orderSummaryContainer || !totalPriceContainer) return;

    const cart = loadCart();
    let hasItems = false;
    let totalPrice = 0;

    // Проверяем, есть ли вообще блюда в корзине
    for (const category in cart) {
      if (cart[category] && cart[category].length > 0) {
        hasItems = true;
        break;
      }
    }

    if (!hasItems) {
      orderItemsContainer.innerHTML = `
        <div class="empty-cart-message">
          <p>Ничего не выбрано. Чтобы добавить блюда в заказ, перейдите на страницу <a href="lunch.html">Собрать ланч</a>.</p>
        </div>
      `;
      orderSummaryContainer.innerHTML = "<p>Ничего не выбрано</p>";
      totalPriceContainer.textContent = "Итого: 0 руб.";
      return;
    }

    // Загружаем данные о блюдах с сервера
    try {
      const response = await fetch(`${API_URL}/api/dishes?api_key=${API_KEY}`);
      if (!response.ok) throw new Error("Ошибка загрузки данных о блюдах");
      
      const allDishes = await response.json();
      const dishesMap = {};
      allDishes.forEach(dish => {
        dishesMap[dish.id] = dish;
      });

      // Отображаем состав заказа
      let orderItemsHTML = '';
      let orderSummaryHTML = '<ul class="order-summary-list">';
      
      for (const category in cart) {
        if (cart[category] && cart[category].length > 0) {
          orderItemsHTML += `<h3>${getCategoryName(category)}</h3>`;
          orderItemsHTML += '<div class="dishes-grid">';
          
          cart[category].forEach(dishId => {
            const dish = dishesMap[dishId];
            if (dish) {
              totalPrice += dish.price || 0;
              
              orderItemsHTML += `
                <div class="dish-card" data-dish-id="${dish.id}">
                  <img src="${dish.image_url || 'images/placeholder.jpg'}" alt="${dish.name}" class="dish-img">
                  <div class="dish-info">
                    <h4>${dish.name}</h4>
                    <p class="dish-desc">${dish.description || ''}</p>
                    <div class="dish-price">${dish.price || 0} руб.</div>
                  </div>
                  <button class="btn-remove" onclick="removeFromCart('${category}', ${dish.id})">Удалить</button>
                </div>
              `;
              
              orderSummaryHTML += `
                <li class="order-summary-item">
                  <span>${dish.name}</span>
                  <span>${dish.price || 0} руб.</span>
                </li>
              `;
            }
          });
          
          orderItemsHTML += '</div>';
        } else {
          // Если для категории ничего не выбрано
          orderSummaryHTML += `
            <li class="order-summary-item not-selected">
              <span>${getCategoryName(category)}: Не выбрано</span>
            </li>
          `;
        }
      }
      
      orderSummaryHTML += '</ul>';
      
      orderItemsContainer.innerHTML = orderItemsHTML;
      orderSummaryContainer.innerHTML = orderSummaryHTML;
      totalPriceContainer.textContent = `Итого: ${totalPrice} руб.`;

    } catch (error) {
      console.error("Ошибка при загрузке данных о блюдах:", error);
      orderItemsContainer.innerHTML = "<p>Ошибка загрузки данных о блюдах</p>";
    }
  }

  // ======== УДАЛЕНИЕ ИЗ КОРЗИНЫ ========
  function removeFromCart(category, dishId) {
    const cart = loadCart();
    if (cart[category] && Array.isArray(cart[category])) {
      cart[category] = cart[category].filter(id => id !== dishId);
      saveCart(cart);
      renderOrderItems();
    }
  }

  // Глобальная функция для использования в onclick
  window.removeFromCart = removeFromCart;

  // ======== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ========
  function getCategoryName(category) {
    const names = {
      'soup': 'Супы',
      'main': 'Главные блюда', 
      'drink': 'Напитки',
      'salad': 'Салаты',
      'dessert': 'Десерты'
    };
    return names[category] || category;
  }

  // ======== ЛОГИКА ФОРМЫ ЗАКАЗА ========
  const form = document.getElementById("order-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const cart = loadCart();
      
      // Проверяем, что корзина не пуста
      let hasItems = false;
      for (const category in cart) {
        if (cart[category] && cart[category].length > 0) {
          hasItems = true;
          break;
        }
      }

      if (!hasItems) {
        alert("Корзина пуста. Добавьте блюда для оформления заказа.");
        return;
      }

      // Проверяем комбо (должен быть выбран хотя бы напиток)
      if (!cart.drink || cart.drink.length === 0) {
        alert("Для оформления заказа необходимо выбрать напиток.");
        return;
      }

      // Собираем данные формы
      const formData = {
        full_name: document.getElementById('full_name').value.trim(),
        email: document.getElementById('email').value.trim(),
        subscribe: document.getElementById('subscribe').checked ? 1 : 0,
        phone: document.getElementById('phone').value.trim(),
        delivery_address: document.getElementById('delivery_address').value.trim(),
        delivery_type: document.getElementById('delivery_type').value,
        comment: document.getElementById('comment').value.trim() || "",
        student_id: 241353
      };

      // Добавляем время доставки если нужно
      if (formData.delivery_type === 'by_time') {
        const deliveryTime = document.getElementById('delivery_time').value;
        if (!deliveryTime) {
          alert("Пожалуйста, укажите время доставки.");
          return;
        }
        formData.delivery_time = deliveryTime;
      }

      // Добавляем ID блюд
      if (cart.soup && cart.soup.length > 0) formData.soup_id = cart.soup[0];
      if (cart.main && cart.main.length > 0) formData.main_course_id = cart.main[0];
      if (cart.salad && cart.salad.length > 0) formData.salad_id = cart.salad[0];
      if (cart.drink && cart.drink.length > 0) formData.drink_id = cart.drink[0];
      if (cart.dessert && cart.dessert.length > 0) formData.dessert_id = cart.dessert[0];

      // Валидация обязательных полей
      if (!formData.full_name || !formData.email || !formData.phone || !formData.delivery_address) {
        alert("Пожалуйста, заполните все обязательные поля.");
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/orders?api_key=${API_KEY}`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json"
          },
          body: JSON.stringify(formData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Ошибка при отправке заказа");
        }

        const result = await response.json();
        console.log("Заказ успешно создан:", result);
        alert("✅ Заказ успешно оформлен!");
        clearCart();
        renderOrderItems();
        
        // Очищаем форму
        form.reset();
        
      } catch (err) {
        console.error("Ошибка оформления заказа:", err);
        alert(`❌ Не удалось оформить заказ: ${err.message}`);
      }
    });
  }

  // ======== ЛОГИКА ФОРМЫ ========
  const deliveryType = document.getElementById("delivery_type");
  const deliveryTimeRow = document.getElementById("delivery-time-row");

  deliveryType?.addEventListener("change", () => {
    if (deliveryType.value === "by_time") {
      deliveryTimeRow.classList.remove("hidden");
    } else {
      deliveryTimeRow.classList.add("hidden");
    }
  });

  // ======== ИНИЦИАЛИЗАЦИЯ ========
  updateCartBadge();
  renderOrderItems();
});
