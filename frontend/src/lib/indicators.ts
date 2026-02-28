export interface PricePoint {
    time: string;
    close: number;
}

export function calcSMA(data: PricePoint[], period: number) {
    const result: { time: string; value: number }[] = [];
    for (let i = period - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j].close;
        }
        result.push({ time: data[i].time, value: sum / period });
    }
    return result;
}

export function calcEMA(data: PricePoint[], period: number) {
    const result: { time: string; value: number }[] = [];
    if (data.length < period) return result;

    const multiplier = 2 / (period + 1);

    // Seed with SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += data[i].close;
    }
    let prevEMA = sum / period;

    result.push({ time: data[period - 1].time, value: prevEMA });

    for (let i = period; i < data.length; i++) {
        const ema = (data[i].close - prevEMA) * multiplier + prevEMA;
        result.push({ time: data[i].time, value: ema });
        prevEMA = ema;
    }
    return result;
}

export function calcBollingerBands(data: PricePoint[], period: number, stdDev: number = 2) {
    const result: { time: string; upper: number; lower: number; middle: number }[] = [];
    for (let i = period - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j].close;
        }
        const mean = sum / period;

        let varianceSum = 0;
        for (let j = 0; j < period; j++) {
            varianceSum += Math.pow(data[i - j].close - mean, 2);
        }
        const variance = varianceSum / period;
        const sd = Math.sqrt(variance);

        result.push({
            time: data[i].time,
            middle: mean,
            upper: mean + stdDev * sd,
            lower: mean - stdDev * sd
        });
    }
    return result;
}

export function calcRSI(data: PricePoint[], period: number = 14) {
    const result: { time: string; value: number }[] = [];
    if (data.length < period + 1) return result;

    let avgGain = 0;
    let avgLoss = 0;

    for (let i = 1; i <= period; i++) {
        const change = data[i].close - data[i - 1].close;
        if (change > 0) avgGain += change;
        else avgLoss += Math.abs(change);
    }

    avgGain /= period;
    avgLoss /= period;

    if (avgLoss === 0) {
        result.push({ time: data[period].time, value: 100 });
    } else {
        const rs = avgGain / avgLoss;
        result.push({ time: data[period].time, value: 100 - (100 / (1 + rs)) });
    }

    for (let i = period + 1; i < data.length; i++) {
        const change = data[i].close - data[i - 1].close;
        let gain = 0;
        let loss = 0;
        if (change > 0) gain = change;
        else loss = Math.abs(change);

        avgGain = ((avgGain * (period - 1)) + gain) / period;
        avgLoss = ((avgLoss * (period - 1)) + loss) / period;

        if (avgLoss === 0) {
            result.push({ time: data[i].time, value: 100 });
        } else {
            const rs = avgGain / avgLoss;
            result.push({ time: data[i].time, value: 100 - (100 / (1 + rs)) });
        }
    }
    return result;
}

export function calcMACD(data: PricePoint[], shortPeriod = 12, longPeriod = 26, signalPeriod = 9) {
    const result: { time: string; macd: number; signal: number; histogram: number }[] = [];
    if (data.length < longPeriod) return result;

    const shortEma = calcEMA(data, shortPeriod);
    const longEma = calcEMA(data, longPeriod);

    // Map long EMA times to short EMA values to compute MACD Line
    const macdLineData: PricePoint[] = [];

    // longEma starts later, so we align based on longEma's times
    longEma.forEach(longVal => {
        const shortVal = shortEma.find(s => s.time === longVal.time);
        if (shortVal) {
            macdLineData.push({ time: longVal.time, close: shortVal.value - longVal.value });
        }
    });

    const signalLine = calcEMA(macdLineData, signalPeriod);

    // Combine them
    signalLine.forEach(sigVal => {
        const macdVal = macdLineData.find(m => m.time === sigVal.time);
        if (macdVal) {
            result.push({
                time: sigVal.time,
                macd: macdVal.close,
                signal: sigVal.value,
                histogram: macdVal.close - sigVal.value
            });
        }
    });

    return result;
}
