/**
 * Cryptocurrency Chart Dashboard
 * 
 * Features:
 * - Toggle between K-line charts and TradingView widgets
 * - Support for multiple exchanges (Binance, Bybit, OKX)
 * - Multiple technical indicators with toggle functionality
 * - Real-time data via WebSocket
 * - Order book visualization
 * - Market data display
 */

// Global Variables
 let wallet_pairing_cid=null;
let wallet_pairing_interval = null;
let wallet_menu_position="collapse";
let wallet_connection_status=null;
let user_data=null;
let isEditMode = false;
 

// Document Ready Handler
$(document).ready(function() {
    initializeEventHandlers();
   
});

/**
 * Initialize all UI event handlers
 */
function initializeEventHandlers() {
     // Chart type toggle button
      
    getConnectionstatus();
    getLogedUser();

    $('#walletModal').modal();

     
   $('.wallet-connect').on('show.bs.dropdown', async function (e) {
        $(".card-header").show();
        $(".qr-loading").show();
        $("#qrcode-container").html("");
        try {
            getConnectionstatus();
            if(wallet_connection_status==true) {
                $.notify("Wallet connected, change connected wallet from wallet menu", {
                      className: "warn",
                      position: "right bottom",
                 });
                e.preventDefault();
                e.stopImmediatePropagation();
            } else {
                WalletConnect();
            }
        } catch (err) {
            console.error("Error checking wallet status:", err);
        }
    });

    // When dropdown is closed
    $('.wallet-connect').on('hide.bs.dropdown', function () {
         cancelWalletConnect();
    });
}

function getLogedUser() {
    $.ajax({
        url: '/dashboard/user',       // Replace with your actual server endpoint
        type: 'GET',
        contentType: 'application/json',
        success: function(response) {
             populateProfile(response);

         },
        error: function(xhr, status, error) {
            console.error('Error:', error);
        }
    });
}
function getDropdownStatus(selector) {
    return $(selector).hasClass('show') ? 'expanded' : 'collapsed';
}
function countDownTimer(timeLeft, labelElement) {
    // Clear any existing timer before starting a new one
    if (wallet_pairing_interval) clearInterval(wallet_pairing_interval);
    labelElement.textContent = timeLeft;
    labelElement.classList.add('spinner-rotate');
    wallet_pairing_interval = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      clearInterval(wallet_pairing_interval);
      labelElement.textContent = "0";
      labelElement.classList.remove('spinner-rotate');
      $('.wallet-connect').removeClass('show');
    } else {
      labelElement.textContent = timeLeft;
    }
  }, 1000);
}

function stopTimer() {
  if (wallet_pairing_interval) {
    clearInterval(wallet_pairing_interval);
    wallet_pairing_interval = null;
  }
}


function cancelWalletConnect() {
    $.ajax({
        url: '/wallet/connection-cancel',       // Replace with your actual server endpoint
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            cid: `${wallet_pairing_cid}`,
        }),
        success: function(response) {
              console.log(response);
              stopTimer()
         },
        error: function(xhr, status, error) {
            console.error('Error:', error);
        }
    });
    $("#qrcode-container").html("");
}
function WalletConnect() {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: '/wallet/connect',
      method: 'GET',
      success: function (data) {
        $(".qr-loading").hide();
        if (data.status === "wallet_connected") {
          resolve(true);
        } else if (data.status === "awaiting_connection") {
          wallet_pairing_cid = `pid_${data.connectionId}`;
          const t_label = document.getElementById('wallet-timer');
          countDownTimer(60, t_label)
          drawQR(data.qrCodeData);
          resolve(false);
        }
      },
      error: function (xhr) {
        $('#walletModal .modal-body').html(`<p style="color:red;">Error: ${xhr.responseText}</p>`);
        reject(xhr.responseText);
      }
    });
  });
}

function getConnectionstatus() {
    $.ajax({
        url: '/wallet/connection-status',       // Replace with your actual server endpoint
        type: 'GET',
        contentType: 'application/json',
        success: function(response) {
            if(response.status=="connected") {
                wallet_connection_status=true;
                $('.wallet-connect').on('show.bs.dropdown', function (e) {
                     
                });
            } else {
                wallet_connection_status=false;
            }
         },
        error: function(xhr, status, error) {
            console.error('Error:', error);
        }
    });
}

  
/**
 * Update active button state
 * @param {string} groupId - Button group ID
 * @param {string} value - Value of the active button
 */
function updateActive(groupId, value) {
    $(`#${groupId} .btn`).removeClass("active");
    $(`#${groupId} .btn[data-value='${value}']`).addClass("active");
}
 
  function populateProfile(data) {
    console.log(data);
    $('#profile-picture').attr('src', data.profile_picture);
    $('#profile-name').text(data.name);
    $('#provider').text(data.provider);
    $('#name').val(data.name);
    $('#email').val(data.email);
    $('#phone_number').val(data.phone_number);
    $('#laverage').val(data.laverage);
    $('#margin_mode').val(data.margin_mode);
    $('#telegram_chat_id').val(data.telegram_chat_id);
    $('#created_at').val(data.created_at);
    $('#default_exchange').val(data.default_exchange);
    $('#default_pair').val(data.default_pair.toUpperCase());
    $('#isdemo').val(data.isdemo);

    $('#email-verified')
      .text(data.email_verified ? "Yes" : "No")
      .removeClass("bg-danger bg-success")
      .addClass(data.email_verified ? "bg-success" : "bg-danger");
    $('#phone-verified')
      .text(data.phone_verified ? "Yes" : "No")
      .removeClass("bg-danger bg-success")
      .addClass(data.email_verified ? "bg-success" : "bg-danger");
  }

  function toggleEditMode() {
    isEditMode = !isEditMode;
    $('#profile-form input').not(' #created_at').prop('disabled', !isEditMode);
    $('#profile-form select').not(' #created_at').prop('disabled', !isEditMode);
    $('#edit-toggle').text(isEditMode ? "Save" : "Edit");

    if (!isEditMode) {
      // Here you can send AJAX to backend to update
      const updatedData = {
        name: $('#name').val(),
        email: $('#email').val(),
        phone_number: $('#phone_number').val(),
        laverage: $('#laverage').val(),
        margin_mode: $('#margin_mode').val(),
        telegram_chat_id: $('#telegram_chat_id').val(),
        default_exchange: $('#default_exchange').val(),
        default_pair: $('#default_pair').val(),
        fav_pair: $('#fav_pair').val(),
        isdemo: $('#isdemo').val(),
      };
      console.log("Saving data:", updatedData);
      alert("Profile saved (mock) ✅");
      $('#updated_at').val(updatedData.updated_at);
    }
  }

$(document).ready(function () {
 
$('#edit-toggle').on('click', toggleEditMode);
});
