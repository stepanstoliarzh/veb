// js/order.js
const API_URL = "https://68f2b214fd14a9fcc426b137.mockapi.io/api/orders";

/* ===== Форматирование для таблицы ===== */
function formatDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleString("ru-RU");
}

// 1) Состав заказа – красиво кратко
function formatItems(items) {
  if (!items) return "—";
  // если в БД по ошибке лежит строка — попытаемся распарсить
  if (typeof items === "string") {
    try { items = JSON.parse(items); } catch { /* игнор */ }
  }
  if (!Array.isArray(items)) return "—";

  // ожидаем объекты вида {name, qty, type, ...}
  const parts = items.map((it) => {
    // название
    let title =
      it?.name ||
      (it?.type === "business" ? "Бизнес-ланч" :
       it?.type === "combo" ? "Комбо" : "Позиция");

    // количество
    const qty = Number(it?.qty) > 1 ? ` ×${it.qty}` : "";
    return `${title}${qty}`;
  });

  return parts.length ? parts.join(", ") : "—";
}

// 2) Время доставки – русские подписи
function formatDeliveryTime(deliveryType, time) {
  // самовывоз — нет времени доставки
  if (deliveryType === "pickup") return "—";

  if (!time || time === "soon") {
    return "Как можно скорее (с 7:00 до 23:00)";
  }
  // уже указано конкретное время (напр. "17:06")
  return time;
}

/* ===== Загрузка и рендер списка ===== */
async function loadOrders() {
  const tableBody = document.querySelector("#ordersTable tbody");
  tableBody.innerHTML = "<tr><td colspan='8' class='loading'>Загрузка...</td></tr>";

  try {
    const response = await fetch(API_URL);
    const orders = await response.json();

    if (!Array.isArray(orders) || orders.length === 0) {
      tableBody.innerHTML = "<tr><td colspan='8'>Заказов пока нет</td></tr>";
      return;
    }

    tableBody.innerHTML = "";
    orders.forEach((order) => {
      const row = document.createElement("tr");

      const itemsText = formatItems(order.items);
      const timeText = formatDeliveryTime(order.delivery_type, order.delivery_time);

      row.innerHTML = `
        <td>${order.id}</td>
        <td>${formatDate(order.created_at)}</td>
        <td>${itemsText}</td>
        <td>${order.total ? order.total + " ₽" : "—"}</td>
        <td>${timeText}</td>
        <td>
          <button class="btn-view"  onclick="viewOrder('${order.id}')" title="Посмотреть">👁</button>
          <button class="btn-edit"  onclick="editOrder('${order.id}')" title="Редактировать">🖉</button>
          <button class="btn-delete" onclick="deleteOrder('${order.id}')" title="Удалить">🗑</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Ошибка при загрузке заказов:", error);
    tableBody.innerHTML = "<tr><td colspan='8'>Ошибка при загрузке данных</td></tr>";
  }
}

/* ===== Просмотр / Редактирование / Удаление ===== */
async function viewOrder(id) {
  const res = await fetch(`${API_URL}/${id}`);
  const order = await res.json();

  const kv = [
    ["Дата оформления", formatDate(order.created_at)],
    ["Тип доставки", order.delivery_type === "pickup" ? "Самовывоз" : "Доставка"],
    ["Имя", order.full_name || "—"],
    ["Телефон", order.phone || "—"],
    ["Email", order.email || "—"],
    ["Адрес", order.delivery_address || "—"],
    ["Комментарий", order.comment || "—"],
    ["Стоимость", order.total ? `${order.total} ₽` : "—"],
  ];

  const box = document.getElementById("orderDetails");
  box.innerHTML = kv
    .map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`)
    .join("");

  document.getElementById("viewModal").classList.remove("hidden");
}

async function editOrder(id) {
  const response = await fetch(`${API_URL}/${id}`);
  const order = await response.json();

  document.getElementById("editModal").classList.remove("hidden");
  document.getElementById("editForm").dataset.id = id;
  document.getElementById("editName").value = order.full_name || "";
  document.getElementById("editEmail").value = order.email || "";
  document.getElementById("editPhone").value = order.phone || "";
  document.getElementById("editAddress").value = order.delivery_address || "";
  document.getElementById("editComment").value = order.comment || "";
}

document.getElementById("editForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = e.target.dataset.id;

  const updatedOrder = {
    full_name: document.getElementById("editName").value,
    email: document.getElementById("editEmail").value,
    phone: document.getElementById("editPhone").value,
    delivery_address: document.getElementById("editAddress").value,
    comment: document.getElementById("editComment").value,
  };

  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedOrder),
  });

  if (response.ok) {
    showToast("Заказ успешно изменён");
    closeModal("editModal");
    loadOrders();
  } else {
    showToast("Ошибка при изменении заказа", true);
  }
});

let deleteId = null;

async function deleteOrder(id) {
  deleteId = id;
  document.getElementById("deleteText").textContent = `Вы уверены, что хотите удалить заказ №${id}?`;
  document.getElementById("deleteModal").classList.remove("hidden");
}

document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
  if (!deleteId) return;

  const res = await fetch(`${API_URL}/${deleteId}`, { method: "DELETE" });
  if (res.ok) {
    showToast(`Заказ №${deleteId} удалён`);
    closeModal("deleteModal");
    loadOrders();
  } else {
    showToast("Ошибка при удалении заказа", true);
  }
  deleteId = null;
});

/* ===== Модалки и тост ===== */
function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

function showToast(message, error = false) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${error ? "error" : ""}`;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("visible"), 10);
  setTimeout(() => toast.classList.remove("visible"), 3000);
}

document.addEventListener("DOMContentLoaded", loadOrders);
