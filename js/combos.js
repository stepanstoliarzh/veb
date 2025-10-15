async function loadCombos() {
  const API_URL = "https://stepanstoliarzh.github.io/veb/combo.json";
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Ошибка загрузки комбо: " + response.status);
    const data = await response.json();
    window.COMBOS = data;
    console.log("✅ Комбо успешно загружены:", data.length);
  } catch (error) {
    console.error("⚠️ Не удалось загрузить combo.json, используется резервный список.", error);

    window.COMBOS = [
      { keyword: 'combo1', name: 'Классический ланч', price: 1050, composition: 'Салат цезарь с курицей, Борщ из телятины, Спагетти болоньезе, Чай черный', image: 'lunch/combo/combo1.png' },
      { keyword: 'combo2', name: 'Домашний уют', price: 950, composition: 'Лапша домашняя с курицей, Пельмени в горшочке, Салат оливье, Морс ягодный', image: 'lunch/combo/combo2.png' },
      { keyword: 'combo3', name: 'Мясной хит', price: 1100, composition: 'Салат охотничий, Говядина под сырной шапкой, Лимонад бузинная мята', image: 'lunch/combo/combo3.png' },
      { keyword: 'combo4', name: 'Фитнес ланч', price: 970, composition: 'Салат греческий, Феттучини кон-фунги, Матча латте', image: 'lunch/combo/combo4.png' },
      { keyword: 'combo5', name: 'Морское вдохновение', price: 1350, composition: 'Салат цезарь с тигровыми креветками, Лосось под сливочно-икорным соусом, Чай облепиховый', image: 'lunch/combo/combo5.png' },
      { keyword: 'combo6', name: 'Тёплый обед', price: 950, composition: 'Тыквенный суп, Куриный кармашек, Чай имбирный', image: 'lunch/combo/combo6.png' },
      { keyword: 'combo7', name: 'Гурман сет', price: 1150, composition: 'Феттучини кон-фунги, Салат тёплый с куриной печенью, Шоколадный фондан, Сок персиковый', image: 'lunch/combo/combo7.png' },
      { keyword: 'combo8', name: 'Детский праздник', price: 580, composition: 'Салатик "Курочка Ряба", Супчик с фрикадельками, Куриные котлетки, Сок вишневый', image: 'lunch/combo/combo8.png' },
      { keyword: 'combo9', name: 'Мини-ланч', price: 1090, composition: 'Салат тёплый с куриной печенью, Котлеты из рыбы, Апельсиновый сок', image: 'lunch/combo/combo9.png' },
      { keyword: 'combo10', name: 'Шеф-комбо', price: 1250, composition: 'Гомадари, Салат цезарь с тигровыми креветками, Десерт семифредо, Морс ягодный', image: 'lunch/combo/combo10.png' }
    ];
  }

  // если у тебя есть функция initCombos — запусти её
  if (typeof initCombos === "function") initCombos();
}
loadCombos();
