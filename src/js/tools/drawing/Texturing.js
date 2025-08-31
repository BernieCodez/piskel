/**
 * @provide pskl.tools.drawing.Texturing
 *
 * @require Constants
 * @require pskl.utils
 */
(function() {
  var ns = $.namespace('pskl.tools.drawing');
  var DEFAULT_STEP_MIN = 2;
  var DEFAULT_STEP_MAX = 8;
  var TEXTURE_PROBABILITY = 0.7; // 70% chance to apply texture per pixel

  ns.Texturing = function() {
    this.superclass.constructor.call(this);

    this.toolId = 'tool-texturing';
    this.helpText = 'Texturing';
    this.shortcut = pskl.service.keyboard.Shortcuts.TOOL.TEXTURING;

    this.tooltipDescriptors = [
      {key : 'shift', description : 'Apply only once per pixel'},
      {key : 'ctrl', description : 'Increase texture intensity'}
    ];
  };

  pskl.utils.inherit(ns.Texturing, ns.SimplePen);

  /**
   * @Override
   */
  ns.Texturing.prototype.applyToolAt = function(col, row, frame, overlay, event) {
    this.previousCol = col;
    this.previousRow = row;

    var penSize = pskl.app.penSizeService.getPenSize();
    var points = pskl.PixelUtils.resizePixel(col, row, penSize);
    points.forEach(function (point) {
      var modifiedColor = this.getModifiedColor_(point[0], point[1], frame, overlay, event);
      if (modifiedColor !== null) {
        this.draw(modifiedColor, point[0], point[1], frame, overlay);
      }
    }.bind(this));
  };

  ns.Texturing.prototype.getModifiedColor_ = function(col, row, frame, overlay, event) {
    // get colors in overlay and in frame
    var overlayColor = overlay.getPixel(col, row);
    var frameColor = frame.getPixel(col, row);

    var isPixelModified = overlayColor !== pskl.utils.colorToInt(Constants.TRANSPARENT_COLOR);
    var pixelColor = isPixelModified ? overlayColor : frameColor;

    var isTransparent = pixelColor === pskl.utils.colorToInt(Constants.TRANSPARENT_COLOR);
    if (isTransparent) {
      return null; // Don't texture transparent pixels
    }

    var oncePerPixel = event.shiftKey;
    if (oncePerPixel && isPixelModified) {
      return pixelColor;
    }

    // Random chance to apply texture - not every pixel gets textured
    if (Math.random() > TEXTURE_PROBABILITY) {
      return null; // Skip this pixel
    }

    // Determine texture intensity based on ctrl key
    var isIntenseTexture = pskl.utils.UserAgent.isMac ? event.metaKey : event.ctrlKey;
    var stepMin = isIntenseTexture ? DEFAULT_STEP_MIN * 2 : DEFAULT_STEP_MIN;
    var stepMax = isIntenseTexture ? DEFAULT_STEP_MAX * 2 : DEFAULT_STEP_MAX;
    
    // Random step amount within range
    var step = stepMin + Math.random() * (stepMax - stepMin);
    
    // Randomly choose to lighten or darken (50/50 chance)
    var shouldLighten = Math.random() > 0.5;
    
    var color;
    if (shouldLighten) {
      color = window.tinycolor.lighten(pskl.utils.intToColor(pixelColor), step);
    } else {
      color = window.tinycolor.darken(pskl.utils.intToColor(pixelColor), step);
    }

    // Convert tinycolor color to string format.
    return color.toHexString();
  };
})();