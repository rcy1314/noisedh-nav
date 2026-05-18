$(function() {
    const $body = $('body');
    const $darkModeSwitch = $('.switch-dark-mode');
    const $goToUp = $('#go-to-up');
    const $bigHeaderBanner = $('.big-header-banner');
    const $sidebar = $('#sidebar');
    const $sidebarNav = $('.sidebar-nav');
    const theme = {}; // Add theme object to avoid reference error
    // 页面加载时检查 localStorage 中的模式设置
    $(document).ready(function() {
        const darkModeEnabled = localStorage.getItem('darkMode') === 'true';
        if (darkModeEnabled) {
            $body.addClass('io-black-mode');
        }
        switch_mode(); // 更新图标和按钮提示
    });

    // 返回顶部
    $(window).scroll(function() {
        if ($(this).scrollTop() >= 50) {
            $goToUp.fadeIn(200);
            $bigHeaderBanner.addClass('header-bg');
        } else {
            $goToUp.fadeOut(200);
            $bigHeaderBanner.removeClass('header-bg');
        }
    });

    $goToUp.click(function() {
        $('body,html').animate({ scrollTop: 0 }, 500);
        return false;
    });

    // 滑块菜单
    $('.slider_menu').children("ul").children("li").not(".anchor").hover(function() {
        $(this).addClass("hover");
        toTarget($(this).parent(), true, true);
    }, function() {
        $(this).removeClass("hover");
    });

    $('.slider_menu').mouseleave(function() {
        const menu = $(this).children("ul");
        setTimeout(() => toTarget(menu, true, true), 50);
    });

    function intoSlider() {
        $(".slider_menu[sliderTab]").each(function() {
            if (!$(this).hasClass('into')) {
                const menu = $(this).children("ul");
                menu.prepend('<li class="anchor" style="position:absolute;width:0;height:28px"></li>');
                const target = menu.find('.active').parent();
                if (target.length) {
                    menu.children(".anchor").css({
                        left: target.position().left + target.scrollLeft() + "px",
                        width: target.outerWidth() + "px",
                        height: target.height() + "px",
                        opacity: "1"
                    });
                }
                $(this).addClass('into');
            }
        });
    }

    // 粘性页脚
    function stickFooter() {
        const $footer = $('.main-footer');
        $footer.attr('style', '');
        if ($footer.hasClass('text-xs')) {
            const winHeight = $(window).height();
            const footerHeight = $footer.outerHeight(true);
            const mainContentHeight = $footer.position().top + footerHeight;
            if (winHeight > mainContentHeight - parseInt($footer.css('marginTop'), 10)) {
                $footer.css({ marginTop: winHeight - mainContentHeight });
            }
        }
    }

    // 处理窗口大小变化
    $(window).on('resize', function() {
        stickFooter();
        trigger_resizable(false);
    });

    // 侧边栏最小化
    let isMin = false;
    let isMobileMin = false;

    $('#sidebar-switch').on('click', function() {
        $('#sidebar').removeClass('mini-sidebar');
    });

    function trigger_resizable(isNoAnim) {
        const winWidth = $(window).width();
        if ((theme.minNav == '1' && !isMin && winWidth > 767.98) || (!isMin && winWidth > 767.98 && winWidth < 1024)) {
            $('#mini-button').prop('checked', false);
            trigger_lsm_mini(isNoAnim);
            isMin = true;
            if (isMobileMin) {
                $sidebar.addClass('mini-sidebar');
                $('.sidebar-nav .change-href').each(function() {
                    $(this).attr('href', $(this).data('change'));
                });
                isMobileMin = false;
            }
        } else if ((theme.minNav != '1') && ((isMin && winWidth >= 1024) || (isMobileMin && !isMin && winWidth >= 1024))) {
            $('#mini-button').prop('checked', true);
            trigger_lsm_mini(isNoAnim);
            isMin = false;
            if (isMobileMin) {
                isMobileMin = false;
            }
        } else if (winWidth < 767.98 && $sidebar.hasClass('mini-sidebar')) {
            $sidebar.removeClass('mini-sidebar');
            isMobileMin = true;
            isMin = false;
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
            $('.sidebar-nav .change-href').each(function() {
                $(this).attr('href', $(this).data('change'));
            });
            if (isNoAnim) {
                $('.sidebar-nav').removeClass('animate-nav').width(60);
            } else {
                $('.sidebar-nav').width(60);
            }
        }
    }

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

    // Ajax请求
    $(document).on('click', '.ajax-cm-home .ajax-cm', function(event) {
        event.preventDefault();
        const $this = $(this);
        const id = $this.data('id');
        const $box = $($this.attr('href')).children('.site-list');

        if ($box.children('.url-card').length === 0) {
            $this.addClass('disabled');
            $.ajax({
                url: theme.ajaxurl,
                type: 'POST',
                dataType: 'html',
                data: {
                    action: $this.data('action'),
                    term_id: id,
                },
                cache: true,
            }).done(function(response) {
                if (response.trim()) {
                    const $url = $(response);
                    $box.html($url);
                    if (isPC()) {
                        $url.find('[data-toggle="tooltip"]').each(function(){
                            var $t = $(this);
                            var placement = $t.data('placement') || 'top';
                            var delay = $t.data('delay') || { show: 0, hide: 0 };
                            $t.tooltip({
                                trigger: 'hover',
                                placement: placement,
                                delay: delay,
                                animation: false,
                                container: 'body'
                            });
                        });
                    }
                }
                $this.removeClass('disabled');
            }).fail(function() {
                $this.removeClass('disabled');
            });
        }
    });
});
// 搜索模块
