let cart = [];

function addToCart(name, price) {
  cart.push({
    name: name,
    price: price
  });

  updateCart();
}

function updateCart() {
  const cartElement = document.getElementById("cart");
  const totalElement = document.getElementById("total");
  const countElement = document.getElementById("cartCount");
  const checkoutTotal = document.getElementById("checkoutTotal");

  cartElement.innerHTML = "";

  let total = 0;

  cart.forEach((item, index) => {
    total += item.price;

    const itemElement = document.createElement("div");

    itemElement.className = "cart-item";

    itemElement.innerHTML = `
      <span>${item.name}</span>
      <strong>${item.price.toLocaleString("ru-RU")} ₸</strong>
    `;

    cartElement.appendChild(itemElement);
  });

  totalElement.textContent =
    `${total.toLocaleString("ru-RU")} ₸`;

  countElement.textContent = cart.length;

  checkoutTotal.textContent =
    `${total.toLocaleString("ru-RU")} ₸`;
}


function openCheckout() {

  if (cart.length === 0) {
    alert("Сначала добавьте товар в корзину ☕");
    return;
  }

  const checkout = document.getElementById("checkout");

  checkout.classList.remove("hidden");

  checkout.scrollIntoView({
    behavior: "smooth"
  });

  updateCart();
}


function closeCheckout() {

  const checkout = document.getElementById("checkout");

  checkout.classList.add("hidden");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


function payByCard() {

  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const delivery = document.getElementById("delivery").value;
  const address = document.getElementById("address").value.trim();

  if (!name) {
    alert("Введите ваше имя");
    return;
  }

  if (!phone) {
    alert("Введите номер телефона");
    return;
  }

  if (delivery === "Доставка" && !address) {
    alert("Введите адрес доставки");
    return;
  }

  /*
    Пока здесь только подготовка заказа.

    Настоящая оплата банковской картой
    подключается через платёжный сервис.
  */

  alert(
    "Заказ подготовлен 🤎\n\n" +
    "Оплата картой будет подключена следующим этапом."
  );
}