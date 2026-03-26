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
            if (response.status === 403) {
                throw new Error('访问被拒绝：未授权的外部访问');
            }
            return await response.json();
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
    },

    getYears() {
        return this.request('/api/indicators/years');
    },

    getIndicators(year, keyword, balance, source) {
        const params = new URLSearchParams({ year, balance, source });
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
        return this.request('/api/admin/year/' + year, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'password': password }
        });
    },

    resetYear(year, password) {
        return this.request('/api/admin/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ year: year, password: password })
        });
    },

    // Excel 导出（window.location 跳转，非 fetch）
    getExportUrl(year, keyword, balance, source) {
        const params = new URLSearchParams({ year, balance, source });
        if (keyword) params.set('keyword', keyword);
        let url = API_BASE + '/api/indicators/export?' + params;
        if (APP_TOKEN) url += '&token=' + encodeURIComponent(APP_TOKEN);
        return url;
    }
};
