const API = {
    async request(path, options = {}) {
        const url = API_BASE + path;

        // ★ 隐性鉴权：APP_TOKEN 非空时自动注入请求头（用户无感知）
        if (APP_TOKEN) {
            options.headers = Object.assign({}, options.headers, {
                'X-App-Token': APP_TOKEN
            });
        }

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.detail || err.message || '请求失败');
            }
            return await response.json();
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
    },

    /**
     * 发起请求并以 Blob 形式返回（用于文件下载）
     */
    async requestBlob(path, options = {}) {
        const url = API_BASE + path;
        if (APP_TOKEN) {
            options.headers = Object.assign({}, options.headers, {
                'X-App-Token': APP_TOKEN
            });
        }
        const response = await fetch(url, options);
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || err.message || '导出失败');
        }
        return response;
    },

    getYears() {
        return this.request('/api/indicators/years');
    },

    getIndicators(year, keyword, balance, budget_type, year_type) {
        const params = new URLSearchParams({ year, balance, budget_type, year_type });
        if (keyword) params.set('keyword', keyword);
        return this.request('/api/indicators/?' + params);
    },

    updateRemark(id, remark, year) {
        return this.request('/api/indicators/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ '备注': remark, year: year })
        });
    },

    uploadFile(formData) {
        return this.request('/api/upload/', {
            method: 'POST',
            body: formData
        });
    },

    addYear(year) {
        return this.request('/api/admin/year', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ year: year })
        });
    },

    deleteYear(year, password) {
        // 密码通过 Body 传递（不再用 Header）
        return this.request('/api/admin/year', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ year: year, password: password })
        });
    },

    resetYear(year, password) {
        return this.request('/api/admin/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ year: year, password: password })
        });
    },

    /**
     * Excel 导出：POST 请求，token 走 Header 不泄露到 URL
     * 返回 Promise<Response>，调用方自行 blob() + 下载
     */
    exportExcel(year, keyword, balance, budget_type, year_type) {
        return this.requestBlob('/api/indicators/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ year, keyword: keyword || '', balance, budget_type, year_type })
        });
    },

    getPaymentDetails(indicatorId, year) {
        const params = new URLSearchParams({ year });
        return this.request('/api/payment/' + encodeURIComponent(indicatorId) + '?' + params);
    }
};
