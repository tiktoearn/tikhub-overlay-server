window.TextEffects = (function() {
    'use strict';

    const CONFIG = {
        WAVE_DELAY_MULTIPLIER: 0.1,
        GLOW_SHADOWS: {
            rainbow: 'drop-shadow(0 0 2px {color}) drop-shadow(0 0 4px {color})',
            aurora: 'drop-shadow(0 0 3px {color})',
            standard: '0 0 2px {color}, 0 0 4px {color}'
        },
        DEFAULT_COLORS: {
            glow: '#ffffff',
            text: '#ffffff'
        }
    };

    const EFFECTS = {
        NONE: 'none',
        RAINBOW: 'rainbow',
        AURORA: 'aurora',
        WAVY: 'wavy'
    };

    function applyEffect(element, effectType, options = {}) {
        const $el = $(element);

        if (!$el.length) {
            console.warn('TextEffects: Element not found');
            return;
        }

        removeAllEffects($el);

        switch (effectType) {
            case EFFECTS.NONE:
                if (options.glow) {
                    $el.addClass('text-effect');
                }
                break;

            case EFFECTS.RAINBOW:
                $el.addClass('text-effect text-effect--rainbow');
                break;

            case EFFECTS.AURORA:
                $el.addClass('text-effect text-effect--aurora');
                break;

            case EFFECTS.WAVY:
                const speed = options.speed || 'normal';
                const wavyClass = speed === 'normal' ? 'text-effect--wavy' : `text-effect--wavy-${speed}`;
                $el.addClass(`text-effect ${wavyClass}`);
                applyWavyEffect($el);
                break;

            default:
                console.warn('TextEffects: Unknown effect type:', effectType);
        }

        if (options.glow) {
            $el.addClass('text-effect--glow-enhanced');
        }
    }

    function removeAllEffects(element) {
        const $el = $(element);

        $el.removeClass([
            'text-effect',
            'text-effect--rainbow',
            'text-effect--aurora',
            'text-effect--glow-enhanced',
            'text-effect--wavy',
            'text-effect--wavy-slow',
            'text-effect--wavy-fast'
        ].join(' '));

        if ($el.find('.wave-char').length > 0) {
            const originalText = $el.find('.wave-char').map(function() {
                return $(this).text();
            }).get().join('');
            $el.text(originalText);
        }
    }

    function applyWavyEffect($el) {
        const text = $el.text();
        const chars = text.split('');

        $el.empty();

        chars.forEach((char, index) => {
            const $char = $('<span>')
                .addClass('wave-char')
                .text(char === ' ' ? '\u00A0' : char) // Non-breaking space for spaces
                .css('--char-delay', (index * CONFIG.WAVE_DELAY_MULTIPLIER) + 's');

            $el.append($char);
        });
    }

    function createWaveChars($element, additionalClass = '') {
        if (!$element || !$element.length) {
            console.warn('TextEffects: createWaveChars called with invalid element');
            return;
        }

        const text = $element.text();
        if (!text) return;

        const chars = text.split('');
        $element.empty();

        chars.forEach((char, index) => {
            const $char = $('<span>')
                .addClass('wave-char' + (additionalClass ? ' ' + additionalClass : ''))
                .text(char === ' ' ? '\u00A0' : char)
                .css('--char-delay', (index * CONFIG.WAVE_DELAY_MULTIPLIER) + 's');
            $element.append($char);
        });
    }

    function applyToWaveChars($element, styles) {
        if (!$element || !$element.length) return;
        $element.find('.wave-char').css(styles);
    }

    function createSettingsUI(config) {
        const { prefix, target, onChange } = config;
        const settingsId = prefix + target + 'Effect';
        const glowId = prefix + target + 'Glow';

        const $container = $('<div>').addClass('text-effect-settings');

        const $effectGroup = $('<div>').addClass('settings-item');
        $effectGroup.append($('<label>').attr('for', settingsId).text(getLabel(target + 'Effect')));

        const $effectSelect = $('<select>').attr('id', settingsId);
        $effectSelect.append($('<option>').val(EFFECTS.NONE).text(getLabel('effectNone')));
        $effectSelect.append($('<option>').val(EFFECTS.RAINBOW).text(getLabel('effectRainbow')));
        $effectSelect.append($('<option>').val(EFFECTS.AURORA).text(getLabel('effectAurora')));
        $effectSelect.append($('<option>').val(EFFECTS.WAVY).text(getLabel('effectWavy')));

        $effectGroup.append($effectSelect);
        $container.append($effectGroup);

        const $glowGroup = $('<div>').addClass('settings-item glow-setting').hide();
        $glowGroup.append($('<label>').attr('for', glowId).text(getLabel('glow')));
        $glowGroup.append($('<input>').attr({
            type: 'checkbox',
            id: glowId
        }));
        $container.append($glowGroup);

        $effectSelect.on('change', function() {
            const selectedEffect = $(this).val();

            $glowGroup.show();

            if (onChange) {
                onChange({
                    effect: selectedEffect,
                    glow: $glowGroup.find('input').is(':checked')
                });
            }
        });

        $glowGroup.find('input').on('change', function() {
            if (onChange) {
                onChange({
                    effect: $effectSelect.val(),
                    glow: $(this).is(':checked')
                });
            }
        });

        return $container;
    }

    function getLabel(key) {
        const labels = {
            titleEffect: 'Title Text Effect',
            usernameEffect: 'Username Text Effect',
            effectNone: 'None',
            effectRainbow: 'Rainbow',
            effectAurora: 'The Aurora',
            effectNeonGlow: 'Neon Glow',
            effectWavy: 'Wavy Text',
            glow: 'Glow'
        };

        return labels[key] || key;
    }

    function initFromSettings(config) {
        const { prefix, titleElement, usernameElement, settings } = config;

        if (titleElement && titleElement.length) {
            const titleEffect = settings[prefix + 'titleEffect'] || EFFECTS.NONE;
            const titleGlow = settings[prefix + 'titleGlow'] || false;

            applyEffect(titleElement, titleEffect, {
                glow: titleGlow
            });
        }

        if (usernameElement && usernameElement.length) {
            const usernameEffect = settings[prefix + 'usernameEffect'] || EFFECTS.NONE;
            const usernameGlow = settings[prefix + 'usernameGlow'] || false;

            applyEffect(usernameElement, usernameEffect, {
                glow: usernameGlow
            });
        }
    }

    function clearAllEffects($element) {
        if (!$element || !$element.length) return;

        const originalText = $element.text();
        $element.removeClass([
            'text-effect--rainbow',
            'text-effect--aurora',
            'text-effect--neon-glow',
            'text-effect--wavy',
            'text-effect--wavy-slow',
            'text-effect--wavy-fast',
            'text-effect--glow-enhanced'
        ].join(' '));

        $element.css({
            background: '',
            'background-size': '',
            'background-clip': '',
            '-webkit-background-clip': '',
            '-webkit-text-fill-color': '',
            animation: '',
            'text-shadow': '',
            filter: '',
            color: ''
        });

        $element.empty().text(originalText);
    }

    function applyComprehensiveEffects($username, options = {}) {
        if (!$username || !$username.length) {
            console.warn('TextEffects: applyComprehensiveEffects called with invalid element');
            return;
        }

        clearAllEffects($username);

        const {
            effect = 'none',
            wave = false,
            waveSpeed = 'normal',
            glow = false,
            glowColor = CONFIG.DEFAULT_COLORS.glow,
            defaultColor = CONFIG.DEFAULT_COLORS.text,
            isRgbColor = false,
            rgbColor = null
        } = options;

        const normalizedEffect = (!effect || effect === '' || effect === 'Auswählen' || effect === null || effect === undefined) ? 'none' : effect;


        if (normalizedEffect === 'rainbow' && wave) {
            applyEffect($username, normalizedEffect, { glow: false });

            const speed = waveSpeed || 'normal';
            const wavyClass = speed === 'normal' ? 'text-effect--wavy' : `text-effect--wavy-${speed}`;
            $username.addClass(wavyClass);

            createWaveChars($username, 'rainbow-wave-char');

            if (glow) {
                $username.addClass('text-effect--glow-enhanced');
                $username.css('filter', CONFIG.GLOW_SHADOWS.rainbow.replace(/{color}/g, glowColor));
            }
        } else {
            if (normalizedEffect !== 'none') {
                applyEffect($username, normalizedEffect, { glow });

                if (glow && normalizedEffect === 'aurora') {
                    $username.css('filter', CONFIG.GLOW_SHADOWS.aurora.replace(/{color}/g, glowColor));
                }
            }

            if (wave) {
                const speed = waveSpeed || 'normal';
                const wavyClass = speed === 'normal' ? 'text-effect--wavy' : `text-effect--wavy-${speed}`;
                $username.addClass(wavyClass);

                createWaveChars($username);

                if (glow && normalizedEffect !== 'rainbow' && normalizedEffect !== 'aurora') {
                    applyToWaveChars($username, { 'text-shadow': CONFIG.GLOW_SHADOWS.standard.replace(/{color}/g, glowColor) });
                }
            }
        }

        if (glow) {
            $username.addClass('text-effect--glow-enhanced');
            if (normalizedEffect === 'none') {
                const shadowValue = CONFIG.GLOW_SHADOWS.standard.replace(/{color}/g, glowColor);
                if (wave) {
                    applyToWaveChars($username, { 'text-shadow': shadowValue });
                } else {
                    $username.css('text-shadow', shadowValue);
                }
            }
        }

        if (isRgbColor && rgbColor) {
            if ($username.find('.wave-char').length > 0) {
                applyToWaveChars($username, { color: rgbColor });
            } else {
                $username.css('color', rgbColor);
            }
        } else {
            const hasTextEffect = $username.hasClass('text-effect--rainbow') ||
                                $username.hasClass('text-effect--aurora') ||
                                $username.hasClass('text-effect--neon-glow');

            if (!hasTextEffect && normalizedEffect === 'none' && defaultColor) {
                if ($username.find('.wave-char').length > 0) {
                    applyToWaveChars($username, { color: defaultColor });
                } else {
                    $username.css('color', defaultColor);
                }
            }
        }
    }

    return {
        EFFECTS,
        applyEffect,
        removeAllEffects,
        clearAllEffects,
        createSettingsUI,
        initFromSettings,
        getLabel,
        applyComprehensiveEffects
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.TextEffects;
}