/* ===== OFF MIND INITIATIVE - PAYMENT & BOOKING SCRIPT ===== */

document.addEventListener('DOMContentLoaded', function () {
    const bookingForm = document.getElementById('booking-form');
    const bookLaterBtn = document.getElementById('book-later');
    const payNowBtn = document.getElementById('pay-now');
    const confirmationDiv = document.getElementById('booking-confirmation');
    const confirmationNumber = document.getElementById('confirmation-number');

    // Handle "Book Now (Pay Later)"
    if (bookLaterBtn) {
        bookLaterBtn.addEventListener('click', async function () {
            if (!bookingForm) return;

            const formData = new FormData(bookingForm);
            const bookingData = Object.fromEntries(formData.entries());

            // Add type so Google Sheets knows this is a booking
            bookingData.type = "booking";

            // Validate before saving
            if (!validateBookingData(bookingData)) return;

            try {
                // ✅ CHANGE TO THIS (for Railway):
                const response = await fetch("https://your-app-name.railway.app/book", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(bookingData),
                });
               

                const result = await response.json();

                if (result.success) {
                    // Hide form, show confirmation
                    bookingForm.style.display = "none";
                    confirmationDiv.classList.remove("hidden");

                    if (confirmationNumber) {
                        // Use DB bookingId if available, otherwise fallback to timestamp
                        confirmationNumber.textContent = `OMI-${result.bookingId || Date.now()}`;
                    }

                    console.log("✅ Booking saved:", {
                        ...bookingData,
                        bookingId: result.bookingId,
                    });
                } else {
                    showAlert("❌ Booking failed. Please try again.", "error");
                }
            } catch (err) {
                console.error("Error:", err);
                showAlert("⚠️ Server error. Please try again later.", "error");
            }
        });
    }

    // Handle "Pay Now"
    if (payNowBtn) {
        payNowBtn.addEventListener('click', function () {
            alert("💳 Online payments coming soon!\nPlease use 'Book Now (Pay Later)' for now.");
        });
    }
});

/* ===== BOOKING DATA VALIDATION ===== */
function validateBookingData(data) {
    if (!data.program || !data.date || !data.firstName || !data.lastName || !data.email) {
        showAlert("⚠️ Please fill in all required fields.", "error");
        return false;
    }

    if (!isValidEmail(data.email)) {
        showAlert("⚠️ Please enter a valid email address.", "error");
        return false;
    }

    return true;
}

/* ===== EMAIL VALIDATION ===== */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/* ===== ALERT HELPER ===== */
function showAlert(message, type = "error") {
    const alert = document.createElement("div");
    alert.className = `alert alert-${type}`;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${type === "error" ? "#f56565" : "#48bb78"};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        max-width: 300px;
        animation: slideInRight 0.3s ease-out;
    `;
    alert.textContent = message;

    document.body.appendChild(alert);

    setTimeout(() => {
        alert.style.animation = "slideOutRight 0.3s ease-out forwards";
        setTimeout(() => alert.remove(), 300);
    }, 4000);
}
