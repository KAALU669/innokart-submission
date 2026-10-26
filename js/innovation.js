/**
 * InnoKart - Innovation Features
 * File: js/innovation.js
 * 
 * Implements two browser-calculated features using data.js:
 * 1. Side-by-Side Comparison (Max 3 items, floating bar, dynamic best-value highlighting)
 * 2. Impact Calculator (SunSlate v2 solar generation & ReCell 10K salvaged battery savings)
 * 
 * Respects prefers-reduced-motion and matches the site's design tokens and easing curves.
 */

(function () {
  'use strict';

  // Helper: Get catalog data safely
  function getCatalog() {
    return (typeof inventions !== 'undefined' && Array.isArray(inventions)) ? inventions : [];
  }

  // Helper: Motion preference
  function isReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Toast notification helper
  function showToast(message) {
    if (typeof window.showToastNotice === 'function') {
      window.showToastNotice(message);
      return;
    }
    const toast = document.getElementById('toast-notice');
    const toastMsg = document.getElementById('toast-msg');
    if (!toast || !toastMsg) return;
    toastMsg.textContent = message;
    toast.classList.add('show');
    clearTimeout(window.__toastTimeout);
    window.__toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // Smooth number interpolation with cubic-bezier(.2, .8, .2, 1) approximation
  function animateMetricNumber(element, startVal, targetVal, duration = 280, isCurrency = false, decimals = 0) {
    if (!element) return;
    if (isReducedMotion() || duration <= 0 || isNaN(startVal)) {
      element.textContent = isCurrency
        ? `₹${Math.round(targetVal).toLocaleString('en-IN')}`
        : targetVal.toFixed(decimals);
      return;
    }

    const startTime = performance.now();
    const diff = targetVal - startVal;

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing cubic-bezier(.2, .8, .2, 1) curve
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + diff * ease;

      element.textContent = isCurrency
        ? `₹${Math.round(current).toLocaleString('en-IN')}`
        : current.toFixed(decimals);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        element.textContent = isCurrency
          ? `₹${Math.round(targetVal).toLocaleString('en-IN')}`
          : targetVal.toFixed(decimals);
      }
    }

    requestAnimationFrame(step);
  }

  // =========================================================================
  // 1. INNO COMPARE (Selection, Floating Bar, Side-by-Side Modal Table)
  // =========================================================================
  const MAX_COMPARE = 3;
  const COMPARE_STORAGE_KEY = 'innokart_compare';
  let selectedIds = [];
  let lastFocusedEl = null;

  function persistSelection() {
    try {
      localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(selectedIds));
      return true;
    } catch (error) {
      showToast('Comparison changes could not be saved in this browser.');
      return false;
    }
  }

  function loadSelection() {
    try {
      const saved = localStorage.getItem(COMPARE_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) throw new TypeError('Saved comparison data is not a list.');
      const validIds = new Set(getCatalog().map(inv => inv.id));
      selectedIds = parsed.filter((id, index) =>
        typeof id === 'string' && validIds.has(id) && parsed.indexOf(id) === index
      ).slice(0, MAX_COMPARE);
    } catch (error) {
      selectedIds = [];
      showToast('Saved comparison data could not be loaded.');
    }
  }

  const InnoCompare = {
    isSelected(id) {
      return selectedIds.includes(id);
    },

    getSelectedCount() {
      return selectedIds.length;
    },

    getSelectedInventions() {
      const catalog = getCatalog();
      return selectedIds
        .map(id => catalog.find(inv => inv.id === id))
        .filter(Boolean);
    },

    toggle(id, shouldSelect, checkboxEl) {
      const inv = getCatalog().find(i => i.id === id);
      if (!inv && shouldSelect) return false;
      const previousIds = [...selectedIds];

      if (shouldSelect) {
        if (selectedIds.includes(id)) return true;
        if (selectedIds.length >= MAX_COMPARE) {
          showToast(`You can compare up to ${MAX_COMPARE} inventions at a time.`);
          if (checkboxEl) checkboxEl.checked = false;
          return false;
        }
        selectedIds.push(id);
      } else {
        selectedIds = selectedIds.filter(item => item !== id);
      }

      if (!persistSelection()) {
        selectedIds = previousIds;
        if (checkboxEl) checkboxEl.checked = selectedIds.includes(id);
        return false;
      }
      this.updateUI();

      // If comparison modal is open, re-render or close if empty
      const modal = document.getElementById('compare-modal');
      if (modal && modal.classList.contains('is-open')) {
        if (selectedIds.length === 0) {
          this.closeModal();
        } else {
          this.renderComparisonTable();
        }
      }

      return true;
    },

    remove(id) {
      this.toggle(id, false);
    },

    clear() {
      const previousIds = [...selectedIds];
      selectedIds = [];
      if (!persistSelection()) {
        selectedIds = previousIds;
        this.updateUI();
        return;
      }
      this.updateUI();
      this.closeModal();
    },

    updateUI() {
      // 1. Synchronize all checkboxes on the catalog grid
      const checkboxes = document.querySelectorAll('.compare-checkbox');
      checkboxes.forEach(cb => {
        const id = cb.getAttribute('data-id');
        cb.checked = selectedIds.includes(id);
      });

      // 2. Update floating compare bar
      const bar = document.getElementById('compare-bar');
      const countEl = document.getElementById('compare-bar-count');
      const openBtn = document.getElementById('btn-compare-open');
      const thumbnailsEl = document.getElementById('compare-thumbnails');

      if (!bar) return;

      const count = selectedIds.length;
      if (count > 0) {
        bar.classList.add('is-visible');
        bar.setAttribute('aria-hidden', 'false');
      } else {
        if (bar.contains(document.activeElement)) {
          const focusTarget = Array.from(checkboxes).find(checkbox => checkbox.getClientRects().length > 0);
          if (focusTarget) focusTarget.focus();
          else document.activeElement.blur();
        }
        bar.classList.remove('is-visible');
        bar.setAttribute('aria-hidden', 'true');
      }

      if (countEl) countEl.textContent = `${count} / ${MAX_COMPARE}`;
      if (openBtn) {
        openBtn.textContent = `Compare (${count})`;
        openBtn.disabled = count === 0;
      }

      if (thumbnailsEl) {
        while (thumbnailsEl.firstChild) {
          thumbnailsEl.removeChild(thumbnailsEl.firstChild);
        }

        const selected = this.getSelectedInventions();
        selected.forEach(inv => {
          const chip = document.createElement('span');
          chip.className = 'compare-chip';

          const nameSpan = document.createElement('span');
          nameSpan.textContent = inv.name;

          const removeBtn = document.createElement('button');
          removeBtn.className = 'compare-chip-remove';
          removeBtn.setAttribute('aria-label', `Remove ${inv.name} from comparison`);
          removeBtn.textContent = '×';
          removeBtn.style.background = 'none';
          removeBtn.style.border = 'none';
          removeBtn.style.cursor = 'pointer';
          removeBtn.style.padding = '0';
          removeBtn.style.marginLeft = '4px';
          removeBtn.style.fontSize = '14px';
          removeBtn.style.lineHeight = '1';

          removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            InnoCompare.remove(inv.id);
          });

          chip.appendChild(nameSpan);
          chip.appendChild(removeBtn);
          thumbnailsEl.appendChild(chip);
        });
      }
    },

    renderComparisonTable() {
      const container = document.getElementById('compare-table-container');
      if (!container) return;

      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      const selected = this.getSelectedInventions();
      if (selected.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.className = 'section-subhead';
        emptyMsg.textContent = 'No inventions selected. Select up to 3 cards using the "Compare" checkbox.';
        container.appendChild(emptyMsg);
        return;
      }

      const table = document.createElement('table');
      table.className = 'compare-table';

      // THEAD
      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');

      const featureTh = document.createElement('th');
      featureTh.textContent = 'Specification / Metric';
      headRow.appendChild(featureTh);

      selected.forEach(inv => {
        const th = document.createElement('th');
        const headerDiv = document.createElement('div');
        headerDiv.className = 'compare-device-header';

        const nameEl = document.createElement('div');
        nameEl.className = 'compare-device-name';
        nameEl.textContent = inv.name;

        const catEl = document.createElement('div');
        catEl.className = 'compare-device-cat';
        catEl.textContent = inv.category;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-secondary btn-xs';
        removeBtn.style.marginTop = '6px';
        removeBtn.style.fontSize = '11px';
        removeBtn.style.padding = '2px 8px';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => {
          InnoCompare.remove(inv.id);
        });

        headerDiv.appendChild(nameEl);
        headerDiv.appendChild(catEl);
        headerDiv.appendChild(removeBtn);
        th.appendChild(headerDiv);
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);

      // TBODY
      const tbody = document.createElement('tbody');

      // Helper function to build comparison row
      function addComparisonRow(label, getValueFn, getBestFn, formatDisplayFn) {
        const tr = document.createElement('tr');
        const labelTd = document.createElement('td');
        labelTd.className = 'compare-row-label';
        labelTd.textContent = label;
        tr.appendChild(labelTd);

        const values = selected.map(getValueFn);
        const bestIndices = getBestFn ? getBestFn(values) : [];

        selected.forEach((inv, idx) => {
          const td = document.createElement('td');
          td.className = 'compare-cell';
          const isBest = bestIndices.includes(idx);
          if (isBest) {
            td.classList.add('is-best');
          }

          const valText = document.createTextNode(formatDisplayFn ? formatDisplayFn(values[idx], inv) : String(values[idx]));
          td.appendChild(valText);

          if (isBest && selected.length > 1) {
            const pill = document.createElement('span');
            pill.className = 'compare-best-pill';
            pill.textContent = 'Best';
            td.appendChild(pill);
          }

          tr.appendChild(td);
        });

        tbody.appendChild(tr);
      }

      // 1. Price (Best = Lowest price)
      addComparisonRow(
        'Price',
        inv => inv.price,
        vals => {
          const valid = vals.filter(v => typeof v === 'number' && !isNaN(v));
          if (valid.length === 0) return [];
          const min = Math.min(...valid);
          return vals.map((v, i) => v === min ? i : -1).filter(i => i !== -1);
        },
        val => `₹${Number(val).toLocaleString('en-IN')}`
      );

      // 2. Build Effort / Days (Best = Lowest build days)
      addComparisonRow(
        'Build Effort',
        inv => inv.buildDays,
        vals => {
          const valid = vals.filter(v => typeof v === 'number' && !isNaN(v));
          if (valid.length === 0) return [];
          const min = Math.min(...valid);
          return vals.map((v, i) => v === min ? i : -1).filter(i => i !== -1);
        },
        val => `${val} Days`
      );

      // 3. Recycled % (Best = Highest recycled percentage)
      addComparisonRow(
        'Recycled Materials',
        inv => inv.recycledPercent,
        vals => {
          const valid = vals.filter(v => typeof v === 'number' && !isNaN(v));
          if (valid.length === 0) return [];
          const max = Math.max(...valid);
          return vals.map((v, i) => v === max ? i : -1).filter(i => i !== -1);
        },
        val => `${val}%`
      );

      // 4. Total Parts Cost (Sum of all parts.costInr; Best = Lowest parts cost)
      addComparisonRow(
        'Total Parts Cost',
        inv => (inv.parts || []).reduce((sum, p) => sum + (p.costInr || 0), 0),
        vals => {
          const valid = vals.filter(v => typeof v === 'number' && !isNaN(v));
          if (valid.length === 0) return [];
          const min = Math.min(...valid);
          return vals.map((v, i) => v === min ? i : -1).filter(i => i !== -1);
        },
        val => `₹${Number(val).toLocaleString('en-IN')}`
      );

      // 5. Each Spec Row
      // Gather all unique specs across selected inventions
      const allSpecLabels = [];
      selected.forEach(inv => {
        (inv.specs || []).forEach(s => {
          if (!allSpecLabels.includes(s.label)) {
            allSpecLabels.push(s.label);
          }
        });
      });

      // Helper to parse numeric values from spec strings (e.g. "15 W Peak" -> 15, "10,000 mAh" -> 10000)
      function parseSpecNumber(valStr) {
        if (!valStr || typeof valStr !== 'string') return null;
        const match = valStr.replace(/,/g, '').match(/[-+]?\d*\.?\d+/);
        return match ? parseFloat(match[0]) : null;
      }

      // Helper to determine whether higher or lower is better
      function getSpecDirection(label, valStr) {
        const combined = `${label} ${valStr}`.toLowerCase();
        if (combined.includes('noise') || combined.includes('db') || combined.includes('standby') || combined.includes('current') || combined.includes('ua')) {
          return 'min'; // Lower noise / lower standby leakage is better
        }
        if (combined.includes('output') || combined.includes('w') || combined.includes('battery') || combined.includes('capacity') || combined.includes('mah') || combined.includes('cadr') || combined.includes('months') || combined.includes('life')) {
          return 'max'; // Higher output power, capacity, or CADR is better
        }
        return null;
      }

      allSpecLabels.forEach(specLabel => {
        addComparisonRow(
          specLabel,
          inv => {
            const found = (inv.specs || []).find(s => s.label === specLabel);
            return found ? found.value : '—';
          },
          vals => {
            let direction = null;
            for (let v of vals) {
              if (v && v !== '—') {
                direction = getSpecDirection(specLabel, v);
                if (direction) break;
              }
            }
            if (!direction) return [];

            const parsed = vals.map(v => (v !== '—' ? parseSpecNumber(v) : null));
            const validNumbers = parsed.filter(n => n !== null && !isNaN(n));
            if (validNumbers.length <= 1) return []; // Only highlight if multiple items can be compared

            const target = direction === 'min' ? Math.min(...validNumbers) : Math.max(...validNumbers);
            return parsed.map((n, i) => n === target ? i : -1).filter(i => i !== -1);
          },
          val => val
        );
      });

      table.appendChild(tbody);
      container.appendChild(table);
    },

    openModal() {
      if (selectedIds.length === 0) {
        showToast('Select at least 1 invention to compare.');
        return;
      }

      lastFocusedEl = document.activeElement;
      this.renderComparisonTable();

      const modal = document.getElementById('compare-modal');
      if (!modal) return;

      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-opened');

      const closeBtn = document.getElementById('compare-modal-close-btn');
      if (closeBtn) closeBtn.focus();
    },

    closeModal() {
      const modal = document.getElementById('compare-modal');
      if (!modal) return;

      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-opened');

      if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') {
        lastFocusedEl.focus();
      }
    }
  };

  // =========================================================================
  // 2. IMPACT CALCULATOR (SunSlate v2 & ReCell 10K)
  // =========================================================================
  const InnoImpact = {
    activeDevice: 'sunslate-v2', // 'sunslate-v2' | 'recell-10k'
    sunlightHours: 5,
    phonesPerDay: 2,
    prevCharges: 0,
    prevSavings: 0,

    init() {
      const sunlightSlider = document.getElementById('calc-sunlight');
      const phonesSlider = document.getElementById('calc-phones');
      const sunlightVal = document.getElementById('calc-sunlight-val');
      const phonesVal = document.getElementById('calc-phones-val');

      if (sunlightSlider) {
        sunlightSlider.addEventListener('input', (e) => {
          this.sunlightHours = parseFloat(e.target.value);
          if (sunlightVal) sunlightVal.textContent = `${this.sunlightHours} hrs`;
          this.calculate();
        });
      }

      if (phonesSlider) {
        phonesSlider.addEventListener('input', (e) => {
          this.phonesPerDay = parseInt(e.target.value, 10);
          if (phonesVal) phonesVal.textContent = `${this.phonesPerDay} phone${this.phonesPerDay > 1 ? 's' : ''}`;
          this.calculate();
        });
      }

      // Device switch tabs
      const deviceBtns = document.querySelectorAll('.calc-device-btn');
      deviceBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          deviceBtns.forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
          });
          btn.classList.add('active');
          btn.setAttribute('aria-selected', 'true');
          this.activeDevice = btn.getAttribute('data-device') || 'sunslate-v2';
          this.calculate();
        });
      });

      // Initial calculation
      this.calculate(true);
    },

    calculate(isInitial = false) {
      const chargesEl = document.getElementById('calc-result-charges');
      const savingsEl = document.getElementById('calc-result-savings');
      const formulaEl = document.getElementById('calc-formula-text');

      let chargesPerDay = 0;
      let savingsPerMonth = 0;
      let formulaText = '';

      if (this.activeDevice === 'sunslate-v2') {
        // SunSlate v2 specs: 15W peak monocrystalline panel with MPPT regulation
        // Average phone battery capacity: 12 Wh (~3,200 mAh @ 3.7V)
        // Energy generated per day (Wh): 15W * sunlightHours * 0.75 derating factor
        const dailyWh = 15 * this.sunlightHours * 0.75;
        const availableSolarCharges = dailyWh / 12;
        // Charges served per day is constrained by solar generation and user demand
        chargesPerDay = Math.min(Number(availableSolarCharges.toFixed(1)), this.phonesPerDay);
        // Savings: ₹10 per phone charge (commercial kiosk / grid offset)
        savingsPerMonth = Math.round(chargesPerDay * 30 * 10);

        formulaText = `Solar Formula: (15W panel × ${this.sunlightHours}h sunlight × 75% efficiency) ÷ 12Wh phone battery = ${availableSolarCharges.toFixed(1)} charges solar capacity. Serving ${this.phonesPerDay} phone(s)/day saves ${chargesPerDay.toFixed(1)} charges × 30 days × ₹10/charge = ₹${savingsPerMonth.toLocaleString('en-IN')}/month (estimate).`;
      } else {
        // ReCell 10K specs: 10,000 mAh (37 Wh) salvaged 18650 lithium cells
        // Solar/assisted recharge energy: capped at 37 Wh pack capacity
        const dailyRechargeWh = Math.min(37, 10 * this.sunlightHours * 0.8);
        const usableDailyWh = dailyRechargeWh * 0.85; // 85% DC-DC boost efficiency
        const batteryChargesPerDay = usableDailyWh / 12;
        chargesPerDay = Math.min(Number(batteryChargesPerDay.toFixed(1)), this.phonesPerDay);
        // Monthly savings: ₹10 per charge kiosk replacement + ₹120 circular lithium cell lifecycle offset
        savingsPerMonth = Math.round(chargesPerDay * 30 * 10 + 120);

        formulaText = `Battery Formula: 37Wh salvaged pack with ${this.sunlightHours}h recharge yields ${batteryChargesPerDay.toFixed(1)} charges/day. For ${this.phonesPerDay} phone(s)/day, savings = (${chargesPerDay.toFixed(1)} charges × 30 days × ₹10) + ₹120 salvaged cell circular offset = ₹${savingsPerMonth.toLocaleString('en-IN')}/month (estimate).`;
      }

      if (formulaEl) {
        formulaEl.textContent = formulaText;
      }

      const duration = isInitial ? 0 : 250;
      animateMetricNumber(chargesEl, this.prevCharges, chargesPerDay, duration, false, 1);
      animateMetricNumber(savingsEl, this.prevSavings, savingsPerMonth, duration, true, 0);

      this.prevCharges = chargesPerDay;
      this.prevSavings = savingsPerMonth;
    }
  };

  // =========================================================================
  // 3. INITIALIZATION & GLOBAL BINDINGS
  // =========================================================================
  function initInnovationFeatures() {
    loadSelection();
    // 1. Compare floating bar buttons
    const openCompareBtn = document.getElementById('btn-compare-open');
    if (openCompareBtn) {
      openCompareBtn.addEventListener('click', () => InnoCompare.openModal());
    }

    const clearCompareBtn = document.getElementById('btn-compare-clear');
    if (clearCompareBtn) {
      clearCompareBtn.addEventListener('click', () => InnoCompare.clear());
    }

    // 2. Compare modal buttons & backdrop
    const compareModal = document.getElementById('compare-modal');
    const closeCompareBtn = document.getElementById('compare-modal-close-btn');

    if (closeCompareBtn) {
      closeCompareBtn.addEventListener('click', () => InnoCompare.closeModal());
    }

    if (compareModal) {
      compareModal.addEventListener('click', (e) => {
        if (e.target === compareModal) {
          InnoCompare.closeModal();
        }
      });
    }

    // Keyboard navigation (Escape key closes compare modal)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && compareModal && compareModal.classList.contains('is-open')) {
        InnoCompare.closeModal();
      }
    });

    // 3. Initialize Impact Calculator
    InnoImpact.init();

    // 4. Initial UI sync
    InnoCompare.updateUI();
  }

  // Export to window
  window.InnoCompare = InnoCompare;
  window.InnoImpact = InnoImpact;

  // Auto-run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInnovationFeatures);
  } else {
    initInnovationFeatures();
  }
})();
