/**
 * HERON AI - MOTION SIMULATION ENGINE
 * Architecture: Modular jQuery + GSAP + ScrollTrigger + Lenis + lil-gui
 */

var CONFIG = {
	cursor: {
		enabled: true,
		lerp: 0.18,
	},
	hero: {
		crosshairActive: true,
		violationPulse: true,
		violationPulseSpeed: 1.8,
		showProjectionLines: true,
	},
	inkMask: {
		morphDuration: 1.6,
		displacementScale: 100,
		baseFrequencyX: 0.045,
		baseFrequencyY: 0.055,
	},
	typography: {
		stagger: 0.12,
		duration: 0.85,
		ease: 'power3.out',
	},
	marquee: {
		speed: 24, // seconds per loop
	},
	dev: {
		wireframeMode: false,
		exportConfig: function () {
			console.log('--- CURRENT HERON MOTION CONFIG ---');
			console.log(JSON.stringify(CONFIG, null, 2));
			alert('Config exported to developer console (F12)');
		},
	},
};

/* ==========================================================================
   MODULE 1: CUSTOM CURSOR
   ========================================================================== */
var CursorModule = {
	pos: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
	target: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
	$cursor: null,

	init: function () {
		this.$cursor = $('.cursor-wrapper');
		if (!this.$cursor.length) return;

		var self = this;
		$(window).on('mousemove', function (e) {
			self.target.x = e.clientX;
			self.target.y = e.clientY;
		});

		// Hover interaction
		$('a, button, .violation-marker, .problem-card, .tab-btn, .faq-item').on(
			'mouseenter',
			function () {
				self.$cursor.find('.cursor-dot').css({
					transform: 'translate(-50%, -50%) scale(2.2)',
					backgroundColor: 'var(--cl-primary)',
				});
				self.$cursor.find('.cursor-crosshair').css({
					transform: 'translate(-50%, -50%) scale(1.4) rotate(45deg)',
					opacity: 0.9,
				});
			}
		);

		$('a, button, .violation-marker, .problem-card, .tab-btn, .faq-item').on(
			'mouseleave',
			function () {
				self.$cursor.find('.cursor-dot').css({
					transform: 'translate(-50%, -50%) scale(1)',
					backgroundColor: 'var(--cl-brand)',
				});
				self.$cursor.find('.cursor-crosshair').css({
					transform: 'translate(-50%, -50%) scale(1) rotate(0deg)',
					opacity: 0.6,
				});
			}
		);

		this.loop();
	},

	loop: function () {
		var self = this;
		var cursorEl = self.$cursor[0];
		function tick() {
			if (CONFIG.cursor.enabled && cursorEl) {
				self.pos.x += (self.target.x - self.pos.x) * CONFIG.cursor.lerp;
				self.pos.y += (self.target.y - self.pos.y) * CONFIG.cursor.lerp;
				cursorEl.style.transform = 'translate3d(' + self.pos.x + 'px, ' + self.pos.y + 'px, 0)';
			}
			requestAnimationFrame(tick);
		}
		requestAnimationFrame(tick);
	},
};

/* ==========================================================================
   MODULE 2: HERO INTERACTIVE BLUEPRINT & CROSSHAIR TRACKER
   ========================================================================== */
var HeroModule = {
	$area: null,
	$lineH: null,
	$lineV: null,
	$tracker: null,
	$coordX: null,
	$coordY: null,
	isDragging: false,

	init: function () {
		this.$area = $('#heroCanvasArea');
		if (!this.$area.length) return;

		this.$lineH = $('#cursorLineH');
		this.$lineV = $('#cursorLineV');
		this.$tracker = $('#cursorTracker');
		this.$coordX = $('#coordX');
		this.$coordY = $('#coordY');

		var self = this;

		// Mouse move over blueprint area
		this.$area.on('mousemove', function (e) {
			if (!CONFIG.hero.crosshairActive) return;

			var offset = self.$area.offset();
			var width = self.$area.width();
			var height = self.$area.height();

			var relX = Math.round(e.pageX - offset.left);
			var relY = Math.round(e.pageY - offset.top);

			// Constrain within area
			relX = Math.max(0, Math.min(width, relX));
			relY = Math.max(0, Math.min(height, relY));

			self.$lineH.css('top', relY + 'px');
			self.$lineV.css('left', relX + 'px');
			self.$tracker.css({
				left: relX + 'px',
				top: relY + 'px',
			});

			// Map to architectural model space coordinates (e.g. 0 to 1920)
			var archX = Math.round((relX / width) * 1920);
			var archY = Math.round((relY / height) * 1080);

			self.$coordX.text(archX);
			self.$coordY.text(archY);
		});

		this.$area.on('mouseenter', function () {
			self.$lineH.stop().fadeIn(150);
			self.$lineV.stop().fadeIn(150);
			self.$tracker.stop().fadeIn(150);
		});

		this.$area.on('mouseleave', function () {
			self.$lineH.stop().fadeOut(200);
			self.$lineV.stop().fadeOut(200);
			self.$tracker.stop().fadeOut(200);
		});

		// Drag interaction for violations exploration
		this.$area.on('mousedown', function () {
			self.isDragging = true;
			$('.violation-marker').addClass('highlight');
			gsap.to('.violation-card', {
				scale: 1.08,
				duration: 0.25,
				boxShadow: '0 8px 24px rgba(250, 54, 0, 0.25)',
			});
		});

		$(window).on('mouseup', function () {
			if (self.isDragging) {
				self.isDragging = false;
				$('.violation-marker').removeClass('highlight');
				gsap.to('.violation-card', {
					scale: 1,
					duration: 0.25,
					boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
				});
			}
		});

		// Violation marker click popup
		$('.violation-marker').on('click', function (e) {
			e.stopPropagation();
			var code = $(this).find('.violation-code').text();
			var desc = $(this).find('.violation-desc').text();

			gsap.fromTo(
				$(this).find('.violation-card'),
				{ scale: 0.9, y: 10 },
				{ scale: 1, y: 0, duration: 0.35, ease: 'back.out(2)' }
			);
		});
	},
};

/* ==========================================================================
   MODULE 3: ORGANIC INK MASK DISPLACEMENT REVEAL
   ========================================================================== */
var InkMaskModule = {
	timeline: null,

	init: function () {
		var $maskPath = $('.ink-path-morph');
		if (!$maskPath.length) return;

		// Morph path definition from flat top slit to full liquid expansion
		var startD = 'M 0 1 Q 500 2 1000 1 L 1000 0 L 0 0 Z';
		var endD = 'M 0 1000 Q 500 1250 1000 1000 L 1000 0 L 0 0 Z';

		if (window.ScrollTrigger) {
			this.timeline = gsap.timeline({
				scrollTrigger: {
					trigger: '#inkMaskContainer',
					start: 'top 75%',
					end: 'bottom 40%',
					scrub: 1.2,
				},
			});

			this.timeline.fromTo(
				$maskPath[0],
				{ attr: { d: startD } },
				{
					attr: { d: endD },
					duration: CONFIG.inkMask.morphDuration,
					ease: 'power2.inOut',
				}
			);
		}

		// Also trigger on hover for instant tactile simulation
		$('#inkMaskContainer').on('mouseenter', function () {
			gsap.to($maskPath[0], {
				attr: { d: endD },
				duration: 0.8,
				ease: 'power3.out',
				overwrite: 'auto',
			});
		});

		$('#inkMaskContainer').on('mouseleave', function () {
			if (!ScrollTrigger.isInViewport('#inkMaskContainer')) {
				gsap.to($maskPath[0], {
					attr: { d: startD },
					duration: 0.8,
					ease: 'power3.in',
					overwrite: 'auto',
				});
			}
		});
	},

	updateFilter: function () {
		var $filter = $('#sharedDisplacementFilter');
		if (!$filter.length) return;

		$filter.find('feTurbulence').attr({
			baseFrequency:
				CONFIG.inkMask.baseFrequencyX + ' ' + CONFIG.inkMask.baseFrequencyY,
		});
		$filter
			.find('feDisplacementMap')
			.attr('scale', CONFIG.inkMask.displacementScale);
	},
};

/* ==========================================================================
   MODULE 4: KINETIC TYPOGRAPHY MASK REVEAL
   ========================================================================== */
var TypographyModule = {
	init: function () {
		var $reveals = $('.mask-reveal');
		if (!$reveals.length) return;

		// Immediately reveal hero elements on load
		$('.home-hero .mask-reveal').addClass('is-revealed');

		if (window.IntersectionObserver) {
			var observer = new IntersectionObserver(
				function (entries) {
					entries.forEach(function (entry) {
						if (entry.isIntersecting) {
							$(entry.target).addClass('is-revealed');
						}
					});
				},
				{ threshold: 0.1 }
			);

			$reveals.each(function () {
				observer.observe(this);
			});
		} else {
			$reveals.addClass('is-revealed');
		}
	},
};

/* ==========================================================================
   MODULE 5: PLATFORM TABBED SHOWCASE
   ========================================================================== */
var PlatformModule = {
	init: function () {
		var $tabs = $('.tab-btn');
		var $panels = $('.tab-panel');

		$tabs.on('click', function () {
			var targetTab = $(this).data('tab');

			$tabs.removeClass('active');
			$(this).addClass('active');

			$panels.removeClass('active');
			var $targetPanel = $('#tab-' + targetTab);

			$targetPanel.addClass('active');

			// GSAP Entrance
			gsap.fromTo(
				$targetPanel.find('.panel-mockup'),
				{ y: 24, opacity: 0 },
				{ y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
			);
			gsap.fromTo(
				$targetPanel.find('.panel-info'),
				{ x: 20, opacity: 0 },
				{ x: 0, opacity: 1, duration: 0.5, delay: 0.1, ease: 'power2.out' }
			);
		});
	},
};

/* ==========================================================================
   MODULE 6: FAQ ACCORDION WITH IMAGE SYNC
   ========================================================================== */
var FaqModule = {
	images: [
		'https://heronaiapp.com/cdn.prod.website-files.com/6a4b5161f0d11f1602cc3bbf/6a4b5161f0d11f1602cc3c5e_Dimensions.png',
		'https://heronaiapp.com/cdn.prod.website-files.com/6a4b5161f0d11f1602cc3bbf/6a4b5161f0d11f1602cc3c77_kk.png',
		'https://heronaiapp.com/cdn.prod.website-files.com/6a4b5161f0d11f1602cc3bbf/6a4b5161f0d11f1602cc3c84_fff.png',
	],

	init: function () {
		var self = this;
		var $items = $('.faq-item');
		var $img = $('#specImage');

		$items.on('click', function () {
			var index = $(this).data('faq');

			if ($(this).hasClass('active')) {
				$(this).removeClass('active');
				$(this).find('.faq-icon').text('+');
			} else {
				$items.removeClass('active');
				$items.find('.faq-icon').text('+');

				$(this).addClass('active');
				$(this).find('.faq-icon').text('-');

				// Crossfade spec image
				if ($img.length && self.images[index]) {
					gsap.to($img, {
						opacity: 0,
						scale: 0.96,
						duration: 0.2,
						onComplete: function () {
							$img.attr('src', self.images[index]);
							gsap.to($img, {
								opacity: 1,
								scale: 1,
								duration: 0.35,
								ease: 'power2.out',
							});
						},
					});
				}
			}
		});
	},
};

/* ==========================================================================
   MODULE 7: PROBLEM CARDS HOVER STACK
   ========================================================================== */
var ProblemModule = {
	init: function () {
		var $cards = $('.problem-card');
		$cards.on('mouseenter', function () {
			$cards.removeClass('active');
			$(this).addClass('active');
		});
	},
};

/* ==========================================================================
   MODULE 8: LIL-GUI INTERACTIVE TUNING PANEL
   ========================================================================== */
var GuiModule = {
	gui: null,

	init: function () {
		if (typeof lil === 'undefined' || !lil.GUI) return;

		this.gui = new lil.GUI({ title: 'Heron AI Motion Controller' });

		// 1. Hero Controls
		var heroFolder = this.gui.addFolder('Hero & Blueprint');
		heroFolder.add(CONFIG.hero, 'crosshairActive').name('Track Mouse Guides');
		heroFolder
			.add(CONFIG.hero, 'violationPulse')
			.name('Pulse Violations')
			.onChange(function (val) {
				if (val) {
					$('.pulsing-dot').css('animation-play-state', 'running');
				} else {
					$('.pulsing-dot').css('animation-play-state', 'paused');
				}
			});
		heroFolder
			.add(CONFIG.hero, 'showProjectionLines')
			.name('Projection Lines')
			.onChange(function (val) {
				$('.proj-line').toggle(val);
			});

		// 2. Ink Mask Controls
		var inkFolder = this.gui.addFolder('Organic Ink Mask');
		inkFolder
			.add(CONFIG.inkMask, 'displacementScale', 20, 250, 5)
			.name('Filter Distortion')
			.onChange(function () {
				InkMaskModule.updateFilter();
			});
		inkFolder
			.add(CONFIG.inkMask, 'baseFrequencyX', 0.01, 0.2, 0.005)
			.name('Turbulence X')
			.onChange(function () {
				InkMaskModule.updateFilter();
			});

		// 3. Marquee Speed
		var motionFolder = this.gui.addFolder('Marquee & Timing');
		motionFolder
			.add(CONFIG.marquee, 'speed', 6, 60, 1)
			.name('CAD Marquee (s)')
			.onChange(function (val) {
				$('.marquee-content').css('animation-duration', val + 's');
			});
		motionFolder
			.add(CONFIG.cursor, 'lerp', 0.05, 0.5, 0.01)
			.name('Cursor Smoothness');

		// 4. Developer Tools
		var devFolder = this.gui.addFolder('Developer / Dev');
		devFolder
			.add(CONFIG.dev, 'wireframeMode')
			.name('Inspect Grid')
			.onChange(function (val) {
				$('section, .home-hero-frame, .problem-card').css(
					'outline',
					val ? '1px dashed red' : 'none'
				);
			});
		devFolder.add(CONFIG.dev, 'exportConfig').name('Export Config (Console)');

		// Close folders by default on mobile
		if (window.innerWidth < 768) {
			this.gui.close();
		}
	},
};

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
$(document).ready(function () {
	// Initialize smooth scroll if Lenis is available
	if (typeof Lenis !== 'undefined') {
		var lenis = new Lenis({
			duration: 1.1,
			easing: function (t) {
				return Math.min(1, 1.001 - Math.pow(2, -10 * t));
			},
			smoothWheel: true,
			smoothTouch: false,
			wheelMultiplier: 1.0,
			touchMultiplier: 1.5,
		});

		if (window.ScrollTrigger) {
			lenis.on('scroll', ScrollTrigger.update);
			gsap.ticker.add(function (time) {
				lenis.raf(time * 1000);
			});
			gsap.ticker.lagSmoothing(0);
		} else {
			function raf(time) {
				lenis.raf(time);
				requestAnimationFrame(raf);
			}
			requestAnimationFrame(raf);
		}
	}

	// Initialize all modules
	CursorModule.init();
	HeroModule.init();
	InkMaskModule.init();
	TypographyModule.init();
	PlatformModule.init();
	FaqModule.init();
	ProblemModule.init();
	GuiModule.init();
});
