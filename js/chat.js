// InnoKart - scripted product assistant
(function () {
  'use strict';

  const MAX_MESSAGE_LENGTH = 200;
  const ORDER_STEPS = ['Placed', 'Packed', 'Shipped', 'Delivered'];
  const ORDER_STEP_MS = 20000;
  const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'by', 'for', 'from', 'have', 'how', 'i', 'in', 'is',
    'it', 'me', 'my', 'of', 'on', 'or', 'the', 'this', 'to', 'want', 'what', 'with'
  ]);
  const SYNONYMS = {
    light: ['lamp', 'lighting'],
    electricity: ['electric', 'power', 'grid'],
    'no electricity': ['emergency', 'hand-crank', 'kinetic'],
    plant: ['plants', 'agriculture', 'agritech'],
    dying: ['moisture', 'drought', 'over-water'],
    water: ['watering', 'moisture', 'soil'],
    cheap: ['budget', 'affordable', 'price'],
    speaker: ['audio', 'bluetooth', 'acoustic'],
    air: ['purifier', 'clean-air', 'hepa'],
    battery: ['powerbank', 'recycled', 'lithium'],
    solar: ['sunlight', 'charger', 'portable']
  };
  const QUICK_OPTIONS = [
    'Show SunSlate v2 specs',
    'How do I place an order?',
    'Track an order',
    'Demo login'
  ];

  let panel;
  let log;
  let input;
  let opener;
  let replyQueue = Promise.resolve();

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function getCatalog() {
    return typeof inventions === 'undefined' ? [] : inventions;
  }

  function addMessage(text, type, actions) {
    const message = el('div', `chat-message chat-message-${type}`);
    message.textContent = text;
    if (actions && actions.length) {
      const actionRow = el('div', 'chat-actions');
      actions.forEach(action => {
        const button = el('button', 'chat-action', action.label);
        button.type = 'button';
        button.addEventListener('click', () => {
          setOpen(false);
          action.run();
        });
        actionRow.appendChild(button);
      });
      message.appendChild(actionRow);
    }
    log.appendChild(message);
    log.scrollTop = log.scrollHeight;
    return message;
  }

  function showQuickOptions() {
    const options = el('div', 'chat-quick-options');
    QUICK_OPTIONS.forEach(option => {
      const button = el('button', 'chat-quick-option', option);
      button.type = 'button';
      button.addEventListener('click', () => sendMessage(option));
      options.appendChild(button);
    });
    log.appendChild(options);
    log.scrollTop = log.scrollHeight;
  }

  function queueReply(text, actions, showOptions) {
    replyQueue = replyQueue.then(() => new Promise(resolve => {
      const typing = el('div', 'chat-typing');
      typing.setAttribute('aria-label', 'InnoBot is typing');
      typing.append(el('span'), el('span'), el('span'));
      log.appendChild(typing);
      log.scrollTop = log.scrollHeight;

      window.setTimeout(() => {
        typing.remove();
        addMessage(text, 'bot', actions);
        if (showOptions) showQuickOptions();
        resolve();
      }, 600);
    }));
  }

  function normalize(text) {
    return text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
  }

  function tokenize(text) {
    return normalize(text).split(' ').filter(token => token.length > 1 && !STOP_WORDS.has(token));
  }

  function scoreInvention(invention, query) {
    const normalizedQuery = normalize(query);
    const source = normalize([
      invention.name,
      invention.category,
      invention.tags.join(' '),
      invention.problem,
      invention.solution
    ].join(' '));
    const tags = invention.tags.map(normalize);
    let score = 0;

    tokenize(query).forEach(token => {
      const matches = [token, ...(SYNONYMS[token] || [])];
      matches.forEach(term => {
        if (tags.some(tag => tag.includes(term))) score += term === token ? 4 : 2;
        if (normalize(invention.problem).includes(term)) score += term === token ? 3 : 1;
        if (normalize(invention.solution).includes(term)) score += term === token ? 2 : 1;
        if (normalize(invention.name).includes(term)) score += 3;
      });
    });

    if (normalizedQuery.includes('without electricity') &&
        tags.some(tag => ['emergency', 'hand-crank', 'kinetic'].some(term => tag.includes(term)))) {
      score += 8;
    }
    return score;
  }

  function findBestMatch(query) {
    return getCatalog()
      .map(invention => ({ invention, score: scoreInvention(invention, query) }))
      .sort((a, b) => b.score - a.score || a.invention.price - b.invention.price)[0];
  }

  function findMentionedProducts(query) {
    const normalizedQuery = normalize(query);
    return getCatalog()
      .filter(invention => normalizedQuery.includes(normalize(invention.name)) ||
        normalizedQuery.includes(normalize(invention.id)))
      .slice(0, 2);
  }

  function productAction(invention) {
    return {
      label: `Open ${invention.name}`,
      run: () => window.InnoCart.openDetail(invention.id)
    };
  }

  function compareAction(first, second) {
    return {
      label: 'Compare',
      run: () => {
        if (!window.InnoCompare) return;
        window.InnoCompare.getSelectedInventions().forEach(item => window.InnoCompare.toggle(item.id, false));
        window.InnoCompare.toggle(first.id, true);
        window.InnoCompare.toggle(second.id, true);
        window.InnoCompare.openModal();
      }
    };
  }

  function shortDescription(invention) {
    const text = invention.solution;
    return text.length > 105 ? `${text.slice(0, 102).trimEnd()}…` : text;
  }

  function parseBudget(query) {
    const match = query.match(/(?:under|below|within|budget(?:\s+of)?|less than|up to|upto|₹|rs\.?)\s*₹?\s*([\d,]+)/i) ||
      query.match(/([\d,]+)\s*(?:rupees|rs|₹)/i);
    if (!match) return null;
    const amount = Number(match[1].replace(/,/g, ''));
    return Number.isFinite(amount) ? amount : null;
  }

  function formatPrice(price) {
    return `₹${Number(price).toLocaleString('en-IN')}`;
  }

  function getOrderStatus(order) {
    const elapsed = Math.max(0, Date.now() - Date.parse(order.date));
    const index = Math.min(ORDER_STEPS.length - 1, Math.floor(elapsed / ORDER_STEP_MS));
    return ORDER_STEPS[index];
  }

  function orderReply(orderId) {
    let orders;
    try {
      const saved = localStorage.getItem('innokart_orders');
      orders = saved ? JSON.parse(saved) : [];
    } catch (error) {
      return { text: 'I could not read the saved order data in this browser.' };
    }
    if (!Array.isArray(orders)) return { text: 'Saved order data is unavailable.' };
    const order = orders.find(entry => entry && typeof entry.id === 'string' &&
      typeof entry.date === 'string' && Number.isFinite(Date.parse(entry.date)) &&
      entry.id.toUpperCase() === orderId.toUpperCase());
    if (!order) return { text: `I could not find order ${orderId}. Check the ID and try again.` };

    const status = getOrderStatus(order);
    if (order.status !== status) {
      order.status = status;
      try {
        localStorage.setItem('innokart_orders', JSON.stringify(orders));
      } catch (error) {
        return { text: `Order ${order.id} is ${status.toLowerCase()}, but I could not save the updated demo status.` };
      }
    }
    return { text: `Order ${order.id} is currently: ${status}.` };
  }

  function respond(query) {
    const normalized = normalize(query);
    const orderId = query.match(/\bINK-\d{5}\b/i);
    if (orderId) return orderReply(orderId[0]);

    if (/\b(cart|basket)\b/.test(normalized)) {
      const cart = window.InnoCart ? window.InnoCart.getCart() : [];
      if (!cart.length) {
        return {
          text: 'Your cart is empty.',
          actions: [{ label: 'Open cart', run: () => window.InnoCart.openCart() }]
        };
      }
      const lines = cart.map(item => {
        const invention = getCatalog().find(entry => entry.id === item.id);
        return invention ? `${invention.name} × ${item.quantity}` : '';
      }).filter(Boolean);
      const total = cart.reduce((sum, item) => {
        const invention = getCatalog().find(entry => entry.id === item.id);
        return sum + (invention ? invention.price * item.quantity : 0);
      }, 0);
      return {
        text: `In your cart: ${lines.join(', ')}. Total: ${formatPrice(total)}.`,
        actions: [{ label: 'Open cart', run: () => window.InnoCart.openCart() }]
      };
    }

    if (/\b(login|log in|sign in|account)\b/.test(normalized)) {
      return {
        text: 'Accounts are stored locally in this browser for the offline demo. Please do not use a real password.',
        actions: [{ label: 'Open account', run: () => window.InnoAuth && window.InnoAuth.open() }]
      };
    }

    if (/\b(order status|track(?:ing)? an? order|where is my order|track my order)\b/.test(normalized)) {
      return {
        text: 'Enter a saved order ID (for example, INK-12345) to see its Placed, Packed, Shipped, or Delivered timeline.',
        actions: [{ label: 'Open order tracking', run: () => window.InnoOrders && window.InnoOrders.openMyOrders() }]
      };
    }

    if (/\b(how (?:do i|can i) (?:place|make|complete) an order|how to order|place an order|ordering)\b/.test(normalized)) {
      return {
        text: 'Open an invention and add it to your cart. Proceed to checkout, sign in with a local demo account, enter your delivery details, choose a demo payment method, and place the order. No payment is processed.',
        actions: [{ label: 'Browse inventions', run: () => document.getElementById('inventions').scrollIntoView({ behavior: 'smooth' }) }]
      };
    }

    if (/\b(sell|selling|submit|list my|my invention|maker)\b/.test(normalized)) {
      return {
        text: 'Want to sell your invention? InnoKart’s maker desk can help you submit it.',
        actions: [{
          label: 'Submit an invention',
          run: () => document.getElementById('makers').scrollIntoView({ behavior: 'smooth' })
        }]
      };
    }

    if (/\b(how does|how do|how .*work|work)\b/.test(normalized)) {
      const mentioned = findMentionedProducts(normalized);
      const match = mentioned[0] || findBestMatch(normalized).invention;
      return {
        text: `${match.name} works in 3 steps:\n${match.howItWorks.map((step, index) => `${index + 1}. ${step}`).join('\n')}`,
        actions: [productAction(match)]
      };
    }

    if (/\bcompare\b/.test(normalized)) {
      const mentioned = findMentionedProducts(normalized);
      const matches = mentioned.length >= 2
        ? mentioned
        : getCatalog().map(invention => ({
          invention,
          score: scoreInvention(invention, normalized.replace(/\bcompare\b/g, ''))
        })).sort((a, b) => b.score - a.score).slice(0, 2).map(item => item.invention);
      if (matches.length < 2) return { text: 'I need two invention names to compare. Try “compare SunSlate v2 and Root Buddy”.' };
      return {
        text: `${matches[0].name} (${formatPrice(matches[0].price)}): ${shortDescription(matches[0])} ${matches[1].name} (${formatPrice(matches[1].price)}): ${shortDescription(matches[1])}`,
        actions: [compareAction(matches[0], matches[1])]
      };
    }

    if (/\b(cheapest|lowest price|least expensive)\b/.test(normalized)) {
      const cheapest = [...getCatalog()].sort((a, b) => a.price - b.price)[0];
      return {
        text: `${cheapest.name} is the cheapest invention at ${formatPrice(cheapest.price)}.`,
        actions: [productAction(cheapest)]
      };
    }

    const mentioned = findMentionedProducts(normalized);
    const bestMatch = findBestMatch(query);
    const product = mentioned[0] || (bestMatch && bestMatch.score > 0 ? bestMatch.invention : null);
    if (product && /\b(price|cost|how much)\b/.test(normalized)) {
      return {
        text: `${product.name} costs ${formatPrice(product.price)}.`,
        actions: [productAction(product)]
      };
    }
    if (product && /\b(recycled|recycl(?:ed|able)|salvaged|percent|percentage)\b/.test(normalized)) {
      return {
        text: `${product.name} uses ${product.recycledPercent}% salvaged or recycled parts.`,
        actions: [productAction(product)]
      };
    }
    if (product && /\b(spec|specs|specification|battery|output|capacity|weight|size|port|voltage)\b/.test(normalized)) {
      const specs = product.specs.map(spec => `${spec.label}: ${spec.value}`).join('; ');
      return {
        text: `${product.name} specs — ${specs}.`,
        actions: [productAction(product)]
      };
    }

    const budget = parseBudget(query);
    if (budget !== null && /\b(gift|present|under|below|budget|less than|up to|upto)\b/.test(normalized)) {
      const options = getCatalog().filter(invention => invention.price <= budget).sort((a, b) => a.price - b.price);
      if (!options.length) return { text: `There are no inventions under ${formatPrice(budget)} right now.` };
      const best = options[0];
      return {
        text: `For a gift under ${formatPrice(budget)}, try ${best.name} at ${formatPrice(best.price)}. ${best.solution}`,
        actions: [productAction(best)]
      };
    }

    const best = findBestMatch(query);
    if (best && best.score > 0) {
      return {
        text: `I recommend ${best.invention.name}. ${best.invention.problem}`,
        actions: [productAction(best.invention)]
      };
    }
    return {
      text: 'I’m not sure what you mean yet. Try one of these:',
      quickOptions: true
    };
  }

  function sendMessage(text) {
    const value = String(text).slice(0, MAX_MESSAGE_LENGTH).trim();
    if (!value) return;
    addMessage(value, 'user');
    input.value = '';
    input.focus();

    const answer = respond(value);
    queueReply(answer.text, answer.actions, answer.quickOptions);
  }

  function setOpen(isOpen) {
    if (!isOpen) opener.focus();
    panel.classList.toggle('is-open', isOpen);
    panel.setAttribute('aria-hidden', String(!isOpen));
    opener.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
      if (!window.matchMedia('(pointer: coarse)').matches) input.focus();
    }
  }

  function init() {
    opener = el('button', 'chat-launcher', 'Chat with InnoBot');
    opener.type = 'button';
    opener.setAttribute('aria-label', 'Open InnoBot chat');
    opener.setAttribute('aria-expanded', 'false');
    opener.setAttribute('aria-controls', 'innokart-chat-panel');

    panel = el('section', 'chat-panel');
    panel.id = 'innokart-chat-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'InnoBot product assistant');
    panel.setAttribute('aria-hidden', 'true');

    const header = el('header', 'chat-header');
    const titleGroup = el('div', 'chat-title-group');
    titleGroup.append(el('strong', '', 'InnoBot'), el('span', '', 'Hardware shopping assistant'));
    const close = el('button', 'chat-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close chat');
    header.append(titleGroup, close);

    log = el('div', 'chat-log');
    log.id = 'innokart-chat-log';
    log.setAttribute('role', 'log');
    log.setAttribute('aria-live', 'polite');
    log.setAttribute('aria-relevant', 'additions text');
    addMessage('Hi! Tell me what you need, or ask about an invention, your cart, or an order.', 'bot');
    showQuickOptions();

    const form = el('form', 'chat-form');
    input = el('input', 'chat-input');
    input.type = 'text';
    input.name = 'message';
    input.maxLength = MAX_MESSAGE_LENGTH;
    input.autocomplete = 'off';
    input.placeholder = 'Describe what you need…';
    input.setAttribute('aria-label', 'Message InnoBot');
    const send = el('button', 'chat-send', 'Send');
    send.type = 'submit';
    form.append(input, send);

    panel.append(header, log, form);
    document.body.append(opener, panel);

    opener.addEventListener('click', () => setOpen(!panel.classList.contains('is-open')));
    close.addEventListener('click', () => setOpen(false));
    form.addEventListener('submit', event => {
      event.preventDefault();
      sendMessage(input.value);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && panel.classList.contains('is-open')) setOpen(false);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
