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
let chart, ws; // Chart and WebSocket instances
let historicalData = []; // Stores candle data history
let lastCandleTimestamp = 0; // Tracks most recent candle
let indicators = {}; // Active indicators on the chart
let currentInterval = '15m'; // Default chart interval
let socket = null; // WebSocket connection
let previousPrice = null; // For price change comparison
let currentExchange = null; // Default exchange
let currentSymbol = null; // Default trading pair
let widget = null; // TradingView widget instance
let sChartType = "KL"; // Chart type (KL or TV)
let orderSocket = null; // WebSocket for order data
let wallet_pairing_cid=null;
let wallet_pairing_interval = null;
let wallet_menu_position="collapse";
let wallet_connection_status=null;
let user_data=null;
let ws_port = "9909";
let ws_address = "127.0.0.1"
// Indicator Configuration
const VOL_id = 1;
const RSI_id = 1;
const SMA_id = 1;
let indicator_val = {
    MA_id: null,
    BOLL_id: null,
    BBI_id: null,
    AVP_id: null,
    KDJ_id: null,
    MOMENTUM_id: null,
    WILLR_id: null,
    CCI_id: null,
    SMA_id: null,
    MACD_id: null
};
let indicatorInstances = {}; // Tracks chart-created indicator IDs

// Maps indicator button IDs to actual indicator names
const INDICATOR_MAP = {
    MA_id: "MA",
    BOLL_id: "BOLL",
    BBI_id: "BBI",
    AVP_id: "AVP",
    KDJ_id: "KDJ",
    MOMENTUM_id: "MOMENTUM",
    WILLR_id: "WILLR",
    CCI_id: "CCI",
    SMA_id: "SMA",
    MACD_id: "MACD"
};

// Document Ready Handler
$(document).ready(function() {
    (async function () {
        const user = await getLogedUser();
        if (user) {
            initializeEventHandlers();
        } else {
            console.error("User data not loaded. Event handlers not initialized.");
        }
    })();
});


/**
 * Initialize all UI event handlers
 */
function initializeEventHandlers() {
    
    loadMarketData();
    // Chart type toggle button
    updateActive("exchangeButtons", currentExchange.toUpperCase());
    updateExchangeStatus(false);
    getConnectionstatus();
   

    $('#walletModal').modal();

    $("#change-chart").click(function() {
        sChartType = sChartType === "TV" ? "KL" : "TV";
        localStorage.setItem("sChartType", sChartType);
        updatechart(currentExchange, currentSymbol.toUpperCase());
    });

    // Technical indicator buttons
    $(".technical-button").click(function() {
        const key = $(this).data("value");
        const indicatorName = INDICATOR_MAP[key];

        if (indicator_val[key] === 1) {
            // Deactivate indicator
            if (indicatorInstances[key]) {
                chart.removeIndicator(indicatorInstances[key]);
            }
            indicator_val[key] = 0;
            $(this).removeClass("active");
        } else {
            // Activate indicator
            const instanceId = chart.createIndicator(indicatorName);
            indicatorInstances[key] = instanceId;
            indicator_val[key] = 1;
            $(this).addClass("active");
        }
        updatechart(currentExchange, currentSymbol.toUpperCase());
    });

    // Exchange selection buttons
    $("#exchangeButtons .btn").click(function() {
        $(".btn", "#exchangeButtons").removeClass("btn-primary").addClass("btn-secondary");
        $(this).removeClass("btn-secondary").addClass("btn-primary");
        currentExchange = $(this).data("value").toLowerCase();
        updatechart(currentExchange, currentSymbol.toUpperCase());
        updateActive("exchangeButtons", $(this).data("value"));
    });

    // Asset selection buttons
    $("#assetButtons .btn").click(function() {
        $(".btn", "#assetButtons").removeClass("btn-primary").addClass("btn-secondary");
        $(this).removeClass("btn-secondary").addClass("btn-primary");
        $("#trsymbol").html(`${currentSymbol.toUpperCase()}`);
        currentSymbol = $(this).data("value").toLowerCase();
        updatechart(currentExchange, currentSymbol.toUpperCase());
        updateActive("assetButtons", $(this).data("value"));
    });
    $("#timeframe-select").click(function() {
        currentInterval = $("#timeframe-select").val();
        updatechart(currentExchange, currentSymbol.toUpperCase());
    })
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

async function getLogedUser() {
    try {
        const response = await fetch('/dashboard/user', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        user_data = await response.json();
        currentExchange = user_data.default_exchange;
        currentSymbol= user_data.default_pair;
        updateActive("assetButtons", currentSymbol);
        console.log("User data loaded:", user_data);
        // You can now use user_data and currentExchange elsewhere

        return { user_data, currentExchange };

    } catch (error) {
        console.error('Error loading user:', error);
        return null;
    }
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
              //console.log(response);
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
function drawQR(txt) {
    const qrContainer = document.getElementById('qrcode-container');

    // Clear any existing content
    qrContainer.innerHTML = '';
    // Generate new QR code
    new QRCode(qrContainer, {
        text: txt,
        width: 180,  // Slightly smaller than container
        height: 180,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
}
/**
 * Main function to update or switch charts
 * @param {string} exchange - The exchange name (binance, bybit, okx)
 * @param {string} pair - Trading pair (e.g. BTC-USDT)
 */
function updatechart(exchange, pair) {
    const isTV = sChartType === "TV";
    $("#timeframe-select").val(currentInterval);
    // Toggle chart visibility
    $('#chart').toggle(!isTV);
    $('#tvchart').toggle(isTV);
    $(".chart-header").toggle(!isTV);

    // Update chart type button text
    $("#change-chart").html(
        `<i class="fas fa-chart-bar me-1"></i> CHART TYPE : ${sChartType}`
    );

    // Load appropriate chart
    if (isTV) {
        refreshTVChart();
    } else {
        initializeKLINEChart(exchange, pair);
    }   
}

/**
 * Load TradingView widget
 */
function loadTVChart() {
    const symbol = `${currentExchange.toLowerCase()}:${currentSymbol.replace("-","")}`;
    const timeframe = currentInterval.replace("m","").replace("s","");
    
    // Remove existing widget if present
    if (widget) widget.remove();
    
    // Create new TradingView widget
    widget = new TradingView.widget({
        container_id: "tvchart",
        width: "100%",
        height: 600,
        symbol: symbol,
        interval: timeframe,
        timezone: "Asia/Jakarta",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#1e1e1e",
        enable_publishing: false,
        allow_symbol_change: false,
        hide_side_toolbar: false,
        withdateranges: true,
        save_image: false,
        studies: [
            "RSI@tv-basicstudies",
            "BB@tv-basicstudies",
            "MA@tv-basicstudies",
        ],
        studies_overrides: {}
    });
}

/**
 * Initialize K-line chart
 * @param {string} exchange - Exchange name
 * @param {string} sPair - Trading pair
 */
function initializeKLINEChart(exchange, sPair) {
    // Clean up existing chart if present
    if (chart) {
        $('#chart').html('');
        if (ws) ws.close();
    }

    // Initialize new chart
    chart = klinecharts.init('chart', {
        styles: KlineStyles
    });
    chart.setTimezone="Asia/Jakarta";
    chart.setOffsetRightDistance(160);

    // Add default indicators
    indicators.RSI = chart.createIndicator('RSI');
    indicators.VOL = chart.createIndicator('VOL');
    indicators.SMA = chart.createIndicator('MA', false, {
        id: 'candle_pane',
        calcParams: [20],
        styles: {
            lines: [
                { color: '#ff9900' }
            ]
        }
    });

    // Add additional indicators based on active toggles
    if(indicator_val.MA_id==1) {
        indicators.MA = chart.createIndicator('MA', false, { id: 'candle_pane' });
    }
    if(indicator_val.BOLL_id==1) {
        indicators.BOLL = chart.createIndicator('BOLL', false, { id: 'candle_pane' });
    }
    if(indicator_val.BBI_id==1) {
        indicators.BBI = chart.createIndicator('BBI', false, { id: 'candle_pane' });
    }
    if(indicator_val.AVP_id==1) {
        indicators.AVP = chart.createIndicator('AVP', false, { id: 'candle_pane' });
    }
    if(indicator_val.KDJ_id==1) {
        indicators.KDJ = chart.createIndicator('KDJ');
    }
    if(indicator_val.MOMENTUM_id==1) {
        indicators.MOMENTUM = chart.createIndicator('MOMENTUM');
    }
    if(indicator_val.WILLR_id==1) {
        indicators.WILLR = chart.createIndicator('WILLR');
    }
    if(indicator_val.CCI_id==1) {
        indicators.CCI = chart.createIndicator('CCI');
    }
    if(indicator_val.MACD_id==1) {
        indicators.MACD = chart.createIndicator('MACD');
    }

    // Load historical data
    loadHistoricalData(exchange, sPair);
}

/**
 * Load historical candle data from exchange API
 * @param {string} exchange - Exchange name
 * @param {string} sPair - Trading pair
 */
function loadHistoricalData(exchange, sPair) {
    const pair = sPair.replace('-', '');
    const okx_pair = sPair;
    let interval = currentInterval;
    const status = $('#status');
    status.text('Loading data...');
    const CORS_PROXY = "https://cors-anywhere.herokuapp.com/";

    try {
        // Construct appropriate API URL based on exchange
        let apiUrl = '';
        if (exchange === 'binance') {
            apiUrl = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=1000`;
        } else if (exchange === 'bybit') {
            interval = interval.replace("s", "").replace("m", "");
            apiUrl = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${pair}&interval=${interval}&limit=1000`;
        } else if (exchange === 'okx') {
            apiUrl = `https://www.okx.com/api/v5/market/candles?instId=${okx_pair}-SWAP&bar=${interval}`;
        }

        // Fetch and process historical data with error handling
        $.ajax({
            url: `${apiUrl}`,
            method: 'GET',
            dataType: 'json',
            success: function(response) {
                try {
                    let rawData = response;
                    if (exchange === 'bybit') rawData = response.result.list.reverse();
                    if (exchange === 'okx') rawData = response.data.reverse();

                    historicalData = rawData.map(item => {
                        return {
                            timestamp: parseInt(item[0]),
                            open: parseFloat(item[1]),
                            high: parseFloat(item[2]),
                            low: parseFloat(item[3]),
                            close: parseFloat(item[4]),
                            volume: parseFloat(item[5])
                        };
                    });
                    
                    chart.applyNewData(historicalData);
                    lastCandleTimestamp = historicalData[historicalData.length - 1].timestamp;
                    status.text('Loaded. Connecting to server...');
                    setupWebSocket();
                } catch (parseError) {
                    //console.log('Data parsing error:', parseError);
                    status.text('Error: Invalid data format');
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                //console.log('Error');
                let errorMsg = 'Failed to load data';
                status.text(errorMsg);
            },
            timeout: 10000 // 10 second timeout
        });
    } catch(error) {
        console.error('Initialization error:', error);
        status.text('Error: Invalid parameters');
    }
}

/**
 * Set up WebSocket connection for real-time data
 */
function setupWebSocket() {
    const status = $('#status');
    const RECONNECT_DELAY = 3000; // 3 seconds
    const MAX_RECONNECT_ATTEMPTS = 5;
    let reconnectAttempts = 0;

    // Close existing connection if any
    if (ws) {
        ws.onclose = null; // Remove previous onclose handler to prevent multiple reconnections
        ws.close();
    }

    // Construct WebSocket URL
    let wsUrl = `ws://${ws_address}:${ws_port}`;
    console.log('Connecting to WebSocket:', wsUrl);

    // Create new WebSocket connection
    ws = new WebSocket(wsUrl);

    // Connection opened
    ws.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        
        // Register client with server
        try {
            ws.send(JSON.stringify({ 
                type: 'register', 
                id: user_data.id 
            }));
            updateExchangeStatus(true);
        } catch (error) {
            console.error('Registration failed:', error);
        }
    };

    // Message received
    ws.onmessage = (event) => { 
        try {
            const message = JSON.parse(event.data);
            
            // Wallet Connect messages
            handleWalletConnectMessages(message);
            
            // Market data messages
            handleMarketDataMessages(message);
            
        } catch (err) {
            console.error('Error processing message:', err);
        }
    };

    // Connection error
    ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        updateExchangeStatus(false);
    };

    // Connection closed
    ws.onclose = (event) => {
        console.log(`WebSocket closed (code: ${event.code}, reason: ${event.reason})`);
        updateExchangeStatus(false);
        
        // Reconnect logic with exponential backoff
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttempts);
            console.log(`Reconnecting in ${delay/1000} seconds... (attempt ${reconnectAttempts + 1})`);
            
            setTimeout(() => {
                reconnectAttempts++;
                setupWebSocket();
            }, delay);
        } else {
            console.error('Max reconnection attempts reached');
            $.notify("Connection lost. Please refresh the page.", "error");
        }
    };

    // Helper functions for message processing
    function handleWalletConnectMessages(message) {
        if (!message.data_type) return;

        switch (message.data_type) {
            case "wallet_connect":
                if (message.status === "expired") {
                    handleWalletExpired(message);
                } else if (message.status === "connected") {
                    handleWalletConnected(message);
                }
                break;
            case "wallet_disconnect":
                if (message.status === "disconnected") {
                    handleWalletDisconnected(message);
                }
                break;
        }
    }

    function handleWalletExpired(message) {
        $(`.wallet-connect`).collapse('hide');
        $('.wallet-connect').removeClass(`pid_${message.connectionId}`);
        wallet_menu_position = "collapse";
        cancelWalletConnect();
        $.notify("Wallet connect expired. Please try again!", "warn");
    }

    function handleWalletConnected(message) {
        const wallet_address = message.walletAddress;
        $(".walet-address-text").html(
            `<img src="/images/wc.png" class="img-fluid" style="width: 1rem; height: 1em;"> 
            ${wallet_address.substring(0, 12)} ...`
        );
        $('.wallet-connect').removeClass('show');
        wallet_connection_status = true;
        $.notify("Wallet connected!", "success");
    }

    function handleWalletDisconnected(message) {
        const wallet_address = message.walletAddress;
        $(".walet-address-text").html(
            `<img src="/images/wc.png" class="img-fluid" style="width: 1rem; height: 1em;"> 
            Wallet connect`
        );
        $.notify("Wallet disconnected!", "warn");
        wallet_connection_status = false;
    }

    function handleMarketDataMessages(message) {
        if (!message.exchange || message.exchange !== currentExchange.toUpperCase()) return;

        const normalizedSymbol = currentSymbol.replace("-", "").toUpperCase();
        
        // Order book updates
        if (message.type === "orderbook" && message.data?.symbol === normalizedSymbol) {
            processOrderBookUpdate(message.data);
        }
        
        // Market data updates
        if (message.type === "market" && message.data?.symbol === normalizedSymbol) {
            processMarketUpdate(message.data);
        }
        
        // Candle updates
        if (message.type === "candle" && 
            message.data?.interval === currentInterval && 
            message.data?.symbol === normalizedSymbol) {
            processCandleUpdate(message.data.current);
        }
    }

    function processOrderBookUpdate(data) {
        const last_buy = parseFloat(data.bids[0].price);
        const last_ask = parseFloat(data.asks[0].price);
        const spread = last_ask - last_buy;
        const midPrice = (last_ask + last_buy) / 2;
        const spreadPercent = ((spread / midPrice) * 100).toFixed(4);

        $("#spread_trade").text(`${spreadPercent}%`);
        $("#sell_text").text(last_buy.toFixed(2));
        $("#buy_text").text(last_ask.toFixed(2));

        updateOrderBook(data.bids, data.asks);
    }

    function processMarketUpdate(data) {
        updateUI(
            currentSymbol, 
            data.lastPrice, 
            data.priceChangePercent24h, 
            data.volume24h, 
            data.high24h, 
            data.low24h
        );
    }

    function processCandleUpdate(candle_data) {
        updateKchart(
            candle_data.openTime,
            candle_data.open,
            candle_data.high,
            candle_data.low,
            candle_data.close,
            candle_data.volume
        );
        
        const {prChange, changePct, color} = changePercentCalculate(
            candle_data.open,
            candle_data.close
        );
        
        status.html(
            `${currentExchange.toUpperCase()} ${currentSymbol.toUpperCase()} 
            <span style="color:${color}">${candle_data.close.toFixed(2)} (${changePct}%)</span>`
        );
    }
}

function changePercentCalculate(open,close) {
    const prChange = close - open;
    const changePct = (prChange / open * 100).toFixed(2);
    const color = prChange >= 0 ? '#26A69A' : '#EF5350';
    return {prChange,changePct,color};
}

function updateKchart(timestamp,open,high,low,close,volume) {
    const candle = {
        timestamp,
        open,
        high,
        low,
        close,
        volume
    };
    //console.log("C",candle);

    if (candle.timestamp > lastCandleTimestamp) {
        historicalData.push(candle);
        if (historicalData.length > 1000) historicalData.shift();
        lastCandleTimestamp = candle.timestamp;
        chart.applyNewData(historicalData);
    } else if (candle.timestamp === lastCandleTimestamp) {
        historicalData[historicalData.length - 1] = candle;
        chart.updateData(candle);
    }

    const change = candle.close - candle.open;
    const changePct = (change / candle.open * 100).toFixed(2);
    const color = change >= 0 ? '#26A69A' : '#EF5350';
}
/**
 * Update the order book display
 * @param {Array} bids - Array of bid orders
 * @param {Array} asks - Array of ask orders
 */
function updateOrderBook(bids, asks) {
    let bidHTML = '';
    let askHTML = '';
    let totalBid = 0;
    let totalAsk = 0;

    // Process bids
    bids.forEach(({ price, quantity }) => {
        const priceFloat = parseFloat(price);
        const qty = parseFloat(quantity);
        totalBid += qty;
        bidHTML += `<div class="orderbook-row">
          <span class="text-success">${priceFloat.toFixed(2)}</span>
          <span>${qty.toFixed(4)}</span>
          <span>${totalBid.toFixed(4)}</span>
        </div>`;
    });

    // Process asks
    asks.forEach(({ price, quantity }) => {
        const priceFloat = parseFloat(price);
        const qty = parseFloat(quantity);
        totalAsk += qty;
        askHTML += `<div class="orderbook-row">
          <span class="text-danger">${priceFloat.toFixed(2)}</span>
          <span>${qty.toFixed(4)}</span>
          <span>${totalAsk.toFixed(4)}</span>
        </div>`;
    });

    // Update DOM
    $("#bids-container").html(bidHTML);
    $("#asks-container").html(askHTML);

    // Calculate and display spread
    const bestBid = bids?.[0]?.[0] ? parseFloat(bids[0][0]) : 0;
    const bestAsk = asks?.[0]?.[0] ? parseFloat(asks[0][0]) : 0;

    const spread = bestAsk - bestBid;
    const spreadPercent = ((spread / bestBid) * 100).toFixed(4);
    // Note: Add code to display spread if desired
}

/**
 * Update market data UI elements
 * @param {string} symbol - Trading pair symbol
 * @param {number} price - Current price
 * @param {number} change - Price change percentage
 * @param {number} volume - 24h trading volume
 * @param {number} high - 24h high price
 * @param {number} low - 24h low price
 */
function updateUI(symbol, price, change, volume, high, low) {
    // Format values
    price = parseFloat(price).toFixed(2);
    change = parseFloat(change).toFixed(2);
    volume = parseFloat(volume).toFixed(2);
    high = parseFloat(high).toFixed(2);
    low = parseFloat(low).toFixed(2);

    // Determine price direction
    let direction = '';
    let priceClass = '';

    if (previousPrice !== null) {
        if (price > previousPrice) {
            direction = '<span class="price-up">▲</span>';
            priceClass = 'price-up';
        } else if (price < previousPrice) {
            direction = '<span class="price-down">▼</span>';
            priceClass = 'price-down';
        }
    }
    const openPrice = parseFloat(high) + parseFloat(low) / 2;
    let priceChangePercent = ((parseFloat(price) - parseFloat(openPrice)) / parseFloat(openPrice));
    priceChangePercent = priceChangePercent.toFixed(2);
    // Update price display
    $("#price-value").html(`${parseFloat(price).toFixed(2)}`)
        .removeClass("price-up price-down")
        .addClass(priceClass);
    
    // Update change percentage
    $("#change-value").html(`${change} %`)
        .removeClass("price-up price-down")
        .addClass(change >= 0 ? "price-up" : "price-down");
    
    // Update other market data
    $("#24h-volume").html(`${volume}`);
    $("#24h-high").html(`${high}`);
    $("#24h-low").html(`${low}`);
    $(".priceDirection").html(direction);
    $("#24h-change").html(`${change} %`)
        .removeClass("price-up price-down")
        .addClass(change >= 0 ? "price-up" : "price-down");
    
    // Update page title
    $('title').text(`${$("#price-value").html()} ${symbol.toUpperCase()}`);
    
    // Update compact price display
    $("#tpr").html(
        `<span>${parseFloat(price).toFixed(2)} (${change}%)</span>`
    ).removeClass("price-up price-down").addClass(priceClass);
}

/**
 * Fetch market capitalization data from CoinGecko
 * @param {string} symbol - Trading pair symbol (default: "btcusdt")
 */
function fetchMarketCap(symbol = "btcusdt") {
    const idMap = {
        "btcusdt": "bitcoin",
        "ethusdt": "ethereum",
        "xrpusdt": "ripple",
        "dogeusdt": "dogecoin",
    };

    const coinId = idMap[symbol.toLowerCase()] || "bitcoin";

    $.getJSON(`https://api.coingecko.com/api/v3/coins/${coinId}`, function(res) {
        const cap = res.market_data.market_cap.usd;
        const capBillion = (cap / 1e9).toFixed(2);
        $("#market-cap").html(`$${capBillion} B`);
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

/**
 * Load initial market data
 */
function loadMarketData() {
    updatechart(currentExchange, currentSymbol.toUpperCase());
    $('#default-pair').click();
}

/**
 * Refresh TradingView chart
 */
function refreshTVChart() {
    loadTVChart();
}

/**
 * Clean up K-line chart resources
 */
function unloadKLineChart() {
    if (chart && typeof chart.dispose === 'function') {
        chart.dispose();
        chart = null;
        ws.close();
    }
    $('#chart').empty();
}

/**
 * Clean up TradingView widget resources
 */
function unloadTVChart() {
    if (widget && typeof widget.remove === "function") {
        widget.remove();
        widget = null;
    }
}
function updateExchangeStatus(isConnected) {
    const $status = $('#candle-status');
    if (isConnected) {
        $status
            .removeClass('status-disconnected')
            .addClass('status-connected')
            .find('span')
            .text('');
    } else {
        $status
            .removeClass('status-connected')
            .addClass('status-disconnected')
            .find('span')
            .text('');
    }
}