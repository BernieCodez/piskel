/**
 * @provide pskl.tools.drawing.selection.RectangleSelect
 *
 * @require pskl.utils
 */
(function() {
  var ns = $.namespace('pskl.tools.drawing.selection');

  ns.RectangleSelect = function() {
    ns.AbstractDragSelect.call(this);

    this.toolId = 'tool-rectangle-select';
    this.helpText = 'Rectangle selection';
    this.shortcut = pskl.service.keyboard.Shortcuts.TOOL.RECTANGLE_SELECT;

    // Initialize resize state
    this._resizing = false;
    this._resizeCornerIdx = -1;
    this._resizeCorners = null;
    this._originalPixels = null; // Store original content for resizing
  };

  pskl.utils.inherit(ns.RectangleSelect, ns.AbstractDragSelect);

  /** @override */
  ns.RectangleSelect.prototype.onDragSelectStart_ = function (col, row) {
    $.publish(Events.DRAG_START, [col, row]);
  };

  /**
   * When creating the rectangle selection, we clear the current overlayFrame and
   * redraw the current rectangle based on the origin coordinate and
   * the current mouse coordinate in sprite.
   * @override
   */
  ns.RectangleSelect.prototype.onDragSelect_ = function (col, row, frame, overlay) {
    overlay.clear();
    this.selection = new pskl.selection.RectangularSelection(this.startCol, this.startRow, col, row);
    $.publish(Events.SELECTION_CREATED, [this.selection]);
    this.drawSelectionOnOverlay_(overlay);
  };

  /** @override */
  ns.RectangleSelect.prototype.onDragSelectEnd_ = function (col, row, frame, overlay) {
    this.onSelect_(col, row, frame, overlay);
    
    // After selection is complete, add corner dots
    this.drawCornerDots_(overlay);
    
    $.publish(Events.DRAG_END);
  };

  // Store original selected content before resizing
  ns.RectangleSelect.prototype.storeOriginalSelection_ = function(frame) {
    if (!this.selection || !this.selection.pixels) return;
    
    this._originalPixels = [];
    for (var i = 0; i < this.selection.pixels.length; i++) {
      var pixel = this.selection.pixels[i];
      this._originalPixels.push({
        col: pixel.col,
        row: pixel.row,
        color: frame.getPixel(pixel.col, pixel.row)
      });
    }
  };

  // Resize selected content using nearest neighbor scaling
  ns.RectangleSelect.prototype.resizeSelectedContent_ = function(frame, oldX, oldY, oldW, oldH, newX, newY, newW, newH) {
    if (!this._originalPixels || oldW === 0 || oldH === 0 || newW === 0 || newH === 0) return;
    
    // Clear old selection area first
    for (var i = 0; i < this._originalPixels.length; i++) {
      var pixel = this._originalPixels[i];
      frame.setPixel(pixel.col, pixel.row, Constants.TRANSPARENT_COLOR);
    }
    
    // Scale and place content in new selection using nearest neighbor
    for (var newCol = 0; newCol < newW; newCol++) {
      for (var newRow = 0; newRow < newH; newRow++) {
        // Map new position back to original position
        var sourceX = Math.floor((newCol / newW) * oldW);
        var sourceY = Math.floor((newRow / newH) * oldH);
        
        // Clamp to bounds
        sourceX = Math.min(sourceX, oldW - 1);
        sourceY = Math.min(sourceY, oldH - 1);
        
        var originalCol = oldX + sourceX;
        var originalRow = oldY + sourceY;
        
        // Find the original pixel at this position
        var originalColor = Constants.TRANSPARENT_COLOR;
        for (var j = 0; j < this._originalPixels.length; j++) {
          var origPixel = this._originalPixels[j];
          if (origPixel.col === originalCol && origPixel.row === originalRow) {
            originalColor = origPixel.color;
            break;
          }
        }
        
        // Set pixel in new position
        var targetCol = newX + newCol;
        var targetRow = newY + newRow;
        frame.setPixel(targetCol, targetRow, originalColor);
      }
    }
  };

  // Draws corner dots on the selection overlay (called after normal selection drawing)
  ns.RectangleSelect.prototype.drawCornerDots_ = function(overlay) {
    if (!this.selection || !this.selection.pixels || this.selection.pixels.length === 0) return;
    
    // Find bounds
    var cols = this.selection.pixels.map(function(p){return p.col;});
    var rows = this.selection.pixels.map(function(p){return p.row;});
    var minCol = Math.min.apply(null, cols);
    var maxCol = Math.max.apply(null, cols);
    var minRow = Math.min.apply(null, rows);
    var maxRow = Math.max.apply(null, rows);
    
    // Single white pixel dots (slightly transparent)
    var dotColor = 'rgba(255,255,255,0.7)';
    
    var corners = [
      [minCol, minRow],     // top-left (0)
      [maxCol, minRow],     // top-right (1)  
      [minCol, maxRow],     // bottom-left (2)
      [maxCol, maxRow]      // bottom-right (3)
    ];
    
    // Draw single pixel dots
    corners.forEach(function(corner){
      overlay.setPixel(corner[0], corner[1], dotColor);
    });
    
    // Store corners for hit detection
    this._resizeCorners = corners;
  };

  // Override applyToolAt to check for corner drag
  var _superApplyToolAt = ns.RectangleSelect.prototype.applyToolAt;
  ns.RectangleSelect.prototype.applyToolAt = function(col, row, frame, overlay, event) {
    // Check if we have an existing selection and if clicking a corner dot
    if (this.selection && this._resizeCorners) {
      var cornerIdx = this.getCornerHit_(col, row);
      if (cornerIdx !== -1) {
        this._resizing = true;
        this._resizeCornerIdx = cornerIdx;
        
        // Store original selection data before resizing starts
        this.storeOriginalSelection_(frame);
        
        // Store opposite corner based on which corner was clicked
        var oppIdx;
        switch(cornerIdx) {
          case 0: oppIdx = 3; break; // top-left -> bottom-right
          case 1: oppIdx = 2; break; // top-right -> bottom-left  
          case 2: oppIdx = 1; break; // bottom-left -> top-right
          case 3: oppIdx = 0; break; // bottom-right -> top-left
        }
        this._resizeOpposite = this._resizeCorners[oppIdx];
        return; // Don't call super method
      }
    }
    
    // Not resizing, use normal selection behavior
    this._resizing = false;
    _superApplyToolAt.call(this, col, row, frame, overlay, event);
  };

  // Override moveToolAt to resize selection if dragging a corner
  var _superMoveToolAt = ns.RectangleSelect.prototype.moveToolAt;
  ns.RectangleSelect.prototype.moveToolAt = function(col, row, frame, overlay, event) {
    if (this._resizing && this._resizeOpposite) {
      // Get original selection bounds
      var oldCols = this.selection.pixels.map(function(p){return p.col;});
      var oldRows = this.selection.pixels.map(function(p){return p.row;});
      var oldMinCol = Math.min.apply(null, oldCols);
      var oldMaxCol = Math.max.apply(null, oldCols);
      var oldMinRow = Math.min.apply(null, oldRows);
      var oldMaxRow = Math.max.apply(null, oldRows);
      var oldWidth = oldMaxCol - oldMinCol + 1;
      var oldHeight = oldMaxRow - oldMinRow + 1;
      
      // Update selection rectangle using opposite corner as anchor
      var opp = this._resizeOpposite;
      var newSelection = new pskl.selection.RectangularSelection(opp[0], opp[1], col, row);
      
      // Get new selection bounds
      var newCols = newSelection.pixels.map(function(p){return p.col;});
      var newRows = newSelection.pixels.map(function(p){return p.row;});
      var newMinCol = Math.min.apply(null, newCols);
      var newMaxCol = Math.max.apply(null, newCols);
      var newMinRow = Math.min.apply(null, newRows);
      var newMaxRow = Math.max.apply(null, newRows);
      var newWidth = newMaxCol - newMinCol + 1;
      var newHeight = newMaxRow - newMinRow + 1;
      
      // Resize the selected content
      this.resizeSelectedContent_(frame, oldMinCol, oldMinRow, oldWidth, oldHeight, 
                                  newMinCol, newMinRow, newWidth, newHeight);
      
      this.selection = newSelection;
      $.publish(Events.SELECTION_CREATED, [this.selection]);
      
      // Draw selection normally, then add corner dots
      overlay.clear();
      this.drawSelectionOnOverlay_(overlay);
      this.drawCornerDots_(overlay);
    } else {
      _superMoveToolAt.call(this, col, row, frame, overlay, event);
    }
  };

  // Override releaseToolAt to finish resizing
  var _superReleaseToolAt = ns.RectangleSelect.prototype.releaseToolAt;
  ns.RectangleSelect.prototype.releaseToolAt = function(col, row, frame, overlay, event) {
    if (this._resizing) {
      // Finish resizing
      this._resizing = false;
      this._resizeCornerIdx = -1;
      this._resizeOpposite = null;
      
      // Redraw final selection with corner dots
      overlay.clear();
      this.drawSelectionOnOverlay_(overlay);
      this.drawCornerDots_(overlay);
      
      // Publish selection update
      $.publish(Events.SELECTION_CREATED, [this.selection]);
    } else {
      _superReleaseToolAt.call(this, col, row, frame, overlay, event);
    }
  };

  // Helper: returns corner index if hit, else -1
  ns.RectangleSelect.prototype.getCornerHit_ = function(col, row) {
    if (!this._resizeCorners) return -1;
    
    for (var i = 0; i < this._resizeCorners.length; i++) {
      var corner = this._resizeCorners[i];
      // Check if click is exactly on corner pixel or 1 pixel away (for easier clicking)
      if (Math.abs(col - corner[0]) <= 1 && Math.abs(row - corner[1]) <= 1) {
        return i;
      }
    }
    return -1;
  };

})();