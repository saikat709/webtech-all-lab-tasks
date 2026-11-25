// =======================================================
// FreshMart Grocery - Simple JavaScript Frontend
// Designed to be very simple, readable, and easy to follow.
// Handles GET, POST, PUT, PATCH, and DELETE requests.
// =======================================================

// Base URL for json-server
const API_URL = "http://localhost:3000/transactions";

// State variables for pagination, sorting, and filtering
let currentPage = 1;
let itemsPerPage = 5;
let currentSort = "-id";
let currentType = "";
let currentCategory = "";
let currentSearch = "";
let totalPages = 1;

// Run loadTransactions when the webpage finishes loading
window.addEventListener("DOMContentLoaded", function () {
  // Set default date in Add form to today
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("addDate").value = today;

  // Load the initial data
  loadTransactions();
});

// =======================================================
// 1. GET: Fetch transactions with Pagination, Sort & Filter
// =======================================================
function loadTransactions() {
  showMessage("Fetching transactions...", "info");

  // Build the query URL
  let url = `${API_URL}?_page=${currentPage}&_per_page=${itemsPerPage}&_sort=${currentSort}`;

  // Add Type filter if selected (Buy or Sell)
  if (currentType !== "") {
    url += `&type=${encodeURIComponent(currentType)}`;
  }

  // Add Category filter if selected
  if (currentCategory !== "") {
    url += `&category=${encodeURIComponent(currentCategory)}`;
  }

  // Add Search filter (case-insensitive substring match)
  if (currentSearch.trim() !== "") {
    url += `&item:contains=${encodeURIComponent(currentSearch.trim())}`;
  }

  // Send GET request using fetch
  fetch(url)
    .then(function (response) {
      if (!response.ok) {
        throw new Error("HTTP error! Status: " + response.status);
      }
      return response.json();
    })
    .then(function (result) {
      // json-server v1 returns an object: { items, pages, data, ... }
      // If it's a plain array (fallback), we handle that too
      let items = [];
      let totalItemsCount = 0;

      if (result.data) {
        items = result.data;
        totalPages = result.pages || 1;
        totalItemsCount = result.items || items.length;
      } else if (Array.isArray(result)) {
        items = result;
        totalPages = 1;
        totalItemsCount = result.length;
      }

      // Render the table rows and pagination controls
      renderTable(items);
      renderPagination(totalItemsCount);
      showMessage(`Loaded ${items.length} records (Page ${currentPage} of ${totalPages})`, "info");
    })
    .catch(function (error) {
      console.error("GET Error:", error);
      showMessage("Failed to connect to JSON Server! Make sure it is running on port 3000.", "error");
      document.getElementById("transactionTableBody").innerHTML =
        `<tr><td colspan="11" style="text-align:center; color: red;">Error connecting to server (${error.message}). Is JSON server running?</td></tr>`;
    });
}

// Render data into the HTML table
function renderTable(items) {
  const tableBody = document.getElementById("transactionTableBody");
  tableBody.innerHTML = "";

  if (items.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="11" style="text-align:center;">No transactions found.</td></tr>`;
    return;
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Determine type badge style
    const typeBadgeClass = item.type === "Sell" ? "badge-sell" : "badge-buy";

    // Determine status badge style
    let statusClass = "badge-status-completed";
    if (item.status === "Pending") statusClass = "badge-status-pending";
    if (item.status === "Cancelled") statusClass = "badge-status-cancelled";

    // Create table row
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>#${item.id}</strong></td>
      <td><span class="badge ${typeBadgeClass}">${item.type}</span></td>
      <td><strong>${item.item}</strong></td>
      <td>${item.category}</td>
      <td>${item.quantity} ${item.unit}</td>
      <td>$${Number(item.unitPrice).toFixed(2)}</td>
      <td><strong>$${Number(item.totalPrice).toFixed(2)}</strong></td>
      <td>${item.party}</td>
      <td>${item.date}</td>
      <td><span class="badge ${statusClass}">${item.status}</span></td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-sm btn-warning" onclick="openEditModal('${item.id}')" title="Full replacement update">
            Edit (PUT)
          </button>
          <button class="btn btn-sm btn-patch" onclick="handlePatchStatus('${item.id}', '${item.status}')" title="Partial update of status">
            Toggle Status (PATCH)
          </button>
          <button class="btn btn-sm btn-danger" onclick="handleDeleteTransaction('${item.id}', '${escapeQuotes(item.item)}')">
            Delete (DEL)
          </button>
        </div>
      </td>
    `;
    tableBody.appendChild(row);
  }
}

// Render pagination buttons and count
function renderPagination(totalCount) {
  const recordCountText = document.getElementById("recordCountText");
  recordCountText.textContent = `Total Records: ${totalCount} | Page ${currentPage} of ${totalPages}`;

  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;

  const pageNumbersDiv = document.getElementById("pageNumbers");
  pageNumbersDiv.innerHTML = "";

  for (let p = 1; p <= totalPages; p++) {
    const btn = document.createElement("button");
    btn.className = "page-number-btn" + (p === currentPage ? " active" : "");
    btn.textContent = p;
    btn.onclick = function () {
      currentPage = p;
      loadTransactions();
    };
    pageNumbersDiv.appendChild(btn);
  }
}

// =======================================================
// 2. POST: Create a new transaction
// =======================================================
function handleCreateTransaction(event) {
  event.preventDefault(); // Stop normal form submit reload

  // Gather values from form
  const type = document.getElementById("addType").value;
  const category = document.getElementById("addCategory").value;
  const item = document.getElementById("addItem").value.trim();
  const quantity = parseFloat(document.getElementById("addQuantity").value);
  const unit = document.getElementById("addUnit").value.trim();
  const unitPrice = parseFloat(document.getElementById("addUnitPrice").value);
  const totalPrice = parseFloat((quantity * unitPrice).toFixed(2));
  const party = document.getElementById("addParty").value.trim();
  const date = document.getElementById("addDate").value;
  const status = document.getElementById("addStatus").value;

  // New transaction object
  const newTransaction = {
    type: type,
    item: item,
    category: category,
    quantity: quantity,
    unit: unit,
    unitPrice: unitPrice,
    totalPrice: totalPrice,
    party: party,
    date: date,
    status: status
  };

  // Send POST request
  fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(newTransaction)
  })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("POST failed with status: " + response.status);
      }
      return response.json();
    })
    .then(function (createdItem) {
      showMessage(`[POST] Transaction #${createdItem.id} created successfully!`, "success");
      closeAddModal();
      document.getElementById("addForm").reset();
      // Reload table
      loadTransactions();
    })
    .catch(function (error) {
      console.error("POST Error:", error);
      showMessage("Error creating transaction: " + error.message, "error");
    });
}

// =======================================================
// 3. PUT: Full replacement update of a transaction
// =======================================================

function openEditModal(id) {
  fetch(`${API_URL}/${id}`)
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Failed to fetch transaction for edit");
      }
      return response.json();
    })
    .then(function (data) {
      document.getElementById("editId").value = data.id;
      document.getElementById("editType").value = data.type;
      document.getElementById("editCategory").value = data.category;
      document.getElementById("editItem").value = data.item;
      document.getElementById("editQuantity").value = data.quantity;
      document.getElementById("editUnit").value = data.unit;
      document.getElementById("editUnitPrice").value = data.unitPrice;
      document.getElementById("editParty").value = data.party;
      document.getElementById("editDate").value = data.date;
      document.getElementById("editStatus").value = data.status;

      calculateEditTotal();

      // Show edit modal
      document.getElementById("editModal").classList.remove("hidden");
    })
    .catch(function (error) {
      showMessage("Error reading transaction: " + error.message, "error");
    });
}

function handleUpdateTransaction(event) {
  event.preventDefault();

  const id = document.getElementById("editId").value;
  const type = document.getElementById("editType").value;
  const category = document.getElementById("editCategory").value;
  const item = document.getElementById("editItem").value.trim();
  const quantity = parseFloat(document.getElementById("editQuantity").value);
  const unit = document.getElementById("editUnit").value.trim();
  const unitPrice = parseFloat(document.getElementById("editUnitPrice").value);
  const totalPrice = parseFloat((quantity * unitPrice).toFixed(2));
  const party = document.getElementById("editParty").value.trim();
  const date = document.getElementById("editDate").value;
  const status = document.getElementById("editStatus").value;

  // Complete object for full replacement (PUT)
  const updatedTransaction = {
    id: id,
    type: type,
    item: item,
    category: category,
    quantity: quantity,
    unit: unit,
    unitPrice: unitPrice,
    totalPrice: totalPrice,
    party: party,
    date: date,
    status: status
  };

  // Send PUT request to replace resource
  fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(updatedTransaction)
  })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("PUT failed with status: " + response.status);
      }
      return response.json();
    })
    .then(function (updatedData) {
      showMessage(`[PUT] Transaction #${id} fully updated!`, "success");
      closeEditModal();
      loadTransactions();
    })
    .catch(function (error) {
      console.error("PUT Error:", error);
      showMessage("Error updating transaction: " + error.message, "error");
    });
}

// =======================================================
// 4. PATCH: Partial update (Update only status field)
// =======================================================
function handlePatchStatus(id, currentStatus) {
  // Cycle through: Completed -> Pending -> Cancelled -> Completed
  let nextStatus = "Pending";
  if (currentStatus === "Pending") nextStatus = "Cancelled";
  else if (currentStatus === "Cancelled") nextStatus = "Completed";

  const partialUpdate = {
    status: nextStatus
  };

  // Send PATCH request (only sends the field being changed)
  fetch(`${API_URL}/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(partialUpdate)
  })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("PATCH failed with status: " + response.status);
      }
      return response.json();
    })
    .then(function (data) {
      showMessage(`[PATCH] Transaction #${id} status changed to ${nextStatus}`, "success");
      loadTransactions();
    })
    .catch(function (error) {
      console.error("PATCH Error:", error);
      showMessage("Error patching status: " + error.message, "error");
    });
}

// =======================================================
// 5. DELETE: Delete a transaction
// =======================================================
function handleDeleteTransaction(id, itemName) {
  const isConfirmed = confirm(`Are you sure you want to delete transaction #${id} (${itemName})?`);
  if (!isConfirmed) return;

  // Send DELETE request
  fetch(`${API_URL}/${id}`, {
    method: "DELETE"
  })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("DELETE failed with status: " + response.status);
      }
      return response.json();
    })
    .then(function () {
      showMessage(`[DELETE] Transaction #${id} deleted successfully!`, "success");
      loadTransactions();
    })
    .catch(function (error) {
      console.error("DELETE Error:", error);
      showMessage("Error deleting transaction: " + error.message, "error");
    });
}

// =======================================================
// Toolbar Events: Search, Filters, Sorting, Pagination
// =======================================================
function handleSearch() {
  currentSearch = document.getElementById("searchInput").value;
  currentPage = 1; // Reset to page 1 on new search
  loadTransactions();
}

function handleFilterChange() {
  currentType = document.getElementById("typeFilter").value;
  currentCategory = document.getElementById("categoryFilter").value;
  currentPage = 1; // Reset to page 1 on filter change
  loadTransactions();
}

function handleSortChange() {
  currentSort = document.getElementById("sortSelect").value;
  currentPage = 1;
  loadTransactions();
}

function handleLimitChange() {
  itemsPerPage = parseInt(document.getElementById("limitSelect").value);
  currentPage = 1;
  loadTransactions();
}

function goToPrevPage() {
  if (currentPage > 1) {
    currentPage--;
    loadTransactions();
  }
}

function goToNextPage() {
  if (currentPage < totalPages) {
    currentPage++;
    loadTransactions();
  }
}

// =======================================================
// Calculation Helpers & Modal Control Helpers
// =======================================================
function calculateAddTotal() {
  const qty = parseFloat(document.getElementById("addQuantity").value) || 0;
  const price = parseFloat(document.getElementById("addUnitPrice").value) || 0;
  const total = qty * price;
  document.getElementById("addTotalPriceDisplay").value = total.toFixed(2);
}

function calculateEditTotal() {
  const qty = parseFloat(document.getElementById("editQuantity").value) || 0;
  const price = parseFloat(document.getElementById("editUnitPrice").value) || 0;
  const total = qty * price;
  document.getElementById("editTotalPriceDisplay").value = total.toFixed(2);
}

function openAddModal() {
  document.getElementById("addModal").classList.remove("hidden");
}

function closeAddModal() {
  document.getElementById("addModal").classList.add("hidden");
}

function closeEditModal() {
  document.getElementById("editModal").classList.add("hidden");
}

function showMessage(text, type) {
  const box = document.getElementById("statusMessage");
  box.textContent = text;
  box.className = `status-message ${type}`;

  // Auto clear message after 4 seconds (except errors)
  if (type !== "error") {
    setTimeout(function () {
      if (box.textContent === text) {
        box.className = "status-message hidden";
      }
    }, 4000);
  }
}

function escapeQuotes(str) {
  if (!str) return "";
  return str.replace(/'/g, "\\'");
}
