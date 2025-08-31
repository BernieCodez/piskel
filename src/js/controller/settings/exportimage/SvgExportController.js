(function () {
  var ns = $.namespace('pskl.controller.settings.exportimage');

  var dimensionInfoPattern = '{{width}} x {{height}} px, {{frames}}<br/>{{columns}}, {{rows}}.';

  var replace = pskl.utils.Template.replace;

  // Helper to return "X items" or "1 item" if X is 1.
  var pluralize = function (word, count) {
    if (count === 1) {
      return '1 ' + word;
    }
    return count + ' ' + word + 's';
  };

  ns.SvgExportController = function (piskelController, exportController) {
    this.piskelController = piskelController;
    this.exportController = exportController;
    this.onScaleChanged_ = this.onScaleChanged_.bind(this);
  };

  pskl.utils.inherit(ns.SvgExportController, pskl.controller.settings.AbstractSettingController);

  ns.SvgExportController.prototype.init = function () {
    this.layoutContainer = document.querySelector('.svg-export-layout-section');
    this.dimensionInfo = document.querySelector('.svg-export-dimension-info');

    this.rowsInput = document.querySelector('#svg-export-rows');
    this.columnsInput = document.querySelector('#svg-export-columns');

    var downloadButton = document.querySelector('.svg-download-button');
    var dataUriButton = document.querySelector('.svg-datauri-open-button');
    var animationDownloadButton = document.querySelector('.svg-animation-download-button');
    var selectedFrameDownloadButton = document.querySelector('.svg-selected-frame-download-button');
    var allFramesDownloadButton = document.querySelector('.svg-all-frames-download-button');

    this.preserveAspectRatioCheckbox = document.querySelector('.svg-preserve-aspect-ratio-checkbox');
    this.optimizeOutputCheckbox = document.querySelector('.svg-optimize-output-checkbox');
    this.animationLoopCheckbox = document.querySelector('.svg-animation-loop-checkbox');
    this.frameDurationInput = document.querySelector('#svg-frame-duration');

    this.initLayoutSection_();
    this.updateDimensionLabel_();

    this.addEventListener(this.columnsInput, 'input', this.onColumnsInput_);
    this.addEventListener(downloadButton, 'click', this.onDownloadClick_);
    this.addEventListener(dataUriButton, 'click', this.onDataUriClick_);
    this.addEventListener(animationDownloadButton, 'click', this.onAnimationDownloadClick_);
    this.addEventListener(selectedFrameDownloadButton, 'click', this.onDownloadSelectedFrameClick_);
    this.addEventListener(allFramesDownloadButton, 'click', this.onDownloadAllFramesClick_);
    $.subscribe(Events.EXPORT_SCALE_CHANGED, this.onScaleChanged_);

    // Add this to the init method, after the other button event listeners:
    var quickExportButton = document.querySelector('.svg-quick-export-button');
    this.addEventListener(quickExportButton, 'click', this.onQuickExportClick_);
  };

  ns.SvgExportController.prototype.destroy = function () {
    $.unsubscribe(Events.EXPORT_SCALE_CHANGED, this.onScaleChanged_);
    this.superclass.destroy.call(this);
  };

  /**
   * Initialize all controls related to the spritesheet layout.
   */
  ns.SvgExportController.prototype.initLayoutSection_ = function () {
    var frames = this.piskelController.getFrameCount();
    if (frames === 1) {
      // Hide the layout section if only one frame is defined.
      this.layoutContainer.style.display = 'none';
    } else {
      this.columnsInput.setAttribute('max', frames);
      this.columnsInput.value = this.getBestFit_();
      this.onColumnsInput_();
    }
  };

  ns.SvgExportController.prototype.updateDimensionLabel_ = function () {
    var zoom = this.exportController.getExportZoom();
    var frames = this.piskelController.getFrameCount();
    var width = this.piskelController.getWidth() * zoom;
    var height = this.piskelController.getHeight() * zoom;

    var columns = this.getColumns_();
    var rows = this.getRows_();
    width = columns * width;
    height = rows * height;

    this.dimensionInfo.innerHTML = replace(dimensionInfoPattern, {
      width: width,
      height: height,
      rows: pluralize('row', rows),
      columns: pluralize('column', columns),
      frames: pluralize('frame', frames),
    });
  };

  ns.SvgExportController.prototype.getColumns_ = function () {
    return parseInt(this.columnsInput.value || 1, 10);
  };

  ns.SvgExportController.prototype.getRows_ = function () {
    return parseInt(this.rowsInput.value || 1, 10);
  };

  ns.SvgExportController.prototype.getBestFit_ = function () {
    var ratio = this.piskelController.getWidth() / this.piskelController.getHeight();
    var frameCount = this.piskelController.getFrameCount();
    var bestFit = Math.round(Math.sqrt(frameCount / ratio));

    return pskl.utils.Math.minmax(bestFit, 1, frameCount);
  };

  ns.SvgExportController.prototype.onScaleChanged_ = function () {
    this.updateDimensionLabel_();
  };

  /**
   * Synchronise column and row inputs, called everytime a user input updates one of the
   * two inputs by the SynchronizedInputs widget.
   */
  ns.SvgExportController.prototype.onColumnsInput_ = function () {
    var value = this.columnsInput.value;
    if (value === '') {
      // Skip the synchronization if the input is empty.
      return;
    }

    value = parseInt(value, 10);
    if (isNaN(value)) {
      value = 1;
    }

    // Force the value to be in bounds, if the user tried to update it by directly typing
    // a value.
    value = pskl.utils.Math.minmax(value, 1, this.piskelController.getFrameCount());
    this.columnsInput.value = value;

    // Update readonly rowsInput
    this.rowsInput.value = Math.ceil(this.piskelController.getFrameCount() / value);
    this.updateDimensionLabel_();
  };

  /**
   * Convert a canvas to SVG format
   */
  ns.SvgExportController.prototype.canvasToSvg_ = function (canvas, options) {
    options = options || {};
    var width = canvas.width;
    var height = canvas.height;
    var preserveAspectRatio = options.preserveAspectRatio !== false;

    // Create SVG string
    var svgString = '<svg xmlns="http://www.w3.org/2000/svg"';
    svgString += ' width="' + width + '"';
    svgString += ' height="' + height + '"';
    svgString += ' viewBox="0 0 ' + width + ' ' + height + '"';

    if (preserveAspectRatio) {
      svgString += ' style="image-rendering: pixelated; image-rendering: -moz-crisp-edges; image-rendering: crisp-edges;"';
    }

    svgString += '>';

    // Convert canvas to base64 image data
    var dataURL = canvas.toDataURL('image/png');
    svgString += '<image href="' + dataURL + '" width="' + width + '" height="' + height + '"';

    if (preserveAspectRatio) {
      svgString += ' style="image-rendering: pixelated;"';
    }

    svgString += '/>';
    svgString += '</svg>';

    if (options.optimize) {
      // Simple SVG optimization - remove unnecessary whitespace
      svgString = svgString.replace(/>\s+</g, '><');
    }

    return svgString;
  };

  /**
   * Create SVG spritesheet
   */
  ns.SvgExportController.prototype.createSvgSpritesheet_ = function () {
    var renderer = new pskl.rendering.PiskelRenderer(this.piskelController);
    var outputCanvas = renderer.renderAsCanvas(this.getColumns_(), this.getRows_());
    var width = outputCanvas.width;
    var height = outputCanvas.height;

    var zoom = this.exportController.getExportZoom();
    if (zoom != 1) {
      outputCanvas = pskl.utils.ImageResizer.resize(outputCanvas, width * zoom, height * zoom, false);
    }

    return this.canvasToSvg_(outputCanvas, {
      preserveAspectRatio: this.preserveAspectRatioCheckbox.checked,
      optimize: this.optimizeOutputCheckbox.checked
    });
  };

  /**
   * Create animated SVG
   */
  ns.SvgExportController.prototype.createAnimatedSvg_ = function () {
    var frames = this.piskelController.getFrameCount();
    var width = this.piskelController.getWidth();
    var height = this.piskelController.getHeight();
    var zoom = this.exportController.getExportZoom();
    var frameDuration = parseInt(this.frameDurationInput.value, 10) || 100;
    var loop = this.animationLoopCheckbox.checked;

    var scaledWidth = width * zoom;
    var scaledHeight = height * zoom;

    var svgString = '<svg xmlns="http://www.w3.org/2000/svg"';
    svgString += ' width="' + scaledWidth + '"';
    svgString += ' height="' + scaledHeight + '"';
    svgString += ' viewBox="0 0 ' + scaledWidth + ' ' + scaledHeight + '"';

    if (this.preserveAspectRatioCheckbox.checked) {
      svgString += ' style="image-rendering: pixelated; image-rendering: -moz-crisp-edges; image-rendering: crisp-edges;"';
    }

    svgString += '>';

    // Create each frame as a group with animation
    for (var i = 0; i < frames; i++) {
      var canvas = this.piskelController.renderFrameAt(i, true);
      if (zoom != 1) {
        canvas = pskl.utils.ImageResizer.resize(canvas, scaledWidth, scaledHeight, false);
      }

      var dataURL = canvas.toDataURL('image/png');
      var animationDuration = (frameDuration * frames) + 'ms';
      var animationDelay = (frameDuration * i) + 'ms';

      svgString += '<image href="' + dataURL + '" width="' + scaledWidth + '" height="' + scaledHeight + '"';
      svgString += ' style="image-rendering: pixelated;"';
      svgString += '>';

      // Add animation
      svgString += '<animate attributeName="opacity" ';
      svgString += 'values="0;1;1;0" ';
      svgString += 'dur="' + animationDuration + '" ';
      svgString += 'begin="' + animationDelay + '" ';
      if (loop) {
        svgString += 'repeatCount="indefinite" ';
      }
      svgString += '/>';

      svgString += '</image>';
    }

    svgString += '</svg>';

    if (this.optimizeOutputCheckbox.checked) {
      svgString = svgString.replace(/>\s+</g, '><');
    }

    return svgString;
  };

  ns.SvgExportController.prototype.onDownloadClick_ = function (evt) {
    var svgContent = this.createSvgSpritesheet_();
    this.downloadSvg_(svgContent);
  };

  ns.SvgExportController.prototype.downloadSvg_ = function (svgContent, name) {
    name = name || this.piskelController.getPiskel().getDescriptor().name;
    var fileName = name + '.svg';

    var blob = new Blob([svgContent], { type: 'image/svg+xml' });
    pskl.utils.FileUtils.downloadAsFile(blob, fileName);
  };

  ns.SvgExportController.prototype.onAnimationDownloadClick_ = function (evt) {
    var svgContent = this.createAnimatedSvg_();
    var name = this.piskelController.getPiskel().getDescriptor().name;
    var fileName = name + '-animated.svg';

    var blob = new Blob([svgContent], { type: 'image/svg+xml' });
    pskl.utils.FileUtils.downloadAsFile(blob, fileName);
  };

  ns.SvgExportController.prototype.onDataUriClick_ = function (evt) {
    var popup = window.open('about:blank');
    var svgContent = this.createSvgSpritesheet_();
    var dataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgContent);

    window.setTimeout(function () {
      var html = pskl.utils.Template.getAndReplace('data-uri-export-partial', {
        src: dataUri
      });
      popup.document.title = dataUri;
      popup.document.body.innerHTML = html;
    }.bind(this), 500);
  };

  ns.SvgExportController.prototype.onDownloadSelectedFrameClick_ = function (evt) {
    var frameIndex = this.piskelController.getCurrentFrameIndex();
    var name = this.piskelController.getPiskel().getDescriptor().name;
    var canvas = this.piskelController.renderFrameAt(frameIndex, true);
    var zoom = this.exportController.getExportZoom();

    if (zoom != 1) {
      canvas = pskl.utils.ImageResizer.resize(canvas, canvas.width * zoom, canvas.height * zoom, false);
    }

    var svgContent = this.canvasToSvg_(canvas, {
      preserveAspectRatio: this.preserveAspectRatioCheckbox.checked,
      optimize: this.optimizeOutputCheckbox.checked
    });

    var fileName = name + '-' + (frameIndex + 1) + '.svg';
    var blob = new Blob([svgContent], { type: 'image/svg+xml' });
    pskl.utils.FileUtils.downloadAsFile(blob, fileName);
  };

  ns.SvgExportController.prototype.onDownloadAllFramesClick_ = function (evt) {
    var zip = new window.JSZip();
    var frames = this.piskelController.getFrameCount();
    var name = this.piskelController.getPiskel().getDescriptor().name;
    var zoom = this.exportController.getExportZoom();

    for (var i = 0; i < frames; i++) {
      var canvas = this.piskelController.renderFrameAt(i, true);
      if (zoom != 1) {
        canvas = pskl.utils.ImageResizer.resize(canvas, canvas.width * zoom, canvas.height * zoom, false);
      }

      var svgContent = this.canvasToSvg_(canvas, {
        preserveAspectRatio: this.preserveAspectRatioCheckbox.checked,
        optimize: this.optimizeOutputCheckbox.checked
      });

      var fileName = name + '-' + (i + 1) + '.svg';
      zip.file(fileName, svgContent);
    }

    var blob = zip.generate({
      type: 'blob'
    });

    pskl.utils.FileUtils.downloadAsFile(blob, name + '-frames.zip');
  };


  // Add this new method to handle the quick export:
  ns.SvgExportController.prototype.onQuickExportClick_ = function (evt) {
    var svgContent = this.createQuickExportSvg_();
    var name = this.piskelController.getPiskel().getDescriptor().name;
    var fileName = name + '-quick.svg';
    var blob = new Blob([svgContent], { type: 'image/svg+xml' });
    pskl.utils.FileUtils.downloadAsFile(blob, fileName);
  };

  // Add this new method to create the fixed-size SVG (20px per cell):
  ns.SvgExportController.prototype.createQuickExportSvg_ = function () {
    var frames = this.piskelController.getFrameCount();
    var pixelSize = 20; // Fixed 20px per cell
    var width = this.piskelController.getWidth();
    var height = this.piskelController.getHeight();

    if (frames === 1) {
      // Single frame export
      var canvas = this.piskelController.renderFrameAt(0, true);
      var scaledWidth = width * pixelSize;
      var scaledHeight = height * pixelSize;
      var resizedCanvas = pskl.utils.ImageResizer.resize(canvas, scaledWidth, scaledHeight, false);

      return this.canvasToSvg_(resizedCanvas, {
        preserveAspectRatio: true,
        optimize: false
      });
    } else {
      // Multi-frame spritesheet export with fixed size
      var columns = this.getBestFit_();
      var rows = Math.ceil(frames / columns);

      // Create a temporary canvas for the spritesheet
      var spritesheetWidth = columns * width * pixelSize;
      var spritesheetHeight = rows * height * pixelSize;

      var tempCanvas = document.createElement('canvas');
      tempCanvas.width = spritesheetWidth;
      tempCanvas.height = spritesheetHeight;
      var ctx = tempCanvas.getContext('2d');

      // Draw each frame onto the spritesheet
      for (var i = 0; i < frames; i++) {
        var frameCanvas = this.piskelController.renderFrameAt(i, true);
        var scaledFrameCanvas = pskl.utils.ImageResizer.resize(
          frameCanvas,
          width * pixelSize,
          height * pixelSize,
          false
        );

        var col = i % columns;
        var row = Math.floor(i / columns);
        var x = col * width * pixelSize;
        var y = row * height * pixelSize;

        ctx.drawImage(scaledFrameCanvas, x, y);
      }

      return this.canvasToSvg_(tempCanvas, {
        preserveAspectRatio: true,
        optimize: false
      });
    }
  };
})();