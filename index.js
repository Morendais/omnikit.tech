/**
 * OmniKit Tools - Standalone Client-Side Web Utilities
 * 100% in-browser processing. Zero server compute. Zero data leakage.
 *
 * https://github.com/Morendais/omnikit.tech
 * License: MIT
 */

// Node.js environment polyfill for browser globals
if (typeof window === 'undefined') {
  const doc = {
    createElement: () => ({
      getContext: () => ({}),
      style: {},
      classList: { add: () => {}, remove: () => {}, toggle: () => {} },
      appendChild: () => {},
      addEventListener: () => {}
    }),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    body: { appendChild: () => {}, removeChild: () => {} }
  };
  global.window = {
    I18N: { currentLang: 'en', t: (k) => k },
    document: doc,
    navigator: { userAgent: 'node', clipboard: { writeText: async () => {} } },
    location: { href: 'http://localhost', pathname: '/', search: '' },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    addEventListener: () => {},
    dispatchEvent: () => {},
    crypto: require('crypto').webcrypto
  };
  global.document = doc;
  global.navigator = global.window.navigator;
  global.localStorage = global.window.localStorage;
}

const AudioTools = require('./tools/audio-tools.js');
const BaseConverter = require('./tools/base-converter.js');
const BatchImageStudio = require('./tools/batch-image.js');
const BgRemover = require('./tools/bg-remover.js');
const BoxShadowTool = require('./tools/box-shadow-tool.js');
const DevTools = require('./tools/dev-tools.js');
const FaviconStudio = require('./tools/favicon-studio.js');
const HardwareTools = require('./tools/hardware-tools.js');
const ImageTools = require('./tools/image-tools.js');
const MediaCreative = require('./tools/media-creative.js');
const MediaExtended = require('./tools/media-extended.js');
const MonitorTest = require('./tools/monitor-test.js');
const OcrTool = require('./tools/ocr-tool.js');
const OfficeTools = require('./tools/office-tools.js');
const P2PDrop = require('./tools/p2p-drop.js');
const PdfSuite = require('./tools/pdf-suite.js');
const QrTool = require('./tools/qr-tool.js');
const SignatureTool = require('./tools/signature-tool.js');
const TextTools = require('./tools/text-tools.js');
const TimestampTool = require('./tools/timestamp-tool.js');
const TokenTool = require('./tools/token-tool.js');
const TranscribeTool = require('./tools/transcribe-tool.js');
const TxtEditor = require('./tools/txt-editor.js');
const UnitConverter = require('./tools/unit-converter.js');
const UtilityExtended = require('./tools/utility-extended.js');
const VideoCropTool = require('./tools/video-crop-tool.js');
const VideoTools = require('./tools/video-tools.js');

const tools = {
  AudioTools,
  BaseConverter,
  BatchImageStudio,
  BgRemover,
  BoxShadowTool,
  DevTools,
  FaviconStudio,
  HardwareTools,
  ImageTools,
  MediaCreative,
  MediaExtended,
  MonitorTest,
  OcrTool,
  OfficeTools,
  P2PDrop,
  PdfSuite,
  QrTool,
  SignatureTool,
  TextTools,
  TimestampTool,
  TokenTool,
  TranscribeTool,
  TxtEditor,
  UnitConverter,
  UtilityExtended,
  VideoCropTool,
  VideoTools
};

module.exports = {
  ...tools,
  tools
};
