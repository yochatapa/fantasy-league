export const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date)) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd}`;
};

export const parseDate = (str) => {
    const [datePart, timePart] = str.split(' ')
    const [year, month, day] = datePart.split('.').map(Number)
    const [hour, minute] = timePart.split(':').map(Number)
    return new Date(year, month - 1, day, hour, minute)
}

export const differenceInDays = (later, earlier) => {
    const toMidnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const msPerDay = 1000 * 60 * 60 * 24
    return Math.round((toMidnight(later) - toMidnight(earlier)) / msPerDay)
}