let currentEditId = null;
let currentYear = new Date().getFullYear();
let pendingFile = null;
let importYear = new Date().getFullYear();
let pendingAction = null;
let pendingActionData = null;
let currentBalance = 'all';
let currentBudget = 'all';
let currentYearType = 'all';

// ===== 弹窗滚动锁定 =====
let _savedScrollY = 0;

function lockBodyScroll() {
    _savedScrollY = window.scrollY;
    document.body.classList.add('modal-open');
    document.body.style.top = -_savedScrollY + 'px';
}

function unlockBodyScroll() {
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    window.scrollTo(0, _savedScrollY);
}

// ===== 数据加载 =====

function loadYears() {
    API.getYears()
        .then(result => {
            const select = document.getElementById('yearSelect');
            select.innerHTML = '';
            result.years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year + '年';
                if (year === result.currentYear) option.selected = true;
                select.appendChild(option);
            });
            currentYear = result.currentYear;
            loadData();
        })
        .catch(error => {
            console.error('加载年份失败:', error);
            alert('无法加载数据，请检查网络连接或刷新页面重试');
        });
}

function changeYear() {
    currentYear = parseInt(document.getElementById('yearSelect').value);
    loadData();
}

function loadData(keyword) {
    keyword = keyword || '';
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '<tr><td colspan="13" class="loading">加载中...</td></tr>';

    API.getIndicators(currentYear, keyword, currentBalance, currentBudget, currentYearType)
        .then(result => {
            const data = result.data || [];
            const summary = result.summary || {};

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="13" class="no-data">暂无数据</td></tr>';
                document.getElementById('sum_原始指标金额').innerHTML = '<span class="amount-center">-</span>';
                document.getElementById('sum_实际指标可用金额').innerHTML = '<span class="amount-center">-</span>';
                document.getElementById('sum_实际支付合计').innerHTML = '<span class="amount-center">-</span>';
                document.getElementById('sum_实际支付支付进度').innerHTML = '<span class="amount-center">-</span>';
                document.getElementById('sum_指标结余').innerHTML = '<span class="amount-center">-</span>';
                return;
            }

            let html = '';
            const isEditable = (currentYear === new Date().getFullYear());
            data.forEach((row, index) => {
                html += '<tr>';
                html += '<td>' + (index + 1) + '</td>';
                html += '<td class="indicator-no">' + formatIndicatorNo(row['指标文号']) + '</td>';
                html += '<td class="indicator-no">' + formatIndicatorNo(row['上级指标文号']) + '</td>';
                html += '<td class="indicator-no">' + formatIndicatorNo(row['上层指标文号']) + '</td>';
                html += '<td class="date-cell">' + formatDate(row['下达日期']) + '</td>';
                html += '<td class="date-cell">' + formatDate(row['发文日期']) + '</td>';
                html += '<td class="indicator-desc">' + formatText(row['指标说明']) + '</td>';
                html += '<td class="amount">' + formatAmount(row['原始指标金额']) + '</td>';
                html += '<td class="amount">' + formatAmount(row['实际指标可用金额']) + '</td>';
                if (row['实际支付合计'] && row['实际支付合计'] > 0 && row['指标id']) {
                    html += '<td class="amount payment-link" data-indicator-id="' + escapeHtml(row['指标id']) + '">' + formatAmount(row['实际支付合计']) + '</td>';
                } else {
                    html += '<td class="amount">' + formatAmount(row['实际支付合计']) + '</td>';
                }
                html += '<td class="amount">' + formatProgress(row['实际支付支付进度']) + '</td>';
                html += '<td class="amount">' + formatAmount(row['指标结余']) + '</td>';
                if (isEditable) {
                    html += '<td class="remark-cell" data-id="' + row['id'] + '" data-remark="' + escapeHtml(row['备注'] || '') + '" data-indicator="' + escapeHtml(row['指标文号'] || '') + '">' + formatText(row['备注']) + '</td>';
                } else {
                    html += '<td class="remark-cell-readonly">' + formatText(row['备注']) + '</td>';
                }
                html += '</tr>';
            });
            tbody.innerHTML = html;

            document.getElementById('sum_原始指标金额').innerHTML = formatAmount(summary['原始指标金额']);
            document.getElementById('sum_实际指标可用金额').innerHTML = formatAmount(summary['实际指标可用金额']);
            document.getElementById('sum_实际支付合计').innerHTML = formatAmount(summary['实际支付合计']);
            document.getElementById('sum_实际支付支付进度').innerHTML = summary['实际支付支付进度'] ? summary['实际支付支付进度'].toFixed(2) + '%' : '<span class="amount-center">-</span>';
            document.getElementById('sum_指标结余').innerHTML = formatAmount(summary['指标结余']);
        })
        .catch(error => {
            console.error('Error:', error);
            tbody.innerHTML = '<tr><td colspan="13" class="no-data">加载失败，请重试</td></tr>';
        });
}

// ===== 搜索与筛选 =====

function searchData() {
    const keyword = document.getElementById('searchInput').value.trim();
    loadData(keyword);
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    currentBalance = 'all';
    currentBudget = 'all';
    currentYearType = 'all';
    document.querySelectorAll('.radio-item').forEach(item => item.classList.remove('active'));
    loadData();
}

function toggleFilter(groupId, filterName, value) {
    var group = document.getElementById(groupId);
    var activeItem = group.querySelector('.radio-item.active');
    var wasActive = activeItem && activeItem.dataset.value === value;

    group.querySelectorAll('.radio-item').forEach(item => item.classList.remove('active'));

    if (wasActive) {
        if (filterName === 'balance') currentBalance = 'all';
        else if (filterName === 'budget') currentBudget = 'all';
        else if (filterName === 'yearType') currentYearType = 'all';
    } else {
        group.querySelector('[data-value="' + value + '"]').classList.add('active');
        if (filterName === 'balance') {
            currentBalance = value;
        } else if (filterName === 'budget') {
            currentBudget = value;
            if (value === 'budget') {
                currentYearType = 'all';
                document.querySelectorAll('#yearTypeGroup .radio-item').forEach(item => item.classList.remove('active'));
            }
        } else if (filterName === 'yearType') {
            currentYearType = value;
            if (value === 'carryover') {
                currentBudget = 'all';
                document.querySelectorAll('#budgetGroup .radio-item').forEach(item => item.classList.remove('active'));
            }
        }
    }
    loadData(document.getElementById('searchInput').value.trim());
}

function exportExcel() {
    const keyword = document.getElementById('searchInput').value.trim();
    const btn = document.querySelector('.btn-orange');
    const originalText = btn.textContent;
    btn.textContent = '导出中...';
    btn.disabled = true;

    API.exportExcel(currentYear, keyword, currentBalance, currentBudget, currentYearType)
        .then(async response => {
            const blob = await response.blob();
            // 从 Content-Disposition 提取文件名
            const disposition = response.headers.get('Content-Disposition') || '';
            let filename = '指标数据.xlsx';
            const match = disposition.match(/filename\*=UTF-8''(.+)/);
            if (match) filename = decodeURIComponent(match[1]);

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        })
        .catch(e => alert('导出失败: ' + e.message))
        .finally(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        });
}

// ===== 备注编辑 =====

function openModal(id, currentRemark, indicatorNo) {
    currentEditId = id;
    const isHistoryYear = currentYear !== new Date().getFullYear();
    document.getElementById('remarkInput').value = currentRemark === '-' ? '' : currentRemark;
    document.getElementById('remarkInput').disabled = isHistoryYear;
    document.getElementById('modalIndicatorInfo').textContent = '指标文号: ' + (indicatorNo === '-' ? '' : indicatorNo);
    if (isHistoryYear) {
        document.querySelector('#remarkModal .btn-save').style.display = 'none';
    } else {
        document.querySelector('#remarkModal .btn-save').style.display = '';
    }
    document.getElementById('remarkModal').classList.add('active');
    lockBodyScroll();
}

function closeModal() {
    document.getElementById('remarkModal').classList.remove('active');
    unlockBodyScroll();
    currentEditId = null;
}

function saveRemark() {
    if (currentEditId === null) return;
    const newRemark = document.getElementById('remarkInput').value.trim();

    API.updateRemark(currentEditId, newRemark, currentYear)
        .then(() => {
            closeModal();
            loadData(document.getElementById('searchInput').value.trim());
        })
        .catch(e => alert('保存失败: ' + e.message));
}

// ===== 文件上传 =====

function handleFileSelect(input) {
    const file = input.files[0];
    if (!file) return;

    document.getElementById('importFileName').textContent = '已选择: ' + file.name;

    const yearValue = document.getElementById('importYearSelect').value;
    importYear = yearValue ? parseInt(yearValue) : new Date().getFullYear();
    const currentYearNow = new Date().getFullYear();

    if (importYear !== currentYearNow) {
        pendingFile = file;
        pendingAction = 'import';
        document.getElementById('passwordModalHint').textContent = '导入' + importYear + '年历史数据需要管理员密码验证';
        document.getElementById('passwordModal').classList.add('active');
        return;
    }

    doUpload(file, '');
}

function doUpload(file, password) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('year', importYear);
    if (password) formData.append('password', password);

    const btn = document.getElementById('btnSelectFile');
    const originalText = btn.textContent;
    btn.textContent = '处理中...';
    btn.disabled = true;

    API.uploadFile(formData)
        .then(data => {
            btn.textContent = originalText;
            btn.disabled = false;
            document.getElementById('fileInput').value = '';
            document.getElementById('importFileName').textContent = '';
            alert('导入成功！' + data.message);
            loadYears();
            loadData();
            updateAdminYearSelects();
        })
        .catch(e => {
            btn.textContent = originalText;
            btn.disabled = false;
            document.getElementById('fileInput').value = '';
            alert('导入失败：' + e.message);
        });
}

// ===== 管理面板 =====

function openAdminModal() {
    updateAdminYearSelects();
    document.getElementById('adminModal').classList.add('active');
    lockBodyScroll();
}

function closeAdminModal() {
    document.getElementById('adminModal').classList.remove('active');
    unlockBodyScroll();
}

function updateAdminYearSelects() {
    API.getYears()
        .then(result => {
            const importSelect = document.getElementById('importYearSelect');
            const deleteSelect = document.getElementById('deleteYearSelect');
            const resetSelect = document.getElementById('resetYearSelect');
            const currentYearNow = new Date().getFullYear();

            importSelect.innerHTML = '';
            deleteSelect.innerHTML = '';
            resetSelect.innerHTML = '';

            result.years.forEach(year => {
                const opt0 = document.createElement('option');
                opt0.value = year;
                opt0.textContent = year + '年';
                if (year === currentYearNow) opt0.selected = true;
                importSelect.appendChild(opt0);

                if (year !== currentYearNow) {
                    const opt1 = document.createElement('option');
                    opt1.value = year;
                    opt1.textContent = year + '年';
                    deleteSelect.appendChild(opt1);
                }

                const opt2 = document.createElement('option');
                opt2.value = year;
                opt2.textContent = year + '年';
                if (year === currentYearNow) opt2.selected = true;
                resetSelect.appendChild(opt2);
            });

            if (deleteSelect.options.length > 0) deleteSelect.selectedIndex = 0;
            if (resetSelect.options.length > 0) resetSelect.selectedIndex = 0;
        })
        .catch(() => alert('加载年份列表失败，请重试'));
}

function addNewYear() {
    const year = parseInt(document.getElementById('newYearInput').value);
    if (!year || year < 2000 || year > 2100) {
        alert('请输入有效年份（2000-2100）');
        return;
    }

    API.addYear(year)
        .then(data => {
            alert(data.message);
            loadYears();
            updateAdminYearSelects();
            document.getElementById('newYearInput').value = '';
        })
        .catch(e => alert('新增失败：' + e.message));
}

function deleteYear() {
    const year = parseInt(document.getElementById('deleteYearSelect').value);
    if (!year) { alert('请选择要删除的年份'); return; }

    pendingAction = 'deleteYear';
    pendingActionData = { year: year };
    document.getElementById('passwordModalHint').textContent = '删除' + year + '年数据需要管理员密码验证';
    document.getElementById('passwordModal').classList.add('active');
}

function resetYearData() {
    const year = parseInt(document.getElementById('resetYearSelect').value);
    if (!year) { alert('请选择要重置的年份'); return; }

    if (!confirm('确定要重置' + year + '年的所有数据吗？此操作不可恢复！')) return;

    pendingAction = 'resetYear';
    pendingActionData = { year: year };
    document.getElementById('passwordModalHint').textContent = '重置' + year + '年数据需要管理员密码验证';
    document.getElementById('passwordModal').classList.add('active');
}

function doDeleteYear(year, password) {
    API.deleteYear(year, password)
        .then(data => {
            alert(data.message);
            loadYears();
            updateAdminYearSelects();
        })
        .catch(e => alert('删除失败：' + e.message));
}

function doResetYear(year, password) {
    API.resetYear(year, password)
        .then(data => {
            alert(data.message);
            loadData();
            updateAdminYearSelects();
        })
        .catch(e => alert('重置失败：' + e.message));
}

// ===== 密码模态框 =====

function closePasswordModal() {
    document.getElementById('passwordModal').classList.remove('active');
    document.getElementById('passwordInput').value = '';
    pendingFile = null;
    pendingAction = null;
    pendingActionData = null;
    // 密码框可能叠在管理面板上，仅当无其他弹窗活跃时才解锁滚动
    if (!document.querySelector('.modal.active')) {
        unlockBodyScroll();
    }
}

function confirmPassword() {
    const password = document.getElementById('passwordInput').value;
    if (!password) { alert('请输入密码'); return; }

    if (pendingAction === 'deleteYear') {
        doDeleteYear(pendingActionData.year, password);
    } else if (pendingAction === 'resetYear') {
        doResetYear(pendingActionData.year, password);
    } else if (pendingAction === 'import') {
        doUpload(pendingFile, password);
    }
    closePasswordModal();
}

// ===== 事件绑定 =====

document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') searchData();
});

document.getElementById('passwordInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') confirmPassword();
});

// 点击遮罩层关闭弹窗
document.querySelectorAll('.modal').forEach(function(modal) {
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            var id = this.id;
            if (id === 'remarkModal') closeModal();
            else if (id === 'adminModal') closeAdminModal();
            else if (id === 'passwordModal') closePasswordModal();
            else if (id === 'paymentModal') closePaymentModal();
        }
    });
});

// Escape 键关闭弹窗（按层级优先级）
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (document.getElementById('passwordModal').classList.contains('active')) {
            closePasswordModal();
        } else if (document.getElementById('paymentModal').classList.contains('active')) {
            closePaymentModal();
        } else if (document.getElementById('remarkModal').classList.contains('active')) {
            closeModal();
        } else if (document.getElementById('adminModal').classList.contains('active')) {
            closeAdminModal();
        }
    }
});

document.getElementById('tableBody').addEventListener('click', function(e) {
    // 支付明细点击
    const paymentCell = e.target.closest('.payment-link');
    if (paymentCell) {
        const indicatorId = paymentCell.dataset.indicatorId;
        if (indicatorId) {
            openPaymentModal(indicatorId);
            return;
        }
    }

    const row = e.target.closest('tr');
    if (row) {
        document.querySelectorAll('#tableBody tr.selected').forEach(r => r.classList.remove('selected'));
        row.classList.toggle('selected');
    }

    const cell = e.target.closest('.remark-cell');
    if (cell) {
        openModal(
            parseInt(cell.dataset.id),
            cell.dataset.remark,
            cell.dataset.indicator
        );
    }
});

// ===== 支付明细弹窗 =====

function openPaymentModal(indicatorId) {
    document.getElementById('paymentTableBody').innerHTML = '<tr><td colspan="6" class="loading">加载中...</td></tr>';
    document.getElementById('paymentTotal').textContent = '';
    document.getElementById('paymentModal').classList.add('active');
    lockBodyScroll();

    API.getPaymentDetails(indicatorId, currentYear)
        .then(result => {
            const data = result.data || [];
            const total = result.total || 0;

            if (data.length === 0) {
                document.getElementById('paymentTableBody').innerHTML = '<tr><td colspan="6" class="no-data">暂无支付明细</td></tr>';
                document.getElementById('paymentTotal').textContent = '';
                return;
            }

            let html = '';
            data.forEach((item, idx) => {
                html += '<tr>';
                html += '<td>' + (idx + 1) + '</td>';
                html += '<td>' + formatText(item['收款人']) + '</td>';
                html += '<td class="date-cell">' + formatDate(item['银行支付日期']) + '</td>';
                html += '<td class="date-cell">' + formatDate(item['清算日期']) + '</td>';
                html += '<td class="amount">' + formatAmount(item['金额']) + '</td>';
                html += '<td style="text-align:left">' + formatText(item['摘要事由']) + '</td>';
                html += '</tr>';
            });
            document.getElementById('paymentTableBody').innerHTML = html;
            document.getElementById('paymentTotal').textContent = '合计 ' + total.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' 元 · ' + data.length + ' 笔';
        })
        .catch(e => {
            document.getElementById('paymentTableBody').innerHTML = '<tr><td colspan="6" class="no-data">加载失败: ' + escapeHtml(e.message) + '</td></tr>';
        });
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
    unlockBodyScroll();
}

// ===== 启动 =====

loadYears();
