// State
let allOrders = [];
let castingsMap = {};
let transferredIds = JSON.parse(localStorage.getItem("acc_transferred") || "[]");
let currentTab = "pending"; // "pending" or "completed"
let currentOffset = 0;
const PAGE_SIZE = 50;
let hasMore = true;

// Elements
const container = document.getElementById("cards-container");
const loading = document.getElementById("loading");
const emptyState = document.getElementById("empty-state");
const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("status-filter");
const orderCount = document.getElementById("order-count");
const lastUpdated = document.getElementById("last-updated");
const loadMoreContainer = document.getElementById("load-more-container");
const pendingCount = document.getElementById("pending-count");
const completedCount = document.getElementById("completed-count");

// Helpers
function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function formatAmount(num) {
  if (num == null || num === "" || isNaN(num)) return "-";
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(num));
}

function formatNumber(num) {
  if (num == null || num === "" || isNaN(num)) return "-";
  return new Intl.NumberFormat("en-IN").format(Number(num));
}

function statusClass(status) {
  if (!status) return "";
  return "status-" + status.toLowerCase().replace(/[\s_]+/g, "-");
}

function getPaymentTerms(terms) {
  if (!terms || !Array.isArray(terms) || terms.length === 0) return "-";
  return terms[0].content || "-";
}

function getReportTags(requirements) {
  if (!requirements || !Array.isArray(requirements) || requirements.length === 0) return "";
  return requirements.map(r => `<span class="report-tag">${r}</span>`).join(" ");
}

function getReportText(requirements) {
  if (!requirements || !Array.isArray(requirements) || requirements.length === 0) return "-";
  return requirements.join(", ");
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildCastingsMap(castings) {
  castingsMap = {};
  for (const c of castings) {
    castingsMap[c.id] = { hsn_code: c.hsn_code || "", casting_name: c.casting_name || "" };
  }
}

// Transferred state management
function isTransferred(orderId) {
  return transferredIds.includes(orderId);
}

function markTransferred(orderId) {
  if (!transferredIds.includes(orderId)) {
    transferredIds.push(orderId);
    localStorage.setItem("acc_transferred", JSON.stringify(transferredIds));
  }
}

function unmarkTransferred(orderId) {
  transferredIds = transferredIds.filter(id => id !== orderId);
  localStorage.setItem("acc_transferred", JSON.stringify(transferredIds));
}

// Tab switching
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  renderCards();
}

// Get filtered orders for current tab
function getFilteredOrders() {
  const search = searchInput.value.toLowerCase().trim();
  const status = statusFilter.value;

  return allOrders.filter(order => {
    // Tab filter
    const transferred = isTransferred(order.id);
    if (currentTab === "pending" && transferred) return false;
    if (currentTab === "completed" && !transferred) return false;

    // Status filter
    if (status !== "all" && order.status !== status) return false;

    // Search
    if (search) {
      const orderMatch = (order.order_number || "").toLowerCase().includes(search)
        || (order.customer_name || "").toLowerCase().includes(search)
        || (order.po_number || "").toLowerCase().includes(search);
      const itemMatch = (order.items || []).some(item =>
        (item.casting_name || "").toLowerCase().includes(search)
        || (item.casting_code || "").toLowerCase().includes(search)
      );
      if (!orderMatch && !itemMatch) return false;
    }

    return true;
  });
}

// Update tab counts
function updateTabCounts() {
  const pending = allOrders.filter(o => !isTransferred(o.id)).length;
  const completed = allOrders.filter(o => isTransferred(o.id)).length;
  pendingCount.textContent = pending;
  completedCount.textContent = completed;
}

// Build a single card HTML
function buildCard(order) {
  const items = order.items || [];
  const dateStr = formatDate(order.order_date);
  const paymentTerms = getPaymentTerms(order.payment_terms);
  const transferred = isTransferred(order.id);
  const totalWeight = items.reduce((sum, item) => sum + (Number(item.total_weight) || 0), 0);

  // Items table rows
  let itemRows = "";
  items.forEach(item => {
    const hsn = castingsMap[item.casting_id]?.hsn_code || "-";
    const rateDisplay = item.rate ? `${item.rate} /${item.rate_type === "per_kg" ? "kg" : "pc"}` : "-";
    const rateCopy = item.rate || "-";
    const reportHtml = getReportTags(item.testing_requirements);
    const reportText = getReportText(item.testing_requirements);

    itemRows += `
      <tr>
        <td class="action-cell"><button class="copy-row-btn" title="Copy row as tab-separated">Copy</button></td>
        <td data-copy="${escapeHtml(item.casting_name)}" title="${escapeHtml(item.casting_name)}">${escapeHtml(item.casting_name) || "-"}</td>
        <td data-copy="${escapeHtml(hsn)}">${hsn}</td>
        <td class="right" data-copy="${rateCopy}">${rateDisplay}</td>
        <td class="right" data-copy="${item.quantity || ""}">${item.quantity || "-"}</td>
        <td class="right" data-copy="${item.total_weight || ""}">${formatNumber(item.total_weight)}</td>
        <td class="right" data-copy="${item.amount || ""}">${formatAmount(item.amount)}</td>
        <td data-copy="${reportText}">${reportHtml || "-"}</td>
      </tr>`;
  });

  // Total row
  itemRows += `
    <tr class="total-row">
      <td></td>
      <td colspan="4" style="text-align:right">Order Total:</td>
      <td class="right" data-copy="${totalWeight}">${formatNumber(totalWeight)} kg</td>
      <td class="right" data-copy="${order.total_amount || ""}">${formatAmount(order.total_amount)}</td>
      <td></td>
    </tr>`;

  return `
    <div class="order-card ${transferred ? "is-transferred" : ""}" data-order-id="${order.id}">
      <div class="card-header" onclick="toggleCard('${order.id}')">
        <span class="card-expand-icon">&#9654;</span>
        <span class="card-order-no">${order.order_number || "-"}</span>
        <span class="card-customer">${escapeHtml(order.customer_name) || "-"}</span>
        <div class="card-meta">
          <span class="card-meta-item">${dateStr}</span>
          <span class="card-meta-item"><strong>${formatAmount(order.total_amount)}</strong></span>
          <span class="card-items-count">${items.length} item${items.length !== 1 ? "s" : ""}</span>
          <span class="status-badge ${statusClass(order.status)}">${order.status || "-"}</span>
          ${transferred ? '<span class="transferred-badge">Transferred</span>' : ""}
        </div>
      </div>

      <div class="card-body">
        <div class="card-info-row">
          <div class="info-field">
            <span class="info-label">Order No</span>
            <span class="info-value" data-copy="${escapeHtml(order.order_number)}" onclick="copyInfoValue(event)">${order.order_number || "-"}</span>
          </div>
          <div class="info-field">
            <span class="info-label">Order Date</span>
            <span class="info-value" data-copy="${dateStr}" onclick="copyInfoValue(event)">${dateStr}</span>
          </div>
          <div class="info-field">
            <span class="info-label">Customer</span>
            <span class="info-value" data-copy="${escapeHtml(order.customer_name)}" onclick="copyInfoValue(event)">${escapeHtml(order.customer_name) || "-"}</span>
          </div>
          <div class="info-field">
            <span class="info-label">PO Number</span>
            <span class="info-value" data-copy="${escapeHtml(order.po_number)}" onclick="copyInfoValue(event)">${order.po_number || "-"}</span>
          </div>
          <div class="info-field">
            <span class="info-label">Payment Terms</span>
            <span class="info-value" data-copy="${escapeHtml(paymentTerms)}" onclick="copyInfoValue(event)">${paymentTerms}</span>
          </div>
          <div class="info-field">
            <span class="info-label">Sales Engineer</span>
            <span class="info-value" data-copy="${escapeHtml(order.sales_engineer)}" onclick="copyInfoValue(event)">${order.sales_engineer || "-"}</span>
          </div>
          <div class="info-field">
            <span class="info-label">Delivery Address</span>
            <span class="info-value" data-copy="${escapeHtml(order.delivery_address)}" onclick="copyInfoValue(event)">${order.delivery_address ? escapeHtml(order.delivery_address).substring(0, 60) + (order.delivery_address.length > 60 ? "..." : "") : "-"}</span>
          </div>
        </div>

        <div style="overflow-x:auto">
          <table class="card-items-table">
            <thead>
              <tr>
                <th style="width:50px">Copy</th>
                <th>Casting Name</th>
                <th>HSN</th>
                <th class="right">Rate</th>
                <th class="right">Qty</th>
                <th class="right">Weight</th>
                <th class="right">Amount</th>
                <th>Report Req.</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
        </div>

        <div class="card-footer">
          <span class="card-footer-hint">Click any value to copy it</span>
          ${transferred
            ? `<button class="btn-undo" onclick="undoTransfer('${order.id}')">Move Back to Remaining</button>`
            : `<button class="btn-complete" onclick="completeTransfer('${order.id}')">Completed - Mark as Transferred</button>`
          }
        </div>
      </div>
    </div>`;
}

// Render all cards
function renderCards() {
  const filtered = getFilteredOrders();

  if (filtered.length === 0) {
    container.innerHTML = "";
    emptyState.style.display = "block";
    orderCount.textContent = "0 orders";
    loadMoreContainer.style.display = "none";
    return;
  }

  emptyState.style.display = "none";
  container.innerHTML = filtered.map(order => buildCard(order)).join("");
  orderCount.textContent = `${filtered.length} orders`;
  loadMoreContainer.style.display = hasMore && currentTab === "pending" ? "block" : "none";
  updateTabCounts();
}

// Toggle card expand/collapse
function toggleCard(orderId) {
  const card = document.querySelector(`.order-card[data-order-id="${orderId}"]`);
  if (card) card.classList.toggle("expanded");
}

// Copy info value (from card-info-row)
function copyInfoValue(e) {
  e.stopPropagation();
  const el = e.target.closest(".info-value");
  if (!el) return;
  const value = el.getAttribute("data-copy") || el.textContent.trim();
  if (value && value !== "-") copyToClipboard(value, el);
}

// Mark order as transferred
function completeTransfer(orderId) {
  markTransferred(orderId);
  renderCards();
}

// Undo transfer
function undoTransfer(orderId) {
  unmarkTransferred(orderId);
  renderCards();
}

// Event delegation for items table clicks
container.addEventListener("click", function (e) {
  // Copy row button
  if (e.target.classList.contains("copy-row-btn")) {
    e.stopPropagation();
    copyRow(e.target.closest("tr"));
    return;
  }

  // Copy cell in items table
  const td = e.target.closest(".card-items-table td");
  if (td && !td.classList.contains("action-cell")) {
    e.stopPropagation();
    const value = td.getAttribute("data-copy") || td.textContent.trim();
    if (value && value !== "-") copyToClipboard(value, td);
  }
});

// Search & filter
let searchDebounce = null;
searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(renderCards, 200);
});
statusFilter.addEventListener("change", renderCards);

// Timestamp
function updateTimestamp() {
  const now = new Date();
  lastUpdated.textContent = `Updated: ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

// Load data
async function loadData(append = false) {
  if (!append) {
    loading.style.display = "";
    container.innerHTML = "";
    emptyState.style.display = "none";
    currentOffset = 0;
    allOrders = [];
    hasMore = true;
  }

  try {
    const [orders, castings] = await Promise.all([
      fetchSalesOrders(PAGE_SIZE, currentOffset),
      append ? Promise.resolve(null) : fetchCastings()
    ]);

    if (castings) buildCastingsMap(castings);

    if (append) {
      allOrders = allOrders.concat(orders);
    } else {
      allOrders = orders;
    }

    hasMore = orders.length === PAGE_SIZE;
    currentOffset += orders.length;
    updateTimestamp();
  } catch (err) {
    console.error("Failed to load data:", err);
    loading.innerHTML = `<div style="color:#c00">Failed to load data: ${err.message}</div><br><button class="btn" onclick="refreshData()">Retry</button>`;
    return;
  }

  loading.style.display = "none";
  renderCards();
}

async function refreshData() {
  document.getElementById("refresh-btn").textContent = "Loading...";
  await loadData(false);
  document.getElementById("refresh-btn").textContent = "Refresh";
}

async function loadMore() {
  document.getElementById("load-more-btn").textContent = "Loading...";
  await loadData(true);
  document.getElementById("load-more-btn").textContent = "Load More Orders";
}

// Initialize
document.addEventListener("DOMContentLoaded", () => loadData());
