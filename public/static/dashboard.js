function closeAllPopups() {
  document.getElementById("expensePopup").style.display = "none";
  document.getElementById("budgetPopup").style.display = "none";
  document.getElementById("deletePopup").style.display = "none";
  document.getElementById("updatePopup").style.display = "none";
}

// Open Expense Popup
document.getElementById("addExpenseBtn").addEventListener("click", function () {
  closeAllPopups(); // Close any currently open popups
  document.getElementById("expensePopup").style.display = "flex";
});

// Open Budget Popup
document.getElementById("addBudgetBtn").addEventListener("click", function () {
  closeAllPopups(); // Close any currently open popups
  document.getElementById("budgetPopup").style.display = "flex";
});

// Open Update Popup
function openUpdatePopup(expenseId) {
  document.getElementById("updateExpenseId").value = expenseId;
  closeAllPopups(); // Close any currently open popups
  document.getElementById("updatePopup").style.display = "flex";
}

// Open Delete Popup
function openDeletePopup(expenseId) {
  document.getElementById("deleteExpenseId").value = expenseId;
  closeAllPopups(); // Close any currently open popups
  document.getElementById("deletePopup").style.display = "flex";
}

// Close Expense Popup
document.getElementById("closeExpensePopup").addEventListener("click", function () {
  document.getElementById("expensePopup").style.display = "none";
});

// Close Budget Popup
document.getElementById("closeBudgetPopup").addEventListener("click", function () {
  document.getElementById("budgetPopup").style.display = "none";
});

// Close Update Popup
document.getElementById("closeUpdatePopup").addEventListener("click", function () {
  document.getElementById("updatePopup").style.display = "none";
});

// Close Delete Popup
document.getElementById("closeDeletePopup").addEventListener("click", function () {
  document.getElementById("deletePopup").style.display = "none";
});

// Close popups if clicking outside of them
window.addEventListener("click", function (event) {
  if (event.target === document.getElementById("expensePopup")) {
    document.getElementById("expensePopup").style.display = "none";
  }
  if (event.target === document.getElementById("budgetPopup")) {
    document.getElementById("budgetPopup").style.display = "none";
  }
  if (event.target === document.getElementById("deletePopup")) {
    document.getElementById("deletePopup").style.display = "none";
  }
  if (event.target === document.getElementById("updatePopup")) {
    document.getElementById("updatePopup").style.display = "none";
  }
});

// Add event listeners for delete buttons
document.querySelectorAll('.delete-btn').forEach(button => {
  button.addEventListener('click', function () {
    const id = this.dataset.id;
    console.log("Delete button clicked with ID:", id); // Debugging statement
    openDeletePopup(id);
  });
});

// Add event listeners for update buttons
document.querySelectorAll('.update-btn').forEach(button => {
  button.addEventListener('click', function () {
    const id = this.dataset.id;
    console.log("Update button clicked with ID:", id); // Debugging statement
    openUpdatePopup(id);
  });
});
