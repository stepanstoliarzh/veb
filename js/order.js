const API_URL = "https://68f2b214fd14a9fcc426b137.mockapi.io/api/orders";

async function loadOrders() {
  const tableBody = document.querySelector("#ordersTable tbody");
  tableBody.innerHTML = "<tr><td colspan='8' class='loading'>Загрузка...</td></tr>";

  try {
    const response = await fetch(API_URL);
    const orders = await response.json();

    if (orders.length === 0) {
      tableBody.innerHTML = "<tr><td colspan='8'>Заказов пока нет</td></tr>";
      return;
    }

    tableBody.innerHTML = "";
    orders.forEach(order => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${order.id}</td>
        <td>${order.full_name || "—"}</td>
        <td>${order.phone || "—"}</td>
        <td>${order.delivery_type || "—"}</td>
        <td>${order.delivery_address || "—"}</td>
        <td>${order.total ? order.total + " ₽" : "—"}</td>
        <td>${formatDate(order.created_at)}</td>
        <td>
          <button class="btn-view" onclick="viewOrder('${order.id}')">👁</button>
          <button class="btn-delete" onclick="deleteOrder('${order.id}')">🗑</button>
        </td>
      `;

      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Ошибка при загрузке заказов:", error);
    tableBody.innerHTML = "<tr><td colspan='8'>Ошибка при загрузке данных</td></tr>";
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleString("ru-RU");
}

async function viewOrder(id) {
  const response = await fetch(`${API_URL}/${id}`);
  const order = await response.json();

  alert(`
Заказ №${order.id}
Имя: ${order.full_name}
Телефон: ${order.phone}
Доставка: ${order.delivery_type}
Адрес: ${order.delivery_address}
Время: ${order.delivery_time}
Оплата: ${order.payment}
Комментарий: ${order.comment}
Сумма: ${order.total} ₽
Дата: ${formatDate(order.created_at)}
  `);
}

async function deleteOrder(id) {
  if (!confirm("Удалить заказ №" + id + "?")) return;
  await fetch(`${API_URL}/${id}`, { method: "DELETE" });
  loadOrders();
}

document.addEventListener("DOMContentLoaded", loadOrders);
