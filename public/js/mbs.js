function detectMarketStructureBreaks(data) {
    const swings = []
    const breaks = []

    for (let i = 2; i < data.length; i++) {
        const prev = data[i - 1]
        const curr = data[i]

        // Detect swing highs/lows
        const highSwing = prev.high > data[i - 2].high && prev.high > curr.high
        const lowSwing = prev.low < data[i - 2].low && prev.low < curr.low

        if (highSwing) swings.push({ type: 'high', index: i - 1, price: prev.high })
        if (lowSwing) swings.push({ type: 'low', index: i - 1, price: prev.low })

        // Detect MSB
        for (const swing of swings) {
            if (
                swing.type === 'high' &&
                curr.close > swing.price &&
                swing.index < i - 1
            ) {
                breaks.push({ type: 'bullish', index: i, price: swing.price })
            }
            if (
                swing.type === 'low' &&
                curr.close < swing.price &&
                swing.index < i - 1
            ) {
                breaks.push({ type: 'bearish', index: i, price: swing.price })
            }
        }
    }

    return breaks
}
function plotMSB(chart, breaks, data) {
    for (const brk of breaks) {
        chart.createOverlay({
            name: 'horizontalLine',
            extendData: {
                value: brk.price,
                styles: {
                    color: brk.type === 'bullish' ? '#00ff00' : '#ff0000',
                    lineStyle: 'dashed'
                }
            },
            points: [
                { timestamp: data[brk.index].timestamp, value: brk.price }
            ]
        })
    }
}
function detectOrderBlocks(data, breaks) {
    const blocks = []

    for (const brk of breaks) {
        const i = brk.index

        // Look back for the opposite candle
        for (let j = i - 1; j >= 0; j--) {
            const candle = data[j]
            if (
                (brk.type === 'bullish' && candle.close < candle.open) ||
                (brk.type === 'bearish' && candle.close > candle.open)
            ) {
                blocks.push({
                    type: brk.type,
                    index: j,
                    open: candle.open,
                    close: candle.close,
                    high: candle.high,
                    low: candle.low
                })
                break
            }
        }
    }

    return blocks
}
function plotOrderBlocks(chart, blocks, data) {
    for (const block of blocks) {
        const startTime = data[block.index].timestamp

        chart.createOverlay({
            name: 'rect',
            extendData: {
                styles: {
                    borderColor: block.type === 'bullish' ? '#00ff00' : '#ff0000',
                    backgroundColor: block.type === 'bullish' ? 'rgba(0,255,0,0.1)' : 'rgba(255,0,0,0.1)'
                }
            },
            points: [
                { timestamp: startTime, value: block.high },
                { timestamp: startTime + 60 * 60 * 1000 * 5, value: block.low } // Example width (5 candles)
            ]
        })
    }
}


function drawMBS(chart,candleData) {
    const breaks = detectMarketStructureBreaks(candleData)
    plotMSB(chart, breaks, candleData)

    const orderBlocks = detectOrderBlocks(candleData, breaks)
    plotOrderBlocks(chart, orderBlocks, candleData)

}