// InnoKart - E-Commerce, Shopping Cart & 6-Tab Detail Panel System
// Pure Vanilla JavaScript — Zero external animation/UI libraries
// Build dynamic content with DOM APIs and textContent.

(function () {
  'use strict';

  const STORAGE_KEY = 'innokart_cart';

  // State
  let cart = [];
  let currentInvention = null;
  let modalOpenerElement = null;
  let currentStepIdx = 0;
  let inside3DInstance = null; // Holds active Three.js cleanup & refs

  // Search & Filter state
  let searchQuery = '';
  let activeCategory = 'all';
  let activeSort = 'featured';

  /* ==========================================================================
     DOM Construction Helper (createElement & textContent ONLY)
     ========================================================================== */

  function createEl(tag, options = {}, ...children) {
    const el = document.createElement(tag);
    if (options.className) el.className = options.className;
    if (options.id) el.id = options.id;
    if (options.text !== undefined && options.text !== null) el.textContent = String(options.text);
    if (options.attrs) {
      for (const [k, v] of Object.entries(options.attrs)) {
        if (v !== undefined && v !== null) el.setAttribute(k, String(v));
      }
    }
    if (options.style) {
      Object.assign(el.style, options.style);
    }
    if (options.events) {
      for (const [evt, fn] of Object.entries(options.events)) {
        el.addEventListener(evt, fn);
      }
    }
    for (const child of children) {
      if (child === null || child === undefined) continue;
      if (typeof child === 'string' || typeof child === 'number') {
        el.appendChild(document.createTextNode(String(child)));
      } else if (child instanceof Node) {
        el.appendChild(child);
      }
    }
    return el;
  }

  function formatPrice(num) {
    return '₹' + Number(num || 0).toLocaleString('en-IN');
  }

  /* ==========================================================================
     Storage & Cart Core Logic (Never trust stored data)
     ========================================================================== */

  function loadCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      const sanitized = [];
      let hadModifications = false;

      parsed.forEach(item => {
        if (!item || typeof item.id !== 'string') {
          hadModifications = true;
          return;
        }
        const inv = (typeof inventions !== 'undefined' ? inventions : []).find(i => i.id === item.id);
        if (!inv || inv.stock <= 0) {
          hadModifications = true;
          return;
        }

        let qty = parseInt(item.quantity, 10);
        if (isNaN(qty) || qty < 1) {
          qty = 1;
          hadModifications = true;
        }
        if (qty > inv.stock) {
          qty = inv.stock;
          hadModifications = true;
        }

        sanitized.push({ id: inv.id, quantity: qty });
      });

      if (hadModifications) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      }
      return sanitized;
    } catch (e) {
      showToastNotice('Saved cart data could not be read. Your previous cart was left unchanged.');
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      showToastNotice('Cart changes could not be saved in this browser.');
      return false;
    }
    updateCartUI();
    return true;
  }

  function animateCartFly(source) {
    const cartButton = document.getElementById('cart-toggle-btn');
    if (!source || !cartButton || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const sourceRect = source.getBoundingClientRect();
    const targetRect = cartButton.getBoundingClientRect();
    const dot = createEl('span', { className: 'cart-flight-dot', attrs: { 'aria-hidden': 'true' } });
    dot.style.left = `${sourceRect.left + sourceRect.width / 2}px`;
    dot.style.top = `${sourceRect.top + sourceRect.height / 2}px`;
    document.body.appendChild(dot);

    if (typeof dot.animate !== 'function') {
      dot.remove();
      return;
    }

    const offsetX = targetRect.left + targetRect.width / 2 - sourceRect.left - sourceRect.width / 2;
    const offsetY = targetRect.top + targetRect.height / 2 - sourceRect.top - sourceRect.height / 2;
    const animation = dot.animate([
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(0.2)`, opacity: 0.25 }
    ], {
      duration: 580,
      easing: 'cubic-bezier(.2,.8,.2,1)',
      fill: 'forwards'
    });
    animation.onfinish = () => dot.remove();
  }

  function addToCart(inventionId, quantity = 1, source = null) {
    const inv = (typeof inventions !== 'undefined' ? inventions : []).find(i => i.id === inventionId);
    if (!inv) return;

    const previousCart = cart.map(item => ({ ...item }));
    const existing = cart.find(item => item.id === inventionId);
    let newQty = quantity;
    if (existing) {
      newQty = existing.quantity + quantity;
    }

    if (newQty > inv.stock) {
      newQty = inv.stock;
      showToastNotice(`Maximum stock reached (${inv.stock} available for ${inv.name}).`);
    } else {
      showToastNotice(`Added ${quantity} × ${inv.name} to your cart.`);
    }

    if (existing) {
      existing.quantity = newQty;
    } else {
      cart.push({ id: inventionId, quantity: newQty });
    }

    if (!saveCart()) {
      cart = previousCart;
      updateCartUI();
      return;
    }
    animateCartFly(source);
    animateCartBadge();
  }

  function updateItemQuantity(inventionId, newQty) {
    const inv = (typeof inventions !== 'undefined' ? inventions : []).find(i => i.id === inventionId);
    if (!inv) return;

    const item = cart.find(i => i.id === inventionId);
    if (!item) return;

    if (newQty <= 0) {
      removeFromCart(inventionId);
      return;
    }

    const previousCart = cart.map(entry => ({ ...entry }));
    item.quantity = Math.min(newQty, inv.stock);
    if (!saveCart()) {
      cart = previousCart;
      updateCartUI();
    }
  }

  function removeFromCart(inventionId) {
    const previousCart = cart.map(item => ({ ...item }));
    cart = cart.filter(item => item.id !== inventionId);
    if (!saveCart()) {
      cart = previousCart;
      updateCartUI();
    }
  }

  function getCartItemCount() {
    return cart.reduce((total, item) => total + (item.quantity || 0), 0);
  }

  function getCartSubtotal() {
    return cart.reduce((total, item) => {
      const inv = (typeof inventions !== 'undefined' ? inventions : []).find(i => i.id === item.id);
      return total + (inv ? inv.price * item.quantity : 0);
    }, 0);
  }

  function animateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    badge.classList.remove('bump');
    // Trigger reflow
    void badge.offsetWidth;
    badge.classList.add('bump');
    setTimeout(() => badge.classList.remove('bump'), 300);
  }

  function showToastNotice(msg) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg);
      return;
    }
    const toast = document.getElementById('toast-notice');
    const msgEl = document.getElementById('toast-msg');
    if (!toast || !msgEl) return;
    msgEl.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3800);
  }

  /* ==========================================================================
     Cart Drawer UI (Built 100% with createElement & textContent)
     ========================================================================== */

  function updateCartUI() {
    const count = getCartItemCount();
    const subtotal = getCartSubtotal();

    // 1. Badge & Navbar count
    const badge = document.getElementById('cart-badge');
    if (badge) badge.textContent = String(count);

    const drawerCount = document.getElementById('cart-drawer-count');
    if (drawerCount) drawerCount.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;

    const subtotalEl = document.getElementById('cart-subtotal-val');
    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);

    const totalEl = document.getElementById('cart-total-val');
    if (totalEl) totalEl.textContent = formatPrice(subtotal);

    // 2. Render drawer items
    const body = document.getElementById('cart-drawer-body');
    if (!body) return;

    // Clear previous items safely
    while (body.firstChild) {
      body.removeChild(body.firstChild);
    }

    if (cart.length === 0) {
      const emptyWrap = createEl('div', { className: 'cart-empty-state' },
        createEl('p', { text: 'Your cart is empty.' }),
        createEl('button', {
          className: 'btn btn-secondary btn-sm',
          text: 'Explore Inventions',
          events: {
            click: () => {
              closeCartDrawer();
              const target = document.getElementById('inventions');
              if (target) target.scrollIntoView({ behavior: 'smooth' });
            }
          }
        })
      );
      body.appendChild(emptyWrap);
      return;
    }

    cart.forEach(item => {
      const inv = (typeof inventions !== 'undefined' ? inventions : []).find(i => i.id === item.id);
      if (!inv) return;

      const card = createEl('div', { className: 'cart-item-card' },
        createEl('div', { className: 'cart-item-top' },
          createEl('div', {},
            createEl('h4', { className: 'cart-item-title', text: inv.name }),
            createEl('span', { className: 'cart-item-sub', text: `${inv.category} • Built by ${inv.maker}` })
          ),
          createEl('span', { className: 'cart-item-total', text: formatPrice(inv.price * item.quantity) })
        ),
        createEl('div', { className: 'cart-item-controls' },
          createEl('div', { className: 'qty-control' },
            createEl('button', {
              className: 'qty-btn',
              text: '−',
              attrs: { 'aria-label': `Decrease ${inv.name} quantity` },
              events: { click: () => updateItemQuantity(inv.id, item.quantity - 1) }
            }),
            createEl('span', { className: 'qty-value', text: String(item.quantity) }),
            createEl('button', {
              className: 'qty-btn',
              text: '+',
              attrs: {
                'aria-label': `Increase ${inv.name} quantity`,
                ...(item.quantity >= inv.stock ? { disabled: 'true' } : {})
              },
              events: { click: () => updateItemQuantity(inv.id, item.quantity + 1) }
            })
          ),
          createEl('button', {
            className: 'cart-remove-btn',
            text: 'Remove',
            attrs: { 'aria-label': `Remove ${inv.name} from cart` },
            events: { click: () => removeFromCart(inv.id) }
          })
        )
      );

      body.appendChild(card);
    });
  }

  function openCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-drawer-overlay');
    if (!drawer || !overlay) return;

    drawer.classList.add('active');
    drawer.setAttribute('aria-hidden', 'false');
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    const closeBtn = document.getElementById('cart-drawer-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-drawer-overlay');
    if (!drawer || !overlay) return;

    drawer.classList.remove('active');
    drawer.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /* ==========================================================================
     Search, Filter Chips & Sort Dropdown
     ========================================================================== */

  function initToolbarAndFiltering() {
    const searchInput = document.getElementById('inventions-search');
    const clearBtn = document.getElementById('search-clear-btn');
    const sortSelect = document.getElementById('inventions-sort');
    const filterContainer = document.getElementById('category-filter');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        if (clearBtn) {
          clearBtn.classList.toggle('is-hidden', searchQuery.length === 0);
        }
        applyFiltersAndRender();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
        }
        searchQuery = '';
        clearBtn.classList.add('is-hidden');
        applyFiltersAndRender();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        activeSort = e.target.value;
        applyFiltersAndRender();
      });
    }

    if (filterContainer) {
      const buttons = filterContainer.querySelectorAll('.filter-btn');
      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          buttons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activeCategory = btn.getAttribute('data-category') || 'all';
          applyFiltersAndRender();
        });
      });
    }
  }

  function applyFiltersAndRender() {
    if (typeof inventions === 'undefined' || !Array.isArray(inventions)) return;

    let list = [...inventions];

    // 1. Filter by category
    if (activeCategory !== 'all') {
      list = list.filter(inv => (inv.category || '').toLowerCase() === activeCategory.toLowerCase());
    }

    // 2. Filter by search query
    if (searchQuery) {
      list = list.filter(inv => {
        const titleMatch = (inv.name || '').toLowerCase().includes(searchQuery);
        const makerMatch = (inv.maker || '').toLowerCase().includes(searchQuery);
        const catMatch = (inv.category || '').toLowerCase().includes(searchQuery);
        const probMatch = (inv.problem || '').toLowerCase().includes(searchQuery);
        const solMatch = (inv.solution || '').toLowerCase().includes(searchQuery);
        const tagsMatch = (inv.tags || []).some(t => t.toLowerCase().includes(searchQuery));
        const compMatch = (inv.components || []).some(c => c.toLowerCase().includes(searchQuery));
        return titleMatch || makerMatch || catMatch || probMatch || solMatch || tagsMatch || compMatch;
      });
    }

    // 3. Sort
    if (activeSort === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (activeSort === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (activeSort === 'recycled-desc') {
      list.sort((a, b) => b.recycledPercent - a.recycledPercent);
    }

    renderInventionCards(list);
  }

  function renderInventionCards(list) {
    const grid = document.getElementById('inventions-grid');
    if (!grid) return;

    while (grid.firstChild) {
      grid.removeChild(grid.firstChild);
    }

    if (list.length === 0) {
      const noResults = createEl('div', { className: 'inventions-no-results' },
        createEl('h3', { className: 'no-results-title', text: 'No inventions match your search' }),
        createEl('p', { className: 'no-results-desc', text: 'Try checking your spelling, removing keywords, or resetting your category filter.' }),
        createEl('button', {
          className: 'btn btn-secondary btn-sm',
          text: 'Reset All Filters',
          events: {
            click: () => {
              const searchInput = document.getElementById('inventions-search');
              const clearBtn = document.getElementById('search-clear-btn');
              if (searchInput) searchInput.value = '';
              if (clearBtn) clearBtn.classList.add('is-hidden');
              searchQuery = '';

              const filterButtons = document.querySelectorAll('#category-filter .filter-btn');
              filterButtons.forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-category') === 'all');
              });
              activeCategory = 'all';

              const sortSelect = document.getElementById('inventions-sort');
              if (sortSelect) sortSelect.value = 'featured';
              activeSort = 'featured';

              applyFiltersAndRender();
            }
          }
        })
      );
      grid.appendChild(noResults);
      return;
    }

    list.forEach(inv => {
      const specsCells = (inv.specs || []).slice(0, 4).map(spec =>
        createEl('div', { className: 'spec-cell' },
          createEl('span', { className: 'spec-key', text: spec.label }),
          createEl('span', { className: 'spec-val', text: spec.value })
        )
      );

      const howSteps = (inv.howItWorks || []).slice(0, 3).map((step, idx) =>
        createEl('div', { className: 'how-step-item' },
          createEl('span', { className: 'step-num', text: String(idx + 1) }),
          createEl('span', { text: step })
        )
      );

      const card = createEl('article', {
        className: 'invention-card',
        id: `card-${inv.id}`,
        attrs: { 'data-id': inv.id, 'tabindex': '0', 'role': 'button', 'aria-label': `View details for ${inv.name}` },
        events: {
          click: (e) => {
            // If user clicked directly on Add to cart, order button, or compare checkbox, let button event handle it
            if (e.target.closest('.btn-order') || e.target.closest('.card-compare-label') || e.target.closest('.compare-checkbox')) return;
            openDetailModal(inv.id, card);
          },
          keydown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              if (e.target.closest('.card-compare-label') || e.target.closest('.compare-checkbox')) return;
              e.preventDefault();
              openDetailModal(inv.id, card);
            }
          }
        }
      },
        createEl('div', { className: 'card-topbar' },
          createEl('span', { className: 'card-category', text: inv.category }),
          createEl('label', {
            className: 'card-compare-label',
            attrs: { 'title': `Compare ${inv.name}` },
            events: {
              click: (e) => {
                e.stopPropagation();
              }
            }
          },
            createEl('input', {
              className: 'compare-checkbox',
              attrs: {
                type: 'checkbox',
                'data-id': inv.id,
                'aria-label': `Compare ${inv.name}`
              },
              checked: Boolean(window.InnoCompare && window.InnoCompare.isSelected && window.InnoCompare.isSelected(inv.id)),
              events: {
                click: (e) => {
                  e.stopPropagation();
                },
                change: (e) => {
                  e.stopPropagation();
                  if (window.InnoCompare && window.InnoCompare.toggle) {
                    const success = window.InnoCompare.toggle(inv.id, e.target.checked, e.target);
                    if (!success) {
                      e.target.checked = false;
                    }
                  }
                }
              }
            }),
            createEl('span', { text: 'Compare' })
          ),
          createEl('span', { className: 'card-stock', text: inv.stock > 0 ? `${inv.stock} units remaining` : 'Made to order' })
        ),
        createEl('div', { className: 'card-title-group' },
          createEl('div', { className: 'card-title-row' },
            createEl('h3', { className: 'card-title', text: inv.name }),
            createEl('span', { className: 'card-price', text: formatPrice(inv.price) })
          ),
          createEl('div', { className: 'card-maker' },
            'Built by ',
            createEl('strong', { text: inv.maker }),
            ` (${inv.makerAge} yrs)`
          )
        ),
        createEl('div', { className: 'card-tech-summary' },
          createEl('div', { className: 'summary-block' },
            createEl('span', { className: 'summary-label', text: 'Problem Solved' }),
            createEl('p', { className: 'summary-text', text: inv.problem })
          ),
          createEl('div', { className: 'summary-block' },
            createEl('span', { className: 'summary-label', text: 'Hardware Solution' }),
            createEl('p', { className: 'summary-text', text: inv.solution })
          )
        ),
        createEl('div', { className: 'card-how-it-works' },
          createEl('span', { className: 'how-label', text: 'How It Works' }),
          createEl('div', { className: 'how-steps-list' }, ...howSteps)
        ),
        createEl('div', { className: 'card-specs-grid' }, ...specsCells),
        createEl('div', { className: 'card-metrics-bar' },
          createEl('span', {}, 'Build time: ', createEl('strong', { text: `${inv.buildDays} days` })),
          createEl('span', { className: 'recycled-metric' },
            createEl('svg', { className: 'recycled-ring', attrs: { viewBox: '0 0 40 40', 'aria-hidden': 'true' } },
              createEl('circle', { className: 'recycled-ring-track', attrs: { cx: '20', cy: '20', r: '16' } }),
              createEl('circle', {
                className: 'recycled-ring-value',
                attrs: {
                  cx: '20',
                  cy: '20',
                  r: '16',
                  'stroke-dasharray': '100',
                  'stroke-dashoffset': '100',
                  'data-target': String(inv.recycledPercent)
                }
              })
            ),
            'Recycled: ',
            createEl('strong', { text: `${inv.recycledPercent}%` })
          )
        ),
        createEl('div', { className: 'card-actions' },
          createEl('button', {
            className: 'btn btn-secondary btn-inspect',
            text: 'Inspect 3D Parts & Passport',
            attrs: {
              'aria-label': `Quick view: inspect 3D parts and passport for ${inv.name}`,
              title: 'Quick view',
              'aria-haspopup': 'dialog'
            },
            events: {
              click: (e) => {
                e.stopPropagation();
                openDetailModal(inv.id, card);
              }
            }
          }),
          createEl('button', {
            className: 'btn btn-primary btn-order',
            text: `Order Prototype — ${formatPrice(inv.price)}`,
            attrs: { 'aria-label': `Add ${inv.name} to cart for ${formatPrice(inv.price)}` },
            events: {
              click: (e) => {
                e.stopPropagation();
                addToCart(inv.id, 1, e.currentTarget);
              }
            }
          })
        )
      );

      grid.appendChild(card);
    });

    // Re-observe cards with motion scroll reveals
    if (typeof window.observeInventionCards === 'function') {
      window.observeInventionCards();
    }
  }

  /* ==========================================================================
     Detail Panel Modal (6 Tabs)
     ========================================================================== */

  function openDetailModal(invId, triggerElement) {
    const inv = (typeof inventions !== 'undefined' ? inventions : []).find(i => i.id === invId);
    if (!inv) return;

    modalOpenerElement = triggerElement || document.activeElement;
    currentInvention = inv;
    currentStepIdx = 0;

    const modal = document.getElementById('tech-modal');
    if (!modal) return;

    // Header info
    const catEl = document.getElementById('modal-category');
    if (catEl) catEl.textContent = inv.category;

    const titleEl = document.getElementById('modal-title');
    if (titleEl) titleEl.textContent = inv.name;

    const makerEl = document.getElementById('modal-maker');
    if (makerEl) makerEl.textContent = `Built by ${inv.maker} (${inv.makerAge} yrs) in ${inv.buildDays} days`;

    // Footer info
    const priceEl = document.getElementById('modal-price-val');
    if (priceEl) priceEl.textContent = formatPrice(inv.price);

    const stockEl = document.getElementById('modal-stock-badge');
    if (stockEl) stockEl.textContent = inv.stock > 0 ? `${inv.stock} units in stock` : 'Made to order';

    // Quantity selector
    let currentQty = 1;
    const qtyVal = document.getElementById('modal-qty-val');
    const minusBtn = document.getElementById('modal-qty-minus');
    const plusBtn = document.getElementById('modal-qty-plus');
    const addCartBtn = document.getElementById('modal-add-cart-btn');

    if (qtyVal) qtyVal.textContent = '1';

    const updateQtyButtons = () => {
      if (qtyVal) qtyVal.textContent = String(currentQty);
      if (priceEl) priceEl.textContent = formatPrice(inv.price * currentQty);
      if (minusBtn) minusBtn.disabled = currentQty <= 1;
      if (plusBtn) plusBtn.disabled = currentQty >= inv.stock;
    };
    updateQtyButtons();

    if (minusBtn) {
      minusBtn.onclick = () => {
        if (currentQty > 1) {
          currentQty--;
          updateQtyButtons();
        }
      };
    }

    if (plusBtn) {
      plusBtn.onclick = () => {
        if (currentQty < inv.stock) {
          currentQty++;
          updateQtyButtons();
        }
      };
    }

    if (addCartBtn) {
      addCartBtn.onclick = () => {
        addToCart(inv.id, currentQty, addCartBtn);
        closeDetailModal();
      };
    }

    // Populate all 6 tab contents
    populateOverviewTab(inv);
    populateHowTab(inv);
    populateBuildTab(inv);
    populateSpecsTab(inv);
    populatePassportTab(inv);

    // Switch to first tab by default
    switchDetailTab('tab-overview');

    // Show modal dialog
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Trap focus inside modal
    setupFocusTrap(modal);
  }

  function closeDetailModal() {
    const modal = document.getElementById('tech-modal');
    if (!modal) return;

    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // Dispose Inside 3D scene cleanly
    disposeInside3D();

    // Return focus to opening element
    if (modalOpenerElement && typeof modalOpenerElement.focus === 'function') {
      modalOpenerElement.focus();
    }
  }

  function switchDetailTab(targetTabId) {
    const tabButtons = document.querySelectorAll('.modal-tab-btn');
    const tabPanels = document.querySelectorAll('.modal-tab-panel');

    tabButtons.forEach(btn => {
      const isTarget = btn.getAttribute('data-tab') === targetTabId;
      btn.classList.toggle('active', isTarget);
      btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    tabPanels.forEach(panel => {
      const isTarget = panel.id === targetTabId;
      panel.classList.toggle('active', isTarget);
    });

    // If switching to "Inside" tab, mount 3D scene. If switching away, dispose it!
    if (targetTabId === 'tab-inside') {
      if (currentInvention) mountInside3D(currentInvention);
    } else {
      disposeInside3D();
    }
  }

  /* ==========================================================================
     Tab 1: Overview
     ========================================================================== */
  function populateOverviewTab(inv) {
    const container = document.getElementById('overview-content');
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);

    const wrap = createEl('div', { className: 'overview-tab-wrap', style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
      createEl('div', { className: 'summary-block' },
        createEl('span', { className: 'summary-label', text: 'Problem Solved' }),
        createEl('p', { className: 'summary-text', text: inv.problem })
      ),
      createEl('div', { className: 'summary-block' },
        createEl('span', { className: 'summary-label', text: 'Hardware Solution' }),
        createEl('p', { className: 'summary-text', text: inv.solution })
      ),
      createEl('div', { className: 'build-stats-grid' },
        createEl('div', { className: 'build-stat-box' },
          createEl('div', { className: 'build-stat-val', text: `${inv.buildDays} Days` }),
          createEl('div', { className: 'build-stat-lbl', text: 'Prototyping Time' })
        ),
        createEl('div', { className: 'build-stat-box' },
          createEl('div', { className: 'build-stat-val', text: `${inv.recycledPercent}%` }),
          createEl('div', { className: 'build-stat-lbl', text: 'Recycled Parts' })
        ),
        createEl('div', { className: 'build-stat-box' },
          createEl('div', { className: 'build-stat-val', text: `${inv.stock} Units` }),
          createEl('div', { className: 'build-stat-lbl', text: 'Batch Available' })
        )
      )
    );

    container.appendChild(wrap);
  }

  /* ==========================================================================
     Tab 2: How It Works (Step Wizard: One step at a time, Next/Back)
     ========================================================================== */
  function populateHowTab(inv) {
    const container = document.getElementById('how-content');
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);

    const steps = inv.howItWorks || [];
    const totalSteps = steps.length || 1;
    currentStepIdx = 0;

    const progressFill = createEl('div', { className: 'step-progress-fill' });
    const progressLabel = createEl('span', { text: `Step 1 of ${totalSteps}` });
    const stepNumText = createEl('span', { className: 'step-huge-num', text: '01' });
    const stepDescText = createEl('p', { className: 'step-card-text', text: steps[0] || '' });

    const backBtn = createEl('button', {
      className: 'btn btn-secondary btn-sm',
      text: '← Back',
      attrs: { disabled: 'true' }
    });

    const nextBtn = createEl('button', {
      className: 'btn btn-primary btn-sm',
      text: totalSteps > 1 ? 'Next Step →' : 'Done'
    });

    const updateStep = () => {
      progressFill.style.width = `${((currentStepIdx + 1) / totalSteps) * 100}%`;
      progressLabel.textContent = `Step ${currentStepIdx + 1} of ${totalSteps}`;
      stepNumText.textContent = `0${currentStepIdx + 1}`;
      stepDescText.textContent = steps[currentStepIdx] || '';
      backBtn.disabled = currentStepIdx === 0;
      nextBtn.textContent = currentStepIdx === totalSteps - 1 ? 'Start Over ↺' : 'Next Step →';
    };

    backBtn.onclick = () => {
      if (currentStepIdx > 0) {
        currentStepIdx--;
        updateStep();
      }
    };

    nextBtn.onclick = () => {
      if (currentStepIdx < totalSteps - 1) {
        currentStepIdx++;
      } else {
        currentStepIdx = 0;
      }
      updateStep();
    };

    const wizard = createEl('div', { className: 'step-wizard-wrap' },
      createEl('div', { className: 'step-progress-bar-wrap' },
        createEl('div', { className: 'step-progress-meta' },
          progressLabel,
          createEl('span', { text: 'Sequential Engineering Steps' })
        ),
        createEl('div', { className: 'step-progress-track' }, progressFill)
      ),
      createEl('div', { className: 'step-card-active' },
        stepNumText,
        stepDescText
      ),
      createEl('div', { className: 'step-nav-actions' },
        backBtn,
        nextBtn
      )
    );

    updateStep();
    container.appendChild(wizard);
  }

  /* ==========================================================================
     Tab 3: Build (Component Chips, Build Days, Recycled %)
     ========================================================================== */
  function populateBuildTab(inv) {
    const container = document.getElementById('build-content');
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);

    const chips = (inv.components || []).map(comp =>
      createEl('span', { className: 'component-chip', text: comp })
    );

    const wrap = createEl('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
      createEl('span', { className: 'mono-subtle', text: 'Hardware Bill of Materials & Components' }),
      createEl('div', { className: 'chips-cloud' }, ...chips),
      createEl('div', { className: 'build-stats-grid' },
        createEl('div', { className: 'build-stat-box' },
          createEl('div', { className: 'build-stat-val', text: `${inv.buildDays} Days` }),
          createEl('div', { className: 'build-stat-lbl', text: 'Workshop Build Effort' })
        ),
        createEl('div', { className: 'build-stat-box' },
          createEl('div', { className: 'build-stat-val', text: `${inv.recycledPercent}%` }),
          createEl('div', { className: 'build-stat-lbl', text: 'Circularity / Recycled %' })
        ),
        createEl('div', { className: 'build-stat-box' },
          createEl('div', { className: 'build-stat-val', text: `${(inv.parts || []).length} Layers` }),
          createEl('div', { className: 'build-stat-lbl', text: 'Physical Mechanical Stack' })
        )
      )
    );

    container.appendChild(wrap);
  }

  /* ==========================================================================
     Tab 4: Specs (Table)
     ========================================================================== */
  function populateSpecsTab(inv) {
    const container = document.getElementById('specs-content');
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);

    const rows = (inv.specs || []).map(spec =>
      createEl('tr', {},
        createEl('td', { text: spec.label }),
        createEl('td', { text: spec.value })
      )
    );

    const table = createEl('table', { className: 'specs-table' },
      createEl('thead', {},
        createEl('tr', {},
          createEl('th', { text: 'Technical Specification' }),
          createEl('th', { text: 'Bench Measurement' })
        )
      ),
      createEl('tbody', {}, ...rows)
    );

    container.appendChild(table);
  }

  /* ==========================================================================
     Tab 5: Inside (Secondary Three.js Scene, Explode Slider, Highlight & Cleanup)
     ========================================================================== */
  function mountInside3D(inv) {
    disposeInside3D();

    const container = document.getElementById('inside-content');
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);

    // Fallback if WebGL unavailable
    function hasWebGL() {
      try {
        const c = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
      } catch (e) {
        return false;
      }
    }

    if (typeof THREE === 'undefined' || !hasWebGL()) {
      const fallbackList = createEl('div', { className: 'modal-parts-list' },
        createEl('p', { className: 'modal-subtitle', text: 'Layer-by-layer mechanical breakdown:' }),
        ...(inv.parts || []).map(p =>
          createEl('div', { className: 'modal-part-item' },
            createEl('div', { className: 'part-header' },
              createEl('strong', { text: `Layer ${p.layer}: ${p.name}` }),
              createEl('span', { className: 'part-cost', text: formatPrice(p.costInr) })
            ),
            createEl('p', { className: 'part-role', text: p.role }),
            createEl('div', { className: 'part-source', text: `Source: ${p.source}` })
          )
        )
      );
      container.appendChild(fallbackList);
      return;
    }

    // 3D Canvas wrapper
    const canvasWrap = createEl('div', { className: 'inside-3d-canvas-wrap' },
      createEl('span', { className: 'inside-3d-hint', text: 'Drag to rotate • Click layer to inspect' })
    );

    // Explode Slider
    const explodeSlider = createEl('input', {
      attrs: { type: 'range', min: '0', max: '1', step: '0.01', value: '0', 'aria-label': 'Explode model layers slider' }
    });
    const sliderBar = createEl('div', { className: 'explode-slider-bar' },
      createEl('label', { text: 'Explode Layers:' }),
      explodeSlider
    );

    // Selected Part Card below canvas
    const partTitleEl = createEl('strong', { text: 'Select a layer above to inspect specifications.' });
    const partRoleEl = createEl('p', { text: 'Hover or click on any exploded layer to view its role, provenance and bill-of-materials cost.' });
    const partSourceEl = createEl('span', { className: 'mono-subtle', text: '' });
    const partCostEl = createEl('span', { className: 'part-cost', text: '' });

    const partCard = createEl('div', { className: 'inside-part-card' },
      createEl('div', { className: 'part-header' }, partTitleEl, partCostEl),
      partRoleEl,
      partSourceEl
    );

    const layout = createEl('div', { className: 'inside-3d-container' },
      canvasWrap,
      sliderBar,
      partCard
    );
    container.appendChild(layout);

    // Three.js Scene Setup
    const width = canvasWrap.clientWidth || 760;
    const height = 280;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 3.2, 7.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    canvasWrap.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffeedd, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 6);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xe08a4b, 1.0, 15);
    pointLight.position.set(-4, -2, 4);
    scene.add(pointLight);

    // Model layers
    const modelGroup = new THREE.Group();
    modelGroup.rotation.x = 0.35;
    modelGroup.rotation.y = 0.5;
    scene.add(modelGroup);

    const parts = inv.parts || [];
    const totalParts = parts.length || 1;
    const layerMeshes = [];
    const layerLabels = createEl('div', {
      className: 'inside-layer-labels',
      attrs: { 'aria-label': 'Invention layers' }
    }, ...parts.slice(0, 5).map((part, index) =>
      createEl('button', {
        className: 'inside-layer-label',
        text: part.name,
        attrs: { type: 'button', 'data-layer-index': String(index) }
      })
    ));
    canvasWrap.appendChild(layerLabels);
    const layerLabelButtons = [...layerLabels.querySelectorAll('.inside-layer-label')];
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = motionPreference.matches;
    let requestRender = () => {};

    // Distinct materials per layer role
    const palette = [
      { color: 0x334455, roughness: 0.1, metalness: 0.8, opacity: 0.85, transparent: true }, // Glass / solar
      { color: 0xd87a38, roughness: 0.35, metalness: 0.75 },                                 // Copper
      { color: 0x2b382e, roughness: 0.6, metalness: 0.3 },                                  // Battery
      { color: 0x1d5435, roughness: 0.5, metalness: 0.4 },                                  // PCB Controller
      { color: 0xb58750, roughness: 0.7, metalness: 0.1 }                                   // Bamboo / casing
    ];

    parts.forEach((p, idx) => {
      const matProps = palette[idx % palette.length];
      const geom = new THREE.BoxGeometry(3.6, 0.16, 2.2);
      const mat = new THREE.MeshStandardMaterial({
        color: matProps.color,
        roughness: matProps.roughness,
        metalness: matProps.metalness,
        opacity: matProps.opacity || 1.0,
        transparent: !!matProps.transparent
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.userData = {
        part: p,
        layerIndex: idx,
        baseY: (idx - (totalParts - 1) / 2) * 0.35
      };
      mesh.position.y = mesh.userData.baseY;
      modelGroup.add(mesh);
      layerMeshes.push(mesh);
    });

    // Update layer positions from slider
    function updateExplode(factor) {
      const normalizedFactor = Math.max(0, Math.min(1, factor));
      explodeSlider.value = String(normalizedFactor);
      const spacingMultiplier = 0.18 + normalizedFactor * 1.75;
      layerMeshes.forEach(m => {
        const offsetIdx = m.userData.layerIndex - (totalParts - 1) / 2;
        m.position.y = offsetIdx * spacingMultiplier;
      });
      const activeIndex = Math.round(normalizedFactor * Math.max(0, layerLabelButtons.length - 1));
      layerLabelButtons.forEach((label, index) => {
        label.classList.toggle('is-active', index === activeIndex);
      });
      requestRender();
    }
    updateExplode(parseFloat(explodeSlider.value));
    explodeSlider.addEventListener('input', (e) => {
      updateExplode(parseFloat(e.target.value));
    });

    const modalDialog = document.querySelector('#tech-modal .modal-dialog');
    function onModalScroll() {
      if (!modalDialog || modalDialog.scrollHeight <= modalDialog.clientHeight) return;
      const scrollRange = modalDialog.scrollHeight - modalDialog.clientHeight;
      updateExplode(modalDialog.scrollTop / scrollRange);
    }

    function onViewerWheel(event) {
      if (modalDialog && modalDialog.scrollHeight > modalDialog.clientHeight) return;
      updateExplode(parseFloat(explodeSlider.value) + event.deltaY * 0.0012);
    }

    if (modalDialog) modalDialog.addEventListener('scroll', onModalScroll, { passive: true });
    canvasWrap.addEventListener('wheel', onViewerWheel, { passive: true });

    // Pointer Drag to Rotate
    let isDragging = false;
    let prevPointer = { x: 0, y: 0 };

    function onPointerDown(e) {
      isDragging = true;
      prevPointer = { x: e.clientX, y: e.clientY };
      requestRender();
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - prevPointer.x;
      const dy = e.clientY - prevPointer.y;
      prevPointer = { x: e.clientX, y: e.clientY };

      modelGroup.rotation.y += dx * 0.008;
      modelGroup.rotation.x += dy * 0.008;
      requestRender();
    }

    function onPointerUp() {
      isDragging = false;
      requestRender();
    }

    const canvasEl = renderer.domElement;
    canvasEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Raycasting Click to Highlight & Select Layer
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let highlightedMesh = null;

    function selectLayerMesh(mesh) {
      if (highlightedMesh && highlightedMesh.material) {
        highlightedMesh.material.emissive.setHex(0x000000);
      }
      if (mesh && mesh.material) {
        mesh.material.emissive.setHex(0xe08a4b);
        mesh.material.emissiveIntensity = 0.45;
        highlightedMesh = mesh;

        const p = mesh.userData.part;
        partTitleEl.textContent = `Layer ${p.layer + 1}: ${p.name}`;
        partRoleEl.textContent = p.role;
        partSourceEl.textContent = `Provenance: ${p.source}`;
        partCostEl.textContent = formatPrice(p.costInr);
        partCard.classList.add('active-part');
        requestRender();
      }
    }

    layerLabelButtons.forEach(label => {
      label.addEventListener('click', () => {
        const index = Number(label.dataset.layerIndex);
        if (!layerMeshes[index]) return;
        updateExplode(layerLabelButtons.length > 1 ? index / (layerLabelButtons.length - 1) : 0);
        selectLayerMesh(layerMeshes[index]);
      });
    });

    // Default select first layer
    if (layerMeshes.length > 0) {
      selectLayerMesh(layerMeshes[0]);
    }

    canvasEl.addEventListener('click', (e) => {
      const rect = canvasEl.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(layerMeshes);

      if (intersects.length > 0) {
        selectLayerMesh(intersects[0].object);
      }
    });

    // Animation Loop
    let animId = null;
    function animate() {
      animId = null;
      if (document.hidden) {
        return;
      }
      if (!reducedMotion && !isDragging) {
        modelGroup.rotation.y += 0.003;
      }
      renderer.render(scene, camera);
      if (!reducedMotion) animId = requestAnimationFrame(animate);
    }
    requestRender = () => {
      if (animId === null && !document.hidden) animId = requestAnimationFrame(animate);
    }
    function onVisibilityChange() {
      if (document.hidden) {
        if (animId) cancelAnimationFrame(animId);
        animId = null;
      } else {
        requestRender();
      }
    }
    function onMotionPreferenceChange(event) {
      reducedMotion = event.matches;
      if (animId) cancelAnimationFrame(animId);
      animId = null;
      requestRender();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    motionPreference.addEventListener('change', onMotionPreferenceChange);
    requestRender();

    // Store disposal reference
    inside3DInstance = {
      dispose: () => {
        if (animId) cancelAnimationFrame(animId);
        canvasEl.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        motionPreference.removeEventListener('change', onMotionPreferenceChange);
        if (modalDialog) modalDialog.removeEventListener('scroll', onModalScroll);
        canvasWrap.removeEventListener('wheel', onViewerWheel);

        scene.traverse(obj => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
          }
        });

        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
    };
  }

  function disposeInside3D() {
    if (inside3DInstance) {
      try {
        inside3DInstance.dispose();
      } catch (e) {
        console.warn('Error disposing Inside 3D scene:', e);
      }
      inside3DInstance = null;
    }
  }

  /* ==========================================================================
     Tab 6: Passport (Table + Canvas QR Pattern)
     ========================================================================== */
  function populatePassportTab(inv) {
    const container = document.getElementById('passport-content');
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);

    const passport = inv.passport || { serial: 'INK-000', builtOn: '2026-00-00', tests: [] };

    // Test results table
    const testRows = (passport.tests || []).map(test =>
      createEl('tr', {},
        createEl('td', { text: test.label }),
        createEl('td', { text: test.value }),
        createEl('td', {},
          createEl('span', { className: 'test-pass-badge', text: test.pass ? 'Pass' : 'Review' })
        )
      )
    );

    const table = createEl('table', { className: 'specs-table' },
      createEl('thead', {},
        createEl('tr', {},
          createEl('th', { text: 'Diagnostic Bench Test' }),
          createEl('th', { text: 'Measured Empirical Metric' }),
          createEl('th', { text: 'Status' })
        )
      ),
      createEl('tbody', {}, ...testRows)
    );

    const leftCol = createEl('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } },
      createEl('div', { className: 'passport-meta-grid' },
        createEl('div', {},
          createEl('span', { className: 'mono-subtle', text: 'Hardware Serial Number' }),
          createEl('div', { className: 'mono-label', text: passport.serial, style: { fontSize: 'var(--fs-md)', marginTop: '4px' } })
        ),
        createEl('div', {},
          createEl('span', { className: 'mono-subtle', text: 'Bench Stamped Date' }),
          createEl('div', { text: passport.builtOn, style: { fontSize: 'var(--fs-md)', fontWeight: '500', marginTop: '4px' } })
        )
      ),
      createEl('div', { style: { fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' } },
        'Hand-calibrated & serialized by ',
        createEl('strong', { text: inv.maker, style: { color: 'var(--text-primary)' } })
      ),
      table
    );

    // Right Column: Canvas Decorative QR Pattern
    const qrCanvas = createEl('canvas', {
      className: 'passport-qr-canvas',
      attrs: { width: '140', height: '140', 'aria-label': 'Decorative hardware serial matrix pattern' }
    });
    drawSerialQRPattern(qrCanvas, passport.serial);

    const rightCol = createEl('div', { className: 'passport-qr-column' },
      qrCanvas,
      createEl('span', { className: 'passport-qr-caption', text: 'not a real QR code' })
    );

    const layout = createEl('div', { className: 'passport-panel-layout' },
      leftCol,
      rightCol
    );

    container.appendChild(layout);
  }

  /**
   * Deterministic decorative matrix pattern generated from the serial
   */
  function drawSerialQRPattern(canvas, serial) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const gridCount = 15;
    const cellSize = size / gridCount;

    ctx.fillStyle = '#0a0705';
    ctx.fillRect(0, 0, size, size);

    // Seeded pseudo-random generator from serial string
    let seed = 0;
    for (let i = 0; i < serial.length; i++) {
      seed = ((seed << 5) - seed + serial.charCodeAt(i)) | 0;
    }
    function random() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    // Helper to draw QR corner eye finder pattern
    function drawEye(startX, startY) {
      ctx.fillStyle = '#e08a4b';
      ctx.fillRect(startX * cellSize, startY * cellSize, 4 * cellSize, 4 * cellSize);
      ctx.fillStyle = '#0a0705';
      ctx.fillRect((startX + 1) * cellSize, (startY + 1) * cellSize, 2 * cellSize, 2 * cellSize);
      ctx.fillStyle = '#e08a4b';
      ctx.fillRect((startX + 1.35) * cellSize, (startY + 1.35) * cellSize, 1.3 * cellSize, 1.3 * cellSize);
    }

    // Draw 3 corner eyes
    drawEye(1, 1);
    drawEye(10, 1);
    drawEye(1, 10);

    // Draw data cells
    for (let y = 0; y < gridCount; y++) {
      for (let x = 0; x < gridCount; x++) {
        // Skip corner eye areas
        if ((x < 5 && y < 5) || (x >= 9 && y < 5) || (x < 5 && y >= 9)) continue;

        if (random() > 0.45) {
          const isAccent = random() > 0.7;
          ctx.fillStyle = isAccent ? '#e08a4b' : '#35271d';
          ctx.fillRect(x * cellSize + 0.5, y * cellSize + 0.5, cellSize - 1, cellSize - 1);
        }
      }
    }
  }

  /* ==========================================================================
     Accessibility: Focus Trap
     ========================================================================== */
  function setupFocusTrap(modal) {
    const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    modal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;

      const focusables = Array.from(modal.querySelectorAll(focusableSelectors)).filter(
        el => !el.hasAttribute('disabled') && el.offsetParent !== null
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  /* ==========================================================================
     Global Listeners & Bootstrapping
     ========================================================================== */

  function initModalEventListeners() {
    const modal = document.getElementById('tech-modal');
    const closeBtn = document.getElementById('modal-close-btn');

    if (closeBtn) closeBtn.addEventListener('click', closeDetailModal);

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeDetailModal();
      });
    }

    // Tab buttons click handler
    const tabButtons = document.querySelectorAll('.modal-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        if (targetTab) switchDetailTab(targetTab);
      });
    });

    // Cart Drawer toggle listeners
    const cartToggleBtn = document.getElementById('cart-toggle-btn');
    if (cartToggleBtn) cartToggleBtn.addEventListener('click', openCartDrawer);

    const cartCloseBtn = document.getElementById('cart-drawer-close');
    if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCartDrawer);

    const cartOverlay = document.getElementById('cart-drawer-overlay');
    if (cartOverlay) cartOverlay.addEventListener('click', closeCartDrawer);

    const checkoutBtn = document.getElementById('cart-checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) {
          showToastNotice('Your cart is empty.');
          return;
        }
        if (window.InnoOrders) {
          window.InnoOrders.openCheckout();
        } else {
          showToastNotice('Checkout is unavailable. Please reload and try again.');
        }
      });
    }

    // Global Escape key handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modalOpen = modal && modal.classList.contains('is-open');
        const drawer = document.getElementById('cart-drawer');
        const drawerOpen = drawer && drawer.classList.contains('active');

        if (modalOpen) closeDetailModal();
        else if (drawerOpen) closeCartDrawer();
      }
    });
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    cart = loadCart();
    updateCartUI();
    initToolbarAndFiltering();
    initModalEventListeners();
    applyFiltersAndRender();
  });

  // Expose API for pairs/debugging
  window.InnoCart = {
    addToCart,
    openCart: openCartDrawer,
    closeCart: closeCartDrawer,
    openDetail: openDetailModal,
    getCart: () => cart.map(item => ({ ...item })),
    getSubtotal: getCartSubtotal,
    clearCart: () => {
      const previousCart = cart.map(item => ({ ...item }));
      cart = [];
      if (!saveCart()) {
        cart = previousCart;
        updateCartUI();
        throw new Error('Cart could not be cleared from browser storage.');
      }
    }
  };

})();
