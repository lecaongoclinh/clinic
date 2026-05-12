(function (global) {
    "use strict";

    const $ = global.jQuery;

    if (!$) {
        return;
    }

    const ROLE = {
        ADMIN: 1,
        DOCTOR: 2,
        RECEPTIONIST: 3,
        CASHIER: 4,
        PHARMACIST: 5,
        WAREHOUSE: 6
    };

    const ROLE_HOME = {
        [ROLE.ADMIN]: "index.html",
        [ROLE.DOCTOR]: "phieukham.html",
        [ROLE.RECEPTIONIST]: "phieukham.html",
        [ROLE.CASHIER]: "pages/invoices.html",
        [ROLE.PHARMACIST]: "pages/capphatthuoc.html",
        [ROLE.WAREHOUSE]: "pages/medicines.html"
    };

    const MENU = [
        { label: "Thống kê", href: "index.html", icon: "fa fa-tachometer-alt", roles: [ROLE.ADMIN] },
        {
            label: "Bệnh nhân",
            href: "pages/patients.html",
            icon: "fa fa-user-injured",
            roles: [ROLE.ADMIN, ROLE.RECEPTIONIST]
        },
        {
            label: "Phiếu khám",
            href: "phieukham.html",
            icon: "fa fa-id-card",
            roles: [ROLE.ADMIN, ROLE.DOCTOR, ROLE.RECEPTIONIST],
            roleLabels: { [ROLE.DOCTOR]: "Khám bệnh" }
        },
        {
            label: "Đơn thuốc",
            href: "pages/prescriptions.html",
            icon: "fa fa-prescription-bottle-alt",
            roles: [ROLE.DOCTOR]
        },
        {
            label: "Bệnh án",
            icon: "fa fa-notes-medical",
            roles: [ROLE.ADMIN, ROLE.DOCTOR],
            children: [
                { label: "Danh sách bệnh án", href: "BenhAn.html", roles: [ROLE.ADMIN, ROLE.DOCTOR] },
                { label: "Tạo bệnh án mới", href: "CreateBenhAn.html", roles: [ROLE.ADMIN, ROLE.DOCTOR] }
            ]
        },
        {
            label: "Lịch làm việc",
            href: "schedule.html",
            icon: "fa fa-th",
            roles: [ROLE.ADMIN, ROLE.DOCTOR, ROLE.RECEPTIONIST]
        },
        {
            label: "Lịch khám",
            href: "LichKham.html",
            icon: "fa fa-calendar-check",
            roles: [ROLE.ADMIN, ROLE.DOCTOR, ROLE.RECEPTIONIST]
        },
        {
            label: "Cấp phát thuốc",
            href: "pages/capphatthuoc.html",
            icon: "fa fa-prescription-bottle-alt",
            roles: [ROLE.PHARMACIST]
        },
        {
            label: "Thuốc",
            icon: "far fa-file-alt",
            roles: [ROLE.ADMIN, ROLE.PHARMACIST, ROLE.WAREHOUSE],
            children: [
                { label: "Danh mục thuốc", href: "pages/medicines.html", roles: [ROLE.ADMIN, ROLE.PHARMACIST, ROLE.WAREHOUSE] },
                { label: "Đơn thuốc", href: "pages/prescriptions.html", roles: [ROLE.ADMIN, ROLE.PHARMACIST] },
                { label: "Tồn kho thuốc", href: "pages/inventory.html", roles: [ROLE.ADMIN, ROLE.PHARMACIST, ROLE.WAREHOUSE] }
            ]
        },
        {
            label: "Quản lý kho",
            icon: "far fa-file-alt",
            roles: [ROLE.ADMIN, ROLE.WAREHOUSE],
            children: [
                { label: "Nhà cung cấp", href: "pages/suppliers.html", roles: [ROLE.ADMIN, ROLE.WAREHOUSE] },
                { label: "Nhập thuốc", href: "pages/imports.html", roles: [ROLE.ADMIN, ROLE.WAREHOUSE] },
                { label: "Xuất thuốc", href: "pages/dispense.html", roles: [ROLE.ADMIN, ROLE.WAREHOUSE] },
                { label: "Tồn kho & cảnh báo", href: "pages/inventory.html", roles: [ROLE.ADMIN, ROLE.WAREHOUSE] }
            ]
        },
        {
            label: "Hóa đơn & Dịch vụ",
            icon: "fas fa-file-invoice-dollar",
            roles: [ROLE.ADMIN, ROLE.CASHIER],
            children: [
                { label: "Hóa đơn", href: "pages/invoices.html", roles: [ROLE.ADMIN, ROLE.CASHIER] },
                { label: "Thanh toán", href: "pages/invoices.html", roles: [ROLE.ADMIN, ROLE.CASHIER] },
                { label: "Dịch vụ", href: "pages/services.html", roles: [ROLE.ADMIN, ROLE.CASHIER] }
            ]
        }
    ];

    const PAGE_ROLES = {
        "index.html": [ROLE.ADMIN],
        "schedule.html": [ROLE.ADMIN, ROLE.DOCTOR, ROLE.RECEPTIONIST],
        "lichkham.html": [ROLE.ADMIN, ROLE.DOCTOR, ROLE.RECEPTIONIST],
        "phieukham.html": [ROLE.ADMIN, ROLE.DOCTOR, ROLE.RECEPTIONIST],
        "benhan.html": [ROLE.ADMIN, ROLE.DOCTOR],
        "createbenhan.html": [ROLE.ADMIN, ROLE.DOCTOR],
        "pages/patients.html": [ROLE.ADMIN, ROLE.RECEPTIONIST],
        "pages/prescriptions.html": [ROLE.ADMIN, ROLE.PHARMACIST, ROLE.DOCTOR],
        "pages/medicines.html": [ROLE.ADMIN, ROLE.PHARMACIST, ROLE.WAREHOUSE],
        "pages/medicine-detail.html": [ROLE.ADMIN, ROLE.PHARMACIST, ROLE.WAREHOUSE],
        "pages/inventory.html": [ROLE.ADMIN, ROLE.PHARMACIST, ROLE.WAREHOUSE],
        "pages/capphatthuoc.html": [ROLE.PHARMACIST],
        "pages/dispense.html": [ROLE.ADMIN, ROLE.PHARMACIST, ROLE.WAREHOUSE],
        "pages/tam.html": [ROLE.ADMIN, ROLE.WAREHOUSE],
        "pages/imports.html": [ROLE.ADMIN, ROLE.WAREHOUSE],
        "pages/suppliers.html": [ROLE.ADMIN, ROLE.WAREHOUSE],
        "pages/supplier-detail.html": [ROLE.ADMIN, ROLE.WAREHOUSE],
        "pages/invoices.html": [ROLE.ADMIN, ROLE.CASHIER],
        "pages/invoice_detail.html": [ROLE.ADMIN, ROLE.CASHIER],
        "pages/services.html": [ROLE.ADMIN, ROLE.CASHIER]
    };

    function currentRole() {
        return Number(global.localStorage.getItem("role"));
    }

    function currentPage() {
        const path = global.location.pathname.replace(/\\/g, "/").replace(/^\/+/, "").toLowerCase();
        if (!path || path.endsWith("/")) return "index.html";
        const frontendIndex = path.indexOf("frontend/");
        return frontendIndex >= 0 ? path.slice(frontendIndex + "frontend/".length) : path;
    }

    function pagePrefix() {
        return currentPage().startsWith("pages/") ? "../" : "";
    }

    function normalizeHref(href) {
        return (href || "")
            .toLowerCase()
            .replace(/^\.?\//, "")
            .split("#")[0]
            .split("?")[0];
    }

    function resolveHref(href) {
        const prefix = pagePrefix();
        const normalized = normalizeHref(href);
        if (!prefix) return href;
        return normalized.startsWith("pages/") ? normalized.replace("pages/", "") : `../${href}`;
    }

    function canSee(item, role) {
        return role === ROLE.ADMIN || !item.roles || item.roles.includes(role);
    }

    function isActive(item) {
        const page = currentPage();
        if (item.href && normalizeHref(item.href) === page) return true;
        return (item.children || []).some((child) => normalizeHref(child.href) === page);
    }

    function navLink(item, role) {
        const active = isActive(item) ? " active" : "";
        const label = item.roleLabels?.[role] || item.label;
        return `<a href="${resolveHref(item.href)}" class="nav-item nav-link${active}">
            <i class="${item.icon} me-2"></i>${label}
        </a>`;
    }

    function dropdown(item, role) {
        const children = item.children.filter((child) => canSee(child, role));
        if (!children.length) return "";
        const active = isActive(item) ? " active" : "";
        const show = isActive(item) ? " show" : "";
        const childHtml = children.map((child) => {
            const childActive = normalizeHref(child.href) === currentPage() ? " active" : "";
            return `<a href="${resolveHref(child.href)}" class="dropdown-item${childActive}">${child.label}</a>`;
        }).join("");

        return `<div class="nav-item dropdown">
            <a href="#" class="nav-link dropdown-toggle${active}${show}" data-bs-toggle="dropdown" aria-expanded="${isActive(item)}">
                <i class="${item.icon} me-2"></i>${item.label}
            </a>
            <div class="dropdown-menu bg-transparent border-0${show}">${childHtml}</div>
        </div>`;
    }

    function renderRoleMenu() {
        const role = currentRole();
        const nav = document.querySelector(".sidebar .navbar-nav.w-100");
        if (!nav || !role) return;

        nav.innerHTML = MENU
            .filter((item) => canSee(item, role))
            .map((item) => item.children ? dropdown(item, role) : navLink(item, role))
            .join("");

        setTimeout(() => {
            const activeEl = nav.querySelector(".nav-link.active, .dropdown-item.active");
            const sidebar = document.querySelector(".sidebar");
            if (activeEl && sidebar) {
                // Tính toán vị trí cuộn cho mượt mà, không dùng scrollIntoView để tránh trang web bị nhảy
                const topPos = activeEl.offsetTop;
                sidebar.scrollTop = topPos - sidebar.clientHeight / 2 + 50;
            }
        }, 50);
    }

    function applyPageAccess() {
        const publicPages = new Set(["signin.html", "dangky.html"]);
        const page = currentPage();
        if (publicPages.has(page) || page.startsWith("example/")) return;

        const token = global.localStorage.getItem("token");
        const role = currentRole();
        if (!token || !role) {
            global.location.href = pagePrefix() + "signin.html";
            return;
        }

        const allowed = PAGE_ROLES[page];
        if (allowed && role !== ROLE.ADMIN && !allowed.includes(role)) {
            global.location.href = resolveHref(ROLE_HOME[role] || "signin.html");
        }
    }

    function applyUserLabels() {
        const fullName = global.localStorage.getItem("fullName") || global.localStorage.getItem("username") || "";
        document.querySelectorAll("#usernameSidebar, #usernameNavbar, #navbarUserName").forEach((el) => {
            if (el) el.textContent = fullName;
        });
    }

    function logout() {
        global.localStorage.removeItem("token");
        global.localStorage.removeItem("username");
        global.localStorage.removeItem("fullName");
        global.localStorage.removeItem("role");
        global.localStorage.removeItem("userId");
        global.localStorage.removeItem("user");
        global.location.href = pagePrefix() + "signin.html";
    }

    function isLogoutLink(link) {
        const text = (link.textContent || "").trim().toLowerCase();
        return text === "log out"
            || text === "logout"
            || text === "đăng xuất"
            || text === "dang xuat";
    }

    function isSettingsLink(link) {
        const text = (link.textContent || "").trim().toLowerCase();
        return text === "settings"
            || text === "setting"
            || text === "cài đặt"
            || text === "cai dat";
    }

    function removeSettingsLinks() {
        document.querySelectorAll("a.dropdown-item").forEach((link) => {
            if (isSettingsLink(link)) {
                link.remove();
            }
        });
    }

    function wireLogoutLinks() {
        document.querySelectorAll("a.dropdown-item").forEach((link) => {
            if (!isLogoutLink(link)) return;
            link.setAttribute("href", "#");
            link.addEventListener("click", (event) => {
                event.preventDefault();
                logout();
            });
        });
    }

    global.logout = logout;

    applyPageAccess();
    renderRoleMenu();
    applyUserLabels();
    removeSettingsLinks();
    wireLogoutLinks();

    function hasPlugin(name) {
        return typeof $.fn[name] === "function";
    }

    function initChart(selector, config) {
        if (typeof global.Chart !== "function") {
            return;
        }

        const canvas = $(selector).get(0);
        if (!canvas || typeof canvas.getContext !== "function") {
            return;
        }

        new global.Chart(canvas.getContext("2d"), config);
    }

    const spinner = function () {
        setTimeout(function () {
            if ($("#spinner").length > 0) {
                $("#spinner").removeClass("show");
            }
        }, 1);
    };
    spinner();

    $(global).on("scroll", function () {
        if ($(this).scrollTop() > 300) {
            $(".back-to-top").fadeIn("slow");
        } else {
            $(".back-to-top").fadeOut("slow");
        }
    });

    $(".back-to-top").on("click", function () {
        $("html, body").animate({ scrollTop: 0 }, 1500, "easeInOutExpo");
        return false;
    });

    $(".sidebar-toggler").on("click", function () {
        $(".sidebar, .content").toggleClass("open");
        return false;
    });

    if (hasPlugin("waypoint") && $(".pg-bar").length) {
        $(".pg-bar").waypoint(function () {
            $(".progress .progress-bar").each(function () {
                $(this).css("width", $(this).attr("aria-valuenow") + "%");
            });
        }, { offset: "80%" });
    }

    if (hasPlugin("datetimepicker") && $("#calender").length) {
        $("#calender").datetimepicker({
            inline: true,
            format: "L"
        });
    }

    if (hasPlugin("owlCarousel") && $(".testimonial-carousel").length) {
        $(".testimonial-carousel").owlCarousel({
            autoplay: true,
            smartSpeed: 1000,
            items: 1,
            dots: true,
            loop: true,
            nav: false
        });
    }

    initChart("#worldwide-sales", {
        type: "bar",
        data: {
            labels: ["2016", "2017", "2018", "2019", "2020", "2021", "2022"],
            datasets: [
                {
                    label: "USA",
                    data: [15, 30, 55, 65, 60, 80, 95],
                    backgroundColor: "rgba(0, 156, 255, .7)"
                },
                {
                    label: "UK",
                    data: [8, 35, 40, 60, 70, 55, 75],
                    backgroundColor: "rgba(0, 156, 255, .5)"
                },
                {
                    label: "AU",
                    data: [12, 25, 45, 55, 65, 70, 60],
                    backgroundColor: "rgba(0, 156, 255, .3)"
                }
            ]
        },
        options: {
            responsive: true
        }
    });

    initChart("#salse-revenue", {
        type: "line",
        data: {
            labels: ["2016", "2017", "2018", "2019", "2020", "2021", "2022"],
            datasets: [
                {
                    label: "Salse",
                    data: [15, 30, 55, 45, 70, 65, 85],
                    backgroundColor: "rgba(0, 156, 255, .5)",
                    fill: true
                },
                {
                    label: "Revenue",
                    data: [99, 135, 170, 130, 190, 180, 270],
                    backgroundColor: "rgba(0, 156, 255, .3)",
                    fill: true
                }
            ]
        },
        options: {
            responsive: true
        }
    });

    initChart("#line-chart", {
        type: "line",
        data: {
            labels: [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150],
            datasets: [{
                label: "Salse",
                fill: false,
                backgroundColor: "rgba(0, 156, 255, .3)",
                data: [7, 8, 8, 9, 9, 9, 10, 11, 14, 14, 15]
            }]
        },
        options: {
            responsive: true
        }
    });

    initChart("#bar-chart", {
        type: "bar",
        data: {
            labels: ["Italy", "France", "Spain", "USA", "Argentina"],
            datasets: [{
                backgroundColor: [
                    "rgba(0, 156, 255, .7)",
                    "rgba(0, 156, 255, .6)",
                    "rgba(0, 156, 255, .5)",
                    "rgba(0, 156, 255, .4)",
                    "rgba(0, 156, 255, .3)"
                ],
                data: [55, 49, 44, 24, 15]
            }]
        },
        options: {
            responsive: true
        }
    });

    initChart("#pie-chart", {
        type: "pie",
        data: {
            labels: ["Italy", "France", "Spain", "USA", "Argentina"],
            datasets: [{
                backgroundColor: [
                    "rgba(0, 156, 255, .7)",
                    "rgba(0, 156, 255, .6)",
                    "rgba(0, 156, 255, .5)",
                    "rgba(0, 156, 255, .4)",
                    "rgba(0, 156, 255, .3)"
                ],
                data: [55, 49, 44, 24, 15]
            }]
        },
        options: {
            responsive: true
        }
    });

    initChart("#doughnut-chart", {
        type: "doughnut",
        data: {
            labels: ["Italy", "France", "Spain", "USA", "Argentina"],
            datasets: [{
                backgroundColor: [
                    "rgba(0, 156, 255, .7)",
                    "rgba(0, 156, 255, .6)",
                    "rgba(0, 156, 255, .5)",
                    "rgba(0, 156, 255, .4)",
                    "rgba(0, 156, 255, .3)"
                ],
                data: [55, 49, 44, 24, 15]
            }]
        },
        options: {
            responsive: true
        }
    });
})(window);
