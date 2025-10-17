// js/cart.js
// === ФУНКЦИИ ДЛЯ РАБОТЫ С КОРЗИНОЙ ===

// Получаем данные из localStorage
function getCart() {
  return JSON.parse(localStorage.getItem("cart") || "{}");
}

// Сохраняем корзину
function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

// Удаляем товар по id
function removeFromCart(id) {
  const cart = getCart();
  delete cart[id];
  saveCart(cart);
  renderCart();
}

// Считаем общую сумму
function calculateTotal() {
  const cart = getCart();
  return Object.values(cart).reduce((sum, item) => sum + item.price * (item.qty || 1), 0);
}

// === ОТРИСОВКА КОРЗИНЫ ===
async function renderCart() {
  const cartContainer = document.querySelector(".cart-items");
  const totalElement = document.querySelector(".total-amount");
  const cart = getCart();

  if (!cartContainer || !totalElement) return;

  cartContainer.innerHTML = "";

  const items = Object.values(cart);

  if (items.length === 0) {
    cartContainer.innerHTML = `
      <p class="empty-cart">
        Ничего не выбрано. Чтобы добавить блюда в заказ, перейдите на страницу 
        <a href="lunch.html">Собрать ланч</a>.
      </p>`;
    totalElement.textContent = "0 ₽";
    return;
  }

  // Загружаем блюда (чтобы получить полные данные)
  const response = await fetch("dishes.json");
  const dishes = await response.json();

  for (const item of items) {
    const dish = dishes.find(d => d.id === item.id);
    if (!dish) continue;

    const itemElement = document.createElement("div");
    itemElement.classList.add("cart-item");
    itemElement.innerHTML = `
      <img src="${dish.image}" alt="${dish.name}" class="cart-item-img">
      <div class="cart-item-info">
        <h4>${dish.name}</h4>
        <p>${dish.price} ₽</p>
        <button class="remove-btn" data-id="${dish.id}">Удалить</button>
      </div>
    `;
    cartContainer.appendChild(itemElement);
  }

  // Обновляем общую сумму
  totalElement.textContent = `${calculateTotal()} ₽`;

  // Добавляем слушатели на кнопки удаления
  document.querySelectorAll(".remove-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-id");
      removeFromCart(id);
    });
  });
}

// === ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ===
document.addEventListener("DOMContentLoaded", () => {
  renderCart();
});

// === ОТПРАВКА ЗАКАЗА НА MOCKAPI ===
document.querySelector(".order-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);
  const orderData = Object.fromEntries(formData.entries());

  const cart = getCart();
  const items = Object.values(cart);
  const total = calculateTotal();

  // Проверка: пустой заказ
  if (items.length === 0) {
    alert("❌ Вы не выбрали ни одного блюда!");
    return;
  }

  // Создаём объект заказа
  const order = {
    full_name: orderData.full_name,
    email: orderData.email,
    phone: orderData.phone,
    delivery_address: orderData.delivery_address,
    delivery_type: orderData.delivery_type || "pickup",
    delivery_time: orderData.delivery_time || "",
    comment: orderData.comment || "",
    items: items,
    total: total,
    created_at: new Date().toISOString()
  };

  try {
    const response = await fetch("https://68f2b214fd14a9fcc426b137.mockapi.io/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order)
    });

    if (!response.ok) throw new Error("Ошибка при отправке заказа");

    alert("✅ Заказ успешно оформлен!");
    localStorage.removeItem("cart");
    form.reset();
    document.querySelector(".cart-items").innerHTML =
      `<p class="empty-cart">Ваш заказ успешно отправлен!</p>`;
    document.querySelector(".total-amount").textContent = "0 ₽";
  } catch (err) {
    alert("❌ Не удалось оформить заказ: " + err.message);
  }
});
