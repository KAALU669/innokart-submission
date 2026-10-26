// InnoKart - Demo checkout and order tracking
(function () {
  'use strict';

  const ORDERS_KEY = 'innokart_orders';
  const ORDER_STEPS = ['Placed', 'Packed', 'Shipped', 'Delivered'];
  const STEP_INTERVAL_MS = 20000;
  let activeStep = 1;
  let confirmationOrderId = '';
  let panelOpener = null;

  function createEl(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  }

  function formatPrice(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN');
  }

  function getOrders() {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    const orders = JSON.parse(raw);
    if (!Array.isArray(orders)) {
      throw new Error('Saved orders are invalid. Clear the InnoKart orders data to continue.');
    }
    return orders.filter(order =>
      order &&
      typeof order.id === 'string' &&
      typeof order.date === 'string' &&
      Number.isFinite(Date.parse(order.date)) &&
      Array.isArray(order.items) &&
      Number.isFinite(order.total)
    );
  }

  function saveOrders(orders) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }

  function setMessage(message, isError) {
    const element = document.getElementById('orders-message');
    if (!element) return;
    element.textContent = message;
    element.classList.toggle('is-error', Boolean(isError));
    element.hidden = !message;
  }

  function setBodyLocked(locked) {
    document.body.style.overflow = locked ? 'hidden' : '';
  }

  function showPanel(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const currentPanels = Array.from(document.querySelectorAll('.orders-panel.is-open'));
    if (currentPanels.length === 0) panelOpener = document.activeElement;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    setBodyLocked(true);
    const focusTarget = panel.querySelector('input, button');
    if (focusTarget) focusTarget.focus();
    currentPanels.forEach(currentPanel => {
      if (currentPanel === panel) return;
      currentPanel.classList.remove('is-open');
      currentPanel.setAttribute('aria-hidden', 'true');
    });
  }

  function closePanels() {
    if (panelOpener instanceof HTMLElement && panelOpener.isConnected) {
      panelOpener.focus();
    }
    document.querySelectorAll('.orders-panel.is-open').forEach(panel => {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
    });
    setBodyLocked(false);
    panelOpener = null;
  }

  function openCheckout() {
    if (!window.InnoAuth) {
      if (window.showToast) window.showToast('Account sign-in is unavailable. Please reload and try again.');
      return;
    }
    if (!window.InnoAuth.isAuthenticated()) {
      window.InnoAuth.requireAuth(openCheckout);
      return;
    }
    const cart = window.InnoCart.getCart();
    if (cart.length === 0) {
      if (window.showToast) window.showToast('Your cart is empty.');
      return;
    }
    activeStep = 1;
    confirmationOrderId = '';
    document.getElementById('checkout-form').hidden = false;
    document.getElementById('order-confirmation').hidden = true;
    document.getElementById('checkout-form').reset();
    const user = window.InnoAuth.getUser();
    if (user) document.querySelector('#checkout-form [name="email"]').value = user.email;
    renderCheckoutStep();
    window.InnoCart.closeCart();
    document.getElementById('cart-toggle-btn').focus();
    showPanel('checkout-panel');
  }

  function renderCheckoutStep() {
    const panels = document.querySelectorAll('[data-step-panel]');
    panels.forEach(panel => {
      const isActive = Number(panel.dataset.stepPanel) === activeStep;
      panel.hidden = !isActive;
      panel.classList.toggle('active', isActive);
    });

    document.querySelectorAll('[data-checkout-step]').forEach(step => {
      const number = Number(step.dataset.checkoutStep);
      step.classList.toggle('active', number === activeStep);
      step.classList.toggle('complete', number < activeStep);
    });

    document.getElementById('checkout-progress-fill').style.width = `${((activeStep - 1) / 2) * 100}%`;
    document.getElementById('checkout-back').hidden = activeStep === 1;
    document.getElementById('checkout-next').hidden = activeStep === 3;
    document.getElementById('checkout-place-order').hidden = activeStep !== 3;
    document.getElementById('checkout-next').textContent =
      activeStep === 1 ? 'Continue to payment' : 'Review order';
    document.getElementById('checkout-error').hidden = true;

    if (activeStep === 3) renderReview();
    updateCheckoutButtons();
  }

  function fieldErrorMessage(field) {
    if (field.validity.valueMissing) return 'This field is required.';
    if (field.validity.typeMismatch) return field.type === 'email' ? 'Enter a valid email address.' : 'Enter a valid value.';
    if (field.validity.patternMismatch) {
      return field.name === 'phone' ? 'Enter a 10-digit phone number.' : 'Enter a 6-digit pincode.';
    }
    return '';
  }

  function updateFieldError(field, reveal) {
    const message = fieldErrorMessage(field);
    let error = field.parentElement.querySelector('.inline-field-error');
    if (!error && reveal) {
      error = document.createElement('span');
      error.className = 'inline-field-error';
      error.id = `${field.name}-checkout-error`;
      field.parentElement.appendChild(error);
      field.setAttribute('aria-describedby', error.id);
    }
    if (error) error.textContent = reveal ? message : '';
    field.setAttribute('aria-invalid', reveal && message ? 'true' : 'false');
    return !message;
  }

  function updateCheckoutButtons() {
    const panel = document.querySelector(`[data-step-panel="${activeStep}"]`);
    const fields = panel ? Array.from(panel.querySelectorAll('input[required], textarea[required]')) : [];
    const isValid = fields.every(field => field.checkValidity());
    document.getElementById('checkout-next').disabled = !isValid;
    document.getElementById('checkout-place-order').disabled = activeStep !== 3 || !isValid;
  }

  function validateActiveStep() {
    const panel = document.querySelector(`[data-step-panel="${activeStep}"]`);
    const fields = panel.querySelectorAll('input[required], textarea[required]');
    let firstInvalid = null;
    for (const field of fields) {
      updateFieldError(field, true);
      if (!field.checkValidity()) {
        firstInvalid = firstInvalid || field;
      }
    }
    updateCheckoutButtons();
    if (firstInvalid) {
      firstInvalid.focus();
      return false;
    }
    return true;
  }

  function getCartSnapshot() {
    const availableInventions = typeof inventions !== 'undefined' ? inventions : [];
    return window.InnoCart.getCart().map(item => {
      const invention = availableInventions.find(entry => entry.id === item.id);
      if (!invention) throw new Error('An item in your cart is no longer available.');
      return {
        id: invention.id,
        name: invention.name,
        quantity: item.quantity,
        unitPrice: invention.price
      };
    });
  }

  function renderReview() {
    const review = document.getElementById('checkout-review');
    const addressForm = document.getElementById('checkout-form');
    const address = new FormData(addressForm);
    const items = getCartSnapshot();
    const list = createEl('div', 'checkout-review-items');

    items.forEach(item => {
      list.appendChild(createEl('div', 'checkout-review-item',
        `${item.name} × ${item.quantity} — ${formatPrice(item.unitPrice * item.quantity)}`));
    });

    const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const addressSummary = createEl('p', 'checkout-review-address',
      `${address.get('name')}, ${address.get('phone')}, ${address.get('email')}\n${address.get('address')}, ${address.get('city')} ${address.get('pincode')}`);
    const paymentSummary = createEl('p', 'checkout-review-payment',
      `Payment: ${address.get('payment')}`);
    const totalSummary = createEl('p', 'checkout-review-total', `Total: ${formatPrice(total)}`);

    review.replaceChildren(
      createEl('h4', '', 'Items'),
      list,
      createEl('h4', '', 'Deliver to'),
      addressSummary,
      paymentSummary,
      totalSummary
    );
  }

  function createOrderId(orders) {
    let id;
    do {
      const bytes = new Uint32Array(1);
      if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(bytes);
        id = `INK-${10000 + (bytes[0] % 90000)}`;
      } else {
        id = `INK-${Math.floor(10000 + Math.random() * 90000)}`;
      }
    } while (orders.some(order => order.id === id));
    return id;
  }

  function placeOrder(event) {
    event.preventDefault();
    const form = document.getElementById('checkout-form');
    const submitButton = document.getElementById('checkout-place-order');
    submitButton.disabled = true;
    const requiredFields = form.querySelectorAll('input[required], textarea[required]');
    let fieldsValid = true;
    requiredFields.forEach(field => {
      updateFieldError(field, true);
      fieldsValid = field.checkValidity() && fieldsValid;
    });
    if (!fieldsValid) {
      submitButton.disabled = false;
      const firstInvalid = Array.from(requiredFields).find(field => !field.checkValidity());
      if (firstInvalid) firstInvalid.focus();
      return;
    }
    const payment = form.querySelector('input[name="payment"]:checked');
    if (!payment) {
      document.getElementById('checkout-error').textContent = 'Choose a payment method to continue.';
      document.getElementById('checkout-error').hidden = false;
      submitButton.disabled = false;
      return;
    }

    try {
      const items = getCartSnapshot();
      if (items.length === 0) throw new Error('Your cart is empty.');
      const orders = getOrders();
      const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const address = new FormData(form);
      const orderDate = new Date().toISOString();
      const order = {
        id: createOrderId(orders),
        items,
        total,
        date: orderDate,
        status: 'Placed',
        email: String(address.get('email')).trim().toLowerCase(),
        timeline: [{ status: 'Placed', at: orderDate }],
        address: {
          name: String(address.get('name')).trim(),
          phone: String(address.get('phone')).trim(),
          pincode: String(address.get('pincode')).trim(),
          city: String(address.get('city')).trim(),
          address: String(address.get('address')).trim()
        },
        payment: payment.value
      };
      saveOrders([order, ...orders]);
      try {
        window.InnoCart.clearCart();
      } catch (error) {
        saveOrders(orders);
        throw error;
      }

      confirmationOrderId = order.id;
      form.hidden = true;
      document.getElementById('confirmation-order-id').textContent = order.id;
      document.getElementById('order-confirmation').hidden = false;
      document.getElementById('checkout-progress-fill').style.width = '100%';
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save your order.';
      const errorElement = document.getElementById('checkout-error');
      errorElement.textContent = message;
      errorElement.hidden = false;
      submitButton.disabled = false;
    }
  }

  function currentStatus(order) {
    const elapsed = Math.max(0, Date.now() - Date.parse(order.date));
    const index = Math.min(ORDER_STEPS.length - 1, Math.floor(elapsed / STEP_INTERVAL_MS));
    const timeline = ORDER_STEPS.slice(0, index + 1).map((status, stepIndex) => ({
      status,
      at: new Date(Date.parse(order.date) + stepIndex * STEP_INTERVAL_MS).toISOString()
    }));
    const changed = order.status !== ORDER_STEPS[index]
      || JSON.stringify(order.timeline) !== JSON.stringify(timeline);
    order.status = ORDER_STEPS[index];
    order.timeline = timeline;
    return { index, status: order.status, changed };
  }

  function renderTimeline(order, container) {
    const current = currentStatus(order);
    order.status = current.status;
    const timeline = createEl('ol', 'order-timeline');

    ORDER_STEPS.forEach((label, index) => {
      const item = createEl('li', index < current.index ? 'complete' : index === current.index ? 'current' : '');
      item.appendChild(createEl('span', 'order-timeline-dot'));
      item.appendChild(createEl('span', 'order-timeline-label', label));
      const event = order.timeline && order.timeline[index];
      if (event) {
        const time = createEl('time', 'order-timeline-time',
          new Date(event.at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }));
        time.dateTime = event.at;
        item.appendChild(time);
      }
      timeline.appendChild(item);
    });

    const heading = createEl('div', 'order-result-heading');
    heading.appendChild(createEl('strong', '', order.id));
    heading.appendChild(createEl('span', 'order-status-badge', current.status));
    const result = createEl('article', 'order-result-card');
    result.append(heading, timeline);
    container.replaceChildren(result);
  }

  function renderOrdersList() {
    const list = document.getElementById('orders-list');
    list.replaceChildren();
    const orders = getOrders();
    if (orders.length === 0) {
      list.appendChild(createEl('p', 'orders-empty', 'No orders yet. Orders you place will appear here.'));
      return;
    }

    let statusChanged = false;
    orders.forEach(order => {
      const current = currentStatus(order);
      statusChanged = statusChanged || current.changed;
      const card = createEl('article', 'orders-list-card');
      card.appendChild(createEl('strong', '', order.id));
      card.appendChild(createEl('span', '', `${formatPrice(order.total)} · ${new Date(order.date).toLocaleString()}`));
      card.appendChild(createEl('span', 'order-status-badge', current.status));
      const track = createEl('button', 'btn btn-secondary btn-sm', 'Track order');
      track.type = 'button';
      track.addEventListener('click', () => trackOrder(order.id));
      card.appendChild(track);
      list.appendChild(card);
    });
    if (statusChanged) saveOrders(orders);
  }

  function trackOrder(id) {
    setMessage('', false);
    try {
      const orders = getOrders();
      const order = orders.find(entry => entry.id.toUpperCase() === id.trim().toUpperCase());
      const result = document.getElementById('order-tracking-result');
      if (!order) {
        result.hidden = true;
        setMessage('We could not find that order ID. Check it and try again.', true);
        return;
      }
      result.hidden = false;
      const previousStatus = order.status;
      const previousTimeline = JSON.stringify(order.timeline || []);
      renderTimeline(order, result);
      if (previousStatus !== order.status || previousTimeline !== JSON.stringify(order.timeline)) {
        saveOrders(orders);
        return true;
      }
      return false;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load order tracking.', true);
      return false;
    }
  }

  function showMyOrders() {
    setMessage('', false);
    document.getElementById('order-tracking-result').hidden = true;
    window.InnoCart.closeCart();
    document.getElementById('cart-toggle-btn').focus();
    showPanel('my-orders-panel');
    try {
      renderOrdersList();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load orders.', true);
    }
  }

  function init() {
    document.getElementById('checkout-next').addEventListener('click', () => {
      if (!validateActiveStep()) return;
      if (activeStep < 3) {
        activeStep += 1;
        renderCheckoutStep();
      }
    });

    document.getElementById('checkout-back').addEventListener('click', () => {
      if (activeStep > 1) {
        activeStep -= 1;
        renderCheckoutStep();
      }
    });

    document.getElementById('checkout-form').addEventListener('submit', placeOrder);
    document.getElementById('checkout-form').addEventListener('input', event => {
      if (event.target.matches('input[required], textarea[required]')) {
        updateFieldError(event.target, event.target.getAttribute('aria-invalid') === 'true');
        updateCheckoutButtons();
      }
    });
    document.getElementById('checkout-form').addEventListener('change', event => {
      if (event.target.matches('input[required], textarea[required]')) {
        updateFieldError(event.target, event.target.getAttribute('aria-invalid') === 'true');
        updateCheckoutButtons();
      }
    });
    document.getElementById('checkout-form').addEventListener('focusout', event => {
      if (event.target.matches('input[required], textarea[required]')) {
        updateFieldError(event.target, true);
        updateCheckoutButtons();
      }
    });
    document.getElementById('my-orders-btn').addEventListener('click', showMyOrders);
    document.getElementById('order-track-form').addEventListener('submit', event => {
      event.preventDefault();
      trackOrder(document.getElementById('order-track-id').value);
    });
    document.querySelectorAll('[data-orders-close]').forEach(button => {
      button.addEventListener('click', closePanels);
    });
    document.getElementById('confirmation-track-order').addEventListener('click', () => {
      closePanels();
      showMyOrders();
      document.getElementById('order-track-id').value = confirmationOrderId;
      trackOrder(confirmationOrderId);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && document.querySelector('.orders-panel.is-open')) closePanels();
    });

    window.setInterval(() => {
      const activeOrder = document.querySelector('#order-tracking-result:not([hidden]) .order-result-card');
      if (activeOrder) {
        const orderId = activeOrder.querySelector('.order-result-heading strong').textContent;
        trackOrder(orderId);
      }
      if (document.getElementById('my-orders-panel').classList.contains('is-open')) {
        try {
          renderOrdersList();
        } catch (error) {
          setMessage(error instanceof Error ? error.message : 'Unable to refresh orders.', true);
        }
      }
    }, 1000);
  }

  window.InnoOrders = { openCheckout, openMyOrders: showMyOrders };
  document.addEventListener('DOMContentLoaded', init);
})();
