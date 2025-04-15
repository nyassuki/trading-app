klinecharts.registerIndicator({
    name: 'AVP',
    calcParams: [],
    figures: [
        {
            key: 'avp',
            title: 'AVP',
            type: 'line'
        }
    ],
    calc: (kLineDataList) => {
        let result = []
        let total = 0
        for (let i = 0; i < kLineDataList.length; i++) {
            const data = kLineDataList[i]
            const typicalPrice = (data.high + data.low + data.close) / 3
            total += typicalPrice
            const avp = total / (i + 1)
            result.push({ avp })
        }
        return result
    }
})
klinecharts.registerIndicator({
    name: 'MOMENTUM',
    calcParams: [10], // default 10-period momentum
    figures: [
        {
            key: 'momentum',
            title: 'MOM',
            type: 'line'
        }
    ],
    calc: (kLineDataList, { calcParams }) => {
        const period = calcParams[0]
        const result = []

        for (let i = 0; i < kLineDataList.length; i++) {
            if (i < period) {
                result.push({})
            } else {
                const momentum = kLineDataList[i].close - kLineDataList[i - period].close
                result.push({ momentum })
            }
        }

        return result
    }
})
klinecharts.registerIndicator({
    name: 'WILLR',
    calcParams: [14],
    figures: [
        {
            key: 'williamsr',
            title: 'W%R',
            type: 'line'
        }
    ],
    calc: (kLineDataList, { calcParams }) => {
        const period = calcParams[0]
        const result = []

        for (let i = 0; i < kLineDataList.length; i++) {
            if (i < period - 1) {
                result.push({})
            } else {
                let highestHigh = -Infinity
                let lowestLow = Infinity

                for (let j = i - period + 1; j <= i; j++) {
                    highestHigh = Math.max(highestHigh, kLineDataList[j].high)
                    lowestLow = Math.min(lowestLow, kLineDataList[j].low)
                }

                const close = kLineDataList[i].close
                const williamsr = ((highestHigh - close) / (highestHigh - lowestLow)) * -100
                result.push({ williamsr })
            }
        }

        return result
    }
})
klinecharts.registerIndicator({
    name: 'CCI',
    calcParams: [20],
    figures: [
        {
            key: 'cci',
            title: 'CCI',
            type: 'line'
        }
    ],
    calc: (dataList, { calcParams }) => {
        const period = calcParams[0]
        const result = []

        for (let i = 0; i < dataList.length; i++) {
            if (i < period - 1) {
                result.push({})
            } else {
                let tpList = [], tpSum = 0
                for (let j = i - period + 1; j <= i; j++) {
                    const tp = (dataList[j].high + dataList[j].low + dataList[j].close) / 3
                    tpList.push(tp)
                    tpSum += tp
                }

                const tpAvg = tpSum / period
                let devSum = 0
                for (let tp of tpList) {
                    devSum += Math.abs(tp - tpAvg)
                }

                const meanDev = devSum / period
                const cci = (tpList[tpList.length - 1] - tpAvg) / (0.015 * meanDev)
                result.push({ cci })
            }
        }

        return result
    }
})
klinecharts.registerIndicator({
    name: 'BBS',
    calcParams: [20, 2],
    figures: [
        {
            key: 'bbs',
            title: '%B',
            type: 'line'
        }
    ],
    calc: (dataList, { calcParams }) => {
        const [period, multiplier] = calcParams
        const result = []

        for (let i = 0; i < dataList.length; i++) {
            if (i < period - 1) {
                result.push({})
                continue
            }

            let sum = 0
            for (let j = i - period + 1; j <= i; j++) {
                sum += dataList[j].close
            }

            const ma = sum / period

            let varianceSum = 0
            for (let j = i - period + 1; j <= i; j++) {
                varianceSum += Math.pow(dataList[j].close - ma, 2)
            }

            const stdDev = Math.sqrt(varianceSum / period)
            const upper = ma + (multiplier * stdDev)
            const lower = ma - (multiplier * stdDev)

            const price = dataList[i].close
            const bbs = (price - lower) / (upper - lower)

            result.push({ bbs })
        }

        return result
    }
})
