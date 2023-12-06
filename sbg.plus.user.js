// ==UserScript==
// @name           SBG plus
// @namespace      sbg
// @version        0.9.54
// @updateURL      https://anmiles.net/userscripts/sbg.plus.user.js
// @downloadURL    https://anmiles.net/userscripts/sbg.plus.user.js
// @description    Extended functionality for SBG
// @description:ru Расширенная функциональность для SBG
// @author         Anatoliy Oblaukhov
// @match          https://sbg-game.ru/app/*
// @run-at         document-start
// @grant          none
// ==/UserScript==
window.__sbg_plus_version = '0.9.54';
(function () {
    class EventWatcher {
        constructor(eventTypes) {
            this.init(eventTypes);
            this.watch();
        }
        init(eventTypes) {
            this.eventTypes = eventTypes;
            this.listeners = {};
            this.events = {};
            this.eventTypes.map((eventType) => {
                this.events[eventType] = [];
                this.listeners[eventType] = [];
            });
        }
        filter(listeners, _filterData) {
            return listeners;
        }
        trigger(listeners, { eventData, eventOptions }) {
            this.filter(listeners, { eventOptions }).map((listener) => {
                if (!listener.enabled) {
                    return;
                }
                if (listener.listenerOptions.once) {
                    listener.enabled = false;
                }
                listener.handler(eventData);
            });
        }
        emit(eventType, eventData, eventOptions) {
            this.trigger(this.listeners[eventType], { eventData, eventOptions });
            this.events[eventType].push({ eventData, eventOptions });
            return this;
        }
        on(eventType, handler, listenerOptions) {
            const listener = { handler, listenerOptions, enabled: true };
            this.listeners[eventType].push(listener);
            if (listenerOptions.previous) {
                this.events[eventType].map(({ eventData, eventOptions }) => {
                    this.trigger([listener], { eventData, eventOptions });
                });
            }
            return this;
        }
        off(eventType, eventOptions) {
            this.filter(this.listeners[eventType], { eventOptions }).map((listener) => {
                listener.enabled = false;
            });
            return this;
        }
    }
    const consoleWatcherEventTypes = ['log', 'warn', 'error', 'info', 'debug', 'trace'];
    class ConsoleWatcher extends EventWatcher {
        constructor() {
            super(consoleWatcherEventTypes);
        }
        watch() {
            consoleWatcherEventTypes.map((eventType) => {
                ((originalMethod, originalError) => {
                    console[eventType] = (...args) => {
                        const isError = eventType === 'error' || args.filter((arg) => arg instanceof Error).length > 0;
                        const lines = args.map((arg) => arg instanceof Error ? [arg.message, arg.stack].join('\n') : arg.toString());
                        const result = (isError ? originalError : originalMethod).call(console, ...args);
                        this.emit(isError ? 'error' : eventType, { message: lines.map((line) => line.trim()).join('\n') }, {});
                        return result;
                    };
                })(console[eventType], console.error);
            });
        }
    }
    const consoleWatcher = new ConsoleWatcher();
    const logs = [];
    const logParts = ['time', 'eventType', 'message'];
    const logBuilder = {
        time: {
            enabled: false,
            format: () => getLogDate(),
        },
        eventType: {
            enabled: false,
            format: (eventType, _message) => eventType === 'error' ? 'ERROR' : eventType,
        },
        message: {
            enabled: true,
            format: (_eventType, message) => message,
        },
    };
    function getLogDate() {
        const date = new Date();
        const time = [date.getHours(), date.getMinutes(), date.getSeconds()].map((value) => value.toString().padStart(2, '0')).join('.');
        return `${time}:${date.getMilliseconds()}`;
    }
    consoleWatcherEventTypes.map((eventType) => {
        consoleWatcher.on(eventType, ({ message }) => {
            const parts = logParts.filter((logPart) => logBuilder[logPart].enabled).map((logPart) => logBuilder[logPart].format(eventType, message));
            logs.push(parts.join(' '));
        }, {});
    });
    const stringifyModes = ['json', 'keys', 'string'];
    function stringify(obj, mode) {
        if (obj === null || obj === undefined) {
            return typeof obj;
        }
        switch (mode) {
            case 'json':
                return JSON.stringify(obj);
            case 'keys':
                return `[${Object.keys(obj).join(', ')}]`;
            case 'string':
                return obj.toString();
            default:
                return `unknown mode '${mode}', expected one of [${stringifyModes.join(', ')}]`;
        }
    }
    window.__sbg_debug_object = (message, obj, mode = 'json') => {
        var _a;
        const stack = (_a = new Error().stack) === null || _a === void 0 ? void 0 : _a.replace(/^Error/, '');
        for (const key in obj) {
            console.debug(`${message}: ${key} = ${stringify(obj[key], mode)}`);
            console.debug(stack);
        }
    };
    window.__sbg_onerror_handlers = [];
    window.__sbg_onerror_handlers.push((event, _source, lineno, colno, error) => {
        console.error(`${event} on ${lineno}:${colno}`, error);
    });
    window.onerror = function (event, source, lineno, colno, error) {
        window.__sbg_onerror_handlers.map((handler) => handler(event, source, lineno, colno, error));
        return true;
    };
    console.log(`SBG plus, version ${window.__sbg_plus_version}`);
    console.log(`started at ${new Date().toISOString()}`);
    console.log(`userAgent: ${navigator.userAgent}`);
    const builderButtons = ['home', 'allLines', 'builder', 'undo', 'clear', 'route', 'copy', 'paste', 'help'];
    class Label {
        constructor(values) {
            this.values = values;
        }
        format(data) {
            const formattedLabel = new Label(this.values);
            Object.entries(formattedLabel.values).forEach(([lng, value]) => {
                formattedLabel.values[lng] = value.replace(/\$\{(.+?)\}/g, (_, key) => data[key]);
            });
            return formattedLabel;
        }
        toString() {
            return this.values[window.__sbg_language];
        }
    }
    const labels = {
        save: new Label({
            ru: 'Сохранить',
            en: 'Save',
        }),
        close: new Label({
            ru: 'Закрыть',
            en: 'Close',
        }),
        ymaps: new Label({
            ru: 'Яндекс Карты',
            en: 'Yandex Maps',
        }),
        settings: {
            title: new Label({
                ru: 'Настройки скриптов',
                en: 'Scripts settings',
            }),
            button: new Label({
                ru: 'Настройки',
                en: 'Settings',
            }),
            version: new Label({
                ru: 'Версия SBG+',
                en: 'SBG+ Version',
            }),
            logs: new Label({
                ru: 'Логи',
                en: 'Logs',
            }),
            advanced: new Label({
                ru: 'Все настройки',
                en: 'All settings',
            }),
        },
        toasts: {
            back: new Label({
                ru: 'Нажмите кнопку "Назад" ещё раз\nдля выхода из игры',
                en: 'Press "Back" button again to exit the game',
            }),
            logs: new Label({
                ru: 'Логи скопированы в буфер обмена',
                en: 'Logs has been copied into the clipboard',
            }),
            cuiUpdated: new Label({
                ru: 'Скрипт Николая обновлён до версии ${currentVersion}',
                en: 'Nicko script has been updated to ${currentVersion}',
            }),
        },
        builder: {
            buttons: {
                home: {
                    title: new Label({
                        ru: 'Я здесь',
                        en: 'Set home',
                    }),
                    description: new Label({
                        ru: 'устанавливает "домашнее местоположение", с которого игра всегда будет открываться в этом браузере',
                        en: 'sets "home location", which game will always start with in this browser',
                    }),
                },
                allLines: {
                    title: new Label({
                        ru: 'Все линии',
                        en: 'All lines',
                    }),
                    description: new Label({
                        ru: 'включает/отключает показ реально существующих линий и регионов',
                        en: 'toggles currently existing lines and regions',
                    }),
                },
                builder: {
                    title: new Label({
                        ru: 'Конструктор',
                        en: 'Builder',
                    }),
                    description: new Label({
                        ru: 'включает/отключает режим конструктора: нажатие на точку начинает новую линию, нажатие на другую точку - заканчивает линию',
                        en: 'toggles builder mode: click first point to start new line, click another point to finish the line',
                    }),
                },
                undo: {
                    title: new Label({
                        ru: 'Отменить',
                        en: 'Undo',
                    }),
                    description: new Label({
                        ru: 'стирает последнюю построенную линию/регион',
                        en: 'removes last built line/region',
                    }),
                },
                clear: {
                    title: new Label({
                        ru: 'Отменить всё',
                        en: 'Clear',
                    }),
                    description: new Label({
                        ru: 'стирает все построенные линии и регионы',
                        en: 'removes all build lines and regions',
                    }),
                },
                route: {
                    title: new Label({
                        ru: 'Маршрут',
                        en: 'Print route',
                    }),
                    description: new Label({
                        ru: 'показывает все построенные линии, в виде списка в порядке постройки',
                        en: 'shows all built lines as a list in the order of building',
                    }),
                },
                copy: {
                    title: new Label({
                        ru: 'Копировать',
                        en: 'Copy',
                    }),
                    description: new Label({
                        ru: '(Ctrl-C) копирует все построенные линии в буфер обмена',
                        en: '(Ctrl-C) copies all built lines into the clipboard',
                    }),
                },
                paste: {
                    title: new Label({
                        ru: 'Вставить',
                        en: 'Paste',
                    }),
                    description: new Label({
                        ru: '(Ctrl-V) вставляет ранее построенные линии из буфера обмена',
                        en: '(Ctrl-V) pastes previously built lines from the clipboard',
                    }),
                },
                help: {
                    title: new Label({
                        ru: 'Помощь',
                        en: 'Help',
                    }),
                    description: new Label({
                        ru: 'показывает инструкции',
                        en: 'shows instructions',
                    }),
                },
            },
            messages: {
                setHome: new Label({
                    ru: 'Всегда открывать SBG на текущем местоположении?',
                    en: 'Always open SBG using currently opened location?',
                }),
                deleteHome: new Label({
                    ru: 'Забыть "домашнее местоположение" SBG?',
                    en: 'Forget "home location"?',
                }),
                copied: new Label({
                    ru: 'Данные скопированы в буфер обмена',
                    en: 'Data has been copied into the clipboard',
                }),
            },
            issues: {
                title: new Label({
                    ru: 'Известные ограничения и проблемы',
                    en: 'Known limitations and problems',
                }),
                list: [
                    new Label({
                        ru: 'Не всегда рисуется линия, потому что если при нажатии мышкой сдвинуть карту хоть на миллиметр - карта думает, что её двигают, а не кликают, и никак не реагирует',
                        en: 'Lines are not always being drawn, because clicking mouse button when moving map even one pixel ahead will make the map treat this click as a moving action and do not react as expected',
                    }),
                    new Label({
                        ru: 'Если два раза нажать на точку - она остаётся оранжевой, даже если закончить линию',
                        en: 'Point leaves orange when clicking twice, even when line has been finished',
                    }),
                    new Label({
                        ru: 'Если нажать на точку, а потом подвинуть карту - она перестаёт быть оранжевой',
                        en: 'Orange point stops to be orange if move map',
                    }),
                ],
            },
            help: {
                title: new Label({
                    ru: 'Конструктор',
                    en: 'Builder',
                }),
                buttons: new Label({
                    ru: 'Кнопки',
                    en: 'Buttons',
                }),
            },
            validationErrors: {
                json: new Label({
                    ru: 'Текст должен быть валидным JSON-объектом',
                    en: 'Text should be a valid JSON object',
                }),
                empty: new Label({
                    ru: 'Ничего нет',
                    en: 'Nothing found',
                }),
                object: new Label({
                    ru: 'Данные должны быть объектом',
                    en: 'Data should be an object',
                }),
                objectProperties: new Label({
                    ru: "Объект с данными должен содержать два объекта: 'points' и 'lines'",
                    en: "Data object should contain two objects: 'points' and 'lines'",
                }),
                pointProperties: new Label({
                    ru: "Каждый объект в 'points' должен содержать поля: 'guid' (string), 'title' (string) и 'coords' (object)",
                    en: "Each object in 'points' should contain properties: 'guid' (string), 'title' (string) and 'coords' (object)",
                }),
                pointCoords: new Label({
                    ru: "Каждый объект в 'points' должен содержать массив 'coords', из двух координат типа (number)",
                    en: "Each object in 'points' should contain array 'coords' of two coordinates of type (number)",
                }),
                lines: new Label({
                    ru: "Массив 'lines' должен состоять из массивов координат линий",
                    en: "Array 'lines' should contain arrays of line coordinates",
                }),
                linesCoords: new Label({
                    ru: "Каждый массив в 'lines' должен состоять из двух массивов координат точек",
                    en: "Each array in 'lines' should contain two arrays of point coordinates",
                }),
            },
        },
    };
    console.log('created labels');
    class Settings {
        constructor() {
            this.storageKey = 'sbg-plus-settings';
            try {
                const str = localStorage[this.storageKey];
                const json = JSON.parse(str);
                this.features = json.features;
            }
            catch {
                this.features = {};
            }
        }
        getFeature(featureKey) {
            return this.features[featureKey];
        }
        setFeature(featureKey, value) {
            this.features[featureKey] = value;
            return this;
        }
        cleanupFeatures() {
            const featureKeys = Object.keys(features.keys);
            Object.keys(this.features)
                .filter((key) => !featureKeys.includes(key))
                .forEach((key) => delete this.features[key]);
        }
        save() {
            const json = {};
            json.features = this.features;
            const str = JSON.stringify(json);
            localStorage[this.storageKey] = str;
        }
    }
    const settings = new Settings();
    console.log('created settings');
    const featureGroups = {
        scripts: { ru: 'Скрипты', en: 'Scripts' },
        base: { ru: 'Основные настройки', en: 'Basic settings' },
        cui: { ru: 'Скрипт Николая', en: 'Nicko script' },
        eui: { ru: 'Скрипт Егора', en: 'Egor script' },
        windows: { ru: 'Окна', en: 'Windows' },
        animations: { ru: 'Анимации', en: 'Animations' },
        toolbar: { ru: 'Боковая панель', en: 'Toolbar' },
        fire: { ru: 'Атака', en: 'Fire' },
        inventory: { ru: 'Инвентарь', en: 'Inventory' },
        leaderboard: { ru: 'Лидеры', en: 'Leaderboard' },
        info: { ru: 'Информация о точке', en: 'Point info' },
        draw: { ru: 'Рисование', en: 'Draw' },
        other: { ru: 'Прочие настройки', en: 'Other settings' },
        custom: { ru: 'Мои настройки', en: 'My settings' },
    };
    const featureTriggers = ['', 'pageLoad', 'cuiTransform', 'mapReady', 'fireClick'];
    class AnyFeatureBase {
        constructor(key, labelValues, options) {
            this.toggleValue = false;
            this.key = key;
            this.label = new Label(labelValues);
            this.group = options.group;
            this.trigger = options.trigger;
            this.public = options.public || false;
            this.simple = options.simple || false;
            this.desktop = options.desktop || false;
            this.unchecked = options.unchecked || false;
            features.add(this);
        }
        isEnabled() {
            var _a;
            return (_a = this.isExplicitlyEnabled()) !== null && _a !== void 0 ? _a : this.isImplicitlyEnabled();
        }
        isExplicitlyEnabled() {
            return settings.getFeature(this.key);
        }
        isImplicitlyEnabled() {
            return this.isAvailable() && this.isIncluded(this.getPreset()) && !this.unchecked;
        }
        isAvailable() {
            return (isMobile() || this.desktop) && (this.public || this.getPreset() === 'full' || localStorage['sbg-plus-test-mode']);
        }
        isSimple() {
            return this.simple;
        }
        toggle(value = !this.toggleValue) {
            const attributeKey = `data-feat-${this.key}`;
            this.toggleValue = value;
            if (value) {
                document.body.setAttribute(attributeKey, '');
            }
            else {
                document.body.removeAttribute(attributeKey);
            }
            return value;
        }
        isIncluded(presetName) {
            const preset = presets[presetName] || presets['base'];
            return preset.length === 0 || preset.includes(this);
        }
        getPreset() {
            return window.__sbg_preset;
        }
    }
    class FeatureBase extends AnyFeatureBase {
        constructor(func, labelValues, options) {
            super(func.name, labelValues, options);
        }
        setEnabled(value) {
            settings.setFeature(this.key, value);
            if (this.parent) {
                const uncheckedChildren = this.parent.children.filter((feature) => !feature.isEnabled());
                features.check({ feature: this.parent, value: uncheckedChildren.length === 0 });
            }
        }
        exec(argument) {
            if (!this.isEnabled()) {
                console.log(`skipped ${this.func.name}`);
                return argument;
            }
            try {
                const data = this.getData(argument);
                const result = this.func(data);
                this.toggle(true);
                console.log(`executed ${this.func.name}`);
                return result;
            }
            catch (ex) {
                console.error(`failed ${this.func.name}`, ex);
                return argument;
            }
        }
    }
    class ParentFeature extends AnyFeatureBase {
        constructor(key, labelValues, options) {
            super(key, labelValues, options);
            this.children = [];
            options.children.forEach((feature) => {
                if (feature.key === this.key) {
                    return;
                }
                this.children.push(feature);
                if (feature instanceof FeatureBase) {
                    feature.parent = this;
                }
            });
            this.propagate();
        }
        setEnabled(value) {
            settings.setFeature(this.key, value);
            this.propagate();
        }
        isEnabled() {
            var _a;
            return (_a = this.isExplicitlyEnabled()) !== null && _a !== void 0 ? _a : this.isImplicitlyEnabled();
        }
        propagate() {
            const value = settings.getFeature(this.key);
            if (value !== undefined) {
                this.children.map((feature) => features.check({ feature, value }));
            }
        }
    }
    class Feature extends FeatureBase {
        constructor(func, labelValues, options) {
            super(func, labelValues, options);
            this.func = func;
            this.requires = options.requires;
        }
        getData() {
            if (this.requires) {
                const data = this.requires();
                if (!data || typeof data === 'object' && 'length' in data && data.length === 0) {
                    throw 'requirement not met';
                }
                return data;
            }
            return undefined;
        }
    }
    window.Feature = Feature;
    class Transformer extends FeatureBase {
        constructor(func, labelValues, options) {
            super(func, labelValues, options);
            this.func = func;
        }
        getData(arg) {
            return arg;
        }
    }
    const featuresEventTypes = [
        'add',
        'check',
    ];
    class Features extends EventWatcher {
        constructor() {
            super(featuresEventTypes);
            this.keys = {};
            this.groups = {};
            this.triggers = {};
            Object.keys(featureGroups).map((key) => this.groups[key] = []);
            featureTriggers.map((key) => this.triggers[key] = []);
        }
        watch() {
        }
        add(feature) {
            this.keys[feature.key] = feature;
            this.groups[feature.group].push(feature);
            this.triggers[feature.trigger].push(feature);
            this.emit('add', feature, {});
        }
        check({ feature, value }) {
            this.emit('check', { feature, value }, {});
        }
        get(func) {
            return this.keys[func.name];
        }
    }
    const features = new Features();
    let group = 'base';
    group = 'scripts';
    new Feature(loadCUI, { ru: 'Скрипт Николая', en: 'Nicko script' }, { public: true, simple: true, group, trigger: '' });
    new Feature(loadEUI, { ru: 'Скрипт Егора', en: 'Egor script' }, { public: true, simple: true, group, trigger: 'mapReady', desktop: true });
    new Feature(showBuilderPanel, { ru: 'Конструктор (draw tools)', en: 'Builder (draw tools)' }, { public: true, simple: true, group, trigger: 'mapReady', desktop: true });
    new Feature(showFeatureToggles, { ru: 'Показать кнопки для быстрого переключения между фичами', en: 'Show buttons for quick toggling features' }, { group, trigger: 'mapReady' });
    group = 'base';
    new Feature(enableBackButton, { ru: 'Разрешить кнопку Back', en: 'Enable back button' }, { public: true, group, trigger: 'mapReady' });
    new Feature(updateLangCacheAutomatically, { ru: 'Автоматически обновлять кэш языка', en: 'Update language cache automatically' }, { public: true, group, trigger: 'mapReady', desktop: true });
    new Feature(fixBlurryBackground, { ru: 'Размывать фон за полупрозрачными окнами', en: 'Fix blurry background in popups' }, { public: true, group, trigger: 'mapReady', desktop: true });
    new Feature(alignSettingsButtonsVertically, { ru: 'Выровнять кнопки в настройках по ширине', en: 'Align settings buttons vertically' }, { public: true, group, trigger: 'mapReady', desktop: true, requires: () => $('.settings') });
    new Feature(fixCompass, { ru: 'Починить компас', en: 'Fix compass' }, { public: true, group, trigger: 'mapReady' });
    group = 'cui';
    new Transformer(disableClusters, { ru: 'Отключить ромашку', en: 'Disable clusters' }, { public: true, simple: true, group, trigger: 'cuiTransform' });
    new Transformer(disableAttackZoom, { ru: 'Отключить изменение зума при атаке', en: 'Disable changing zoom when attack' }, { public: true, simple: true, group, trigger: 'cuiTransform' });
    new Transformer(unlockCompassWhenRotateMap, { ru: 'Разблокировать компас при вращении карты', en: 'Unlock compass when rotate map' }, { public: true, group, trigger: 'cuiTransform' });
    new Transformer(alwaysClearInventory, { ru: 'Запускать авточистку инвентаря после каждого дискавера', en: 'Launch inventory cleanup after every discover' }, { public: true, group, trigger: 'cuiTransform', unchecked: true });
    new Transformer(waitClearInventory, { ru: 'Дожидаться получения предметов перед запуском авточистки', en: 'Wait for updating inventory before cleanup' }, { public: false, group, trigger: 'cuiTransform' });
    new Feature(fixSortButton, { ru: 'Исправить расположение кнопки сортировки', en: 'Fix sort button z-index' }, { public: true, group, trigger: 'mapReady', requires: () => $('.sbgcui_refs-sort-button') });
    new Feature(reportCUIUpdates, { ru: 'Сообщать об обновлениях скрипта', en: 'Report script updates' }, { public: true, group, trigger: 'mapReady', unchecked: true });
    group = 'eui';
    new Feature(centerIconsInGraphicalButtons, { ru: 'Центрировать значки графических кнопок', en: 'Center icons in graphical buttons' }, { public: true, group, trigger: 'mapReady' });
    new Feature(showReloadButtonInCompactMode, { ru: 'Показать кнопку перезагрузки в компактном режиме', en: 'Show reload button in compact mode' }, { public: true, group, trigger: 'mapReady' });
    group = 'windows';
    new Feature(hideCloseButton, { ru: 'Спрятать кнопку закрытия, закрывать только по нажатию Back', en: 'Hide close button, close only by pressing Back' }, { group, trigger: 'mapReady', requires: () => $('.popup-close, #inventory__close') });
    group = 'animations';
    new Feature(disableCarouselAnimation, { ru: 'Отключить анимацию карусели', en: 'Disable carousel animations' }, { public: true, group, trigger: 'pageLoad', requires: () => window.Splide });
    new Feature(disablePopupAnimation, { ru: 'Отключить анимацию открытия и закрытия окон', en: 'Disable open/close windows animation' }, { public: true, group, trigger: 'pageLoad', requires: () => $('.popup') });
    new Feature(disableMapAnimation, { ru: 'Отключить анимацию карты', en: 'Disable map animation' }, { public: true, group, trigger: 'pageLoad' });
    new Feature(disableAttackButtonAnimation, { ru: 'Отключить анимацию кнопки атаки', en: 'Disable attack button animation' }, { public: true, group, trigger: 'pageLoad', requires: () => $('#attack-menu') });
    new Feature(closeToastsAfter1sec, { ru: 'Закрывать всплывающие сообщения через 1 секунду', en: 'Close toasts after 1 second' }, { public: true, group, trigger: 'pageLoad', requires: () => window.Toastify });
    new ParentFeature('disableAllAnimations', { ru: 'Отключить все анимации', en: 'Disable all animations' }, { public: true, simple: true, group, trigger: 'pageLoad', children: features.groups['animations'] });
    group = 'toolbar';
    new Feature(showQuickAutoSelectButton, { ru: 'Показать кнопку для быстрого переключения автовыбора коров', en: 'Show button for quick change auto-select settings' }, { group, trigger: 'mapReady', requires: () => $('.sbgcui_toolbar') });
    new Feature(moveAllSidebarsRight, { ru: 'Показывать все боковые панели справа', en: 'Move all sidebars to the right' }, { group, trigger: 'mapReady', requires: () => $('.sbgcui_toolbar-control') });
    new Feature(hideCUIToolbarToggleButton, { ru: 'Скрыть кнопку закрытия панели скрипта Николая', en: 'Hide CUI toolbar toggle button' }, { public: true, group, trigger: 'mapReady', requires: () => $('.sbgcui_toolbar') });
    group = 'fire';
    new Feature(alwaysCenterAlignFireItemsCount, { ru: 'Всегда выравнивать количество предметов по центру', en: 'Always center align items count' }, { group, trigger: 'fireClick', requires: () => $('#attack-slider') });
    new Feature(replaceHighlevelWarningWithIcon, { ru: 'Заменить предупреждение про недостаточный уровень на значок поверх предмета', en: 'Replace highlevel warning with an icon on top of the item' }, { group, trigger: 'fireClick', requires: () => $('#attack-slider') });
    new Feature(joinFireButtons, { ru: 'Объединить кнопку атаки и кнопку открытия панели атаки, закрывать панель кликом снаружи', en: 'Join attack button and attack panel button, close panel by clicking outside' }, { group, trigger: 'fireClick', requires: () => $('#attack-menu') });
    group = 'inventory';
    new Feature(increaseItemsFont, { ru: 'Увеличить размер шрифта за счёт сокращения названий предметов', en: 'Increase font size by shortening item names' }, { group, trigger: 'mapReady', requires: () => $('.info.popup') });
    new Feature(showAutoDeleteSettingsButton, { ru: 'Показать кнопку перехода к настройкам авто-удаления', en: 'Show auto-delete settings button' }, { group, trigger: 'mapReady', requires: () => $('.inventory.popup') });
    new Feature(restoreCUISort, { ru: 'Заменить сортировку Егора на сортировку Николая', en: 'Replace Egor sort with Nicko sort' }, { public: true, simple: true, group, trigger: 'mapReady', unchecked: true, requires: () => $('.inventory__content') });
    new Feature(moveReferenceButtonsDown, { ru: 'Сдвинуть ниже кнопки направления сортировки и закрытия', en: 'Move down sort direction button and close button' }, { group, trigger: 'mapReady', requires: () => $('.inventory__content') });
    new Feature(hideManualClearButtons, { ru: 'Спрятать кнопки ручного удаления предметов', en: 'Hide manual clear buttons' }, { group, trigger: 'mapReady', requires: () => $('.inventory__content') });
    new Feature(quickRecycleAllRefs, { ru: 'Удалять все имеющиеся рефы от точки при нажатии кнопки удаления', en: 'Recycle all existing refs of the point by clicking recycle button' }, { group, trigger: 'mapReady', requires: () => $('.inventory__content') });
    group = 'leaderboard';
    new Feature(alwaysShowSelfStatistics, { ru: 'Всегда показывать собственную статистику', en: 'Always show self statistics' }, { group, trigger: 'mapReady', requires: () => window.__sbg_function_drawLeaderboard, desktop: true });
    group = 'info';
    new Feature(makeInfoPopupSemiTransparent, { ru: 'Сделать окно точки полупрозрачным', en: 'Make info popup semi-transparent' }, { group, trigger: 'mapReady', requires: () => $('.info.popup') });
    new Feature(alwaysShowSecondsForCoolDowns, { ru: 'Всегда показывать отсчёт в секундах для кулдауна', en: 'Always show seconds for cooldowns' }, { group, trigger: 'mapReady', requires: () => $('#discover') });
    new Feature(enlargeCoreSlots, { ru: 'Увеличить размер коров', en: 'Enlarge core slots' }, { group, trigger: 'mapReady', requires: () => $('.info.popup') });
    new Feature(alignCloseButtonVertically, { ru: 'Выровнять кнопку закрытия по вертикали', en: 'Align close button vertically' }, { group, trigger: 'mapReady', requires: () => $('.info.popup > .popup-close') });
    new Feature(colorizeTimer, { ru: 'Менять цвет таймера в зависимости от количества оставшихся дискаверов', en: 'Change color of timer depending on remaining discovers' }, { group, trigger: 'mapReady', requires: () => $('#discover') });
    new Feature(hideRepairButton, { ru: 'Спрятать кнопку зарядки', en: 'Hide repair button' }, { group, trigger: 'mapReady', requires: () => $('.info.popup') });
    new Feature(replaceSwipeWithButton, { ru: 'Показать кнопку для переключения между точками', en: 'Show button to swipe between points' }, { group, trigger: 'mapReady', requires: () => $('.sbgcui_swipe-cards-arrow') });
    group = 'draw';
    new Feature(selectTargetPointByClick, { ru: 'Разрешить выбирать конечную точку кликом по ней', en: 'Allow select target point by clicking it' }, { group, trigger: 'mapReady', requires: () => window.__sbg_function_showInfo });
    new Feature(highlightSelectedTargetPoint, { ru: 'Подсвечивать выбранную конечную точку', en: 'Highlight selected target point' }, { group, trigger: 'mapReady', requires: () => window.__sbg_variable_map });
    new Feature(matchDrawSliderButtons, { ru: 'Расположить кнопку рисования ровно под кнопкой карусели рисования', en: 'Place draw button exactly under draw carousel button' }, { group, trigger: 'mapReady', requires: () => $('.draw-slider-wrp') });
    group = 'other';
    new Feature(enableOldWebViewCompatibility, { ru: 'Включить совместимость со старыми webview', en: 'Enable old web view compatibility' }, { public: true, group, trigger: 'mapReady', unchecked: true, requires: () => $('.popup.pp-center') });
    settings.cleanupFeatures();
    const presets = {};
    presets['base'] = [
        ...features.groups.base,
    ];
    if (window.innerWidth >= 800) {
        presets['base'].push(features.get(showBuilderPanel));
    }
    presets['nicoscript'] = [
        ...presets['base'],
        ...features.groups.cui,
        features.get(loadCUI),
    ];
    presets['egorscript'] = [
        ...presets['base'],
        ...features.groups.eui,
        features.get(loadEUI),
    ];
    presets['allscripts'] = [
        ...presets['nicoscript'],
        ...presets['egorscript'],
        features.get(restoreCUISort),
    ];
    presets['full'] = [];
    console.log('created features');
    class Layers {
        constructor() {
            this.layers = {};
        }
        get(layerName) {
            return this.layers[layerName];
        }
        set(layerName, layer) {
            this.layers[layerName] = layer;
        }
    }
    const layers = new Layers();
    console.log('created layers');
    class Script {
        constructor(data) {
            this.data = data;
        }
        static async create({ src, prefix, transformer, data }) {
            var _a, _b;
            if (!data) {
                console.log('load script: started');
                data = await fetch(src).then((r) => r.text());
                console.log('load script: finished');
            }
            else {
                console.log('used build-in script');
            }
            const script = new Script(data);
            console.log(`before: ${((_a = script.data) === null || _a === void 0 ? void 0 : _a.length) || '0'} bytes`);
            const originalScriptName = `${prefix}_original`;
            const modifiedScriptName = `${prefix}_modified`;
            window[originalScriptName] = script.data || '';
            script.transform(transformer);
            window[modifiedScriptName] = script.data || '';
            console.log(`after: ${((_b = script.data) === null || _b === void 0 ? void 0 : _b.length) || '0'} bytes`);
            return script;
        }
        valueOf() {
            return this.data;
        }
        replace(searchValue, replacer) {
            this.data = Script.replaceData(this.data, searchValue, replacer);
            return this;
        }
        replaceAll(searchValue, replacement) {
            this.data = Script.replaceData(this.data, searchValue, replacement, { global: true });
            return this;
        }
        replaceCUIBlock(block, searchValue, replacer) {
            var _a;
            this.data = (_a = this.data) === null || _a === void 0 ? void 0 : _a.replace(new RegExp(`(\\/\\*\\s*${Script.regexEscape(block)}\\s*\\*\\/\n(\\s+)\\{\\s*\n\\s+)([\\s\\S]*?)(\n\\2\\})`), (_data, open, _, block, close) => open + Script.replaceData(block, searchValue, replacer) + close);
            return this;
        }
        removeCUIBlock(block) {
            return this.replaceCUIBlock(block, /[\s\S]+/, '');
        }
        static regexEscape(str) {
            return str.replace(/[.\-$^*?+\\/\\|[\]{}()]/g, '\\$&');
        }
        static replaceData(data, searchValue, replacer, options) {
            if (typeof data === 'undefined') {
                console.error(`replace ${searchValue}: data is undefined`);
                return data;
            }
            if (searchValue instanceof RegExp ? data.match(searchValue) : data.includes(searchValue)) {
                if (typeof replacer === 'string') {
                    if (options === null || options === void 0 ? void 0 : options.global) {
                        data = data.split(searchValue).join(replacer);
                    }
                    else {
                        data = data.replace(searchValue, replacer);
                    }
                }
                else {
                    data = data.replace(searchValue, replacer);
                }
            }
            else {
                console.error(`replace '${searchValue}': not found`);
            }
            return data;
        }
        transform(func) {
            console.log(`transform: ${func.name}`);
            func(this);
            return this;
        }
        expose(prefix, { variables, functions }) {
            if (!this.data) {
                console.error('expose: data is undefined');
                return this;
            }
            this.replace(/((?:^|\n)\s*)(const|let)\s+(\w+)(?=[\s+,;\n$])/g, (text, before, variableType, variableName) => {
                var _a, _b;
                if ((_a = variables === null || variables === void 0 ? void 0 : variables.readable) === null || _a === void 0 ? void 0 : _a.includes(variableName)) {
                    return `${before}window.${prefix}_variable_${variableName} = { get: () => ${variableName} };\n${before}${variableType} ${variableName}`;
                }
                if ((_b = variables === null || variables === void 0 ? void 0 : variables.writable) === null || _b === void 0 ? void 0 : _b.includes(variableName)) {
                    return `${before}window.${prefix}_variable_${variableName} = { get: () => ${variableName}, set: (value) => ${variableName} = value };\n${before}let ${variableName}`;
                }
                return text;
            });
            this.data = this.data.replace(/(?:^|\n)\s*(async\s+)?function\s+(\w+)\s*\((.*?)\)\s*\{/g, (text, async, functionName, args) => {
                var _a, _b, _c;
                async = async || '';
                if ((_a = functions === null || functions === void 0 ? void 0 : functions.disabled) === null || _a === void 0 ? void 0 : _a.includes(functionName)) {
                    return `${text} return;`;
                }
                if ((_b = functions === null || functions === void 0 ? void 0 : functions.readable) === null || _b === void 0 ? void 0 : _b.includes(functionName)) {
                    return `\nwindow.${prefix}_function_${functionName} = ${functionName};\n${text}`;
                }
                if ((_c = functions === null || functions === void 0 ? void 0 : functions.writable) === null || _c === void 0 ? void 0 : _c.includes(functionName)) {
                    return `${text}\n\treturn window.${prefix}_function_${functionName}(...arguments);\n}\nwindow.${prefix}_function_${functionName} = ${async}function(${args}) {`;
                }
                return text;
            });
            return this;
        }
        embed() {
            if (!this.data) {
                console.error('embed failed, data is undefined');
                return;
            }
            console.log('embed script: started');
            Script.append((el) => el.textContent = this.data || '');
            console.log('embed script: finished');
        }
        static appendScript(src) {
            console.log('append script: started');
            Script.append((el) => el.src = src);
            console.log('append script: finished');
        }
        static append(fill) {
            const el = document.createElement('script');
            el.type = 'text/javascript';
            fill(el);
            document.head.appendChild(el);
        }
    }
    console.log('created script class');
    const versionWatcherEventTypes = ['init', 'update'];
    class VersionWatcher extends EventWatcher {
        constructor(storageKey, getter) {
            super(versionWatcherEventTypes);
            this.storageKey = storageKey;
            this.getter = getter;
        }
        get() {
            return this.getter().get();
        }
        watch() {
            const waitForVersion = setInterval(() => {
                const variable = this.getter();
                if (!variable) {
                    return;
                }
                const currentVersion = variable.get();
                if (!currentVersion) {
                    return;
                }
                clearInterval(waitForVersion);
                this.emit('init', { currentVersion }, {});
                const previousVersion = localStorage[this.storageKey];
                localStorage[this.storageKey] = currentVersion;
                if (previousVersion !== currentVersion) {
                    this.emit('update', { previousVersion, currentVersion }, {});
                }
            }, 50);
        }
    }
    const versionWatchers = {
        native: new VersionWatcher('__sbg_current_version', () => window.__sbg_variable_VERSION),
        cui: new VersionWatcher('__sbg_cui_current_version', () => window.__sbg_cui_variable_USERSCRIPT_VERSION),
    };
    console.log('created version watchers');
    const localStorageWatcherEventTypes = ['getItem', 'setItem', 'removeItem'];
    class LocalStorageWatcher extends EventWatcher {
        constructor() {
            super(localStorageWatcherEventTypes);
        }
        watch() {
            ((originalMethod) => {
                localStorage.getItem = (key) => {
                    this.emit('getItem', { key }, { key, when: 'before' });
                    const result = originalMethod.call(localStorage, key);
                    this.emit('getItem', { key }, { key, when: 'after' });
                    return result;
                };
            })(localStorage.getItem);
            ((originalMethod) => {
                localStorage.setItem = (key, value) => {
                    this.emit('setItem', { key, value }, { key, when: 'before' });
                    originalMethod.call(localStorage, key, value);
                    this.emit('setItem', { key, value }, { key, when: 'after' });
                };
            })(localStorage.setItem);
            ((originalMethod) => {
                localStorage.removeItem = (key) => {
                    this.emit('removeItem', { key }, { key, when: 'before' });
                    originalMethod.call(localStorage, key);
                    this.emit('removeItem', { key }, { key, when: 'after' });
                };
            })(localStorage.removeItem);
        }
        filter(listeners, { eventOptions }) {
            return listeners
                .filter((listener) => listener.listenerOptions.key === eventOptions.key && listener.listenerOptions.when === eventOptions.when);
        }
    }
    console.log('created storage watcher');
    async function main() {
        if (location.pathname.startsWith('/login')) {
            return;
        }
        console.log('started main');
        preventLoadingScript();
        enhanceEventListeners();
        window.__sbg_language = getLanguage();
        initFeedback();
        initUrls();
        fixPermissionsCompatibility();
        await waitHTMLLoaded();
        initCSS();
        initSettings();
        window.__sbg_plus_modifyFeatures && window.__sbg_plus_modifyFeatures(features);
        execFeatures('pageLoad');
        window.__sbg_plus_localStorage_watcher = new LocalStorageWatcher();
        const nativeScript = await getNativeScript();
        await loadCUI(nativeScript);
        console.log('wait map: started');
        await wait(() => window.__sbg_variable_map);
        console.log('wait map: finished');
        initHome();
        initLayers();
        execFeatures('mapReady');
        execFireFeatures();
        console.log(`finished at ${new Date().toISOString()}`);
    }
    async function copyLogs() {
        return navigator.clipboard.writeText(logs.join('\n')).then(() => showToast(labels.toasts.logs, 2000));
    }
    function showToast(label, duration) {
        window.Toastify && window.Toastify({
            text: label.toString(),
            duration,
            forceDuration: true,
            gravity: 'top',
            position: 'right',
            className: 'interaction-toast',
        }).showToast();
    }
    function addLayer(layerName, layerLike) {
        const source = new window.ol.source.Vector();
        const layer = new window.ol.layer.Vector({ source, className: `ol-layer__${layerName}` });
        layer.setProperties({ name: layerName, zIndex: layers.get(layerLike).getProperties().zIndex }, true);
        window.__sbg_variable_map.get().addLayer(layer);
        return layer;
    }
    function preventLoadingScript() {
        ((append) => {
            Element.prototype.append = function () {
                if (arguments.length === 0) {
                    return;
                }
                if (arguments[0].src === getNativeScriptSrc()) {
                    return;
                }
                append.apply(this, arguments);
            };
        })(Element.prototype.append);
        console.log('prevented loading script');
    }
    function getNativeScriptSrc() {
        return window.__sbg_urls[isMobile() ? 'script' : 'intel'].remote;
    }
    function getCUIScriptSrc() {
        return window.__sbg_urls['cui'].remote;
    }
    function getEUIScriptSrc() {
        return window.__sbg_urls['eui'].remote;
    }
    function enhanceEventListeners() {
        ((addEventListener, removeEventListener) => {
            function initEventListeners(target, type) {
                target.__events = target.__events || {};
                target.__events[type] = target.__events[type] || { listeners: [] };
                return target;
            }
            EventTarget.prototype.addEventListener = function (type, listener) {
                if (!listener) {
                    return;
                }
                const target = initEventListeners(this, type);
                if (target.__events[type].sealed) {
                    return;
                }
                target.__events[type].listeners.push(listener);
                addEventListener.apply(this, arguments);
            };
            EventTarget.prototype.removeEventListener = function (type, listener) {
                if (!listener) {
                    return;
                }
                const target = initEventListeners(this, type);
                const index = target.__events[type].listeners.indexOf(listener);
                if (index !== -1) {
                    target.__events[type].listeners.splice(index, 1);
                }
                removeEventListener.apply(this, arguments);
            };
            EventTarget.prototype.getEventListeners = function (type) {
                const target = initEventListeners(this, type);
                const listeners = [];
                for (const listener of target.__events[type].listeners) {
                    if (!listener) {
                        continue;
                    }
                    listeners.push(listener);
                }
                return listeners;
            };
            EventTarget.prototype.getEventHandlers = function (type) {
                const target = this;
                return target.getEventListeners(type)
                    .map((listener) => 'handleEvent' in listener ? listener.handleEvent : listener)
                    .map((handler) => handler);
            };
            EventTarget.prototype.clearEventListeners = function (type, sealed) {
                const target = initEventListeners(this, type);
                if (sealed) {
                    target.__events[type].sealed = true;
                }
                for (const listener of target.__events[type].listeners) {
                    removeEventListener.apply(target, [type, listener]);
                }
                target.__events[type].listeners.splice(0);
            };
            EventTarget.prototype.addOnlyEventListener = function (type, listener) {
                if (!listener) {
                    return;
                }
                const target = initEventListeners(this, type);
                target.clearEventListeners(type, true);
                target.__events[type].listeners.push(listener);
                addEventListener.apply(this, arguments);
            };
            EventTarget.prototype.addRepeatingEventListener = function (type, callback, { repeats: limit, timeout, tick = () => { }, filter = () => true, cancel = () => true }) {
                let repeats = 0;
                addEventListener.call(this, type, (ev) => {
                    if (!filter(ev)) {
                        return;
                    }
                    if (!cancel(ev)) {
                        repeats = 0;
                        return;
                    }
                    repeats++;
                    if (repeats >= limit) {
                        repeats = 0;
                        callback(ev);
                        return;
                    }
                    tick(ev, repeats);
                    setTimeout(() => {
                        repeats = 0;
                    }, timeout);
                });
            };
        })(EventTarget.prototype.addEventListener, EventTarget.prototype.removeEventListener);
        console.log('enhanced event listeners');
    }
    function getLanguage() {
        let lang;
        try {
            lang = JSON.parse(localStorage.settings).lang;
        }
        catch {
            lang = navigator.language;
        }
        const result = ['ru', 'uk', 'be', 'kk'].includes(lang.split('-')[0]) ? 'ru' : 'en';
        console.log(`detected language: ${result}`);
        return result;
    }
    function initFeedback() {
        const feedbackClickTimeout = 1000;
        const feedbackTouches = 3;
        const feedbackTouchRepeats = 2;
        document.addRepeatingEventListener('touchstart', () => copyLogs(), {
            repeats: feedbackTouchRepeats,
            timeout: feedbackClickTimeout,
            filter: (ev) => ev.touches.length === feedbackTouches,
        });
    }
    function initUrls() {
        if (window.__sbg_urls) {
            return;
        }
        window.__sbg_urls = {
            desktop: {
                local: 'sbg.plus.user.js',
                remote: 'https://anmiles.net/userscripts/sbg.plus.user.js',
            },
            mobile: {
                local: 'sbg.plus.user.min.js',
                remote: 'https://anmiles.net/userscripts/sbg.plus.user.min.js',
            },
            intel: {
                local: 'intel.js',
                remote: 'https://sbg-game.ru/app/intel.js',
            },
            script: {
                local: 'script.js',
                remote: 'https://sbg-game.ru/app/script.js',
            },
            cui: {
                local: 'nicko.js',
                remote: 'https://raw.githubusercontent.com/nicko-v/sbg-cui/main/index.js',
            },
            eui: {
                local: 'egor.js',
                remote: 'https://github.com/egorantonov/sbg-enhanced/releases/latest/download/index.js',
            },
        };
    }
    function fixPermissionsCompatibility() {
        if (typeof navigator.permissions === 'undefined') {
            Object.defineProperty(navigator, 'permissions', {
                value: {
                    query: async () => ({ state: 'granted' }),
                },
            });
        }
        if (typeof window.DeviceOrientationEvent.requestPermission !== 'function') {
            window.DeviceOrientationEvent.requestPermission = async () => 'granted';
        }
    }
    async function loadCUI(nativeScript) {
        if (!features.get(loadCUI).isEnabled()) {
            console.log('skipped loadCUI; loading native script');
            nativeScript.embed();
            return;
        }
        console.log('loadCUI: started');
        const cuiScript = await Script.create({
            src: getCUIScriptSrc(),
            prefix: '__sbg_cui_script',
            transformer: transformCUIScript,
        });
        cuiScript.embed();
        console.log('loadCUI: wait window.cuiEmbedded');
        await wait(() => window.cuiEmbedded);
        console.log('loadCUI: wait window.ol');
        await wait(() => window.ol);
        console.log('loadCUI: set view animation duration');
        setViewAnimationDuration();
        return new Promise((resolve) => {
            window.addEventListener('mapReady', async () => {
                console.log('loadCUI: wait cuiStatus === loaded');
                await wait(() => window.cuiStatus === 'loaded');
                console.log('loadCUI: finished');
                console.log(`SBG Custom UI, version ${versionWatchers['cui'].get()}`);
                resolve();
            });
            console.log('loadCUI: wait dbReady');
            window.addEventListener('dbReady', () => {
                console.log('loadCUI: emit olReady');
                window.dispatchEvent(new Event('olReady'));
            });
        });
    }
    function transformCUIScript(script) {
        script.transform(exposeCUIScript);
        script.transform(fixCompatibility);
        script.transform(fixGotoReference);
        script.transform(fixCUIDefaults);
        script.transform(fixCUIWarnings);
        script.transform(disableCUIPointNavigation);
        features.triggers['cuiTransform'].map((transformer) => {
            script = transformer.exec(script);
        });
        return script;
    }
    async function waitHTMLLoaded() {
        await resolveOnce((resolver) => document.addEventListener('DOMContentLoaded', resolver), () => document.readyState !== 'loading');
        console.log('loaded DOM content');
    }
    async function resolveOnce(addListener, immediateCondition) {
        return new Promise((resolve) => {
            let resolved = false;
            function singleResolver() {
                if (resolved) {
                    return;
                }
                resolved = true;
                resolve();
            }
            addListener(singleResolver);
            if (immediateCondition()) {
                singleResolver();
            }
        });
    }
    async function getNativeScript() {
        return Script.create({
            src: getNativeScriptSrc(),
            prefix: '__sbg_script',
            transformer: transformNativeScript,
        });
    }
    function isMobile() {
        if ('maxTouchPoints' in navigator) {
            return navigator['maxTouchPoints'] > 0;
        }
        else if ('msMaxTouchPoints' in navigator) {
            return navigator['msMaxTouchPoints'] > 0;
        }
        else if ('orientation' in window) {
            return true;
        }
        else {
            return /\b(BlackBerry|webOS|iPhone|IEMobile|Android|Windows Phone|iPad|iPod)\b/i.test(navigator['userAgent']);
        }
    }
    function loadEUI() {
        window.cuiStatus = 'loaded';
        Script.appendScript(getEUIScriptSrc());
    }
    function transformNativeScript(script) {
        return script
            .transform(exposeNativeScript)
            .transform(includeYMaps);
    }
    function exposeNativeScript(script) {
        return script.expose('__sbg', {
            variables: {
                readable: ['draw_slider', 'FeatureStyles', 'is_dark', 'ItemTypes', 'LANG', 'map', 'TeamColors', 'temp_lines_source', 'units', 'VERSION'],
            },
            functions: {
                readable: ['apiQuery', 'deleteInventoryItem', 'jquerypassargs', 'openProfile', 'takeUnits'],
                writable: ['drawLeaderboard', 'manageDrawing', 'movePlayer', 'showInfo', 'timeToString'],
                disabled: !isMobile() && localStorage['homeCoords'] ? ['movePlayer'] : undefined,
            },
        });
    }
    function includeYMaps(script) {
        const layerName = 'ymaps';
        let isChecked;
        try {
            JSON.parse(localStorage.settings).base === layerName;
        }
        catch {
            isChecked = localStorage['sbg-plus-state-ymaps'] === '1';
        }
        const ymapsInput = $('<input type="radio" />').attr('name', 'baselayer').val(layerName).prop('checked', isChecked);
        const ymapsSpan = $('<span></span>').text(labels.ymaps.toString());
        const ymapsLabel = $('<label></label>').addClass('layers-config__entry').append(ymapsInput).append(' ').append(ymapsSpan);
        $('input[value="osm"]').parent().after(ymapsLabel);
        return script
            .replace('if (type == \'osm\') {', `if (type == '${layerName}') { \n  theme = is_dark ? 'dark' : 'light';\n  source = new ol.source.XYZ({ url: \`https://core-renderer-tiles.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}&scale=1&projection=web_mercator&theme=\${theme}&lang=\${window.__sbg_language}\` });\n} else if (type == 'osm') {\n`);
    }
    function setCSS(css) {
        $('<style></style>').html(css).appendTo(document.body);
    }
    window.setCSS = setCSS;
    function initCSS() {
        setCSS(`
			.topleft-container,
			.bottom-container {
				z-index: 1;
			}

			.popup > .popup.sbg-plus-settings {
				left: 0;
				top: 0;
				width: 100%;
				height: 100%;
				transform: none;
				position: absolute;
				padding: 0.5em 1em;
				color: var(--text);
			}

			.sbg-plus-settings .settings-content {
				width: 100%;
				gap: 0;
			}

			.sbg-plus-settings .settings-section h4 {
				margin: 1em 0 0.5em 0;
				order: -1;
				display: none;
			}

			.sbg-plus-settings .settings-section__item.simple ~ h4,
			.sbg-plus-settings.advanced .settings-section__item ~ h4 {
				display: block;
			}

			.sbg-plus-settings .settings-section__item {
				display: none;
			}

			.sbg-plus-settings .settings-section__item.simple {
				display: flex;
			}

			.sbg-plus-settings.advanced .settings-section__item {
				display: flex;
			}

			.sbg-plus-settings .settings-section__item span {
				flex-grow: 1;
			}

			.sbg-plus-popup {
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 0.5em;
			}

			.sbg-plus-popup:before {
				-webkit-backdrop-filter: blur(5px);
				backdrop-filter: blur(5px);
			}

			.sbg-plus-popup textarea {
				display: block;
				width: 90vw;
				max-width: 800px;
				height: 90vh;
				overflow: auto;
				padding: 0.5em;
				box-sizing: border-box;
				font-family: sans-serif;
			}

			.sbg-plus-popup li {
				padding: 0.25em 0;
			}

			.sbg-plus-popup .buttons {
				display: flex;
				gap: 0.5em;
			}

			.sbg-plus-popup button {
				white-space: nowrap;
			}

			.sbg-plus-popup .popup-button-secondary {
				filter: grayscale(1);
			}
		`);
        console.log('initialized CSS');
    }
    function wait(func) {
        return new Promise((resolve) => {
            const waitInterval = setInterval(() => {
                const result = func();
                if (!result) {
                    return;
                }
                clearInterval(waitInterval);
                resolve(result);
            }, 10);
        });
    }
    function initSettings() {
        new SettingsPopup();
        console.log('initialized settings');
    }
    function createPopup(cssClass, options = { roundClose: true }) {
        var _a;
        const closeButton = $('<button></button>')
            .addClass(options.roundClose ? 'popup-close' : 'popup-button-secondary')
            .attr('data-round', options.roundClose ? 'true' : null)
            .html(options.roundClose ? '&nbsp;✕&nbsp;' : labels.close.toString());
        const buttonsBlock = $('<div></div>')
            .addClass('buttons')
            .append(closeButton);
        const popup = $('<div></div>')
            .addClass(`${cssClass} sbg-plus-popup popup pp-center hidden`)
            .append(buttonsBlock)
            .appendTo('body');
        (_a = closeButton.get(0)) === null || _a === void 0 ? void 0 : _a.addOnlyEventListener('click', function () {
            popup.addClass('hidden');
        });
        return popup;
    }
    function initHome() {
        if (isMobile() || !('homeCoords' in localStorage)) {
            return;
        }
        const center = JSON.parse(localStorage.homeCoords);
        window.__sbg_variable_map.get().getView().setCenter(center);
        console.log('initialized home location');
    }
    function initLayers() {
        for (const layer of window.__sbg_variable_map.get().getAllLayers()) {
            const layerName = layer.getProperties().name;
            const key = !layerName
                ? 'base'
                : layerName === 'lines' && layers.get('lines')
                    ? 'lines_temp'
                    : layerName;
            layers.set(key, layer);
        }
        console.log('initialized layers');
    }
    function execFeatures(trigger) {
        features.triggers[trigger].map((feature) => {
            if (feature instanceof Feature) {
                feature.exec();
            }
        });
        console.log(`executed all features on ${trigger}`);
    }
    function execFireFeatures() {
        let fireClicked = false;
        $('#attack-menu').on('click', () => {
            if (!fireClicked) {
                fireClicked = true;
                execFeatures('fireClick');
            }
        });
    }
    function exposeCUIScript(script) {
        return script
            .expose('__sbg_cui', {
            variables: {
                readable: ['USERSCRIPT_VERSION', 'config'],
            },
            functions: {
                readable: ['clearInventory'],
            },
        });
    }
    function fixCompatibility(script) {
        return script
            .replace('fetch(\'/app/script.js\')', '(async () => ({ text: async () => window.__sbg_script_modified }))()')
            .replace('window.stop', 'false && window.stop')
            .replace('window.navigator.geolocation.clearWatch', 'false && window.navigator.geolocation.clearWatch')
            .replace('document.open', 'false && document.open')
            .replace('fetch(\'/app\')', 'false && fetch(\'/app\')')
            .replace(/$/, 'window.cuiEmbedded = true')
            .replace(/window\.onerror = (.*);/, (_match, func) => `window.__sbg_onerror_handlers.push(${func});`)
            .expose('__sbg_cui', {
            functions: {
                readable: ['olInjection', 'loadMainScript', 'main'],
            },
        });
    }
    function setViewAnimationDuration() {
        if (typeof window.__sbg_plus_animation_duration === 'number') {
            ((animate) => {
                window.ol.View.prototype.animate = function (...args) {
                    const instantArgs = args.map((arg) => typeof arg === 'object' ? { ...arg, duration: window.__sbg_plus_animation_duration } : arg);
                    animate.call(this, ...instantArgs);
                };
            })(window.ol.View.prototype.animate);
        }
    }
    function fixGotoReference(script) {
        $(document).on('click', 'a[href*="point="]', (ev) => {
            var _a;
            const guid = (_a = ev.currentTarget.href.split('point=').pop()) === null || _a === void 0 ? void 0 : _a.split('&').shift();
            window.__sbg_function_showInfo(guid);
            ev.stopPropagation();
            return false;
        });
        return script
            .replace('window.location.href = `/app/?point=${guid}`', 'window.__sbg_function_showInfo(guid)');
    }
    function fixCUIDefaults(script) {
        return script
            .replace('sepia: 1', 'sepia: 0');
    }
    function fixCUIWarnings(script) {
        return script
            .replace('!viewportMeta.content.match(yaRegexp)', '!viewportMeta.content.match(yaRegexp) && navigator.userAgent.toLowerCase().includes("yabrowser")');
    }
    function disableCUIPointNavigation(script) {
        $('<div></div>').addClass('sbgcui_jumpToButton').appendTo('.info');
        setCSS(`
			.sbgcui_jumpToButton {
				display: none !important;
			}
		`);
        return script.removeCUIBlock('Навигация и переход к точке');
    }
    function disableClusters(script) {
        return script
            .replace('function mapClickHandler(event) {', 'function mapClickHandler(event) { event.isSilent = true;');
    }
    function disableAttackZoom(script) {
        setCSS(`
			.sbgcui_lock_rotation[sbgcui_locked="true"]::before {
				transition: none !important;
			}
		`);
        return script
            // .replace(
            // 	'view.fit(',
            // 	'if (false) view.fit(',
            // )
            .replaceCUIBlock('Показ радиуса катализатора', /(?<=\n\s+)view\./g, (match) => `if (false) ${match}`);
    }
    function unlockCompassWhenRotateMap(script) {
        return script
            .replaceCUIBlock('Вращение карты', 'if (latestTouchPoint == null) { return; }', 'if (latestTouchPoint == null) { if (isRotationLocked) { toggleRotationLock(event); touchStartHandler({...event, target: event.target, touches: [event.touches[0]], targetTouches: [event.targetTouches[0]] }); } return; }');
    }
    function alwaysClearInventory(script) {
        return script
            .replace(/const MIN_FREE_SPACE = \d+/, 'const MIN_FREE_SPACE = INVENTORY_LIMIT');
    }
    function waitClearInventory(script) {
        return script;
        // TODO: fix
        // $('#discover').on('click', () => {
        // 	(window.__sbg_plus_localStorage_watcher as LocalStorageWatcher).on('getItem', () => {
        // 		window.__sbg_cui_function_clearInventory(false);
        // 	}, { key : 'inventory-cache', when : 'after', once : true });
        // });
        // return script
        // 	.replace(
        // 		'await clearInventory(false, toDelete);',
        // 		'// await clearInventory(false, toDelete);',
        // 	)
        // ;
    }
    function disableCarouselAnimation() {
        window.Splide.defaults = window.Splide.defaults || {};
        window.Splide.defaults.speed = 0;
    }
    function disablePopupAnimation() {
        setCSS(`
			.popup {
				transition: none !important;
			}
		`);
    }
    function disableMapAnimation() {
        window.__sbg_plus_animation_duration = 0;
    }
    function disableAttackButtonAnimation() {
        setCSS(`
			#attack-menu,
			#attack-menu:after {
				transition: none !important;
			}
		`);
    }
    function closeToastsAfter1sec() {
        ((_init) => {
            window.Toastify.prototype.init = function (options) {
                if (!options.forceDuration) {
                    options.duration = Math.min(options.duration || 0, 1000);
                }
                _init.call(this, options);
                return this;
            };
            window.Toastify.prototype.init.prototype = _init.prototype;
        })(window.Toastify.prototype.init);
    }
    function enableBackButton() {
        const backClickTimeout = 1000;
        const popups = [
            { hiddenClass: 'hidden', selectors: ['.popup', '.draw-slider-wrp', '.attack-slider-wrp'] },
            { hiddenClass: 'sbgcui_hidden', selectors: ['.sbgcui_settings'] },
        ];
        function isPopupClosed() {
            let isClosed = false;
            for (const { hiddenClass, selectors } of popups) {
                for (const selector of selectors) {
                    for (const el of $(selector).toArray()) {
                        if (!el.classList.contains(hiddenClass)) {
                            el.classList.add(hiddenClass);
                            if (selector === '.draw-slider-wrp') {
                                $('#draw-slider-close').trigger('click');
                            }
                            if (selector === '.attack-slider-wrp') {
                                $('#attack-menu').removeClass('sbgcui_attack-menu-rotate');
                            }
                            isClosed = true;
                        }
                    }
                }
            }
            return isClosed;
        }
        document.addRepeatingEventListener('backbutton', () => location.replace('/window.close'), {
            repeats: 2,
            timeout: backClickTimeout,
            tick: () => showToast(labels.toasts.back, backClickTimeout),
            cancel: () => !isPopupClosed(),
        });
    }
    function showBuilderPanel() {
        wait(() => $('.topleft-container')).then((buttonsSection) => new Builder(buttonsSection));
    }
    function updateLangCacheAutomatically() {
        versionWatchers['native'].on('update', ({ currentVersion }) => {
            console.log(`update lang cache to ${currentVersion} version`);
            $('#lang-cache').trigger('click');
        }, { previous: true });
    }
    function fixBlurryBackground() {
        setCSS(`
			.popup.pp-center {
				backdrop-filter: none;
				-webkit-backdrop-filter: none;
			}

			.popup.pp-center:before {
				content: '';
				position: absolute;
				left: 0;
				top: 0;
				width: 100%;
				height: 100%;
				-webkit-backdrop-filter: blur(5px);
				backdrop-filter: blur(5px);
			}

			.popup.pp-center > * {
				position: relative;
			}
		`);
    }
    function alignSettingsButtonsVertically() {
        setCSS(`
			.settings-section__button {
				justify-self: unset !important;
			}

			.settings-section__item {
				grid-template-columns: 5fr 3fr;
			}

			.settings-section__item select {
				text-align: center;
			}
		`);
    }
    function fixCompass() {
        const handlers = [...window.getEventHandlers('deviceorientation')];
        function triggerHandlers(webkitCompassHeading) {
            handlers.map((handler) => handler({ webkitCompassHeading }));
        }
        function deviceOrientationAbsoluteListener(ev) {
            if (!ev.absolute || ev.alpha == null || ev.beta == null || ev.gamma == null) {
                return;
            }
            const totalDegrees = 360;
            const webkitCompassHeading = -(ev.alpha + ev.beta * ev.gamma / 90) % totalDegrees;
            window.removeEventListener('deviceorientation', deviceOrientationListener);
            triggerHandlers(webkitCompassHeading);
        }
        const deviceOrientationListener = (ev) => {
            const { webkitCompassHeading } = ev;
            if (webkitCompassHeading !== null && !isNaN(webkitCompassHeading)) {
                triggerHandlers(webkitCompassHeading);
                window.removeEventListener('deviceorientationabsolute', deviceOrientationAbsoluteListener);
            }
        };
        function addListeners() {
            window.addEventListener('deviceorientationabsolute', deviceOrientationAbsoluteListener);
            window.addEventListener('deviceorientation', deviceOrientationListener);
        }
        window.DeviceOrientationEvent.requestPermission()
            .then((response) => {
            if (response === 'granted') {
                addListeners();
            }
            else {
                console.warn('DeviceOrientationEvent permission is not granted');
            }
        });
    }
    /* eui */
    function centerIconsInGraphicalButtons() {
        setCSS(`
			.material-symbols-outlined {
				line-height: 1 !important;
			}
		`);
    }
    function showReloadButtonInCompactMode() {
        setCSS(`
			.game-menu button.fa-solid-rotate:first-child:last-child {
				height: 2em;
				position: absolute;
				top: 0.75em;
				right: 0.75em;
			}
		`);
    }
    /* fire */
    function alwaysCenterAlignFireItemsCount() {
        setCSS(`
		.splide__slide[data-rarity] .catalysers-list__amount {
			display: block !important;
		}
		.splide__slide[data-rarity] .catalysers-list__amount:before {
			content: '';
			display: inline-block;
			background: currentColor;
			width: 1em;
			height: 1em;
			position: absolute;
			right: 8px;
			font-size: 0.85em;
			bottom: 5px;
		}
		`);
    }
    function replaceHighlevelWarningWithIcon(attackSlider) {
        const sliderHeight = attackSlider.height();
        setCSS(`
			#attack-slider {
				padding: 4px 0;
			}

			.attack-slider-highlevel {
				pointer-events: none;
				font-size: 36px;
				width: 1px;
				height: ${sliderHeight}px;
				margin: -${sliderHeight}px auto 0 auto;
				background: none;
				backdrop-filter: none;
				-webkit-backdrop-filter: none;
				text-align: center;
				display: block;
				z-index: 1;
			}
		`);
        $('.attack-slider-highlevel').html('&#x20e0');
    }
    function joinFireButtons(attackMenu) {
        const menuHeight = attackMenu.outerHeight();
        setCSS(`
			.attack-slider-wrp {
				transition: none;
				position: relative;
				z-index: 3;
			}

			.attack-slider-buttons {
				position: absolute;
				top: 100%;
				left: 50%;
				padding: 0;
			}

			#attack-slider-fire {
				max-width: ${menuHeight}px;
				height: ${menuHeight}px;
				opacity: 0;
				position: relative;
				left: -50%;
			}

			#attack-menu.sbgcui_attack-menu-rotate::after {
				background: var(--ingress-selection-color);
			}

			#attack-menu.sbgcui_attack-menu-rotate {
				border-color: var(--ingress-selection-color);
			}
		`);
        $(window).on('click', function (ev) {
            const target = ev.target;
            if (target.id !== 'attack-menu' && $('.attack-slider-wrp.hidden').length === 0 && $(target).parents('.attack-slider-wrp').length === 0) {
                $('#attack-menu').trigger('click');
            }
        });
    }
    /* toolbar */
    function showQuickAutoSelectButton(toolbar) {
        const autoSelect = window.__sbg_cui_variable_config.get().autoSelect;
        const cssClass = autoSelect.deploy === 'max' ? 'fa-rotate-180' : '';
        const autoSelectButton = $('<button></button>')
            .addClass('fa fa-solid-arrow-down-short-wide')
            .addClass(cssClass)
            .prependTo(toolbar);
        autoSelectButton.on('click', () => {
            autoSelectButton.toggleClass('fa-rotate-180');
            const isMax = autoSelectButton.hasClass('fa-rotate-180');
            $('select[name="autoSelect_deploy"]').val(isMax ? 'max' : 'min');
            $('select[name="autoSelect_upgrade"]').val(isMax ? 'max' : 'min');
            $('form.sbgcui_settings button:contains("Сохранить")').trigger('click');
        });
        setCSS(`
			.fa-rotate-180 {
				transform: scale(-1, 1);
			}
		`);
    }
    function moveAllSidebarsRight(control) {
        $('.ol-control').first()
            .addClass('toolbar')
            .prepend(control.children());
        setCSS(`
			.ol-control.toolbar {
				display: flex;
				flex-direction: column;
			}

			.ol-control.toolbar #settings {
				order: 99;
				margin-bottom: 0;
			}

			.sbgcui_toolbar {
				gap: 0;
			}

			.sbgcui_toolbar + button {
				margin-bottom: 10px;
			}

			#toggle-follow {
				margin-bottom: 10px;
			}

			.sbgcui_lock_rotation {
				margin-top: 10px !important;
			}
		`);
    }
    function hideCUIToolbarToggleButton() {
        setCSS(`
			.sbgcui_toolbar {
				display: flex !important;
				margin-bottom: 10px;
			}

			.sbgcui_toolbar + button {
				display: none !important;
			}
		`);
    }
    /* inventory */
    function showAutoDeleteSettingsButton(inventoryPopup) {
        $('<button></button>')
            .text('Auto-delete')
            .css({ height: '40px' })
            .appendTo(inventoryPopup)
            .on('click', () => {
            $('#inventory__close').trigger('click');
            $('.sbgcui_settings').removeClass('sbgcui_hidden');
            $('.sbgcui_settings-title:contains("Автоудаление")').trigger('click');
        });
    }
    function moveReferenceButtonsDown() {
        // TODO: split from hideManualClearButtons
        setCSS(`
			[data-feat-moveReferenceButtonsDown] .inventory__controls {
				height: 0;
				min-height: 0;
				overflow: hidden;
			}

			[data-feat-moveReferenceButtonsDown] .inventory__content[data-tab="3"] ~ .inventory__controls > select {
				position: fixed;
				right: 0;
				bottom: 51px;
				height: 40px;
				flex-grow: 0;
				flex-shrink: 0;
				margin: 0 4px;
				width: calc(100% - 8px);
				text-align: center;
			}

			[data-feat-moveReferenceButtonsDown] .inventory__content[data-tab="3"] ~ .inventory__controls > .sbgcui_refs-sort-button {
				border-width: revert;
				border-radius: 0;
				bottom: 51px;
				z-index: 2;
				right: 4px;
				height: 40px;
				width: 40px;
				font-size: 20px;
			}

			[data-feat-moveReferenceButtonsDown] #inventory__close {
				bottom: 102px;
			}

			[data-feat-moveReferenceButtonsDown] .inventory__content[data-tab="3"] {
				margin-bottom: 41px;
			}
		`);
    }
    function hideManualClearButtons() {
        setCSS(`
			[data-feat-hideManualClearButtons] .inventory__controls {
				height: 0;
				min-height: 0;
				overflow: hidden;
			}

			[data-feat-hideManualClearButtons] .inventory__content[data-tab="3"] ~ .inventory__controls > select {
				position: fixed;
				right: 0;
				bottom: 51px;
				height: 40px;
				flex-grow: 0;
				flex-shrink: 0;
				margin: 0 4px;
				width: calc(100% - 8px);
				text-align: center;
			}

			[data-feat-hideManualClearButtons] .inventory__content[data-tab="3"] ~ .inventory__controls > .sbgcui_refs-sort-button {
				border-width: revert;
				border-radius: 0;
				bottom: 51px;
				z-index: 2;
				right: 4px;
				height: 40px;
				width: 40px;
				font-size: 20px;
			}

			[data-feat-hideManualClearButtons] #inventory__close {
				bottom: 102px;
			}

			[data-feat-hideManualClearButtons] .inventory__content[data-tab="3"] {
				margin-bottom: 41px;
			}
		`);
    }
    function alwaysShowSelfStatistics(drawLeaderboard) {
        window.__sbg_function_drawLeaderboard = async function () {
            var _a;
            await drawLeaderboard();
            const statMap = {
                owned: 'owned_points',
            };
            const stat = ((_a = $('#leaderboard__term-select').val()) === null || _a === void 0 ? void 0 : _a.toString()) || '';
            const data = (await window.__sbg_function_apiQuery('profile', { guid: $('#self-info__name').data('guid') })).response.data;
            const value = data[statMap[stat] || stat];
            const entry = window.__sbg_function_jquerypassargs($('<li>'), '$1$ — $2$; $3$ $4$', $('<span>', { class: 'profile-link' }).text(data.name).css('color', `var(--team-${data.team})`).attr('data-name', data.name).on('click', window.__sbg_function_openProfile), $('<span>').text(window.i18next.t('leaderboard.level', { count: data.level })).css('color', `var(--level-${data.level})`), ...window.__sbg_function_takeUnits(value));
            const list = $('<ol>')
                .addClass('leaderboard__list_self')
                .attr('start', $('#leaderboard__place-pos').text())
                .append(entry);
            $('.leaderboard__list_self').remove();
            $('.leaderboard__list').after(list);
        };
        setCSS(`
			.leaderboard__list_self {
				flex-shrink: 0;
				border-top: 1px solid white;
				margin: 0;
				overflow-y: auto;
				padding-left: 3em;
			}
		`);
    }
    function restoreCUISort() {
        setCSS(`
			[data-feat-restoreCUISort] .inventory__content[data-tab="3"] ~ .inventory__controls > #eui-sort {
				display: none !important;
			}

			[data-feat-restoreCUISort] .inventory__content[data-tab="3"] ~ .inventory__controls > .sbgcui_refs-sort-button,
			[data-feat-restoreCUISort] .inventory__content[data-tab="3"] ~ .inventory__controls > .sbgcui_refs-sort-select {
				display: block !important;
			}
		`);
    }
    function fixSortButton(_button) {
        setCSS(`
			.sbgcui_refs-sort-button {
				z-index: 100 !important;
			}
		`);
    }
    function reportCUIUpdates() {
        versionWatchers['cui'].on('update', ({ currentVersion }) => {
            const message = labels.toasts.cuiUpdated.format({ currentVersion });
            showToast(message, 2000);
            if (window.__sbg_local) {
                alert(message);
            }
        }, { previous: true });
    }
    function quickRecycleAllRefs(inventoryContent) {
        setCSS(`
			.inventory__content[data-tab="3"] .inventory__item {
				display: flex;
				flex-direction: row;
			}

			.inventory__content[data-tab="3"] .inventory__item-left {
				order: 0;
			}

			.inventory__content[data-tab="3"] .inventory__item-controls {
				flex-direction: row;
			}

			.inventory__content[data-tab="3"] .inventory__item-controls button {
				width: 30px;
				margin-left: 4px;
			}

			.inventory.popup .inventory__manage-amount[data-tab="3"] {
				display: none;
			}
		`);
        const inventoryContentEl = inventoryContent.get(0);
        inventoryContentEl.getEventListeners('click').forEach((listener) => inventoryContentEl.removeEventListener('click', listener));
        $(document).on('click', '.inventory__content', async function (ev) {
            if (!ev.target) {
                return;
            }
            if (!$(ev.target).is('.inventory__ic-manage')) {
                if ($(ev.target).is('.inventory__ic-view')) {
                    ev.offsetX = 0;
                }
                inventoryContentEl.getEventHandlers('click').map((func) => ev.originalEvent && func(ev.originalEvent));
                return;
            }
            const el = $(ev.target).parents('.inventory__item');
            const item = (JSON.parse(localStorage.getItem('inventory-cache') || '[]') || []).find((f) => f.g == el.attr('data-guid'));
            if (!item) {
                return;
            }
            const fakeEl = $('<input />')
                .addClass('inventory__ma-amount')
                .val(item.a)
                .css({ display: 'none' });
            Object.defineProperty(fakeEl.get(0), 'reportValidity', { value: () => true });
            el.append(fakeEl);
            el.attr('data-tab', item.t);
            await window.__sbg_function_deleteInventoryItem(el);
        });
    }
    /* info popup */
    function makeInfoPopupSemiTransparent() {
        setCSS(`
			.info.popup {
				background-color: transparent;
			}
		`);
    }
    function alwaysShowSecondsForCoolDowns() {
        const cooldownSeconds = 90;
        const visibleSeconds = 100;
        const visibleSecondsPrevious = 60;
        window.__sbg_function_timeToString = function (seconds) {
            return seconds >= visibleSeconds
                ? window.i18next.t('units.min', { count: Math.floor(seconds / 60) })
                : window.i18next.t('units.sec', { count: seconds });
        };
        setCSS(`
			#discover[data-remain] .discover-progress {
				transform: scale(${visibleSecondsPrevious / cooldownSeconds}, 1);
				transform-origin: left;
			}
		`);
    }
    function increaseItemsFont() {
        setCSS(`
			.inventory__content:not([data-tab="3"]) {
				display: flex;
				flex-direction: column;
				flex-wrap: wrap;
				counter-reset: section;
			}

			.inventory__content:not([data-tab="3"]) .inventory__item {
				height: calc((100% - 120px) / 5);
				width: 50%;
				box-sizing: border-box;
			}

			.inventory__content:not([data-tab="3"]) .inventory__item-title {
				height: 2em;
				margin-top: 0.8em;
				font-size: 2em;
			}

			.inventory__content:not([data-tab="3"]) .inventory__item-descr {
				margin-left: 0;
				margin-top: -0.8em;
				font-size: 1.3em !important;
			}

			.inventory__content:not([data-tab="3"]) .inventory__item-descr::first-letter {
				font-size: 0;
			}
		`);
        const itemTypes = window.__sbg_variable_ItemTypes.get();
        itemTypes[1] = 'R';
        itemTypes[2] = 'X';
        itemTypes[3] = 'K';
        itemTypes[4] = 'Br';
    }
    function enlargeCoreSlots() {
        setCSS(`
			.i-stat__cores {
				padding: 4px 0;
			}

			.i-stat__core {
				font-size: 140%;
			}
		`);
    }
    function alignCloseButtonVertically() {
        setCSS(`
			.info.popup > .popup-close {
				margin-top: -0.5em;
				margin-bottom: calc(0.5em - 10px);
			}
		`);
    }
    function rearrangeButtons() {
        setCSS(`
			.i-stat .i-buttons {
				--discover-left: 0/6;
				--discover-right: 0/6;

				--discover-gap: 0.25em;
				--discover-border: 1.9px;
				--discover-parent: calc(0.9 * (100vw - 2 * var(--discover-border)) + 2 * var(--discover-gap));
				--discover-font-size: 1.1em;

				--discover-left-offset: calc(var(--discover-left) * (var(--discover-parent) + var(--discover-gap)));
				--discover-right-offset: calc(var(--discover-right) * (var(--discover-parent) + var(--discover-gap)));

				--discover-width: calc(var(--discover-parent) - var(--discover-left-offset) - var(--discover-right-offset));

				--discover-sibling-left-width: calc(var(--discover-left) * var(--discover-parent) - var(--discover-gap));
				--discover-sibling-right-width: calc(var(--discover-right) * var(--discover-parent) - var(--discover-gap));

				--discover-sibling-left-offset: calc(-1 * var(--discover-left-offset) - var(--discover-border));
				--discover-sibling-right-offset: calc(-1 * var(--discover-right-offset) - var(--discover-border));

				--discover-alt-button-width: calc(1/6 * (var(--discover-parent) - 2 * var(--discover-gap)) - 0.5 * var(--discover-border));
			}

			.i-buttons button {
				border-width: 2px;
			}

			#discover {
				margin-left: var(--discover-left-offset);
				margin-right: var(--discover-right-offset);
				width: var(--discover-width);
			}

			.sbgcui_no_loot,
			.sbgcui_no_refs {
				width: var(--discover-alt-button-width);
				padding: 0 calc(0.5 * var(--discover-gap));
				border-color: currentColor !important;
			}

			.sbgcui_no_loot:before,
			.sbgcui_no_refs:before {
				max-width: 1.5em;
			}
		`);
    }
    function hideCloseButton() {
        $('#draw').on('click', (ev) => $('.draw-slider-buttons button').css({ height: `${$(ev.target).outerHeight()}px` }));
        setCSS(`
			[data-feat-hideCloseButton] .popup-close,
			[data-feat-hideCloseButton] #inventory__close,
			[data-feat-hideCloseButton] #draw-slider-close {
				display: none !important;
			}

			[data-feat-hideCloseButton] .draw-slider-buttons {
				padding: 0 calc(5%);
				gap: 0.25em;
			}

			[data-feat-hideCloseButton] .draw-slider-buttons button {
				max-width: none !important;
				padding: 6px;
				font-size: 1.1em;
			}

			[data-feat-hideCloseButton] .i-stat .i-buttons {
				margin: 0;
			}
		`);
    }
    function colorizeTimer() {
        rearrangeButtons();
        setCSS(`
			[data-feat-colorizeTimer] .i-stat .i-buttons {
				--discover-left: 1/6;
			}

			[data-feat-colorizeTimer] #discover:after {
				transform: none;
				width: var(--discover-sibling-left-width);
				left: var(--discover-sibling-left-offset);
				height: calc(100% + 2 * var(--discover-border));
				top: calc(-1 * var(--discover-border));
				box-sizing: border-box;
				line-height: 40px;
				border: var(--discover-border) solid currentColor;
				color: var(--ingress-btn-border-color);
				border-color: currentColor;
				content: ' ';
			}

			[data-feat-colorizeTimer] #discover[data-time]:after {
				content: attr(data-time);
			}

			[data-feat-colorizeTimer] #discover[data-time][data-remain]:after {
				content: attr(data-time) ' #' attr(data-remain);
			}

			[data-feat-colorizeTimer] #discover[data-time]:after {
				color: var(--ingress-btn-disabled-color);
				border-color: var(--ingress-btn-disabled-accent-color);
			}

			[data-feat-colorizeTimer] #discover[data-time][data-remain]:after {
				background: none;
				border-color: currentColor;
			}

			[data-feat-colorizeTimer] #discover[data-time][data-remain="4"]:after {
				color: var(--ingress-btn-border-color);
			}

			[data-feat-colorizeTimer] #discover[data-time][data-remain="3"]:after {
				color: white;
			}

			[data-feat-colorizeTimer] #discover[data-time][data-remain="2"]:after {
				color: yellow;
			}

			[data-feat-colorizeTimer] #discover[data-time][data-remain="1"]:after {
				color: orange;
			}
		`);
    }
    function hideRepairButton() {
        rearrangeButtons();
        setCSS(`
			[data-feat-hideRepairButton] #repair,
			[data-feat-hideRepairButton] #eui-repair {
				display: none;
			}

			[data-feat-hideRepairButton] .i-stat .i-buttons > button:not(#discover) {
				width: calc(45% + 0.125em);
			}
		`);
    }
    function replaceSwipeWithButton(arrow) {
        rearrangeButtons();
        arrow.hide();
        function createTouch(touchData) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
            const touches = [{
                    clientX: (_a = touchData.clientX) !== null && _a !== void 0 ? _a : 0,
                    clientY: (_b = touchData.clientY) !== null && _b !== void 0 ? _b : 0,
                    pageX: (_d = (_c = touchData.pageX) !== null && _c !== void 0 ? _c : touchData.clientX) !== null && _d !== void 0 ? _d : 0,
                    pageY: (_f = (_e = touchData.pageY) !== null && _e !== void 0 ? _e : touchData.clientY) !== null && _f !== void 0 ? _f : 0,
                    screenX: (_h = (_g = touchData.screenX) !== null && _g !== void 0 ? _g : touchData.clientX) !== null && _h !== void 0 ? _h : 0,
                    screenY: (_k = (_j = touchData.screenY) !== null && _j !== void 0 ? _j : touchData.clientY) !== null && _k !== void 0 ? _k : 0,
                    force: (_l = touchData.force) !== null && _l !== void 0 ? _l : 0,
                    identifier: (_m = touchData.identifier) !== null && _m !== void 0 ? _m : 0,
                    radiusX: (_o = touchData.radiusX) !== null && _o !== void 0 ? _o : 1,
                    radiusY: (_p = touchData.radiusY) !== null && _p !== void 0 ? _p : 1,
                    rotationAngle: (_q = touchData.rotationAngle) !== null && _q !== void 0 ? _q : 0,
                    target: touchData.target,
                }];
            const set = new Set(touches);
            return {
                touches: {
                    length: set.size,
                    item: (index) => touches[index],
                    [Symbol.iterator]: set[Symbol.iterator],
                },
            };
        }
        function swipe(target, [startX, startY], [endX, endY]) {
            const identifier = Math.random() * Number.MAX_SAFE_INTEGER;
            const startTouch = createTouch({ target, identifier, clientX: startX, clientY: startY });
            const endTouch = createTouch({ target, identifier, clientX: endX, clientY: endY });
            const touchStartHandlers = target.getEventHandlers('touchstart').filter((f) => f.name === 'touchStartHandler');
            const touchMoveHandlers = target.getEventHandlers('touchmove').filter((f) => f.name === 'touchMoveHandler');
            const touchEndHandlers = target.getEventHandlers('touchend').filter((f) => f.name === 'touchEndHandler');
            touchStartHandlers.map((handler) => handler(startTouch));
            touchMoveHandlers.map((handler) => handler(startTouch));
            touchMoveHandlers.map((handler) => handler(endTouch));
            touchEndHandlers.map((handler) => handler(endTouch));
        }
        const button = $('<button></button>')
            .addClass('next')
            .html('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40" focusable="false"><path d="m15.5 0.932-4.3 4.38 14.5 14.6-14.5 14.5 4.3 4.4 14.6-14.6 4.4-4.3-4.4-4.4-14.6-14.6z"></path></svg>')
            .on('click', (ev) => {
            const infoPopup = document.querySelector('.info.popup');
            swipe(infoPopup, [200, 0], [0, 0]);
            ev.stopPropagation();
            return false;
        })
            .appendTo($('#discover'));
        new MutationObserver((mutations) => mutations
            .filter(({ attributeName }) => attributeName === 'class')
            .map(() => {
            button.prop('disabled', arrow.hasClass('sbgcui_hidden'));
        })).observe(arrow.get(0), { attributes: true });
        setCSS(`
			.i-stat .i-buttons .next {
				display: none;
			}

			[data-feat-replaceSwipeWithButton] .i-stat .i-buttons {
				--discover-right: 1/6;
			}

			[data-feat-replaceSwipeWithButton] .i-stat .i-buttons .next {
				display: block;
				position: absolute;
				width: var(--discover-sibling-right-width);
				right: var(--discover-sibling-right-offset);
				height: calc(100% + 2 * var(--discover-border));
				top: calc(-1 * var(--discover-border));
				color: var(--ingress-btn-color);
				background: linear-gradient(to top, var(--ingress-btn-glow-color) 0%, var(--ingress-btn-bg-color) 30%, var(--ingress-btn-bg-color) 70%, var(--ingress-btn-glow-color) 100%), var(--ingress-btn-bg-color);
				border: 2px solid var(--ingress-btn-border-color);
			}

			[data-feat-replaceSwipeWithButton] .i-stat .i-buttons .next:disabled {
				color: var(--ingress-btn-disabled-color);
				background: var(--ingress-btn-disabled-bg-color);
				border-color: var(--ingress-btn-disabled-accent-color);
			}

			[data-feat-replaceSwipeWithButton] .i-stat .i-buttons .next:active {
				filter: saturate(2);
			}

			[data-feat-replaceSwipeWithButton] .i-stat .i-buttons .next svg {
				height: 16px;
				position: relative;
				top: 2px;
			}

			[data-feat-replaceSwipeWithButton] .i-stat .i-buttons .next svg path {
				fill: currentColor;
			}
		`);
    }
    function showFeatureToggles() {
        const containers = {
            info: $('.info.popup .i-image-box'),
            inventory: $('.inventory.popup'),
        };
        Object.values(containers).forEach((container) => $('<div></div>').addClass('i-buttons i-feature-toggles').appendTo(container));
        const featureToggles = [
            { container: 'info', title: 'CLS', feature: features.get(hideCloseButton) },
            { container: 'info', title: 'REP', feature: features.get(hideRepairButton) },
            { container: 'info', title: 'SWP', feature: features.get(replaceSwipeWithButton) },
            { container: 'info', title: 'TMR', feature: features.get(colorizeTimer) },
            { container: 'inventory', title: 'CUI', feature: features.get(restoreCUISort) },
            { container: 'inventory', title: 'BUT', feature: features.get(moveReferenceButtonsDown) },
            { container: 'inventory', title: 'CLR', feature: features.get(hideManualClearButtons) },
        ];
        for (const { container, title, feature } of featureToggles) {
            const button = $('<button></button>')
                .html(title)
                .toggleClass('off', !feature.isEnabled())
                .appendTo(containers[container].find('.i-buttons'));
            button.on('click', () => {
                const toggleValue = feature.toggle();
                button.toggleClass('off', !toggleValue);
            });
        }
        setCSS(`
			.i-feature-toggles {
				position: absolute !important;
				left: 0;
				bottom: 0;
				justify-content: flex-start;
				direction: ltr;
			}

			.i-feature-toggles button {
				width: auto;
				position: relative;
				z-index: 1;
				font-size: 0.85em;
				min-height: 0px;
				line-height: 1;
			}

			.i-feature-toggles button.off {
				filter: saturate(0.15);
			}
		`);
    }
    function selectTargetPointByClick() {
        ((showInfo) => {
            window.__sbg_function_showInfo = function (data) {
                if (!$('#draw-slider').is(':visible')) {
                    showInfo(data);
                }
                else {
                    const slide = $(`#draw-slider li[data-point="${data}"]`);
                    if (slide.length > 0) {
                        window.__sbg_variable_draw_slider.get().go(slide.index());
                    }
                }
            };
        })(window.__sbg_function_showInfo);
    }
    function highlightSelectedTargetPoint() {
        const highlightsLayer = addLayer('highlights', 'points');
        ((clear) => {
            window.__sbg_variable_temp_lines_source.get().clear = function (fast) {
                clear.call(this, fast);
                highlightsLayer.getSource().clear(fast);
            };
        })(window.__sbg_variable_temp_lines_source.get().clear);
        ((manageDrawing) => {
            window.__sbg_function_manageDrawing = function (event) {
                manageDrawing(event);
                const tempLine = window.__sbg_variable_temp_lines_source.get().getFeatures()[0];
                const tempLineCoords = tempLine.getGeometry().flatCoordinates;
                const highlightFeature = new window.ol.Feature({
                    geometry: new window.ol.geom.Circle([tempLineCoords.slice(tempLineCoords.length - 2)], 16),
                });
                const highlightStyle = new window.ol.style.Style({
                    stroke: new window.ol.style.Stroke({ color: '#F80', width: 3 }),
                });
                highlightFeature.setStyle(highlightStyle);
                highlightsLayer.getSource().addFeature(highlightFeature);
            };
        })(window.__sbg_function_manageDrawing);
    }
    function matchDrawSliderButtons(slider) {
        $('#draw').on('click', (ev) => {
            var _a, _b;
            slider.css({ bottom: `${$(window).height() - ((_a = $(ev.target).offset()) === null || _a === void 0 ? void 0 : _a.top) - $('#draw').outerHeight()}px` });
            slider.find('.draw-slider-buttons').css({ padding: `0 ${(_b = $(ev.target).offset()) === null || _b === void 0 ? void 0 : _b.left}px` });
        });
        setCSS(`
			.draw-slider-buttons {
				gap: 0.25em;
			}

			[data-feat-matchDrawSliderButtons] .draw-slider-wrp {
				transform: translate(-50%, 0);
				top: auto;
			}

			[data-feat-matchDrawSliderButtons] .draw-slider-buttons {
				display: flex;
			}

			[data-feat-matchDrawSliderButtons] .sbgcui_drawslider_sort {
				position: static;
				top: auto;
				width: auto;
			}

			[data-feat-matchDrawSliderButtons] .sbgcui_drawslider_fit {
				display: none;
			}

			[data-feat-matchDrawSliderButtons] #draw-slider-close {
				order: 1;
			}
		`);
    }
    function enableOldWebViewCompatibility() {
        setCSS(`
			@media (max-width: 425px) {
				.popup.pp-center {
					top: 0 !important;
					left: 0 !important;
					transform: none !important;
				}
			}
		`);
    }
    class Builder {
        constructor(buttonsSection) {
            this.features = {};
            this.points = {};
            this.pointStyles = {};
            this.lines = new CoordsMap();
            this.regions = new CoordsMap();
            this.linesMap = new CoordsMap();
            this.regionsMap = new CoordsMap();
            this.drawTeam = 4;
            this.maxDrawAttempts = 3;
            this.initCSS();
            this.initTeam();
            this.initLayers();
            const buttonContainer = this.initButtons(buttonsSection);
            this.initFeatures(buttonContainer);
            this.initData();
            this.initMapClick();
            this.initStates();
            this.initHelpPopup();
            this.initRoutePopup();
            this.initCopyPaste();
            Object.defineProperty(window, 'builder', { value: this });
        }
        initCSS() {
            setCSS(`
				.builder {
					position: relative;
					margin-top: 1em;
					pointer-events: all;
					width: 120px;
				}

				.sbgcui_settings ~ .builder {
					display: none;
				}

				.sbgcui_settings.sbgcui_hidden ~ .builder {
					display: block;
				}

				.builder button {
					display: block;
					margin-bottom: 0.25em;
					width: 100%;
				}

				.builder button.active {
					background: white;
					color: #414141;
					font-weight: bold;
					border-radius: 4px;
				}
			`);
        }
        initTeam() {
            const style = $('#self-info__name').attr('style');
            if (style) {
                const matches = style.match(/team-(\d+)/);
                if (matches) {
                    this.ownTeam = parseInt(matches[1]);
                }
            }
            window.__sbg_variable_TeamColors.get().push({ fill: '#FF880030', stroke: '#F80' });
        }
        initLayers() {
            this.addLayer('lines_built', 'lines');
            this.addLayer('regions_built', 'regions');
            this.addLayer('regions_shared', 'regions');
            layers.get('lines').getSource().on('addfeature', (ev) => {
                this.addLine(ev.feature, this.getLineCoords(ev.feature), { mine: false });
            });
            layers.get('regions').getSource().on('addfeature', (ev) => {
                this.addRegion(ev.feature, this.getRegionCoords(ev.feature), { mine: false });
            });
            layers.get('lines').getSource().getFeatures().forEach((line) => {
                this.addLine(line, this.getLineCoords(line), { mine: false });
            });
            layers.get('regions').getSource().getFeatures().forEach((region) => {
                this.addRegion(region, this.getRegionCoords(region), { mine: false });
            });
        }
        addLayer(layerName, layerLike) {
            const layer = addLayer(layerName, layerLike);
            layers.set(layerName, layer);
        }
        initButtons(container) {
            return $('<div></div>')
                .addClass('builder')
                .appendTo(container);
        }
        initFeatures(buttonContainer) {
            const initialStates = {
                home: false,
                allLines: true,
                builder: false,
                undo: false,
                clear: false,
                route: false,
                copy: false,
                paste: false,
                help: true,
            };
            const actions = {
                home: this.setHome,
                allLines: this.toggleAllLines,
                builder: this.toggle,
                undo: this.undo,
                clear: this.clear,
                route: this.printRoute,
                copy: this.copy,
                paste: this.paste,
                help: this.showHelp,
            };
            for (const button of builderButtons) {
                this.features[button] = new BuilderFeature({
                    name: button,
                    buttonContainer,
                    initialState: initialStates[button],
                    action: actions[button],
                    label: labels.builder.buttons[button],
                    builder: this,
                });
            }
        }
        initData() {
            this.data = new BuilderData(this);
            this.data.load();
        }
        initMapClick() {
            const originalMapClick = window.__sbg_variable_map.get().getListeners('click')[0];
            const extendedMapClick = (ev) => {
                if (this.features.builder.getState()) {
                    this.mapClick(ev);
                }
                else {
                    originalMapClick(ev);
                }
            };
            window.__sbg_variable_map.get().un('click', originalMapClick);
            window.__sbg_variable_map.get().on('click', extendedMapClick);
        }
        mapClick(ev) {
            window.__sbg_variable_map.get().forEachFeatureAtPixel(ev.pixel, async (feature, layer) => {
                console.log(`BUILDER click layer: ${layer.getProperties().name}`);
                if (layer.getProperties().name !== 'points') {
                    return;
                }
                const point = feature;
                const pointCoords = this.getPointCoords(point);
                this.setPointDrawing(point, true);
                if (!this.startPoint) {
                    console.log(`BUILDER clicked: start coords: ${JSON.stringify(pointCoords)}`);
                    this.startPoint = point;
                    return;
                }
                const endPoint = point;
                if (endPoint.getId() === this.startPoint.getId()) {
                    return;
                }
                console.log(`BUILDER clicked: end coords: ${JSON.stringify(pointCoords)}`);
                const lineData = await LineData.load([this.startPoint, endPoint], this);
                const lineBuilt = this.buildLine(lineData);
                this.setPointDrawing(this.startPoint, false);
                this.setPointDrawing(endPoint, false);
                if (lineBuilt) {
                    this.startPoint = undefined;
                }
            });
        }
        getNPoints() {
            const zoom = window.__sbg_variable_map.get().getView().getZoom();
            if (zoom > 10) {
                return 5;
            }
            if (zoom > 7) {
                return 25;
            }
            return 50;
        }
        setPointDrawing(point, drawing) {
            if (drawing) {
                this.pointStyles[point.getId()] = point.getStyle();
                point.setStyle(window.__sbg_variable_FeatureStyles.get().POINT(point.getGeometry().flatCoordinates, this.drawTeam, 1, true));
            }
            else {
                point.setStyle(this.pointStyles[point.getId()]);
            }
        }
        initStates() {
            this.toggleAllLines(!this.features.allLines.getState());
            this.toggle(!this.features.builder.getState());
            this.data.updateStates();
        }
        initHelpPopup() {
            const contents = `
				<h3>${labels.builder.help.title.toString()}</h3>
				<b>${labels.builder.help.buttons.toString()}:</b>
				<ul>
				${Object.values(labels.builder.buttons).map((button) => `<li><b>${button.title.toString()}</b> - ${button.description.toString()}</li>`).join('\n')}
				</ul>
				<b>${labels.builder.issues.title.toString()}:</b>
				<ul>
				${labels.builder.issues.list.map((issue) => `<li>${issue.toString()}</li>`).join('\n')}
				</ul>
			`;
            createPopup('help').prepend(contents);
        }
        initRoutePopup() {
            const routeElement = $('<textarea></textarea>')
                .on('click', (ev) => ev.stopPropagation())
                .on('keydown', (ev) => ev.stopPropagation());
            createPopup('route').prepend(routeElement);
        }
        initCopyPaste() {
            $(document).on('keydown', (ev) => {
                if (ev.ctrlKey) {
                    switch (ev.key) {
                        case 'c':
                            return this.data.copy(true);
                        case 'v':
                            return this.data.paste(true);
                    }
                }
            });
        }
        getCoords(flatCoordinates) {
            const coordsList = window.ol.proj.toLonLat(flatCoordinates);
            return coordsList.map((coord) => parseFloat(coord.toFixed(6)));
        }
        getFlatCoordinates(coords) {
            return window.ol.proj.fromLonLat(coords);
        }
        getArcFlatCoordinates(coordsList) {
            const arcCoords = [];
            for (let i = 1; i < coordsList.length; i++) {
                const arc = window.turf.greatCircle(coordsList[i - 1], coordsList[i], { npoints: this.getNPoints() });
                arcCoords.push(arc.geometry.coordinates);
            }
            return arcCoords.flat().map((coords) => this.getFlatCoordinates(coords));
        }
        getPointCoords(point) {
            const { flatCoordinates } = point.getGeometry();
            return this.getCoords(flatCoordinates);
        }
        getLineCoords(line) {
            const { flatCoordinates } = line.getGeometry();
            const startCoords = this.getCoords([flatCoordinates[0], flatCoordinates[1]]);
            const endCoords = this.getCoords([flatCoordinates[flatCoordinates.length - 2], flatCoordinates[flatCoordinates.length - 1]]);
            return this.createLineCoords(startCoords, endCoords);
        }
        getRegionCoords(region) {
            const { flatCoordinates } = region.getGeometry();
            const startCoords = this.getCoords([flatCoordinates[0], flatCoordinates[1]]);
            const middleCoords = this.getCoords([flatCoordinates[flatCoordinates.length * 1 / 3], flatCoordinates[flatCoordinates.length * 1 / 3 + 1]]);
            const endCoords = this.getCoords([flatCoordinates[flatCoordinates.length * 2 / 3], flatCoordinates[flatCoordinates.length * 2 / 3 + 1]]);
            return this.createRegionCoords(startCoords, middleCoords, endCoords);
        }
        createLineCoords(...coordsList) {
            const sortedCoords = coordsList.sort(function (c1, c2) {
                return c1[0] - c2[0] || c1[1] - c2[1];
            });
            return [sortedCoords[0], sortedCoords[1]];
        }
        createRegionCoords(...coordsList) {
            const sortedCoords = coordsList.sort(function (c1, c2) {
                return c1[0] - c2[0] || c1[1] - c2[1];
            });
            return [sortedCoords[0], sortedCoords[1], sortedCoords[2], sortedCoords[0]];
        }
        addLine(line, lineCoords, { mine }) {
            if (![this.ownTeam, this.drawTeam].includes(line.getProperties().team)) {
                return;
            }
            this.linesMap.create(lineCoords[0], []).push({ coords: lineCoords[1], mine });
            this.linesMap.create(lineCoords[1], []).push({ coords: lineCoords[0], mine });
            this.lines.set(lineCoords, line);
            this.checkRegions(lineCoords, { mine });
        }
        addRegion(region, regionCoords, { mine }) {
            if (![this.ownTeam, this.drawTeam].includes(region.getProperties().team)) {
                return;
            }
            this.regionsMap.create([regionCoords[0], regionCoords[1]], []).push({ region, mine });
            this.regionsMap.create([regionCoords[0], regionCoords[2]], []).push({ region, mine });
            this.regionsMap.create([regionCoords[1], regionCoords[2]], []).push({ region, mine });
            this.regions.set(regionCoords, region);
        }
        buildLine({ linePoints, lineCoords }, attempt = 0) {
            const id = `line.built.${new Date().getTime()}`;
            const layerName = 'lines_built';
            const existingLine = this.lines.get(lineCoords);
            if (existingLine) {
                if (this.features.allLines.getState() || existingLine.getProperties().mine) {
                    console.log(`BUILDER buildLine cancelled, already exists, coords: ${JSON.stringify(lineCoords)}`);
                    return;
                }
                else {
                    console.log(`BUILDER buildLine duplicated, layer: ${layerName}, coords: ${JSON.stringify(lineCoords)}`);
                }
            }
            else {
                console.log(`BUILDER buildLine, layer: ${layerName}, attempt: ${attempt}, coords: ${JSON.stringify(lineCoords)}`);
            }
            const arcFlatCoordinates = this.getArcFlatCoordinates(lineCoords);
            const feature = new window.ol.Feature({ geometry: new window.ol.geom.LineString(arcFlatCoordinates) });
            feature.setId(id);
            feature.setProperties({ team: this.drawTeam, mine: true });
            feature.setStyle(new window.ol.style.Style({
                stroke: new window.ol.style.Stroke({ color: window.__sbg_variable_TeamColors.get()[this.drawTeam].stroke, width: 2 }),
            }));
            const source = layers.get(layerName).getSource();
            const featuresCount = source.getFeatures().length;
            source.addFeature(feature);
            if (source.getFeatures().length === featuresCount) {
                attempt++;
                console.log(`BUILDER buildLine failed, attempt: ${attempt}, coords: ${JSON.stringify(lineCoords)}`);
                if (attempt >= this.maxDrawAttempts) {
                    return;
                }
                this.buildLine({ linePoints, lineCoords }, attempt);
                return;
            }
            this.addLine(feature, lineCoords, { mine: true });
            this.data.add({ linePoints, lineCoords });
            return feature;
        }
        buildRegion(coordsList, shared, attempt = 0) {
            const id = `region.built.${new Date().getTime()}`;
            const layerName = shared ? 'regions_shared' : 'regions_built';
            const regionCoords = this.createRegionCoords(...coordsList);
            const existingRegion = this.regions.get(regionCoords);
            if (existingRegion) {
                if (!this.features.allLines.getState() && !shared && (!existingRegion.getProperties().mine || existingRegion.getProperties().shared)) {
                    console.log(`BUILDER buildRegion duplicated, layer: ${layerName}, coords: ${JSON.stringify(regionCoords)}`);
                }
                else {
                    console.log(`BUILDER buildRegion cancelled, already exists, coords: ${JSON.stringify(regionCoords)}`);
                    return;
                }
            }
            else {
                console.log(`BUILDER buildRegion, layer: ${layerName}, coords: ${JSON.stringify(regionCoords)}`);
            }
            const arcFlatCoordinates = this.getArcFlatCoordinates(regionCoords);
            const feature = new window.ol.Feature({ geometry: new window.ol.geom.Polygon([arcFlatCoordinates]) });
            feature.setId(id);
            feature.setProperties({ team: this.drawTeam, mine: true, shared });
            feature.setStyle(new window.ol.style.Style({
                fill: new window.ol.style.Fill({ color: window.__sbg_variable_TeamColors.get()[this.drawTeam].fill }),
            }));
            const layer = layers.get(layerName);
            const source = layer.getSource();
            const featuresCount = source.getFeatures().length;
            source.addFeature(feature);
            if (source.getFeatures().length === featuresCount) {
                attempt++;
                console.error(`BUILDER buildRegion failed, attempt: ${attempt}, coords: ${JSON.stringify(regionCoords)}`);
                if (attempt >= this.maxDrawAttempts) {
                    return;
                }
                this.buildRegion(coordsList, shared, attempt);
                return;
            }
            this.addRegion(feature, regionCoords, { mine: true });
            return feature;
        }
        checkRegions(lineCoords, { mine }) {
            const startSiblings = this.linesMap.get(lineCoords[0]);
            const endSiblings = this.linesMap.get(lineCoords[1]);
            if (!startSiblings || !endSiblings) {
                return;
            }
            for (const startSibling of startSiblings) {
                for (const endSibling of endSiblings) {
                    if (startSibling.coords[0] === endSibling.coords[0] && startSibling.coords[1] === endSibling.coords[1]) {
                        if (mine || startSibling.mine || endSibling.mine) {
                            const shared = !(mine && startSibling.mine && endSibling.mine);
                            this.buildRegion([...lineCoords, startSibling.coords], shared);
                        }
                    }
                }
            }
        }
        async setHome(previousState) {
            if (previousState) {
                if (!confirm(labels.builder.messages.deleteHome.toString())) {
                    return false;
                }
                delete localStorage.homeCoords;
            }
            else {
                if (!confirm(labels.builder.messages.setHome.toString())) {
                    return false;
                }
                localStorage.homeCoords = JSON.stringify(window.__sbg_variable_map.get().getView().getCenter());
            }
            return true;
        }
        async toggleAllLines(previousState) {
            layers.get('lines').setVisible(!previousState);
            layers.get('regions').setVisible(!previousState);
            layers.get('regions_shared').setVisible(!previousState && this.features.builder.getState());
            return true;
        }
        async toggle(previousState) {
            layers.get('lines_built').setVisible(!previousState);
            layers.get('regions_built').setVisible(!previousState);
            layers.get('regions_shared').setVisible(!previousState && this.features.allLines.getState());
            this.features.builder.setState(!previousState);
            this.data.updateStates();
        }
        async undo(previousState) {
            if (!previousState) {
                return false;
            }
            const { lineCoords } = this.data.pop() || {};
            if (lineCoords) {
                const lastLine = this.lines.get(lineCoords);
                if (!lastLine) {
                    console.log(`undo: line not found, coords: ${JSON.stringify(lineCoords)}`);
                    return false;
                }
                layers.get('lines_built').getSource().removeFeature(lastLine);
                this.lines.deleteMine(lineCoords);
                const regions = this.regionsMap.get(lineCoords);
                if (regions) {
                    regions.filter(({ mine }) => mine).forEach(({ region }) => {
                        layers.get('regions_built').getSource().removeFeature(region);
                        layers.get('regions_shared').getSource().removeFeature(region);
                        this.regions.deleteMine(this.getRegionCoords(region));
                    });
                }
            }
            return false;
        }
        async clear(previousState) {
            if (!previousState) {
                return false;
            }
            layers.get('lines_built').getSource().clear();
            layers.get('regions_built').getSource().clear();
            layers.get('regions_shared').getSource().clear();
            this.data.clear();
            this.lines.clearMine();
            this.regions.clearMine();
            this.linesMap.clearMine();
            this.regionsMap.clearMine();
            this.startPoint = undefined;
            return false;
        }
        async printRoute(previousState) {
            if (!previousState) {
                return false;
            }
            const route = this.data.getRoute();
            $('.route.popup').find('textarea').val(route).end().removeClass('hidden');
        }
        async copy(previousState) {
            return this.data.copy(previousState);
        }
        async paste(previousState) {
            return this.data.paste(previousState);
        }
        async showHelp(_previousState) {
            $('.help').removeClass('hidden');
        }
    }
    class BuilderFeature {
        constructor({ name, action, initialState, label, buttonContainer, builder }) {
            this.name = name;
            this.action = action.bind(builder);
            this.button = this.createButton(label, buttonContainer);
            this.initState(initialState);
        }
        getState() {
            return this.state.value;
        }
        setState(value) {
            this.state.value = value;
        }
        setButtonState() {
            this.button.toggleClass('active', this.state.value);
        }
        initState(initialState) {
            const value = this.loadState(initialState);
            this.state = new Proxy({ value }, {
                get: (data, property) => data[property],
                set: (data, property, value) => {
                    const storageKey = this.getStorageKey();
                    localStorage[storageKey] = value ? '1' : '0';
                    data[property] = value;
                    this.setButtonState();
                    return true;
                },
            });
            this.setButtonState();
        }
        loadState(initialState) {
            const storageKey = this.getStorageKey();
            const storageValue = localStorage[storageKey];
            return storageValue === undefined || storageValue.length === 0 ? initialState : storageValue === '1';
        }
        getStorageKey() {
            return `sbg-plus-state-${this.name}`;
        }
        createButton(label, buttonContainer) {
            const element = $('<button></button>')
                .html(label.title.toString().toUpperCase())
                .attr('title', label.description.toString())
                .appendTo(buttonContainer);
            element.on('click', async () => {
                if (await this.action(this.state.value)) {
                    this.state.value = !this.state.value;
                }
            });
            return element;
        }
    }
    class BuilderData {
        constructor(builder) {
            this.storageKey = 'builderData';
            this.builder = builder;
            this.data = [];
        }
        add(lineData) {
            this.data.push(lineData);
            this.updateStates();
            this.save();
        }
        pop() {
            const lastLineData = this.data.pop();
            this.updateStates();
            this.save();
            return lastLineData;
        }
        clear() {
            this.data = [];
            this.updateStates();
            this.save();
        }
        count() {
            return this.data.length;
        }
        updateStates() {
            const isActive = this.builder.features.builder.getState();
            const isData = this.data.length > 0;
            this.builder.features.undo.setState(isActive && isData);
            this.builder.features.clear.setState(isActive && isData);
            this.builder.features.route.setState(isActive && isData);
            this.builder.features.copy.setState(isActive && isData);
            this.builder.features.paste.setState(isActive);
        }
        save() {
            localStorage[this.storageKey] = JSON.stringify(BuilderData.pack(this.data));
            console.log(`BUILDER saved lines: ${this.data.length}`);
        }
        load() {
            const stored = localStorage[this.storageKey];
            if (stored) {
                this.set(stored);
            }
        }
        set(text) {
            const parsed = this.parse(text);
            if ('error' in parsed) {
                alert(parsed.error.toString());
                return;
            }
            const data = BuilderData.unpack(parsed.pack);
            for (const lineCoords of data) {
                this.builder.buildLine(lineCoords);
            }
        }
        static pack(data) {
            const pointsMap = new CoordsMap();
            const lines = [];
            for (const { lineCoords, linePoints } of data) {
                lines.push(lineCoords);
                linePoints.forEach((linePoint) => {
                    pointsMap.set(linePoint.coords, linePoint);
                });
            }
            return { points: pointsMap.getData(), lines };
        }
        static unpack(pack) {
            const data = [];
            const pointsMap = new CoordsMap(pack.points);
            for (const lineCoords of pack.lines) {
                const points = [pointsMap.get(lineCoords[0]), pointsMap.get(lineCoords[1])];
                const lineData = new LineData(points, lineCoords);
                data.push(lineData);
            }
            return data;
        }
        parse(text) {
            let pack;
            try {
                pack = JSON.parse(text);
            }
            catch (ex) {
                return { error: labels.builder.validationErrors.json };
            }
            const validator = new BuilderDataPackValidator(labels.builder.validationErrors);
            if (!validator.validate(pack)) {
                return { error: validator.getError() };
            }
            return { pack };
        }
        async copy(previousState) {
            if (!previousState) {
                return false;
            }
            await navigator.clipboard.writeText(JSON.stringify(BuilderData.pack(this.data)));
            alert(labels.builder.messages.copied.toString());
        }
        async paste(previousState) {
            if (!previousState) {
                return false;
            }
            const text = await navigator.clipboard.readText();
            if (!text.trim()) {
                alert(labels.builder.validationErrors.empty.toString());
            }
            this.set(text);
        }
        getRoute() {
            return this.data.map((line) => line.linePoints.map((point) => point.title).join(' => ')).join('\n');
        }
    }
    class LineData {
        constructor(linePoints, lineCoords) {
            this.linePoints = linePoints;
            this.lineCoords = lineCoords;
        }
        static async load(points, builder) {
            const promises = points.map((point) => PointData.resolve(point, builder));
            const linePoints = await Promise.all(promises);
            const lineCoords = builder.createLineCoords(linePoints[0].coords, linePoints[1].coords);
            return new LineData(linePoints, lineCoords);
        }
    }
    class PointData {
        constructor() { }
        static async resolve(point, builder) {
            const pointData = new PointData();
            pointData.guid = point.getId();
            pointData.title = await PointData.getPointTitle(pointData.guid, builder.points);
            pointData.coords = builder.getPointCoords(point);
            return pointData;
        }
        static async getPointTitle(guid, points) {
            if (!points[guid]) {
                const { response } = await window.__sbg_function_apiQuery('point', { guid });
                points[guid] = response.data.t;
            }
            return points[guid];
        }
    }
    const validTypeOf = typeof {};
    class BuilderDataPackValidator {
        constructor(validationErrors) {
            this.validationErrors = validationErrors;
        }
        validate(pack) {
            return this.checkObject(pack)
                && this.checkObjectProperties(pack)
                && this.checkPoints(pack.points)
                && this.checkPointsCoords(pack.points)
                && this.checkLines(pack.lines)
                && this.checkLinesCoords(pack.lines);
        }
        isObject(obj, properties) {
            if (Object.keys(obj).length !== Object.keys(properties).length) {
                return false;
            }
            for (const propertyName in properties) {
                const propertyType = properties[propertyName];
                if (!(propertyName in obj && typeof obj[propertyName] === propertyType)) {
                    return false;
                }
            }
            return true;
        }
        isArray(array, length, type) {
            if (!Array.isArray(array)) {
                return false;
            }
            if (array.length !== length) {
                return false;
            }
            for (const item of array) {
                if (typeof item !== type) {
                    return false;
                }
            }
            return true;
        }
        checkObject(pack) {
            if (typeof pack !== 'object') {
                this.validationError = this.validationErrors.object;
                return false;
            }
            return true;
        }
        checkObjectProperties(pack) {
            if (!this.isObject(pack, { points: 'object', lines: 'object' })) {
                this.validationError = this.validationErrors.objectProperties;
                return false;
            }
            return true;
        }
        checkPoints(points) {
            if (Object.values(points).filter((point) => !this.isObject(point, { guid: 'string', title: 'string', coords: 'object' })).length > 0) {
                this.validationError = this.validationErrors.pointProperties;
                return false;
            }
            return true;
        }
        checkPointsCoords(points) {
            if (Object.values(points).map((point) => point.coords).filter((coords) => !this.isArray(coords, 2, 'number')).length > 0) {
                this.validationError = this.validationErrors.pointCoords;
                return false;
            }
            return true;
        }
        checkLines(lines) {
            if (!Array.isArray(lines) || lines.filter((lineCoords) => !this.isArray(lineCoords, 2, 'object')).length > 0) {
                this.validationError = this.validationErrors.lines;
                return false;
            }
            return true;
        }
        checkLinesCoords(lines) {
            if (lines.flat().filter((coords) => !this.isArray(coords, 2, 'number')).length > 0) {
                this.validationError = this.validationErrors.linesCoords;
                return false;
            }
            return true;
        }
        getError() {
            return this.validationError;
        }
    }
    class CoordsMap {
        constructor(data = {}) {
            this.data = data;
        }
        stringifyKey(key) {
            return typeof key === 'string'
                ? key
                : key.map((item) => Array.isArray(item) ? item.join(',') : item).join(',');
        }
        getData() {
            return this.data;
        }
        get(key) {
            return this.data[this.stringifyKey(key)];
        }
        set(key, value) {
            this.data[this.stringifyKey(key)] = value;
        }
        create(key, initialValue) {
            if (!this.has(key)) {
                this.set(key, initialValue);
            }
            return this.get(key);
        }
        has(key) {
            return this.stringifyKey(key) in this.data;
        }
        forEach(func) {
            for (const key in this.data) {
                func(this.data[key], key);
            }
        }
        deleteMine(key) {
            const stringKey = this.stringifyKey(key);
            const item = this.data[stringKey];
            if (item instanceof window.ol.Feature && item.getProperties().mine) {
                delete this.data[stringKey];
            }
            if (Array.isArray(item)) {
                const others = item.filter((subItem) => !subItem.mine);
                if (others.length === 0) {
                    delete this.data[stringKey];
                }
                else {
                    this.data[stringKey] = others;
                }
            }
        }
        clearMine() {
            Object.keys(this.data).forEach((key) => {
                this.deleteMine(key);
            });
        }
    }
    class SettingsPopup {
        constructor() {
            this.sections = {};
            this.checkboxes = {};
            this.render();
            Object.keys(features.groups).map((group) => {
                const groupFeatures = features.groups[group].filter((feature) => feature.isAvailable());
                if (groupFeatures.length === 0 && group !== 'custom') {
                    return;
                }
                this.addGroup(group);
                groupFeatures.map((feature) => this.addFeature(feature));
            });
            features.on('add', (feature) => this.addFeature(feature), {});
            features.on('check', ({ feature, value }) => this.check(feature, value), {});
        }
        render() {
            const parentSettingsPopup = $('.settings');
            const settingsPopup = createPopup('sbg-plus-settings', { roundClose: false }).appendTo(parentSettingsPopup);
            this.container = $('<div></div>').addClass('settings-content');
            const settingsTitle = $('<h3></h3>').text(labels.settings.title.toString());
            settingsPopup.prepend(settingsTitle, this.container);
            const saveButton = $('<button></button>')
                .text(labels.save.toString())
                .on('click', () => {
                settings.save();
                window.location.reload();
            });
            const logsButton = $('<button></button>')
                .addClass('popup-button-secondary')
                .text(labels.settings.logs.toString())
                .on('click', () => {
                copyLogs();
            });
            const advancedButton = $('<button></button>')
                .addClass('popup-button-secondary')
                .text(labels.settings.advanced.toString())
                .on('click', () => {
                advancedButton.toggleClass('popup-button-secondary');
                settingsPopup.toggleClass('advanced');
            });
            settingsPopup.find('.buttons').prepend(saveButton);
            settingsPopup.find('.buttons').append(logsButton);
            settingsPopup.find('.buttons').append(advancedButton);
            const settingsButton = $('<button></button>')
                .addClass('settings-section__button')
                .text(labels.settings.button.toString())
                .on('click', () => settingsPopup.removeClass('hidden'));
            const settingsLabel = this.renderSetting(true, labels.settings.title, settingsButton);
            $('.settings .settings-section:first .settings-section__item:first').before(settingsLabel);
            const versionValue = $('<span></span>').text(`v${window.__sbg_plus_version}`);
            const versionLabel = this.renderSetting(true, labels.settings.version, versionValue);
            $('.settings [data-i18n="settings.about.version"]').parent().after(versionLabel);
        }
        addGroup(group) {
            const featureGroup = featureGroups[group];
            const sectionTitle = $('<h4></h4>').text(new Label(featureGroup).toString());
            const section = $('<div></div>').addClass('settings-section').append(sectionTitle);
            this.sections[group] = section;
            this.container.append(section);
        }
        addFeature(feature) {
            const checkbox = this.renderFeatureCheckbox(feature);
            const setting = this.renderSetting(feature.isSimple(), checkbox, feature.label);
            this.sections[feature.group].find('h4').before(setting);
            this.checkboxes[feature.key] = checkbox;
        }
        check(feature, value) {
            settings.setFeature(feature.key, value);
            this.checkboxes[feature.key].prop('checked', value);
        }
        renderSetting(isSimple, ...children) {
            const settingLabel = $('<label></label>').addClass('settings-section__item').toggleClass('simple', isSimple);
            for (const child of children) {
                const element = child instanceof Label ? $('<span></span>').text(child.toString()) : child;
                settingLabel.append(element);
            }
            return settingLabel;
        }
        renderFeatureCheckbox(feature) {
            return $('<input type="checkbox" />')
                .prop('checked', feature.isEnabled())
                .on('change', (ev) => {
                feature.setEnabled(ev.target.checked);
            });
        }
    }
    main();
})();
