document.addEventListener("DOMContentLoaded", () => {
  // Initialize Firebase services
  const db = firebase.firestore();
  const auth = firebase.auth();

  // Global state
  let cart = JSON.parse(localStorage.getItem("myCanteenCart")) || [];
  let canteens = [];
  let currentUser = null;

  // --- Helper Functions ---
  const updateCartCount = () => {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const headerCartCountElement = document.getElementById(
      "header-cart-item-count"
    );
    if (headerCartCountElement) {
      headerCartCountElement.textContent = totalItems;
      headerCartCountElement.style.display = totalItems > 0 ? "flex" : "none";
    }

    const floatingCartCountElement = document.getElementById("cart-item-count");
    if (floatingCartCountElement) {
      floatingCartCountElement.textContent = totalItems;
      floatingCartCountElement.style.display = totalItems > 0 ? "flex" : "none";
    }
  };

  const saveCart = () => {
    localStorage.setItem("myCanteenCart", JSON.stringify(cart));
    updateCartCount();
  };

  const formatRupiah = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getMenuDetails = (canteenId, menuId) => {
    const canteen = canteens.find((c) => c.id === canteenId);
    if (!canteen) return null;
    const menu = canteen.menus.find((m) => m.id === menuId);
    if (!menu) return null;
    return { ...menu, canteenName: canteen.name, canteenId: canteen.id };
  };

  const addToCart = (canteenId, menuId) => {
    if (!currentUser) {
      alert(
        "Silakan login terlebih dahulu untuk menambahkan item ke keranjang"
      );
      return;
    }

    const menuDetails = getMenuDetails(canteenId, menuId);

    if (menuDetails) {
      const existingItem = cart.find(
        (item) =>
          item.menuId === menuDetails.id &&
          item.canteenId === menuDetails.canteenId
      );

      if (existingItem) {
        existingItem.quantity++;
      } else {
        if (cart.length > 0 && cart[0].canteenId !== menuDetails.canteenId) {
          const confirmClearCart = confirm(
            "Keranjang Anda berisi item dari kantin lain. Apakah Anda ingin mengosongkan keranjang dan menambahkan item dari kantin ini?"
          );
          if (!confirmClearCart) {
            return;
          } else {
            cart = [];
          }
        }
        cart.push({
          canteenId: menuDetails.canteenId,
          canteenName: menuDetails.canteenName,
          menuId: menuDetails.id,
          menuName: menuDetails.name,
          price: menuDetails.price,
          image: menuDetails.image,
          quantity: 1,
        });
      }
      saveCart();
      alert(
        `${menuDetails.name} dari ${menuDetails.canteenName} ditambahkan ke keranjang!`
      );
    } else {
      alert("Menu tidak ditemukan.");
    }
  };

  // --- Fetch Data from Firebase ---
  const fetchCanteens = async () => {
    try {
      const snapshot = await db.collection("canteens").get();
      canteens = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          rating: data.rating || 4.0,
          status: data.status || "open",
          description: data.description || "Tidak ada deskripsi",
          image: data.image || "images/default-canteen.jpg",
          distance: data.distance || "1.0 km",
          time: data.time || "30 min",
          discount: data.discount || "",
          menus: data.menus || [],
        };
      });

      // Initialize pages based on current URL
      if (document.getElementById("popular-canteens")) {
        initHomepage();
      } else if (document.querySelector(".canteen-detail-page")) {
        initCanteenDetailPage();
      } else if (document.querySelector(".cart-page")) {
        initCartPage();
      }
    } catch (error) {
      console.error("Error fetching canteens:", error);
      alert("Gagal memuat data kantin. Silakan coba lagi nanti.");
    }
  };

  // --- Authentication ---
  const initAuth = () => {
    auth.onAuthStateChanged((user) => {
      currentUser = user;
      if (user) {
        console.log("User logged in:", user.email);
      } else {
        console.log("User logged out");
      }
    });
  };

  // --- Homepage Logic ---
  const initHomepage = () => {
    const popularCanteensSection = document.getElementById("popular-canteens");
    const recommendedMenusSection =
      document.getElementById("recommended-menus");
    const searchInput = document.getElementById("search-input");

    const renderCanteens = (filterText = "") => {
      if (!popularCanteensSection) return;
      popularCanteensSection.innerHTML = "";
      const filteredCanteens = canteens.filter((canteen) =>
        canteen.name.toLowerCase().includes(filterText.toLowerCase())
      );

      if (filteredCanteens.length === 0) {
        popularCanteensSection.innerHTML =
          '<p style="text-align: center; color: var(--light-text);">Tidak ada kantin ditemukan.</p>';
      }

      filteredCanteens.forEach((canteen) => {
        const canteenCard = document.createElement("a");
        canteenCard.href = `canteen.html?id=${canteen.id}`;
        canteenCard.classList.add("canteen-card");
        canteenCard.innerHTML = `
          <div class="canteen-image-container">
              <img src="${canteen.image}" alt="Foto ${canteen.name}">
              ${
                canteen.discount
                  ? `<div class="discount-badge">${canteen.discount}</div>`
                  : ""
              }
          </div>
          <div class="canteen-info">
              <div class="distance-time">${canteen.distance} • ${
          canteen.time
        }</div>
              <h3>${canteen.name}</h3>
              <div class="rating-info">
                  <i class="fas fa-star"></i> ${
                    canteen.rating
                  } <span class="rating-count">• ${
          canteen.rating > 4.5 ? "2rb+" : "700+"
        } rating</span>
              </div>
          </div>
        `;
        popularCanteensSection.appendChild(canteenCard);
      });
    };

    const renderRecommendedMenus = (filterText = "") => {
      if (!recommendedMenusSection) return;
      recommendedMenusSection.innerHTML = "";
      const allRecommendedMenus = [];
      canteens
        .filter((c) => c.status === "open")
        .forEach((canteen) => {
          canteen.menus.slice(0, 2).forEach((menu) => {
            allRecommendedMenus.push({
              ...menu,
              canteenName: canteen.name,
              canteenId: canteen.id,
            });
          });
        });

      const filteredMenus = allRecommendedMenus.filter(
        (menu) =>
          menu.name.toLowerCase().includes(filterText.toLowerCase()) ||
          menu.canteenName.toLowerCase().includes(filterText.toLowerCase())
      );

      if (filteredMenus.length === 0) {
        recommendedMenusSection.innerHTML =
          '<p style="text-align: center; color: var(--light-text);">Tidak ada menu rekomendasi ditemukan.</p>';
      }

      filteredMenus.forEach((menu) => {
        const menuCard = document.createElement("div");
        menuCard.classList.add("menu-card");
        menuCard.innerHTML = `
          <img src="${menu.image}" alt="Foto ${menu.name}">
          <h4>${menu.name}</h4>
          <p class="canteen-name">dari ${menu.canteenName}</p>
          <p class="price">${formatRupiah(menu.price)}</p>
          <button class="btn-add-to-cart" data-canteen-id="${
            menu.canteenId
          }" data-menu-id="${menu.id}">Tambah</button>
        `;
        recommendedMenusSection.appendChild(menuCard);
      });

      document.querySelectorAll(".btn-add-to-cart").forEach((button) => {
        button.addEventListener("click", (event) => {
          const canteenId = event.target.dataset.canteenId;
          const menuId = event.target.dataset.menuId;
          addToCart(canteenId, menuId);
        });
      });
    };

    renderCanteens();
    renderRecommendedMenus();

    if (searchInput) {
      searchInput.addEventListener("keyup", (event) => {
        const searchTerm = event.target.value;
        renderCanteens(searchTerm);
        renderRecommendedMenus(searchTerm);
      });
    }

    updateCartCount();
  };

  // --- Canteen Detail Page Logic ---
  const initCanteenDetailPage = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const canteenId = urlParams.get("id");
    const currentCanteen = canteens.find((c) => c.id === canteenId);

    if (currentCanteen) {
      document.getElementById("canteen-name-header").textContent =
        currentCanteen.name;
      document.getElementById("canteen-banner-img").src = currentCanteen.image;
      document.getElementById(
        "canteen-banner-img"
      ).alt = `Banner ${currentCanteen.name}`;
      document.getElementById("canteen-title").textContent =
        currentCanteen.name;
      document.getElementById("canteen-rating").textContent =
        currentCanteen.rating;
      const statusElement = document.getElementById("canteen-status");
      statusElement.textContent =
        currentCanteen.status === "open" ? "Buka" : "Tutup";
      statusElement.classList.add(currentCanteen.status);
      document.getElementById("canteen-description").textContent =
        currentCanteen.description;

      const menuListSection = document.getElementById("canteen-menu-list");
      const menuCategoriesNav = document.getElementById("menu-categories-nav");
      menuListSection.innerHTML = "";
      menuCategoriesNav.innerHTML = "";

      const categories = [
        ...new Set(currentCanteen.menus.map((menu) => menu.category)),
      ];

      categories.forEach((category, index) => {
        const categoryLink = document.createElement("a");
        const categoryId = `category-${category
          .replace(/\s+/g, "-")
          .toLowerCase()}`;
        categoryLink.href = `#${categoryId}`;
        categoryLink.classList.add("category-item");
        if (index === 0) categoryLink.classList.add("active");
        categoryLink.textContent = category;
        menuCategoriesNav.appendChild(categoryLink);

        const categoryHeading = document.createElement("h3");
        categoryHeading.id = categoryId;
        categoryHeading.textContent = category;
        menuListSection.appendChild(categoryHeading);

        const categoryMenus = currentCanteen.menus.filter(
          (menu) => menu.category === category
        );
        categoryMenus.forEach((menu) => {
          const menuItemCard = document.createElement("div");
          menuItemCard.classList.add("menu-item-card");
          menuItemCard.innerHTML = `
                <img src="${menu.image}" alt="Gambar ${menu.name}">
                <div class="menu-item-details">
                    <h4>${menu.name}</h4>
                    <p>${menu.description}</p>
                    <span class="price">${formatRupiah(menu.price)}</span>
                </div>
                <button class="btn-add-to-cart" data-canteen-id="${
                  currentCanteen.id
                }" data-menu-id="${menu.id}">Tambah</button>
            `;
          menuListSection.appendChild(menuItemCard);
        });
      });

      menuCategoriesNav.querySelectorAll(".category-item").forEach((link) => {
        link.addEventListener("click", function (e) {
          e.preventDefault();
          menuCategoriesNav
            .querySelectorAll(".category-item")
            .forEach((item) => item.classList.remove("active"));
          this.classList.add("active");
          const targetId = this.getAttribute("href").substring(1);
          const targetElement = document.getElementById(targetId);
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: "smooth" });
          }
        });
      });

      document.querySelectorAll(".btn-add-to-cart").forEach((button) => {
        button.addEventListener("click", (event) => {
          const canteenId = event.target.dataset.canteenId;
          const menuId = event.target.dataset.menuId;
          addToCart(canteenId, menuId);
        });
      });
    } else {
      alert("Kantin tidak ditemukan!");
      window.location.href = "index.html";
    }
    updateCartCount();
  };

  // --- Cart Page Logic ---
  const initCartPage = () => {
    const cartItemsList = document.getElementById("cart-items-list");
    const subtotalPriceElement = document.getElementById("subtotal-price");
    const totalPriceElement = document.getElementById("total-price");
    const placeOrderBtn = document.getElementById("place-order-btn");
    const qrisModal = document.getElementById("qris-modal");
    const closeModalBtn = document.querySelector("#qris-modal .close-button");
    const qrisAmountElement = document.getElementById("qris-amount");
    const qrisTimerElement = document.getElementById("qris-timer");
    const paymentDoneBtn = document.getElementById("payment-done-btn");

    const SERVICE_FEE = 2000;

    const renderCartItems = () => {
      if (!cartItemsList || !subtotalPriceElement || !totalPriceElement) return;

      cartItemsList.innerHTML = "";
      let subtotal = 0;

      if (cart.length === 0) {
        cartItemsList.innerHTML =
          '<p class="empty-cart-message">Keranjang belanja Anda kosong. Yuk, cari makanan favoritmu!</p>';
        if (placeOrderBtn) placeOrderBtn.disabled = true;
      } else {
        if (placeOrderBtn) placeOrderBtn.disabled = false;
        cart.forEach((item) => {
          const cartItemDiv = document.createElement("div");
          cartItemDiv.classList.add("cart-item");
          cartItemDiv.innerHTML = `
                <img src="${item.image}" alt="Gambar ${item.menuName}">
                <div class="item-details">
                    <h4>${item.menuName}</h4>
                    <p class="canteen-name">${item.canteenName}</p>
                    <div class="item-actions">
                        <button class="quantity-btn minus" data-menu-id="${
                          item.menuId
                        }" data-canteen-id="${item.canteenId}">-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="quantity-btn plus" data-menu-id="${
                          item.menuId
                        }" data-canteen-id="${item.canteenId}">+</button>
                        <span class="item-price">${formatRupiah(
                          item.price * item.quantity
                        )}</span>
                        <button class="remove-item-btn" data-menu-id="${
                          item.menuId
                        }" data-canteen-id="${
            item.canteenId
          }"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            `;
          cartItemsList.appendChild(cartItemDiv);
          subtotal += item.price * item.quantity;
        });
      }

      subtotalPriceElement.textContent = formatRupiah(subtotal);
      totalPriceElement.textContent = formatRupiah(subtotal + SERVICE_FEE);
      if (qrisAmountElement)
        qrisAmountElement.textContent = formatRupiah(subtotal + SERVICE_FEE);

      document.querySelectorAll(".quantity-btn").forEach((button) => {
        button.addEventListener("click", (event) => {
          const menuId = event.target.dataset.menuId;
          const canteenId = event.target.dataset.canteenId;
          const item = cart.find(
            (i) => i.menuId === menuId && i.canteenId === canteenId
          );

          if (item) {
            if (event.target.classList.contains("plus")) {
              item.quantity++;
            } else if (event.target.classList.contains("minus")) {
              if (item.quantity > 1) {
                item.quantity--;
              }
            }
            saveCart();
            renderCartItems();
          }
        });
      });

      document.querySelectorAll(".remove-item-btn").forEach((button) => {
        button.addEventListener("click", (event) => {
          const targetButton = event.target.closest(".remove-item-btn");
          const menuId = targetButton.dataset.menuId;
          const canteenId = targetButton.dataset.canteenId;

          cart = cart.filter(
            (item) => !(item.menuId === menuId && item.canteenId === canteenId)
          );
          saveCart();
          renderCartItems();
        });
      });
    };

    const placeOrder = async () => {
      if (!currentUser) {
        alert("Silakan login terlebih dahulu untuk memesan");
        return;
      }

      if (cart.length === 0) {
        alert("Keranjang belanja Anda masih kosong.");
        return;
      }

      try {
        const orderData = {
          userId: currentUser.uid,
          userName: currentUser.displayName || currentUser.email,
          canteenId: cart[0].canteenId,
          canteenName: cart[0].canteenName,
          items: cart.map((item) => ({
            menuId: item.menuId,
            menuName: item.menuName,
            price: item.price,
            quantity: item.quantity,
          })),
          subtotal: cart.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          ),
          serviceFee: SERVICE_FEE,
          total:
            cart.reduce((sum, item) => sum + item.price * item.quantity, 0) +
            SERVICE_FEE,
          status: "pending",
          paymentMethod: "qris",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection("orders").add(orderData);

        // Clear cart after successful order
        cart = [];
        saveCart();

        alert("Pesanan Anda telah berhasil dibuat!");
        window.location.href = "index.html";
      } catch (error) {
        console.error("Error placing order:", error);
        alert("Gagal membuat pesanan. Silakan coba lagi.");
      }
    };

    let qrisTimerInterval;
    let timeLeft = 300;

    const startQrisTimer = () => {
      timeLeft = 300;
      if (qrisTimerElement) qrisTimerElement.textContent = "05:00";

      qrisTimerInterval = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        if (qrisTimerElement) {
          qrisTimerElement.textContent = `${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }

        if (timeLeft <= 0) {
          clearInterval(qrisTimerInterval);
          if (qrisModal) qrisModal.style.display = "none";
          alert("Waktu pembayaran telah habis. Silakan buat pesanan baru.");
        }
      }, 1000);
    };

    const stopQrisTimer = () => {
      clearInterval(qrisTimerInterval);
    };

    if (placeOrderBtn) {
      placeOrderBtn.addEventListener("click", () => {
        if (qrisModal) qrisModal.style.display = "block";
        startQrisTimer();
      });
    }

    if (closeModalBtn) {
      closeModalBtn.addEventListener("click", () => {
        if (qrisModal) qrisModal.style.display = "none";
        stopQrisTimer();
      });
    }

    if (qrisModal) {
      window.addEventListener("click", (event) => {
        if (event.target === qrisModal) {
          qrisModal.style.display = "none";
          stopQrisTimer();
        }
      });
    }

    if (paymentDoneBtn) {
      paymentDoneBtn.addEventListener("click", () => {
        placeOrder();
        if (qrisModal) qrisModal.style.display = "none";
        stopQrisTimer();
      });
    }

    renderCartItems();
    updateCartCount();
  };

  // Initialize authentication and fetch data
  initAuth();
  fetchCanteens();
});
