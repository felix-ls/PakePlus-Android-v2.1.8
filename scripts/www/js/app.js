let currentEditId = null;
let currentYear = new Date().getFullYear();
let pendingFile = null;
let importYear = new Date().getFullYear();
let pendingAction = null;
let pendingActionData = null;
let currentBalance = 'all';
let currentSource = 'all';

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

    API.getIndicators(currentYear, keyword, currentBalance, currentSource)
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
                html += '<td class="amount">' + formatAmount(row['实际支付合计']) + '</td>';
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
    currentSource = 'all';
    document.querySelectorAll('#sourceGroup .radio-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.value === 'all') item.classList.add('active');
    });
    setBalanceFilter('all');
}

function setBalanceFilter(value) {
    currentBalance = value;
    document.querySelectorAll('#balanceGroup .radio-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.value === value) item.classList.add('active');
    });
    loadData(document.getElementById('searchInput').value);
}

function setSourceFilter(value) {
    currentSource = value;
    document.querySelectorAll('#sourceGroup .radio-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.value === value) item.classList.add('active');
    });
    loadData(document.getElementById('searchInput').value);
}

function exportExcel() {
    const keyword = document.getElementById('searchInput').value.trim();
    window.location.href = API.getExportUrl(currentYear, keyword, currentBalance, currentSource);
}

// ===== 备注编辑 =====

function openModal(id, currentRemark, indicatorNo) {
    currentEditId = id;
    const isHistoryYear = currentYear !== new Date().getFullYear();
    document.getElementById('remarkInput').value = currentRemark === '-' ? '' : currentRemark;
    document.getElementById('remarkInput').disabled = isHistoryYear;
    document.getElementById('modalIndicatorInfo').textContent = '指标文号: ' + (indicatorNo === '-' ? '' : indicatorNo);
    if (isHistoryYear) {
        document.querySelector('.btn-save').style.display = 'none';
    } else {
        document.querySelector('.btn-save').style.display = '';
    }
    document.getElementById('remarkModal').classList.add('active');
}

function closeModal() {
    document.getElementById('remarkModal').classList.remove('active');
    currentEditId = null;
}

function saveRemark() {
    if (currentEditId === null) return;
    const newRemark = document.getElementById('remarkInput').value.trim();

    API.updateRemark(currentEditId, newRemark, currentYear)
        .then(data => {
            if (data.success) {
                closeModal();
                loadData(document.getElementById('searchInput').value.trim());
            } else {
                alert('保存失败: ' + (data.error || '未知错误'));
            }
        })
        .catch(() => alert('保存失败，请重试'));
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

            if (data.success) {
                alert('导入成功！' + data.message);
                loadYears();
                loadData();
                updateAdminYearSelects();
            } else {
                alert('导入失败：' + data.message);
            }
        })
        .catch(() => {
            btn.textContent = originalText;
            btn.disabled = false;
            document.getElementById('fileInput').value = '';
            alert('上传失败，请重试');
        });
}

// ===== 管理面板 =====

function openAdminModal() {
    updateAdminYearSelects();
    document.getElementById('adminModal').classList.add('active');
}

function closeAdminModal() {
    document.getElementById('adminModal').classList.remove('active');
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
            if (data.success) {
                alert(data.message);
                loadYears();
                updateAdminYearSelects();
                document.getElementById('newYearInput').value = '';
            } else {
                alert('新增失败：' + data.message);
            }
        })
        .catch(() => alert('操作失败，请重试'));
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
            if (data.success) {
                alert(data.message);
                loadYears();
                updateAdminYearSelects();
            } else {
                alert('删除失败：' + data.message);
            }
        })
        .catch(() => alert('操作失败，请重试'));
}

function doResetYear(year, password) {
    API.resetYear(year, password)
        .then(data => {
            if (data.success) {
                alert(data.message);
                loadData();
                updateAdminYearSelects();
            } else {
                alert('重置失败：' + data.message);
            }
        })
        .catch(() => alert('操作失败，请重试'));
}

// ===== 密码模态框 =====

function closePasswordModal() {
    document.getElementById('passwordModal').classList.remove('active');
    document.getElementById('passwordInput').value = '';
    pendingFile = null;
    pendingAction = null;
    pendingActionData = null;
}

function confirmPassword() {
    const password = document.getElementById('passwordInput').value;
    if (!password) { alert('请输入密码'); return; }

    if (pendingAction === 'deleteYear') {
        doDeleteYear(pendingActionData.year, password);
    } else if (pendingAction === 'resetYear') {
        doResetYear(pendingActionData.year, password);
    } else {
        doUpload(pendingFile, password);
    }
    closePasswordModal();
}

// ===== 事件绑定 =====

document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') searchData();
});

document.getElementById('tableBody').addEventListener('click', function(e) {
    const cell = e.target.closest('.remark-cell');
    if (cell) {
        openModal(
            parseInt(cell.dataset.id),
            cell.dataset.remark,
            cell.dataset.indicator
        );
    }
});

// ===== 启动 =====

loadYears();
