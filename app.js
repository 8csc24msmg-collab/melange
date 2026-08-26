const API = "https://melange-3.onrender.com";

const KASPI_PAYMENT_URL =
  "https://pay.kaspi.kz/pay/ndmk0ruy";

let cart = [];


/* =========================
   ДОБАВЛЕНИЕ В КОРЗИНУ
========================= */

function addToCart(name, price) {

  cart.push({
    name: name,
    price: Number(price),
    quantity: 1
  });

  updateCart();
}


/* =========================
   КОРЗИНА
========================= */

function updateCart() {

  const cartElement =
    document.getElementById("cart");

  const totalElement =
    document.getElementById("total");

  const countElement =
    document.getElementById("cartCount");

  const checkoutTotal =
    document.getElementById("checkoutTotal");

  if (!cartElement) return;

  cartElement.innerHTML = "";

  let total = 0;
  let count = 0;

  cart.forEach((item) => {

    const quantity =
      Number(item.quantity) || 1;

    const price =
      Number(item.price) || 0;

    const sum =
      price * quantity;

    total += sum;
    count += quantity;

    const itemElement =
      document.createElement("div");

    itemElement.className =
      "cart-item";

    itemElement.innerHTML = `

      <span>
        ${escapeHTML(item.name)}
        × ${quantity}
      </span>

      <strong>
        ${sum.toLocaleString("ru-RU")} ₸
      </strong>

    `;

    cartElement.appendChild(itemElement);

  });


  if (totalElement) {

    totalElement.textContent =
      total.toLocaleString("ru-RU") +
      " ₸";

  }


  if (countElement) {

    countElement.textContent =
      count;

  }


  if (checkoutTotal) {

    checkoutTotal.textContent =
      total.toLocaleString("ru-RU") +
      " ₸";

  }

}


/* =========================
   ОФОРМЛЕНИЕ
========================= */

function openCheckout() {

  if (cart.length === 0) {

    alert(
      "Сначала добавьте товар в корзину ☕"
    );

    return;

  }

  const checkout =
    document.getElementById("checkout");

  if (checkout) {

    checkout.classList.remove("hidden");

    checkout.scrollIntoView({
      behavior: "smooth"
    });

  }

  updateCart();

}


/* =========================
   ЗАКРЫТЬ ОФОРМЛЕНИЕ
========================= */

function closeCheckout() {

  const checkout =
    document.getElementById("checkout");

  if (checkout) {

    checkout.classList.add("hidden");

  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* =========================
   СОЗДАНИЕ ЗАКАЗА
========================= */

async function payByCard() {

  const nameElement =
    document.getElementById("name");

  const phoneElement =
    document.getElementById("phone");

  const deliveryElement =
    document.getElementById("delivery");

  const addressElement =
    document.getElementById("address");


  const name =
    nameElement
      ? nameElement.value.trim()
      : "";

  const phone =
    phoneElement
      ? phoneElement.value.trim()
      : "";

  const delivery =
    deliveryElement
      ? deliveryElement.value
      : "Самовывоз";

  const address =
    addressElement
      ? addressElement.value.trim()
      : "";


  /* Проверки */

  if (!name) {

    alert(
      "Введите ваше имя 🤎"
    );

    return false;

  }


  if (!phone) {

    alert(
      "Введите номер телефона 📱"
    );

    return false;

  }


  if (
    delivery === "Доставка" &&
    !address
  ) {

    alert(
      "Введите адрес доставки 📍"
    );

    return false;

  }


  if (cart.length === 0) {

    alert(
      "Корзина пуста ☕"
    );

    return false;

  }


  /* Считаем сумму */

  const total =
    cart.reduce(
      (sum, item) => {

        return sum +
          (
            Number(item.price) *
            (Number(item.quantity) || 1)
          );

      },
      0
    );


  try {

    console.log(
      "Отправляем заказ на:",
      API + "/api/orders"
    );


    const response =
      await fetch(
        API + "/api/orders",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            name: name,

            phone: phone,

            items: cart,

            total: total,

            delivery: delivery,

            address: address

          })

        }
      );


    const data =
      await response.json();


    console.log(
      "Ответ сервера:",
      data
    );


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Ошибка отправки заказа"
      );

    }


    /* Заказ создан */

    alert(
      "Заказ №" +
      data.orderId +
      " создан! Сейчас откроется Kaspi 🤎"
    );


    /*
      Переходим на страницу оплаты Kaspi
    */

    window.location.href =
      KASPI_PAYMENT_URL;


    return true;


  } catch (error) {

    console.error(
      "ОШИБКА ЗАКАЗА:",
      error
    );


    alert(
      "Не удалось отправить заказ.\n\n" +
      error.message
    );

    return false;

  }

}


/* =========================
   ОПЛАТА KASPI
========================= */

async function payWithKaspi() {

  await payByCard();

}


/* =========================
   ПРОВЕРКА СЕРВЕРА
========================= */

async function checkServer() {

  try {

    const response =
      await fetch(
        API + "/api/health"
      );

    const data =
      await response.json();

    console.log(
      "Melange server:",
      data
    );

  } catch (error) {

    console.error(
      "Сервер недоступен:",
      error
    );

  }

}


/* =========================
   ЭКРАНИРОВАНИЕ ТЕКСТА
========================= */

function escapeHTML(value) {

  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


/* =========================
   ЗАПУСК
========================= */

updateCart();

checkServer();