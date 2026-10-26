# OmniKit — Zero-Knowledge Client-Side Web Utilities & Tools

[![npm version](https://img.shields.io/npm/v/omnikit-tools.svg?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/omnikit-tools)
[![Website](https://img.shields.io/badge/Production%20Website-omnikit.tech-6366f1?style=for-the-badge&logo=google-chrome&logoColor=white)](https://omnikit.tech)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Client--Side-10b981?style=for-the-badge)](https://omnikit.tech)
[![Server Uploads](https://img.shields.io/badge/Server%20Uploads-0%20Bytes-06b6d4?style=for-the-badge)](https://omnikit.tech)
[![PWA](https://img.shields.io/badge/PWA-Installable%20%26%20Offline-8b5cf6?style=for-the-badge)](https://omnikit.tech)

A comprehensive open-source collection of **50+ high-performance client-side browser utilities, converters, media processors, and hardware diagnostics**.  
**100% in-browser processing. Zero server compute. Zero data leakage.**

<p align="center">
  <img src="assets/images/omnikit-showcase.png" alt="OmniKit Web Application Interface" width="100%" />
</p>

<p align="center">
  <img src="assets/images/workflow-batch.svg" alt="Batch Processing 100+ Photos Workflow" width="100%" />
</p>

- Production Web App: [https://omnikit.tech](https://omnikit.tech) (Default English at root `/`, with full internationalization for 5 languages: English `/`, Russian `/ru/`, French `/fr/`, Spanish `/es/`, German `/de/`)
- Official Tools Repository: [https://github.com/Morendais/omnikit.tech](https://github.com/Morendais/omnikit.tech)
- Author: [Morendais](https://github.com/Morendais)
- License: MIT

> **Note on Repository Scope:** This public repository contains **strictly the client-side tool engine and utility modules** (`index.js`, `tools/*.js`, automated test suite). The website frontend infrastructure, templates, and deployment scripts are maintained in a private repository. This structure ensures production security while guaranteeing 100% open-source transparency for all algorithmic tool logic.

[English](#english) | [Русский](#russian)

---

<a name="english"></a>
## English

### Open Source Proof of Privacy

This GitHub repository provides verifiable, open-source proof of privacy for users of [omnikit.tech](https://omnikit.tech).

All tool logic hosted on omnikit.tech is published here in plain, unminified JavaScript. Anyone can independently inspect, audit, and verify that:
1. **Zero Data Uploads:** Files, audio buffers, webcam frames, and text inputs are never uploaded to any remote server or third-party cloud.
2. **100% Client-Side Execution:** All computation runs entirely inside the user's browser using native Web APIs (Web Audio, Web Crypto, HTML5 Canvas, Web Workers, MediaDevices, ONNX Runtime Web).
3. **Zero Keystroke Logging:** Inputs in sensitive tools (Password Generator, JWT Decoder, Diff Checker) are never recorded or transmitted.
4. **Verifiable via DevTools:** Open the Network tab in your browser developer tools (F12) while performing any conversion or diagnostic test. Exactly 0 bytes of user data are transmitted.
5. **Multilingual Support:** The web platform natively supports 5 languages: English (`/`), Russian (`/ru/`), French (`/fr/`), Spanish (`/es/`), and German (`/de/`).

---

> **Note on Analytics & Privacy:** The `omnikit-tools` open-source library contains **zero tracking, zero analytics, and zero external telemetry**. The showcase website ([omnikit.tech](https://omnikit.tech)) uses optional privacy-compliant analytics (Yandex Metrika / Google Analytics) **strictly after explicit user cookie consent**; all tools and data processing execute 100% locally on your machine without transmitting any user files or inputs.

---

### Directory of Live Tools

Every tool can be launched directly in your browser:

#### Hardware Diagnostics

| Tool | Live Web Link | Description |
| :--- | :--- | :--- |
| **Online Microphone Test** | [Launch Online](https://omnikit.tech/mic-test) | Audio frequency visualizer, decibel meter and voice test |
| **Online Webcam Test** | [Launch Online](https://omnikit.tech/webcam-test) | Resolution check, live FPS counter, mirror and snapshot |
| **Online Keyboard Test** | [Launch Online](https://omnikit.tech/keyboard-test) | 104-key state matrix, stuck key detection and ghosting test |
| **Online Mouse Test** | [Launch Online](https://omnikit.tech/mouse-test) | Double-click chatter detection, scroll wheel speed, CPS test |
| **Monitor Test** | [Launch Online](https://omnikit.tech/monitor-test) | Screen diagnostics, dead pixel finder, color uniformity & ghosting test |

#### Image & Media Processing

| Tool | Live Web Link | Description |
| :--- | :--- | :--- |
| **HEIC to JPG / PNG** | [Launch Online](https://omnikit.tech/heic-to-jpg) | Convert Apple iPhone HEIC/HEIF photos to JPG or PNG |
| **Image Compressor** | [Launch Online](https://omnikit.tech/image-compressor) | Lossless & lossy compression for PNG, JPG, WebP |
| **Image Converter** | [Launch Online](https://omnikit.tech/image-converter) | Convert between PNG, JPG, WebP with zero quality loss |
| **Image Resizer** | [Launch Online](https://omnikit.tech/image-resizer) | Scale dimensions, preset aspect ratios (1:1, 16:9, 4:3), rotate |
| **Background Remover** | [Launch Online](https://omnikit.tech/background-remover) | In-browser neural segmentation (U2-Net INT8 ONNX) with 100% client-side privacy |
| **Online Signature** | [Launch Online](https://omnikit.tech/online-signature) | Smooth vector ink drawing, typography cursive mode, transparent PNG/SVG export |
| **Watermark Studio** | [Launch Online](https://omnikit.tech/watermark) | Draggable watermarks, custom typography, HSL color spectrum |
| **Favicon Generator** | [Launch Online](https://omnikit.tech/favicon-generator) | Multi-resolution Windows ICO (16x16, 32x32, 48x48) & PNG favicons |
| **SVG to PNG Converter** | [Launch Online](https://omnikit.tech/svg-to-png) | Vector SVG rasterizer up to 4x Retina with XSS sanitization |
| **EXIF Metadata Remover** | [Launch Online](https://omnikit.tech/exif-remover) | Strip GPS coordinates, camera model, and privacy metadata |
| **OCR Text Recognition** | [Launch Online](https://omnikit.tech/image-to-text) | Extract text from scans and images in your browser |
| **Audio Speed & Pitch** | [Launch Online](https://omnikit.tech/audio-speed-changer) | Adjust tempo, shift pitch, Slowed + Reverb, Nightcore |
| **Speech-to-Text Transcribe** | [Launch Online](https://omnikit.tech/transcribe) | In-browser speech recognition (Whisper AI), subtitle generator (SRT/VTT) |
| **Video Crop & Reframe** | [Launch Online](https://omnikit.tech/video-crop) | Crop video frames, reframe aspect ratios (9:16, 1:1, 16:9) entirely in-browser |
| **Video to GIF & Audio Suite** | [Launch Online](https://omnikit.tech/video-to-gif) | Video to animated GIF, GIF to video, format converter & audio extractor |
| **PNG to JPG Converter** | [Launch Online](https://omnikit.tech/png-to-jpg) | Instant format change with background fill |
| **WebP to JPG Converter** | [Launch Online](https://omnikit.tech/webp-to-jpg) | Universal WebP to standard JPEG converter |
| **WebP to PNG Converter** | [Launch Online](https://omnikit.tech/webp-to-png) | Convert WebP to lossless transparent PNG |

#### PDF Suite

| Tool | Live Web Link | Description |
| :--- | :--- | :--- |
| **Images to PDF** | [Launch Online](https://omnikit.tech/images-to-pdf) | Compile photos and scans into a single formatted PDF |
| **Merge PDF** | [Launch Online](https://omnikit.tech/merge-pdf) | Combine multiple PDF documents into one with page reordering |
| **Split PDF** | [Launch Online](https://omnikit.tech/split-pdf) | Extract specific page ranges or split into individual pages |
| **PDF to JPG** | [Launch Online](https://omnikit.tech/pdf-to-jpg) | Render and extract high-resolution PDF pages as JPG images |

#### Developer Utilities

| Tool | Live Web Link | Description |
| :--- | :--- | :--- |
| **JSON Formatter & Validator** | [Launch Online](https://omnikit.tech/json-formatter) | Beautify, minify, validate strict syntax and copy clean JSON |
| **JWT Decoder & Epoch Time** | [Launch Online](https://omnikit.tech/jwt-decoder) | Decode base64url claims and translate Unix timestamps without secrets |
| **Password Generator** | [Launch Online](https://omnikit.tech/password-generator) | Cryptographically secure passwords with WebCrypto entropy check |
| **Cryptographic Hashes** | [Launch Online](https://omnikit.tech/hash-generator) | Instant client-side calculation of SHA-256, SHA-512, MD5 |
| **Base64 Converter** | [Launch Online](https://omnikit.tech/base64-converter) | UTF-8 compliant text and data Base64 encode/decode |
| **Number Base Converter** | [Launch Online](https://omnikit.tech/base-converter) | Arbitrary base conversion (2–36), BigInt precision, fractional radices & bitwise math |
| **Unit Converter** | [Launch Online](https://omnikit.tech/unit-converter) | Metric ↔ imperial unit converter (length, mass, temperature, area, speed, data) |
| **Unix Timestamp Converter** | [Launch Online](https://omnikit.tech/unix-timestamp) | Live epoch clock, timestamp to ISO/UTC conversion, batch parser |
| **CSS Box-Shadow Generator** | [Launch Online](https://omnikit.tech/box-shadow-generator) | Multi-layer visual shadow designer with instant CSS & Tailwind code output |
| **RegEx Tester & Evaluator** | [Launch Online](https://omnikit.tech/regex-tester) | Interactive regular expression tester with live match highlighting |
| **CSV to JSON Converter** | [Launch Online](https://omnikit.tech/csv-to-json) | RFC 4180 compliant tabular CSV to structured JSON parser |
| **UTM Builder & URL Encode** | [Launch Online](https://omnikit.tech/utm-generator) | Generate marketing campaign tracking URLs and encode query strings |
| **AI Token Counter** | [Launch Online](https://omnikit.tech/token-counter) | BPE token estimation & pricing for OpenAI, Anthropic, Google, DeepSeek |
| **Color Studio & EyeDropper** | [Launch Online](https://omnikit.tech/color-converter) | Screen EyeDropper and instant HEX, RGB, HSL color conversion |
| **QR Code Generator & Scanner** | [Launch Online](https://omnikit.tech/qr-generator) | Custom QR codes for Wi-Fi, links, crypto, plus image scanner |

#### Text & Office Tools

| Tool | Live Web Link | Description |
| :--- | :--- | :--- |
| **Text & Word Counter** | [Launch Online](https://omnikit.tech/text-counter) | Character, word, line counts and social media limit indicators |
| **Text Diff Checker** | [Launch Online](https://omnikit.tech/diff-checker) | Side-by-side text comparison with highlighted additions and deletions |
| **Text Case Converter** | [Launch Online](https://omnikit.tech/case-converter) | UPPERCASE, lowercase, Title Case, camelCase, snake_case |
| **Text Cleaner & Notepad** | [Launch Online](https://omnikit.tech/txt-editor) | Deduplicate lines, sort alphabetically, trim excess whitespace |
| **Transliteration & URL Slug** | [Launch Online](https://omnikit.tech/translit) | Convert Cyrillic to Latin and generate clean SEO URL slugs |
| **Number to Words Converter** | [Launch Online](https://omnikit.tech/num-to-words) | Spell currency amounts and cardinal numbers in Russian and English |

### Architecture & Privacy Model

- **Zero Network Uploads:** File conversions and data parsing occur purely in client RAM.
- **Offline-First:** All computation logic is self-contained and works with offline service worker support.
- **Zero Tracking:** Pure algorithm implementations without analytics or keystroke logging.
- **Standards Compliant:** WebAssembly, Web Audio API, Canvas 2D, WebCrypto, PDF.js, ONNX Runtime Web.

### Quick Start & Testing

```bash
# 1. Clone the repository
git clone https://github.com/Morendais/omnikit.tech.git
cd omnikit.tech

# 2. Run automated test suite across all 27 tool modules
npm test
```

### Standalone Library Usage (Node.js & CommonJS)

The standalone modules can also be imported directly in JavaScript / Node.js projects:

```javascript
const { DevTools, TextTools, OfficeTools, BaseConverter, UnitConverter } = require('./index.js');

// Example: Calculate MD5 (RFC 1321)
const hash = DevTools.fastMd5('hello');
console.log('MD5:', hash);

// Example: Generate secure password (16 chars)
const password = DevTools.generatePassword(16);
console.log('Password:', password);

// Example: Base conversion (Hex to Binary)
const val = BaseConverter.parseValue('FF', 16);
console.log('Binary:', BaseConverter.bigToBase(val.int, 2)); // '11111111'

// Example: Temperature conversion
const catTemp = UnitConverter.CATS.find(c => c.id === 'temp');
const c = UnitConverter.toBase(catTemp, 'c', 100);
console.log('Fahrenheit:', UnitConverter.fromBase(catTemp, 'f', c)); // 212

// Example: Number to words
console.log(OfficeTools.spellEnglishNumber(125));
// Output: "one hundred twenty-five"
```

---

<a name="russian"></a>
## Русский

### Открытое доказательство приватности

Этот репозиторий на GitHub создан для независимого подтверждения безопасности и приватности сервиса [omnikit.tech](https://omnikit.tech).

Весь алгоритмический код инструментов, работающих на сайте, открыт для публичного аудита:
1. **Ноль загрузок на сервер:** Ваши файлы, снимки с веб-камеры, аудиопоток с микрофона и вводимый текст никогда не покидают ваше устройство.
2. **100% клиентская обработка:** Все вычисления производятся в оперативной памяти браузера с помощью стандартных Web API (Web Audio, Web Crypto, HTML5 Canvas, Web Workers, MediaDevices, ONNX Runtime Web).
3. **Защита ввода:** Данные в чувствительных инструментах (генератор паролей, JWT-декодер, Diff-чекер) никогда не сохраняются и не логируются.
4. **Проверяемо через DevTools:** Откройте вкладку Network (F12) в браузере при работе с любым инструментом на сайте — исходящий трафик с вашими данными равен 0 байт.
5. **Мультиязычность:** Платформа полностью переведена на 5 языков: русский (`/ru/`), английский (`/`), французский (`/fr/`), испанский (`/es/`) и немецкий (`/de/`).

---

> **О структуре проекта:** В этом открытом репозитории опубликован **исключительно код инструментов и вспомогательных модулей** (`index.js`, `tools/*.js`, тесты). Код веб-сайта, HTML-шаблоны и скрипты сборки находятся в приватном репозитории для обеспечения безопасности инфраструктуры.

> **Примечание о приватности и аналитике:** Код открытой библиотеки `omnikit-tools` **не содержит трекеров, телеметрии и сторонних запросов**. Витринный веб-сервис ([omnikit.tech](https://omnikit.tech)) использует веб-аналитику (Яндекс Метрика / Google Analytics) **строго после явного согласия пользователя в cookie-баннере**; сами алгоритмы и файлы никогда не покидают ваше устройство.

---

### Каталог онлайн-инструментов

Каждый инструмент доступен по прямой постоянной ссылке в браузере:

#### Диагностика оборудования

| Инструмент | Прямая ссылка | Описание |
| :--- | :--- | :--- |
| **Тест микрофона онлайн** | [Открыть инструмент](https://omnikit.tech/ru/mic-test) | Анализатор частот, измерение громкости и проверка звука |
| **Тест веб-камеры онлайн** | [Открыть инструмент](https://omnikit.tech/ru/webcam-test) | Проверка разрешения, счетчик FPS, зеркало и моментальный снимок |
| **Тест клавиатуры онлайн** | [Открыть инструмент](https://omnikit.tech/ru/keyboard-test) | Проверка всех клавиш, залипаний и мульти-нажатий (NKRO) |
| **Тест мыши онлайн** | [Открыть инструмент](https://omnikit.tech/ru/mouse-test) | Детектор аппаратного дабл-клика, тест скролла и скорости кликов |
| **Тест монитора** | [Открыть инструмент](https://omnikit.tech/ru/monitor-test) | Проверка экрана на битые пиксели, равномерность цвета и гостинг |

#### Работа с медиа и изображениями

| Инструмент | Прямая ссылка | Описание |
| :--- | :--- | :--- |
| **HEIC в JPG / PNG** | [Открыть инструмент](https://omnikit.tech/ru/heic-to-jpg) | Конвертация фото с iPhone (HEIC) в стандартный JPG или PNG |
| **Сжатие изображений** | [Открыть инструмент](https://omnikit.tech/ru/image-compressor) | Сжатие PNG, JPG, WebP с точной настройкой качества |
| **Конвертер изображений** | [Открыть инструмент](https://omnikit.tech/ru/image-converter) | Быстрая смена формата PNG, JPG, WebP без потери качества |
| **Изменение размера фото** | [Открыть инструмент](https://omnikit.tech/ru/image-resizer) | Масштабирование, пропорции 1:1, 16:9, 4:3 и поворот фото |
| **Удаление фона с фото** | [Открыть инструмент](https://omnikit.tech/ru/background-remover) | Локальное удаление фона с фото (U2-Net INT8 ONNX) в прозрачный PNG |
| **Онлайн-подпись** | [Открыть инструмент](https://omnikit.tech/ru/online-signature) | Рисование плавной векторной подписи, рукописные шрифты, экспорт в PNG/SVG |
| **Водяной знак на фото** | [Открыть инструмент](https://omnikit.tech/ru/watermark) | Наложение водяных знаков, выбор цвета по HSL, шрифты и логотипы |
| **Генератор Favicon** | [Открыть инструмент](https://omnikit.tech/ru/favicon-generator) | Создание пакета иконок для сайта (favicon.ico и PNG) |
| **SVG в PNG** | [Открыть инструмент](https://omnikit.tech/ru/svg-to-png) | Рендеринг векторного SVG в PNG высокого разрешения |
| **Очистка EXIF данных** | [Открыть инструмент](https://omnikit.tech/ru/exif-remover) | Удаление геолокации, модели камеры и скрытых метаданных |
| **Распознавание текста (OCR)** | [Открыть инструмент](https://omnikit.tech/ru/image-to-text) | Браузерное оптическое распознавание текста с картинок |
| **Скорость и тональность аудио** | [Открыть инструмент](https://omnikit.tech/ru/audio-speed-changer) | Управление темпом, тональностью, Slowed + Reverb и Nightcore |
| **Транскрибация аудио (Whisper)** | [Открыть инструмент](https://omnikit.tech/ru/transcribe) | Браузерное распознавание речи в текст и создание субтитров (SRT/VTT) |
| **Кадрирование видео (Crop)** | [Открыть инструмент](https://omnikit.tech/ru/video-crop) | Обрезка и изменение пропорций видео (9:16, 1:1, 16:9) локально в браузере |
| **Видео в GIF и Аудио Suite** | [Открыть инструмент](https://omnikit.tech/ru/video-to-gif) | Конвертер видео в анимированный GIF, GIF в видео, сжатие и извлечение аудио |
| **PNG в JPG** | [Открыть инструмент](https://omnikit.tech/ru/png-to-jpg) | Конвертация PNG в JPG с заливкой прозрачности |
| **WebP в JPG** | [Открыть инструмент](https://omnikit.tech/ru/webp-to-jpg) | Конвертация современных фото WebP в JPG |
| **WebP в PNG** | [Открыть инструмент](https://omnikit.tech/ru/webp-to-png) | Конвертация WebP в PNG с сохранением прозрачности |

#### Работа с PDF

| Инструмент | Прямая ссылка | Описание |
| :--- | :--- | :--- |
| **Картинки в PDF** | [Открыть инструмент](https://omnikit.tech/ru/images-to-pdf) | Сборка фотографий и сканов в единый PDF документ |
| **Объединить PDF** | [Открыть инструмент](https://omnikit.tech/ru/merge-pdf) | Склейка нескольких PDF файлов в один с сортировкой |
| **Разделить PDF** | [Открыть инструмент](https://omnikit.tech/ru/split-pdf) | Извлечение нужных страниц или разбивка на части |
| **PDF в JPG** | [Открыть инструмент](https://omnikit.tech/ru/pdf-to-jpg) | Рендеринг и сохранение страниц PDF в виде картинок JPG |

#### Инструменты разработчика

| Инструмент | Прямая ссылка | Описание |
| :--- | :--- | :--- |
| **JSON Форматтер** | [Открыть инструмент](https://omnikit.tech/ru/json-formatter) | Форматирование с отступами, сжатие и валидация JSON |
| **JWT Декодер и Timestamp** | [Открыть инструмент](https://omnikit.tech/ru/jwt-decoder) | Расшифровка токенов JWT и перевод Unix времени |
| **Генератор паролей** | [Открыть инструмент](https://omnikit.tech/ru/password-generator) | Криптостойкие пароли с расчетом энтропии через WebCrypto |
| **Хеширование данных** | [Открыть инструмент](https://omnikit.tech/ru/hash-generator) | Расчет контрольных сумм SHA-256, SHA-512, MD5 |
| **Base64 Кодировщик** | [Открыть инструмент](https://omnikit.tech/ru/base64-converter) | Кодирование и декодирование Base64 с поддержкой UTF-8 |
| **Конвертер систем счисления** | [Открыть инструмент](https://omnikit.tech/ru/base-converter) | Перевод чисел между системами (2–36), BigInt точность, дробные числа и калькулятор |
| **Конвертер физических единиц** | [Открыть инструмент](https://omnikit.tech/ru/unit-converter) | Метрические и имперские единицы (длина, масса, температура, площадь, скорость, данные) |
| **Конвертер Unix Timestamp** | [Открыть инструмент](https://omnikit.tech/ru/unix-timestamp) | Живые часы эпохи, конвертация в дату/ISO/UTC, пакетный перевод меток времени |
| **Генератор теней Box-Shadow** | [Открыть инструмент](https://omnikit.tech/ru/box-shadow-generator) | Визуальный редактор многослойных теней с экспортом в чистый CSS и Tailwind CSS |
| **RegEx Tester (Регулярки)** | [Открыть инструмент](https://omnikit.tech/ru/regex-tester) | Интерактивное тестирование регулярных выражений онлайн |
| **CSV в JSON** | [Открыть инструмент](https://omnikit.tech/ru/csv-to-json) | Конвертер таблиц CSV в JSON по стандарту RFC 4180 |
| **UTM Генератор** | [Открыть инструмент](https://omnikit.tech/ru/utm-generator) | Конструктор ссылок с UTM-метками и URL-кодирование |
| **Счетчик токенов AI** | [Открыть инструмент](https://omnikit.tech/ru/token-counter) | Подсчет токенов и расчет стоимости для OpenAI, Anthropic, Google, DeepSeek |
| **Конвертер цветов и Пипетка** | [Открыть инструмент](https://omnikit.tech/ru/color-converter) | Пипетка с экрана и перевод кодов HEX, RGB, HSL |
| **Генератор и Сканер QR** | [Открыть инструмент](https://omnikit.tech/ru/qr-generator) | Генерация цветных QR-кодов и сканирование с картинок |

#### Текст и Офис

| Инструмент | Прямая ссылка | Описание |
| :--- | :--- | :--- |
| **Счетчик символов и слов** | [Открыть инструмент](https://omnikit.tech/ru/text-counter) | Подсчет символов, слов, строк и лимиты для соцсетей |
| **Сравнение текстов (Diff)** | [Открыть инструмент](https://omnikit.tech/ru/diff-checker) | Наглядное сравнение двух текстов с подсветкой различий |
| **Конвертер регистра** | [Открыть инструмент](https://omnikit.tech/ru/case-converter) | Смена регистра: ЗАГЛАВНЫЕ, строчные, CamelCase, snake_case |
| **Блокнот и очистка текста** | [Открыть инструмент](https://omnikit.tech/ru/txt-editor) | Удаление дубликатов строк, сортировка и очистка пробелов |
| **Транслитерация и Слаги** | [Открыть инструмент](https://omnikit.tech/ru/translit) | Перевод кириллицы в латиницу и генератор SEO слагов |
| **Сумма прописью** | [Открыть инструмент](https://omnikit.tech/ru/num-to-words) | Сумма прописью для договоров и счетов (рубли, доллары, евро) |

### Автор и создатель

Проект OmniKit разработан и поддерживается **[Morendais](https://github.com/Morendais)**.
- **Профиль GitHub**: [@Morendais](https://github.com/Morendais)
- **Официальный сайт**: [https://omnikit.tech](https://omnikit.tech)
- **Репозиторий**: [https://github.com/Morendais/omnikit.tech](https://github.com/Morendais/omnikit.tech)

### Лицензия

Лицензия MIT. Разрешено свободное коммерческое и некоммерческое использование.
