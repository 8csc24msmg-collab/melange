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

  cartElement.innerHTML = "";

  let total = 0;

  cart.forEach((item, index) => {
    total += item.price;

    const itemElement = document.createElement("div");

    itemElement.className = "cart-item";

    itemElement.innerHTML = `
      <span>${item.name}</span>
      <span>${item.price} ₸</span>
    `;

    cartElement.appendChild(itemElement);
  });

  totalElement.textContent = `Итого: ${total} ₸`;
}