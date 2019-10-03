function getDataFromDataTotal(startIndex: number, endIndex: number, dataLength: number) {
    let start = startIndex;
    let end = endIndex;
    let results = [];

    if (startIndex < 0) {
        start = 0;
    }
    if (startIndex >= dataLength) {
        start = dataLength - 1;
    }
    if (endIndex >= dataLength) {
        end = dataLength - 1;
    }
    if (endIndex < start) {
        end = start;
    }
    if (endIndex < 0) {
        end = start;
    }

    for (let i = start; i <= end; i++) {
        results.push(i);
    }

    return results;
}

module.exports = getDataFromDataTotal;