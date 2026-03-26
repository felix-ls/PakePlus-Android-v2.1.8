function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatAmount(value) {
    if (value === null || value === undefined || value === 0) return '<span class="amount-center">-</span>';
    return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatProgress(value) {
    if (value === null || value === undefined || value === 0) return '<span class="amount-center">-</span>';
    return value.toFixed(2) + '%';
}

function formatDate(value) {
    if (!value) return '<span class="amount-center">-</span>';
    return escapeHtml(String(value));
}

function formatText(value) {
    if (value === null || value === undefined || value === '') return '<span class="amount-center">-</span>';
    return escapeHtml(String(value));
}

function formatIndicatorNo(value) {
    if (value === null || value === undefined || value === '') return '<span class="amount-center">-</span>';
    const escaped = escapeHtml(String(value));
    if (escaped.includes('〔')) {
        return escaped.replace('〔', '<span class="indicator-no-wrap"></span>〔');
    }
    return escaped;
}
