document.addEventListener("DOMContentLoaded", () => {
  // Initialize systems
  initScrollTransition();
  initCart();
  initLookbookSlider();
  initNewsletter();
  initShopCarousel();
  initCurvedGalleryScroll();
});

/* ==========================================================================
   1. Scroll Background & Canvas Scrubbing
   ========================================================================== */
function initScrollTransition() {
  const canvas = document.getElementById("scroll-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("hero-scroll-overlay");
  const heroSection = document.getElementById("hero-scroll");

  const frameCount = 79;
  const currentFrame = index => `assets/frames/frame_${index.toString().padStart(4, '0')}.png`;

  // Preload Images
  const images = [];
  
  // Render first frame immediately
  const firstImg = new Image();
  firstImg.src = currentFrame(1);
  images.push(firstImg);
  firstImg.onload = () => {
    resizeCanvas();
  };

  // Preload remaining frames
  for (let i = 2; i <= frameCount; i++) {
    const img = new Image();
    img.src = currentFrame(i);
    images.push(img);
  }

  // Draw image on canvas with Retina/HiDPI contain fitting aspect ratio (HD sharp, no cutoffs)
  function drawImageContain(ctx, img) {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const containerW = canvas.parentElement.clientWidth;
    const containerH = canvas.parentElement.clientHeight;

    if (containerW <= 0 || containerH <= 0) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const iw = img.width;
    const ih = img.height;
    if (iw <= 0 || ih <= 0) return;

    // Mobile responsive scaling: Full height (92% height) on phones so model is large and prominent
    const isMobile = window.innerWidth <= 768;
    const scaleFactor = isMobile ? 0.92 : 0.83;
    const r = (isMobile ? (containerH / ih) : Math.min(containerW / iw, containerH / ih)) * scaleFactor;
    const nw = iw * r * dpr;
    const nh = ih * r * dpr;

    // Position model centered on desktop, and right-centered full height on mobile
    const cx = isMobile ? ((containerW * dpr) * 0.52 - nw * 0.5) : (((containerW * dpr) - nw) / 2);
    const cy = (containerH * dpr) - nh - ((containerH * dpr) * (isMobile ? 0.02 : 0.04));

    ctx.drawImage(img, cx, cy, nw, nh);
  }

  // Handle Resize with HiDPI scale factor
  function resizeCanvas() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const containerW = canvas.parentElement.clientWidth;
    const containerH = canvas.parentElement.clientHeight;

    canvas.width = Math.floor(containerW * dpr);
    canvas.height = Math.floor(containerH * dpr);
    canvas.style.width = containerW + "px";
    canvas.style.height = containerH + "px";
    
    // Draw current frame on resize
    const scrollY = window.scrollY;
    const heroScrollHeight = heroSection.offsetHeight - window.innerHeight;
    const heroProgress = heroScrollHeight > 0 ? Math.max(0, Math.min(1, scrollY / heroScrollHeight)) : 0;
    const frameIndex = Math.min(frameCount - 1, Math.floor(heroProgress * (frameCount - 1)));
    if (images[frameIndex] && (images[frameIndex].complete || frameIndex === 0)) {
      drawImageContain(ctx, images[frameIndex]);
    }
  }

  window.addEventListener("resize", resizeCanvas);
  setTimeout(resizeCanvas, 100);

  const handleScroll = () => {
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return;

    // 1. Scrub Canvas Frames based on Hero section scroll depth
    const heroScrollHeight = heroSection.offsetHeight - window.innerHeight;
    const heroProgress = heroScrollHeight > 0 ? Math.max(0, Math.min(1, scrollY / heroScrollHeight)) : 0;
    
    const frameIndex = Math.min(frameCount - 1, Math.floor(heroProgress * (frameCount - 1)));
    if (images[frameIndex] && (images[frameIndex].complete || frameIndex === 0)) {
      drawImageContain(ctx, images[frameIndex]);
    }

    // 2. Hero Text Overlay fade out and scale down (fades out completely by 35% scroll)
    const textFadeEnd = 0.35;
    const textProgress = Math.max(0, Math.min(1, heroProgress / textFadeEnd));
    const opacity = 1 - textProgress;
    const scale = 1 - textProgress * 0.05;
    const translateY = -textProgress * 50;

    if (overlay) {
      overlay.style.opacity = opacity;
      overlay.style.transform = `translateY(${translateY}px) scale(${scale})`;
      overlay.style.pointerEvents = opacity < 0.1 ? "none" : "auto";
    }

    // 2b. Skateboard Video Fades IN into the left blank area ONLY AFTER text has completely faded out
    const leftVideoWrapper = document.getElementById("hero-scroll-video-wrapper");
    if (leftVideoWrapper) {
      const videoFadeStart = 0.38;
      const videoFadeEnd = 0.75;
      const videoProgress = Math.max(0, Math.min(1, (heroProgress - videoFadeStart) / (videoFadeEnd - videoFadeStart)));
      
      leftVideoWrapper.style.opacity = videoProgress;
      leftVideoWrapper.style.transform = `translateY(${(1 - videoProgress) * 30}px) scale(${0.95 + videoProgress * 0.05})`;
    }

    // 3. Keep background and text color consistent and high-contrast
    const header = document.getElementById("main-header");
    if (header) {
      if (scrollY > 100) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
    }
  };

  window.addEventListener("scroll", handleScroll, { passive: true });

  // Preloader fade-out (with readyState safeguard to avoid load race condition)
  const fadeOutPreloader = () => {
    const preloader = document.getElementById("preloader");
    if (preloader) {
      setTimeout(() => {
        preloader.classList.add("fade-out");
        document.body.classList.remove("loading");
      }, 800);
    }
  };

  if (document.readyState === "complete" || document.readyState === "interactive") {
    fadeOutPreloader();
  } else {
    window.addEventListener("load", fadeOutPreloader);
  }

  handleScroll();
}

/* ==========================================================================
   2. Shopping Cart & Checkout System
   ========================================================================== */
let cart = [];

function initCart() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("cart-overlay");
  const trigger = document.getElementById("cart-trigger");
  const closeBtn = document.getElementById("cart-close");
  const checkoutBtn = document.getElementById("checkout-btn");
  const modal = document.getElementById("checkout-modal");
  const modalClose = document.getElementById("modal-close");
  const modalOk = document.getElementById("modal-ok-btn");

  // Open / Close Drawer
  const openDrawer = () => {
    drawer.classList.add("open");
    overlay.classList.add("open");
  };

  const closeDrawer = () => {
    drawer.classList.remove("open");
    overlay.classList.remove("open");
  };

  trigger.addEventListener("click", openDrawer);
  closeBtn.addEventListener("click", closeDrawer);
  overlay.addEventListener("click", closeDrawer);

  // Quick Add handler for products grid
  document.querySelectorAll(".quick-add-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const card = btn.closest(".product-card");
      const id = card.dataset.id;
      const name = card.dataset.name;
      const price = parseFloat(card.dataset.price);
      const img = card.dataset.img;

      addToCart({ id, name, price, img }, "M");
    });
  });

  // Modal checkout trigger
  checkoutBtn.addEventListener("click", () => {
    closeDrawer();
    cart = [];
    renderCart();
    modal.classList.add("open");
  });

  const closeModal = () => {
    modal.classList.remove("open");
  };
  modalClose.addEventListener("click", closeModal);
  modalOk.addEventListener("click", closeModal);
}

function addToCart(product, size = "M") {
  // Check if item already exists in cart with same size
  const existing = cart.find(item => item.id === product.id && item.size === size);
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({
      ...product,
      size,
      quantity: 1
    });
  }

  renderCart();
  showToast(`ADDED // ${product.name.toUpperCase()} Secured.`);
  
  // Auto open cart drawer
  document.getElementById("cart-drawer").classList.add("open");
  document.getElementById("cart-overlay").classList.add("open");
}

function removeFromCart(id, size) {
  cart = cart.filter(item => !(item.id === id && item.size === size));
  renderCart();
}

function updateQuantity(id, size, delta) {
  const item = cart.find(item => item.id === id && item.size === size);
  if (item) {
    item.quantity += delta;
    if (item.quantity <= 0) {
      removeFromCart(id, size);
    } else {
      renderCart();
    }
  }
}

function renderCart() {
  const cartItemsContainer = document.getElementById("cart-items");
  const cartBadge = document.getElementById("cart-badge");
  const cartSubtotal = document.getElementById("cart-subtotal");
  const checkoutBtn = document.getElementById("checkout-btn");

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartBadge.innerText = totalItems;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="empty-cart-message">
        YOUR CART IS EMPTY. ADD PIECES FROM THE DROP.
      </div>
    `;
    cartSubtotal.innerText = "$0.00";
    checkoutBtn.disabled = true;
    return;
  }

  checkoutBtn.disabled = false;
  let subtotal = 0;

  cartItemsContainer.innerHTML = cart.map(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    
    return `
      <div class="cart-item">
        <div class="cart-item-img-wrap">
          <img src="${item.img}" alt="${item.name}" class="cart-item-img">
        </div>
        <div class="cart-item-details">
          <div>
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-size">SIZE: ${item.size}</div>
          </div>
          <div class="cart-item-quantity">
            <button class="qty-btn" onclick="updateQuantity('${item.id}', '${item.size}', -1)">-</button>
            <span>${item.quantity}</span>
            <button class="qty-btn" onclick="updateQuantity('${item.id}', '${item.size}', 1)">+</button>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end;">
          <button class="cart-item-remove" onclick="removeFromCart('${item.id}', '${item.size}')">REMOVE</button>
          <span class="cart-item-price">$${itemTotal.toFixed(2)}</span>
        </div>
      </div>
    `;
  }).join("");

  cartSubtotal.innerText = `$${subtotal.toFixed(2)}`;
}

window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;

/* ==========================================================================
   3. Focus Lookbook Slider (3-Item Center Focus)
   ========================================================================== */
const lookbookData = [
  {
    id: "lb1",
    name: "INK LINEN SHIRT",
    price: "74.00",
    img: "assets/model3.png",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["black", "grey", "beige"],
    desc: "An elevated relaxed-fit cut constructed from organic linen fibers. Lightweight weave engineered for breathability during humid conditions."
  },
  {
    id: "lb2",
    name: "UNBROKEN STRIPE TEE",
    price: "68.00",
    img: "assets/model4.png",
    sizes: ["S", "M", "L"],
    colors: ["pink", "darkred", "black"],
    desc: "Oversized silhouette cut from heavy 300gsm cotton. Distressed edges with vintage pigment wash look."
  },
  {
    id: "lb3",
    name: "STEALTH CARGO PANTS",
    price: "110.00",
    img: "assets/model5.png",
    sizes: ["28", "30", "32", "34"],
    colors: ["olive", "black"],
    desc: "Heavyweight utility cargos with multiple zipper pockets, adjustable ankle cuffs, and reinforced knee pads."
  }
];

let activeLookbookIndex = 0;
let activeLookbookSize = "M";
let activeLookbookColor = "black";

function initLookbookSlider() {
  const prevBtn = document.getElementById("lookbook-prev-btn");
  const nextBtn = document.getElementById("lookbook-next-btn");
  
  const slidePrev = document.getElementById("slide-prev");
  const slideActive = document.getElementById("slide-active");
  const slideNext = document.getElementById("slide-next");
  const mainImg = document.getElementById("lookbook-main-img");

  const title = document.getElementById("lookbook-title");
  const price = document.getElementById("lookbook-price");
  const sizesContainer = document.getElementById("lookbook-sizes");
  const colorsContainer = document.getElementById("lookbook-colors");
  const addBtn = document.getElementById("lookbook-add-btn");
  const addBtnPrice = document.getElementById("lookbook-btn-price");
  const descTeaser = document.querySelector(".product-description-teaser");

  const updateSlider = (dir) => {


    // Slide reveal animations
    const details = document.querySelector(".lookbook-details");
    if (dir === "next") {
      slideActive.classList.add("switching-next");
      activeLookbookIndex = (activeLookbookIndex + 1) % lookbookData.length;
    } else {
      slideActive.classList.add("switching-prev");
      activeLookbookIndex = (activeLookbookIndex - 1 + lookbookData.length) % lookbookData.length;
    }
    if (details) details.classList.add("switching-details");

    const activeOutfit = lookbookData[activeLookbookIndex];
    const prevOutfit = lookbookData[(activeLookbookIndex - 1 + lookbookData.length) % lookbookData.length];
    const nextOutfit = lookbookData[(activeLookbookIndex + 1) % lookbookData.length];

    activeLookbookSize = activeOutfit.sizes[Math.floor(activeOutfit.sizes.length / 2)] || activeOutfit.sizes[0];
    activeLookbookColor = activeOutfit.colors[0];

    // Fade Out side slides
    slidePrev.style.opacity = 0.1;
    slideNext.style.opacity = 0.1;

    setTimeout(() => {
      // Set images
      slidePrev.querySelector("img").src = prevOutfit.img;
      slideActive.querySelector("img").src = activeOutfit.img;
      slideNext.querySelector("img").src = nextOutfit.img;

      // Update details content
      title.innerText = activeOutfit.name;
      price.innerText = `$${activeOutfit.price}`;
      addBtnPrice.innerHTML = `$${activeOutfit.price} // <span class="bag-icon">🛍</span>`;
      descTeaser.innerText = activeOutfit.desc;

      // Render Sizes
      sizesContainer.innerHTML = activeOutfit.sizes.map(sz => {
        const activeClass = sz === activeLookbookSize ? "active" : "";
        return `<span class="size-opt ${activeClass}" data-size="${sz}">${sz}</span>`;
      }).join("");

      // Render Colors
      colorsContainer.innerHTML = activeOutfit.colors.map((c, i) => {
        const activeClass = c === activeLookbookColor ? "active" : "";
        let inlineColor = c;
        if (c === "olive") inlineColor = "#556b2f";
        if (c === "darkred") inlineColor = "#8b0000";
        if (c === "beige") inlineColor = "#d4c5b9";
        return `<span class="color-opt ${activeClass}" data-color="${c}" style="background: ${inlineColor};"></span>`;
      }).join("");

      // Re-bind listeners
      bindOptionListeners();

      // Switch to slide-in reveal classes
      slideActive.classList.remove("switching-next", "switching-prev");
      slideActive.classList.add("switching-in");
      if (details) details.classList.remove("switching-details");

      // Fade back in
      slidePrev.style.opacity = 0.4;
      slideActive.style.opacity = 1;
      slideNext.style.opacity = 0.4;

      setTimeout(() => {
        slideActive.classList.remove("switching-in");
      }, 600);
    }, 300);
  };

  const bindOptionListeners = () => {
    // Sizing trigger
    sizesContainer.querySelectorAll(".size-opt").forEach(opt => {
      opt.addEventListener("click", () => {
        sizesContainer.querySelectorAll(".size-opt").forEach(o => o.classList.remove("active"));
        opt.classList.add("active");
        activeLookbookSize = opt.dataset.size;
      });
    });

    // Color trigger
    colorsContainer.querySelectorAll(".color-opt").forEach(opt => {
      opt.addEventListener("click", () => {
        colorsContainer.querySelectorAll(".color-opt").forEach(o => o.classList.remove("active"));
        opt.classList.add("active");
        activeLookbookColor = opt.dataset.color;
      });
    });
  };

  prevBtn.addEventListener("click", () => updateSlider("prev"));
  nextBtn.addEventListener("click", () => updateSlider("next"));

  addBtn.addEventListener("click", () => {
    const outfit = lookbookData[activeLookbookIndex];
    addToCart({
      id: outfit.id,
      name: outfit.name + " (" + activeLookbookColor.toUpperCase() + ")",
      price: parseFloat(outfit.price),
      img: outfit.img
    }, activeLookbookSize);
  });

  // Initial load binding
  bindOptionListeners();
}

/* ==========================================================================
   4. Newsletter System
   ========================================================================== */
function initNewsletter() {
  const form = document.getElementById("newsletter-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = form.querySelector(".newsletter-input");
    const email = input.value;
    
    if (email) {
      showToast(`SUCCESS // ${email.toUpperCase()} RECRUITED.`);
      input.value = "";
    }
  });
}

/* ==========================================================================
   5. Toast Notification System
   ========================================================================== */
let toastTimeout;
function showToast(message) {
  const toast = document.getElementById("toast-notification");
  if (!toast) return;
  toast.innerText = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

/* ==========================================================================
   6. Shop Center Zoom Focus Carousel
   ========================================================================== */
function initShopCarousel() {
  const track = document.getElementById("products-carousel-track");
  const prevBtn = document.getElementById("shop-prev-btn");
  const nextBtn = document.getElementById("shop-next-btn");
  if (!track) return;

  function updateCenterCard() {
    const cards = track.querySelectorAll(".product-card");
    if (!cards.length) return;

    const trackRect = track.getBoundingClientRect();
    const trackCenter = trackRect.left + trackRect.width / 2;

    let closestCard = null;
    let minDistance = Infinity;

    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const cardCenter = rect.left + rect.width / 2;
      const distance = Math.abs(trackCenter - cardCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestCard = card;
      }
    });

    cards.forEach(card => {
      if (card === closestCard) {
        card.classList.add("in-center");
      } else {
        card.classList.remove("in-center");
      }
    });
  }

  track.addEventListener("scroll", updateCenterCard);
  window.addEventListener("resize", updateCenterCard);

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      track.scrollBy({ left: -360, behavior: "smooth" });
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      track.scrollBy({ left: 360, behavior: "smooth" });
    });
  }

  // Initial update
  setTimeout(updateCenterCard, 150);
}

/* ==========================================================================
   7. 3D Curved Gallery Scroll & Drag Parallax Engine
   ========================================================================== */
function initCurvedGalleryScroll() {
  const container = document.querySelector(".curved-carousel-container");
  const section = document.getElementById("gallery");
  if (!container || !section) return;

  const cards = container.querySelectorAll(".carousel-card");
  if (!cards.length) return;

  let dragOffset = 0;
  let targetDragOffset = 0;
  let isDragging = false;
  let startX = 0;
  let currentX = 0;

  function renderGalleryCards() {
    const isMobile = window.innerWidth <= 768;
    const spacing = isMobile ? 125 : 250;
    const dropY = isMobile ? 8 : 14;
    const rotDeg = isMobile ? 3.5 : 4.5;

    // Scroll progress over gallery section (-1.5 to +1.5 range)
    const rect = section.getBoundingClientRect();
    const winH = window.innerHeight;
    const scrollFactor = (winH / 2 - (rect.top + rect.height / 2)) / winH;
    const scrollOffset = scrollFactor * (isMobile ? 1.4 : 2.2);

    const totalOffset = targetDragOffset + scrollOffset;

    cards.forEach((card) => {
      const baseIdx = parseFloat(card.style.getPropertyValue("--card-index")) || 0;
      const idx = baseIdx + totalOffset;

      const tx = idx * spacing;
      const ty = idx * idx * dropY;
      const rot = idx * rotDeg;
      const scale = Math.max(0.4, 1 - Math.abs(idx) * 0.08);
      const opacity = Math.max(0.1, 1 - Math.abs(idx) * 0.16);
      const zIndex = Math.round(20 - Math.abs(idx) * 2);

      card.style.transform = `translateX(${tx.toFixed(1)}px) translateY(${ty.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${scale.toFixed(2)})`;
      card.style.zIndex = zIndex;
      card.style.opacity = opacity.toFixed(2);
    });
  }

  // Bind Page Scroll & Window Resize
  window.addEventListener("scroll", () => {
    requestAnimationFrame(renderGalleryCards);
  });

  window.addEventListener("resize", () => {
    requestAnimationFrame(renderGalleryCards);
  });

  // Pointer Drag Handlers for Desktop Mouse & Touch Screens
  container.addEventListener("pointerdown", (e) => {
    isDragging = true;
    startX = e.clientX;
    currentX = e.clientX;
    container.style.cursor = "grabbing";
  });

  window.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    currentX = e.clientX;
    const diff = (currentX - startX) / (window.innerWidth <= 768 ? 140 : 220);
    targetDragOffset = dragOffset + diff;
    requestAnimationFrame(renderGalleryCards);
  });

  window.addEventListener("pointerup", () => {
    if (!isDragging) return;
    isDragging = false;
    dragOffset = targetDragOffset;
    container.style.cursor = "grab";
  });

  container.style.cursor = "grab";
  renderGalleryCards();
}
