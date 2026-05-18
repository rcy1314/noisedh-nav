$(function() {
    const $body = $('body');
    const $darkModeSwitch = $('.switch-dark-mode');
    const $goToUp = $('#go-to-up');
    const $bigHeaderBanner = $('.big-header-banner');
    const $sidebar = $('#sidebar');
    let isMin = false;
    let isMobileMin = false;

    // 暗黑模式初始化
    $(document).ready(function() {
        if (localStorage.getItem('darkMode') === 'true') {
            $body.addClass('io-black-mode');
        }
        switch_mode && switch_mode();
    });

    // 返回顶部
    $(window).scroll(function() {
        if ($(this).scrollTop() >= 50) {
            $goToUp.fadeIn(200);
            // $bigHeaderBanner.addClass('header-bg'); // 移除header-bg切换
        } else {
            $goToUp.fadeOut(200);
            // $bigHeaderBanner.removeClass('header-bg'); // 移除header-bg切换
        }
    });
    $goToUp.click(function(e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return false;
    });

    // 侧边栏最小化
    $('#sidebar-switch').on('click', function() {
        $sidebar.removeClass('mini-sidebar');
    });

    // 处理窗口大小变化
    $(window).on('resize', function() {
        trigger_resizable(false);
    });

    // 菜单栏最小化
    $('#mini-button').on('click', function() {
        trigger_lsm_mini(false);
    });

    function trigger_lsm_mini(isNoAnim) {
        if ($('.header-mini-btn input[type="checkbox"]').prop("checked")) {
            $('.sidebar-nav').removeClass('mini-sidebar');
            $('.sidebar-menu ul ul').hide();
            if (isNoAnim) {
                $('.sidebar-nav').removeClass('animate-nav').width(220);
            } else {
                $('.sidebar-nav').width(170);
            }
        } else {
            $('.sidebar-item.sidebar-show').removeClass('sidebar-show');
            $('.sidebar-menu ul').removeAttr('style');
            $('.sidebar-nav').addClass('mini-sidebar');
            if (isNoAnim) {
                $('.sidebar-nav').removeClass('animate-nav').width(60);
            } else {
                $('.sidebar-nav').width(60);
            }
        }
    }

    // 二级菜单展开与收缩
    $('.sidebar-menu-inner a').on('click', function() {
        if (!$('.sidebar-nav').hasClass('mini-sidebar')) {
            $(this).parent("li").siblings("li.sidebar-item").children('ul').hide();
            if ($(this).next().css('display') == "none") {
                $(this).next('ul').show();
                $(this).parent('li').addClass('sidebar-show').siblings('li').removeClass('sidebar-show');
            } else {
                $(this).next('ul').hide();
                $(this).parent('li').removeClass('sidebar-show');
            }
        }
    });

    // 显示二级悬浮菜单
    $(document).on('mouseover', '.mini-sidebar .sidebar-menu ul:first>li', function() {
        const offset = 2;
        if ($(".sidebar-popup.second").length == 0) {
            $("body").append("<div class='second sidebar-popup sidebar-menu-inner text-sm'><div></div></div>");
        }
        $(".sidebar-popup.second>div").html($(this).html());
        $(".sidebar-popup.second").show();
        const top = $(this).offset().top - $(window).scrollTop() + offset;
        const d = $(window).height() - $(".sidebar-popup.second>div").height();
        $(".sidebar-popup.second").stop().animate({ "top": Math.max(0, Math.min(top, d - 8)) }, 50);
    });

    // 隐藏悬浮菜单面板
    $(document).on('mouseleave', '.mini-sidebar .sidebar-menu ul:first, .mini-sidebar .slimScrollBar, .second.sidebar-popup', function() {
        $(".sidebar-popup.second").hide();
    });

    // 常驻二级悬浮菜单面板
    $(document).on('mouseover', '.mini-sidebar .slimScrollBar, .second.sidebar-popup', function() {
        $(".sidebar-popup.second").show();
    });

    // 触发窗口自适应
    function trigger_resizable(isNoAnim) {
        const winWidth = $(window).width();
        if (winWidth < 767.98 && $sidebar.hasClass('mini-sidebar')) {
            $sidebar.removeClass('mini-sidebar');
            isMobileMin = true;
            isMin = false;
        }
    }
});
