(() => {
    const stateMap = new Map();
    const observerMap = new Map();

    function getOrCreateState(tableSelector, pageSize) {
        if (!stateMap.has(tableSelector)) {
            stateMap.set(tableSelector, { page: 1, pageSize });
        }

        const state = stateMap.get(tableSelector);
        if (pageSize) state.pageSize = pageSize;
        return state;
    }

    function ensurePaginationContainer(table) {
        let container = table.parentElement.querySelector('.table-pagination');
        if (!container) {
            container = document.createElement('div');
            container.className = 'table-pagination';
            table.parentElement.appendChild(container);
        }
        return container;
    }

    function isEmptyRow(row) {
        return row.children.length === 1 && row.querySelector('.empty-state');
    }

    function buildPageItems(totalPages, currentPage) {
        const items = [];

        if (totalPages <= 5) {
            for (let page = 1; page <= totalPages; page += 1) {
                items.push(page);
            }
            return items;
        }

        items.push(1);

        if (currentPage > 3) items.push('ellipsis');

        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);

        for (let page = start; page <= end; page += 1) {
            if (!items.includes(page)) items.push(page);
        }

        if (currentPage < totalPages - 2) items.push('ellipsis');
        if (!items.includes(totalPages)) items.push(totalPages);

        return items;
    }

    function renderControls(container, tableSelector, totalPages, totalRows) {
        const state = stateMap.get(tableSelector);

        if (totalRows === 0 || totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        const items = buildPageItems(totalPages, state.page);
        const prevDisabled = state.page <= 1 ? 'disabled' : '';
        const nextDisabled = state.page >= totalPages ? 'disabled' : '';

        container.innerHTML = `
            <div class="table-pagination__controls" aria-label="Phân trang">
                <button class="table-pagination__item table-pagination__nav" data-page="${state.page - 1}" ${prevDisabled}>&lt;</button>
                ${items.map((item) => {
                    if (item === 'ellipsis') {
                        return '<span class="table-pagination__item table-pagination__ellipsis">...</span>';
                    }

                    const activeClass = Number(item) === state.page ? 'is-active' : '';
                    return `<button class="table-pagination__item ${activeClass}" data-page="${item}">${item}</button>`;
                }).join('')}
                <button class="table-pagination__item table-pagination__nav" data-page="${state.page + 1}" ${nextDisabled}>&gt;</button>
            </div>
        `;

        container.querySelectorAll('[data-page]').forEach((button) => {
            button.onclick = () => {
                const targetPage = Number(button.dataset.page);
                if (!Number.isInteger(targetPage) || targetPage < 1 || targetPage > totalPages) return;
                state.page = targetPage;
                window.TablePager.attach(tableSelector, { pageSize: state.pageSize });
            };
        });
    }

    function getTableSelector(table, index = 0) {
        if (!table.id) {
            table.id = `tablePager_${index}`;
        }
        return `#${table.id}`;
    }

    function observeTable(table) {
        const selector = getTableSelector(table);
        if (!selector || observerMap.has(selector)) return;

        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        const pageSize = Number(table.dataset.pageSize) || 8;
        const observer = new MutationObserver(() => {
            window.TablePager.reset(selector);
            window.TablePager.attach(selector, { pageSize });
        });

        observer.observe(tbody, { childList: true, subtree: true });
        observerMap.set(selector, observer);
    }

    window.TablePager = {
        attach(tableSelector, options = {}) {
            const table = document.querySelector(tableSelector);
            if (!table) return;

            const tbody = table.querySelector('tbody');
            if (!tbody) return;

            const rows = Array.from(tbody.querySelectorAll('tr'));
            const state = getOrCreateState(tableSelector, options.pageSize || Number(table.dataset.pageSize) || 8);
            const container = ensurePaginationContainer(table);

            if (!rows.length || rows.some(isEmptyRow)) {
                rows.forEach((row) => { row.style.display = ''; });
                container.innerHTML = '';
                return;
            }

            const totalRows = rows.length;
            const totalPages = Math.max(1, Math.ceil(totalRows / state.pageSize));
            if (state.page > totalPages) state.page = totalPages;

            const start = (state.page - 1) * state.pageSize;
            const end = start + state.pageSize;

            rows.forEach((row, index) => {
                row.style.display = index >= start && index < end ? '' : 'none';
            });

            renderControls(container, tableSelector, totalPages, totalRows);
        },

        reset(tableSelector) {
            const state = stateMap.get(tableSelector);
            if (state) state.page = 1;
        },

        scan(root = document) {
            root.querySelectorAll('table.table').forEach((table, index) => {
                if (table.dataset.pagination === 'off') return;
                if (!table.querySelector('tbody')) return;

                const selector = getTableSelector(table, index);
                const pageSize = Number(table.dataset.pageSize) || 8;
                window.TablePager.attach(selector, { pageSize });
                observeTable(table);
            });
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        window.TablePager.scan();
    });
})();
